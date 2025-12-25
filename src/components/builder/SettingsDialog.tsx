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

// Model type mapping - Weblitho branded models
export type ModelType = 
  | "mimo-v2-flash"        // Weblitho Fast
  | "devstral"             // Weblitho Code
  | "qwen3-coder"          // Weblitho Pro
  | "deepseek-chimera";    // Weblitho Premium

// Model display configuration with Weblitho branding
const modelConfig: Record<ModelType, { 
  name: string; 
  description: string; 
  badge?: string | null; 
  badgeColor?: string;
  requiresPaid: boolean;
  icon: typeof Zap;
  creditMultiplier: number;
}> = {
  "mimo-v2-flash": {
    name: "Weblitho Fast",
    description: "⚡ Quick generation, great for simple sites",
    badge: "FAST",
    badgeColor: "bg-green-500/10 text-green-500",
    requiresPaid: false,
    icon: Zap,
    creditMultiplier: 1
  },
  "devstral": {
    name: "Weblitho Code",
    description: "🛠️ Optimized for complex code & multi-page sites",
    badge: "CODE",
    badgeColor: "bg-blue-500/10 text-blue-500",
    requiresPaid: false,
    icon: Code,
    creditMultiplier: 1.5
  },
  "qwen3-coder": {
    name: "Weblitho Pro",
    description: "💎 High-quality output for professional sites",
    badge: "PRO",
    badgeColor: "bg-purple-500/10 text-purple-500",
    requiresPaid: false,
    icon: Brain,
    creditMultiplier: 2
  },
  "deepseek-chimera": {
    name: "Weblitho Premium",
    description: "🚀 Best quality - Advanced reasoning & design",
    badge: "PREMIUM",
    badgeColor: "bg-amber-500/10 text-amber-500",
    requiresPaid: false,
    icon: Rocket,
    creditMultiplier: 3
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
            Choose your AI model. Premium models produce higher quality output.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Credit Info */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">Credit Usage</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Higher tier models use more credits but produce better quality websites.
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
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {config.creditMultiplier}x credits
                            </span>
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
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = modelConfig[model].icon;
                      return <Icon className="h-4 w-4 text-primary" />;
                    })()}
                    <span className="font-medium text-sm">{modelConfig[model].name}</span>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {modelConfig[model].creditMultiplier}x credits
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {model === "mimo-v2-flash" && "Quick and efficient. Perfect for landing pages, simple websites, and rapid prototyping."}
                  {model === "devstral" && "Specialized for code. Best for multi-page sites, complex layouts, and custom functionality."}
                  {model === "qwen3-coder" && "Professional quality. Produces polished, production-ready websites with attention to detail."}
                  {model === "deepseek-chimera" && "Our most powerful model. Advanced reasoning for stunning designs and complex requirements."}
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
