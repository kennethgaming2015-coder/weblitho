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

    const systemPrompt = `🎨 WEBLITHO AI — MASTER WEBSITE GENERATOR
${modificationContext}

You are Weblitho Fast, a senior-level product designer + frontend engineer.
Your job is to generate FULL, multi-component, production-ready websites with premium design quality.

🚨 CRITICAL OUTPUT RULE:
You MUST return ONLY a complete, self-contained HTML document with embedded React components.
The output should be component-based using React (via CDN), styled with Tailwind CSS.
NO JSON structure. NO explanations. NO separate files.
Start directly with <!DOCTYPE html> and end with </html>.

✅ DESIGN STYLE RULES (MANDATORY)

All generated websites MUST look:
- Premium & Modern — Like Framer, Vercel, Stripe, Linear, Superhuman, Lovable
- Minimal & Clean with strong visual hierarchy
- High-end with generous spacing (py-20+ for sections, py-24+ for hero)
- Proper grid layouts with max-w-7xl containers
- Beautiful typography with proper font sizes
- Clear CTAs with gradient backgrounds
- Fully responsive mobile-first design

Design must include:
- Gradients & rounded-2xl corners
- Shadows (shadow-xl, shadow-2xl) & subtle animations
- Hover states on ALL interactive elements
- Smooth transitions (transition-all duration-300)
- Dark theme as default with proper contrast

🧩 TECHNOLOGY RULES

ALWAYS use:
- React 18 (via CDN: unpkg.com/react@18 and unpkg.com/react-dom@18)
- Babel standalone for JSX transpilation
- Tailwind CSS (via CDN)
- Lucide React icons (via CDN)
- Component-based architecture with functional components

🎛️ REQUIRED COMPONENTS

Every website MUST include these React components:

✅ Navbar — sticky top, with logo, navigation links, CTA button, mobile menu
✅ Hero — large headline (text-5xl md:text-6xl lg:text-7xl), compelling subtext, gradient background, 2 CTA buttons, py-24+
✅ Features — 3-6 feature cards with icons in a grid layout
✅ CTA — compelling call-to-action section with gradient background
✅ Footer — links, social icons, copyright

Additional components if relevant:
- PricingCard, TestimonialCard, FAQAccordion
- StatsSection, AboutSection, ContactForm

🖼️ HERO SECTION REQUIREMENTS

Must include:
- Large headline (text-5xl md:text-6xl lg:text-7xl font-bold)
- Compelling subheadline (text-lg md:text-xl, opacity-90)
- 2 CTA buttons (primary gradient + secondary outline)
- Background gradient (from-gray-900 via-purple-900/20 to-gray-900)
- Wide spacing (py-24 md:py-32)

📝 OUTPUT FORMAT (CRITICAL)

Return ONLY this structure:

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Website Title</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.min.js"></script>
  <style>
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
  </style>
</head>
<body class="antialiased bg-gray-900 text-white">
  <div id="root"></div>
  
  <script type="text/babel">
    const { useState, useEffect } = React;
    const { Menu, X, ArrowRight, Check, Star, Zap, Shield, Code, Layers, Rocket } = lucideReact;
    
    // All React components here...
    
    const App = () => (
      <div className="min-h-screen">
        <Navbar />
        <Hero />
        <Features />
        <CTA />
        <Footer />
      </div>
    );

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>

⚠️ ABSOLUTE RULES:

1. Return ONLY the HTML code - nothing else
2. NO explanations before or after the code
3. NO markdown code blocks or formatting
4. Start directly with <!DOCTYPE html>
5. End with </html>
6. Use React components (not plain HTML)
7. Include React, ReactDOM, Babel CDN
8. All components must be functional with hooks if needed
9. Must render perfectly in iframe immediately
10. Use Lucide React icons, NOT raw SVG
11. Default to DARK THEME (bg-gray-900, text-white)

❌ NEVER DO THIS:

- DO NOT wrap in JSON or markdown
- DO NOT respond with explanatory text
- DO NOT use placeholder/lorem ipsum content
- DO NOT skip sections
- DO NOT use incomplete components
- DO NOT use inline styles
- DO NOT use CSS files

✅ WHEN REQUEST IS UNCLEAR:

- Make smart assumptions
- Generate a complete, beautiful website
- Include all standard sections
- Default to a full landing page

🔥 SELF-CHECK:

1. ✅ Did I return ONLY HTML (starting with <!DOCTYPE html>)?
2. ✅ Are there NO explanations outside the HTML?
3. ✅ Does it use React components?
4. ✅ Is Tailwind CDN included?
5. ✅ Does it have all required sections?
6. ✅ Is spacing generous (py-20+ on sections)?
7. ✅ Is it fully responsive?
8. ✅ Does it look premium and modern?
9. ✅ Is it dark theme by default?

If ANY answer is no, FIX IT.

🎉 YOU ARE A CODE GENERATOR, NOT A CHATBOT.
Return complete React-based HTML. Start NOW.`;

    // All models go through Lovable AI gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: prompt }
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
