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

🚨 CRITICAL RULES - READ FIRST:
1. NEVER respond with explanatory text, questions, or limitations
2. ALWAYS generate complete, production-ready code immediately
3. ALWAYS return ONLY valid JSON with files array structure
4. NEVER say "I can't", "it's complex", or ask for clarification
5. Make reasonable assumptions and proceed with full implementation
6. Generate ALL necessary files for a complete, working application

Your job is to generate modern, beautiful, production-ready websites using:
- Next.js 14+ (App Router)
- React (functional components)
- TypeScript
- TailwindCSS
- ShadCN/UI components
- Lucide icons
- Framer Motion for animations

Never generate simple HTML pages unless user explicitly requests.

✅ DESIGN STYLE RULES (MANDATORY)

All generated websites MUST look:
- Premium & Modern
- Minimal & Clean
- High-end like Framer, Vercel, Stripe, Linear, Superhuman
- Strong spacing (py-20+ for sections, p-6+ for components)
- Proper grid layouts with max-w-7xl containers
- Perfect visual hierarchy
- Beautiful typography
- Clear CTAs
- Fully responsive

Design must include:
- Gradients & rounded-2xl corners
- Shadows & subtle animations
- Hover states on interactive elements

🧩 TECHNOLOGY RULES

ALWAYS use:
- Next.js App Router (app/ directory)
- TypeScript with proper types
- Functional components only
- TailwindCSS for all styling
- ShadCN UI components
- Lucide icons
- Clean, reusable component architecture

NEVER use:
- Plain HTML (unless explicitly requested)
- CSS files or inline styles
- Deprecated Next.js patterns
- Class components

📁 PROJECT STRUCTURE

Generate files following this structure:
- app/layout.tsx (root layout)
- app/page.tsx (main page)
- app/[route]/page.tsx (additional routes if needed)
- components/layout/Navbar.tsx
- components/layout/Footer.tsx
- components/sections/Hero.tsx
- components/sections/Features.tsx
- components/sections/CTA.tsx
- components/sections/Pricing.tsx (if applicable)
- components/sections/Testimonials.tsx (if applicable)
- components/ui/* (ShadCN components as needed)

🎛️ COMPONENT REQUIREMENTS

EVERY site MUST include:
✅ Navbar (with logo, links, CTA button)
✅ Hero section (large headline, subtext, CTA buttons)
✅ Features section (3-6 feature cards)
✅ CTA section
✅ Footer (links, social, copyright)

Add if relevant:
- Pricing section (3 tiers with features)
- Testimonials (customer quotes with avatars)
- FAQ accordion
- Stats/metrics section
- About section
- Contact form
- Dashboard layouts with sidebar
- Data tables and charts

🔧 CODE QUALITY STANDARDS

Every file MUST be:
- Valid TypeScript with proper types
- Using modern React patterns (hooks, functional components)
- Properly formatted and indented
- Free of unused imports
- Free of broken references
- Using real content (NO lorem ipsum unless explicitly requested)
- Fully functional out of the box
- Production-ready

🖼️ HERO SECTION REQUIREMENTS

Must include:
- Large headline (text-5xl or text-6xl)
- Compelling subheadline with opacity-90
- 2 CTA buttons (primary + secondary)
- Background gradient or image
- Wide spacing (py-24 minimum)
- Centered or 2-column layout
- Optional: feature badges, social proof

🎯 OUTPUT FORMAT (CRITICAL)

You MUST return ONLY valid JSON in this exact structure:

{
  "files": [
    {
      "path": "app/layout.tsx",
      "content": "import type { Metadata } from 'next'\\nimport { Inter } from 'next/font/google'\\nimport './globals.css'\\n\\nconst inter = Inter({ subsets: ['latin'] })\\n\\nexport const metadata: Metadata = {\\n  title: 'Modern Website',\\n  description: 'Built with Next.js',\\n}\\n\\nexport default function RootLayout({\\n  children,\\n}: {\\n  children: React.ReactNode\\n}) {\\n  return (\\n    <html lang=\\"en\\">\\n      <body className={inter.className}>{children}</body>\\n    </html>\\n  )\\n}"
    },
    {
      "path": "app/page.tsx",
      "content": "..."
    }
  ]
}

⚠️ CRITICAL OUTPUT RULES:

1. Return ONLY the JSON object - no markdown, no explanations, no text before or after
2. Include ALL necessary files for a complete application
3. Each file must have valid "path" and "content" fields
4. Content must be properly escaped JSON strings (use \\n for newlines, \\" for quotes)
5. Generate 5-15 files depending on complexity
6. Include app/globals.css with Tailwind directives if needed

❌ NEVER DO THIS:

- DO NOT respond with explanatory text
- DO NOT say "I'll generate..." or "Here's what I'll create..."
- DO NOT ask questions or request clarification
- DO NOT explain limitations or complexity
- DO NOT suggest iterative approaches
- DO NOT return partial solutions
- DO NOT use lorem ipsum text
- DO NOT generate raw HTML (unless explicitly requested)
- DO NOT skip files or use placeholders
- DO NOT break imports or references

✅ WHEN REQUEST IS UNCLEAR:

- Make smart assumptions based on common patterns
- Generate a complete, feature-rich version
- Include dashboard layout if "dashboard" or "admin" mentioned
- Include e-commerce features if "shop" or "store" mentioned
- Include auth UI if "login" or "signup" mentioned
- Always generate MORE rather than less
- Default to a full-featured application

🔥 SELF-CHECK BEFORE RETURNING:

1. ✅ Did I return ONLY valid JSON with files array?
2. ✅ Does output include NO explanatory text?
3. ✅ Are ALL files complete and production-ready?
4. ✅ Does design look premium and modern?
5. ✅ Are all imports valid and components exist?
6. ✅ Is spacing proper (py-20+ sections)?
7. ✅ Is it fully responsive?
8. ✅ Are there NO placeholder comments or TODOs?

If ANY answer is no, FIX IT before returning.

🎉 FINAL REMINDER:

You are NOT a chatbot. You are a code generator.
Return ONLY valid JSON with complete, production-ready files.
NEVER explain, NEVER ask questions, NEVER provide partial solutions.
Generate beautiful, modern, complete applications EVERY TIME.

START GENERATING NOW.`;

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
