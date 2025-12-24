import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ChatHero } from "@/components/chat/ChatHero";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { EnhancedPreview } from "@/components/builder/EnhancedPreview";
import { ModelType } from "@/components/builder/SettingsDialog";
import { ComponentLibrary } from "@/components/builder/ComponentLibrary";
import { FileTree } from "@/components/builder/FileTree";
import { MonacoEditor } from "@/components/builder/MonacoEditor";
import { ExportOptions } from "@/components/builder/ExportOptions";
import { VersionHistory } from "@/components/builder/VersionHistory";
import { TemplateGallery } from "@/components/builder/TemplateGallery";
import { ImageUploadPanel } from "@/components/builder/ImageUploadPanel";
import { ProjectsGrid } from "@/components/builder/ProjectsGrid";
import { PagesPanel } from "@/components/builder/PagesPanel";
import { PublishDialog } from "@/components/builder/PublishDialog";
import { ImageToCode } from "@/components/builder/ImageToCode";
import { CreditsDisplay } from "@/components/credits/CreditsDisplay";
import { Footer } from "@/components/layout/Footer";
import { useCredits } from "@/hooks/useCredits";
import { useStreamingGeneration } from "@/hooks/useStreamingGeneration";
import { Moon, Sun, LogOut, Trash2, Plus, PanelLeft, PanelLeftClose, Code2, Eye, LayoutDashboard, Save, FileText } from "lucide-react";
import weblithoLogo from "@/assets/weblitho-logo.png";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProjects, ProjectFile, Project, ProjectPage } from "@/hooks/useProjects";
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

interface GeneratedProject {
  type: "web";
  preview: string; // HTML for iframe preview
  files: ProjectFile[]; // Next.js files for export
  metadata?: any;
}

