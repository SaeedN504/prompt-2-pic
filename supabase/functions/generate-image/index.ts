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
    const { prompt, style, aspectRatio, quality, seed, negativePrompt } = await req.json();
    const HF_TOKEN = Deno.env.get("HUGGINGFACE_API_KEY");

    if (!HF_TOKEN) {
      throw new Error("HUGGINGFACE_API_KEY not configured");
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

    // Map quality to inference steps
    const qualitySteps: Record<string, number> = {
      draft: 4,
      medium: 8,
      high: 20,
      ultra: 30
    };

    // Map aspect ratio to dimensions
    const dimensions: Record<string, { width: number; height: number }> = {
      "1:1": { width: 1024, height: 1024 },
      "16:9": { width: 1344, height: 768 },
      "9:16": { width: 768, height: 1344 },
      "4:3": { width: 1152, height: 896 },
      "3:2": { width: 1216, height: 832 }
    };

    const dims = dimensions[aspectRatio] || dimensions["1:1"];

    // Call HuggingFace FLUX.1-schnell
    const response = await fetch(
      "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: enhancedPrompt,
          parameters: {
            num_inference_steps: qualitySteps[quality] || 8,
            guidance_scale: 3.5,
            width: dims.width,
            height: dims.height,
            seed: seed,
            negative_prompt: negativePrompt || "blurry, low quality, distorted"
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HuggingFace API error:", errorText);
      throw new Error(`Image generation failed: ${response.status} - ${errorText}`);
    }

    // Convert blob to base64
    const imageBlob = await response.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const imageUrl = `data:image/png;base64,${base64}`;

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-image:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate image";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
