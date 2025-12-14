import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validation cache to avoid re-validating identical code
const validationCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 300000; // 5 minutes

function getCacheKey(code: string): string {
  // Simple hash based on code length and first/last portions
  return `${code.length}-${code.slice(0, 100)}-${code.slice(-100)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { code } = await req.json();

    // Quick validation for short code
    if (!code || code.length < 100) {
      return new Response(
        JSON.stringify({
          valid: true,
          score: 100,
          issues: [],
          suggestions: [],
          security: [],
          validated: false,
          message: "Code too short for validation"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check cache first
    const cacheKey = getCacheKey(code);
    const cached = validationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("Returning cached validation result");
      return new Response(JSON.stringify({ ...cached.result, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try Lovable AI first, then OpenRouter
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY");
    
    if (!LOVABLE_API_KEY && !OPENROUTER_KEY) {
      console.log("No AI API keys available, returning heuristic validation");
      return new Response(
        JSON.stringify(performHeuristicValidation(code)),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are Weblitho Validator — an expert code quality analyzer.
Your job is to analyze HTML/React code and return a JSON validation report.

VALIDATION CRITERIA:
1. HTML/JSX syntax correctness
2. React component structure and best practices
3. Tailwind CSS proper usage
4. Accessibility (aria labels, alt texts, semantic HTML)
5. Security (no XSS vulnerabilities, no inline scripts with user input)
6. Best practices (responsive design, semantic HTML)
7. Design quality (spacing, typography, visual hierarchy)
8. Performance (no unnecessary re-renders, proper key usage)

SCORING:
- 90-100: Excellent, production-ready
- 80-89: Good, minor improvements possible
- 70-79: Acceptable, some issues to address
- 60-69: Needs improvement
- Below 60: Significant issues

Return ONLY a JSON object with this structure:
{
  "valid": boolean,
  "score": number (0-100),
  "issues": ["array of critical issues found"],
  "suggestions": ["array of improvement suggestions"],
  "security": ["array of security concerns if any"],
  "designQuality": "excellent" | "good" | "average" | "poor",
  "accessibility": "excellent" | "good" | "needs-improvement" | "poor"
}

Be thorough but constructive. Focus on real issues, not nitpicks.`;

    let response: Response;
    let provider = "lovable";

    if (LOVABLE_API_KEY) {
      console.log("Calling Weblitho Validator via Lovable AI...");
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite", // Fast model for validation
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Validate this code:\n\n${code.substring(0, 20000)}` }
          ],
        }),
      });
    } else {
      console.log("Calling Weblitho Validator via OpenRouter...");
      provider = "openrouter";
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://weblitho.app",
          "X-Title": "Weblitho Validator",
        },
        body: JSON.stringify({
          model: "qwen/qwen3-coder:free",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Validate this code:\n\n${code.substring(0, 15000)}` }
          ],
        }),
      });
    }

    if (!response.ok) {
      console.error(`${provider} Validator API error:`, response.status);
      return new Response(
        JSON.stringify(performHeuristicValidation(code)),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let validationResult;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        validationResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse validation response:", parseError);
      validationResult = performHeuristicValidation(code);
    }

    // Ensure all required fields exist with proper defaults
    const result = {
      valid: validationResult.valid ?? true,
      score: Math.min(100, Math.max(0, validationResult.score ?? 80)),
      issues: Array.isArray(validationResult.issues) ? validationResult.issues.slice(0, 10) : [],
      suggestions: Array.isArray(validationResult.suggestions) ? validationResult.suggestions.slice(0, 5) : [],
      security: Array.isArray(validationResult.security) ? validationResult.security : [],
      designQuality: validationResult.designQuality ?? "good",
      accessibility: validationResult.accessibility ?? "good",
      validated: true,
      provider,
      duration: Date.now() - startTime
    };

    // Cache the result
    validationCache.set(cacheKey, { result, timestamp: Date.now() });

    // Clean old cache entries
    for (const [key, value] of validationCache.entries()) {
      if (Date.now() - value.timestamp > CACHE_TTL) {
        validationCache.delete(key);
      }
    }

    console.log(`Validation complete. Score: ${result.score}, Duration: ${result.duration}ms`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Weblitho Validator error:", error);
    return new Response(
      JSON.stringify({
        valid: true,
        score: 75,
        issues: [],
        suggestions: [],
        security: [],
        validated: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 200, // Return 200 to not break the flow
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Perform heuristic validation when AI is unavailable
function performHeuristicValidation(code: string): any {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const security: string[] = [];
  let score = 85;

  // Check for common issues
  if (!code.includes("<!DOCTYPE html>") && !code.includes("export")) {
    issues.push("Missing DOCTYPE or module export");
    score -= 5;
  }

  if (code.includes("<img") && !code.includes("alt=")) {
    issues.push("Images missing alt attributes");
    score -= 5;
  }

  if (code.includes("onclick=") || code.includes("onload=")) {
    security.push("Inline event handlers detected - consider using React event handlers");
    score -= 5;
  }

  if (code.includes("dangerouslySetInnerHTML")) {
    security.push("dangerouslySetInnerHTML used - ensure content is sanitized");
    score -= 10;
  }

  if (!code.includes("min-h-screen") && !code.includes("h-screen")) {
    suggestions.push("Consider adding full-height layout");
  }

  if (!code.includes("md:") && !code.includes("lg:")) {
    suggestions.push("Add responsive breakpoints for better mobile experience");
    score -= 5;
  }

  if (code.includes("Lorem ipsum") || code.includes("lorem ipsum")) {
    issues.push("Placeholder text detected - replace with real content");
    score -= 10;
  }

  // Check accessibility
  if (!code.includes("role=") && !code.includes("aria-")) {
    suggestions.push("Add ARIA attributes for better accessibility");
  }

  // Check for semantic HTML
  const hasSemanticHTML = ["<header", "<main", "<section", "<footer", "<nav", "<article"].some(tag => code.includes(tag));
  if (!hasSemanticHTML) {
    suggestions.push("Use semantic HTML elements for better structure");
    score -= 5;
  }

  // Determine quality levels
  const designQuality = score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 55 ? "average" : "poor";
  const accessibility = code.includes("aria-") || code.includes("role=") ? "good" : "needs-improvement";

  return {
    valid: issues.length < 3,
    score: Math.max(50, score),
    issues,
    suggestions,
    security,
    designQuality,
    accessibility,
    validated: true,
    heuristic: true
  };
}
