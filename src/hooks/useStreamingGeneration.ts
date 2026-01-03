import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectFile {
  path: string;
  content: string;
}

export interface GeneratedPage {
  id: string;
  name: string;
  path: string;
  preview: string;
  icon?: string;
  files?: ProjectFile[];
}

interface StreamingState {
  isGenerating: boolean;
  status: string;
  statusType: "analyzing" | "planning" | "building" | "styling" | "finalizing" | "complete" | "error" | "conversation";
  preview: string;
  files: ProjectFile[];
  pages: GeneratedPage[]; // Multi-page website structure
  error: string | null;
  progress: number;
  tokensGenerated: number;
  isComplete: boolean;
  isConversation: boolean;
  conversationResponse: string;
}

// Detailed status messages with timing
const STATUS_PHASES = [
  { threshold: 0, status: "Analyzing your request...", type: "analyzing" as const, progress: 5 },
  { threshold: 2, status: "Understanding requirements...", type: "analyzing" as const, progress: 10 },
  { threshold: 5, status: "Planning website structure...", type: "planning" as const, progress: 15 },
  { threshold: 10, status: "Designing component architecture...", type: "planning" as const, progress: 20 },
  { threshold: 20, status: "Generating HTML structure...", type: "building" as const, progress: 30 },
  { threshold: 40, status: "Building navigation...", type: "building" as const, progress: 35 },
  { threshold: 60, status: "Creating hero section...", type: "building" as const, progress: 45 },
  { threshold: 100, status: "Adding content sections...", type: "building" as const, progress: 55 },
  { threshold: 150, status: "Styling components...", type: "styling" as const, progress: 65 },
  { threshold: 200, status: "Applying animations...", type: "styling" as const, progress: 75 },
  { threshold: 300, status: "Polishing design details...", type: "finalizing" as const, progress: 85 },
  { threshold: 400, status: "Optimizing for responsiveness...", type: "finalizing" as const, progress: 90 },
  { threshold: 500, status: "Final touches...", type: "finalizing" as const, progress: 95 },
];

