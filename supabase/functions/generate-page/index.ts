import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model mapping with capabilities
const MODEL_MAPPING: Record<string, { provider: "openrouter" | "gemini"; model: string; requiresPaid: boolean; maxTokens: number }> = {
  "deepseek-free": { provider: "openrouter", model: "tngtech/deepseek-r1t2-chimera:free", requiresPaid: false, maxTokens: 16000 },
  "google/gemini-2.5-flash": { provider: "gemini", model: "gemini-2.5-flash-preview-05-20", requiresPaid: true, maxTokens: 65536 },
  "google/gemini-2.5-pro": { provider: "gemini", model: "gemini-2.5-pro-preview-05-06", requiresPaid: true, maxTokens: 65536 },
};

const isPaidPlan = (plan: string): boolean => plan === 'pro' || plan === 'business' || plan === 'owner';

// =============================================
// INTENT DETECTION - Understand what user wants
// =============================================
interface Intent {
  type: "new" | "modify" | "fix" | "enhance" | "add_section" | "change_style" | "change_content";
  confidence: number;
  websiteType?: string;
  sections?: string[];
  styleChanges?: string[];
  contentChanges?: string[];
}

function detectIntent(prompt: string, hasExistingCode: boolean): Intent {
  const lowerPrompt = prompt.toLowerCase();
  
  // Keywords for different intents
  const modifyKeywords = ["change", "update", "modify", "edit", "make it", "switch", "replace"];
  const fixKeywords = ["fix", "bug", "error", "broken", "not working", "issue", "problem"];
  const enhanceKeywords = ["improve", "enhance", "better", "optimize", "upgrade", "polish"];
  const addKeywords = ["add", "include", "insert", "put", "create section", "new section"];
  const styleKeywords = ["color", "font", "style", "theme", "dark", "light", "spacing", "size", "animation", "hover"];
  const contentKeywords = ["text", "copy", "heading", "title", "description", "image", "logo", "name"];
  
  // Website type detection
  const websiteTypes: Record<string, string[]> = {
    "saas": ["saas", "software", "app", "platform", "dashboard", "subscription"],
    "landing": ["landing", "landing page", "homepage", "hero"],
    "portfolio": ["portfolio", "personal", "cv", "resume", "showcase"],
    "ecommerce": ["shop", "store", "ecommerce", "product", "buy", "cart", "checkout"],
    "agency": ["agency", "studio", "creative", "design agency", "marketing"],
    "blog": ["blog", "article", "post", "news", "magazine"],
    "startup": ["startup", "launch", "coming soon", "waitlist", "beta"],
    "crypto": ["crypto", "web3", "blockchain", "nft", "defi", "token"],
    "restaurant": ["restaurant", "food", "menu", "cafe", "dining"],
    "fitness": ["fitness", "gym", "workout", "health", "wellness"],
  };
  
  // Section detection
  const sectionTypes: Record<string, string[]> = {
    "hero": ["hero", "banner", "header section", "main section"],
    "features": ["features", "benefits", "what we offer", "services"],
    "pricing": ["pricing", "plans", "packages", "subscription"],
    "testimonials": ["testimonials", "reviews", "customer", "feedback"],
    "team": ["team", "about us", "our team", "staff"],
    "cta": ["cta", "call to action", "get started", "sign up section"],
    "contact": ["contact", "reach us", "get in touch", "form"],
    "faq": ["faq", "questions", "help", "support"],
    "gallery": ["gallery", "portfolio", "showcase", "images"],
    "stats": ["stats", "numbers", "metrics", "achievements"],
    "footer": ["footer", "bottom", "links section"],
    "navbar": ["navbar", "navigation", "menu", "header"],
  };
  
  // Detect intent type
  let type: Intent["type"] = "new";
  let confidence = 0.5;
  
  if (hasExistingCode) {
    if (fixKeywords.some(k => lowerPrompt.includes(k))) {
      type = "fix";
      confidence = 0.9;
    } else if (enhanceKeywords.some(k => lowerPrompt.includes(k))) {
      type = "enhance";
      confidence = 0.85;
    } else if (addKeywords.some(k => lowerPrompt.includes(k))) {
      type = "add_section";
      confidence = 0.85;
    } else if (styleKeywords.some(k => lowerPrompt.includes(k))) {
      type = "change_style";
      confidence = 0.8;
    } else if (contentKeywords.some(k => lowerPrompt.includes(k))) {
      type = "change_content";
      confidence = 0.8;
    } else if (modifyKeywords.some(k => lowerPrompt.includes(k))) {
      type = "modify";
      confidence = 0.75;
    } else {
      type = "modify";
      confidence = 0.6;
    }
  } else {
    type = "new";
    confidence = 0.9;
  }
  
  // Detect website type
  let websiteType: string | undefined;
  for (const [typeKey, keywords] of Object.entries(websiteTypes)) {
    if (keywords.some(k => lowerPrompt.includes(k))) {
      websiteType = typeKey;
      break;
    }
  }
  
  // Detect requested sections
  const sections: string[] = [];
  for (const [section, keywords] of Object.entries(sectionTypes)) {
    if (keywords.some(k => lowerPrompt.includes(k))) {
      sections.push(section);
    }
  }
  
  // Detect style changes
  const styleChanges: string[] = [];
  if (lowerPrompt.includes("dark")) styleChanges.push("dark theme");
  if (lowerPrompt.includes("light")) styleChanges.push("light theme");
  if (lowerPrompt.match(/color|purple|blue|green|red|cyan|orange|pink/)) styleChanges.push("color scheme");
  if (lowerPrompt.includes("minimal")) styleChanges.push("minimalist design");
  if (lowerPrompt.includes("modern")) styleChanges.push("modern design");
  if (lowerPrompt.includes("animation")) styleChanges.push("animations");
  
  return {
    type,
    confidence,
    websiteType,
    sections: sections.length > 0 ? sections : undefined,
    styleChanges: styleChanges.length > 0 ? styleChanges : undefined,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, conversationHistory = [], currentCode = null, model = "deepseek-free" } = await req.json();

    console.log("=== GENERATE-PAGE START ===");
    console.log("Model:", model);
    console.log("Prompt:", prompt?.slice(0, 100) + "...");
    console.log("Has existing code:", !!currentCode);

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const modelConfig = MODEL_MAPPING[model] || MODEL_MAPPING["deepseek-free"];
    
    // Verify paid plan for premium models
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

      const { data: credits } = await supabase
        .from("user_credits")
        .select("plan, is_unlimited")
        .eq("user_id", user.id)
        .single();

      if (!credits || (!isPaidPlan(credits.plan) && !credits.is_unlimited)) {
        return new Response(
          JSON.stringify({ error: "This model requires a Pro or Business plan. Please upgrade." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Detect intent
    const isModification = currentCode !== null && currentCode.length > 100;
    const intent = detectIntent(prompt, isModification);
    console.log("Intent detected:", JSON.stringify(intent));
    
    // Build context-aware system prompt
    const systemPrompt = isModification 
      ? buildModificationPrompt(currentCode, intent, prompt) 
      : buildGenerationPrompt(intent, prompt);

    console.log("Provider:", modelConfig.provider);
    console.log("Mode:", isModification ? intent.type.toUpperCase() : "NEW");

    // Call the AI provider
    if (modelConfig.provider === "openrouter") {
      return await callOpenRouter(modelConfig, systemPrompt, prompt, conversationHistory);
    } else {
      return await callGemini(modelConfig, systemPrompt, prompt, conversationHistory);
    }

  } catch (e) {
    console.error("Generate-page error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Generation failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// =============================================
// OpenRouter API Call
// =============================================
async function callOpenRouter(
  modelConfig: { model: string; maxTokens: number },
  systemPrompt: string,
  userPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>
) {
  const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY");
  if (!OPENROUTER_KEY) throw new Error("OPENROUTER_KEY not configured");

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-6),
    { role: "user", content: userPrompt }
  ];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://weblitho.app",
      "X-Title": "Weblitho AI",
    },
    body: JSON.stringify({
      model: modelConfig.model,
      messages,
      stream: true,
      max_tokens: modelConfig.maxTokens,
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
    },
  });
}

// =============================================
// Gemini API Call with SSE transformation
// =============================================
async function callGemini(
  modelConfig: { model: string; maxTokens: number },
  systemPrompt: string,
  userPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>
) {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

  const contents = [];
  for (const msg of conversationHistory.slice(-6)) {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    });
  }
  contents.push({ role: "user", parts: [{ text: userPrompt }] });

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.model}:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`;

  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: modelConfig.maxTokens,
        topP: 0.95,
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini error:", response.status, errorText);
    
    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "AI service is busy. Please try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: "AI generation failed." }),
      { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("Gemini streaming started");

  // Transform Gemini SSE to OpenAI-compatible format
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
                  choices: [{ delta: { content: text }, index: 0, finish_reason: null }]
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
              }
            } catch { /* skip malformed */ }
          }
        }
      } catch (err) {
        console.error("Stream error:", err);
        controller.error(err);
      }
    }
  });

  return new Response(transformedStream, {
    headers: { 
      ...corsHeaders, 
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}

// =============================================
// INTELLIGENT GENERATION PROMPT
// =============================================
function buildGenerationPrompt(intent: Intent, userPrompt: string): string {
  const websiteTypeContext = intent.websiteType 
    ? getWebsiteTypeContext(intent.websiteType) 
    : "";
  
  const sectionsContext = intent.sections?.length 
    ? `\n\nThe user specifically wants these sections: ${intent.sections.join(", ")}.`
    : "";
  
  const styleContext = intent.styleChanges?.length
    ? `\n\nStyle preferences detected: ${intent.styleChanges.join(", ")}.`
    : "";

  return `You are Weblitho, an elite AI website builder. You create stunning, production-ready websites that look like they were designed by top agencies like Vercel, Linear, or Stripe.

