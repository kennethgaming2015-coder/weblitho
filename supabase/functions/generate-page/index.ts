import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model mapping - OpenRouter for free, Gemini for premium
const MODEL_MAPPING: Record<string, { provider: "openrouter" | "gemini"; model: string; requiresPaid: boolean; maxTokens: number }> = {
  "deepseek-free": { provider: "openrouter", model: "tngtech/deepseek-r1t2-chimera:free", requiresPaid: false, maxTokens: 16000 },
  "google/gemini-2.5-flash": { provider: "gemini", model: "gemini-2.5-flash", requiresPaid: true, maxTokens: 65536 },
  "google/gemini-2.5-pro": { provider: "gemini", model: "gemini-2.5-pro", requiresPaid: true, maxTokens: 65536 },
};

const isPaidPlan = (plan: string): boolean => plan === 'pro' || plan === 'business' || plan === 'owner';

// =============================================
// INTENT DETECTION
// =============================================
interface Intent {
  type: "new" | "modify" | "fix" | "enhance" | "add_section" | "change_style" | "change_content" | "conversation";
  confidence: number;
  websiteType?: string;
  sections?: string[];
  styleChanges?: string[];
  isQuestion?: boolean;
}

function detectIntent(prompt: string, hasExistingCode: boolean): Intent {
  const lowerPrompt = prompt.toLowerCase().trim();
  
  const questionPatterns = [
    /^what\s+(can|should|would|could|do)/i,
    /^how\s+(can|should|would|could|do)/i,
    /^can\s+(you|we|i)/i,
    /^could\s+(you|we|i)/i,
    /^would\s+(you|it|this)/i,
    /^is\s+(there|it|this)/i,
    /^are\s+(there|you)/i,
    /^do\s+(you|we)/i,
    /^should\s+(i|we)/i,
    /^why\s+/i,
    /^where\s+/i,
    /^which\s+/i,
    /^tell\s+me/i,
    /^explain/i,
    /^describe/i,
    /^help\s+me\s+(understand|decide|choose)/i,
    /\?$/,
  ];
  
  const conversationKeywords = [
    "what can we", "what should we", "what would you", "what do you think",
    "what are my options", "what options", "any suggestions", "any ideas",
    "help me decide", "help me choose", "recommend", "suggestion",
    "thoughts on", "your opinion", "advice", "guide me",
    "explain", "tell me about", "describe", "clarify",
    "not sure", "don't know", "wondering", "curious",
    "possibilities", "alternatives", "ideas for",
  ];
  
  const isQuestion = questionPatterns.some(p => p.test(lowerPrompt));
  const isConversational = conversationKeywords.some(k => lowerPrompt.includes(k));
  
  if ((isQuestion || isConversational) && !lowerPrompt.includes("create") && !lowerPrompt.includes("build") && !lowerPrompt.includes("generate") && !lowerPrompt.includes("make me")) {
    return { type: "conversation", confidence: 0.9, isQuestion: true };
  }
  
  const modifyKeywords = ["change", "update", "modify", "edit", "make it", "switch", "replace"];
  const fixKeywords = ["fix", "bug", "error", "broken", "not working", "issue", "problem"];
  const enhanceKeywords = ["improve", "enhance", "better", "optimize", "upgrade", "polish"];
  const addKeywords = ["add", "include", "insert", "put", "create section", "new section"];
  const styleKeywords = ["color", "font", "style", "theme", "dark", "light", "spacing", "size", "animation", "hover"];
  const contentKeywords = ["text", "copy", "heading", "title", "description", "image", "logo", "name"];
  
  const websiteTypes: Record<string, string[]> = {
    "saas": ["saas", "software", "app", "platform", "dashboard", "subscription"],
    "landing": ["landing", "landing page", "homepage", "hero"],
    "portfolio": ["portfolio", "personal", "cv", "resume", "showcase"],
    "ecommerce": ["shop", "store", "ecommerce", "product", "buy", "cart", "checkout"],
    "agency": ["agency", "studio", "creative", "design agency", "marketing"],
    "blog": ["blog", "article", "post", "news", "magazine"],
    "startup": ["startup", "launch", "coming soon", "waitlist", "beta"],
    "crypto": ["crypto", "web3", "blockchain", "nft", "defi", "token"],
  };
  
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
  
  let type: Intent["type"] = "new";
  let confidence = 0.5;
  
  if (hasExistingCode) {
    if (fixKeywords.some(k => lowerPrompt.includes(k))) { type = "fix"; confidence = 0.9; }
    else if (enhanceKeywords.some(k => lowerPrompt.includes(k))) { type = "enhance"; confidence = 0.85; }
    else if (addKeywords.some(k => lowerPrompt.includes(k))) { type = "add_section"; confidence = 0.85; }
    else if (styleKeywords.some(k => lowerPrompt.includes(k))) { type = "change_style"; confidence = 0.8; }
    else if (contentKeywords.some(k => lowerPrompt.includes(k))) { type = "change_content"; confidence = 0.8; }
    else if (modifyKeywords.some(k => lowerPrompt.includes(k))) { type = "modify"; confidence = 0.75; }
    else { type = "modify"; confidence = 0.6; }
  } else {
    type = "new";
    confidence = 0.9;
  }
  
  let websiteType: string | undefined;
  for (const [typeKey, keywords] of Object.entries(websiteTypes)) {
    if (keywords.some(k => lowerPrompt.includes(k))) { websiteType = typeKey; break; }
  }
  
  const sections: string[] = [];
  for (const [section, keywords] of Object.entries(sectionTypes)) {
    if (keywords.some(k => lowerPrompt.includes(k))) { sections.push(section); }
  }
  
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
    isQuestion: false,
  };
}

