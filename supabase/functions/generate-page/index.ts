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
// GENERATION PROMPT - PROFESSIONAL WEBSITE
// =============================================
function buildGenerationPrompt(intent: Intent, userPrompt: string, context?: ConversationContext): string {
  const websiteTypeContext = intent.websiteType 
    ? getWebsiteTypeContext(intent.websiteType) 
    : context?.projectContext?.websiteType 
      ? getWebsiteTypeContext(context.projectContext.websiteType)
      : "";

  return `You are Weblitho, an elite AI website builder creating STUNNING, PRODUCTION-READY websites that rival top agencies.

## YOUR MISSION
Create a complete, beautiful, fully-functional website. Output quality should match Vercel, Linear, or Stripe's marketing sites.

## CRITICAL OUTPUT FORMAT
You MUST output ONLY valid JSON. No markdown, no code blocks, no explanations before or after.

{
  "preview": "<!DOCTYPE html>...COMPLETE STANDALONE HTML...",
  "files": [
    { "path": "app/layout.tsx", "content": "..." },
    { "path": "app/page.tsx", "content": "..." },
    { "path": "components/Navbar.tsx", "content": "..." },
    { "path": "components/Hero.tsx", "content": "..." },
    { "path": "components/Features.tsx", "content": "..." },
    { "path": "components/Testimonials.tsx", "content": "..." },
    { "path": "components/Pricing.tsx", "content": "..." },
    { "path": "components/FAQ.tsx", "content": "..." },
    { "path": "components/CTA.tsx", "content": "..." },
    { "path": "components/Footer.tsx", "content": "..." }
  ]
}

## USER REQUEST
"${userPrompt}"
${websiteTypeContext}

## REQUIRED SECTIONS (ALL MANDATORY)

### 1. Navigation Bar
- Fixed/sticky at top with backdrop blur
- Logo (text or placeholder icon)
- Nav links: Features, Pricing, Testimonials, FAQ
- CTA button: "Get Started" or "Sign Up"
- Mobile: Hamburger menu that opens sidebar
- Add subtle border-bottom on scroll

### 2. Hero Section (Above the fold)
- Full viewport height (min-h-screen)
- Large headline (text-5xl md:text-6xl lg:text-7xl font-bold)
- Subtitle text explaining value proposition
- TWO buttons: Primary CTA + Secondary (outline)
- Background: Subtle gradient orbs or mesh gradient
- Optional: Hero image/mockup floating on right
- Animate elements on load (fade-up, stagger)

### 3. Social Proof Bar
- "Trusted by 10,000+ companies" text
- Row of company logos (use placeholder boxes with company initials)
- Subtle animation (marquee or fade)

### 4. Features Section
- Section title + subtitle
- 6 feature cards in 3x2 grid (md:grid-cols-3)
- Each card: Icon, title, description
- Cards have glass effect + hover animation
- Icons use SVG inline or emoji

### 5. How It Works
- 3-4 numbered steps
- Each step: Number badge, title, description
- Connected by line or arrows
- Alternating layout or horizontal timeline

### 6. Testimonials
- Section title
- 3 testimonial cards
- Each: Quote text, author name, role, company, avatar
- Star rating (5 stars)
- Glass card with subtle glow

### 7. Pricing Section
- 3 pricing tiers: Basic ($9), Pro ($29 - highlighted), Enterprise ($99)
- Each tier: Price, billing period, feature list, CTA button
- Pro tier has "Most Popular" badge and glow effect
- Feature list with checkmarks

### 8. FAQ Section
- 6 questions in accordion style
- Click to expand/collapse
- Use HTML details/summary or custom accordion
- Answers visible when expanded

### 9. CTA Section
- Full-width gradient background
- Large headline
- Brief text
- Prominent CTA button
- Optional: Email input for newsletter

### 10. Footer
- Multi-column layout
- Column 1: Logo + tagline + social icons
- Column 2-4: Links grouped by category (Product, Company, Resources)
- Bottom: Copyright + legal links

## DESIGN SYSTEM (NON-NEGOTIABLE)

### Colors - Dark Theme
\`\`\`
--background: #030305 (near black)
--surface: rgba(255,255,255,0.03)
--surface-hover: rgba(255,255,255,0.06)
--border: rgba(255,255,255,0.08)
--border-strong: rgba(255,255,255,0.15)
--primary: #8b5cf6 (violet-500)
--primary-glow: rgba(139,92,246,0.4)
--secondary: #a855f7 (purple-500)
--accent: #ec4899 (pink-500)
--text-primary: #ffffff
--text-secondary: #a1a1aa (zinc-400)
--text-muted: #71717a (zinc-500)
\`\`\`

### Typography
- Font: Inter (load from Google Fonts)
- H1: text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight
- H2: text-3xl md:text-4xl lg:text-5xl font-bold
- H3: text-xl md:text-2xl font-semibold
- Body: text-base md:text-lg text-zinc-400
- Small: text-sm text-zinc-500

### Spacing
- Section padding: py-24 md:py-32 lg:py-40
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Card gap: gap-6 md:gap-8
- Element gap: space-y-4 or space-y-6

### Effects
- Glass: bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl
- Gradient text: bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 bg-clip-text text-transparent
- Glow: shadow-[0_0_60px_rgba(139,92,246,0.3)]
- Hover lift: hover:-translate-y-1 transition-all duration-300
- Fade in: opacity animation on scroll or load

### Buttons
- Primary: bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold px-6 py-3 rounded-xl
- Secondary: border border-white/20 hover:bg-white/10 text-white font-medium px-6 py-3 rounded-xl
- Add subtle shadow and transition

## HTML TEMPLATE

\`\`\`html
<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Website Title]</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
        }
      }
    }
  </script>
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; background: #030305; }
    .glass { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); }
    .gradient-text { background: linear-gradient(135deg, #8b5cf6, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .glow { box-shadow: 0 0 60px rgba(139,92,246,0.3); }
    .glow-sm { box-shadow: 0 0 30px rgba(139,92,246,0.2); }
    .card-hover { transition: all 0.3s ease; }
    .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse-glow { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
    .float { animation: float 6s ease-in-out infinite; }
    .fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
    .pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
    .stagger-1 { animation-delay: 0.1s; }
    .stagger-2 { animation-delay: 0.2s; }
    .stagger-3 { animation-delay: 0.3s; }
    details summary { cursor: pointer; list-style: none; }
    details summary::-webkit-details-marker { display: none; }
  </style>
</head>
<body class="bg-[#030305] text-white antialiased overflow-x-hidden">
  <!-- NAVIGATION -->
  <!-- HERO -->
  <!-- SOCIAL PROOF -->
  <!-- FEATURES -->
  <!-- HOW IT WORKS -->
  <!-- TESTIMONIALS -->
  <!-- PRICING -->
  <!-- FAQ -->
  <!-- CTA -->
  <!-- FOOTER -->
</body>
</html>
\`\`\`

## CONTENT GUIDELINES
- Use REALISTIC professional copy - NO lorem ipsum
- Compelling headlines that focus on BENEFITS, not features
- Include specific numbers: "10,000+ customers", "99.9% uptime", "5x faster"
- CTAs are action-oriented: "Get Started Free", "See It In Action", "Start Building"
- Testimonials sound authentic with real names and companies
- Pricing includes actual features with checkmarks

## RESPONSIVE DESIGN
- Mobile-first approach
- Hamburger menu on mobile (< md:)
- Stack cards vertically on mobile
- Adjust text sizes for mobile
- Full-width buttons on mobile
- Test all breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)

## INTERACTIVITY
- Navbar scroll effect (add shadow/blur on scroll)
- Smooth scroll to sections
- Button hover effects
- Card hover animations
- FAQ accordion expand/collapse
- Mobile menu toggle

NOW GENERATE THE COMPLETE WEBSITE JSON with high-quality, production-ready code.`;
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
    { "path": "components/Hero.tsx", "content": "...MODIFIED CODE..." }
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
- In "files", ONLY include files that you actually changed
- If changing colors in Hero, only return the Hero.tsx file
- If adding a section, return the new component AND updated page.tsx
- The "preview" must be the COMPLETE HTML with your changes applied
- Maintain all existing animations, hover effects, and interactions
- DO NOT remove any existing functionality
- DO NOT change the overall theme unless specifically asked

Apply the modification and return the JSON now.`;
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
  if (lower.includes("faq")) areas.push("FAQ section (components/FAQ.tsx)");
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
