import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Download, Upload, RefreshCw, Wand2, Save, Film, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useStateWithLocalStorage } from "@/hooks/useStateWithLocalStorage";

const adGenSchema = z.object({
  prompt: z.string()
    .min(1, "Prompt is required")
    .max(5000, "Prompt must be less than 5000 characters"),
});

export default function AdGenerator() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [prompt, setPrompt] = useStateWithLocalStorage("adGenerator.prompt", "");
  const [magicPrompt, setMagicPrompt] = useStateWithLocalStorage("adGenerator.magicPrompt", "");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [productImage, setProductImage] = useStateWithLocalStorage<string | null>("adGenerator.productImage", null);
  const [cinematicMode, setCinematicMode] = useStateWithLocalStorage("adGenerator.cinematicMode", true);
  const [hyperRealistic, setHyperRealistic] = useStateWithLocalStorage("adGenerator.hyperRealistic", true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useStateWithLocalStorage<string | null>("adGenerator.generatedImage", null);
  const [isSaving, setIsSaving] = useState(false);

  const translateToEnglish = async (text: string): Promise<string> => {
    if (language === "en") return text;
    return text;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setProductImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMagicPrompt = async () => {
    if (!prompt.trim()) {
      toast.error(t("toast.enterPrompt"));
      return;
    }

    setIsEnhancing(true);
    try {
      const englishPrompt = await translateToEnglish(prompt);
      
      // Enhanced system prompt specifically for advertising
      const adSystemPrompt = `You are an expert advertising copywriter and creative director. Transform the following product/brand description into a hyper-detailed, cinematic advertising prompt that will create a mesmerizing, award-winning commercial image.

Focus on:
- Dramatic lighting and composition
- Luxury and premium aesthetic
- Emotional impact and storytelling
- Product hero shot principles
- Brand elevation and aspirational qualities
- Cinematic depth of field and bokeh
- Professional advertising photography techniques
- Color grading and mood

The input is: ${englishPrompt}

Create a detailed prompt that emphasizes ${cinematicMode ? 'cinematic, film-like quality with dramatic lighting, depth, and professional color grading' : 'clean, professional product photography'} and ${hyperRealistic ? 'hyper-realistic, photo-quality details with perfect textures and materials' : 'stylized artistic interpretation'}.`;

      const { data, error } = await supabase.functions.invoke("enhance-prompt", {
        body: { 
          prompt: adSystemPrompt,
          type: "generate"
        },
      });

      if (error) throw error;

      setMagicPrompt(data.enhancedPrompt);
      toast.success(t("toast.promptEnhanced"));
    } catch (error: any) {
      console.error("Error enhancing prompt:", error);
      toast.error(error.message || "Failed to enhance prompt");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    const finalPrompt = magicPrompt || prompt;
    const validation = adGenSchema.safeParse({
      prompt: finalPrompt,
    });

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(", ");
      toast.error(errors);
      return;
    }

    setIsGenerating(true);
    try {
      const englishPrompt = await translateToEnglish(finalPrompt);
      
      // Add advertising-specific enhancements to the prompt
      let enhancedAdPrompt = englishPrompt;
      
      if (cinematicMode) {
        enhancedAdPrompt += ", cinematic lighting, dramatic shadows, film grain, shallow depth of field, bokeh background, professional color grading, anamorphic lens flare";
      }
      
      if (hyperRealistic) {
        enhancedAdPrompt += ", hyper-realistic, photo-realistic, 8k uhd, high detail, sharp focus, studio lighting, physically-based rendering, extreme detail description, professional photography";
      }
      
      enhancedAdPrompt += ", award-winning advertising photography, commercial product shot, magazine quality, luxury aesthetic, premium branding";

      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          prompt: enhancedAdPrompt,
          style: "photorealistic",
          aspectRatio: "16:9",
          quality: "ultra",
          negativePrompt: "cartoon, illustration, painting, drawing, art, sketch, low quality, blurry, distorted, ugly, bad composition, amateur, unprofessional",
        },
      });

      if (error) throw error;

      setGeneratedImage(data.imageUrl);
      toast.success(t("toast.adGenerated"));
    } catch (error: any) {
      console.error("Error generating ad:", error);
      toast.error(error.message || "Failed to generate ad image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `ai-ad-${Date.now()}.png`;
    link.click();
  };

  const handleSaveToGallery = async (isPublic: boolean) => {
    if (!generatedImage) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error(t("toast.pleaseSignIn"));
      return;
    }

    setIsSaving(true);
    try {
      const finalPrompt = magicPrompt || prompt;
      const { error } = await supabase
        .from("gallery_images")
        .insert({
          user_id: user.id,
          image_url: generatedImage,
          prompt: finalPrompt,
          style: "advertising",
          is_public: isPublic,
        });

      if (error) throw error;

      toast.success(isPublic ? t("toast.publishedToGallery") : t("toast.savedToGallery"));
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
      <Card className="p-8 bg-card/30 backdrop-blur-xl border-border/50 neon-glow space-y-6 animate-slide-in">
        {/* Product Image Upload */}
        <div>
          <Label className="text-sm font-medium mb-2 block">{t("ad.uploadProduct")}</Label>
          <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-primary/50 transition-all neon-glow cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="product-upload"
            />
            <label htmlFor="product-upload" className="cursor-pointer">
              {productImage ? (
                <img src={productImage} alt="Product" className="max-h-32 mx-auto rounded-lg mb-2" />
              ) : (
                <Upload className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">{t("ad.uploadInfo")}</p>
            </label>
          </div>
        </div>

        {/* Prompt Input */}
        <div className="running-border">
          <div className="bg-card p-4 rounded-md">
            <Label className="text-sm font-medium mb-2 block">{t("ad.productPrompt")}</Label>
            <Textarea
              placeholder={t("ad.productPromptPlaceholder")}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] bg-card/50 border-border/50 focus:border-primary resize-none transition-all"
              maxLength={5000}
              showCopy={true}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {prompt.length}/5000
            </p>
            <Button
              onClick={handleMagicPrompt}
              disabled={isEnhancing || !prompt.trim()}
              variant="outline"
              className="mt-2 w-full neon-glow animate-pulse-glow"
            >
              {isEnhancing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t("ad.enhancing")}
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  {t("ad.magicEnhanceAd")}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Enhanced Prompt */}
        {magicPrompt && (
          <div className="running-border">
            <div className="bg-card p-4 rounded-md">
              <Label className="text-sm font-medium mb-2 block">{t("ad.enhancedPrompt")}</Label>
              <Textarea
                value={magicPrompt}
                onChange={(e) => setMagicPrompt(e.target.value)}
                className="min-h-[120px] bg-card/50 border-border/50 focus:border-primary resize-none transition-all"
                showCopy={true}
              />
            </div>
          </div>
        )}

        {/* Cinematic & Hyper-Realistic Toggles */}
        <div className="space-y-4 p-4 bg-card/50 rounded-lg border border-border/50 neon-glow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" />
              <Label className="text-sm font-medium cursor-pointer" htmlFor="cinematic">
                {t("ad.cinematicMode")}
              </Label>
            </div>
            <Switch
              id="cinematic"
              checked={cinematicMode}
              onCheckedChange={setCinematicMode}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <Label className="text-sm font-medium cursor-pointer" htmlFor="hyperrealistic">
                {t("ad.hyperRealistic")}
              </Label>
            </div>
            <Switch
              id="hyperrealistic"
              checked={hyperRealistic}
              onCheckedChange={setHyperRealistic}
            />
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || (!prompt.trim() && !magicPrompt.trim())}
          className="w-full bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 text-primary-foreground font-semibold py-6 neon-glow-strong animate-pulse-glow"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              {t("ad.generatingAd")}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              {t("ad.generateAd")}
            </>
          )}
        </Button>
      </Card>

      {/* Preview */}
      <Card className="p-8 bg-card/30 backdrop-blur-xl border-border/50 neon-glow flex flex-col items-center justify-center min-h-[600px] animate-fade-in-up">
        {generatedImage ? (
          <div className="w-full space-y-4">
            <div className="relative group">
              <img
                src={generatedImage}
                alt="Generated Ad"
                className="w-full rounded-lg shadow-2xl neon-glow-strong transition-transform hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end justify-center pb-8 gap-2">
                <Button onClick={handleDownload} className="neon-glow-strong">
                  <Download className="mr-2 h-4 w-4" />
                  {t("common.download")}
                </Button>
                <Button 
                  onClick={() => handleSaveToGallery(false)} 
                  disabled={isSaving}
                  variant="outline"
                  className="neon-glow-strong"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {t("common.save")}
                </Button>
                <Button 
                  onClick={() => handleSaveToGallery(true)} 
                  disabled={isSaving}
                  className="neon-glow-strong"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t("common.publish")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center neon-glow animate-neon-pulse">
              <Sparkles className="h-16 w-16 text-primary animate-rotate-slow" />
            </div>
            <p className="text-muted-foreground">{t("ad.imagePreview")}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
