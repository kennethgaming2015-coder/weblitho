import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChatHero } from "@/components/chat/ChatHero";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { ModelType } from "@/components/builder/SettingsDialog";
import { Moon, Sun, Sparkles, LogOut, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

interface ValidationResult {
  valid: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
  security: string[];
}

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>(() => {
    const saved = localStorage.getItem("qubeai_messages");
    return saved ? JSON.parse(saved) : [];
  });
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
  } | null>(() => {
    const saved = localStorage.getItem("qubeai_generated_content");
    return saved ? JSON.parse(saved) : null;
  });
  const [validation, setValidation] = useState<ValidationResult | null>(null);
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

  // Persist messages to localStorage
  useEffect(() => {
    localStorage.setItem("qubeai_messages", JSON.stringify(messages));
  }, [messages]);

  // Persist generated content to localStorage
  useEffect(() => {
    if (generatedContent) {
      localStorage.setItem("qubeai_generated_content", JSON.stringify(generatedContent));
    }
  }, [generatedContent]);

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

  const handleClearHistory = () => {
    setMessages([]);
    setGeneratedContent(null);
    setValidation(null);
    localStorage.removeItem("qubeai_messages");
    localStorage.removeItem("qubeai_generated_content");
    toast({
      title: "History cleared",
      description: "All chat history and generated content have been cleared",
    });
  };

  const handleNewProject = () => {
    handleClearHistory();
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
        setGenerationStatus("Analyzing your request...");
        
        // Generate web page - streaming
        const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-page`;
        
        // Include current code for modifications
        const currentCode = generatedContent?.type === "web" ? generatedContent.code : null;
        
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            prompt: message,
            conversationHistory: messages,
            currentCode, // Pass current code for modifications
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

        setGenerationStatus("Planning component structure...");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let streamDone = false;
        let assistantSoFar = "";
        let chunkCount = 0;

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
                chunkCount++;
                
                // Update status based on content progress
                if (chunkCount < 10) {
                  setGenerationStatus("Planning component structure...");
                } else if (chunkCount < 30) {
                  setGenerationStatus("Writing React components...");
                } else if (chunkCount < 60) {
                  setGenerationStatus("Styling with Tailwind CSS...");
                } else {
                  setGenerationStatus("Finalizing your website...");
                }
                
                // Update preview in real-time
                setGeneratedContent({ type: "web", code: assistantSoFar });
              }
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Final update with complete HTML
        setGeneratedContent({ type: "web", code: assistantSoFar });
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: "Generated beautiful website successfully ✨" 
        }]);

        setGenerationStatus("Validating code quality...");
        
        // Run validation with KatCoder Pro
        try {
          const validationResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-code`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ code: assistantSoFar }),
          });
          
          if (validationResp.ok) {
            const validationResult = await validationResp.json();
            setValidation(validationResult);
            
            if (validationResult.score >= 80) {
              toast({
                title: "✅ High Quality Code",
                description: `Validation score: ${validationResult.score}/100`,
              });
            } else if (validationResult.score >= 60) {
              toast({
                title: "⚠️ Good Code with Suggestions",
                description: `Validation score: ${validationResult.score}/100`,
              });
            }
          }
        } catch (validationError) {
          console.log("Validation skipped:", validationError);
        }

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
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">Q</span>
              </div>
              <span className="font-bold text-base text-white">QubeAI</span>
            </div>
            
            {messages.length > 0 && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleNewProject}
                  className="text-white/60 hover:text-white hover:bg-white/10 h-8"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-white/60 hover:text-white hover:bg-white/10 h-8"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-[#1a1a1a] border-white/10">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Clear chat history?</AlertDialogTitle>
                      <AlertDialogDescription className="text-white/60">
                        This will delete all messages and generated content. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearHistory} className="bg-destructive hover:bg-destructive/90">
                        Clear History
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10">
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10">
              <LogOut className="h-4 w-4" />
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
        <main className="fixed inset-0 pt-14 flex bg-gradient-to-b from-[#0a0a0a] to-[#0d0d0d]">
          {/* Chat Panel - Left Side */}
          <div className="w-[420px] border-r border-white/10 bg-[#0a0a0a]/50 backdrop-blur-xl flex flex-col animate-slide-in-right">
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-white/5 bg-gradient-to-r from-orange-500/10 to-purple-600/10">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 animate-pulse" />
                <span className="text-sm font-medium text-white">AI Assistant</span>
              </div>
            </div>

            <ChatInterface
              messages={messages}
              onSubmit={handleMessageSubmit}
              isGenerating={isGenerating}
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
            />
            
            {/* Generation Status */}
            {isGenerating && generationStatus && (
              <div className="px-4 py-3 border-t border-white/10 bg-gradient-to-r from-orange-500/5 to-purple-600/5 backdrop-blur-xl animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                    <div className="absolute inset-0 h-2 w-2 rounded-full bg-orange-500 animate-ping" />
                  </div>
                  <span className="text-sm text-white/80 font-medium">{generationStatus}</span>
                </div>
              </div>
            )}
            
            {/* Stop Button */}
            {isGenerating && (
              <div className="px-4 py-3 border-t border-white/10 bg-[#0a0a0a]/50 animate-fade-in">
                <Button 
                  onClick={handleStop}
                  variant="destructive"
                  className="w-full shadow-lg shadow-destructive/20"
                  size="sm"
                >
                  Stop Generating
                </Button>
              </div>
            )}
          </div>

          {/* Preview Panel - Right Side */}
          <div className="flex-1 overflow-hidden bg-[#0d0d0d]">
            {generatedContent || isGenerating ? (
              <div className="h-full animate-fade-in">
                <PreviewPanel
                  code={generatedContent?.code || ""}
                  type={generatedContent?.type || "web"}
                  metadata={generatedContent?.metadata}
                  isGenerating={isGenerating}
                  generationStatus={generationStatus}
                  validation={validation}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center animate-fade-in">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/10 to-purple-600/10 border border-white/5">
                    <Sparkles className="h-8 w-8 text-white/40" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-base font-medium text-white/60">Your creation will appear here</p>
                    <p className="text-sm text-white/40">Start by describing what you want to build</p>
                  </div>
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
