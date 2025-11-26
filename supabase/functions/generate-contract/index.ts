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
    const { prompt, contractType, model = "gemini-2.0-flash-exp" } = await req.json();

    const systemPrompt = `You are an expert Solidity smart contract developer and security auditor specializing in EVM-compatible blockchains.

CRITICAL RULES:
1. Use Solidity version ^0.8.20
2. Use ONLY OpenZeppelin imports (latest stable versions)
3. NO deprecated functions or unsafe operations
4. Optimize for gas efficiency
5. NO delegatecall or assembly unless absolutely necessary and well-documented
6. Include detailed NatSpec comments for all functions and state variables
7. Target deployment on Qubetics Layer 1 (EVM compatible, Chain ID: 9030)
8. Follow CEI pattern (Checks-Effects-Interactions)
9. Include events for all state changes
10. Add access control where appropriate

SUPPORTED CONTRACT TYPES:
- ERC20: Standard fungible tokens with optional minting, burning, pausable features
- ERC721: NFT tokens with metadata, royalties, batch minting
- ERC1155: Multi-token standard for gaming/metaverse
- Staking: Token staking pools with rewards calculation
- DAO: Governance contracts with voting mechanisms
- Subscription: Payment streaming and recurring payments

OUTPUT FORMAT (JSON):
{
  "contract_name": "ContractName",
  "solidity_code": "full contract code with imports",
  "abi": "contract ABI as JSON string",
  "constructor_params": ["param1 description", "param2 description"],
  "deployment_notes": "Important deployment information",
  "security_notes": "Security considerations"
}

Generate secure, production-ready Solidity code with proper error handling and events.`;

    // Check if using Lovable AI or direct Gemini
    const isLovableAI = model.startsWith("google/");

    let response: Response;

    if (isLovableAI) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      const messages = [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Generate a ${contractType} smart contract for: ${prompt}\n\nEnsure the output is valid JSON with all required fields.` 
        }
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
          temperature: 0.3, // Lower temperature for more consistent code generation
        }),
      });

    } else {
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
      }

      const contents = [
        {
          role: "user",
          parts: [{ text: systemPrompt }]
        },
        {
          role: "model",
          parts: [{ text: "I understand. I will generate secure, production-ready Solidity smart contracts following all the specified rules and best practices." }]
        },
        {
          role: "user",
          parts: [{ text: `Generate a ${contractType} smart contract for: ${prompt}\n\nEnsure the output is valid JSON with all required fields.` }]
        }
      ];

      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.3,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 8192,
            },
          }),
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `AI API error: ${errorText}` }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    
    let generatedText = "";
    if (isLovableAI) {
      generatedText = data.choices?.[0]?.message?.content || "";
    } else {
      generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    // Try to extract JSON from the response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const contractData = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify(contractData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      throw new Error("Failed to parse contract JSON from AI response");
    }

  } catch (e) {
    console.error("generate-contract error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
