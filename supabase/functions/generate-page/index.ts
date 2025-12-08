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
    console.log("Prompt length:", prompt?.length);
    console.log("Has current code:", !!currentCode);

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        ...conversationHistory.slice(-6), // Keep last 6 messages for context
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
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter error:", response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "AI service is busy. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: "AI generation failed. Please try again." }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("OpenRouter streaming started");
      
      return new Response(response.body, {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no"
        },
      });

    } else {
      // Gemini API
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
      }

      const contents = [];
      const recentHistory = conversationHistory.slice(-6);
      for (const msg of recentHistory) {
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

      console.log("Calling Gemini:", modelConfig.model);

      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 65536,
            topP: 0.95,
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "AI service is busy. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: "AI generation failed. Please try again." }),
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
                    const openAIFormat = {
                      choices: [{
                        delta: { content: text },
                        index: 0,
                        finish_reason: null
                      }]
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
                  }
                } catch {
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
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no"
        },
      });
    }

  } catch (e) {
    console.error("Generate-page error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Generation failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ===========================================
// GENERATION PROMPT - Enhanced for better output
// ===========================================
function buildGenerationPrompt(): string {
  return `You are Weblitho, a world-class AI website builder that creates stunning, production-ready websites.

## OUTPUT FORMAT - CRITICAL
- Output ONLY valid HTML starting with <!DOCTYPE html>
- End with </html>
- NO markdown code blocks (no \`\`\`)
- NO JSON wrappers
- NO explanations or text before/after
- PURE HTML ONLY

## HTML TEMPLATE
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Website Title</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'sans-serif'] },
          animation: {
            'fade-in': 'fadeIn 0.5s ease-out',
            'slide-up': 'slideUp 0.5s ease-out',
            'slide-down': 'slideDown 0.3s ease-out',
            'scale-in': 'scaleIn 0.3s ease-out',
            'float': 'float 3s ease-in-out infinite',
            'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            'bounce-slow': 'bounce 2s infinite',
          },
          keyframes: {
            fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
            slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
            slideDown: { '0%': { opacity: '0', transform: 'translateY(-10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
            scaleIn: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
            float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
          }
        }
      }
    }
  </script>
  <style>
    .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); }
    .glass-dark { background: rgba(0,0,0,0.3); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); }
    .gradient-text { background: linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .gradient-bg { background: linear-gradient(135deg, #06b6d4, #8b5cf6); }
    .glow { box-shadow: 0 0 40px rgba(6, 182, 212, 0.3); }
    .glow-purple { box-shadow: 0 0 40px rgba(139, 92, 246, 0.3); }
    .card-hover { transition: all 0.3s ease; }
    .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
    .btn-glow { transition: all 0.3s ease; }
    .btn-glow:hover { box-shadow: 0 0 20px rgba(6, 182, 212, 0.5); transform: translateY(-2px); }
  </style>
</head>
<body class="antialiased bg-gray-950 text-white min-h-screen font-sans">
  <!-- Content here -->
</body>
</html>

## DESIGN SYSTEM - FOLLOW EXACTLY
- **Colors**: gray-950 (bg), gray-900 (cards), cyan-500/purple-500 (accents)
- **Typography**: text-5xl to text-7xl heroes, text-xl subtitles, text-base body
- **Spacing**: py-20 to py-32 sections, gap-8 grids
- **Borders**: rounded-2xl to rounded-3xl, border-gray-800
- **Effects**: Glass morphism, soft gradients, subtle shadows
- **Layout**: max-w-7xl mx-auto px-6

## REQUIRED SECTIONS (in order)
1. **Navbar**: Sticky, glass effect, logo left, nav links center, CTA button right
2. **Hero**: Gradient headline, compelling subtext, 2 CTA buttons, optional visual
3. **Features**: Bento grid or 3-4 column layout with icons
4. **Social Proof**: Stats, logos, or testimonials
5. **CTA Section**: Gradient background, compelling offer
6. **Footer**: Multi-column with links, social icons, copyright

## SVG ICONS - Use inline SVGs
Arrow: <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
Check: <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
Star: <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>

## QUALITY REQUIREMENTS
- Fully responsive (mobile-first)
- Semantic HTML (header, main, section, footer)
- Accessible (proper contrast, alt text placeholder)
- Interactive (hover states, transitions)
- Complete and polished (no Lorem ipsum unless specifically a placeholder site)
- Professional copywriting that matches the purpose

Generate a beautiful, complete website now.`;
}

// ===========================================
// MODIFICATION PROMPT - Better for edits
// ===========================================
function buildModificationPrompt(currentCode: string): string {
  return `You are Weblitho, modifying an existing website.

## OUTPUT FORMAT - CRITICAL
- Return ONLY the complete modified HTML
- Start with: <!DOCTYPE html>
- End with: </html>
- NO markdown code blocks
- NO JSON wrappers
- NO explanations

## CURRENT WEBSITE
${currentCode}

## MODIFICATION RULES
1. Make ONLY the requested changes
2. PRESERVE all existing structure, styles, and functionality
3. Keep Tailwind CDN, fonts, and custom CSS intact
4. Maintain design consistency
5. Return the COMPLETE modified HTML document

Make the requested changes and return the full HTML now.`;
}
