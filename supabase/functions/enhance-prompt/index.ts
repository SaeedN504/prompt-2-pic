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
    const { prompt, type = "generate" } = await req.json();
    
    // Input validation
    if (!prompt) {
      throw new Error("Prompt is required");
    }
    
    if (typeof prompt !== 'string') {
      throw new Error("Invalid prompt format");
    }
    
    if (prompt.length > 5000) {
      throw new Error("Prompt exceeds maximum length");
    }
    
    if (type && !['generate', 'edit', 'prompt-to-prompt'].includes(type)) {
      throw new Error("Invalid type parameter");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Enhancing prompt with type:", type);

    let systemPrompt = "";
    
    if (type === "generate") {
      systemPrompt = `You are an expert prompt engineer for AI image generation. Transform simple user prompts into highly detailed, vivid, and professional prompts that will produce stunning AI-generated images.

Follow these guidelines:
- Expand simple ideas into rich, detailed descriptions
- Include artistic style, lighting, composition, and mood
- Add technical photography terms when relevant (e.g., "shot on 35mm", "bokeh", "golden hour")
- Specify colors, textures, and atmospheric details
- Keep the enhanced prompt concise but impactful (2-3 sentences max)
- Focus on visual details that will improve image quality
- Do not include negative prompts or what to avoid

Example:
Input: "a cat in space"
Output: "A majestic orange tabby cat floating gracefully in the cosmos, surrounded by vibrant nebulae in purple and blue hues, with distant galaxies twinkling in the background. Shot with cinematic lighting, capturing the ethereal glow of stardust particles around the cat's whiskers, creating a dreamlike sci-fi atmosphere with rich color depth and sharp focus."`;
    } else if (type === "edit") {
      systemPrompt = `You are an expert prompt engineer for AI image editing. Transform simple editing instructions into precise, detailed prompts that will guide the AI to make exactly the changes the user wants.

Follow these guidelines:
- Expand simple edit requests into specific, actionable instructions
- Describe the desired changes with visual precision
- Include details about style consistency and blending
- Specify lighting, color, and mood adjustments
- Keep the enhanced prompt focused and clear (2-3 sentences max)
- Ensure the edit maintains the original image's coherence

Example:
Input: "make it sunny"
Output: "Transform the scene into a bright sunny day with warm golden sunlight casting soft shadows, clear blue skies with few wispy clouds, and enhanced warm color tones throughout. Increase the overall brightness while maintaining natural contrast, add subtle lens flare effects, and adjust the atmosphere to feel cheerful and inviting."`;
    } else if (type === "prompt-to-prompt") {
      systemPrompt = `You are an expert at analyzing images and creating detailed prompts. Based on the user's rough idea or the image they provide, create a comprehensive, detailed prompt that captures all the visual elements, style, composition, and atmosphere.

Follow these guidelines:
- Describe all key visual elements in the scene
- Include artistic style, medium, and technique
- Specify lighting, colors, and mood
- Add composition and framing details
- Include technical details that enhance quality
- Create a prompt that would recreate the essence of the image
- Keep it detailed but focused (3-4 sentences max)

Example:
Input: "cyberpunk city"
Output: "A sprawling neon-lit cyberpunk metropolis at night, with towering skyscrapers adorned with holographic advertisements in vibrant pink, cyan, and purple. Rain-slicked streets reflect the glowing signs while flying vehicles zip between buildings, creating light trails. Shot in cinematic widescreen with a moody, atmospheric style reminiscent of Blade Runner, featuring dramatic lighting contrasts and a misty, futuristic ambiance."`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const enhancedPrompt = data.choices?.[0]?.message?.content;

    if (!enhancedPrompt) {
      throw new Error("Failed to generate enhanced prompt");
    }

    console.log("Enhanced prompt generated successfully");

    return new Response(
      JSON.stringify({ enhancedPrompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in enhance-prompt function:", error);
    
    // Return generic error to user, log details server-side
    const userMessage = error.message?.includes("maximum length") || 
                       error.message?.includes("required") ||
                       error.message?.includes("Invalid")
      ? error.message 
      : "Failed to enhance prompt. Please try again.";
    
    return new Response(
      JSON.stringify({ error: userMessage }),
      { 
        status: error.message?.includes("Invalid") || error.message?.includes("required") ? 400 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
