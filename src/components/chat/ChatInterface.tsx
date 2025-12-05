import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, Paperclip, X, FileText, RefreshCw, Wand2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModelType, modelConfig } from "@/components/builder/SettingsDialog";

interface ChatInterfaceProps {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  onSubmit: (message: string, files?: File[]) => void;
  isGenerating?: boolean;
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
}

export const ChatInterface = ({ 
  messages, 
  onSubmit, 
  isGenerating = false,
  selectedModel,
  onModelChange 
}: ChatInterfaceProps) => {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = () => {
    if ((input.trim() || files.length > 0) && !isGenerating) {
      onSubmit(input, files);
      setInput("");
      setFiles([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length + files.length > 10) {
      toast({
        title: "Too many files",
        description: "Maximum 10 files allowed",
        variant: "destructive",
      });
      return;
    }
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const quickActions = [
    { icon: RefreshCw, label: "Improve design", prompt: "Enhance the design with better spacing, colors, and visual hierarchy" },
    { icon: Wand2, label: "Add animations", prompt: "Add smooth micro-interactions and animations throughout" },
    { icon: Zap, label: "More sections", prompt: "Add more content sections like testimonials or FAQ" },
  ];

  const currentModel = modelConfig[selectedModel];

  return (
    <div className="h-full flex flex-col bg-card/50">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl gradient-animated flex items-center justify-center shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-display font-semibold text-foreground">Weblitho AI</h3>
              <p className="text-xs text-muted-foreground">{currentModel?.name || "AI Assistant"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            <span className="text-xs font-medium text-accent">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-5" ref={scrollRef}>
        <div className="py-5 space-y-5">
          {messages.length === 0 && (
            <div className="text-center py-10 animate-fade-in">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Start a conversation to build something amazing
              </p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-xl gradient-animated flex items-center justify-center shadow-lg">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "glass border-border/50 text-foreground rounded-bl-md"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground text-xs font-semibold border border-border/60">
                  U
                </div>
              )}
            </div>
          ))}

          {isGenerating && (
            <div className="flex gap-3 animate-fade-in">
              <div className="flex-shrink-0 w-8 h-8 rounded-xl gradient-animated flex items-center justify-center shadow-lg">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="glass border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Generating...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {messages.length > 0 && !isGenerating && (
          <div className="pb-5 animate-fade-in">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Quick actions</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onSubmit(action.prompt)}
                  className="h-8 px-3 text-xs rounded-xl bg-card hover:bg-muted border-border/60 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all"
                >
                  <action.icon className="h-3 w-3 mr-1.5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="flex-shrink-0 p-5 border-t border-border/50 bg-card/80 backdrop-blur-xl">
        {files.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted border border-border/60 text-xs"
              >
                <FileText className="h-3 w-3 text-primary" />
                <span className="max-w-[100px] truncate font-medium">{file.name}</span>
                <button onClick={() => removeFile(index)} className="hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex gap-3 items-end">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating}
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[42px] max-h-[120px] resize-none bg-background border-border/60 focus:border-primary/50 text-sm placeholder:text-muted-foreground/60 rounded-xl"
            disabled={isGenerating}
          />
          
          <Button 
            onClick={handleSubmit} 
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl gradient-animated text-primary-foreground shadow-glow"
            disabled={isGenerating || (!input.trim() && files.length === 0)}
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