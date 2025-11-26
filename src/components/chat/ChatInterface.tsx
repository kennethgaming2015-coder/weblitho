import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, Paperclip, Settings2, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModelType } from "@/components/builder/SettingsDialog";

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
  const [showModelSelector, setShowModelSelector] = useState(false);
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
        description: "You can only upload up to 10 files at once",
        variant: "destructive",
      });
      return;
    }
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const quickPrompts = [
    "Create a modern landing page with hero section",
    "Build an ERC20 token contract",
    "Design a dashboard with analytics",
    "Generate an NFT collection contract",
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-6 pb-8">
      <div className="rounded-3xl border border-border/50 bg-card/30 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Model Selector Bar */}
        <div className="border-b border-border/50 bg-gradient-accent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 blur-md rounded-full" />
                <Sparkles className="relative h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">QubeAI Assistant</h3>
                <p className="text-xs text-muted-foreground">Powered by {selectedModel.includes('gemini-2.5') ? 'Advanced AI' : 'QubeAI 2.0'}</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="gap-2"
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Model</span>
            </Button>
          </div>

          {showModelSelector && (
            <div className="mt-4 p-4 rounded-xl bg-background/50 backdrop-blur border border-border animate-fade-in">
              <label className="text-sm font-medium mb-2 block">Select AI Model</label>
              <Select value={selectedModel} onValueChange={(value) => onModelChange(value as ModelType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-2.0-flash-exp">QubeAI 2.0 Flash (Fastest)</SelectItem>
                  <SelectItem value="gemini-1.5-pro">QubeAI 2.0 Pro (Balanced)</SelectItem>
                  <SelectItem value="gemini-1.5-flash">QubeAI 2.0 Flash 1.5</SelectItem>
                  <SelectItem value="google/gemini-2.5-flash">Advanced Flash</SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">Advanced Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <ScrollArea className="h-[400px] p-6" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="max-w-md text-center space-y-6">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                  <Sparkles className="relative h-16 w-16 mx-auto text-primary" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-2">Start Building with AI</h4>
                  <p className="text-sm text-muted-foreground mb-6">
                    Describe your vision and watch QubeAI create instantly
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Try These
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {quickPrompts.map((prompt, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        onClick={() => onSubmit(prompt, [])}
                        className="text-xs h-auto py-3 px-4 hover:border-primary/50 hover:bg-gradient-accent transition-all"
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 animate-slide-up ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 border-2 border-primary/20 shadow-glow">
                      <AvatarFallback className="bg-gradient-primary text-white font-semibold text-xs">
                        AI
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 backdrop-blur ${
                      message.role === "user"
                        ? "bg-gradient-primary text-white shadow-glow"
                        : "bg-muted/50 border border-border"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 border-2 border-primary/20">
                      <AvatarFallback className="bg-secondary font-semibold text-xs">
                        U
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-border/50 bg-background/30 backdrop-blur">
          {files.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm"
                >
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="ml-1 hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="*/*"
            />
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating}
              className="shrink-0"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to build..."
              className="min-h-[60px] resize-none bg-background/50 backdrop-blur border-border/50 focus:border-primary/50 transition-all"
              disabled={isGenerating}
            />
            
            <Button 
              onClick={handleSubmit} 
              size="icon" 
              className="shrink-0 h-[60px] w-[60px] rounded-2xl shadow-glow transition-bounce hover:scale-110"
              disabled={isGenerating || (!input.trim() && files.length === 0)}
            >
              {isGenerating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
