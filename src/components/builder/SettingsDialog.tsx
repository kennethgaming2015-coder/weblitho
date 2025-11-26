import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
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
  | "gemini-2.0-flash-exp"
  | "gemini-1.5-pro"
  | "gemini-1.5-flash";

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

    const isLovable = model.startsWith("google/");
    toast({
      title: "Settings Saved",
      description: `Now using ${isLovable ? "Lovable AI" : "Google Gemini Direct"} with ${model}`,
    });

    setOpen(false);
  };

  const lovableModels: ModelType[] = [
    "google/gemini-2.5-flash",
    "google/gemini-2.5-pro",
    "google/gemini-2.5-flash-lite",
  ];

  const geminiModels: ModelType[] = [
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>AI Model Settings</DialogTitle>
          <DialogDescription>
            Choose which AI model to use for page generation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold mb-3 block">
                Lovable AI Models
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                No setup required, usage-based pricing through Lovable
              </p>
              <Select 
                value={lovableModels.includes(model) ? model : undefined} 
                onValueChange={(value) => setModel(value as ModelType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Lovable AI model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-2.5-flash">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Gemini 2.5 Flash</span>
                      <span className="text-xs text-muted-foreground">
                        Fast & efficient, best for most tasks
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Gemini 2.5 Pro</span>
                      <span className="text-xs text-muted-foreground">
                        Most capable, complex reasoning
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="google/gemini-2.5-flash-lite">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Gemini 2.5 Flash Lite</span>
                      <span className="text-xs text-muted-foreground">
                        Fastest & cheapest
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t">
              <Label className="text-base font-semibold mb-3 block">
                Google Gemini Direct
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Uses your configured Gemini API key
              </p>
              <Select 
                value={geminiModels.includes(model) ? model : undefined}
                onValueChange={(value) => setModel(value as ModelType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Gemini model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-2.0-flash-exp">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Gemini 2.0 Flash (Exp)</span>
                      <span className="text-xs text-muted-foreground">
                        Latest experimental model
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="gemini-1.5-pro">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Gemini 1.5 Pro</span>
                      <span className="text-xs text-muted-foreground">
                        Most capable stable model
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="gemini-1.5-flash">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Gemini 1.5 Flash</span>
                      <span className="text-xs text-muted-foreground">
                        Fast and efficient
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
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
