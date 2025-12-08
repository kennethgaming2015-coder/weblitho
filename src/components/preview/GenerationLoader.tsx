import { useState, useEffect } from "react";
import { Sparkles, Code2, Palette, Layout, Zap, Check, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface GenerationLoaderProps {
  status: string;
  isGenerating: boolean;
  progress?: number;
}

const steps = [
  { id: 1, label: "Analyzing request", icon: Sparkles, keywords: ["Analyzing", "Understanding"] },
  { id: 2, label: "Planning structure", icon: Layout, keywords: ["Planning", "architecture"] },
  { id: 3, label: "Building components", icon: Code2, keywords: ["Building", "HTML", "React", "component", "Generating"] },
  { id: 4, label: "Applying styles", icon: Palette, keywords: ["Applying", "Tailwind", "style", "animation"] },
  { id: 5, label: "Finalizing", icon: Zap, keywords: ["Optimizing", "Finalizing", "complete"] },
];

export const GenerationLoader = ({ status, isGenerating, progress = 0 }: GenerationLoaderProps) => {
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (!isGenerating) {
      setCurrentStep(1);
      return;
    }

    // Determine step from status message
    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i];
      if (step.keywords.some(kw => status.toLowerCase().includes(kw.toLowerCase()))) {
        setCurrentStep(step.id);
        break;
      }
    }
  }, [status, isGenerating]);

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-background via-background to-muted/20">
      {/* Main Animation */}
      <div className="relative mb-10">
        <div className="w-28 h-28 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-purple-500 to-accent flex items-center justify-center shadow-2xl animate-pulse">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
        </div>
        {/* Orbiting elements */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "4s" }}>
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary shadow-lg" />
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "6s", animationDirection: "reverse" }}>
          <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-accent shadow-lg" />
        </div>
      </div>

      {/* Title & Status */}
      <h2 className="text-2xl font-display font-bold text-foreground mb-2">Building Your Website</h2>
      <p className="text-muted-foreground mb-2 text-center max-w-md text-sm">
        {status || "Preparing AI generation..."}
      </p>

      {/* Progress Bar */}
      <div className="w-full max-w-md mb-8">
        <Progress value={progress} className="h-2" />
        <p className="text-center text-muted-foreground text-xs mt-2">
          {Math.round(progress)}% complete
        </p>
      </div>

      {/* Steps */}
      <div className="w-full max-w-sm space-y-2">
        {steps.map((step) => {
          const Icon = step.icon;
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isCompleted
                  ? "bg-emerald-500/10 border border-emerald-500/20"
                  : isCurrent
                  ? "bg-primary/10 border border-primary/20 scale-[1.02]"
                  : "bg-muted/30 border border-transparent opacity-50"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                  isCompleted
                    ? "bg-emerald-500/20"
                    : isCurrent
                    ? "bg-gradient-to-br from-primary to-purple-500"
                    : "bg-muted"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                ) : (
                  <Icon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <span className={`text-sm font-medium ${
                isCompleted ? "text-emerald-400" : isCurrent ? "text-foreground" : "text-muted-foreground"
              }`}>
                {step.label}
              </span>
              {isCurrent && (
                <div className="ml-auto flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