// =============================================
// CONVERSATION MEMORY
// =============================================
interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface ConversationContext {
  summary: string;
  recentMessages: ConversationMessage[];
  projectContext: {
    websiteType?: string;
    colorScheme?: string;
    modifications?: string[];
  };
}

function buildConversationContext(
  conversationHistory: ConversationMessage[],
  currentCode: string | null,
  newPrompt: string
): ConversationContext {
  const projectContext: ConversationContext["projectContext"] = {};
  const modifications: string[] = [];
  
  for (const msg of conversationHistory) {
    const lower = msg.content.toLowerCase();
    if (lower.includes("saas") || lower.includes("software")) projectContext.websiteType = "saas";
    else if (lower.includes("portfolio")) projectContext.websiteType = "portfolio";
    else if (lower.includes("ecommerce") || lower.includes("shop")) projectContext.websiteType = "ecommerce";
    else if (lower.includes("agency")) projectContext.websiteType = "agency";
    else if (lower.includes("landing")) projectContext.websiteType = "landing";
    
    if (lower.includes("dark theme") || lower.includes("dark mode")) projectContext.colorScheme = "dark";
    if (lower.includes("blue")) projectContext.colorScheme = "blue";
    if (lower.includes("purple")) projectContext.colorScheme = "purple";
    if (lower.includes("cyan") || lower.includes("teal")) projectContext.colorScheme = "cyan";
    
    if (msg.role === "assistant" && msg.content.length < 200) {
      modifications.push(msg.content);
    }
  }
  
  projectContext.modifications = modifications.slice(-5);
  
  const parts: string[] = [];
  if (projectContext.websiteType) parts.push(`This is a ${projectContext.websiteType} website project.`);
  if (projectContext.colorScheme) parts.push(`User prefers ${projectContext.colorScheme} color scheme.`);
  
  return {
    summary: parts.join(" "),
    recentMessages: conversationHistory.slice(-8),
    projectContext,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      prompt, 
      conversationHistory = [], 
      currentCode = null, 
      currentFiles = [],
      model = "deepseek-free" 
    } = await req.json();

    console.log("=== GENERATE-PAGE START ===");
    console.log("Model:", model);
    console.log("Prompt:", prompt?.slice(0, 100) + "...");
    console.log("Has existing code:", !!currentCode);
    console.log("Existing files count:", currentFiles?.length || 0);

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
        .maybeSingle();

      if (!credits || (!isPaidPlan(credits.plan) && !credits.is_unlimited)) {
        return new Response(
          JSON.stringify({ error: "This model requires a Pro or Business plan. Please upgrade." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const isModification = (currentCode !== null && currentCode.length > 100) || (currentFiles && currentFiles.length > 0);
    const intent = detectIntent(prompt, isModification);
    console.log("Intent detected:", JSON.stringify(intent));
    
    // Handle CONVERSATION intent
    if (intent.type === "conversation") {
      console.log("=== CONVERSATION MODE ===");
      return await handleConversation(prompt, conversationHistory, currentCode, isModification);
    }
    
    const conversationContext = buildConversationContext(conversationHistory, currentCode, prompt);
    
    // Build system prompt - pass files for modification mode
    let systemPrompt: string;
    if (isModification) {
      // Convert files to readable format for the AI
      const filesContext = currentFiles && currentFiles.length > 0
        ? currentFiles.map((f: {path: string; content: string}) => `=== ${f.path} ===\n${f.content}`).join('\n\n')
        : currentCode || '';
      systemPrompt = buildModificationPrompt(filesContext, intent, prompt, conversationContext);
    } else {
      systemPrompt = buildGenerationPrompt(intent, prompt, conversationContext);
    }

    console.log("Provider:", modelConfig.provider);
    console.log("Mode:", isModification ? intent.type.toUpperCase() : "NEW");

    if (modelConfig.provider === "openrouter") {
      return await callOpenRouter(modelConfig, systemPrompt, prompt, conversationContext.recentMessages);
    } else {
      return await callGemini(modelConfig, systemPrompt, prompt, conversationContext.recentMessages);
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
// Gemini API Call
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
// CONVERSATION MODE
// =============================================
async function handleConversation(
  userPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  currentCode: string | null,
  hasExistingProject: boolean
) {
  const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY");
  if (!OPENROUTER_KEY) throw new Error("OPENROUTER_KEY not configured");

  const projectContext = hasExistingProject 
    ? `The user has an existing website project. Discuss modifications or improvements.`
    : `The user hasn't started building yet. Help them plan their website.`;

  const systemPrompt = `You are Weblitho, a friendly AI assistant for website building. You're having a conversation - NOT generating code.

YOUR ROLE:
- Have a natural conversation to understand what the user wants
- Ask clarifying questions when needed
- Suggest ideas and possibilities
- Help users make decisions about their website

${projectContext}

GUIDELINES:
1. Be helpful, friendly, and concise
2. Ask ONE question at a time
3. NEVER output code or JSON - this is a discussion only
4. Keep responses short (2-4 sentences)

Remember: You're here to DISCUSS, not to generate code.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-10),
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
      model: "tngtech/deepseek-r1t2-chimera:free",
      messages,
      stream: true,
      max_tokens: 2000,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Conversation error:", response.status, errorText);
    return new Response(
      JSON.stringify({ error: "Chat failed. Please try again." }),
      { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(response.body, {
    headers: { 
      ...corsHeaders, 
      "Content-Type": "text/event-stream",
      "X-Response-Type": "conversation",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}

// =============================================
// GENERATION PROMPT - MULTI-FILE OUTPUT
// =============================================
function buildGenerationPrompt(intent: Intent, userPrompt: string, context?: ConversationContext): string {
  const websiteTypeContext = intent.websiteType 
    ? getWebsiteTypeContext(intent.websiteType) 
    : context?.projectContext?.websiteType 
      ? getWebsiteTypeContext(context.projectContext.websiteType)
      : "";

  return `You are Weblitho, an elite AI website builder creating PRODUCTION-QUALITY websites like Lovable.dev.

## CRITICAL OUTPUT FORMAT
Output ONLY a valid JSON object. NO markdown, NO code blocks, NO explanations before or after.

{
  "files": [
    { "path": "app/layout.tsx", "content": "full file content here" },
    { "path": "app/page.tsx", "content": "full file content here" },
    { "path": "app/globals.css", "content": "full file content here" },
    { "path": "components/Navbar.tsx", "content": "full file content here" },
    { "path": "components/Hero.tsx", "content": "full file content here" },
    { "path": "components/Features.tsx", "content": "full file content here" },
    { "path": "components/Pricing.tsx", "content": "full file content here" },
    { "path": "components/Testimonials.tsx", "content": "full file content here" },
    { "path": "components/CTA.tsx", "content": "full file content here" },
    { "path": "components/Footer.tsx", "content": "full file content here" }
  ],
  "preview": "<!DOCTYPE html>...complete interactive HTML..."
}

## REQUIRED FILES (GENERATE ALL):
1. app/layout.tsx - Root layout with fonts and metadata
2. app/page.tsx - Main page composing all components
3. app/globals.css - Complete Tailwind styles
4. components/Navbar.tsx - Sticky navigation with mobile menu
5. components/Hero.tsx - Full-width hero with gradient text and CTAs
6. components/Features.tsx - Feature grid (6 items minimum)
7. components/Pricing.tsx - Pricing tiers (3 plans)
8. components/Testimonials.tsx - Customer testimonials
9. components/CTA.tsx - Final call-to-action section
10. components/Footer.tsx - Full footer with links

## USER REQUEST: "${userPrompt}"
${websiteTypeContext}

## DESIGN STANDARDS (MATCH LOVABLE.DEV QUALITY):
- Dark theme: bg-[#0A0A0F] or bg-slate-950
- Glassmorphism: bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl
- Gradient accents: from-violet-500 via-purple-500 to-pink-500
- Hero: min-h-screen flex items-center, text-6xl md:text-7xl lg:text-8xl font-bold
- Sections: py-24 md:py-32, max-w-7xl mx-auto px-6
- Cards: hover:scale-[1.02] transition-all duration-300
- Buttons: px-8 py-4 rounded-xl font-semibold with gradient backgrounds
- Text: text-white for headings, text-slate-400 for body
- Add smooth scroll behavior and subtle animations

## INTERACTIVE PREVIEW HTML:
The "preview" must be a COMPLETE, INTERACTIVE single-page HTML:

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Website Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { scroll-behavior: smooth; }
    body { font-family: 'Inter', sans-serif; }
    .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
    .gradient-text { background: linear-gradient(135deg, #8b5cf6, #d946ef, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .gradient-btn { background: linear-gradient(135deg, #8b5cf6, #d946ef); }
    .gradient-btn:hover { background: linear-gradient(135deg, #7c3aed, #c026d3); }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    .float { animation: float 3s ease-in-out infinite; }
  </style>
</head>
<body class="bg-[#0A0A0F] text-white antialiased">
  <!-- NAVBAR with id="nav" -->
  <nav id="nav" class="fixed top-0 left-0 right-0 z-50 glass">...</nav>
  
  <!-- HERO with id="hero" -->
  <section id="hero" class="min-h-screen flex items-center pt-20">...</section>
  
  <!-- FEATURES with id="features" -->
  <section id="features" class="py-24">...</section>
  
  <!-- PRICING with id="pricing" -->
  <section id="pricing" class="py-24">...</section>
  
  <!-- TESTIMONIALS with id="testimonials" -->
  <section id="testimonials" class="py-24">...</section>
  
  <!-- CTA with id="cta" -->
  <section id="cta" class="py-24">...</section>
  
  <!-- FOOTER with id="footer" -->
  <footer id="footer" class="py-16 border-t border-white/10">...</footer>
</body>
</html>

IMPORTANT: 
- All sections MUST have unique id attributes for navigation
- All navigation links use href="#sectionid" format
- Buttons should have hover states and transitions
- Include at least 6 features, 3 pricing plans, 3 testimonials
- Make it look PREMIUM and PROFESSIONAL

Generate the complete JSON now:`;
}

// =============================================
// MODIFICATION PROMPT - MULTI-FILE OUTPUT
// =============================================
function buildModificationPrompt(currentCode: string, intent: Intent, userPrompt: string, context?: ConversationContext): string {
  // Determine which files need modification based on intent
  const affectedAreas = getAffectedAreas(intent, userPrompt);
  
  return `You are Weblitho, an elite AI website builder. You are making a TARGETED modification to an existing website.

## CRITICAL RULES - READ CAREFULLY:
1. Output ONLY valid JSON - NO markdown, NO code blocks, NO explanations
2. Start with { and end with }
3. ONLY modify the specific parts requested - DO NOT regenerate everything
4. Keep the exact same structure, just apply the requested changes

## OUTPUT FORMAT:
{
  "files": [
    { "path": "components/Hero.tsx", "content": "...MODIFIED CODE..." }
  ],
  "preview": "<!DOCTYPE html>...COMPLETE HTML WITH CHANGES..."
}

## MODIFICATION REQUEST:
"${userPrompt}"

## WHAT TO MODIFY: ${intent.type.toUpperCase()}
${getModificationInstructions(intent)}
${affectedAreas}

## CURRENT WEBSITE CODE:
${currentCode}

## IMPORTANT:
- In "files", ONLY include files that you actually changed
- If changing colors in Hero, only return the Hero.tsx file
- If adding a section, return the new component AND updated page.tsx
- The "preview" must be the COMPLETE HTML with your changes applied
- DO NOT add new sections unless explicitly asked
- DO NOT change the overall layout or structure

Apply the specific change and return the JSON now.`;
}

function getAffectedAreas(intent: Intent, prompt: string): string {
  const lower = prompt.toLowerCase();
  const areas: string[] = [];
  
  if (lower.includes("hero") || lower.includes("header") || lower.includes("banner")) areas.push("Hero section (components/Hero.tsx)");
  if (lower.includes("nav") || lower.includes("menu")) areas.push("Navigation (components/Navbar.tsx)");
  if (lower.includes("footer")) areas.push("Footer (components/Footer.tsx)");
  if (lower.includes("feature")) areas.push("Features section (components/Features.tsx)");
  if (lower.includes("pricing")) areas.push("Pricing section (components/Pricing.tsx)");
  if (lower.includes("testimonial") || lower.includes("review")) areas.push("Testimonials (components/Testimonials.tsx)");
  if (lower.includes("cta") || lower.includes("call to action")) areas.push("CTA section (components/CTA.tsx)");
  if (lower.includes("color") || lower.includes("theme") || lower.includes("style")) areas.push("Apply color/style changes to affected components only");
  if (lower.includes("animation") || lower.includes("hover")) areas.push("Add animations to specified elements only");
  
  if (areas.length === 0) {
    areas.push("Apply change to the most relevant component only");
  }
  
  return `\nAFFECTED AREAS:\n${areas.map(a => `- ${a}`).join('\n')}`;
}

function getWebsiteTypeContext(type: string): string {
  const contexts: Record<string, string> = {
    saas: `\n\nSaaS website - Include: Navbar, Hero with product mockup, Features grid (6 items), Pricing tiers, Testimonials, CTA, Footer.`,
    landing: `\n\nLanding page - Include: Navbar, Hero with strong CTA, Features (3-4 items), Social proof, CTA, Footer.`,
    portfolio: `\n\nPortfolio website - Include: Navbar, Hero with name/title, Projects grid, About section, Contact form, Footer.`,
    ecommerce: `\n\nE-commerce website - Include: Navbar with cart, Hero with featured product, Product grid, Categories, Testimonials, Footer.`,
    agency: `\n\nAgency website - Include: Navbar, Bold hero, Services grid, Case studies, Team section, Contact, Footer.`,
    startup: `\n\nStartup launch page - Include: Navbar, Vision hero, Problem/solution, Features, Team, Waitlist CTA, Footer.`,
  };
  return contexts[type] || "";
}

function getModificationInstructions(intent: Intent): string {
  const instructions: Record<string, string> = {
    fix: `Find and FIX the issue. Preserve all other code.`,
    enhance: `Improve visual quality and polish. Add animations. Do NOT change structure.`,
    add_section: `Create a new component file and add its import to page.tsx.`,
    change_style: `Apply style changes across all affected components consistently.`,
    change_content: `Update only the specified text/content. Keep formatting intact.`,
    modify: `Make the specific changes requested. Preserve everything else.`,
  };
  return instructions[intent.type] || instructions.modify;
}
