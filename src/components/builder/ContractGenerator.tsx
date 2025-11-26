import { useState } from "react";
import { Code2, Sparkles, Loader2, Copy, Download, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

interface ContractData {
  contract_name: string;
  solidity_code: string;
  abi: string;
  constructor_params: string[];
  deployment_notes?: string;
  security_notes?: string;
}

interface ContractGeneratorProps {
  model: string;
}

export const ContractGenerator = ({ model }: ContractGeneratorProps) => {
  const [prompt, setPrompt] = useState("");
  const [contractType, setContractType] = useState<string>("ERC20");
  const [isGenerating, setIsGenerating] = useState(false);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const contractTypes = [
    { value: "ERC20", label: "ERC20 Token", description: "Fungible tokens (coins)" },
    { value: "ERC721", label: "ERC721 NFT", description: "Non-fungible tokens" },
    { value: "ERC1155", label: "ERC1155 Multi-Token", description: "Gaming/Metaverse assets" },
    { value: "Staking", label: "Staking Pool", description: "Token staking with rewards" },
    { value: "DAO", label: "DAO Governance", description: "Voting and proposals" },
    { value: "Subscription", label: "Subscription/Streaming", description: "Recurring payments" },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please describe what contract you want to create",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setContractData(null);

    try {
      const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-contract`;
      const response = await fetch(GENERATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt, contractType, model }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to generate contract" }));
        throw new Error(errorData.error || "Failed to generate contract");
      }

      const data = await response.json();
      setContractData(data);

      toast({
        title: "Contract Generated!",
        description: `${data.contract_name} is ready for review`,
      });
    } catch (error) {
      console.error("Error generating contract:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleDownload = () => {
    if (!contractData) return;

    const blob = new Blob([contractData.solidity_code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${contractData.contract_name}.sol`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded!",
      description: `${contractData.contract_name}.sol saved`,
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-editor-bg overflow-hidden">
      <div className="h-14 border-b border-border/50 bg-card/30 backdrop-blur-xl flex items-center px-6">
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">Smart Contract Generator</h3>
            <p className="text-xs text-muted-foreground">Qubetics Layer 1 (Chain ID: 9030)</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Card className="p-6 space-y-6 border-border/50">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Contract Type</Label>
              <Select value={contractType} onValueChange={setContractType}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col items-start gap-1 py-1">
                        <span className="font-medium">{type.label}</span>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Contract Description</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: Create a mintable ERC20 token called 'QubeToken' with symbol 'QUBE', 18 decimals, and a max supply of 1 million tokens..."
                className="min-h-[120px] bg-background/50"
                disabled={isGenerating}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full shadow-glow gap-2"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Contract...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generate Smart Contract
                </>
              )}
            </Button>
          </div>
        </Card>

        {contractData && (
          <div className="space-y-4 animate-slide-up">
            <Card className="p-6 border-primary/20 bg-gradient-accent">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">{contractData.contract_name}</h3>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(contractData.solidity_code, "Contract code")}
                    className="gap-2"
                  >
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>

              {contractData.deployment_notes && (
                <div className="mb-4 p-4 bg-background/50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">Deployment Notes</h4>
                  <p className="text-sm text-muted-foreground">{contractData.deployment_notes}</p>
                </div>
              )}

              {contractData.security_notes && (
                <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2 text-amber-600 dark:text-amber-400">Security Notes</h4>
                  <p className="text-sm text-muted-foreground">{contractData.security_notes}</p>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">Solidity Code</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(contractData.solidity_code, "Code")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <pre className="bg-background/50 p-4 rounded-lg overflow-x-auto text-xs">
                <code>{contractData.solidity_code}</code>
              </pre>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">Contract ABI</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(contractData.abi, "ABI")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <pre className="bg-background/50 p-4 rounded-lg overflow-x-auto text-xs">
                <code>{JSON.stringify(JSON.parse(contractData.abi), null, 2)}</code>
              </pre>
            </Card>

            {contractData.constructor_params && contractData.constructor_params.length > 0 && (
              <Card className="p-6">
                <h4 className="font-semibold mb-4">Constructor Parameters</h4>
                <ul className="space-y-2">
                  {contractData.constructor_params.map((param, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-mono">#{index + 1}</span>
                      <span className="text-muted-foreground">{param}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
