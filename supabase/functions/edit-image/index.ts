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

    if (!imageBase64 || !prompt) {
      throw new Error("Image and prompt are required");
    }

    const DECART_API_KEY = Deno.env.get("DECART_API_KEY");
    const DECART_API_KEY_BACKUP = Deno.env.get("DECART_API_KEY_BACKUP");
    
    console.log("API Keys available:", {
      primary: !!DECART_API_KEY,
      backup: !!DECART_API_KEY_BACKUP
    });

    if (!DECART_API_KEY && !DECART_API_KEY_BACKUP) {
      throw new Error("DECART_API_KEY is not configured");
    }

    console.log("Starting image editing with Decart.ai");

    // Try primary key first
    let apiKey = DECART_API_KEY;
    let response: Response | null = null;
    let lastError: Error | null = null;

    if (apiKey) {
      try {
        console.log("Attempting with primary API key");
        response = await fetch("https://api.decart.ai/v1/images/edit", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: `data:image/png;base64,${imageBase64}`,
            prompt: prompt,
            model: "decart-image-edit-v1",
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Primary API key failed:", response.status, errorText);
          lastError = new Error(`Primary key failed: ${response.status}`);
          response = null;
        } else {
          console.log("Primary API key succeeded");
        }
      } catch (e) {
        const error = e as Error;
        console.error("Primary API key error:", error.message);
        lastError = error;
        response = null;
      }
    }

    // If primary failed, try backup key
    if (!response && DECART_API_KEY_BACKUP) {
      console.log("Trying backup key");
      apiKey = DECART_API_KEY_BACKUP;
      
      try {
        response = await fetch("https://api.decart.ai/v1/images/edit", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: `data:image/png;base64,${imageBase64}`,
            prompt: prompt,
            model: "decart-image-edit-v1",
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Backup API key also failed:", response.status, errorText);
          throw new Error(`Both API keys failed. Last error: ${response.status}`);
        } else {
          console.log("Backup API key succeeded");
        }
      } catch (e) {
        const error = e as Error;
        console.error("Backup API key error:", error.message);
        throw new Error(`Both API keys failed. Error: ${error.message}`);
      }
    }

    if (!response) {
      throw lastError || new Error("Failed to edit image with all available API keys");
    }

    const data = await response.json();
    console.log("Response data structure:", Object.keys(data));
    
    if (!data.data?.[0]?.url && !data.data?.[0]?.b64_json) {
      throw new Error("No image data in response");
    }

    let imageUrl;
    if (data.data[0].url) {
      imageUrl = data.data[0].url;
    } else if (data.data[0].b64_json) {
      imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
    }

    console.log("Image edited successfully");

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const err = error as Error;
    console.error("Error in edit-image function:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to edit image" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
