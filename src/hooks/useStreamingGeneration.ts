import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StreamingState {
  isGenerating: boolean;
  status: string;
  preview: string;
  error: string | null;
}

export function useStreamingGeneration() {
  const [state, setState] = useState<StreamingState>({
    isGenerating: false,
    status: "",
    preview: "",
    error: null,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const accumulatedTextRef = useRef("");

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({ ...prev, isGenerating: false, status: "" }));
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
    setState({ isGenerating: true, status: "Analyzing your request...", preview: "", error: null });

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
          if (response.status === 429) errorMessage = "Rate limit exceeded. Please try again later.";
          else if (response.status === 402) errorMessage = "Payment required. Please add credits.";
          else if (response.status === 403) errorMessage = "This model requires a paid plan.";
          else if (response.status === 401) errorMessage = "Please log in again.";
        }
        throw new Error(errorMessage);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process line by line
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

              // Update status based on progress
              if (chunkCount < 5) {
                setState(prev => ({ ...prev, status: "Analyzing your request..." }));
              } else if (chunkCount < 20) {
                setState(prev => ({ ...prev, status: "Planning component structure..." }));
              } else if (chunkCount < 50) {
                setState(prev => ({ ...prev, status: "Writing React components..." }));
              } else if (chunkCount < 100) {
                setState(prev => ({ ...prev, status: "Styling with Tailwind CSS..." }));
              } else {
                setState(prev => ({ ...prev, status: "Finalizing your website..." }));
              }

              // Extract and update preview periodically
              if (chunkCount % 10 === 0 || chunkCount < 20) {
                const html = extractHtml(accumulatedTextRef.current);
                if (html) {
                  setState(prev => ({ ...prev, preview: html }));
                  onChunk?.(html);
                }
              }
            }
          } catch {
            // Skip malformed JSON, put line back in buffer
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Final extraction
      const finalHtml = extractHtml(accumulatedTextRef.current);
      
      if (finalHtml) {
        setState(prev => ({ ...prev, preview: finalHtml, status: "Generation complete!" }));
        onComplete?.(finalHtml);
      } else {
        // Fallback: use raw output
        const fallback = accumulatedTextRef.current.trim();
        setState(prev => ({ ...prev, preview: fallback, status: "Generation complete!" }));
        onComplete?.(fallback);
      }

    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Generation aborted");
        return;
      }

      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setState(prev => ({ ...prev, error: errorMsg, status: "" }));
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

// Extract clean HTML from AI output
function extractHtml(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // Remove thinking tokens
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");
  
  // Remove markdown code fences
  cleaned = cleaned.replace(/```html\s*/gi, "");
  cleaned = cleaned.replace(/```\s*/gi, "");
  
  cleaned = cleaned.trim();

  // Extract complete HTML document
  const docMatch = cleaned.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
  if (docMatch) return docMatch[0];

  // Try without DOCTYPE
  const htmlMatch = cleaned.match(/<html[\s\S]*<\/html>/i);
  if (htmlMatch) return "<!DOCTYPE html>\n" + htmlMatch[0];

  // Return partial HTML for streaming preview
  const partialMatch = cleaned.match(/<!DOCTYPE html>[\s\S]*/i);
  if (partialMatch) {
    let partial = partialMatch[0];
    // Add closing tags if missing
    if (!partial.includes("</body>")) partial += "\n</body>";
    if (!partial.includes("</html>")) partial += "\n</html>";
    return partial;
  }

  return "";
}
