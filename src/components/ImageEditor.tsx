import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Wand2, Download, RefreshCw, Save, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useNavigate } from "react-router-dom";

const imageEditSchema = z.object({
  prompt: z.string()
    .min(1, "Prompt is required")
    .max(5000, "Prompt must be less than 5000 characters"),
  imageFile: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, "Image must be less than 10MB")
    .refine(
      (file) => ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type),
      "Only PNG, JPEG, and WEBP images are supported"
    ),
});

export default function ImageEditor() {
  const navigate = useNavigate();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [magicPrompt, setMagicPrompt] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleMagicPrompt = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a simple prompt first");
      return;
    }

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-prompt", {
        body: { prompt, type: "edit" },
      });

      if (error) throw error;

      setMagicPrompt(data.enhancedPrompt);
      toast.success("Prompt enhanced!");
    } catch (error: any) {
      console.error("Error enhancing prompt:", error);
      toast.error(error.message || "Failed to enhance prompt");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleEdit = async () => {
    // Validate inputs
    const finalPrompt = magicPrompt || prompt;
    const validation = imageEditSchema.safeParse({
      prompt: finalPrompt,
      imageFile,
    });

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(", ");
      toast.error(errors);
      return;
    }

    setIsEditing(true);
    try {
      const base64Image = imagePreview?.split(",")[1];

      const { data, error } = await supabase.functions.invoke("edit-image", {
        body: {
          imageBase64: base64Image,
          prompt: finalPrompt,
        },
      });

      if (error) throw error;

      setEditedImage(data.imageUrl);
      toast.success("Image edited successfully!");
    } catch (error: any) {
      console.error("Error editing image:", error);
      toast.error(error.message || "Failed to edit image");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDownload = () => {
    if (!editedImage) return;
    const link = document.createElement("a");
    link.href = editedImage;
    link.download = `ai-edited-${Date.now()}.png`;
    link.click();
  };

  const handleSaveToGallery = async (isPublic: boolean) => {
    if (!editedImage) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Please sign in to save images");
      return;
    }

    setIsSaving(true);
    try {
      const finalPrompt = magicPrompt || prompt;
      const { error } = await supabase
        .from("gallery_images")
        .insert({
          user_id: user.id,
          image_url: editedImage,
          prompt: finalPrompt,
          style: null,
          is_public: isPublic,
        });

      if (error) throw error;

      toast.success(isPublic ? "Published to gallery!" : "Saved to your gallery");
      navigate("/gallery");
    } catch (error: any) {
      console.error("Error saving to gallery:", error);
      toast.error(error.message || "Failed to save image");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Controls */}
      <Card className="p-8 bg-card/30 backdrop-blur-xl border-border/50 neon-glow space-y-6">
        <div>
          <Label className="text-sm font-medium mb-2 block">Upload Image</Label>
          <label
            htmlFor="edit-image-upload"
            className="w-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-primary/50 rounded-xl cursor-pointer hover:border-primary transition-all hover:neon-glow-strong relative overflow-hidden group"
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-xl" />
            ) : (
              <div className="text-center space-y-4">
                <Upload className="mx-auto h-12 w-12 text-primary animate-float" />
                <p className="text-sm font-medium gradient-text">Upload image to edit</p>
                <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </label>
          <input id="edit-image-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Simple Prompt</Label>
          <Textarea
            placeholder="Simple idea: make it sunny, add flowers, change to night..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[80px] bg-card/50 border-border/50 focus:border-primary neon-glow resize-none"
            maxLength={5000}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {prompt.length}/5000 characters
          </p>
          <Button
            onClick={handleMagicPrompt}
            disabled={isEnhancing || !prompt.trim()}
            variant="outline"
            className="mt-2 w-full neon-glow"
          >
            {isEnhancing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Enhancing...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Magic Enhance Prompt
              </>
            )}
          </Button>
        </div>

        {magicPrompt && (
          <div>
            <Label className="text-sm font-medium mb-2 block">Enhanced Prompt</Label>
            <Textarea
              value={magicPrompt}
              onChange={(e) => setMagicPrompt(e.target.value)}
              className="min-h-[120px] bg-card/50 border-border/50 focus:border-primary neon-glow resize-none"
            />
          </div>
        )}

        <Button
          onClick={handleEdit}
          disabled={isEditing || !imageFile || (!prompt.trim() && !magicPrompt.trim())}
          className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-semibold py-6 neon-glow-strong"
        >
          {isEditing ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Editing Image...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-5 w-5" />
              Edit Image
            </>
          )}
        </Button>
      </Card>

      {/* Preview */}
      <Card className="p-8 bg-card/30 backdrop-blur-xl border-border/50 neon-glow flex flex-col items-center justify-center min-h-[600px]">
        {editedImage ? (
          <div className="w-full space-y-4">
            <div className="relative group">
              <img
                src={editedImage}
                alt="Edited"
                className="w-full rounded-lg shadow-2xl neon-glow-strong"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end justify-center pb-8 gap-2">
                <Button onClick={handleDownload} className="neon-glow-strong">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button 
                  onClick={() => handleSaveToGallery(false)} 
                  disabled={isSaving}
                  variant="outline"
                  className="neon-glow-strong"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button 
                  onClick={() => handleSaveToGallery(true)} 
                  disabled={isSaving}
                  className="neon-glow-strong"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Publish
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center justify-center neon-glow animate-neon-pulse">
              <Wand2 className="h-16 w-16 text-primary" />
            </div>
            <p className="text-muted-foreground">Your edited image will appear here</p>
          </div>
        )}
      </Card>
    </div>
  );
}