## YOUR CAPABILITIES
- You understand user intent deeply, even from vague descriptions
- You generate complete, functional websites with real content
- You follow modern design trends and best practices
- You create accessible, responsive, performant code

## OUTPUT REQUIREMENTS - CRITICAL
1. Output ONLY valid HTML starting with <!DOCTYPE html>
2. End with </html>
3. NO markdown code blocks (\`\`\`)
4. NO JSON wrappers
5. NO explanations before or after
6. PURE HTML ONLY

## UNDERSTANDING THE REQUEST
User wants: "${userPrompt}"
${websiteTypeContext}
${sectionsContext}
${styleContext}

## HTML TEMPLATE STRUCTURE
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Website Title</title>
  <meta name="description" content="Website description">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
          animation: {
            'fade-in': 'fadeIn 0.6s ease-out forwards',
            'slide-up': 'slideUp 0.6s ease-out forwards',
            'slide-down': 'slideDown 0.4s ease-out forwards',
            'scale-in': 'scaleIn 0.4s ease-out forwards',
            'float': 'float 6s ease-in-out infinite',
            'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            'gradient': 'gradient 8s linear infinite',
          },
          keyframes: {
            fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
            slideUp: { '0%': { opacity: '0', transform: 'translateY(30px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
            slideDown: { '0%': { opacity: '0', transform: 'translateY(-20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
            scaleIn: { '0%': { opacity: '0', transform: 'scale(0.9)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
            float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-20px)' } },
            gradient: { '0%, 100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
          }
        }
      }
    }
  </script>
  <style>
    * { scroll-behavior: smooth; }
    .glass { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); }
    .gradient-text { background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .gradient-bg { background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); }
    .gradient-border { background: linear-gradient(135deg, rgba(6,182,212,0.5), rgba(139,92,246,0.5)); }
    .glow { box-shadow: 0 0 60px rgba(6, 182, 212, 0.3), 0 0 100px rgba(139, 92, 246, 0.2); }
    .card-hover { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
    .card-hover:hover { transform: translateY(-8px); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .btn-glow { position: relative; overflow: hidden; transition: all 0.3s ease; }
    .btn-glow:hover { box-shadow: 0 0 30px rgba(6, 182, 212, 0.5); transform: translateY(-2px); }
    .btn-glow::after { content: ''; position: absolute; inset: 0; background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent); transform: translateX(-100%); transition: 0.5s; }
    .btn-glow:hover::after { transform: translateX(100%); }
    .text-shadow { text-shadow: 0 4px 30px rgba(0,0,0,0.3); }
    .noise { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E"); }
  </style>
</head>
<body class="antialiased bg-gray-950 text-white min-h-screen font-sans overflow-x-hidden">
  <!-- NAVBAR -->
  <!-- HERO -->
  <!-- FEATURES -->
  <!-- SOCIAL PROOF / TESTIMONIALS -->
  <!-- CTA -->
  <!-- FOOTER -->
</body>
</html>

## DESIGN SYSTEM
**Colors**: 
- Background: gray-950, gray-900
- Cards: gray-900/50, gray-800/50 with glass effect
- Accents: cyan-500, purple-500, pink-500 (gradient)
- Text: white, gray-300, gray-400

**Typography**:
- Hero: text-5xl md:text-6xl lg:text-7xl font-bold
- Section titles: text-3xl md:text-4xl font-bold
- Subtitles: text-xl text-gray-400
- Body: text-base md:text-lg text-gray-300

**Spacing**:
- Sections: py-24 md:py-32
- Containers: max-w-7xl mx-auto px-6
- Grids: gap-6 md:gap-8

**Components**:
- Cards: rounded-2xl md:rounded-3xl, glass effect, card-hover
- Buttons: rounded-xl, px-8 py-4, btn-glow
- Icons: Use inline SVGs with w-5 h-5 or w-6 h-6

## SVG ICONS LIBRARY
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> <!-- Lightning -->
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> <!-- Check circle -->
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg> <!-- Arrow right -->
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> <!-- Check -->
<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> <!-- Star -->
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg> <!-- Mail -->

## REQUIRED QUALITY
1. ✅ Fully responsive (mobile-first)
2. ✅ Semantic HTML (header, main, section, footer)
3. ✅ Accessible (proper contrast, alt text)
4. ✅ Interactive (hover states, transitions)
5. ✅ Complete (no Lorem ipsum - real compelling content)
6. ✅ Professional copywriting that converts
7. ✅ Smooth animations with animate-* classes
8. ✅ Consistent design language throughout

Generate a complete, stunning website now. Make it look like it was designed by a top agency.`;
}

