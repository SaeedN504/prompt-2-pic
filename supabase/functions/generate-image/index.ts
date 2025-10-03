import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("generate-image function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, style, aspectRatio, quality } = await req.json();
    console.log("Received request with prompt:", prompt?.substring(0, 50));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build enhanced prompt with style
    let enhancedPrompt = prompt;
    if (style && style !== "none") {
      const styleMap: Record<string, string> = {
        photorealistic: "photorealistic, ultra detailed, 8k resolution, professional photography",
        anime: "anime style, vibrant colors, detailed line art, studio quality",
        fantasy: "fantasy art, magical atmosphere, epic scene, concept art quality",
        vintage: "vintage style, retro aesthetic, film grain, classic composition",
        cinematic: "cinematic lighting, dramatic atmosphere, movie quality, epic scene",
        abstract: "abstract art, creative interpretation, artistic style, unique perspective",
        watercolor: "watercolor painting, soft colors, artistic brushstrokes, traditional art",
        "oil-painting": "oil painting style, rich textures, classical art, museum quality"
      };
      enhancedPrompt = `${prompt}, ${styleMap[style] || ""}`;
    }

    console.log("Calling Lovable AI image generation");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: enhancedPrompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error(`Image generation failed: ${response.status}`);
    }

    const data = await response.json();
    console.log("Response received from Lovable AI");
    
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      throw new Error("No image data in response");
    }

    console.log("Image generated successfully");

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const err = error as Error;
    console.error("Error in generate-image:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to generate image" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
