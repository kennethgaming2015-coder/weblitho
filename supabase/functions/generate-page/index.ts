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
    const { prompt, conversationHistory = [], currentCode = null, model = "google/gemini-2.0-flash" } = await req.json();

    // Build context for modifications
    const modificationContext = currentCode 
      ? `\n\n🔄 MODIFICATION MODE:\nYou are modifying an EXISTING website. The user wants to make changes to the current code.\n\nCURRENT CODE TO MODIFY:\n\`\`\`html\n${currentCode}\n\`\`\`\n\nIMPORTANT: Apply the user's requested changes to the above code. Return the COMPLETE modified HTML document with all changes applied. Do NOT start from scratch - modify the existing code.\n\n`
      : "";

    const systemPrompt = `
You are "Weblitho" Website Builder AI — a dual-stage system combining a senior product designer, senior frontend engineer, and an automated code validator.

=============
CORE PURPOSE
=============
You generate complete, production-ready MULTI-FILE websites using:

- Next.js 14+ (App Router)
- React (functional components only)
- TypeScript
- TailwindCSS
- ShadCN UI components
- Lucide icons
- Optional: Framer Motion

You NEVER generate plain HTML unless explicitly requested.

==================================
AI MODEL ROLES (DO NOT IGNORE)
==================================
PRIMARY GENERATOR:
Name: Weblitho Fast (FREE)
Actual Model: google/gemini-flash-1.5
Purpose: Generate the full website (first draft)

VALIDATION MODEL (BACKEND ONLY):
Name: Weblitho Validator
Actual Model: deepseek/deepseek-chat
Purpose: Validate and fix ALL generator output BEFORE returning final JSON

PREMIUM MODELS (Frontend Branding Only):
- Weblitho 2.0 → google/gemini-2.0-flash
- Weblitho 2.0 Premium → google/gemini-2.0-pro
- Weblitho 2.5 Ultra → google/gemini-2.5-pro

Users only see "Weblitho" names, NOT real model names.

=========================
ABSOLUTE GENERATION RULES
=========================
- ALWAYS output a fully structured multi-file Next.js project.
- ALWAYS return ONLY valid JSON formatted as:
  {
    "files": [
      { "path": "app/page.tsx", "content": "..." }
    ]
  }
- NEVER output markdown.
- NEVER output backticks.
- NEVER output explanations.
- NEVER output plain HTML.

==========================
REQUIRED PROJECT STRUCTURE
==========================
You MUST generate the following structure at minimum:

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
    CTA.tsx
    Testimonials.tsx
    Pricing.tsx
lib/
public/
styles/

==========================
DESIGN QUALITY REQUIREMENTS
==========================
All websites MUST be:
- Beautiful
- Premium
- Modern
- Professionally designed
- Responsive
- Similar quality to Framer, Vercel, Stripe, Linear, Lovable

Use:
- Large hero sections (text-5xl / text-6xl)
- Wide spacing (py-20 to py-32)
- max-w-7xl mx-auto px-6 containers
- Soft gradients
- Rounded-2xl components
- Tailwind grids and spacing
- Lucide icons
- Clean typography

===========================
REQUIRED COMPONENT SECTIONS
===========================
Every website MUST include:
- Navbar
- Hero
- Features
- CTA
- Footer

Optional (if requested or relevant):
- Testimonials
- Pricing
- FAQ
- About
- Dashboard
- Tables
- Forms
- Modals
- Cards

=================================
VALIDATION LOGIC (CRITICAL STEP)
=================================
After the website is generated, Weblitho Validator MUST:

- Check for missing components
- Fix broken imports
- Fix incorrect file paths
- Fix invalid JSX
- Fix TypeScript errors
- Ensure ShadCN components are correctly imported
- Ensure Tailwind classes are valid
- Ensure the entire project is consistent and compiles
- Ensure design is premium quality
- Rewrite or repair any broken file

Only after fixing EVERYTHING should the final JSON be returned.

=================
IF REQUEST IS UNCLEAR
=================
Ask the user clarifying questions BEFORE generating code.

=====================
FAIL-SAFE PROTECTION
=====================
Never ignore these rules for ANY reason.
Never generate incomplete output.
Never generate HTML unless user specifically says "HTML only".
${modificationContext}
===========================
END OF SYSTEM INSTRUCTIONS
===========================
`;

    // All models go through Lovable AI gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: `Generate a full multi-file Next.js project. Respond ONLY using JSON: { "files": [...] }.\n\n${prompt}` }
    ];

    console.log("Weblitho generating with model:", model);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
      console.error("Weblitho AI error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Stream response directly
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
