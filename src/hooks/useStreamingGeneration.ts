import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StreamingState {
  isGenerating: boolean;
  status: string;
  preview: string;
  error: string | null;
  progress: number;
  tokensGenerated: number;
}

const STATUS_MESSAGES = [
  { threshold: 0, message: "🔍 Analyzing your request...", progress: 5 },
  { threshold: 3, message: "📐 Planning component architecture...", progress: 15 },
  { threshold: 10, message: "🏗️ Generating HTML structure...", progress: 25 },
  { threshold: 25, message: "⚛️ Building React components...", progress: 40 },
  { threshold: 50, message: "🎨 Applying Tailwind styles...", progress: 55 },
  { threshold: 100, message: "✨ Adding animations & effects...", progress: 70 },
  { threshold: 200, message: "🔧 Optimizing code structure...", progress: 85 },
  { threshold: 400, message: "🚀 Finalizing your website...", progress: 95 },
];

export function useStreamingGeneration() {
  const [state, setState] = useState<StreamingState>({
    isGenerating: false,
    status: "",
    preview: "",
    error: null,
    progress: 0,
    tokensGenerated: 0,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const accumulatedTextRef = useRef("");
  const lastPreviewRef = useRef("");

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({ ...prev, isGenerating: false, status: "Generation cancelled" }));
  }, []);

  const generate = useCallback(async ({
    prompt,
    currentCode,
    model,
    conversationHistory,
    onChunk,
    onComplete,
    onError,
  }: {
    prompt: string;
    currentCode?: string | null;
    model: string;
    conversationHistory: Array<{ role: string; content: string }>;
    onChunk?: (html: string) => void;
    onComplete?: (html: string) => void;
    onError?: (error: string) => void;
  }) => {
    // Reset state
    accumulatedTextRef.current = "";
    lastPreviewRef.current = "";
    setState({ 
      isGenerating: true, 
      status: "🔍 Analyzing your request...", 
      preview: "", 
      error: null,
      progress: 5,
      tokensGenerated: 0,
    });

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Get auth token
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
          else if (response.status === 402) errorMessage = "Insufficient credits. Please add more credits to continue.";
          else if (response.status === 403) errorMessage = "This model requires a Pro or Business plan. Please upgrade.";
          else if (response.status === 401) errorMessage = "Session expired. Please refresh and log in again.";
          else if (response.status >= 500) errorMessage = "AI service temporarily unavailable. Please try again.";
        }
        throw new Error(errorMessage);
      }

      if (!response.body) throw new Error("No response body received");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let chunkCount = 0;
      let lastUpdateTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE line by line
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
              const statusConfig = [...STATUS_MESSAGES].reverse().find(s => chunkCount >= s.threshold);
              if (statusConfig) {
                setState(prev => ({ 
                  ...prev, 
                  status: statusConfig.message,
                  progress: statusConfig.progress,
                  tokensGenerated: chunkCount,
                }));
              }

              // Throttled preview updates (every 150ms or every 5 chunks for responsiveness)
              const now = Date.now();
              if (chunkCount % 5 === 0 || now - lastUpdateTime > 150) {
                lastUpdateTime = now;
                const html = extractHtml(accumulatedTextRef.current);
                if (html && html.length > lastPreviewRef.current.length) {
                  lastPreviewRef.current = html;
                  setState(prev => ({ ...prev, preview: html }));
                  onChunk?.(html);
                }
              }
            }
          } catch {
            // Malformed JSON - put back in buffer and wait for more data
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Final extraction with complete HTML
      const finalHtml = extractHtml(accumulatedTextRef.current);
      
      if (finalHtml && finalHtml.includes("</html>")) {
        setState(prev => ({ 
          ...prev, 
          preview: finalHtml, 
          status: "✅ Generation complete!",
          progress: 100,
        }));
        onComplete?.(finalHtml);
      } else if (finalHtml) {
        // Partial HTML - try to complete it
        const completedHtml = completeHtml(finalHtml);
        setState(prev => ({ 
          ...prev, 
          preview: completedHtml, 
          status: "✅ Generation complete!",
          progress: 100,
        }));
        onComplete?.(completedHtml);
      } else {
        // Fallback: use raw accumulated text
        const rawContent = accumulatedTextRef.current.trim();
        const wrappedHtml = wrapInHtml(rawContent);
        setState(prev => ({ 
          ...prev, 
          preview: wrappedHtml, 
          status: "✅ Generation complete!",
          progress: 100,
        }));
        onComplete?.(wrappedHtml);
      }

    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Generation aborted by user");
        return;
      }

      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred";
      setState(prev => ({ ...prev, error: errorMsg, status: "❌ Generation failed", progress: 0 }));
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

// Extract and clean HTML from AI output
function extractHtml(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // Remove thinking tokens (DeepSeek)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");
  
  // Remove markdown code fences
  cleaned = cleaned.replace(/```html\s*/gi, "");
  cleaned = cleaned.replace(/```typescript\s*/gi, "");
  cleaned = cleaned.replace(/```tsx\s*/gi, "");
  cleaned = cleaned.replace(/```jsx\s*/gi, "");
  cleaned = cleaned.replace(/```\s*/gi, "");
  
  // Remove JSON wrappers if present
  cleaned = cleaned.replace(/^\s*\{[\s\S]*?"preview"\s*:\s*"/i, "");
  cleaned = cleaned.replace(/"\s*\}\s*$/i, "");
  
  cleaned = cleaned.trim();

  // Extract complete HTML document
  const docMatch = cleaned.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
  if (docMatch) return docMatch[0].trim();

  // Try without DOCTYPE
  const htmlMatch = cleaned.match(/<html[\s\S]*<\/html>/i);
  if (htmlMatch) return "<!DOCTYPE html>\n" + htmlMatch[0].trim();

  // Return partial HTML for streaming (from DOCTYPE onwards)
  const partialIdx = cleaned.indexOf("<!DOCTYPE html>");
  if (partialIdx !== -1) {
    return cleaned.slice(partialIdx);
  }

  // Try from <html> tag
  const htmlIdx = cleaned.indexOf("<html");
  if (htmlIdx !== -1) {
    return "<!DOCTYPE html>\n" + cleaned.slice(htmlIdx);
  }

  return "";
}

// Complete partial HTML with closing tags
function completeHtml(html: string): string {
  let completed = html;
  
  // Add missing closing tags
  if (!completed.includes("</body>")) {
    completed += "\n</body>";
  }
  if (!completed.includes("</html>")) {
    completed += "\n</html>";
  }
  
  return completed;
}

// Wrap raw content in basic HTML structure
function wrapInHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Page</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-950 text-white min-h-screen">
  ${content}
</body>
</html>`;
}
