import { useState, useRef } from "react";
import { Send, Paperclip, Settings2, Sparkles, FileText, X, Wand2, Image as ImageIcon, Code, Palette, Zap, ShoppingCart, Layout, FileCode } from "lucide-react";
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
import { Card } from "@/components/ui/card";
import { ModelType } from "@/components/builder/SettingsDialog";
import { useToast } from "@/hooks/use-toast";

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [designStyle, setDesignStyle] = useState("modern");
  const [colorScheme, setColorScheme] = useState("auto");
  const [includeAnimations, setIncludeAnimations] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSubmit = () => {
    if ((input.trim() || files.length > 0) && !isGenerating) {
      let enhancedPrompt = input;
      
      // Add design preferences to prompt
      if (showAdvanced) {
        enhancedPrompt += `\n\nDesign preferences: ${designStyle} style, ${colorScheme} color scheme${includeAnimations ? ", include smooth animations" : ""}`;
      }
      
      onSubmit(enhancedPrompt, files, selectedModel);
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

  const promptTemplates = [
    {
      icon: Sparkles,
      title: "Landing Page",
      description: "Modern SaaS landing page",
      prompt: "Create a modern SaaS landing page with hero section, features grid, pricing table, testimonials, and footer. Use gradient backgrounds and smooth animations.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Layout,
      title: "Dashboard",
      description: "Admin dashboard UI",
      prompt: "Build a complete admin dashboard with sidebar navigation, stats cards, data tables, charts, and dark mode support. Modern and clean design.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: ImageIcon,
      title: "Portfolio",
      description: "Creative portfolio site",
      prompt: "Design a creative portfolio website with image gallery, project showcases, about section, and contact form. Elegant and minimalist style.",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: ShoppingCart,
      title: "E-commerce",
      description: "Product store page",
      prompt: "Create an e-commerce product page with image carousel, add to cart button, product details, reviews section, and related products. Modern shopping experience.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: FileCode,
      title: "ERC20 Token",
      description: "Smart contract token",
      prompt: "Create an ERC20 token smart contract with mint, burn, and pause functions. Include transfer restrictions and ownership controls.",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: Code,
      title: "NFT Collection",
      description: "ERC721 contract",
      prompt: "Build an ERC721 NFT collection contract with minting function, royalties, whitelist, and reveal mechanism.",
      color: "from-indigo-500 to-purple-500"
    }
  ];

  const useTemplate = (template: typeof promptTemplates[0]) => {
    setInput(template.prompt);
    toast({
      title: "Template loaded",
      description: `${template.title} template ready to customize`,
    });
  };

  return (
    <div className="relative min-h-screen hero-gradient flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-6xl mx-auto space-y-8">
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

        {/* Quick Templates */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          {promptTemplates.map((template, index) => {
            const Icon = template.icon;
            return (
              <Card
                key={index}
                onClick={() => useTemplate(template)}
                className="p-3 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group"
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-0.5">{template.title}</h3>
                <p className="text-xs text-white/60 leading-tight">{template.description}</p>
              </Card>
            );
          })}
        </div>

        {/* Chat Input */}
        <div className="animate-scale-in" style={{ animationDelay: "0.2s" }}>
          <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
            {/* Model Selector & Advanced Options Bar */}
            <div className="p-4 border-b border-white/10 bg-[#0d0d0d] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Settings2 className="h-4 w-4 text-white/40" />
                <span className="text-xs text-white/60">Model:</span>
                <Select value={selectedModel} onValueChange={(value) => onModelChange(value as ModelType)}>
                  <SelectTrigger className="h-8 w-[220px] bg-white/5 border-white/10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google/gemini-2.5-flash">QubeAI 2.5 Flash</SelectItem>
                    <SelectItem value="google/gemini-2.5-pro">QubeAI 2.5 Pro</SelectItem>
                    <SelectItem value="google/gemini-2.5-flash-lite">QubeAI 2.5 Flash Lite</SelectItem>
                    <SelectItem value="x-ai/grok-4.1-fast:free">Grok 4.1 Fast</SelectItem>
                    <SelectItem value="deepseek/deepseek-r1:free">DeepSeek R1</SelectItem>
                    <SelectItem value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-white/60 hover:text-white hover:bg-white/10 h-8"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {showAdvanced ? "Hide" : "Show"} Options
              </Button>
            </div>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="p-4 border-b border-white/10 bg-[#0d0d0d] animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-white/60 flex items-center gap-2">
                      <Palette className="h-3 w-3" />
                      Design Style
                    </label>
                    <Select value={designStyle} onValueChange={setDesignStyle}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modern">Modern</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="bold">Bold & Vibrant</SelectItem>
                        <SelectItem value="elegant">Elegant</SelectItem>
                        <SelectItem value="playful">Playful</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                        <SelectItem value="brutalist">Brutalist</SelectItem>
                        <SelectItem value="glassmorphism">Glassmorphism</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs text-white/60 flex items-center gap-2">
                      <Palette className="h-3 w-3" />
                      Color Scheme
                    </label>
                    <Select value={colorScheme} onValueChange={setColorScheme}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (AI Choice)</SelectItem>
                        <SelectItem value="blue">Blue</SelectItem>
                        <SelectItem value="purple">Purple</SelectItem>
                        <SelectItem value="green">Green</SelectItem>
                        <SelectItem value="orange">Orange</SelectItem>
                        <SelectItem value="pink">Pink</SelectItem>
                        <SelectItem value="red">Red</SelectItem>
                        <SelectItem value="monochrome">Monochrome</SelectItem>
                        <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                        <SelectItem value="pastel">Pastel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/60 flex items-center gap-2">
                      <Zap className="h-3 w-3" />
                      Animations
                    </label>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-sm h-9 ${includeAnimations ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-white/60'}`}
                      onClick={() => setIncludeAnimations(!includeAnimations)}
                    >
                      {includeAnimations ? 'Enabled ✓' : 'Disabled'}
                    </Button>
                  </div>
                </div>
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
                placeholder="Describe what you want to build in detail... Include colors, layout, features, and any specific requirements."
                className="min-h-[120px] resize-none bg-transparent border-none text-white placeholder:text-white/40 focus-visible:ring-0 text-base leading-relaxed"
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
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isGenerating || (!input.trim() && files.length === 0)}
                className="rounded-full bg-white text-black hover:bg-white/90 px-6"
                size="default"
              >
                <Send className="h-4 w-4 mr-2" />
                Generate
              </Button>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="text-center space-y-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <p className="text-sm text-white/40">
            💡 Tip: Be specific! Mention colors, layout style, animations, and any specific features you want
          </p>
        </div>
      </div>
    </div>
  );
};
