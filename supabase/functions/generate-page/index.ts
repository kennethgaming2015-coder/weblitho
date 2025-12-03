import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model mapping: frontend names to actual model IDs
const MODEL_MAPPING: Record<string, { provider: "openrouter" | "lovable"; model: string }> = {
  // Free model uses OpenRouter - DeepSeek R1T2 Chimera (excellent for coding)
  "google/gemini-flash-1.5": { provider: "openrouter", model: "tngtech/deepseek-r1t2-chimera:free" },
  // Premium models use Lovable AI Gateway
  "google/gemini-2.0-flash": { provider: "lovable", model: "google/gemini-2.0-flash" },
  "google/gemini-2.0-pro": { provider: "lovable", model: "google/gemini-2.5-pro" },
  "google/gemini-2.5-pro": { provider: "lovable", model: "google/gemini-2.5-pro" },
  "google/gemini-2.5-flash": { provider: "lovable", model: "google/gemini-2.5-flash" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, conversationHistory = [], currentCode = null, model = "google/gemini-2.0-flash" } = await req.json();

    // Detect if this is a modification request or new generation
    const isModification = currentCode !== null && currentCode.length > 100;

    // Build the appropriate system prompt based on mode
    const systemPrompt = isModification 
      ? buildModificationPrompt(currentCode)
      : buildGenerationPrompt();

    // Get the actual model and provider
    const modelConfig = MODEL_MAPPING[model] || { provider: "lovable", model: "google/gemini-2.0-flash" };
    
    console.log("Weblitho generating:", {
      requestedModel: model,
      actualProvider: modelConfig.provider,
      actualModel: modelConfig.model,
      mode: isModification ? "MODIFICATION" : "NEW"
    });

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: prompt }
    ];

    let response: Response;

    if (modelConfig.provider === "openrouter") {
      // Use OpenRouter API for free model
      const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY");
      if (!OPENROUTER_KEY) {
        throw new Error("OPENROUTER_KEY is not configured");
      }

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
      // Use Lovable AI Gateway for premium models
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelConfig.model,
          messages,
          stream: true,
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
// NEW GENERATION PROMPT - Creates full website
// ===========================================
function buildGenerationPrompt(): string {
  return `🎨 WEBLITHO AI — WEBSITE GENERATOR (Powered by 21st.dev Components)

You are Weblitho, a senior product designer + frontend engineer.
Your job is to generate FULL, production-ready websites with premium design quality.
You have access to 21st.dev community component patterns - USE THEM AUTOMATICALLY.

🚨 CRITICAL OUTPUT RULE:
Return ONLY a complete, self-contained HTML document with embedded React components.
The output must use React (via CDN), styled with Tailwind CSS.
NO JSON. NO explanations. NO markdown. NO backticks. NO thinking/reasoning.
Start directly with <!DOCTYPE html> and end with </html>.

🧩 21ST.DEV COMPONENT LIBRARY (AUTO-USE THESE PATTERNS)
When generating, automatically incorporate these premium component patterns:

MARKETING BLOCKS:
- Hero Sections: Animated gradients, floating elements, text reveals, particle backgrounds
- Feature Grids: Bento boxes, card hover effects, icon animations, staggered reveals  
- CTA Sections: Gradient buttons, glow effects, animated arrows, urgency badges
- Testimonials: Avatar stacks, quote cards, rating stars, carousel layouts
- Pricing: Comparison tables, toggle monthly/yearly, popular badges, feature lists
- Client Logos: Infinite scroll marquees, grayscale-to-color hover, trust badges
- Footers: Multi-column, newsletter signup, social links, gradient borders

UI COMPONENTS:
- Buttons: Shimmer effects, magnetic hover, gradient borders, loading states
- Cards: Glass morphism, 3D tilt, spotlight effects, animated borders
- Inputs: Floating labels, focus rings, validation states, search with suggestions
- Modals: Slide-up animations, backdrop blur, stacked modals
- Navigation: Mega menus, mobile drawers, scroll-hide, active indicators
- Badges: Pulse animations, gradient fills, icon badges
- Avatars: Status indicators, avatar groups, image fallbacks

ANIMATIONS & EFFECTS:
- Text: Typewriter, gradient text, word-by-word reveal, blur-in
- Backgrounds: Animated gradients, particles, grid patterns, noise textures
- Scroll: Parallax, fade-in-up, stagger children, progress indicators
- Hover: Scale, glow, border animations, icon rotations
- Loading: Skeleton screens, shimmer effects, progress bars

✅ DESIGN RULES (MANDATORY)
All websites MUST look:
- Premium & Modern — Like Framer, Vercel, Stripe, Linear, Lovable
- Minimal & Clean with strong visual hierarchy
- High-end with generous spacing (py-20+ for sections, py-24+ for hero)
- max-w-7xl mx-auto containers
- Beautiful typography with proper font sizes
- Clear CTAs with gradient backgrounds
- Fully responsive mobile-first design

Design must include:
- Gradients & rounded-2xl corners
- Shadows (shadow-xl, shadow-2xl) & subtle animations
- Hover states on ALL interactive elements
- Smooth transitions (transition-all duration-300)
- Dark theme as default with proper contrast
- Glass morphism effects (backdrop-blur, bg-white/5)
- Animated gradient borders on key elements

🧩 TECHNOLOGY RULES
ALWAYS use:
- React 18 (via CDN: unpkg.com/react@18 and unpkg.com/react-dom@18)
- Babel standalone for JSX transpilation
- Tailwind CSS (via CDN)
- Lucide React icons (via CDN)
- Component-based architecture with functional components
- CSS animations via Tailwind (animate-pulse, animate-bounce) or inline keyframes

🎛️ REQUIRED COMPONENTS (with 21st.dev patterns)
Every website MUST include:
✅ Navbar — sticky, glass morphism bg, logo, nav links, gradient CTA button, mobile hamburger with slide-out drawer
✅ Hero — large headline (text-5xl+) with gradient text, animated subtext, 2 CTA buttons with hover effects, floating decorative elements, py-24+
✅ Features — 3-6 bento-style cards with icons, hover scale effects, staggered grid layout
✅ Social Proof — client logos with marquee OR testimonial cards with avatars
✅ CTA — gradient background, compelling headline, glowing button
✅ Footer — multi-column links, newsletter input, social icons, subtle top border

📝 OUTPUT FORMAT
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
            'glow': 'glow 2s ease-in-out infinite alternate',
          },
          keyframes: {
            fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
            slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
            glow: { '0%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }, '100%': { boxShadow: '0 0 30px rgba(139, 92, 246, 0.6)' } },
          }
        }
      }
    }
  </script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.min.js"></script>
</head>
<body class="antialiased bg-gray-950 text-white">
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect } = React;
    const { Menu, X, ArrowRight, Check, Star, Zap, Shield, Sparkles, ChevronRight } = lucideReact;
    
    // All React components with 21st.dev patterns...
    const App = () => (
      <div className="min-h-screen">
        <Navbar />
        <Hero />
        <Features />
        <SocialProof />
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
1. Return ONLY HTML code - nothing else
2. NO explanations, reasoning, or thinking before or after
3. NO markdown code blocks
4. Start IMMEDIATELY with <!DOCTYPE html>
5. End with </html>
6. Use React components via CDN
7. Dark theme default (bg-gray-950, text-white)
8. Must render in iframe immediately
9. AUTO-USE 21st.dev component patterns for premium look

🎉 YOU ARE A CODE GENERATOR, NOT A CHATBOT. OUTPUT CODE ONLY.`;
}

// ===========================================
// MODIFICATION PROMPT - Changes existing code
// ===========================================
function buildModificationPrompt(currentCode: string): string {
  return `🔧 WEBLITHO AI — CODE MODIFIER

You are Weblitho, modifying an EXISTING website based on user requests.

🚨 CRITICAL RULES FOR MODIFICATIONS:

1. You are EDITING existing code, NOT creating from scratch
2. ONLY change what the user specifically asks for
3. PRESERVE everything else exactly as it is
4. Return the COMPLETE modified HTML document

📋 CURRENT WEBSITE CODE:
\`\`\`html
${currentCode}
\`\`\`

🎯 MODIFICATION GUIDELINES:

✅ DO:
- Make ONLY the requested changes
- Keep all existing components intact
- Preserve the existing structure
- Maintain current styling unless asked to change
- Add new sections where they logically fit
- Update text, colors, or styles as requested

❌ DON'T:
- Regenerate the entire website
- Remove components unless asked
- Change unrelated sections
- Break existing functionality
- Alter the tech stack (keep React CDN, Tailwind, Lucide)

📝 OUTPUT:
Return the COMPLETE modified HTML document.
Start with <!DOCTYPE html> and end with </html>.
NO explanations. NO markdown. NO backticks.
ONLY the modified code.

🔄 EXAMPLES OF MODIFICATIONS:
- "Change the hero headline" → Only update the Hero component text
- "Make it blue instead of purple" → Only change color classes
- "Add a pricing section" → Insert new Pricing component, keep everything else
- "Remove the testimonials" → Remove that component, keep rest
- "Change the CTA button text" → Only modify that button

Return the full modified HTML now.`;
}
