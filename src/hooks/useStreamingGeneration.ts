import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StreamingState {
  isGenerating: boolean;
  status: string;
  statusType: "analyzing" | "planning" | "building" | "styling" | "finalizing" | "complete" | "error" | "conversation";
  preview: string;
  error: string | null;
  progress: number;
  tokensGenerated: number;
  isComplete: boolean;
  isConversation: boolean; // New: indicates this is a chat response, not code
  conversationResponse: string; // New: holds conversation text
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
    // Reset state - start with isComplete: false
    accumulatedTextRef.current = "";
    lastPreviewRef.current = "";
    startTimeRef.current = Date.now();
    
    setState({ 
      isGenerating: true, 
      status: "Analyzing your request...", 
      statusType: "analyzing",
      preview: "", 
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

      // Handle conversation mode differently
      if (isConversationResponse) {
        setState(prev => ({
          ...prev,
          status: "AI is thinking...",
          statusType: "conversation",
          isConversation: true,
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
                
                // Update conversation response in real-time
                setState(prev => ({
                  ...prev,
                  conversationResponse: conversationText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim(),
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
          status: "Ready",
          statusType: "complete",
          progress: 100,
        }));

        // Return conversation response through onComplete
        onComplete?.(cleanedResponse);
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

              // Don't update preview during generation - keep showing loader
              const now = Date.now();
              if (chunkCount % 20 === 0 || now - lastPreviewUpdate > 200) {
                lastPreviewUpdate = now;
                const html = extractHtml(accumulatedTextRef.current);
                if (html) {
                  lastPreviewRef.current = html;
                }
              }
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Final extraction - NOW we show the preview
      const finalHtml = extractHtml(accumulatedTextRef.current);
      const elapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
      
      if (finalHtml && finalHtml.includes("</html>")) {
        setState(prev => ({ 
          ...prev, 
          preview: finalHtml, 
          status: `Complete in ${elapsed}s`,
          statusType: "complete",
          progress: 100,
          isComplete: true,
          isConversation: false,
        }));
        onComplete?.(finalHtml);
      } else if (finalHtml) {
        const completedHtml = completeHtml(finalHtml);
        setState(prev => ({ 
          ...prev, 
          preview: completedHtml, 
          status: `Complete in ${elapsed}s`,
          statusType: "complete",
          progress: 100,
          isComplete: true,
          isConversation: false,
        }));
        onComplete?.(completedHtml);
      } else {
        const wrappedHtml = wrapInHtml(accumulatedTextRef.current.trim());
        setState(prev => ({ 
          ...prev, 
          preview: wrappedHtml, 
          status: `Complete in ${elapsed}s`,
          statusType: "complete",
          progress: 100,
          isComplete: true,
          isConversation: false,
        }));
        onComplete?.(wrappedHtml);
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

// Extract and clean HTML from AI output
function extractHtml(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // Remove DeepSeek thinking tokens
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");
  
  // Remove markdown code fences
  cleaned = cleaned.replace(/```(?:html|typescript|tsx|jsx|javascript)?\s*/gi, "");
  cleaned = cleaned.replace(/```\s*/gi, "");
  
  // Try to extract preview from JSON output
  const previewMatch = cleaned.match(/"preview"\s*:\s*"([\s\S]*?)"\s*\}/);
  if (previewMatch) {
    // Unescape the JSON string
    let htmlFromJson = previewMatch[1];
    htmlFromJson = htmlFromJson.replace(/\\n/g, '\n');
    htmlFromJson = htmlFromJson.replace(/\\"/g, '"');
    htmlFromJson = htmlFromJson.replace(/\\\\/g, '\\');
    if (htmlFromJson.includes("<!DOCTYPE html>")) {
      cleaned = htmlFromJson;
    }
  }
  
  cleaned = cleaned.trim();

  // Extract complete HTML document
  const docMatch = cleaned.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
  if (docMatch) return docMatch[0].trim();

  // Try without DOCTYPE
  const htmlMatch = cleaned.match(/<html[\s\S]*<\/html>/i);
  if (htmlMatch) return "<!DOCTYPE html>\n" + htmlMatch[0].trim();

  // Return partial from DOCTYPE
  const partialIdx = cleaned.indexOf("<!DOCTYPE html>");
  if (partialIdx !== -1) return cleaned.slice(partialIdx);

  // Try from <html>
  const htmlIdx = cleaned.indexOf("<html");
  if (htmlIdx !== -1) return "<!DOCTYPE html>\n" + cleaned.slice(htmlIdx);

  return "";
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
