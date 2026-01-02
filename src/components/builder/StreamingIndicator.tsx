import { Loader2, Sparkles, Code, Palette, CheckCircle, Wand2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface StreamingIndicatorProps {
  status: string;
  statusType: "analyzing" | "planning" | "building" | "styling" | "finalizing" | "complete" | "error" | "conversation";
  progress: number;
  tokensGenerated?: number;
}

const statusIcons = {
  analyzing: Sparkles,
  planning: Wand2,
  building: Code,
  styling: Palette,
  finalizing: CheckCircle,
  complete: CheckCircle,
  error: Loader2,
  conversation: Sparkles,
};

const statusColors = {
  analyzing: "from-blue-500 to-cyan-500",
  planning: "from-purple-500 to-pink-500",
  building: "from-green-500 to-emerald-500",
  styling: "from-orange-500 to-amber-500",
  finalizing: "from-primary to-purple-500",
  complete: "from-green-500 to-emerald-500",
  error: "from-destructive to-red-500",
  conversation: "from-blue-500 to-purple-500",
};

export function StreamingIndicator({ status, statusType, progress, tokensGenerated }: StreamingIndicatorProps) {
  const Icon = statusIcons[statusType] || Loader2;
  const gradientColor = statusColors[statusType] || statusColors.analyzing;
  const isComplete = statusType === "complete";

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${gradientColor} flex items-center justify-center shadow-lg`}>
            <Icon className={`h-4 w-4 text-white ${!isComplete ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{status}</p>
            {tokensGenerated !== undefined && tokensGenerated > 0 && (
              <p className="text-xs text-muted-foreground">
                {tokensGenerated.toLocaleString()} tokens generated
              </p>
            )}
          </div>
        </div>
        
        <span className={`text-sm font-semibold bg-gradient-to-r ${gradientColor} bg-clip-text text-transparent`}>
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <Progress value={progress} className="h-2 bg-muted/50" />
        <div 
          className={`absolute inset-0 h-2 rounded-full bg-gradient-to-r ${gradientColor} transition-all duration-300`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Phase indicators */}
      <div className="flex justify-between mt-3 px-1">
        {["Analyze", "Plan", "Build", "Style", "Done"].map((phase, index) => {
          const phaseProgress = (index + 1) * 20;
          const isActive = progress >= phaseProgress - 20 && progress < phaseProgress;
          const isCompleted = progress >= phaseProgress;
          
          return (
            <div key={phase} className="flex flex-col items-center">
              <div 
                className={`h-1.5 w-1.5 rounded-full transition-all ${
                  isCompleted ? 'bg-primary scale-125' : 
                  isActive ? 'bg-primary/50 animate-pulse' : 
                  'bg-muted-foreground/30'
                }`}
              />
              <span className={`text-[10px] mt-1 ${
                isCompleted ? 'text-primary font-medium' : 
                isActive ? 'text-muted-foreground' : 
                'text-muted-foreground/50'
              }`}>
                {phase}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
