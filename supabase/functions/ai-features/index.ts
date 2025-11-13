import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, action, targetLanguage } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "glossary":
        systemPrompt = "You are a helpful assistant that identifies key technical terms and provides concise definitions. Return a JSON array of objects with 'term' and 'definition' properties. Limit to the 5-8 most important terms.";
        userPrompt = `Analyze this text and identify key terms with definitions:\n\n${text}`;
        break;
      
      case "summarize":
        systemPrompt = "You are a helpful assistant that creates concise, 1-2 sentence summaries.";
        userPrompt = `Summarize this text in 1-2 sentences:\n\n${text}`;
        break;
      
      case "tags":
        systemPrompt = "You are a helpful assistant that suggests 3-5 relevant tags. Return a JSON array of tag strings.";
        userPrompt = `Suggest 3-5 relevant tags for this text:\n\n${text}`;
        break;
      
      case "grammar":
        systemPrompt = "You are a grammar checking assistant. Identify grammatical errors and return a JSON array of objects with 'error', 'correction', and 'position' (character index) properties. If no errors, return empty array.";
        userPrompt = `Check for grammar errors in this text:\n\n${text}`;
        break;
      
      case "translate":
        systemPrompt = `You are a translation assistant. Translate the text to ${targetLanguage}. Return only the translated text.`;
        userPrompt = text;
        break;
      
      case "insights":
        systemPrompt = "You are an AI assistant that provides intelligent insights. Analyze the text and provide 2-3 key insights, recommendations, or highlights in a clear format.";
        userPrompt = `Analyze this text and provide key insights:\n\n${text}`;
        break;
      
      default:
        throw new Error("Invalid action");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const result = data.choices[0].message.content;

    // Try to parse JSON responses for structured actions
    let parsedResult = result;
    if (action === "glossary" || action === "tags" || action === "grammar") {
      try {
        parsedResult = JSON.parse(result);
      } catch {
        // If parsing fails, return raw text
        parsedResult = result;
      }
    }

    return new Response(JSON.stringify({ result: parsedResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ai-features function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});