import { useState } from "react";
import { BuilderLayout } from "@/components/builder/BuilderLayout";
import { ProjectSidebar } from "@/components/builder/ProjectSidebar";
import { CanvasPreview } from "@/components/builder/CanvasPreview";
import { ChatPanel } from "@/components/builder/ChatPanel";
import { ComponentLibrary } from "@/components/builder/ComponentLibrary";

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

  const currentPage = pages.find(p => p.id === currentPageId);

  const handlePromptSubmit = async (prompt: string) => {
    setPrompts(prev => [...prev, { role: "user", content: prompt }]);
    
    // Simulate AI response
    setTimeout(() => {
      setPrompts(prev => [...prev, { 
        role: "assistant", 
        content: "I've updated your page with the requested changes. The new content has been applied to the canvas." 
      }]);
      
      // Update the current page content
      if (currentPage) {
        const updatedContent = `<div class='p-8'>
          <h1 class='text-4xl font-bold mb-4'>AI Generated Content</h1>
          <p class='text-lg text-gray-600 mb-4'>${prompt}</p>
          <div class='grid grid-cols-3 gap-4 mt-8'>
            <div class='p-6 bg-blue-100 rounded-lg'>
              <h3 class='font-semibold mb-2'>Feature 1</h3>
              <p class='text-sm'>Description of feature</p>
            </div>
            <div class='p-6 bg-green-100 rounded-lg'>
              <h3 class='font-semibold mb-2'>Feature 2</h3>
              <p class='text-sm'>Description of feature</p>
            </div>
            <div class='p-6 bg-purple-100 rounded-lg'>
              <h3 class='font-semibold mb-2'>Feature 3</h3>
              <p class='text-sm'>Description of feature</p>
            </div>
          </div>
        </div>`;
        
        setPages(prev => prev.map(p => 
          p.id === currentPageId ? { ...p, content: updatedContent } : p
        ));
      }
    }, 1000);
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
    <BuilderLayout>
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
      />

      <ComponentLibrary
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
      />
    </BuilderLayout>
  );
};

export default Index;
