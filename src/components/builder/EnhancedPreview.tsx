import { useState, useRef, useEffect, useCallback } from "react";
import { PreviewToolbar } from "./PreviewToolbar";
import { ConsolePanel } from "./ConsolePanel";
import { MonacoEditor } from "./MonacoEditor";
import { GenerationLoader } from "@/components/preview/GenerationLoader";
import { Eye, CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProjectFile } from "@/hooks/useProjects";

type ViewportSize = "desktop" | "tablet" | "mobile";

interface ConsoleLog {
  id: string;
  type: "log" | "warn" | "error" | "info";
  message: string;
  timestamp: Date;
  source?: string;
}

interface ValidationResult {
  valid: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
  security: string[];
}

interface EnhancedPreviewProps {
  code: string;
  files?: ProjectFile[];
  selectedFile?: { name: string; content: string } | null;
  isGenerating?: boolean;
  isComplete?: boolean;
  generationStatus?: string;
  generationProgress?: number;
  validation?: ValidationResult | null;
  streamingPreview?: string; // Live preview during generation
}

const viewportDimensions = {
  mobile: { width: "375px", height: "667px" },
  tablet: { width: "768px", height: "1024px" },
  desktop: { width: "100%", height: "100%" },
};

export const EnhancedPreview = ({
  code,
  files = [],
  selectedFile,
  isGenerating = false,
  isComplete = false,
  generationStatus = "",
  generationProgress = 0,
  validation,
  streamingPreview,
}: EnhancedPreviewProps) => {
  const [viewport, setViewport] = useState<ViewportSize>("desktop");
  const [showSplitView, setShowSplitView] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [consoleCollapsed, setConsoleCollapsed] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [currentUrl, setCurrentUrl] = useState("/");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastCodeRef = useRef("");

  // Use streaming preview if available during generation, otherwise use final code
  const activeCode = isGenerating && streamingPreview ? streamingPreview : code;
  // Clean HTML for display
  const cleanedHtml = cleanHtml(activeCode);
  const hasContent = cleanedHtml.length > 100;

  // Refresh iframe when code changes after generation
  useEffect(() => {
    if (isComplete && cleanedHtml && cleanedHtml !== lastCodeRef.current) {
      lastCodeRef.current = cleanedHtml;
      const timer = setTimeout(() => setIframeKey((k) => k + 1), 100);
      return () => clearTimeout(timer);
    }
  }, [cleanedHtml, isComplete]);

  // Listen for messages from iframe (console, navigation, interactions)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "console") {
        const newLog: ConsoleLog = {
          id: `${Date.now()}-${Math.random()}`,
          type: event.data.level || "log",
          message: event.data.message,
          timestamp: new Date(),
          source: event.data.source,
        };
        setConsoleLogs((prev) => [...prev.slice(-99), newLog]);
      }
      
      // Handle internal navigation
      if (event.data?.type === "navigation") {
        const path = event.data.path;
        setCurrentUrl(path);
        console.log("[Preview] Navigation to:", path);
      }
      
      // Handle interactions (button clicks, etc.)
      if (event.data?.type === "interaction") {
        console.log("[Preview] Interaction:", event.data.element, event.data.text);
      }
      
      // Handle form submissions
      if (event.data?.type === "form_submit") {
        console.log("[Preview] Form submitted:", event.data.data);
        setConsoleLogs((prev) => [...prev.slice(-99), {
          id: `${Date.now()}-${Math.random()}`,
          type: "info",
          message: `Form submitted: ${JSON.stringify(event.data.data)}`,
          timestamp: new Date(),
        }]);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleRefresh = useCallback(() => {
    setIframeKey((k) => k + 1);
  }, []);

  const handleOpenExternal = useCallback(() => {
    const blob = new Blob([cleanedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }, [cleanedHtml]);

  const handleClearConsole = useCallback(() => {
    setConsoleLogs([]);
  }, []);

  const getScoreBadge = (score: number) => {
    if (score >= 90)
      return { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", label: "Excellent" };
    if (score >= 80)
      return { color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30", label: "Great" };
    if (score >= 70)
      return { color: "bg-amber-500/10 text-amber-400 border-amber-500/30", label: "Good" };
    return { color: "bg-red-500/10 text-red-400 border-red-500/30", label: "Needs Work" };
  };

  // Show generation loader ONLY when generating AND no preview available yet
  if (isGenerating && !hasContent) {
    return (
      <GenerationLoader
        status={generationStatus}
        isGenerating={isGenerating}
        progress={generationProgress}
      />
    );
  }

  // Empty state
  if (!hasContent && !isGenerating) {
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

  // Get display content
  const displayCode = selectedFile?.content || cleanedHtml;
  const displayFileName = selectedFile?.name || "index.html";

  // Interactive navigation script - intercepts clicks and handles internal navigation
  const interactiveScript = `
    <script>
      // Console interception
      ['log', 'warn', 'error', 'info'].forEach(level => {
        const original = console[level];
        console[level] = function(...args) {
          original.apply(console, args);
          try {
            parent.postMessage({
              type: 'console',
              level: level,
              message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
            }, '*');
          } catch (e) {}
        };
      });
      
      window.onerror = function(msg, url, line, col, error) {
        parent.postMessage({
          type: 'console',
          level: 'error',
          message: msg + ' at line ' + line,
          source: url
        }, '*');
      };

      // Navigation interception - make internal links work within preview
      document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link) {
          const href = link.getAttribute('href');
          
          // Handle hash links (smooth scroll)
          if (href && href.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
              parent.postMessage({ type: 'navigation', path: href }, '*');
            }
            return;
          }
          
          // Handle relative links (internal pages)
          if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
            e.preventDefault();
            parent.postMessage({ type: 'navigation', path: href }, '*');
            
            // Try to find and show the section
            const sectionId = href.replace('/', '').replace('.html', '');
            const section = document.getElementById(sectionId) || document.querySelector('[data-page="' + sectionId + '"]');
            if (section) {
              section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            return;
          }
          
          // External links - open in new tab
          if (href && href.startsWith('http')) {
            e.preventDefault();
            window.open(href, '_blank', 'noopener,noreferrer');
            return;
          }
        }
      }, true);

      // Make buttons interactive
      document.addEventListener('click', function(e) {
        const button = e.target.closest('button');
        if (button && !button.disabled) {
          // Add click feedback
          button.style.transform = 'scale(0.98)';
          setTimeout(() => { button.style.transform = ''; }, 100);
          
          // Notify parent of button click
          parent.postMessage({ 
            type: 'interaction', 
            element: 'button', 
            text: button.textContent?.trim()
          }, '*');
        }
      }, true);

      // Form submission handling
      document.addEventListener('submit', function(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        parent.postMessage({
          type: 'form_submit',
          data: data
        }, '*');
        
        // Show success feedback
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn) {
          const originalText = submitBtn.textContent;
          submitBtn.textContent = '✓ Submitted';
          submitBtn.disabled = true;
          setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
          }, 2000);
        }
      }, true);
      
      // Input focus styling
      document.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('focus', function() {
          this.style.outline = '2px solid #8b5cf6';
          this.style.outlineOffset = '2px';
        });
        input.addEventListener('blur', function() {
          this.style.outline = '';
          this.style.outlineOffset = '';
        });
      });
    </script>`;

  // Build the final iframe content with interactivity
  const buildIframeContent = (html: string): string => {
    if (html.includes('<!DOCTYPE')) {
      // Inject script after opening head tag
      return html.replace('<head>', '<head>' + interactiveScript);
    }
    // Wrap in full HTML document
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${interactiveScript}
</head>
<body>
  ${html}
</body>
</html>`;
  };

  const finalIframeContent = buildIframeContent(cleanedHtml);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] overflow-hidden relative">
      {/* Live Streaming Indicator Overlay */}
      {isGenerating && hasContent && (
        <div className="absolute top-16 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/90 to-purple-500/90 text-white text-xs font-medium shadow-lg backdrop-blur-sm animate-pulse">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </div>
          <span>Building live...</span>
          <span className="text-white/70">{generationProgress}%</span>
        </div>
      )}

      {/* Header with validation badge */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-500">
            <Eye className="h-4 w-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Live Preview</span>
            <span className={`flex items-center gap-1 text-xs ${isGenerating ? 'text-amber-400' : 'text-emerald-400'}`}>
              {isGenerating ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  Streaming
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3" />
                  Ready
                </>
              )}
            </span>
          </div>
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
      </div>

      {/* Toolbar */}
      <PreviewToolbar
        currentUrl={currentUrl}
        onUrlChange={setCurrentUrl}
        onRefresh={handleRefresh}
        viewport={viewport}
        onViewportChange={setViewport}
        showSplitView={showSplitView}
        onToggleSplitView={() => setShowSplitView(!showSplitView)}
        onOpenExternal={handleOpenExternal}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor (Split View) */}
        {showSplitView && (
          <div className="w-1/2 border-r border-border/30">
            <MonacoEditor
              content={displayCode}
              fileName={displayFileName}
              readOnly
            />
          </div>
        )}

        {/* Preview */}
        <div className={`${showSplitView ? 'w-1/2' : 'flex-1'} flex flex-col overflow-hidden`}>
          <div className="flex-1 overflow-auto p-4 bg-[#0f0f0f]">
            <div className="flex items-start justify-center min-h-full">
              <div
                className="bg-white rounded-xl shadow-2xl transition-all duration-300 overflow-hidden border border-border/20"
                style={{
                  width: viewportDimensions[viewport].width,
                  height: viewport === "desktop" ? "calc(100vh - 280px)" : viewportDimensions[viewport].height,
                  maxWidth: "100%",
                }}
              >
                <iframe
                  ref={iframeRef}
                  key={iframeKey}
                  srcDoc={finalIframeContent}
                  title="Preview"
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  style={{ pointerEvents: 'auto' }}
                />
              </div>
            </div>
          </div>

          {/* Console Panel */}
          <ConsolePanel
            logs={consoleLogs}
            isCollapsed={consoleCollapsed}
            onToggleCollapse={() => setConsoleCollapsed(!consoleCollapsed)}
            onClear={handleClearConsole}
          />
        </div>
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
    htmlFromJson = htmlFromJson.replace(/\\n/g, "\n");
    htmlFromJson = htmlFromJson.replace(/\\"/g, '"');
    htmlFromJson = htmlFromJson.replace(/\\\\/g, "\\");
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

  // Return partial HTML
  const partialStart = cleaned.indexOf("<!DOCTYPE html>");
  if (partialStart !== -1) {
    let partial = cleaned.slice(partialStart);
    if (!partial.includes("</body>")) partial += "\n</body>";
    if (!partial.includes("</html>")) partial += "\n</html>";
    return partial;
  }

  return cleaned;
}
