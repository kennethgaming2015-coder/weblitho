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
    const { prompt, conversationHistory = [], model } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: prompt }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "google/gemini-2.5-flash",
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
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
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
