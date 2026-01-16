import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model mapping - ALL FREE OpenRouter models (best performing)
const MODEL_MAPPING: Record<string, { provider: "openrouter"; model: string; requiresPaid: boolean; maxTokens: number; contextWindow: number; fallback?: string }> = {
  // Xiaomi MiMo-V2-Flash - BEST OVERALL, #1 on SWE-bench
  "mimo-v2-flash": { 
    provider: "openrouter", 
    model: "xiaomi/mimo-v2-flash:free", 
    requiresPaid: false, 
    maxTokens: 32000,
    contextWindow: 262000,
    fallback: "devstral"
  },
  // Mistral Devstral 2 - Best for agentic coding
  "devstral": { 
    provider: "openrouter", 
    model: "mistralai/devstral-2512:free", 
    requiresPaid: false, 
    maxTokens: 32000,
    contextWindow: 262000,
    fallback: "qwen3-coder"
  },
  // Qwen3 Coder 480B - Best for code generation
  "qwen3-coder": { 
    provider: "openrouter", 
    model: "qwen/qwen3-coder:free", 
    requiresPaid: false, 
    maxTokens: 32000,
    contextWindow: 262000,
    fallback: "deepseek-chimera"
  },
  // DeepSeek R1T2 Chimera - Best reasoning
  "deepseek-chimera": { 
    provider: "openrouter", 
    model: "tngtech/deepseek-r1t2-chimera:free", 
    requiresPaid: false, 
    maxTokens: 32000,
    contextWindow: 164000 
  },
  // Keep legacy mapping for backwards compatibility
  "deepseek-free": { 
    provider: "openrouter", 
    model: "xiaomi/mimo-v2-flash:free", 
    requiresPaid: false, 
    maxTokens: 32000,
    contextWindow: 262000 
  },
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
      model = "mimo-v2-flash" 
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

    const modelConfig = MODEL_MAPPING[model] || MODEL_MAPPING["mimo-v2-flash"];
    
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

    // All models use OpenRouter now (all free)
    return await callOpenRouter(modelConfig, systemPrompt, prompt, conversationContext.recentMessages);

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
  modelConfig: { model: string; maxTokens: number; fallback?: string },
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
    
    // Try fallback model if available
    if (modelConfig.fallback && MODEL_MAPPING[modelConfig.fallback]) {
      console.log("Trying fallback model:", modelConfig.fallback);
      return await callOpenRouter(
        MODEL_MAPPING[modelConfig.fallback],
        systemPrompt,
        userPrompt,
        conversationHistory
      );
    }
    
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
      model: "xiaomi/mimo-v2-flash:free",
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
// GENERATION PROMPT - PROFESSIONAL MULTI-FILE WEBSITE
// =============================================
function buildGenerationPrompt(intent: Intent, userPrompt: string, context?: ConversationContext): string {
  const websiteTypeContext = intent.websiteType 
    ? getWebsiteTypeContext(intent.websiteType) 
    : context?.projectContext?.websiteType 
      ? getWebsiteTypeContext(context.projectContext.websiteType)
      : "";

  return `You are Weblitho, an elite AI website builder. Create a PRODUCTION-READY website with proper multi-file React project structure.

## OUTPUT FORMAT - CRITICAL
You MUST output ONLY valid JSON. Start with { and end with }. NO markdown, NO explanations.

{
  "files": [
    { "path": "package.json", "content": "..." },
    { "path": "tailwind.config.js", "content": "..." },
    { "path": "src/index.css", "content": "..." },
    { "path": "src/main.tsx", "content": "..." },
    { "path": "src/App.tsx", "content": "..." },
    { "path": "src/components/Navbar.tsx", "content": "..." },
    { "path": "src/components/Hero.tsx", "content": "..." },
    { "path": "src/components/Features.tsx", "content": "..." },
    { "path": "src/components/Testimonials.tsx", "content": "..." },
    { "path": "src/components/Pricing.tsx", "content": "..." },
    { "path": "src/components/FAQ.tsx", "content": "..." },
    { "path": "src/components/CTA.tsx", "content": "..." },
    { "path": "src/components/Footer.tsx", "content": "..." }
  ],
  "preview": "<!DOCTYPE html><html>...COMPLETE STANDALONE HTML...</html>"
}

## USER REQUEST
"${userPrompt}"
${websiteTypeContext}

## MANDATORY SECTIONS
Generate ALL of these as separate component files:
1. Navbar - Fixed navigation with mobile hamburger menu
2. Hero - Full viewport with gradient text, dual CTAs
3. SocialProof - "Trusted by" logo bar
4. Features - 6 feature cards in grid
5. HowItWorks - 3-4 numbered steps
6. Testimonials - 3 customer review cards
7. Pricing - 3 tiers (Basic $9, Pro $29, Enterprise $99)
8. FAQ - 6 expandable questions
9. CTA - Full-width call to action
10. Footer - Multi-column with links

## DESIGN SYSTEM
- Dark theme: bg-[#030305], text-white
- Glass cards: bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl
- Gradient text: bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 bg-clip-text text-transparent
- Primary buttons: bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90
- Glow effects: shadow-[0_0_60px_rgba(139,92,246,0.3)]
- Font: Inter from Google Fonts
- Spacing: py-24 sections, max-w-7xl container
- Mobile responsive: stack on mobile, grid on desktop

## COMPONENT TEMPLATE
Each component file must have COMPLETE working code:
\`\`\`tsx
export default function ComponentName() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4">
        {/* Full section content */}
      </div>
    </section>
  )
}
\`\`\`

## App.tsx TEMPLATE
\`\`\`tsx
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import SocialProof from './components/SocialProof'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import Testimonials from './components/Testimonials'
import Pricing from './components/Pricing'
import FAQ from './components/FAQ'
import CTA from './components/CTA'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-[#030305] text-white antialiased">
      <Navbar />
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  )
}
\`\`\`

## PREVIEW HTML
The "preview" field must be a COMPLETE standalone HTML document that works in an iframe:
- Include <script src="https://cdn.tailwindcss.com"></script>
- Include Inter font from Google
- Include all inline styles for glass, gradients, animations
- Fully responsive and interactive

Remember: Output ONLY the JSON object. No other text.`;
}

// =============================================
// MODIFICATION PROMPT
// =============================================
function buildModificationPrompt(currentCode: string, intent: Intent, userPrompt: string, context?: ConversationContext): string {
  const affectedAreas = getAffectedAreas(intent, userPrompt);
  
  return `You are Weblitho, an elite AI website builder. You are making a TARGETED modification to an existing website.

## CRITICAL RULES
1. Output ONLY valid JSON - NO markdown, NO code blocks, NO explanations
2. Start with { and end with }
3. ONLY modify the specific parts requested
4. Keep the exact same structure, just apply the requested changes
5. Maintain all existing styling and design patterns

## OUTPUT FORMAT
{
  "files": [
    { "path": "src/components/Hero.tsx", "content": "...MODIFIED CODE..." }
  ],
  "preview": "<!DOCTYPE html>...COMPLETE HTML WITH CHANGES..."
}

## MODIFICATION REQUEST
"${userPrompt}"

## WHAT TO MODIFY: ${intent.type.toUpperCase()}
${getModificationInstructions(intent)}
${affectedAreas}

## CURRENT WEBSITE CODE
${currentCode}

## IMPORTANT RULES
- In "files", ONLY include files that you actually changed (use src/components/ path)
- If changing colors in Hero, only return the src/components/Hero.tsx file
- If adding a section, return the new component AND updated src/App.tsx
- The "preview" must be the COMPLETE HTML with your changes applied
- Maintain all existing animations, hover effects, and interactions
- DO NOT remove any existing functionality
- DO NOT change the overall theme unless specifically asked

START YOUR OUTPUT WITH { - NO other text before or after the JSON.`;
}

function getAffectedAreas(intent: Intent, prompt: string): string {
  const lower = prompt.toLowerCase();
  const areas: string[] = [];
  
  if (lower.includes("hero") || lower.includes("header") || lower.includes("banner")) areas.push("Hero section (src/components/Hero.tsx)");
  if (lower.includes("nav") || lower.includes("menu")) areas.push("Navigation (src/components/Navbar.tsx)");
  if (lower.includes("footer")) areas.push("Footer (src/components/Footer.tsx)");
  if (lower.includes("feature")) areas.push("Features section (src/components/Features.tsx)");
  if (lower.includes("pricing")) areas.push("Pricing section (src/components/Pricing.tsx)");
  if (lower.includes("testimonial") || lower.includes("review")) areas.push("Testimonials (src/components/Testimonials.tsx)");
  if (lower.includes("cta") || lower.includes("call to action")) areas.push("CTA section (src/components/CTA.tsx)");
  if (lower.includes("faq")) areas.push("FAQ section (src/components/FAQ.tsx)");
  if (lower.includes("color") || lower.includes("theme") || lower.includes("style")) areas.push("Apply color/style changes to affected components only");
  if (lower.includes("animation") || lower.includes("hover")) areas.push("Add animations to specified elements only");
  
  if (areas.length === 0) {
    areas.push("Apply change to the most relevant component only");
  }
  
  return `\nAFFECTED AREAS:\n${areas.map(a => `- ${a}`).join('\n')}`;
}

function getWebsiteTypeContext(type: string): string {
  const contexts: Record<string, string> = {
    saas: `\n\nThis is a SaaS/Software website. Focus on: product benefits, pricing tiers, integrations, security badges, demo/trial CTAs, dashboard preview images.`,
    landing: `\n\nThis is a landing page. Focus on: single clear CTA, above-the-fold messaging, social proof, urgency elements, conversion optimization.`,
    portfolio: `\n\nThis is a portfolio website. Focus on: project showcases with images, about section with photo, skills/expertise list, contact form, clean minimal design.`,
    ecommerce: `\n\nThis is an e-commerce website. Focus on: product grid, categories, cart icon, featured products, trust badges, shipping info, reviews.`,
    agency: `\n\nThis is an agency website. Focus on: bold creative design, case studies, team section, services, client logos, awards, contact.`,
    startup: `\n\nThis is a startup launch page. Focus on: vision statement, problem/solution, waitlist signup, founder story, early access benefits.`,
    crypto: `\n\nThis is a crypto/Web3 website. Focus on: futuristic design, tokenomics, roadmap, team, whitepaper link, community links, security audits.`,
  };
  return contexts[type] || "";
}

function getModificationInstructions(intent: Intent): string {
  const instructions: Record<string, string> = {
    fix: `Find and FIX the issue. Preserve all other code and styling.`,
    enhance: `Improve visual quality and polish. Add subtle animations. Do NOT change structure.`,
    add_section: `Create a new section matching the existing design language. Place it in the logical position.`,
    change_style: `Apply style changes consistently across all affected components. Maintain design cohesion.`,
    change_content: `Update only the specified text/content. Keep all formatting and styling intact.`,
    modify: `Make the specific changes requested. Preserve everything else exactly.`,
  };
  return instructions[intent.type] || instructions.modify;
}
