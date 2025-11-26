import { useState, useRef, useEffect } from "react";
import { ChatHero } from "@/components/chat/ChatHero";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ModelType } from "@/components/builder/SettingsDialog";
import { Moon, Sun, Code2, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface Page {
  id: string;
  name: string;
  path: string;
  content: string;
}

export interface Component {
  id: string;
  name: string;
  category: string;
  code: string;
}

const Index = () => {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>(
    (localStorage.getItem("ai_model") as ModelType) || "gemini-2.0-flash-exp"
  );
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [generatedContent, setGeneratedContent] = useState<{
    type: "web" | "contract";
    code: string;
    metadata?: any;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  const detectIntentType = (prompt: string): "web" | "contract" => {
    const contractKeywords = [
      "contract", "solidity", "smart contract", "erc20", "erc721", "erc1155", 
      "token", "nft", "staking", "dao", "governance", "blockchain", "mint", "burn"
    ];
    const lowerPrompt = prompt.toLowerCase();
    return contractKeywords.some(keyword => lowerPrompt.includes(keyword)) ? "contract" : "web";
  };

  const handleMessageSubmit = async (message: string, files?: File[], model?: ModelType) => {
    const userMessage = files && files.length > 0 
      ? `${message}\n\n[${files.length} file(s) attached]`
      : message;
    
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsGenerating(true);
    
    try {
      const intentType = detectIntentType(message);
      
      if (intentType === "contract") {
        // Generate smart contract
        const { data, error } = await supabase.functions.invoke("generate-contract", {
          body: {
            prompt: message,
            contractType: "auto", // Let AI decide based on prompt
            model: model || selectedModel,
          },
        });

        if (error) throw error;

        const assistantMessage = `I've generated a smart contract for you:\n\n**${data.contract_name}**\n\n${data.deployment_notes || ""}`;
        setMessages(prev => [...prev, { role: "assistant", content: assistantMessage }]);
        setGeneratedContent({ type: "contract", code: data.solidity_code, metadata: data });
        
        toast({
          title: "Contract Generated",
          description: `${data.contract_name} is ready for deployment`,
        });
      } else {
        // Generate web page - streaming
        const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-page`;
        
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            prompt: message,
            conversationHistory: messages,
            model: model || selectedModel,
          }),
        });

        if (!resp.ok) {
          if (resp.status === 429) {
            throw new Error("Rate limit exceeded. Please try again later.");
          }
          if (resp.status === 402) {
            throw new Error("Payment required. Please add credits to your workspace.");
          }
          throw new Error("Failed to generate content");
        }

        if (!resp.body) throw new Error("No response body");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let streamDone = false;
        let assistantSoFar = "";

        // Add empty assistant message
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              streamDone = true;
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                assistantSoFar += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: assistantSoFar
                  };
                  return newMessages;
                });
              }
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        setGeneratedContent({ type: "web", code: assistantSoFar });
        
        toast({
          title: "Page Generated",
          description: "Your web page is ready",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `Sorry, I encountered an error: ${errorMessage}` 
      }]);
      
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleModelChange = (model: ModelType) => {
    setSelectedModel(model);
    localStorage.setItem("ai_model", model);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <span className="font-bold text-lg text-white">QubeAI</span>
          </div>
          
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-white/60 hover:text-white hover:bg-white/10">
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      {messages.length === 0 ? (
        <ChatHero 
          onSubmit={handleMessageSubmit}
          isGenerating={isGenerating}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
        />
      ) : (
        <main className="pt-16">
          <div className="container mx-auto px-4 py-8">
            <ChatInterface
              messages={messages}
              onSubmit={handleMessageSubmit}
              isGenerating={isGenerating}
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
            />
            
            {generatedContent && (
              <div className="mt-8 max-w-4xl mx-auto">
                <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {generatedContent.type === "web" ? (
                        <Code2 className="h-5 w-5 text-primary" />
                      ) : (
                        <FileCode className="h-5 w-5 text-primary" />
                      )}
                      <h3 className="text-lg font-semibold text-white">
                        {generatedContent.type === "web" ? "Generated Web Page" : "Generated Smart Contract"}
                      </h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedContent.code);
                        toast({ title: "Copied to clipboard" });
                      }}
                      className="border-white/10 text-white hover:bg-white/10"
                    >
                      Copy Code
                    </Button>
                  </div>
                  <pre className="bg-[#0d0d0d] rounded-lg p-4 overflow-x-auto text-sm text-white/80 border border-white/5">
                    <code>{generatedContent.code}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
};

export default Index;
