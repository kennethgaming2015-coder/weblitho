import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, Paperclip, Settings2, X, FileText, RotateCcw, RefreshCw, Download } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

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

  const quickActions = [
    { icon: RefreshCw, label: "Refine design", prompt: "Make the design more modern and polished with better spacing and colors" },
    { icon: RotateCcw, label: "Change style", prompt: "Redesign this with a completely different visual style" },
    { icon: Sparkles, label: "Add features", prompt: "Add more interactive features and animations" },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Clean Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/5 bg-[#0a0a0a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span className="text-xs text-white/60">QubeAI 2.5</span>
          </div>
            
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="h-7 w-7 text-white/40 hover:text-white/70 hover:bg-white/5"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {showModelSelector && (
          <div className="mt-3 px-3 py-2 bg-white/5 rounded-lg animate-fade-in">
            <Select value={selectedModel} onValueChange={(value) => onModelChange(value as ModelType)}>
              <SelectTrigger className="h-8 text-xs bg-transparent border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google/gemini-2.5-flash">QubeAI Flash (Recommended)</SelectItem>
                <SelectItem value="google/gemini-2.5-pro">QubeAI Pro (Premium)</SelectItem>
                <SelectItem value="google/gemini-2.5-flash-lite">QubeAI Flash Lite</SelectItem>
                <SelectItem value="x-ai/grok-4.1-fast:free">Grok 4.1 Fast (Free)</SelectItem>
                <SelectItem value="kwaipilot/kat-coder-pro:free">Kat Coder Pro (Free)</SelectItem>
                <SelectItem value="deepseek/deepseek-r1:free">DeepSeek R1 (Free)</SelectItem>
                <SelectItem value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B (Free)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Messages Area - Clean & Minimal */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-4 max-w-2xl">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-xl px-3 py-2 ${
                  message.role === "user"
                    ? "bg-white/10 text-white"
                    : "bg-white/5 text-white/90 border border-white/5"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === "user" && (
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs font-medium">
                  U
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Action Chips */}
        {messages.length > 0 && !isGenerating && (
          <div className="pb-4 px-2">
            <p className="text-xs text-white/40 mb-2">Quick actions:</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={() => onSubmit(action.prompt)}
                    className="h-7 px-3 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white"
                  >
                    <Icon className="h-3 w-3 mr-1.5" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Input Area - Clean & Compact */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-white/5 bg-[#0a0a0a]">
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-white/70"
              >
                <FileText className="h-3 w-3 text-primary" />
                <span className="max-w-[100px] truncate">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating}
            className="h-9 w-9 shrink-0 text-white/40 hover:text-white/70 hover:bg-white/5"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message QubeAI..."
            className="min-h-[36px] max-h-[120px] resize-none bg-white/5 border-white/10 focus:border-white/20 text-sm text-white placeholder:text-white/40"
            disabled={isGenerating}
          />
          
          <Button 
            onClick={handleSubmit} 
            size="icon"
            className="h-9 w-9 shrink-0 rounded-lg bg-white text-black hover:bg-white/90"
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
