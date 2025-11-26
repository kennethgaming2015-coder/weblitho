import { useState } from "react";
import { BuilderLayout } from "@/components/builder/BuilderLayout";
import { ProjectSidebar } from "@/components/builder/ProjectSidebar";
import { CanvasPreview } from "@/components/builder/CanvasPreview";
import { ChatPanel } from "@/components/builder/ChatPanel";
import { ComponentLibrary } from "@/components/builder/ComponentLibrary";
import { ModelType } from "@/components/builder/SettingsDialog";

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
  const [pages, setPages] = useState<Page[]>([
    { id: "1", name: "Home", path: "/", content: "<div class='p-8'><h1 class='text-4xl font-bold mb-4'>Welcome to Your Website</h1><p class='text-lg text-gray-600'>Start building with AI</p></div>" },
  ]);
  
  const [currentPageId, setCurrentPageId] = useState<string>("1");
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [prompts, setPrompts] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>(
    (localStorage.getItem("ai_model") as ModelType) || "google/gemini-2.5-flash"
  );

  const currentPage = pages.find(p => p.id === currentPageId);

  const handlePromptSubmit = async (prompt: string) => {
    setPrompts(prev => [...prev, { role: "user", content: prompt }]);
    setIsGenerating(true);
    
    try {
      const conversationHistory = prompts.slice(-4).map(p => ({
        role: p.role,
        content: p.content
      }));

      const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-page`;
      const response = await fetch(GENERATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          prompt, 
          conversationHistory,
          model: selectedModel
        }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({ error: "Failed to generate page" }));
        throw new Error(errorData.error || "Failed to generate page");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let generatedHTML = "";

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
              generatedHTML += content;
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) generatedHTML += content;
          } catch { /* ignore partial leftovers */ }
        }
      }

      setPrompts(prev => [...prev, { 
        role: "assistant", 
        content: "I've generated the page based on your request. Check the canvas to see the result!" 
      }]);

      if (currentPage && generatedHTML.trim()) {
        setPages(prev => prev.map(p => 
          p.id === currentPageId ? { ...p, content: generatedHTML } : p
        ));
      }
    } catch (error) {
      console.error("Error generating page:", error);
      setPrompts(prev => [...prev, { 
        role: "assistant", 
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}` 
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddPage = (name: string, path: string) => {
    const newPage: Page = {
      id: Date.now().toString(),
      name,
      path,
      content: `<div class='p-8'><h1 class='text-4xl font-bold'>${name}</h1><p class='text-gray-600'>New page content</p></div>`
    };
    setPages(prev => [...prev, newPage]);
    setCurrentPageId(newPage.id);
  };

  const handleDeletePage = (pageId: string) => {
    setPages(prev => prev.filter(p => p.id !== pageId));
    if (currentPageId === pageId && pages.length > 1) {
      setCurrentPageId(pages.find(p => p.id !== pageId)?.id || "");
    }
  };

  return (
    <BuilderLayout onSettingsChange={setSelectedModel}>
      <ProjectSidebar
        pages={pages}
        currentPageId={currentPageId}
        onPageSelect={setCurrentPageId}
        onAddPage={handleAddPage}
        onDeletePage={handleDeletePage}
        onOpenLibrary={() => setIsLibraryOpen(true)}
      />
      
      <CanvasPreview content={currentPage?.content || ""} />
      
      <ChatPanel
        prompts={prompts}
        onSubmit={handlePromptSubmit}
        isGenerating={isGenerating}
      />

      <ComponentLibrary
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
      />
    </BuilderLayout>
  );
};

export default Index;
