import { useState, useEffect, useRef } from "react";
import { Monitor, Smartphone, Tablet, Code2, Eye, Copy, Download, CheckCircle, AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GenerationLoader } from "./GenerationLoader";
import { Badge } from "@/components/ui/badge";

interface ValidationResult {
  valid: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
  security: string[];
}

interface PreviewPanelProps {
  code: string;
  type?: "web";
  metadata?: any;
  isGenerating?: boolean;
  isComplete?: boolean; // New prop to track if generation is complete
  generationStatus?: string;
  generationProgress?: number;
  validation?: ValidationResult | null;
}

type ViewportSize = "mobile" | "tablet" | "desktop";

const viewportDimensions = {
  mobile: { width: "375px", height: "667px" },
  tablet: { width: "768px", height: "1024px" },
  desktop: { width: "100%", height: "100%" },
};

export const PreviewPanel = ({ 
  code, 
  isGenerating = false,
  isComplete = false, // Default to false
  generationStatus = "", 
  generationProgress = 0,
  validation 
}: PreviewPanelProps) => {
  const [viewport, setViewport] = useState<ViewportSize>("desktop");
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [iframeKey, setIframeKey] = useState(0);
  const { toast } = useToast();
  const lastCodeRef = useRef("");

  // Clean and extract HTML from code
  const cleanedHtml = cleanHtml(code);
  const hasContent = cleanedHtml.length > 100;

  // Refresh iframe when code changes significantly AFTER generation is complete
  useEffect(() => {
    if (isComplete && cleanedHtml && cleanedHtml !== lastCodeRef.current) {
      lastCodeRef.current = cleanedHtml;
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => setIframeKey(k => k + 1), 100);
      return () => clearTimeout(timer);
    }
  }, [cleanedHtml, isComplete]);

  // Show loader while generating OR when not complete yet
  if (isGenerating || (!isComplete && !hasContent)) {
    if (isGenerating) {
      return <GenerationLoader status={generationStatus} isGenerating={isGenerating} progress={generationProgress} />;
    }
    // Empty state - waiting for first generation
    return (
      <div className="h-full flex items-center justify-center bg-card/30">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20">
            <Eye className="h-8 w-8 text-primary/60" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/60">Preview Area</p>
            <p className="text-xs text-muted-foreground">Your creation will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loader until generation is truly complete (even if we have content)
  if (!isComplete && isGenerating) {
    return <GenerationLoader status={generationStatus} isGenerating={isGenerating} progress={generationProgress} />;
  }

  // Empty state when no content and not generating
  if (!hasContent && isComplete) {
    return (
      <div className="h-full flex items-center justify-center bg-card/30">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20">
            <Eye className="h-8 w-8 text-primary/60" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/60">Preview Area</p>
            <p className="text-xs text-muted-foreground">Your creation will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanedHtml);
    toast({ title: "Copied to clipboard" });
  };

  const handleDownload = () => {
    const blob = new Blob([cleanedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "index.html";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded" });
  };

  const handleOpenInNewTab = () => {
    const blob = new Blob([cleanedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const handleRefresh = () => {
    setIframeKey(k => k + 1);
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", label: "Excellent" };
    if (score >= 80) return { color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30", label: "Great" };
    if (score >= 70) return { color: "bg-amber-500/10 text-amber-400 border-amber-500/30", label: "Good" };
    return { color: "bg-red-500/10 text-red-400 border-red-500/30", label: "Needs Work" };
  };

  return (
    <div className="h-full flex flex-col bg-card/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-cyan-500 to-blue-500">
            <Eye className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Live Preview</h3>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle className="h-3 w-3" />
                Ready
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              React + Tailwind CSS
            </p>
          </div>
          
          {/* Validation Badge */}
          {validation && (
            <Badge className={`ml-2 ${getScoreBadge(validation.score).color} border`}>
              {validation.score >= 80 ? (
                <CheckCircle className="h-3 w-3 mr-1" />
              ) : (
                <AlertTriangle className="h-3 w-3 mr-1" />
              )}
              {validation.score}/100
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleRefresh} className="h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleOpenInNewTab} className="h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-xs hidden sm:inline">Open</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted">
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-xs hidden sm:inline">Copy</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload} className="h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-xs hidden sm:inline">Download</span>
          </Button>
        </div>
      </div>

      {/* Tab Controls + Viewport */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-card/30 shrink-0">
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          <Button
            variant={activeTab === "preview" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("preview")}
            className={`h-7 px-3 gap-1.5 ${activeTab === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="text-xs">Preview</span>
          </Button>
          <Button
            variant={activeTab === "code" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("code")}
            className={`h-7 px-3 gap-1.5 ${activeTab === "code" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="text-xs">Code</span>
          </Button>
        </div>

        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {(["mobile", "tablet", "desktop"] as ViewportSize[]).map((size) => {
            const icons = { mobile: Smartphone, tablet: Tablet, desktop: Monitor };
            const Icon = icons[size];
            return (
              <Button
                key={size}
                variant={viewport === size ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewport(size)}
                className={`h-7 w-7 p-0 ${viewport === size ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "preview" ? (
          <div className="h-full p-4 bg-[#0f0f0f]">
            <div className="flex items-start justify-center min-h-full">
              <div
                className="bg-white rounded-xl shadow-2xl transition-all duration-300 overflow-hidden border border-border/20"
                style={{
                  width: viewportDimensions[viewport].width,
                  height: viewport === "desktop" ? "calc(100vh - 220px)" : viewportDimensions[viewport].height,
                  maxWidth: "100%",
                }}
              >
                <iframe
                  key={iframeKey}
                  srcDoc={cleanedHtml}
                  title="Preview"
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  style={{ pointerEvents: 'auto' }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full p-4 bg-[#0f0f0f]">
            <pre className="bg-[#1a1a1a] rounded-xl p-4 overflow-auto text-xs text-foreground/80 h-full font-mono border border-border/20">
              <code>{cleanedHtml}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to clean HTML
function cleanHtml(code: string): string {
  if (!code) return "";

  let cleaned = code;

  // Remove thinking tokens (DeepSeek)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");
  
  // Remove markdown code fences
  cleaned = cleaned.replace(/```html\s*/gi, "");
  cleaned = cleaned.replace(/```typescript\s*/gi, "");
  cleaned = cleaned.replace(/```tsx\s*/gi, "");
  cleaned = cleaned.replace(/```jsx\s*/gi, "");
  cleaned = cleaned.replace(/```\s*/gi, "");
  
  // Try to extract preview from JSON output
  const previewMatch = cleaned.match(/"preview"\s*:\s*"([\s\S]*?)(?:"\s*}|\\"[\s\S]*?(?<!\\)")/);
  if (previewMatch) {
    let htmlFromJson = previewMatch[1];
    htmlFromJson = htmlFromJson.replace(/\\n/g, '\n');
    htmlFromJson = htmlFromJson.replace(/\\"/g, '"');
    htmlFromJson = htmlFromJson.replace(/\\\\/g, '\\');
    if (htmlFromJson.includes("<!DOCTYPE html>")) {
      cleaned = htmlFromJson;
    }
  }
  
  cleaned = cleaned.trim();

  // Extract HTML document
  const docMatch = cleaned.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
  if (docMatch) return docMatch[0];

  // Try without DOCTYPE
  const htmlMatch = cleaned.match(/<html[\s\S]*<\/html>/i);
  if (htmlMatch) return "<!DOCTYPE html>\n" + htmlMatch[0];

  // Return partial HTML (for streaming)
  const partialStart = cleaned.indexOf("<!DOCTYPE html>");
  if (partialStart !== -1) {
    let partial = cleaned.slice(partialStart);
    // Add closing tags if missing for preview
    if (!partial.includes("</body>")) partial += "\n</body>";
    if (!partial.includes("</html>")) partial += "\n</html>";
    return partial;
  }

  return cleaned;
}
