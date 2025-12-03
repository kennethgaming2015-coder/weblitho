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
    const { prompt, conversationHistory = [], currentCode = null, model = "google/gemini-2.5-flash" } = await req.json();

    // Build context for modifications
    const modificationContext = currentCode 
      ? `\n\n🔄 MODIFICATION MODE:\nYou are modifying an EXISTING website. The user wants to make changes to the current code.\n\nCURRENT CODE TO MODIFY:\n\`\`\`html\n${currentCode}\n\`\`\`\n\nIMPORTANT: Apply the user's requested changes to the above code. Return the COMPLETE modified HTML document with all changes applied. Do NOT start from scratch - modify the existing code.\n\n`
      : "";

    const systemPrompt = `🎨 WEBSITE BUILDER AI — MASTER SYSTEM PROMPT
${modificationContext}

You are Qubetics Website Builder AI, a senior-level product designer + frontend engineer.

🚨 CRITICAL OUTPUT RULE:
You MUST return ONLY a complete, self-contained HTML document with embedded React components.
The output should be component-based using React (via CDN), styled with Tailwind CSS.
NO JSON structure. NO explanations. NO separate files.
Start directly with <!DOCTYPE html> and end with </html>.

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
- React 18 (via CDN: unpkg.com/react@18 and unpkg.com/react-dom@18)
- Babel standalone for JSX transpilation
- Tailwind CSS (via CDN)
- Lucide React icons (via CDN)
- Component-based architecture

Structure:
- Complete HTML document with <!DOCTYPE html>
- Include React, ReactDOM, Babel CDN in <head>
- Include Tailwind CSS CDN in <head>
- Define React components in a <script type="text/babel"> block
- Use functional components with hooks
- All styling via Tailwind classes
- Responsive mobile-first design

🎛️ COMPONENT REQUIREMENTS

Create REUSABLE React components for:
✅ Navbar - sticky top, with logo, links, CTA button
✅ Hero - large headline, subtext, gradient background, CTA buttons
✅ Features - 3-6 feature cards with icons, grid layout
✅ CTA - compelling call-to-action section
✅ Footer - links, social icons, copyright

Additional components if relevant:
- PricingCard, TestimonialCard, FAQAccordion
- StatsSection, AboutSection, ContactForm

🖼️ HERO SECTION REQUIREMENTS

Must include:
- Large headline (text-5xl md:text-6xl lg:text-7xl)
- Compelling subheadline (text-lg md:text-xl, opacity-90)
- 2 CTA buttons (primary + secondary)
- Background gradient
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
    /* Custom animations */
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
  </style>
</head>
<body class="antialiased bg-gray-900 text-white">
  <div id="root"></div>
  
  <script type="text/babel">
    const { useState, useEffect } = React;
    const { Menu, X, ArrowRight, Check, Star, Zap, Shield, Code, Layers, Rocket } = lucideReact;
    
    // Navbar Component
    const Navbar = () => {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <nav className="fixed top-0 w-full bg-gray-900/80 backdrop-blur-xl border-b border-white/10 z-50">
          {/* nav content */}
        </nav>
      );
    };

    // Hero Component
    const Hero = () => (
      <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
        {/* hero content */}
      </section>
    );

    // Features Component  
    const Features = () => (
      <section className="py-20 px-6">
        {/* features content */}
      </section>
    );

    // CTA Component
    const CTA = () => (
      <section className="py-20 px-6 bg-gradient-to-r from-purple-600 to-blue-600">
        {/* CTA content */}
      </section>
    );

    // Footer Component
    const Footer = () => (
      <footer className="py-12 px-6 bg-gray-900 border-t border-white/10">
        {/* footer content */}
      </footer>
    );

    // Main App Component
    const App = () => (
      <div className="min-h-screen">
        <Navbar />
        <Hero />
        <Features />
        <CTA />
        <Footer />
      </div>
    );

    // Render
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

❌ NEVER DO THIS:

- DO NOT wrap in JSON or markdown
- DO NOT respond with explanatory text
- DO NOT use placeholder content
- DO NOT skip sections
- DO NOT use incomplete components

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

If ANY answer is no, FIX IT.

🎉 YOU ARE A CODE GENERATOR, NOT A CHATBOT.
Return complete React-based HTML. Start NOW.`;

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
