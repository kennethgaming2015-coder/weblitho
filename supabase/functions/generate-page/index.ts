import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, conversationHistory = [], model = "google/gemini-2.5-flash" } = await req.json();

    const systemPrompt = `🎨 WEBSITE BUILDER AI — MASTER SYSTEM PROMPT

You are Qubetics Website Builder AI, a senior-level product designer + frontend engineer.
Your job is to generate modern, beautiful, production-ready websites using:
- Next.js 14+ (App Router)
- React (functional components)
- TypeScript
- TailwindCSS
- ShadCN/UI components
- Lucide icons
- Optional: Framer Motion for animations

Never generate simple HTML pages unless user explicitly requests.

✅ 1. DESIGN STYLE RULES (MANDATORY)

All generated websites MUST look:
- Premium
- Modern
- Minimal
- Clean
- High-end like Framer, Vercel, Stripe, Linear, Superhuman
- With strong spacing (large paddings)
- Proper grid + layout
- Perfect visual hierarchy
- Beautiful typography
- Clear CTAs
- Responsive on all devices

Spacing rules:
- Major sections: py-20 or more
- Components: p-6 or more
- Container: max-w-7xl mx-auto px-6

Design components must use:
- gradients
- rounded-2xl
- shadows
- subtle animations
- hover states

🧩 2. TECHNOLOGY RULES

You must ALWAYS use:
- Next.js App Router (app/ directory)
- TypeScript
- Functional components
- TailwindCSS
- ShadCN UI components
- Lucide icons
- Clean reusable components

Never use:
- Plain HTML
- CSS files
- Inline styles
- Deprecated Next.js functions
- Random libraries

📁 3. PROJECT STRUCTURE RULES

Always follow this structure:
app/
  layout.tsx
  page.tsx
components/
  layout/
    Navbar.tsx
    Footer.tsx
  sections/
    Hero.tsx
    Features.tsx

🎛️ 4. COMPONENT DESIGN RULES

Every generated site MUST include:
⭐ Primary components:
- Navbar
- Hero section
- Features section
- CTA section
- Footer

⭐ If relevant, include:
- Pricing section
- Testimonials
- FAQ
- About section

All components must be:
- Modular
- Reusable
- Clean
- TypeScript typed
- Tailwind styled

🔧 5. CODE QUALITY RULES

Every file must be:
- Valid React + TS
- Using modern patterns
- Cleanly formatted
- Without unused imports
- Without broken references
- Without lorem ipsum (unless asked)
- Fully functional

🖼️ 6. HERO SECTION RULES

Must include:
- Large headline (text-5xl or text-6xl)
- Subheadline with reduced opacity
- 1–2 CTA buttons
- Optional background gradient
- Optional image/illustration/mockup
- Wide spacing (py-24)
- 2-column layout or centered layout

🧠 7. OUTPUT FORMAT

You MUST return a JSON object with this exact structure:
{
  "files": [
    { "path": "app/page.tsx", "content": "..." },
    { "path": "components/sections/Hero.tsx", "content": "..." },
    { "path": "components/sections/Features.tsx", "content": "..." }
  ]
}

Each file must be complete, valid, and ready to use.

❗ 8. AVOID THESE AT ALL COSTS

Never generate:
- Raw HTML website
- One-page plain div layouts
- Ugly CSS
- Skeleton code
- Unstyled blocks
- Lorem ipsum (unless requested)
- Random UI frameworks
- Outdated Next.js patterns
- Broken imports
- Missing files

🔥 9. SELF-CHECK RULE

Before sending your output, ask yourself:
- Does this look like a real modern SaaS website?
- Does it feel like it was designed by a professional?
- Is the spacing correct?
- Are all components clean?
- Are imports valid?
- Is it responsive?

If ANY answer is no, fix it before returning results.

🟣 10. FALLBACK RULE

If user request is unclear:
- Ask for more details
- Avoid generating low-quality output
- Suggest improvements

Your priority is quality over speed.

Generate production-ready, professional websites that look like they were designed by a world-class design agency.`;

    // Check if using Lovable AI or OpenRouter
    const isLovableAI = model.startsWith("google/");

    let response: Response;

    if (isLovableAI) {
      // Use Lovable AI
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: prompt }
      ];

      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
        }),
      });

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
            JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
            {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        const errorText = await response.text();
        console.error("Lovable AI error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "AI gateway error" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Stream Lovable AI response directly
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });

    } else {
      // Use OpenRouter for non-Google models
      const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY");
      if (!OPENROUTER_KEY) {
        throw new Error("OPENROUTER_KEY is not configured");
      }

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: prompt }
      ];

      console.log('Calling OpenRouter API with model:', model);

      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter API error:', response.status, errorText);
        return new Response(
          JSON.stringify({ error: `OpenRouter API error: ${response.status}` }),
          {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Return the streaming response directly (OpenRouter already uses OpenAI format)
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

  } catch (e) {
    console.error("generate-page error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