// =============================================
// INTELLIGENT MODIFICATION PROMPT
// =============================================
function buildModificationPrompt(currentCode: string, intent: Intent, userPrompt: string): string {
  const intentInstructions = getModificationInstructions(intent);
  
  return `You are Weblitho, modifying an existing website based on user feedback.

## YOUR TASK
The user wants to: "${userPrompt}"
Intent type: ${intent.type.toUpperCase()}
${intentInstructions}

## OUTPUT REQUIREMENTS - CRITICAL
1. Return ONLY the complete modified HTML
2. Start with: <!DOCTYPE html>
3. End with: </html>
4. NO markdown code blocks
5. NO JSON wrappers
6. NO explanations
7. Include ALL original code that shouldn't change

## CURRENT WEBSITE CODE
${currentCode}

## MODIFICATION RULES
1. ${intent.type === "fix" ? "Identify and FIX the issue completely" : "Make ONLY the requested changes"}
2. PRESERVE all structure, styles, and functionality not being changed
3. Keep all <script> tags, CSS, and Tailwind config intact
4. Maintain design consistency and visual quality
5. Ensure the result is a complete, working HTML document
6. ${intent.type === "add_section" ? "Add the new section in the appropriate location" : ""}
7. ${intent.type === "change_style" ? "Apply style changes consistently across all affected elements" : ""}

Return the complete modified HTML document now.`;
}

