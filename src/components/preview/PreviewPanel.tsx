import { useState } from "react";
import { Monitor, Smartphone, Tablet, Code2, Eye, Copy, Download, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ContractInteraction } from "@/components/web3/ContractInteraction";

interface PreviewPanelProps {
  code: string;
  type: "web" | "contract";
  metadata?: any;
}

type ViewportSize = "mobile" | "tablet" | "desktop";

const viewportDimensions = {
  mobile: { width: "375px", height: "667px" },
  tablet: { width: "768px", height: "1024px" },
  desktop: { width: "100%", height: "100%" },
};

export const PreviewPanel = ({ code, type, metadata }: PreviewPanelProps) => {
  const [viewport, setViewport] = useState<ViewportSize>("desktop");
  const { toast } = useToast();

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

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0d0d0d]">
        <div className="flex items-center gap-2">
          {type === "web" ? (
            <Eye className="h-5 w-5 text-primary" />
          ) : (
            <Code2 className="h-5 w-5 text-primary" />
          )}
          <h3 className="text-lg font-semibold text-white">
            {type === "web" ? "Generated Web Page" : metadata?.contract_name || "Smart Contract"}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Content */}
      {type === "web" ? (
        <Tabs defaultValue="preview" className="w-full">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#0d0d0d]">
            <TabsList className="bg-white/5">
              <TabsTrigger value="preview" className="data-[state=active]:bg-white/10">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="code" className="data-[state=active]:bg-white/10">
                <Code2 className="h-4 w-4 mr-2" />
                Code
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button
                variant={viewport === "mobile" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewport("mobile")}
                className={viewport === "mobile" ? "" : "text-white/60 hover:text-white hover:bg-white/10"}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
              <Button
                variant={viewport === "tablet" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewport("tablet")}
                className={viewport === "tablet" ? "" : "text-white/60 hover:text-white hover:bg-white/10"}
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button
                variant={viewport === "desktop" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewport("desktop")}
                className={viewport === "desktop" ? "" : "text-white/60 hover:text-white hover:bg-white/10"}
              >
                <Monitor className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="preview" className="p-6 bg-[#0d0d0d] m-0">
            <div className="flex items-center justify-center min-h-[600px]">
              <div
                className="bg-white rounded-lg shadow-2xl transition-all duration-300 overflow-hidden"
                style={{
                  width: viewportDimensions[viewport].width,
                  height: viewportDimensions[viewport].height,
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

          <TabsContent value="code" className="p-6 m-0">
            <pre className="bg-[#0d0d0d] rounded-lg p-4 overflow-x-auto text-sm text-white/80 border border-white/5 max-h-[600px] overflow-y-auto scrollbar-thin">
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
