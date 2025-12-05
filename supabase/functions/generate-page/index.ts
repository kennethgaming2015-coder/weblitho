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
  // Premium models use Google Gemini API directly with your own API key
  "google/gemini-2.5-flash": { provider: "gemini", model: "gemini-2.5-flash", requiresPaid: true },
  "google/gemini-2.5-pro": { provider: "gemini", model: "gemini-2.5-pro", requiresPaid: true },
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
// NEW GENERATION PROMPT - Dual Output Format
// ===========================================
function buildGenerationPrompt(): string {
  return `You are Weblitho — Qubetics' AI Website Builder.

OUTPUT FORMAT: You MUST output valid JSON with this exact structure:
{
  "files": [
    { "path": "app/layout.tsx", "content": "..." },
    { "path": "app/page.tsx", "content": "..." },
    { "path": "components/layout/Navbar.tsx", "content": "..." },
    ...more files
  ],
  "preview": "<!DOCTYPE html>...complete self-contained HTML..."
}

NO MARKDOWN. NO CODE FENCES. ONLY THE JSON OBJECT.

=========================================
PROJECT STRUCTURE (files array)

Generate a complete Next.js 14 App Router project:

REQUIRED FILES:
- app/layout.tsx (root layout with metadata, fonts, providers)
- app/page.tsx (main page importing all sections)
- app/globals.css (Tailwind directives + custom styles)
- components/layout/Navbar.tsx (sticky navigation with mobile menu)
- components/layout/Footer.tsx (multi-column footer)
- components/sections/Hero.tsx (large hero with CTAs)
- components/sections/Features.tsx (bento grid with icons)
- components/sections/CTA.tsx (call-to-action section)
- tailwind.config.ts (Tailwind configuration)
- package.json (dependencies)

OPTIONAL FILES (include if relevant):
- components/sections/Pricing.tsx
- components/sections/Testimonials.tsx
- components/sections/FAQ.tsx
- components/sections/About.tsx
- components/ui/Button.tsx
- components/ui/Card.tsx
- lib/utils.ts

=========================================
CODE REQUIREMENTS

Each component file must:
- Use "use client" directive when needed (for interactivity)
- Import React and necessary hooks
- Use TypeScript with proper types
- Use Tailwind CSS classes only
- Use Lucide React for icons: import { Icon } from "lucide-react"
- Export default the component

Example component:
\`\`\`tsx
"use client";
import { ArrowRight, Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          Build Faster
        </h1>
      </div>
    </section>
  );
}
\`\`\`

=========================================
PREVIEW HTML (preview field)

The "preview" field must be a complete, self-contained HTML document that:
- Starts with <!DOCTYPE html>
- Ends with </html>
- Uses Tailwind CDN: <script src="https://cdn.tailwindcss.com"></script>
- Includes inline SVG icons (not external dependencies)
- Matches the visual design of the Next.js files exactly
- Is fully responsive and interactive

Preview HTML structure:
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
          },
          keyframes: {
            fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
            slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
          }
        }
      }
    }
  </script>
  <style>
    .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); }
    .gradient-text { background: linear-gradient(135deg, #06b6d4, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  </style>
</head>
<body class="antialiased bg-gray-950 text-white min-h-screen">
  <!-- All sections here -->
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
3. Features — bento grid with icons
4. CTA Section — gradient background, action button
5. Footer — multi-column links, social icons

=========================================
CRITICAL RULES

1. Output ONLY valid JSON (no markdown, no backticks)
2. "files" array with complete Next.js project
3. "preview" string with self-contained HTML
4. Both must match visually
5. All code must be production-ready
6. No placeholder text like "Lorem ipsum"
7. Make it fully responsive

Generate the complete JSON output now.`;
}

// ===========================================
// MODIFICATION PROMPT - Changes existing code
// ===========================================
function buildModificationPrompt(currentCode: string): string {
  return `You are Weblitho, modifying an EXISTING website.

OUTPUT FORMAT: You MUST output valid JSON with this exact structure:
{
  "files": [
    { "path": "app/layout.tsx", "content": "..." },
    { "path": "app/page.tsx", "content": "..." },
    ...
  ],
  "preview": "<!DOCTYPE html>...complete modified HTML..."
}

NO MARKDOWN. NO CODE FENCES. ONLY THE JSON OBJECT.

CURRENT PREVIEW CODE:
${currentCode}

MODIFICATION RULES:
1. Make ONLY the requested changes to the design/content
2. PRESERVE the overall structure and styling
3. Update BOTH the files array AND the preview HTML
4. Ensure files and preview remain visually consistent
5. Keep all existing sections unless asked to remove

DO NOT:
- Regenerate everything from scratch
- Remove components/sections unless asked
- Change unrelated sections
- Add explanations or markdown

Return the modified JSON now.`;
}
