import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model mapping: frontend names to actual model IDs
const MODEL_MAPPING: Record<string, { provider: "openrouter" | "gemini"; model: string; requiresPaid: boolean }> = {
  "deepseek-free": { provider: "openrouter", model: "tngtech/deepseek-r1t2-chimera:free", requiresPaid: false },
  "google/gemini-2.5-flash": { provider: "gemini", model: "gemini-2.5-flash-preview-05-20", requiresPaid: true },
  "google/gemini-2.5-pro": { provider: "gemini", model: "gemini-2.5-pro-preview-05-06", requiresPaid: true },
};

const isPaidPlan = (plan: string): boolean => {
  return plan === 'pro' || plan === 'business' || plan === 'owner';
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, conversationHistory = [], currentCode = null, model = "deepseek-free" } = await req.json();

    console.log("=== GENERATE-PAGE START ===");
    console.log("Model requested:", model);
    console.log("Has current code:", !!currentCode);

    const modelConfig = MODEL_MAPPING[model] || MODEL_MAPPING["deepseek-free"];
    
    // Check user's plan for premium models
    if (modelConfig.requiresPaid) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Authentication required for premium models" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid authentication" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: credits, error: creditsError } = await supabase
        .from("user_credits")
        .select("plan, is_unlimited")
        .eq("user_id", user.id)
        .single();

      if (creditsError || !credits) {
        console.error("Failed to fetch user credits:", creditsError);
        return new Response(
          JSON.stringify({ error: "Failed to verify subscription" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!isPaidPlan(credits.plan) && !credits.is_unlimited) {
        return new Response(
          JSON.stringify({ error: "This model requires a Pro or Business plan. Please upgrade to access premium models." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const isModification = currentCode !== null && currentCode.length > 100;
    const systemPrompt = isModification ? buildModificationPrompt(currentCode) : buildGenerationPrompt();

    console.log("Provider:", modelConfig.provider);
    console.log("Model:", modelConfig.model);
    console.log("Mode:", isModification ? "MODIFICATION" : "NEW");

    if (modelConfig.provider === "openrouter") {
      const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY");
      if (!OPENROUTER_KEY) {
        throw new Error("OPENROUTER_KEY is not configured");
      }

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: prompt }
      ];

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://weblitho.app",
          "X-Title": "Weblitho AI Website Builder",
        },
        body: JSON.stringify({
          model: modelConfig.model,
          messages,
          stream: true,
          max_tokens: 16000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "AI gateway error", details: errorText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("OpenRouter streaming started");
      
      // Pass through OpenRouter stream directly (already OpenAI-compatible)
      return new Response(response.body, {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        },
      });

    } else {
      // Gemini API
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
      }

      const contents = [];
      for (const msg of conversationHistory) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        });
      }
      contents.push({
        role: "user",
        parts: [{ text: prompt }]
      });

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.model}:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`;

      console.log("Calling Gemini:", geminiUrl.replace(GEMINI_API_KEY, "***"));

      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 65536,
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "AI gateway error", details: errorText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Gemini streaming started");

      // Transform Gemini SSE to OpenAI format
      const transformedStream = new ReadableStream({
        async start(controller) {
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          const encoder = new TextEncoder();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                // Send final DONE event
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
                console.log("Gemini stream completed");
                break;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === "[DONE]") continue;

                try {
                  const geminiData = JSON.parse(jsonStr);
                  const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                  
                  if (text) {
                    // Convert to OpenAI format
                    const openAIFormat = {
                      choices: [{
                        delta: { content: text },
                        index: 0,
                        finish_reason: null
                      }]
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
                  }
                } catch (parseErr) {
                  // Skip malformed JSON
                }
              }
            }
          } catch (streamErr) {
            console.error("Stream error:", streamErr);
            controller.error(streamErr);
          }
        }
      });

      return new Response(transformedStream, {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        },
      });
    }

  } catch (e) {
    console.error("Generate-page error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ===========================================
// GENERATION PROMPT
// ===========================================
function buildGenerationPrompt(): string {
  return `You are Weblitho, a premium AI website builder.

CRITICAL OUTPUT RULES:
- Output ONLY a complete HTML document
- Start with: <!DOCTYPE html>
- End with: </html>
- NO markdown code fences
- NO JSON wrapper
- NO explanations before or after
- PURE HTML ONLY

TEMPLATE:
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          animation: {
            'fade-in': 'fadeIn 0.6s ease-out',
            'slide-up': 'slideUp 0.6s ease-out',
            'float': 'float 3s ease-in-out infinite',
          },
          keyframes: {
            fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
            slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
            float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
          }
        }
      }
    }
  </script>
  <style>
    .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(12px); }
    .gradient-text { background: linear-gradient(135deg, #06b6d4, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .glow { box-shadow: 0 0 40px rgba(6, 182, 212, 0.3); }
  </style>
</head>
<body class="antialiased bg-gray-950 text-white min-h-screen">
  <!-- Website content -->
</body>
</html>

DESIGN REQUIREMENTS:
- Premium modern design like Vercel, Stripe, Linear
- Large hero headlines (text-5xl to text-7xl)
- Generous section spacing (py-20 to py-32)
- max-w-7xl mx-auto containers
- Soft gradients (cyan, purple, blue)
- rounded-2xl components
- Smooth hover transitions
- Dark theme: gray-950 base
- Glass morphism effects
- Fully responsive

REQUIRED SECTIONS:
1. Sticky navbar with glass effect
2. Hero with gradient headline, subtext, 2 CTA buttons
3. Features in bento grid layout
4. CTA section with gradient background
5. Footer with columns

USE INLINE SVG ICONS - Examples:
Arrow: <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>

Generate beautiful, complete HTML now.`;
}

// ===========================================
// MODIFICATION PROMPT
// ===========================================
function buildModificationPrompt(currentCode: string): string {
  return `You are Weblitho, modifying an existing website.

OUTPUT: Return ONLY the complete modified HTML document.
- Start with: <!DOCTYPE html>
- End with: </html>
- NO markdown, NO JSON, NO explanations

CURRENT WEBSITE CODE:
${currentCode}

RULES:
1. Make ONLY the requested changes
2. PRESERVE everything else exactly
3. Keep all Tailwind CDN and custom styles
4. Return the COMPLETE modified HTML

Return the modified HTML now.`;
}
