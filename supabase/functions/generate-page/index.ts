import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model mapping with Lovable AI + fallback to OpenRouter
const MODEL_MAPPING: Record<string, { provider: "lovable" | "openrouter" | "gemini"; model: string; requiresPaid: boolean; maxTokens: number }> = {
  "deepseek-free": { provider: "openrouter", model: "tngtech/deepseek-r1t2-chimera:free", requiresPaid: false, maxTokens: 16000 },
  "google/gemini-2.5-flash": { provider: "lovable", model: "google/gemini-2.5-flash", requiresPaid: true, maxTokens: 65536 },
  "google/gemini-2.5-pro": { provider: "lovable", model: "google/gemini-2.5-pro", requiresPaid: true, maxTokens: 65536 },
};

const isPaidPlan = (plan: string): boolean => plan === 'pro' || plan === 'business' || plan === 'owner';

// Simple in-memory cache for recent requests
const requestCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

function getCacheKey(prompt: string, model: string, hasCode: boolean): string {
  return `${prompt.slice(0, 100)}-${model}-${hasCode}`;
}

// =============================================
// INTENT DETECTION - Understand what user wants
// =============================================
interface Intent {
  type: "new" | "modify" | "fix" | "enhance" | "add_section" | "change_style" | "change_content" | "conversation";
  confidence: number;
  websiteType?: string;
  sections?: string[];
  styleChanges?: string[];
  contentChanges?: string[];
  isQuestion?: boolean;
}

function detectIntent(prompt: string, hasExistingCode: boolean): Intent {
  const lowerPrompt = prompt.toLowerCase().trim();
  
  // CONVERSATION DETECTION - Check if user is asking a question or wants to discuss
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
  
  // If it's clearly a question or conversational, return conversation intent
  if ((isQuestion || isConversational) && !lowerPrompt.includes("create") && !lowerPrompt.includes("build") && !lowerPrompt.includes("generate") && !lowerPrompt.includes("make me")) {
    return {
      type: "conversation",
      confidence: 0.9,
      isQuestion: true,
    };
  }
  
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
    isQuestion: false,
  };
}

// =============================================
// CONVERSATION MEMORY - Summarize & Compress
// =============================================
interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

