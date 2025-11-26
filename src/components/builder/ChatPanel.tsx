import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface ChatPanelProps {
  prompts: Array<{ role: "user" | "assistant"; content: string }>;
  onSubmit: (prompt: string) => void;
  isGenerating?: boolean;
}

export const ChatPanel = ({ prompts, onSubmit, isGenerating = false }: ChatPanelProps) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [prompts]);

  const handleSubmit = () => {
    if (input.trim() && !isGenerating) {
      onSubmit(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="h-[320px] border-t border-border bg-card flex flex-col">
      <div className="h-12 border-b border-border flex items-center px-4">
        <Sparkles className="h-4 w-4 mr-2 text-primary" />
        <h3 className="font-semibold text-sm">AI Assistant</h3>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {prompts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="max-w-md">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary opacity-50" />
              <p className="text-sm text-muted-foreground">
                Describe what you want to build, and I'll help you create it.
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">Try:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSubmit("Create a hero section with a gradient background")}
                  >
                    Hero section
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSubmit("Add a contact form with email and message fields")}
                  >
                    Contact form
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {prompts.map((prompt, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  prompt.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {prompt.role === "assistant" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      AI
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    prompt.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{prompt.content}</p>
                </div>
                {prompt.role === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-secondary">U</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            className="min-h-[60px] resize-none"
            disabled={isGenerating}
          />
          <Button 
            onClick={handleSubmit} 
            size="icon" 
            className="shrink-0"
            disabled={isGenerating || !input.trim()}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
