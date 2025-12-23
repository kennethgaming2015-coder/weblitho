import { useState, useEffect } from "react";
import { Settings, Shield, Sparkles, Lock, Zap, Code, Brain, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Model type mapping - ALL FREE OpenRouter models
export type ModelType = 
  | "mimo-v2-flash"        // Xiaomi MiMo-V2-Flash - Best overall
  | "devstral"             // Mistral Devstral 2 - Best for agentic coding
  | "qwen3-coder"          // Qwen3 Coder 480B - Best for code generation
  | "deepseek-chimera";    // DeepSeek R1T2 Chimera - Best for reasoning

// Model display configuration - ALL FREE
const modelConfig: Record<ModelType, { 
  name: string; 
  description: string; 
  badge?: string | null; 
  badgeColor?: string;
  requiresPaid: boolean;
  icon: typeof Zap;
}> = {
  "mimo-v2-flash": {
    name: "MiMo Flash",
    description: "⚡ Best overall - #1 ranked, 262K context",
    badge: "BEST",
    badgeColor: "bg-green-500/10 text-green-500",
    requiresPaid: false,
    icon: Zap
  },
  "devstral": {
    name: "Devstral 2",
    description: "🛠️ Best for agentic coding - 256K context",
    badge: "CODE",
    badgeColor: "bg-blue-500/10 text-blue-500",
    requiresPaid: false,
    icon: Code
  },
  "qwen3-coder": {
    name: "Qwen3 Coder",
    description: "💻 480B params - Excellent for code",
    badge: "480B",
    badgeColor: "bg-purple-500/10 text-purple-500",
    requiresPaid: false,
    icon: Brain
  },
  "deepseek-chimera": {
    name: "DeepSeek Chimera",
    description: "🧠 671B MoE - Best reasoning",
    badge: "REASON",
    badgeColor: "bg-amber-500/10 text-amber-500",
    requiresPaid: false,
    icon: Rocket
  }
};

// Helper to check if user has paid plan
export const isPaidPlan = (plan: string | undefined): boolean => {
  return plan === 'pro' || plan === 'business' || plan === 'owner';
};

// Helper to check if model is accessible - ALL models are free now
export const canAccessModel = (modelId: ModelType, plan: string | undefined): boolean => {
  return true; // All models are free
};

interface SettingsDialogProps {
  onSettingsChange: (model: ModelType) => void;
  userPlan?: string;
}

export const SettingsDialog = ({ onSettingsChange, userPlan }: SettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState<ModelType>("mimo-v2-flash");
  const { toast } = useToast();

  useEffect(() => {
    const savedModel = localStorage.getItem("ai_model") as ModelType;
    if (savedModel && modelConfig[savedModel]) {
      setModel(savedModel);
    } else {
      // Default to best model
      setModel("mimo-v2-flash");
      localStorage.setItem("ai_model", "mimo-v2-flash");
    }
  }, [userPlan]);

  const handleModelChange = (value: string) => {
    const modelId = value as ModelType;
    setModel(modelId);
  };

  const handleSave = () => {
    localStorage.setItem("ai_model", model);
    onSettingsChange(model);

    const config = modelConfig[model];
    
    toast({
      title: "Model Updated",
      description: `Now using ${config.name}`,
    });

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden md:inline">Model</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Weblitho AI Model
          </DialogTitle>
          <DialogDescription>
            Select from the best FREE AI models. All models are powered by OpenRouter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* All Free Badge */}
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-green-500" />
              <span className="font-medium text-green-500">100% Free Models</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All models are free to use with no limits. Powered by OpenRouter.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-gradient-accent p-4">
              <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Generation Model
              </Label>
              <p className="text-xs text-muted-foreground mb-3">
                Choose the AI model that powers your website generation
              </p>
              <Select 
                value={model}
                onValueChange={handleModelChange}
              >
                <SelectTrigger className="bg-background/50 backdrop-blur">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(modelConfig) as [ModelType, typeof modelConfig[ModelType]][]).map(([modelId, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem 
                        key={modelId} 
                        value={modelId}
                      >
                        <div className="flex flex-col items-start gap-1 py-1">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{config.name}</span>
                            {config.badge && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${config.badgeColor}`}>
                                {config.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {config.description}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              {/* Model Info */}
              <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const Icon = modelConfig[model].icon;
                    return <Icon className="h-4 w-4 text-primary" />;
                  })()}
                  <span className="font-medium text-sm">{modelConfig[model].name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {model === "mimo-v2-flash" && "Xiaomi's flagship model. #1 ranked on SWE-bench, comparable to Claude Sonnet 4.5 at 3.5% of the cost."}
                  {model === "devstral" && "Mistral's agentic coding model. 123B dense params, excels at multi-file editing and architecture-level context."}
                  {model === "qwen3-coder" && "Qwen team's MoE code model. 480B total params, 35B active per forward pass, optimized for tool use."}
                  {model === "deepseek-chimera" && "Merged from DeepSeek R1-0528, R1 & V3-0324. 671B MoE, runs 20% faster than original R1."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="shadow-glow">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Export model config for use in other components
export { modelConfig };
