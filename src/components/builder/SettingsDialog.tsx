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
  | "google/gemini-2.5-flash" 
  | "google/gemini-2.5-pro" 
  | "google/gemini-2.5-flash-lite"
  | "x-ai/grok-4.1-fast:free"
  | "kwaipilot/kat-coder-pro:free"
  | "deepseek/deepseek-r1:free"
  | "meta-llama/llama-3.3-70b-instruct:free";

interface SettingsDialogProps {
  onSettingsChange: (model: ModelType) => void;
}

export const SettingsDialog = ({ onSettingsChange }: SettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState<ModelType>("google/gemini-2.5-flash");
  const { toast } = useToast();

  useEffect(() => {
    const savedModel = localStorage.getItem("ai_model") as ModelType;
    if (savedModel) setModel(savedModel);
  }, []);

  const handleSave = () => {
    localStorage.setItem("ai_model", model);
    onSettingsChange(model);

    const modelDisplayName = model.includes("2.5-pro") 
      ? "QubeAI 2.5 Pro" 
      : model.includes("2.5-flash-lite")
      ? "QubeAI 2.5 Flash Lite"
      : model.includes("grok")
      ? "Grok 4.1 Fast"
      : model.includes("kat-coder")
      ? "Kat Coder Pro"
      : model.includes("deepseek")
      ? "DeepSeek R1"
      : model.includes("llama")
      ? "Llama 3.3 70B"
      : "QubeAI 2.5 Flash";
    
    toast({
      title: "Model Updated",
      description: `Now using ${modelDisplayName}`,
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
                QubeAI Models
              </Label>
              <p className="text-xs text-muted-foreground mb-3">
                Choose the AI model that powers your generation
              </p>
              <Select 
                value={model}
                onValueChange={(value) => setModel(value as ModelType)}
              >
                <SelectTrigger className="bg-background/50 backdrop-blur">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-2.5-flash">
                    <div className="flex flex-col items-start gap-1 py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">QubeAI 2.5 Flash</span>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">RECOMMENDED</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        ⚡ Balanced speed and quality for most projects
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">
                    <div className="flex flex-col items-start gap-1 py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">QubeAI 2.5 Pro</span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-medium">PREMIUM</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        🚀 Most capable for complex reasoning and projects
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="google/gemini-2.5-flash-lite">
                    <div className="flex flex-col items-start gap-1 py-1">
                      <span className="font-semibold">QubeAI 2.5 Flash Lite</span>
                      <span className="text-xs text-muted-foreground">
                        💨 Fastest generation for simple projects
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="x-ai/grok-4.1-fast:free">
                    <div className="flex flex-col items-start gap-1 py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Grok 4.1 Fast</span>
                        <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-medium">FREE</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        🤖 Fast OpenRouter model by X.AI
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="kwaipilot/kat-coder-pro:free">
                    <div className="flex flex-col items-start gap-1 py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Kat Coder Pro</span>
                        <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-medium">FREE</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        💻 Specialized coding model via OpenRouter
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="deepseek/deepseek-r1:free">
                    <div className="flex flex-col items-start gap-1 py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">DeepSeek R1</span>
                        <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-medium">FREE</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        🧠 Advanced reasoning model via OpenRouter
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="meta-llama/llama-3.3-70b-instruct:free">
                    <div className="flex flex-col items-start gap-1 py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Llama 3.3 70B</span>
                        <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-medium">FREE</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        🦙 Meta's powerful open-source model
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
