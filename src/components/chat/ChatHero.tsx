import { useState, useRef } from "react";
import { Send, Paperclip, FileText, X, Wand2, Globe, Layout, Box, Database, ArrowRight, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ModelType, modelConfig, canAccessModel, isPaidPlan } from "@/components/builder/SettingsDialog";
import { TemplateGallery } from "@/components/builder/TemplateGallery";
import { ImageUploadPanel } from "@/components/builder/ImageUploadPanel";
import { useToast } from "@/hooks/use-toast";

interface ChatHeroProps {
  onSubmit: (message: string, files?: File[], model?: ModelType) => void;
  isGenerating?: boolean;
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
  userPlan?: string;
}

export const ChatHero = ({ 
  onSubmit, 
  isGenerating = false,
  selectedModel,
  onModelChange,
  userPlan 
}: ChatHeroProps) => {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  const templates = [
    { icon: Globe, title: "Landing Page", desc: "SaaS & Startups", prompt: "Create a modern SaaS landing page with hero, features grid, pricing, and footer. Use glassmorphism and smooth animations.", gradient: "from-primary to-purple-500" },
    { icon: Layout, title: "Dashboard", desc: "Analytics & Admin", prompt: "Build an admin dashboard with sidebar, stats cards, charts, and data tables. Modern dark theme.", gradient: "from-accent to-teal-400" },
    { icon: Box, title: "Portfolio", desc: "Creative Work", prompt: "Design a creative portfolio with project gallery, about section, and contact form. Minimalist style.", gradient: "from-pink-500 to-rose-500" },
    { icon: Database, title: "E-commerce", desc: "Product Pages", prompt: "Create an e-commerce product page with image gallery, cart, reviews, and related products.", gradient: "from-amber-500 to-orange-500" },
  ];

  const useTemplate = (template: typeof templates[0]) => {
    setInput(template.prompt);
    toast({ title: "Template loaded", description: `${template.title} ready to customize` });
  };

  const handleTemplateSelect = (prompt: string) => {
    setInput(prompt);
    toast({ title: "Template loaded", description: "Ready to customize" });
  };

  const handleInsertImage = (url: string) => {
    setInput(prev => prev + (prev ? '\n\n' : '') + `Use this image: ${url}`);
  };

  const currentModel = modelConfig[selectedModel] || modelConfig["deepseek-free"];

  return (
    <div className="relative min-h-screen hero-mesh noise overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-32 left-[10%] w-[600px] h-[600px] bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-20 right-[5%] w-[500px] h-[500px] bg-gradient-to-br from-accent/8 to-transparent rounded-full blur-[100px] animate-float-slow delay-300" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-primary/5 rounded-full animate-spin-slow" />
      </div>
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <div className="relative pt-28 pb-20 px-4">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Badge */}
          <div className="flex justify-center animate-slide-up">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full glass gradient-border">
              <div className="relative">
                <div className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
                <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-accent animate-ping" />
              </div>
              <span className="text-sm font-medium text-foreground">AI Website Builder</span>
              <span className="px-2 py-0.5 text-xs font-semibold bg-primary/15 text-primary rounded-full">v2.0</span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-6 animate-slide-up delay-100">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-foreground leading-[1.1] tracking-tight text-balance">
              Build with{" "}
              <span className="gradient-text">Weblitho</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
              Create stunning websites in seconds. 
              <span className="text-foreground font-medium"> Just describe what you want.</span>
            </p>
          </div>

          {/* Quick Templates + Buttons Row */}
          <div className="flex flex-col lg:flex-row items-stretch gap-4 animate-slide-up delay-200">
            {/* Quick template cards */}
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {templates.map((t, i) => (
                <Card
                  key={i}
                  onClick={() => useTemplate(t)}
                  className="group p-4 bg-card/80 hover:bg-card border-border/60 hover:border-primary/40 cursor-pointer transition-all duration-300 card-hover"
                >
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${t.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <t.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground text-sm mb-0.5">{t.title}</h3>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </Card>
              ))}
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-row lg:flex-col gap-2 lg:w-auto">
              <TemplateGallery onSelectTemplate={handleTemplateSelect} />
              <ImageUploadPanel onInsertImage={handleInsertImage} />
            </div>
          </div>

          {/* Main Input */}
          <div className="animate-scale-in delay-300">
            <div className="glass-strong rounded-3xl overflow-hidden shadow-soft-lg">
              {/* Model Bar */}
              <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Wand2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Model:</span>
                    <Select 
                      value={selectedModel} 
                      onValueChange={(v) => {
                        const modelId = v as ModelType;
                        if (!canAccessModel(modelId, userPlan)) {
                          toast({
                            title: "Upgrade Required",
                            description: "This model requires a Pro or Business plan",
                            variant: "destructive",
                          });
                          return;
                        }
                        onModelChange(modelId);
                      }}
                    >
                      <SelectTrigger className="h-9 w-[200px] bg-background/80 border-border/60 text-sm font-medium rounded-xl">
                        <SelectValue>{currentModel.name}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {(Object.entries(modelConfig) as [ModelType, typeof modelConfig[ModelType]][]).map(([id, cfg]) => {
                          const isLocked = cfg.requiresPaid && !isPaidPlan(userPlan);
                          return (
                            <SelectItem 
                              key={id} 
                              value={id}
                              disabled={isLocked}
                              className={`rounded-lg ${isLocked ? "opacity-50" : ""}`}
                            >
                              <div className="flex items-center gap-2">
                                <span>{cfg.name}</span>
                                {cfg.badge && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cfg.badgeColor}`}>
                                    {cfg.badge}
                                  </span>
                                )}
                                {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-xs font-medium text-accent">
                  <Sparkles className="h-3.5 w-3.5" />
                  Validator Active
                </div>
              </div>

              {/* Files */}
              {files.length > 0 && (
                <div className="px-6 py-3 border-b border-border/50 flex flex-wrap gap-2 bg-muted/20">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/80 border border-border/60 text-sm">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="max-w-[120px] truncate font-medium">{file.name}</span>
                      <button onClick={() => removeFile(i)} className="hover:text-destructive transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Textarea */}
              <div className="p-6">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your website in detail... Be specific about design, colors, sections, and features."
                  className="min-h-[160px] resize-none bg-transparent border-none text-foreground text-base placeholder:text-muted-foreground/60 focus-visible:ring-0 font-sans"
                  disabled={isGenerating}
                />
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 flex items-center justify-between">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isGenerating}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl"
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attach
                  </Button>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={isGenerating || (!input.trim() && files.length === 0)}
                  className="gradient-animated text-primary-foreground font-semibold px-8 py-5 rounded-2xl shadow-glow group text-base"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Generate
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="text-center animate-fade-in delay-500">
            <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
              <span className="text-lg">💡</span>
              Be specific about colors, layout, animations, and features for best results
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};