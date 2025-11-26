import { useState, useEffect } from "react";
import { Settings, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export type AIProvider = "lovable" | "gemini";
export type ModelType = 
  | "google/gemini-2.5-flash" 
  | "google/gemini-2.5-pro" 
  | "google/gemini-2.5-flash-lite"
  | "gemini-2.0-flash-exp"
  | "gemini-1.5-pro"
  | "gemini-1.5-flash";

interface SettingsDialogProps {
  onSettingsChange: (settings: {
    provider: AIProvider;
    model: ModelType;
    apiKey?: string;
  }) => void;
}

export const SettingsDialog = ({ onSettingsChange }: SettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<AIProvider>("lovable");
  const [model, setModel] = useState<ModelType>("google/gemini-2.5-flash");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const savedProvider = localStorage.getItem("ai_provider") as AIProvider;
    const savedModel = localStorage.getItem("ai_model") as ModelType;
    const savedApiKey = localStorage.getItem("gemini_api_key");

    if (savedProvider) setProvider(savedProvider);
    if (savedModel) setModel(savedModel);
    if (savedApiKey) setGeminiApiKey(savedApiKey);
  }, []);

  const handleSave = () => {
    if (provider === "gemini" && !geminiApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your Gemini API key",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem("ai_provider", provider);
    localStorage.setItem("ai_model", model);
    if (provider === "gemini") {
      localStorage.setItem("gemini_api_key", geminiApiKey);
    }

    onSettingsChange({
      provider,
      model,
      apiKey: provider === "gemini" ? geminiApiKey : undefined,
    });

    toast({
      title: "Settings Saved",
      description: `Now using ${provider === "lovable" ? "Lovable AI" : "Google Gemini"} with ${model}`,
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

  const availableModels = provider === "lovable" ? lovableModels : geminiModels;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>AI Settings</DialogTitle>
          <DialogDescription>
            Configure your AI provider and model preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>AI Provider</Label>
            <Select
              value={provider}
              onValueChange={(value) => {
                setProvider(value as AIProvider);
                // Reset model when switching providers
                setModel(value === "lovable" ? "google/gemini-2.5-flash" : "gemini-2.0-flash-exp");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lovable">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Lovable AI</span>
                    <span className="text-xs text-muted-foreground">
                      No API key needed, usage-based pricing
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="gemini">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Google Gemini Direct</span>
                    <span className="text-xs text-muted-foreground">
                      Requires your own API key
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Model</Label>
            <Select value={model} onValueChange={(value) => setModel(value as ModelType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {provider === "lovable" 
                ? "Flash: Fast & efficient, Pro: Most capable, Lite: Fastest & cheapest"
                : "2.0 Flash: Latest experimental, 1.5 Pro: Most capable, 1.5 Flash: Fast"}
            </p>
          </div>

          {provider === "gemini" && (
            <div className="space-y-2">
              <Label htmlFor="api-key">
                <Key className="h-3 w-3 inline mr-1" />
                Gemini API Key
              </Label>
              <Input
                id="api-key"
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="Enter your Google Gemini API key"
              />
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>
          )}
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