const Index = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get("project");
  
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [selectedModel, setSelectedModel] = useState<ModelType>("mimo-v2-flash");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [generatedContent, setGeneratedContent] = useState<GeneratedProject | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  
  // Streaming generation hook
  const streaming = useStreamingGeneration();
  const [showFileTree, setShowFileTree] = useState(true);
  const [selectedFileView, setSelectedFileView] = useState<{ name: string; content: string } | null>(null);
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [projectName, setProjectName] = useState<string>("Untitled Project");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [pages, setPages] = useState<ProjectPage[]>([{ id: 'home', name: 'Home', path: '/', preview: '', icon: 'home' }]);
  const [activePage, setActivePage] = useState<string>('home');
  const [showPagesPanel, setShowPagesPanel] = useState(true);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  
  const { projects, loading: projectsLoading, createProject, updateProject, deleteProject, getProjectVersions, restoreVersion } = useProjects();
  const { credits, calculateCost, deductCredits } = useCredits();

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

  // Load project from database if projectId is in URL
  // Use a ref to track if we've already loaded this project
  const loadedProjectIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (projectId && projects.length > 0) {
      // Only load from DB if this is a different project than what we've already loaded
      // This prevents overwriting newly generated content
      if (loadedProjectIdRef.current === projectId) {
        return; // Already loaded this project, don't reload
      }
      
      const project = projects.find(p => p.id === projectId);
      if (project) {
        loadedProjectIdRef.current = projectId;
        setProjectName(project.name);
        // Cast chat history roles to correct type
        const typedHistory = (project.chat_history || []).map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }));
        setMessages(typedHistory);
        setSelectedModel((project.selected_model as ModelType) || "mimo-v2-flash");
        
        // Load pages from project
        if (project.pages && project.pages.length > 0) {
          setPages(project.pages);
          setActivePage(project.pages[0].id);
        } else {
          setPages([{ id: 'home', name: 'Home', path: '/', preview: project.preview || '', icon: 'home' }]);
          setActivePage('home');
        }
        
        if (project.preview || (project.files && project.files.length > 0)) {
          setGeneratedContent({
            type: "web",
            preview: project.preview || "",
            files: project.files || [],
          });
        }
      }
    } else if (!projectId) {
      // Reset the loaded project ref when there's no project in URL
      loadedProjectIdRef.current = null;
    }
  }, [projectId, projects]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  
  // Auto-save project after generation
  const saveProject = useCallback(async (preview: string, files: ProjectFile[], chatHistory: Array<{ role: string; content: string }>) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      if (projectId) {
        // Update existing project
        await updateProject(projectId, {
          preview,
          files,
          chat_history: chatHistory,
          selected_model: selectedModel,
        }, true, `Updated via generation`);
      } else {
        // Create new project
        const newProject = await createProject({
          name: "Untitled Project",
          preview,
          files,
          chat_history: chatHistory,
          selected_model: selectedModel,
        });
        if (newProject) {
          // IMPORTANT: Set the ref BEFORE updating URL to prevent useEffect from reloading
          loadedProjectIdRef.current = newProject.id;
          setSearchParams({ project: newProject.id });
          setProjectName(newProject.name);
        }
      }
      toast({ title: "Project saved", description: "Your project has been saved automatically" });
    } catch (error) {
      console.error("Failed to save project:", error);
    } finally {
      setIsSaving(false);
    }
  }, [user, projectId, selectedModel, updateProject, createProject, setSearchParams, toast]);

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
    setProjectName("Untitled Project");
    // Navigate away from current project
    setSearchParams({});
    toast({
      title: "History cleared",
      description: "All chat history and generated content have been cleared",
    });
  };

  const handleNewProject = async () => {
    // Create a new empty project and navigate to it
    setMessages([]);
    setGeneratedContent(null);
    setValidation(null);
    setProjectName("Untitled Project");
    setPages([{ id: 'home', name: 'Home', path: '/', preview: '', icon: 'home' }]);
    setActivePage('home');
    setSearchParams({});
  };

  const handleDeleteProject = async (projectId: string) => {
    const success = await deleteProject(projectId);
    if (success) {
      toast({ title: "Project deleted", description: "The project has been permanently deleted" });
      // If we're viewing this project, clear the view
      if (searchParams.get("project") === projectId) {
        setMessages([]);
        setGeneratedContent(null);
        setSearchParams({});
      }
    }
  };

  const handleRenameProject = async (projectId: string, newName: string) => {
    const success = await updateProject(projectId, { name: newName }, false);
    if (success) {
      toast({ title: "Project renamed", description: `Project renamed to "${newName}"` });
      // Update local state if viewing this project
      if (searchParams.get("project") === projectId) {
        setProjectName(newName);
      }
    }
  };

  // Page management handlers
  const handleAddPage = (page: Omit<ProjectPage, 'id'>) => {
    const newPage: ProjectPage = {
      ...page,
      id: `page-${Date.now()}`,
      preview: '', // Will be generated
    };
    setPages(prev => [...prev, newPage]);
    setActivePage(newPage.id);
    toast({ title: "Page added", description: `${page.name} page created. Send a message to generate content.` });
  };

  const handleDeletePage = (pageId: string) => {
    setPages(prev => prev.filter(p => p.id !== pageId));
    if (activePage === pageId) {
      setActivePage('home');
    }
    toast({ title: "Page deleted" });
  };

  const handleRenamePage = (pageId: string, name: string) => {
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, name } : p));
  };

  const handlePageSelect = (pageId: string) => {
    setActivePage(pageId);
    const page = pages.find(p => p.id === pageId);
    if (page) {
      // Update the generated content to show this page's preview
      if (page.preview) {
        setGeneratedContent(prev => prev ? {
          ...prev,
          preview: page.preview,
          files: page.files || prev.files,
        } : null);
      }
    }
  };

  // Navigate to a different page from preview clicks
  const handlePreviewNavigate = (path: string) => {
    const page = pages.find(p => p.path === path);
    if (page) {
      handlePageSelect(page.id);
    } else {
      // Page doesn't exist yet, offer to create it
      toast({
        title: "Page not found",
        description: `Add "${path}" page to create content for it`,
      });
    }
  };

  // Get active page content
  const getActivePageContent = () => {
    const page = pages.find(p => p.id === activePage);
    if (page?.preview) return page.preview;
    return generatedContent?.preview || streaming.preview || '';
  };

  if (!user) {
    return null;
  }

  const handleStop = () => {
    streaming.stop();
    toast({
      title: "Generation Stopped",
      description: "AI generation has been cancelled",
    });
  };

  const handleMessageSubmit = async (message: string, files?: File[], model?: ModelType) => {
    // Check if user has credits before starting
    if (!credits || credits.credits_balance <= 0) {
      toast({
        title: "No Credits Available",
        description: "Please upgrade your plan to continue generating.",
        variant: "destructive",
      });
      return;
    }

    // Get active page info for context
    const activePageInfo = pages.find(p => p.id === activePage);
    const isGeneratingForSubPage = activePageInfo && activePageInfo.path !== '/';
    
    // Add page context to the message if generating for a specific page
    const pageContextMessage = isGeneratingForSubPage 
      ? `[Generating for page: ${activePageInfo.name} (${activePageInfo.path})]\n\n${message}`
      : message;

    const userMessage = files && files.length > 0 
      ? `${pageContextMessage}\n\n[${files.length} file(s) attached]`
      : pageContextMessage;
    
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    
    // Include current code AND files for modifications
    // Use page-specific preview if available, otherwise use global content
    const currentCode = activePageInfo?.preview || (generatedContent?.type === "web" ? generatedContent.preview : null);
    const currentFiles = generatedContent?.type === "web" ? generatedContent.files : [];
    
    // Start streaming generation
    await streaming.generate({
      prompt: pageContextMessage,
      currentCode,
      currentFiles, // Pass existing files for targeted modifications
      model: model || selectedModel,
      conversationHistory: messages,
      onChunk: (html) => {
        setGeneratedContent({ 
          type: "web", 
          preview: html,
          files: streaming.files || []
        });
      },
      onConversation: async (response) => {
        // This is a conversation response - add to chat, DON'T touch preview
        console.log("Conversation response received:", response.slice(0, 100));
        
        // Add AI response to chat messages
        setMessages(prev => [...prev, { 
          role: "assistant" as const, 
          content: response 
        }]);
        
        // DO NOT update generatedContent - keep existing preview
        
        // Minimal credit cost for conversation
        await deductCredits(0.1, `Chat: ${message.slice(0, 30)}...`, projectId || undefined);
        
        // Don't show a toast for every conversation response - less intrusive
      },
      onComplete: async (preview, files) => {
        // Standard generation response
        console.log("Generation complete - preview length:", preview.length, "files:", files.length);
        
        // Update the active page's preview content
        setPages(prev => prev.map(p => 
          p.id === activePage 
            ? { ...p, preview, files: files || p.files } 
            : p
        ));
        
        // Set final content with files
        setGeneratedContent({ 
          type: "web", 
          preview: preview,
          files: files || []
        });
        
        const updatedMessages = [...messages, 
          { role: "user" as const, content: userMessage }, 
          { role: "assistant" as const, content: "Generated beautiful website successfully ✨" }
        ];
        setMessages(updatedMessages);

        // Run validation
        try {
          const validationResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weblitho-validate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ code: preview }),
          });
          
          if (validationResp.ok) {
            const validationResult = await validationResp.json();
            setValidation(validationResult);
            
            if (validationResult.score >= 90) {
              toast({ title: "✅ Excellent Code Quality", description: `Score: ${validationResult.score}/100` });
            } else if (validationResult.score >= 80) {
              toast({ title: "✅ High Quality Code", description: `Score: ${validationResult.score}/100` });
            } else if (validationResult.score >= 60) {
              toast({ title: "⚠️ Good Code with Suggestions", description: `Score: ${validationResult.score}/100` });
            }
          }
        } catch (validationError) {
          console.log("Validation skipped:", validationError);
        }

        // Deduct credits
        const outputLength = preview.length;
        const usedModel = model || selectedModel;
        const creditCost = calculateCost(outputLength, usedModel);
        const deducted = await deductCredits(creditCost, `Generated: ${message.slice(0, 50)}...`, projectId || undefined);
        
        if (!deducted) {
          console.warn("Credits could not be deducted");
        }
        
        // Auto-save project
        await saveProject(preview, files, updatedMessages);

        toast({
          title: "Page Generated",
          description: "Your web page is ready",
        });
      },
      onError: (errorMessage) => {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: `Sorry, I encountered an error: ${errorMessage}` 
        }]);
        
        toast({
          title: "Generation Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    });
  };

  const handleModelChange = (model: ModelType) => {
    setSelectedModel(model);
    localStorage.setItem("ai_model", model);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
              <img src={weblithoLogo} alt="Weblitho" className="h-8 w-auto" />
            </Link>
            
            {/* Project name indicator - editable */}
            {projectId && (
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <span>/</span>
                {isEditingName ? (
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onBlur={async () => {
                      setIsEditingName(false);
                      if (projectId && projectName.trim()) {
                        await updateProject(projectId, { name: projectName.trim() });
                        toast({ title: "Project renamed" });
                      }
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      } else if (e.key === "Escape") {
                        setIsEditingName(false);
                      }
                    }}
                    className="font-medium text-foreground bg-transparent border-b border-primary outline-none px-1 min-w-[100px]"
                    autoFocus
                  />
                ) : (
                  <span 
                    className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors"
                    onClick={() => {
                      setIsEditingName(true);
                      setTimeout(() => nameInputRef.current?.select(), 0);
                    }}
                    title="Click to rename"
                  >
                    {projectName}
                  </span>
                )}
                {isSaving && (
                  <span className="text-xs text-primary animate-pulse flex items-center gap-1">
                    <Save className="h-3 w-3" />
                    Saving...
                  </span>
                )}
              </div>
            )}
            
            {messages.length > 0 && (
              <div className="flex items-center gap-1.5">
                <ComponentLibrary onAddComponent={(prompt) => handleMessageSubmit(prompt)} />
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleNewProject}
                  className="text-muted-foreground hover:text-foreground hover:bg-white/10 h-8 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden md:inline">New</span>
                </Button>
                
                <ImageToCode 
                  onGenerate={(prompt) => handleMessageSubmit(prompt)} 
                  isGenerating={streaming.isGenerating}
                />
                
                <ExportOptions code={generatedContent?.preview || ""} files={generatedContent?.files} />
                
                <TemplateGallery onSelectTemplate={(prompt) => handleMessageSubmit(prompt)} />
                
                <ImageUploadPanel onInsertImage={(url) => {
                  // Insert image URL into the chat as context
                  handleMessageSubmit(`Use this image in my design: ${url}`);
                }} />
                
                <VersionHistory 
                  projectId={projectId}
                  onGetVersions={getProjectVersions}
                  onRestore={restoreVersion}
                />
                
                <PublishDialog 
                  projectName={projectName}
                  preview={generatedContent?.preview || ""}
                  files={generatedContent?.files}
                />
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-muted-foreground hover:text-foreground hover:bg-white/10 h-8 gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden md:inline">Clear</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-strong border-border/50">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will delete all messages and generated content. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-white/5 border-border/50 hover:bg-white/10">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearHistory} className="bg-destructive hover:bg-destructive/90">
                        Clear
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
          
            <div className="flex items-center gap-1.5">
            <CreditsDisplay />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground hover:bg-white/10 h-8 gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden md:inline">Dashboard</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-lg">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-lg">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {!streaming.isGenerating && messages.length === 0 ? (
        <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
          <ChatHero 
            onSubmit={handleMessageSubmit}
            isGenerating={streaming.isGenerating}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            userPlan={credits?.plan}
          />
          
          {/* Recent Projects Section */}
          <div className="pb-12">
            <ProjectsGrid
              projects={projects}
              loading={projectsLoading}
              onOpenProject={(project: Project) => setSearchParams({ project: project.id })}
              onNewProject={handleNewProject}
              onDeleteProject={handleDeleteProject}
              onRenameProject={handleRenameProject}
            />
          </div>
          
          <Footer />
        </div>
      ) : (
        <main className="fixed inset-0 pt-14 flex hero-mesh">
          {/* Chat Panel - Left Side */}
          <div className="w-[400px] border-r border-border/50 bg-card/30 backdrop-blur-xl flex flex-col animate-slide-in-right">
            <ChatInterface
              messages={messages}
              onSubmit={handleMessageSubmit}
              onStop={handleStop}
              isGenerating={streaming.isGenerating}
              generationStatus={streaming.status}
              generationProgress={streaming.progress}
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
            />
          </div>

          {/* Pages Panel - Side Panel */}
          {showPagesPanel && (generatedContent?.preview || streaming.isGenerating) && (
            <div className="w-[180px] border-r border-border/50 bg-card/20 animate-slide-in-right flex flex-col">
              <PagesPanel
                pages={pages}
                activePage={activePage}
                onPageSelect={handlePageSelect}
                onAddPage={handleAddPage}
                onDeletePage={handleDeletePage}
                onRenamePage={handleRenamePage}
              />
            </div>
          )}

          {/* File Tree - Side Panel */}
          {showFileTree && (generatedContent?.preview || streaming.isGenerating) && (
            <div className="w-[220px] border-r border-border/50 bg-card/20 animate-slide-in-right flex flex-col">
              <FileTree 
                code={generatedContent?.preview || ""} 
                files={generatedContent?.files}
                onFileSelect={(name, content) => {
                  setSelectedFileView({ name, content });
                  setViewMode("code");
                }}
                onPageSelect={(path) => {
                  // Navigate to section in preview via postMessage
                  const iframe = document.querySelector('iframe[title="Preview"]') as HTMLIFrameElement;
                  if (iframe?.contentWindow) {
                    if (path.startsWith('#')) {
                      // Hash navigation - scroll to section
                      iframe.contentWindow.postMessage({ type: 'scrollTo', target: path }, '*');
                      // Fallback: directly scroll in iframe
                      const element = iframe.contentDocument?.querySelector(path);
                      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                      // Page navigation - could reload with different content
                      toast({
                        title: "Page Navigation",
                        description: `Navigating to ${path}`,
                      });
                    }
                  }
                }}
              />
            </div>
          )}

          {/* Preview Panel - Right Side */}
          <div className="flex-1 overflow-hidden bg-card/20 flex flex-col">
            {/* Toolbar with View Toggle */}
            {(generatedContent?.preview || streaming.isGenerating) && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card/50 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPagesPanel(!showPagesPanel)}
                    className={`h-8 w-8 p-0 rounded-lg ${showPagesPanel ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/10'}`}
                    title="Toggle Pages"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFileTree(!showFileTree)}
                    className={`h-8 w-8 p-0 rounded-lg ${showFileTree ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/10'}`}
                    title="Toggle File Tree"
                  >
                    {showFileTree ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                  </Button>
                  <div className="h-4 w-px bg-border/50" />
                </div>
                
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                  <Button
                    variant={viewMode === "preview" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("preview")}
                    className={`h-7 px-3 gap-1.5 ${viewMode === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span className="text-xs">Preview</span>
                  </Button>
                  <Button
                    variant={viewMode === "code" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("code")}
                    className={`h-7 px-3 gap-1.5 ${viewMode === "code" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    <span className="text-xs">Code</span>
                  </Button>
                </div>
                
                <div className="w-20" /> {/* Spacer for balance */}
              </div>
            )}
            
            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden">
              {viewMode === "preview" ? (
                <div className="h-full animate-fade-in">
                  <EnhancedPreview
                    code={getActivePageContent()}
                    files={generatedContent?.files}
                    selectedFile={selectedFileView}
                    isGenerating={streaming.isGenerating}
                    isComplete={streaming.isComplete}
                    generationStatus={streaming.status}
                    generationProgress={streaming.progress}
                    validation={validation}
                    streamingPreview={streaming.preview}
                    activePage={pages.find(p => p.id === activePage)?.path || '/'}
                    onNavigate={handlePreviewNavigate}
                  />
                </div>
              ) : (
                <div className="h-full animate-fade-in">
                  <MonacoEditor
                    content={selectedFileView?.content || generatedContent?.preview || ""}
                    fileName={selectedFileView?.name || "index.html"}
                    readOnly
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
};

export default Index;
