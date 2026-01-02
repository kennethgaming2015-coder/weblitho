import { useEffect, useState } from "react";
import { Sparkles, Zap, Cpu, Crown, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModelType, modelConfig } from "@/components/builder/SettingsDialog";
import { useModelRecommendation } from "@/hooks/useModelRecommendation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ModelRecommendationProps {
  prompt: string;
  currentModel: ModelType;
  onModelChange: (model: ModelType) => void;
}

const modelIcons: Record<ModelType, typeof Zap> = {
  "mimo-v2-flash": Zap,
  "devstral": Cpu,
  "qwen3-coder": Sparkles,
  "deepseek-chimera": Crown,
};

export function ModelRecommendation({ prompt, currentModel, onModelChange }: ModelRecommendationProps) {
  const { analyzePrompt, getComplexityColor, getComplexityBg } = useModelRecommendation();
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzePrompt> | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only analyze if prompt is meaningful (more than 5 characters)
    if (prompt.trim().length > 5) {
      const result = analyzePrompt(prompt);
      setAnalysis(result);
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [prompt, analyzePrompt]);

  if (!isVisible || !analysis) return null;

  const recommendedConfig = modelConfig[analysis.recommendedModel];
  const currentConfig = modelConfig[currentModel];
  const RecommendedIcon = modelIcons[analysis.recommendedModel];
  const isAlreadyUsingRecommended = currentModel === analysis.recommendedModel;

  return (
    <div className={`rounded-xl border p-3 mb-3 animate-fade-in ${getComplexityBg(analysis.complexity)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className={`text-[10px] uppercase tracking-wide ${getComplexityColor(analysis.complexity)}`}>
              {analysis.complexity} complexity
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-xs font-medium mb-1">Analysis factors:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {analysis.factors.map((factor, i) => (
                      <li key={i}>• {factor}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <p className="text-xs text-muted-foreground leading-relaxed">
            {analysis.reason}
          </p>
        </div>

        {!isAlreadyUsingRecommended && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onModelChange(analysis.recommendedModel)}
            className="shrink-0 h-8 px-3 text-xs gap-1.5 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all"
          >
            <RecommendedIcon className="h-3.5 w-3.5" />
            Use {recommendedConfig?.name?.split(' ')[1] || 'Recommended'}
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}

        {isAlreadyUsingRecommended && (
          <Badge variant="secondary" className="shrink-0 h-6 px-2 text-[10px] bg-primary/10 text-primary border-primary/30">
            <RecommendedIcon className="h-3 w-3 mr-1" />
            Optimal
          </Badge>
        )}
      </div>
    </div>
  );
}
