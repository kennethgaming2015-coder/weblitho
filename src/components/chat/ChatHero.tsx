import { useState, useRef } from "react";
import { Send, Paperclip, Settings2, Sparkles, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ModelType } from "@/components/builder/SettingsDialog";

interface ChatHeroProps {
  onSubmit: (message: string, files?: File[], model?: ModelType) => void;
  isGenerating?: boolean;
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
}

export const ChatHero = ({ 
  onSubmit, 
  isGenerating = false,
  selectedModel,
  onModelChange 
}: ChatHeroProps) => {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="relative min-h-screen hero-gradient flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-3xl mx-auto space-y-8">
        {/* New Badge */}
        <div className="flex justify-center animate-fade-in">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5">
            <Sparkles className="h-3 w-3 mr-2" />
            AI-Powered Builder
          </Badge>
        </div>

        {/* Hero Title */}
        <div className="text-center space-y-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
            Build something with{" "}
            <span className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              QubeAI
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/70">
            Create apps, websites, and smart contracts by chatting with AI
          </p>
        </div>

        {/* Chat Input */}
        <div className="animate-scale-in" style={{ animationDelay: "0.2s" }}>
          <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
            {/* Model Selector Dropdown */}
            {showModelSelector && (
              <div className="p-4 border-b border-white/10 bg-[#0d0d0d] animate-fade-in">
                <label className="text-sm font-medium mb-2 block text-white/80">Select AI Model</label>
                <Select value={selectedModel} onValueChange={(value) => onModelChange(value as ModelType)}>
                  <SelectTrigger className="w-full bg-[#1a1a1a] border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google/gemini-2.5-flash">QubeAI 2.5 Flash (Recommended)</SelectItem>
                    <SelectItem value="google/gemini-2.5-pro">QubeAI 2.5 Pro (Premium)</SelectItem>
                    <SelectItem value="google/gemini-2.5-flash-lite">QubeAI 2.5 Flash Lite (Fast)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* File Attachments */}
            {files.length > 0 && (
              <div className="p-4 border-b border-white/10 flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white"
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

            {/* Input Area */}
            <div className="p-4">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask QubeAI to create an internal tool that..."
                className="min-h-[100px] resize-none bg-transparent border-none text-white placeholder:text-white/40 focus-visible:ring-0 text-lg"
                disabled={isGenerating}
              />
            </div>

            {/* Action Buttons */}
            <div className="px-4 pb-4 flex items-center justify-between">
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
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attach
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModelSelector(!showModelSelector)}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  Model
                </Button>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isGenerating || (!input.trim() && files.length === 0)}
                className="rounded-full bg-white text-black hover:bg-white/90"
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="flex flex-wrap gap-3 justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
          {[
            "Create a modern landing page",
            "Build an ERC20 token",
            "Design a dashboard",
            "Generate NFT contract"
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => onSubmit(prompt, [], selectedModel)}
              disabled={isGenerating}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 transition-all text-sm backdrop-blur"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
