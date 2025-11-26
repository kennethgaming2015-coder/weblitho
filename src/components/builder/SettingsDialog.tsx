import { useState, useEffect } from "react";
import { Settings, Zap } from "lucide-react";
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

export type ModelType = 
  | "gemini-2.0-flash-exp"
  | "gemini-1.5-pro"
  | "gemini-1.5-flash"
  | "google/gemini-2.5-flash" 
  | "google/gemini-2.5-pro" 
  | "google/gemini-2.5-flash-lite";

interface SettingsDialogProps {
  onSettingsChange: (model: ModelType) => void;
}

export const SettingsDialog = ({ onSettingsChange }: SettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState<ModelType>("gemini-2.0-flash-exp");
  const { toast } = useToast();

  useEffect(() => {
    const savedModel = localStorage.getItem("ai_model") as ModelType;
    if (savedModel) setModel(savedModel);
  }, []);

  const handleSave = () => {
    localStorage.setItem("ai_model", model);
    onSettingsChange(model);

    const modelDisplayName = model.includes("2.0") 
      ? "QubeAI 2.0" 
      : model.includes("1.5")
      ? "QubeAI 1.5"
      : "QubeAI Advanced";
    
    toast({
      title: "Model Updated",
      description: `Now using ${modelDisplayName}`,
    });

    setOpen(false);
  };

  const baseModels: ModelType[] = [
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
  ];

  const advancedModels: ModelType[] = [
    "google/gemini-2.5-flash",
    "google/gemini-2.5-pro",
    "google/gemini-2.5-flash-lite",
  ];

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
            <Zap className="h-5 w-5 text-primary" />
            AI Model Selection
          </DialogTitle>
          <DialogDescription>
            Choose the AI model that powers your page generation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-gradient-accent p-4">
              <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                QubeAI 2.0 (Recommended)
              </Label>
              <p className="text-xs text-muted-foreground mb-3">
                Latest generation models optimized for speed and quality
              </p>
              <Select 
                value={baseModels.includes(model) ? model : undefined}
                onValueChange={(value) => setModel(value as ModelType)}
              >
                <SelectTrigger className="bg-background/50 backdrop-blur">
                  <SelectValue placeholder="Select QubeAI 2.0 model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-2.0-flash-exp">
                    <div className="flex flex-col items-start gap-1 py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">2.0 Flash</span>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">FASTEST</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        ⚡ Lightning-fast generation, ideal for rapid prototyping
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="gemini-1.5-flash">
                    <div className="flex flex-col items-start gap-1 py-1">
                      <span className="font-semibold">1.5 Flash</span>
                      <span className="text-xs text-muted-foreground">
                        🎯 Balanced speed and quality for standard pages
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="gemini-1.5-pro">
                    <div className="flex flex-col items-start gap-1 py-1">
                      <span className="font-semibold">1.5 Pro</span>
                      <span className="text-xs text-muted-foreground">
                        🎨 Superior quality for complex, detailed layouts
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Advanced Models
              </Label>
              <p className="text-xs text-muted-foreground mb-3">
                Next-gen models with advanced reasoning for complex queries
              </p>
              <Select 
                value={advancedModels.includes(model) ? model : undefined} 
                onValueChange={(value) => setModel(value as ModelType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select advanced model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-2.5-flash">
                    <div className="flex flex-col items-start gap-1 py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">2.5 Flash</span>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">NEW</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        🧠 Advanced reasoning with multimodal capabilities
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">
                    <div className="flex flex-col items-start gap-1 py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">2.5 Pro</span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-medium">PREMIUM</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        🚀 Most capable model for highly complex projects
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="google/gemini-2.5-flash-lite">
                    <div className="flex flex-col items-start gap-1 py-1">
                      <span className="font-semibold">2.5 Flash Lite</span>
                      <span className="text-xs text-muted-foreground">
                        ⚡ Lightweight with advanced features
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
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
