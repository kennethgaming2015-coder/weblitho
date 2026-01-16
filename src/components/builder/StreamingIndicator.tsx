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
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${gradientColor} flex items-center justify-center shadow-lg`}>
            <Icon className={`h-5 w-5 text-white ${!isComplete ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{status}</p>
            <p className="text-xs text-muted-foreground">
              {tokensGenerated !== undefined && tokensGenerated > 0 
                ? `${tokensGenerated.toLocaleString()} tokens • Generating multi-file project`
                : 'Creating React components...'}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <span className={`text-lg font-bold bg-gradient-to-r ${gradientColor} bg-clip-text text-transparent`}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
        <div 
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${gradientColor} transition-all duration-300 ease-out`}
          style={{ width: `${progress}%` }}
        />
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
          style={{ backgroundSize: '200% 100%' }}
        />
      </div>

      {/* Phase indicators */}
      <div className="flex justify-between mt-4 px-1">
        {[
          { name: "Analyze", icon: "🔍" },
          { name: "Plan", icon: "📋" },
          { name: "Build", icon: "🛠️" },
          { name: "Style", icon: "🎨" },
          { name: "Done", icon: "✅" }
        ].map((phase, index) => {
          const phaseProgress = (index + 1) * 20;
          const isActive = progress >= phaseProgress - 20 && progress < phaseProgress;
          const isCompleted = progress >= phaseProgress;
          
          return (
            <div key={phase.name} className="flex flex-col items-center gap-1">
              <div 
                className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs transition-all ${
                  isCompleted ? 'bg-primary/20 scale-110' : 
                  isActive ? 'bg-muted animate-pulse' : 
                  'bg-muted/50'
                }`}
              >
                {phase.icon}
              </div>
              <span className={`text-[10px] font-medium ${
                isCompleted ? 'text-primary' : 
                isActive ? 'text-foreground' : 
                'text-muted-foreground/50'
              }`}>
                {phase.name}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Files being generated indicator */}
      <div className="mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Generating: package.json, App.tsx, Navbar.tsx, Hero.tsx, Features.tsx...</span>
        </div>
      </div>
    </div>
  );
}
