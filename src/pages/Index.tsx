import { useState } from "react";
import { ChatHero } from "@/components/chat/ChatHero";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ModelType } from "@/components/builder/SettingsDialog";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export interface Page {
  id: string;
  name: string;
  path: string;
  content: string;
}

export interface Component {
  id: string;
  name: string;
  category: string;
  code: string;
}

const Index = () => {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>(
    (localStorage.getItem("ai_model") as ModelType) || "gemini-2.0-flash-exp"
  );
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  const handleMessageSubmit = async (message: string, files?: File[]) => {
    const userMessage = files && files.length > 0 
      ? `${message}\n\n[${files.length} file(s) attached]`
      : message;
    
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsGenerating(true);
    
    try {
      // Simulate AI response for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I've received your request! In a full implementation, I would process your prompt and generate the appropriate content based on your selection. You can toggle between Web and Contract modes in the settings." 
      }]);
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}` 
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleModelChange = (model: ModelType) => {
    setSelectedModel(model);
    localStorage.setItem("ai_model", model);
  };

  return (
    <div className="min-h-screen bg-editor-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <span className="font-bold text-lg">QubeAI</span>
          </div>
          
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto">
        <ChatHero />
        <ChatInterface
          messages={messages}
          onSubmit={handleMessageSubmit}
          isGenerating={isGenerating}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
        />
      </main>
    </div>
  );
};

export default Index;
