import { useMemo } from "react";
import { ModelType, modelConfig } from "@/components/builder/SettingsDialog";

interface PromptAnalysis {
  complexity: "simple" | "medium" | "complex" | "premium";
  score: number;
  factors: string[];
  recommendedModel: ModelType;
  reason: string;
}

// Keywords that indicate complexity
const COMPLEXITY_INDICATORS = {
  simple: [
    "change", "update", "fix", "color", "text", "button", "font", "size",
    "spacing", "margin", "padding", "simple", "basic", "quick"
  ],
  medium: [
    "add", "create", "section", "hero", "footer", "navbar", "card",
    "form", "gallery", "grid", "list", "animation", "responsive"
  ],
  complex: [
    "dashboard", "multi-page", "e-commerce", "shop", "saas", "landing",
    "portfolio", "blog", "authentication", "api", "database", "full"
  ],
  premium: [
    "enterprise", "complete", "professional", "production", "advanced",
    "custom", "complex", "sophisticated", "interactive", "dynamic"
  ]
};

// Page/section mentions that increase complexity
const PAGE_INDICATORS = [
  "page", "pages", "home", "about", "contact", "pricing", "features",
  "testimonials", "faq", "blog", "team", "services", "portfolio"
];

// Feature indicators that increase complexity
const FEATURE_INDICATORS = [
  "modal", "slider", "carousel", "tabs", "accordion", "dropdown",
  "search", "filter", "sort", "pagination", "infinite scroll",
  "dark mode", "theme", "localization", "i18n", "seo"
];

export function useModelRecommendation() {
  const analyzePrompt = useMemo(() => (prompt: string): PromptAnalysis => {
    const lowerPrompt = prompt.toLowerCase();
    const words = lowerPrompt.split(/\s+/);
    
    let score = 0;
    const factors: string[] = [];
    
    // Check for simple keywords (reduce score)
    const simpleMatches = COMPLEXITY_INDICATORS.simple.filter(k => lowerPrompt.includes(k));
    if (simpleMatches.length > 0) {
      score -= simpleMatches.length * 5;
      if (simpleMatches.length >= 3) {
        factors.push("Simple modification request");
      }
    }
    
    // Check for medium keywords
    const mediumMatches = COMPLEXITY_INDICATORS.medium.filter(k => lowerPrompt.includes(k));
    if (mediumMatches.length > 0) {
      score += mediumMatches.length * 10;
      factors.push(`${mediumMatches.length} component(s) mentioned`);
    }
    
    // Check for complex keywords
    const complexMatches = COMPLEXITY_INDICATORS.complex.filter(k => lowerPrompt.includes(k));
    if (complexMatches.length > 0) {
      score += complexMatches.length * 20;
      factors.push(`Complex project type: ${complexMatches.slice(0, 2).join(", ")}`);
    }
    
    // Check for premium keywords
    const premiumMatches = COMPLEXITY_INDICATORS.premium.filter(k => lowerPrompt.includes(k));
    if (premiumMatches.length > 0) {
      score += premiumMatches.length * 30;
      factors.push("Premium/enterprise requirements");
    }
    
    // Check for multiple pages
    const pageMatches = PAGE_INDICATORS.filter(k => lowerPrompt.includes(k));
    if (pageMatches.length >= 3) {
      score += 25;
      factors.push(`Multi-page website (${pageMatches.length} pages)`);
    } else if (pageMatches.length > 0) {
      score += pageMatches.length * 5;
    }
    
    // Check for feature complexity
    const featureMatches = FEATURE_INDICATORS.filter(k => lowerPrompt.includes(k));
    if (featureMatches.length > 0) {
      score += featureMatches.length * 15;
      factors.push(`Advanced features: ${featureMatches.slice(0, 2).join(", ")}`);
    }
    
    // Prompt length factor
    if (words.length > 100) {
      score += 30;
      factors.push("Detailed requirements");
    } else if (words.length > 50) {
      score += 15;
      factors.push("Moderate detail");
    } else if (words.length < 10) {
      score -= 20;
    }
    
    // Determine complexity level and model
    let complexity: PromptAnalysis["complexity"];
    let recommendedModel: ModelType;
    let reason: string;
    
    if (score >= 80) {
      complexity = "premium";
      recommendedModel = "deepseek-chimera";
      reason = "Complex multi-page project with advanced features - Premium model recommended for best results";
    } else if (score >= 40) {
      complexity = "complex";
      recommendedModel = "qwen3-coder";
      reason = "Full website generation - Pro model provides excellent quality";
    } else if (score >= 10) {
      complexity = "medium";
      recommendedModel = "devstral";
      reason = "Component or section creation - Code model is ideal for this";
    } else {
      complexity = "simple";
      recommendedModel = "mimo-v2-flash";
      reason = "Quick modification - Fast model is perfect for speed";
    }
    
    // Ensure score is positive
    score = Math.max(0, Math.min(100, score));
    
    return {
      complexity,
      score,
      factors: factors.length > 0 ? factors : ["Basic request"],
      recommendedModel,
      reason
    };
  }, []);
  
  const getModelCost = (model: ModelType): number => {
    const config = modelConfig[model];
    return config?.creditMultiplier || 1;
  };
  
  const getComplexityColor = (complexity: PromptAnalysis["complexity"]): string => {
    switch (complexity) {
      case "simple": return "text-green-500";
      case "medium": return "text-blue-500";
      case "complex": return "text-orange-500";
      case "premium": return "text-purple-500";
      default: return "text-muted-foreground";
    }
  };
  
  const getComplexityBg = (complexity: PromptAnalysis["complexity"]): string => {
    switch (complexity) {
      case "simple": return "bg-green-500/10 border-green-500/30";
      case "medium": return "bg-blue-500/10 border-blue-500/30";
      case "complex": return "bg-orange-500/10 border-orange-500/30";
      case "premium": return "bg-purple-500/10 border-purple-500/30";
      default: return "bg-muted/10 border-border";
    }
  };
  
  return {
    analyzePrompt,
    getModelCost,
    getComplexityColor,
    getComplexityBg
  };
}
