import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model mapping: frontend names to actual model IDs
const MODEL_MAPPING: Record<string, { provider: "openrouter" | "gemini"; model: string; requiresPaid: boolean }> = {
  // Free model uses OpenRouter - DeepSeek R1T2 Chimera
  "deepseek-free": { provider: "openrouter", model: "tngtech/deepseek-r1t2-chimera:free", requiresPaid: false },
  // Premium models use Google Gemini API directly
  "google/gemini-2.5-flash": { provider: "gemini", model: "gemini-1.5-flash", requiresPaid: true },
  "google/gemini-2.5-pro": { provider: "gemini", model: "gemini-1.5-pro", requiresPaid: true },
};

// Check if user has paid plan
const isPaidPlan = (plan: string): boolean => {
  return plan === 'pro' || plan === 'business' || plan === 'owner';
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, conversationHistory = [], currentCode = null, model = "deepseek-free" } = await req.json();

    // Get the actual model and provider
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

      // Check user's subscription plan
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

      // Check if user has paid plan or is unlimited
      if (!isPaidPlan(credits.plan) && !credits.is_unlimited) {
        return new Response(
          JSON.stringify({ error: "This model requires a Pro or Business plan. Please upgrade to access premium models." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Detect if this is a modification request or new generation
    const isModification = currentCode !== null && currentCode.length > 100;

    // Build the appropriate system prompt based on mode
    const systemPrompt = isModification 
      ? buildModificationPrompt(currentCode)
      : buildGenerationPrompt();
    
    console.log("Weblitho generating:", {
      requestedModel: model,
      actualProvider: modelConfig.provider,
      actualModel: modelConfig.model,
      mode: isModification ? "MODIFICATION" : "NEW"
    });

    let response: Response;

    if (modelConfig.provider === "openrouter") {
      // Use OpenRouter API for free model
      const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY");
      if (!OPENROUTER_KEY) {
        throw new Error("OPENROUTER_KEY is not configured");
      }

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: prompt }
      ];

      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
        }),
      });
    } else {
      // Use Google Gemini API directly with user's API key
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
      }

      // Convert conversation history to Gemini format
      const contents = [];
      
      // Add conversation history
      for (const msg of conversationHistory) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        });
      }
      
      // Add current user prompt with system instruction
      contents.push({
        role: "user",
        parts: [{ text: prompt }]
      });

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.model}:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`;

      response = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 65536,
          }
        }),
      });
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error", details: errorText }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("Weblitho generate-page error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ===========================================
// NEW GENERATION PROMPT - HTML First for Preview
// ===========================================
function buildGenerationPrompt(): string {
  return `You are Weblitho — Qubetics' AI Website Builder.

OUTPUT FORMAT: You MUST output a complete, self-contained HTML document.
START with: <!DOCTYPE html>
END with: </html>

NO MARKDOWN. NO CODE FENCES. NO JSON. NO EXPLANATIONS. PURE HTML.

=========================================
HTML STRUCTURE

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Website Title</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          animation: {
            'fade-in': 'fadeIn 0.5s ease-out',
            'slide-up': 'slideUp 0.5s ease-out',
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
    .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); }
    .gradient-text { background: linear-gradient(135deg, #06b6d4, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .glow { box-shadow: 0 0 40px rgba(6, 182, 212, 0.3); }
  </style>
</head>
<body class="antialiased bg-gray-950 text-white min-h-screen">
  <!-- Full website content here using Tailwind CSS -->
</body>
</html>

=========================================
DESIGN REQUIREMENTS

Create PREMIUM, MODERN websites like Vercel, Framer, Stripe, Linear.

MANDATORY:
- Large hero sections (text-5xl to text-7xl headlines)
- Generous spacing (py-20 to py-32 for sections)
- max-w-7xl mx-auto containers
- Premium gradients (cyan, purple, blue)
- Rounded-2xl components
- Smooth transitions (transition-all duration-300)
- Responsive grids (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Clean typography
- Gray-950 base, white text
- Glass morphism (backdrop-blur, bg-white/5)
- Hover states on interactive elements
- Dark theme

=========================================
REQUIRED SECTIONS

1. Navbar — sticky, glass morphism, mobile menu toggle
2. Hero — large gradient headline, subtext, 2 CTA buttons
3. Features — bento grid with icons (use SVG icons)
4. CTA Section — gradient background, action button
5. Footer — multi-column links, social icons

Optional: Pricing, Testimonials, FAQ, About

=========================================
SVG ICONS

Use inline SVG icons. Examples:
- Arrow: <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
- Check: <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
- Star: <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>

=========================================
CRITICAL RULES

1. Output ONLY the HTML document
2. Start with <!DOCTYPE html>
3. End with </html>
4. NO markdown code fences (\`\`\`)
5. NO explanations before or after
6. NO JSON format
7. Make it fully responsive
8. Include ALL sections in one HTML file

Generate the complete HTML website now.`;
}

// ===========================================
// MODIFICATION PROMPT - Changes existing code
// ===========================================
function buildModificationPrompt(currentCode: string): string {
  return `You are Weblitho, modifying an EXISTING website.

OUTPUT FORMAT: Return ONLY the complete modified HTML document.
NO JSON for modifications. NO explanations. NO markdown.
Start with <!DOCTYPE html> and end with </html>.

CURRENT CODE:
${currentCode}

MODIFICATION RULES:
1. Make ONLY the requested changes
2. PRESERVE everything else exactly
3. Keep React CDN, Tailwind, Lucide stack
4. Return the COMPLETE modified HTML

DO NOT:
- Regenerate everything
- Remove components unless asked
- Change unrelated sections
- Add explanations

Return the modified HTML now.`;
}
