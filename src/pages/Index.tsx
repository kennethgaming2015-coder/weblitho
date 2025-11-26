import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChatHero } from "@/components/chat/ChatHero";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { ModelType } from "@/components/builder/SettingsDialog";
import { Moon, Sun, Sparkles, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

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
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<ModelType>(
    (localStorage.getItem("ai_model") as ModelType) || "google/gemini-2.5-flash"
  );
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [generatedContent, setGeneratedContent] = useState<{
    type: "web" | "contract";
    code: string;
    metadata?: any;
  } | null>(null);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check authentication
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user) {
    return null;
  }

  const detectIntentType = (prompt: string): "web" | "contract" => {
    const contractKeywords = [
      "contract", "solidity", "smart contract", "erc20", "erc721", "erc1155", 
      "token", "nft", "staking", "dao", "governance", "blockchain", "mint", "burn"
    ];
    const lowerPrompt = prompt.toLowerCase();
    return contractKeywords.some(keyword => lowerPrompt.includes(keyword)) ? "contract" : "web";
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setGenerationStatus("");
    toast({
      title: "Generation Stopped",
      description: "AI generation has been cancelled",
    });
  };

  const handleMessageSubmit = async (message: string, files?: File[], model?: ModelType) => {
    const userMessage = files && files.length > 0 
      ? `${message}\n\n[${files.length} file(s) attached]`
      : message;
    
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsGenerating(true);
    setGenerationStatus("Analyzing your request...");
    
    // Create new abort controller for this generation
    abortControllerRef.current = new AbortController();
    
    try {
      const intentType = detectIntentType(message);
      
      if (intentType === "contract") {
        setGenerationStatus("Generating smart contract...");
        
        // Generate smart contract
        const { data, error } = await supabase.functions.invoke("generate-contract", {
          body: {
            prompt: message,
            contractType: "auto", // Let AI decide based on prompt
            model: model || selectedModel,
          },
          signal: abortControllerRef.current.signal,
        });

        if (error) throw error;

        const assistantMessage = `Generated smart contract: **${data.contract_name}**`;
        setMessages(prev => [...prev, { role: "assistant", content: assistantMessage }]);
        setGeneratedContent({ type: "contract", code: data.solidity_code, metadata: data });
        
        setGenerationStatus("Contract generated successfully!");
        
        toast({
          title: "Contract Generated",
          description: `${data.contract_name} is ready for deployment`,
        });
      } else {
        setGenerationStatus("Generating web page...");
        
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
          signal: abortControllerRef.current.signal,
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

        setGenerationStatus("Streaming response...");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let streamDone = false;
        let assistantSoFar = "";

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
                // Update preview in real-time (but not chat)
                setGeneratedContent({ type: "web", code: assistantSoFar });
              }
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }
        
        // Add completion message to chat (without code)
        setMessages(prev => [...prev, { role: "assistant", content: "Generated web page successfully" }]);

        setGenerationStatus("Generation complete!");
        
        toast({
          title: "Page Generated",
          description: "Your web page is ready",
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Generation aborted by user");
        return;
      }
      
      console.error("Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `Sorry, I encountered an error: ${errorMessage}` 
      }]);
      
      setGenerationStatus("");
      
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationStatus("");
      abortControllerRef.current = null;
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
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-white/60 hover:text-white hover:bg-white/10">
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white/60 hover:text-white hover:bg-white/10">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {!isGenerating && messages.length === 0 ? (
        <ChatHero 
          onSubmit={handleMessageSubmit}
          isGenerating={isGenerating}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
        />
      ) : (
        <main className="fixed inset-0 pt-16 flex">
          {/* Chat Panel - Left Side */}
          <div className="w-[480px] border-r border-white/10 bg-[#0a0a0a] flex flex-col">
            <ChatInterface
              messages={messages}
              onSubmit={handleMessageSubmit}
              isGenerating={isGenerating}
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
            />
            
            {/* Generation Status */}
            {isGenerating && generationStatus && (
              <div className="px-4 py-3 border-t border-white/10 bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-sm text-white/70">{generationStatus}</span>
                </div>
              </div>
            )}
            
            {/* Stop Button */}
            {isGenerating && (
              <div className="px-4 py-3 border-t border-white/10">
                <Button 
                  onClick={handleStop}
                  variant="destructive"
                  className="w-full"
                  size="sm"
                >
                  Stop Generating
                </Button>
              </div>
            )}
          </div>

          {/* Preview Panel - Right Side */}
          <div className="flex-1 overflow-auto bg-[#0a0a0a]">
            {generatedContent ? (
              <div className="h-full">
                <PreviewPanel
                  code={generatedContent.code}
                  type={generatedContent.type}
                  metadata={generatedContent.metadata}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5">
                    <Sparkles className="h-6 w-6 text-white/40" />
                  </div>
                  <p className="text-sm text-white/40">Preview will appear here</p>
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