export function useStreamingGeneration() {
  const [state, setState] = useState<StreamingState>({
    isGenerating: false,
    status: "",
    statusType: "analyzing",
    preview: "",
    files: [],
    pages: [],
    error: null,
    progress: 0,
    tokensGenerated: 0,
    isComplete: false,
    isConversation: false,
    conversationResponse: "",
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const accumulatedTextRef = useRef("");
  const lastPreviewRef = useRef("");
  const startTimeRef = useRef(0);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({ 
      ...prev, 
      isGenerating: false, 
      status: "Generation cancelled",
      statusType: "error",
      isComplete: false,
      isConversation: false,
      conversationResponse: "",
    }));
  }, []);

  const generate = useCallback(async ({
    prompt,
    currentCode,
    currentFiles,
    model,
    conversationHistory,
    onChunk,
    onComplete,
    onConversation,
    onError,
  }: {
    prompt: string;
    currentCode?: string | null;
    currentFiles?: ProjectFile[];
    model: string;
    conversationHistory: Array<{ role: string; content: string }>;
    onChunk?: (html: string) => void;
    onComplete?: (html: string, files: ProjectFile[], pages: GeneratedPage[]) => void;
    onConversation?: (response: string) => void;
    onError?: (error: string) => void;
  }) => {
    // Reset state - start with isComplete: false
    accumulatedTextRef.current = "";
    lastPreviewRef.current = "";
    startTimeRef.current = Date.now();
    
    setState({ 
      isGenerating: true, 
      status: "Analyzing your request...", 
      statusType: "analyzing",
      preview: "", 
      files: [],
      pages: [],
      error: null,
      progress: 5,
      tokensGenerated: 0,
      isComplete: false,
      isConversation: false,
      conversationResponse: "",
    });

    abortControllerRef.current = new AbortController();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-page`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            prompt,
            conversationHistory,
            currentCode,
            currentFiles: currentFiles || [],
            model,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        let errorMessage = "Failed to generate content";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          if (response.status === 429) errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
          else if (response.status === 402) errorMessage = "Insufficient credits. Please add more credits.";
          else if (response.status === 403) errorMessage = "This model requires a paid plan. Please upgrade.";
          else if (response.status === 401) errorMessage = "Session expired. Please log in again.";
          else if (response.status >= 500) errorMessage = "AI service temporarily unavailable.";
        }
        throw new Error(errorMessage);
      }

      if (!response.body) throw new Error("No response received");

      // Check if this is a conversation response
      const isConversationResponse = response.headers.get("X-Response-Type") === "conversation";
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let chunkCount = 0;
      let lastPreviewUpdate = Date.now();

      // Handle conversation mode differently - DO NOT SET PREVIEW
      if (isConversationResponse) {
        setState(prev => ({
          ...prev,
          status: "AI is thinking...",
          statusType: "conversation",
          isConversation: true,
          preview: "", // Keep preview empty for conversations
        }));
        
        let conversationText = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let newlineIdx: number;
          while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIdx);
            buffer = buffer.slice(newlineIdx + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                // Remove thinking tokens from conversation
                const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/gi, "");
                conversationText += cleanContent;
                
                // Update conversation response in real-time - NO PREVIEW
                setState(prev => ({
                  ...prev,
                  conversationResponse: conversationText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim(),
                  preview: "", // Never set preview for conversation
                }));
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }

        // Clean final response
        const cleanedResponse = conversationText
          .replace(/<think>[\s\S]*?<\/think>/gi, "")
          .trim();

        setState(prev => ({
          ...prev,
          isGenerating: false,
          isComplete: true,
          isConversation: true,
          conversationResponse: cleanedResponse,
          preview: "", // Ensure preview stays empty for conversation
          status: "Ready",
          statusType: "complete",
          progress: 100,
        }));

        // Return conversation response through dedicated callback
        onConversation?.(cleanedResponse);
        return;
      }

      // Standard generation mode
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              accumulatedTextRef.current += content;
              chunkCount++;

              // Update status based on chunk count
              const phase = [...STATUS_PHASES].reverse().find(p => chunkCount >= p.threshold);
              if (phase) {
                setState(prev => ({ 
                  ...prev, 
                  status: phase.status,
                  statusType: phase.type,
                  progress: phase.progress,
                  tokensGenerated: chunkCount,
                }));
              }

              // LIVE STREAMING PREVIEW - update preview in real-time for smoother UX
              const now = Date.now();
              const timeSinceLastUpdate = now - lastPreviewUpdate;
              
              // More aggressive preview updates:
              // - Every 5 chunks OR every 100ms for smoother updates
              // - But don't update too frequently to avoid performance issues
              if ((chunkCount % 5 === 0 || timeSinceLastUpdate > 100) && chunkCount > 20) {
                lastPreviewUpdate = now;
                const output = extractOutput(accumulatedTextRef.current);
                
                // Show preview earlier - once we have any meaningful content
                if (output.preview && output.preview.length > 50) {
                  const previewToShow = output.preview.includes('</html>') 
                    ? output.preview 
                    : completeHtml(output.preview);
                    
                  if (previewToShow !== lastPreviewRef.current) {
                    lastPreviewRef.current = previewToShow;
                    // Update state with partial preview for live display
                    setState(prev => ({
                      ...prev,
                      preview: previewToShow,
                      files: output.files.length > 0 ? output.files : prev.files,
                    }));
                    // Notify parent of partial preview
                    onChunk?.(previewToShow);
                  }
                }
              }
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Final extraction - NOW we show the preview, files, and pages
      const output = extractOutput(accumulatedTextRef.current);
      const elapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
      
      // Merge modified files with existing files (don't replace all)
      const mergedFiles = mergeFiles(currentFiles || [], output.files);
      
      // Use pages from output, or create default home page
      const extractedPages = output.pages.length > 0 ? output.pages : [{
        id: 'home',
        name: 'Home',
        path: '/',
        preview: output.preview,
        icon: 'home'
      }];
      
      if (output.preview && output.preview.includes("</html>")) {
        setState(prev => ({ 
          ...prev, 
          preview: output.preview, 
          files: mergedFiles,
          pages: extractedPages,
          status: `Complete in ${elapsed}s`,
          statusType: "complete",
          progress: 100,
          isComplete: true,
          isConversation: false,
        }));
        onComplete?.(output.preview, mergedFiles, extractedPages);
      } else if (output.preview) {
        const completedHtml = completeHtml(output.preview);
        setState(prev => ({ 
          ...prev, 
          preview: completedHtml, 
          files: mergedFiles,
          pages: extractedPages,
          status: `Complete in ${elapsed}s`,
          statusType: "complete",
          progress: 100,
          isComplete: true,
          isConversation: false,
        }));
        onComplete?.(completedHtml, mergedFiles, extractedPages);
      } else {
        const wrappedHtml = wrapInHtml(accumulatedTextRef.current.trim());
        const defaultPages = [{
          id: 'home',
          name: 'Home', 
          path: '/',
          preview: wrappedHtml,
          icon: 'home'
        }];
        setState(prev => ({ 
          ...prev, 
          preview: wrappedHtml, 
          files: mergedFiles.length > 0 ? mergedFiles : [],
          pages: defaultPages,
          status: `Complete in ${elapsed}s`,
          statusType: "complete",
          progress: 100,
          isComplete: true,
          isConversation: false,
        }));
        onComplete?.(wrappedHtml, mergedFiles.length > 0 ? mergedFiles : [], defaultPages);
      }

    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Generation aborted");
        return;
      }

      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred";
      setState(prev => ({ 
        ...prev, 
        error: errorMsg, 
        status: errorMsg,
        statusType: "error",
        progress: 0,
        isComplete: false,
        isConversation: false,
        conversationResponse: "",
      }));
      onError?.(errorMsg);
    } finally {
      setState(prev => ({ ...prev, isGenerating: false }));
      abortControllerRef.current = null;
    }
  }, []);

  return {
    ...state,
    generate,
    stop,
  };
}

// Extract JSON output with files, pages, and preview from AI output
interface ExtractedOutput {
  preview: string;
  files: ProjectFile[];
  pages: GeneratedPage[];
}

function extractOutput(text: string): ExtractedOutput {
  if (!text) return { preview: "", files: [], pages: [] };

  let cleaned = text;

  // Remove DeepSeek thinking tokens
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");
  
  // Remove markdown code fences
  cleaned = cleaned.replace(/```(?:json|html|typescript|tsx|jsx|javascript)?\s*/gi, "");
  cleaned = cleaned.replace(/```\s*/gi, "");
  
  cleaned = cleaned.trim();

  // Try to parse as JSON with files and pages arrays
  try {
    // Find the JSON object boundaries
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonStr = cleaned.slice(jsonStart, jsonEnd + 1);
      
      // Parse the JSON
      const parsed = JSON.parse(jsonStr);
      
      // Extract files array
      let files: ProjectFile[] = [];
      if (Array.isArray(parsed.files)) {
        files = parsed.files
          .filter((f: any) => f && typeof f.path === 'string' && typeof f.content === 'string')
          .map((f: any) => ({
            path: f.path,
            content: f.content
          }));
      }
      
      // Extract pages array - NEW MULTI-PAGE SUPPORT
      let pages: GeneratedPage[] = [];
      if (Array.isArray(parsed.pages)) {
        pages = parsed.pages
          .filter((p: any) => p && typeof p.id === 'string' && typeof p.name === 'string')
          .map((p: any) => {
            let pagePreview = p.preview || "";
            if (typeof pagePreview === 'string') {
              pagePreview = pagePreview
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\t/g, '\t')
                .replace(/\\\\/g, '\\');
            }
            return {
              id: p.id,
              name: p.name,
              path: p.path || '/',
              preview: pagePreview,
              icon: p.icon || getIconForPath(p.path),
              files: p.files
            };
          });
        console.log(`Extracted ${pages.length} pages from JSON output`);
      }
      
      // Extract preview HTML (use first page preview or main preview)
      let preview = "";
      if (typeof parsed.preview === 'string') {
        preview = parsed.preview
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\');
      } else if (pages.length > 0 && pages[0].preview) {
        // Use home page preview as main preview
        preview = pages[0].preview;
      }
      
      if (files.length > 0 || pages.length > 0 || preview.includes("<!DOCTYPE html>")) {
        console.log(`Extracted ${files.length} files, ${pages.length} pages from JSON output`);
        return { preview: preview || wrapInHtml("No preview available"), files, pages };
      }
    }
  } catch (e) {
    console.log("JSON parse failed, falling back to HTML extraction:", e);
  }

  // Fallback: Try to extract preview from partial JSON
  const previewMatch = cleaned.match(/"preview"\s*:\s*"([\s\S]*?)(?:"\s*[,}]|\s*$)/);
  if (previewMatch) {
    let htmlFromJson = previewMatch[1];
    htmlFromJson = htmlFromJson.replace(/\\n/g, '\n');
    htmlFromJson = htmlFromJson.replace(/\\"/g, '"');
    htmlFromJson = htmlFromJson.replace(/\\t/g, '\t');
    htmlFromJson = htmlFromJson.replace(/\\\\/g, '\\');
    if (htmlFromJson.includes("<!DOCTYPE html>")) {
      return { preview: htmlFromJson, files: [], pages: [] };
    }
  }
  
  // Fallback: Extract raw HTML
  const docMatch = cleaned.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
  if (docMatch) return { preview: docMatch[0].trim(), files: [], pages: [] };

  const htmlMatch = cleaned.match(/<html[\s\S]*<\/html>/i);
  if (htmlMatch) return { preview: "<!DOCTYPE html>\n" + htmlMatch[0].trim(), files: [], pages: [] };

  const partialIdx = cleaned.indexOf("<!DOCTYPE html>");
  if (partialIdx !== -1) return { preview: cleaned.slice(partialIdx), files: [], pages: [] };

  const htmlIdx = cleaned.indexOf("<html");
  if (htmlIdx !== -1) return { preview: "<!DOCTYPE html>\n" + cleaned.slice(htmlIdx), files: [], pages: [] };

  return { preview: "", files: [], pages: [] };
}

// Get icon name based on path
function getIconForPath(path: string): string {
  if (!path || path === '/') return 'home';
  const pathLower = path.toLowerCase();
  if (pathLower.includes('about')) return 'info';
  if (pathLower.includes('pricing')) return 'dollar-sign';
  if (pathLower.includes('contact')) return 'mail';
  if (pathLower.includes('blog')) return 'book-open';
  if (pathLower.includes('feature')) return 'star';
  if (pathLower.includes('team')) return 'users';
  if (pathLower.includes('service')) return 'briefcase';
  return 'file-text';
}

// Merge modified files with existing files (update existing, add new)
function mergeFiles(existingFiles: ProjectFile[], newFiles: ProjectFile[]): ProjectFile[] {
  if (!newFiles || newFiles.length === 0) return existingFiles;
  if (!existingFiles || existingFiles.length === 0) return newFiles;
  
  const fileMap = new Map<string, ProjectFile>();
  
  // Add all existing files first
  for (const file of existingFiles) {
    fileMap.set(file.path, file);
  }
  
  // Override with new/modified files
  for (const file of newFiles) {
    fileMap.set(file.path, file);
  }
  
  return Array.from(fileMap.values());
}

// Complete partial HTML
function completeHtml(html: string): string {
  let completed = html;
  if (!completed.includes("</body>")) completed += "\n</body>";
  if (!completed.includes("</html>")) completed += "\n</html>";
  return completed;
}

// Wrap raw content in HTML
function wrapInHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Page</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="antialiased bg-gray-950 text-white min-h-screen font-sans">
  ${content}
</body>
</html>`;
}