// =============================================
// Website Type Context
// =============================================
function getWebsiteTypeContext(type: string): string {
  const contexts: Record<string, string> = {
    saas: `
This is a SaaS/Software product website. Include:
- Value proposition hero with product screenshot/mockup
- Features grid showing key capabilities
- Pricing section with tiers (Free, Pro, Enterprise)
- Social proof (logos, testimonials, stats)
- CTA for free trial or demo
Focus on: Trust, clarity, conversion`,

    landing: `
This is a landing page. Focus on:
- Strong hero with clear headline and CTA
- Benefits-focused copy
- Social proof elements
- Single clear call-to-action
- Minimal distractions
Focus on: Conversion, clarity, urgency`,

    portfolio: `
This is a portfolio/personal website. Include:
- Hero with name, title, and brief intro
- Work/projects showcase grid
- About section with skills
- Contact section
Focus on: Personality, work quality, credibility`,

    ecommerce: `
This is an e-commerce/shop website. Include:
- Hero featuring key products or offers
- Product categories or featured items
- Trust badges and guarantees
- Testimonials/reviews
Focus on: Trust, product appeal, easy navigation`,

    agency: `
This is an agency/studio website. Include:
- Bold hero with tagline
- Services/capabilities
- Case studies or work showcase
- Team section
- Client logos
Focus on: Expertise, creativity, results`,

    startup: `
This is a startup/launch page. Include:
- Exciting hero with product vision
- Problem/solution narrative
- Early access or waitlist signup
- Team/investors (if applicable)
Focus on: Vision, excitement, early adoption`,

    crypto: `
This is a crypto/Web3 website. Include:
- Dynamic hero with key metrics
- Features/benefits of the protocol
- Tokenomics or how it works
- Community links (Discord, Twitter)
Focus on: Innovation, security, community`,
  };
  
  return contexts[type] || "";
}

