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
    const { images, prompt } = await req.json();
    
    if (!images || !Array.isArray(images) || images.length < 1) {
      throw new Error("At least one image is required");
    }

    if (images.length > 4) {
      throw new Error("Maximum 4 images can be remixed at once");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Create a remix prompt that combines the images
    const remixPrompt = prompt || 
      "Creatively blend and fuse these images together into a single stunning, cohesive artwork. Maintain the best elements of each image while creating smooth transitions and a unified composition. The result should be visually striking and artistically impressive.";

    // For single image, just enhance it
    if (images.length === 1) {
      const enhancedPrompt = `${remixPrompt} Ultra high resolution, stunning details, professional quality.`;
      
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
                  text: enhancedPrompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: images[0]
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
        console.error("AI error:", response.status, errorText);
        throw new Error(`Image remix failed: ${response.status}`);
      }

      const data = await response.json();
      const remixedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!remixedImageUrl) {
        throw new Error("No image in response");
      }

      return new Response(
        JSON.stringify({ imageUrl: remixedImageUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For multiple images, create a descriptive prompt and generate
    const multiImagePrompt = `${remixPrompt} Create an artistic fusion combining elements from ${images.length} different images. Ultra high resolution, stunning composition, professional artistic quality, seamless blending.`;

    // Use the first image as base with text instruction
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
                text: multiImagePrompt
              },
              ...images.map(img => ({
                type: "image_url",
                image_url: { url: img }
              }))
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI error:", response.status, errorText);
      throw new Error(`Image remix failed: ${response.status}`);
    }

    const data = await response.json();
    const remixedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!remixedImageUrl) {
      throw new Error("No image in response");
    }

    return new Response(
      JSON.stringify({ imageUrl: remixedImageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const err = error as Error;
    console.error("Error in remix-images:", err.message);
    
    return new Response(
      JSON.stringify({ error: err.message || "Failed to remix images" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
