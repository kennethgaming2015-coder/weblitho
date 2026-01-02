import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, Paperclip, X, FileText, RefreshCw, Wand2, Zap, Square, MessageSquare, Code, Palette, Layout, Crown, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModelType, modelConfig } from "@/components/builder/SettingsDialog";
import { ModelRecommendation } from "@/components/builder/ModelRecommendation";
import { ErrorDisplay } from "@/components/builder/ErrorDisplay";
import { StreamingIndicator } from "@/components/builder/StreamingIndicator";
interface ChatInterfaceProps {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  onSubmit: (message: string, files?: File[], model?: ModelType) => void;
  onStop?: () => void;
  isGenerating?: boolean;
  generationStatus?: string;
  generationStatusType?: "analyzing" | "planning" | "building" | "styling" | "finalizing" | "complete" | "error" | "conversation";
  generationProgress?: number;
  tokensGenerated?: number;
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
  activePage?: { name: string; path: string };
  error?: string | null;
  onRetry?: () => void;
  onDismissError?: () => void;
}

export const ChatInterface = ({ 
  messages, 
  onSubmit, 
  onStop,
  isGenerating = false,
  generationStatus = "",
  generationStatusType = "analyzing",
  generationProgress = 0,
  tokensGenerated = 0,
  selectedModel,
  onModelChange,
  activePage,
  error,
  onRetry,
  onDismissError
}: ChatInterfaceProps) => {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating, generationStatus]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if ((input.trim() || files.length > 0) && !isGenerating) {
      onSubmit(input, files, selectedModel);
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

  // Quick modification actions
  const quickActions = [
    { icon: RefreshCw, label: "Improve design", prompt: "Improve the design with better visual hierarchy, spacing, and modern aesthetics. Make it look more premium and polished." },
    { icon: Wand2, label: "Add animations", prompt: "Add smooth animations and micro-interactions throughout the website. Include hover effects, scroll animations, and transitions." },
    { icon: Palette, label: "Change colors", prompt: "Update the color scheme to be more vibrant and modern while maintaining readability and contrast." },
    { icon: Layout, label: "Add section", prompt: "Add a new section with testimonials or customer reviews. Include photos, names, and compelling quotes." },
  ];

  // Prompt suggestions for empty state
  const promptSuggestions = [
    { icon: Code, title: "SaaS Landing", prompt: "Create a modern SaaS landing page for a project management tool. Include hero with product mockup, features grid, pricing table, testimonials, and footer." },
    { icon: Layout, title: "Portfolio", prompt: "Design a creative portfolio website for a designer. Include hero with intro, project gallery with hover effects, about section, and contact form." },
    { icon: Sparkles, title: "Agency", prompt: "Build a digital agency website with bold typography, case studies section, team grid, services list, and contact CTA." },
  ];

  const currentModel = modelConfig[selectedModel];

  return (
    <div className="h-full flex flex-col bg-card/50">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary via-purple-500 to-accent flex items-center justify-center shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-display font-semibold text-foreground">Weblitho AI</h3>
              <p className="text-xs text-muted-foreground">{currentModel?.name || "AI Assistant"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isGenerating && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                {Math.round(generationProgress)}%
              </Badge>
            )}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isGenerating ? 'bg-primary/10' : 'bg-accent/10'}`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isGenerating ? 'bg-primary' : 'bg-accent'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isGenerating ? 'bg-primary' : 'bg-accent'}`}></span>
              </span>
              <span className={`text-xs font-medium ${isGenerating ? 'text-primary' : 'text-accent'}`}>
                {isGenerating ? 'Building' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-5" ref={scrollRef}>
        <div className="py-5 space-y-5">
          {/* Empty State with Suggestions */}
          {messages.length === 0 && !isGenerating && (
            <div className="py-8 animate-fade-in">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 mb-4">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">What would you like to build?</h3>
                <p className="text-sm text-muted-foreground">Describe your website in detail or try a suggestion below</p>
              </div>
              
              <div className="space-y-3">
                {promptSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(suggestion.prompt)}
                    className="w-full p-4 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/50 hover:border-primary/30 transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <suggestion.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                          {suggestion.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {suggestion.prompt.slice(0, 80)}...
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Message List */}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted/50 border border-border/50 text-foreground rounded-bl-md"
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

          {/* Generation Status with Enhanced Streaming Indicator */}
          {isGenerating && (
            <div className="animate-fade-in">
              <StreamingIndicator
                status={generationStatus || "Generating..."}
                statusType={generationStatusType}
                progress={generationProgress}
                tokensGenerated={tokensGenerated}
              />
            </div>
          )}

          {/* Error Display */}
          {error && !isGenerating && (
            <div className="animate-fade-in">
              <ErrorDisplay 
                error={error} 
                onRetry={onRetry}
                onDismiss={onDismissError}
              />
            </div>
          )}
        </div>

        {/* Quick Actions - Show when there are messages and not generating */}
        {messages.length > 0 && !isGenerating && (
          <div className="pb-5 animate-fade-in">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Quick modifications</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onSubmit(action.prompt, undefined, selectedModel)}
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
        {/* Model Recommendation */}
        <ModelRecommendation
          prompt={input}
          currentModel={selectedModel}
          onModelChange={onModelChange}
        />

        {/* Active Page Indicator */}
        {activePage && activePage.path !== '/' && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-primary font-medium">
              Editing: {activePage.name}
            </span>
            <span className="text-xs text-primary/60">({activePage.path})</span>
          </div>
        )}
        
        {/* File Attachments */}
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
            accept="image/*,.pdf,.doc,.docx,.txt"
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
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isGenerating 
                ? "Generating..." 
                : activePage && activePage.path !== '/' 
                  ? `Describe changes for ${activePage.name}...` 
                  : "Describe your website in detail..."
            }
            className="min-h-[44px] max-h-[160px] resize-none bg-background border-border/60 focus:border-primary/50 text-sm placeholder:text-muted-foreground/60 rounded-xl"
            disabled={isGenerating}
          />
          
          {isGenerating ? (
            <Button 
              onClick={onStop}
              size="icon"
              variant="destructive"
              className="h-10 w-10 shrink-0 rounded-xl"
              title="Stop generation"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-primary to-purple-500 text-white shadow-lg hover:opacity-90 transition-opacity"
              disabled={!input.trim() && files.length === 0}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Keyboard hint */}
        {!isGenerating && input.trim() && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> to send
          </p>
        )}
      </div>
    </div>
  );
};
