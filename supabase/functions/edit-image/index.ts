import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("edit-image function called");
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, prompt } = await req.json();
    console.log("Received request with prompt:", prompt?.substring(0, 50));

    // Input validation
    if (!imageBase64 || !prompt) {
      throw new Error("Image and prompt are required");
    }
    
    if (typeof prompt !== 'string' || typeof imageBase64 !== 'string') {
      throw new Error("Invalid input format");
    }
    
    if (prompt.length > 5000) {
      throw new Error("Prompt exceeds maximum length of 5000 characters");
    }
    
    // Validate base64 image size (roughly 10MB limit when encoded)
    const estimatedSize = (imageBase64.length * 3) / 4;
    if (estimatedSize > 10 * 1024 * 1024) {
      throw new Error("Image size exceeds 10MB limit");
    }
    
    // Basic base64 format validation
    if (!/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
      throw new Error("Invalid image format");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Starting image editing with Lovable AI");

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
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error(`Image editing failed: ${response.status}`);
    }

    const data = await response.json();
    console.log("Response received from Lovable AI");
    
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      throw new Error("No image data in response");
    }

    console.log("Image edited successfully");

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const err = error as Error;
    console.error("Error in edit-image function:", err.message);
    
    // Return generic error to user, log details server-side
    const userMessage = err.message?.includes("required") || 
                       err.message?.includes("Invalid") ||
                       err.message?.includes("exceeds") ||
                       err.message?.includes("limit")
      ? err.message 
      : "Failed to edit image. Please try again.";
    
    return new Response(
      JSON.stringify({ error: userMessage }),
      { 
        status: err.message?.includes("Invalid") || err.message?.includes("required") ? 400 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
