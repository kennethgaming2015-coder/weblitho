import { useState } from "react";
import { Monitor, Smartphone, Tablet, Code2, Eye, Copy, Download, Layers, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ContractInteraction } from "@/components/web3/ContractInteraction";
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
  type: "web" | "contract";
  metadata?: any;
  isGenerating?: boolean;
  generationStatus?: string;
  validation?: ValidationResult | null;
}

type ViewportSize = "mobile" | "tablet" | "desktop";

const viewportDimensions = {
  mobile: { width: "375px", height: "667px" },
  tablet: { width: "768px", height: "1024px" },
  desktop: { width: "100%", height: "100%" },
};

export const PreviewPanel = ({ code, type, metadata, isGenerating = false, generationStatus = "", validation }: PreviewPanelProps) => {
  const [viewport, setViewport] = useState<ViewportSize>("desktop");
  const { toast } = useToast();

  // Show loading screen when generating
  if (isGenerating && (!code || code.length < 500)) {
    return <GenerationLoader status={generationStatus} isGenerating={isGenerating} />;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied to clipboard" });
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: type === "web" ? "text/html" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = type === "web" ? "index.html" : `${metadata?.contract_name || "contract"}.sol`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded successfully" });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400 bg-green-500/10 border-green-500/30";
    if (score >= 60) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
    return "text-red-400 bg-red-500/10 border-red-500/30";
  };

  return (
    <div className="h-full flex flex-col bg-[#0d0d0d] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[#0d0d0d]/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          {type === "web" ? (
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Eye className="h-4 w-4 text-white" />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Code2 className="h-4 w-4 text-white" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-white">
              {type === "web" ? "Generated Website" : metadata?.contract_name || "Smart Contract"}
            </h3>
            <p className="text-xs text-white/50">
              {type === "web" ? "React + Tailwind CSS" : "Solidity contract"}
            </p>
          </div>
          {/* Validation Badge */}
          {validation && (
            <Badge className={`ml-2 ${getScoreColor(validation.score)} border`}>
              {validation.score >= 80 ? (
                <CheckCircle className="h-3 w-3 mr-1" />
              ) : (
                <AlertTriangle className="h-3 w-3 mr-1" />
              )}
              Score: {validation.score}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/10"
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-xs">Copy</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-xs">Download</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      {type === "web" ? (
        <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-[#0d0d0d]/30 shrink-0">
            <TabsList className="bg-white/5 h-8">
              <TabsTrigger value="preview" className="data-[state=active]:bg-white/10 text-xs">
                <Eye className="h-3 w-3 mr-1.5" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="code" className="data-[state=active]:bg-white/10 text-xs">
                <Code2 className="h-3 w-3 mr-1.5" />
                Code
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-1">
              <Button
                variant={viewport === "mobile" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewport("mobile")}
                className={`h-7 w-7 p-0 ${viewport === "mobile" ? "bg-white/10" : "text-white/60 hover:text-white hover:bg-white/10"}`}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewport === "tablet" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewport("tablet")}
                className={`h-7 w-7 p-0 ${viewport === "tablet" ? "bg-white/10" : "text-white/60 hover:text-white hover:bg-white/10"}`}
              >
                <Tablet className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewport === "desktop" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewport("desktop")}
                className={`h-7 w-7 p-0 ${viewport === "desktop" ? "bg-white/10" : "text-white/60 hover:text-white hover:bg-white/10"}`}
              >
                <Monitor className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <TabsContent value="preview" className="flex-1 bg-[#0d0d0d] m-0 overflow-auto p-0">
            <div className="flex items-start justify-center min-h-full p-4">
              <div
                className="bg-white rounded-lg shadow-2xl transition-all duration-300 overflow-hidden border border-white/10"
                style={{
                  width: viewportDimensions[viewport].width,
                  height: viewport === "desktop" ? "calc(100vh - 180px)" : viewportDimensions[viewport].height,
                  maxWidth: "100%",
                }}
              >
                <iframe
                  srcDoc={code}
                  title="Preview"
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="code" className="flex-1 m-0 overflow-auto p-4">
            <pre className="bg-[#0d0d0d] rounded-lg p-4 overflow-x-auto text-xs text-white/80 border border-white/5 h-full scrollbar-thin">
              <code>{code}</code>
            </pre>
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="code" className="w-full">
          <div className="flex items-center px-4 py-2 border-b border-white/10 bg-[#0d0d0d]">
            <TabsList className="bg-white/5">
              <TabsTrigger value="code" className="data-[state=active]:bg-white/10">
                <Code2 className="h-4 w-4 mr-2" />
                Code
              </TabsTrigger>
              <TabsTrigger value="interact" className="data-[state=active]:bg-white/10">
                <Layers className="h-4 w-4 mr-2" />
                Interact
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="code" className="p-6 m-0">
            {metadata?.deployment_notes && (
              <div className="mb-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                <h4 className="text-sm font-semibold text-white mb-2">Deployment Notes</h4>
                <p className="text-sm text-white/70">{metadata.deployment_notes}</p>
              </div>
            )}
            
            {metadata?.security_notes && (
              <div className="mb-4 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <h4 className="text-sm font-semibold text-white mb-2">Security Notes</h4>
                <p className="text-sm text-white/70">{metadata.security_notes}</p>
              </div>
            )}

            <pre className="bg-[#0d0d0d] rounded-lg p-4 overflow-x-auto text-sm text-white/80 border border-white/5 max-h-[600px] overflow-y-auto scrollbar-thin">
              <code>{code}</code>
            </pre>

            {metadata?.abi && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-white mb-2">ABI</h4>
                <pre className="bg-[#0d0d0d] rounded-lg p-4 overflow-x-auto text-sm text-white/80 border border-white/5 max-h-[300px] overflow-y-auto scrollbar-thin">
                  <code>{JSON.stringify(metadata.abi, null, 2)}</code>
                </pre>
              </div>
            )}
          </TabsContent>

          <TabsContent value="interact" className="p-6 m-0">
            <ContractInteraction 
              initialAbi={metadata?.abi || ''} 
              initialAddress=""
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
