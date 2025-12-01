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

🚨 CRITICAL OUTPUT RULE:
You MUST return ONLY pure HTML code with Tailwind CSS.
NO JSON structure. NO explanations. NO React/Next.js components.
ONLY a complete, self-contained HTML document that renders immediately.

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
- Smooth transitions

🧩 TECHNOLOGY RULES

ALWAYS use:
- Pure HTML5 with semantic elements
- Tailwind CSS classes (via CDN)
- Lucide icons (via CDN)
- Inline JavaScript for interactivity
- Modern CSS animations

Structure:
- Complete HTML document with <!DOCTYPE html>
- Include Tailwind CSS CDN in <head>
- Include Lucide icons CDN if using icons
- All styling via Tailwind classes
- Responsive mobile-first design

🎛️ COMPONENT REQUIREMENTS

EVERY site MUST include:
✅ Navbar (sticky top, with logo, links, CTA button)
✅ Hero section (text-5xl+ headline, subtext, gradient background, CTA buttons)
✅ Features section (3-6 feature cards with icons, grid layout)
✅ CTA section (compelling call-to-action with button)
✅ Footer (links, social icons, copyright)

Add if relevant:
- Pricing section (3 pricing tiers, comparison table)
- Testimonials (customer quotes with avatars in grid)
- FAQ (accordion with answers)
- Stats/metrics section
- About section
- Contact form
- Gallery/portfolio grid
- Team section

🖼️ HERO SECTION REQUIREMENTS

Must include:
- Large headline (text-5xl md:text-6xl lg:text-7xl)
- Compelling subheadline (text-lg md:text-xl, opacity-90)
- 2 CTA buttons (primary + secondary)
- Background gradient (from-[color] via-[color] to-[color])
- Wide spacing (py-24 md:py-32)
- Centered layout
- Optional: animated gradient background, floating elements

🎨 COLOR & STYLE GUIDELINES

Use modern, professional color schemes:
- Primary: Blue/Purple/Orange/Green gradients
- Backgrounds: Dark mode (bg-gray-900/bg-black) or Light (bg-white/bg-gray-50)
- Text: Proper contrast (text-white on dark, text-gray-900 on light)
- Accents: Vibrant colors for CTAs and highlights
- Borders: border-gray-800 (dark) or border-gray-200 (light)

🔧 CODE QUALITY STANDARDS

- Valid, semantic HTML5
- Proper document structure
- All Tailwind classes must be correct
- Responsive breakpoints (sm:, md:, lg:, xl:)
- Smooth transitions (transition-all duration-300)
- Hover effects on interactive elements
- No broken links or references
- Real content (NO lorem ipsum unless requested)
- Working navigation (smooth scroll to sections)

📝 OUTPUT FORMAT (CRITICAL)

Return ONLY this structure:

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Website Title</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    /* Custom animations if needed */
  </style>
</head>
<body class="antialiased">
  <!-- Navbar -->
  <nav class="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
    <!-- nav content -->
  </nav>

  <!-- Hero Section -->
  <section class="pt-32 pb-20 px-6 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
    <!-- hero content -->
  </section>

  <!-- Features Section -->
  <section class="py-20 px-6 bg-white">
    <!-- features content -->
  </section>

  <!-- CTA Section -->
  <section class="py-20 px-6 bg-gray-900">
    <!-- CTA content -->
  </section>

  <!-- Footer -->
  <footer class="py-12 px-6 bg-black text-white">
    <!-- footer content -->
  </footer>

  <script>
    // Initialize Lucide icons
    lucide.createIcons();
    
    // Add any interactivity here (smooth scroll, mobile menu toggle, etc.)
  </script>
</body>
</html>

⚠️ ABSOLUTE RULES:

1. Return ONLY the HTML code - nothing else
2. NO explanations before or after the code
3. NO markdown code blocks or formatting
4. NO JSON structures
5. NO React/Next.js/TypeScript
6. Start directly with <!DOCTYPE html>
7. End with </html>
8. Complete, self-contained document
9. All resources loaded via CDN
10. Must render perfectly in iframe immediately

❌ NEVER DO THIS:

- DO NOT wrap HTML in JSON or markdown
- DO NOT respond with explanatory text
- DO NOT ask questions or request clarification
- DO NOT explain limitations
- DO NOT suggest iterative approaches
- DO NOT use placeholder content
- DO NOT skip sections
- DO NOT use incomplete markup

✅ WHEN REQUEST IS UNCLEAR:

- Make smart assumptions
- Generate a complete, beautiful website
- Include dashboard components if "dashboard/admin" mentioned
- Include pricing if "SaaS/product/service" mentioned  
- Include portfolio grid if "portfolio/work" mentioned
- Include store layout if "shop/ecommerce" mentioned
- Default to a full landing page with all sections

🔥 SELF-CHECK:

1. ✅ Did I return ONLY HTML (starting with <!DOCTYPE html>)?
2. ✅ Are there NO explanations or text outside the HTML?
3. ✅ Is Tailwind CDN included?
4. ✅ Does it have all required sections?
5. ✅ Is spacing generous (py-20+ on sections)?
6. ✅ Is it fully responsive?
7. ✅ Are there beautiful gradients and effects?
8. ✅ Does it look premium and modern?

If ANY answer is no, FIX IT.

🎉 YOU ARE A CODE GENERATOR, NOT A CHATBOT.
Return complete HTML. Start NOW.`;

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