// =============================================
// Modification Instructions by Intent Type
// =============================================
function getModificationInstructions(intent: Intent): string {
  const instructions: Record<string, string> = {
    fix: `
FIXING MODE:
- Carefully analyze the code for the reported issue
- Look for syntax errors, missing elements, or broken functionality
- Fix the issue while preserving all other code
- Test mentally that the fix addresses the problem`,

    enhance: `
ENHANCEMENT MODE:
- Improve visual quality and polish
- Add subtle animations and micro-interactions
- Enhance typography and spacing
- Make colors more vibrant and consistent
- Do NOT change the fundamental structure`,

    add_section: `
ADD SECTION MODE:
- Add the new section in the logical location
- Match the existing design system exactly
- Use consistent spacing (py-24 md:py-32)
- Maintain visual hierarchy
- Ensure smooth transitions between sections`,

    change_style: `
STYLE CHANGE MODE:
- Apply the style changes consistently
- Update all related elements (buttons, cards, headings)
- Maintain visual coherence
- Keep accessibility in mind (contrast ratios)
- Update CSS variables if using a theme`,

    change_content: `
CONTENT CHANGE MODE:
- Update only the specified text/content
- Keep formatting and structure intact
- Maintain professional copywriting quality
- Ensure content fits the design`,

    modify: `
MODIFICATION MODE:
- Make the specific changes requested
- Preserve everything not being changed
- Maintain design quality and consistency
- Ensure the result looks intentional`,
  };
  
  return instructions[intent.type] || instructions.modify;
}