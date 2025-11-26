import { Moon, Sun, Sparkles, Play, Code2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { SettingsDialog, ModelType } from "./SettingsDialog";

interface HeaderProps {
  onSettingsChange: (model: ModelType) => void;
  mode: "web" | "contract";
  onModeChange: (mode: "web" | "contract") => void;
}

export const Header = ({ onSettingsChange, mode, onModeChange }: HeaderProps) => {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
            <div className="relative h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="font-bold text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              QubeAI Builder
            </h1>
            <p className="text-xs text-muted-foreground">AI-Powered Web Designer</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-background/50 backdrop-blur rounded-lg p-1 border border-border/50">
          <Button
            variant={mode === "web" ? "default" : "ghost"}
            size="sm"
            onClick={() => onModeChange("web")}
            className={`gap-2 ${mode === "web" ? "shadow-glow" : ""}`}
          >
            <Globe className="h-4 w-4" />
            <span className="hidden md:inline">Web</span>
          </Button>
          <Button
            variant={mode === "contract" ? "default" : "ghost"}
            size="sm"
            onClick={() => onModeChange("contract")}
            className={`gap-2 ${mode === "contract" ? "shadow-glow" : ""}`}
          >
            <Code2 className="h-4 w-4" />
            <span className="hidden md:inline">Contract</span>
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="gap-2">
          <Play className="h-4 w-4" />
          <span className="hidden md:inline">Preview</span>
        </Button>
        <SettingsDialog onSettingsChange={onSettingsChange} />
        <Button variant="ghost" size="sm" onClick={toggleTheme}>
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        <Button variant="default" size="sm" className="shadow-glow gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="hidden md:inline">Publish</span>
        </Button>
      </div>
    </header>
  );
};