interface ConversationContext {
  summary: string;
  recentMessages: ConversationMessage[];
  projectContext: {
    websiteType?: string;
    colorScheme?: string;
    sections?: string[];
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
  
  // Extract context from conversation history
  for (const msg of conversationHistory) {
    const lower = msg.content.toLowerCase();
    
    // Detect website type mentions
    if (lower.includes("saas") || lower.includes("software")) projectContext.websiteType = "saas";
    else if (lower.includes("portfolio")) projectContext.websiteType = "portfolio";
    else if (lower.includes("ecommerce") || lower.includes("shop")) projectContext.websiteType = "ecommerce";
    else if (lower.includes("agency")) projectContext.websiteType = "agency";
    else if (lower.includes("landing")) projectContext.websiteType = "landing";
    
    // Detect color preferences
    if (lower.includes("dark theme") || lower.includes("dark mode")) projectContext.colorScheme = "dark";
    if (lower.includes("blue")) projectContext.colorScheme = "blue";
    if (lower.includes("purple")) projectContext.colorScheme = "purple";
    if (lower.includes("cyan") || lower.includes("teal")) projectContext.colorScheme = "cyan";
    
    // Track modifications from assistant messages (they describe what was done)
    if (msg.role === "assistant" && msg.content.length < 200) {
      modifications.push(msg.content);
    }
  }
  
  projectContext.modifications = modifications.slice(-5); // Keep last 5 modifications
  
  // Build summary of conversation
  const summary = buildConversationSummary(conversationHistory, projectContext);
  
  // Keep only recent messages for context (last 4 exchanges)
  const recentMessages = conversationHistory.slice(-8);
  
  return {
    summary,
    recentMessages,
    projectContext,
  };
}

function buildConversationSummary(
  history: ConversationMessage[],
  projectContext: ConversationContext["projectContext"]
): string {
  if (history.length === 0) return "";
  
  const parts: string[] = [];
  
  // Add website type context
  if (projectContext.websiteType) {
    parts.push(`This is a ${projectContext.websiteType} website project.`);
  }
  
  // Add color scheme
  if (projectContext.colorScheme) {
    parts.push(`User prefers ${projectContext.colorScheme} color scheme.`);
  }
  
  // Summarize what's been built
  const userRequests = history
    .filter(m => m.role === "user")
    .map(m => m.content.slice(0, 100))
    .slice(-5);
  
  if (userRequests.length > 1) {
    parts.push(`Previous requests: ${userRequests.join(" → ")}`);
  }
  
  // Add recent modifications
  if (projectContext.modifications && projectContext.modifications.length > 0) {
    parts.push(`Recent changes: ${projectContext.modifications.join(", ")}`);
  }
  
  return parts.join(" ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { prompt, conversationHistory = [], currentCode = null, model = "deepseek-free" } = await req.json();

    console.log("=== GENERATE-PAGE START ===");
    console.log("Model:", model);
    console.log("Prompt:", prompt?.slice(0, 100) + "...");
    console.log("Has existing code:", !!currentCode);
    console.log("Conversation history length:", conversationHistory.length);

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

    // Detect intent
    const isModification = currentCode !== null && currentCode.length > 100;
    const intent = detectIntent(prompt, isModification);
    console.log("Intent detected:", JSON.stringify(intent));
    
    // Handle CONVERSATION intent - discuss instead of generate
    if (intent.type === "conversation") {
      console.log("=== CONVERSATION MODE ===");
      return await handleConversation(prompt, conversationHistory, currentCode, isModification);
    }
    
    // Build conversation context with memory
    const conversationContext = buildConversationContext(conversationHistory, currentCode, prompt);
    console.log("Conversation context:", JSON.stringify({
      summaryLength: conversationContext.summary.length,
      recentMessagesCount: conversationContext.recentMessages.length,
      projectContext: conversationContext.projectContext,
    }));
    
    // Build context-aware system prompt with conversation memory
    const systemPrompt = isModification 
      ? buildModificationPrompt(currentCode, intent, prompt, conversationContext) 
      : buildGenerationPrompt(intent, prompt, conversationContext);

    console.log("Provider:", modelConfig.provider);
    console.log("Mode:", isModification ? intent.type.toUpperCase() : "NEW");

    // Call the AI provider with retry logic
    let lastError: Error | null = null;
    const maxRetries = 2;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (modelConfig.provider === "lovable") {
          return await callLovableAI(modelConfig, systemPrompt, prompt, conversationContext.recentMessages);
        } else if (modelConfig.provider === "openrouter") {
          return await callOpenRouter(modelConfig, systemPrompt, prompt, conversationContext.recentMessages);
        } else {
          return await callGemini(modelConfig, systemPrompt, prompt, conversationContext.recentMessages);
        }
      } catch (err) {
        lastError = err as Error;
        console.error(`Attempt ${attempt + 1} failed:`, err);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // Exponential backoff
        }
      }
    }

    throw lastError || new Error("All retry attempts failed");

  } catch (e) {
    const duration = Date.now() - startTime;
    console.error(`Generate-page error after ${duration}ms:`, e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Generation failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// =============================================
// Lovable AI Gateway (Primary for premium models)
// =============================================
async function callLovableAI(
  modelConfig: { model: string; maxTokens: number },
  systemPrompt: string,
  userPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>
) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.log("LOVABLE_API_KEY not found, falling back to Gemini");
    return await callGemini(modelConfig, systemPrompt, userPrompt, conversationHistory);
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-6).map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: userPrompt }
  ];

  console.log("Calling Lovable AI Gateway with model:", modelConfig.model);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelConfig.model,
      messages,
      stream: true,
      max_tokens: modelConfig.maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Lovable AI error:", response.status, errorText);
    
    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Fallback to Gemini if Lovable AI fails
    console.log("Lovable AI failed, falling back to Gemini");
    return await callGemini(modelConfig, systemPrompt, userPrompt, conversationHistory);
  }

  console.log("Lovable AI streaming started");
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
// OpenRouter API Call (Free model fallback)
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
// CONVERSATION MODE - Chat without generating
// =============================================
async function handleConversation(
  userPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  currentCode: string | null,
  hasExistingProject: boolean
) {
  const conversationSystemPrompt = buildConversationSystemPrompt(currentCode, hasExistingProject);
  
  // Use Lovable AI for conversation if available
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  const messages = [
    { role: "system", content: conversationSystemPrompt },
    ...conversationHistory.slice(-10),
    { role: "user", content: userPrompt }
  ];

  let response: Response;

  if (LOVABLE_API_KEY) {
    console.log("Using Lovable AI for conversation");
    response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: true,
        max_tokens: 2000,
      }),
    });
  } else {
    const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY");
    if (!OPENROUTER_KEY) throw new Error("No AI API keys configured");

    console.log("Using OpenRouter for conversation");
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Conversation error:", response.status, errorText);
    return new Response(
      JSON.stringify({ error: "Chat failed. Please try again." }),
      { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Return with special header to indicate this is a conversation response
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

function buildConversationSystemPrompt(currentCode: string | null, hasExistingProject: boolean): string {
  const projectContext = hasExistingProject 
    ? `\n\nThe user has an existing website project. You can discuss modifications, improvements, or answer questions about it.`
    : `\n\nThe user hasn't started building yet. Help them plan their website by discussing their needs, goals, and preferences.`;

  return `You are Weblitho, a friendly AI assistant for website building. You're having a conversation with the user - NOT generating code right now.

## YOUR ROLE
- Have a natural conversation to understand what the user wants
- Ask clarifying questions when needed
- Suggest ideas and possibilities
- Help users make decisions about their website
- Provide guidance on design, features, and best practices
${projectContext}

## CONVERSATION GUIDELINES
1. Be helpful, friendly, and concise
2. Ask ONE question at a time to understand needs
3. Suggest specific options when relevant (e.g., "Would you like a dark or light theme?")
4. When ready to build, tell the user to describe what they want to create
5. NEVER output code or JSON - this is a discussion only
6. Keep responses short (2-4 sentences typically)

## EXAMPLE RESPONSES

User: "What can we change?"
You: "Great question! Looking at your current site, here are some ideas: I could enhance the hero section with more animations, add a testimonials section for social proof, or change the color scheme. What sounds most interesting to you?"

User: "I'm not sure what kind of website I need"
You: "Let me help you figure that out! What's the main purpose - are you showcasing your work (portfolio), selling something (e-commerce), promoting a business (landing page), or something else?"

Remember: You're here to DISCUSS and HELP PLAN, not to generate code. Keep it conversational!`;
}

function buildGenerationPrompt(intent: Intent, userPrompt: string, context?: ConversationContext): string {
  const websiteTypeContext = intent.websiteType 
    ? getWebsiteTypeContext(intent.websiteType) 
    : context?.projectContext?.websiteType 
      ? getWebsiteTypeContext(context.projectContext.websiteType)
      : "";
  
  const sectionsContext = intent.sections?.length 
    ? `\n\nThe user specifically wants these sections: ${intent.sections.join(", ")}.`
    : "";
  
  const styleContext = intent.styleChanges?.length
    ? `\n\nStyle preferences detected: ${intent.styleChanges.join(", ")}.`
    : context?.projectContext?.colorScheme
      ? `\n\nUser prefers ${context.projectContext.colorScheme} color scheme based on earlier conversation.`
      : "";

  const memoryContext = context?.summary 
    ? `\n\n## CONVERSATION MEMORY\n${context.summary}\n\nUse this context to maintain consistency with previous discussions.`
    : "";

  return `You are Weblitho, an elite AI website builder like Lovable.dev and v0.dev. You generate complete, production-ready multi-file React projects.

## YOUR CAPABILITIES
- You understand user intent deeply, even from vague descriptions
- You generate complete, functional multi-file projects with real content
- You follow modern design trends and best practices
- You create accessible, responsive, performant code
- You remember context from previous conversations to maintain consistency
${memoryContext}

## OUTPUT FORMAT - CRITICAL
You MUST output a valid JSON object with this EXACT structure:
{
  "files": [
    { "path": "app/layout.tsx", "content": "..." },
    { "path": "app/page.tsx", "content": "..." },
    { "path": "components/Navbar.tsx", "content": "..." }
  ],
  "preview": "<!DOCTYPE html>..."
}

RULES:
1. Output ONLY the JSON object - NO markdown code blocks, NO explanations
2. The "files" array contains ALL project files as separate components
3. The "preview" is a self-contained HTML for live preview (CDN React + Tailwind)
4. Every file must have "path" and "content" keys
5. Start with { and end with }

## UNDERSTANDING THE REQUEST
User wants: "${userPrompt}"
${websiteTypeContext}
${sectionsContext}
${styleContext}

## DESIGN SYSTEM
**Colors (Dark Theme Default)**: 
- Background: slate-950, slate-900
- Cards: slate-900/50, slate-800/50 with glass effect
- Accents: cyan-500, violet-500, pink-500 (gradient)
- Text: white, slate-300, slate-400

**Typography**:
- Hero: text-5xl md:text-6xl lg:text-7xl font-bold
- Section titles: text-3xl md:text-4xl font-bold
- Subtitles: text-xl text-slate-400
- Body: text-base md:text-lg text-slate-300

**Spacing**:
- Sections: py-24 md:py-32
- Containers: max-w-7xl mx-auto px-6
- Component gaps: gap-6 md:gap-8

**Effects**:
- Glass: bg-white/5 backdrop-blur-xl border border-white/10
- Gradients: from-cyan-500 via-violet-500 to-pink-500
- Shadows: shadow-2xl shadow-cyan-500/20
- Animations: hover:scale-105 transition-all duration-300

## QUALITY REQUIREMENTS
1. ✅ Fully responsive (mobile-first)
2. ✅ Semantic HTML (header, main, section, footer)
3. ✅ Accessible (proper contrast, alt text, ARIA labels)
4. ✅ Interactive (hover states, transitions, animations)
5. ✅ Complete (NO Lorem ipsum - real compelling content)
6. ✅ Professional copywriting that converts
7. ✅ Consistent design language throughout
8. ✅ Each component in its own file
9. ✅ TypeScript with proper types
10. ✅ Next.js 14 App Router conventions

Generate the complete multi-file project JSON now.`;
}

function buildModificationPrompt(currentCode: string, intent: Intent, userPrompt: string, context?: ConversationContext): string {
  const intentInstructions = getModificationInstructions(intent);
  
  const memoryContext = context?.summary 
    ? `\n## CONVERSATION MEMORY\n${context.summary}\n\nUse this context to understand what the user has been building and maintain consistency.`
    : "";
  
  const previousChanges = context?.projectContext?.modifications?.length
    ? `\n## PREVIOUS CHANGES MADE\n${context.projectContext.modifications.join("\n- ")}`
    : "";
  
  return `You are Weblitho, modifying an existing website project based on user feedback.

## YOUR TASK
The user wants to: "${userPrompt}"
Intent type: ${intent.type.toUpperCase()}
${intentInstructions}
${memoryContext}
${previousChanges}

## OUTPUT FORMAT - CRITICAL
You MUST output a valid JSON object with this EXACT structure:
{
  "files": [
    { "path": "app/page.tsx", "content": "..." },
    { "path": "components/Hero.tsx", "content": "..." }
  ],
  "preview": "<!DOCTYPE html>..."
}

RULES:
1. Output ONLY the JSON object - NO markdown, NO explanations
2. Include ALL files from the original project (modified or not)
3. Update only the files that need changes
4. The "preview" must reflect all changes
5. Start with { and end with }

## CURRENT PROJECT CODE
${currentCode}

## MODIFICATION RULES
1. ${intent.type === "fix" ? "Identify and FIX the issue completely" : "Make ONLY the requested changes"}
2. PRESERVE all structure, styles, and functionality not being changed
3. Keep all imports and component relationships intact
4. Maintain design consistency and visual quality
5. Ensure all files remain valid TypeScript/React

Return the complete modified project JSON now.`;
}

function getWebsiteTypeContext(type: string): string {
  const contexts: Record<string, string> = {
    saas: `This is a SaaS/Software product website. Include: Navbar, Hero, Features, Pricing, Testimonials, CTA, Footer.`,
    landing: `This is a landing page. Include: Navbar, Hero, Features, SocialProof, CTA, Footer.`,
    portfolio: `This is a portfolio/personal website. Include: Navbar, Hero, Projects, About, Contact, Footer.`,
    ecommerce: `This is an e-commerce website. Include: Navbar, Hero, ProductGrid, Categories, Testimonials, Footer.`,
    agency: `This is an agency/studio website. Include: Navbar, Hero, Services, Work, Team, Contact, Footer.`,
    startup: `This is a startup/launch page. Include: Navbar, Hero, Problem, Features, Team, CTA, Footer.`,
  };
  
  return contexts[type] || "";
}

function getModificationInstructions(intent: Intent): string {
  const instructions: Record<string, string> = {
    fix: `FIXING MODE: Carefully analyze all files for the reported issue and fix it while preserving all other code.`,
    enhance: `ENHANCEMENT MODE: Improve visual quality, add animations, enhance typography. Do NOT change fundamental structure.`,
    add_section: `ADD SECTION MODE: Create a new component file and add the import to page.tsx. Match the existing design system.`,
    change_style: `STYLE CHANGE MODE: Apply the style changes across all affected components consistently.`,
    change_content: `CONTENT CHANGE MODE: Update only the specified text/content. Keep formatting intact.`,
    modify: `MODIFICATION MODE: Make the specific changes requested. Preserve everything not being changed.`,
  };
  
  return instructions[intent.type] || instructions.modify;
}
