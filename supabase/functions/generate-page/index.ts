import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, conversationHistory = [], model = "google/gemini-2.5-flash" } = await req.json();

    const systemPrompt = `You are an expert web designer and developer. Your task is to generate beautiful, modern, responsive HTML/CSS code based on user prompts.

Rules:
1. Generate ONLY pure HTML with inline Tailwind CSS classes
2. Use modern, beautiful designs with proper spacing, colors, and typography
3. Include responsive design (mobile-first)
4. Use semantic HTML5 elements
5. Add hover effects and transitions where appropriate
6. Make sure all colors work well together
7. Return ONLY the HTML code, no explanations or markdown
8. Wrap everything in a container div with proper padding
9. Use a consistent color scheme throughout
10. Add appropriate shadows, rounded corners, and modern design elements

Available Tailwind classes (use these extensively):
- Layout: flex, grid, container, mx-auto, p-*, m-*, gap-*
- Sizing: w-*, h-*, max-w-*, min-h-*
- Colors: bg-*, text-*, border-*
- Typography: text-*, font-*, leading-*, tracking-*
- Spacing: p-*, px-*, py-*, m-*, mx-*, my-*
- Borders: border, border-*, rounded-*
- Effects: shadow-*, hover:*, transition, duration-*
- Responsive: sm:*, md:*, lg:*, xl:*

Generate production-ready, visually stunning HTML that uses Tailwind classes effectively.`;

    // Check if using Lovable AI or direct Gemini
    const isLovableAI = model.startsWith("google/");

    let response: Response;

    if (isLovableAI) {
      // Use Lovable AI
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: prompt }
      ];

      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
            {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        const errorText = await response.text();
        console.error("Lovable AI error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "AI gateway error" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Stream Lovable AI response directly
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });

    } else {
      // Use direct Gemini API
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
      }

      // Build conversation history for Gemini
      const contents = [];
      
      // Add system prompt as the first user message
      contents.push({
        role: "user",
        parts: [{ text: systemPrompt }]
      });
      
      // Add model response to acknowledge system prompt
      contents.push({
        role: "model",
        parts: [{ text: "I understand. I will generate beautiful, production-ready HTML with Tailwind CSS based on your requirements." }]
      });

      // Add conversation history
      for (const msg of conversationHistory) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        });
      }

      // Add current prompt
      contents.push({
        role: "user",
        parts: [{ text: prompt }]
      });

      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: `Gemini API error: ${errorText}` }),
          {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Transform Gemini's streaming format to match OpenAI's format
      const transformedStream = new ReadableStream({
        async start(controller) {
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n").filter(line => line.trim());

              for (const line of lines) {
                try {
                  const jsonMatch = line.match(/\{.*\}/);
                  if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                    
                    if (text) {
                      // Transform to OpenAI format
                      const sseData = {
                        choices: [{
                          delta: { content: text },
                          index: 0
                        }]
                      };
                      controller.enqueue(
                        new TextEncoder().encode(`data: ${JSON.stringify(sseData)}\n\n`)
                      );
                    }
                  }
                } catch (e) {
                  console.error("Error parsing chunk:", e);
                }
              }
            }

            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          } catch (e) {
            console.error("Stream error:", e);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(transformedStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

  } catch (e) {
    console.error("generate-page error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
