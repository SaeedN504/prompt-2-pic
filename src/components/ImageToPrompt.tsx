import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Sparkles, Copy, RefreshCw, Check, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ImageToPrompt() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [magicPrompt, setMagicPrompt] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [style, setStyle] = useState("none");
  const [mood, setMood] = useState("none");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompts, setPrompts] = useState<Record<string, any>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");

  const handleMagicPrompt = async () => {
    if (!textInput.trim()) {
      toast.error("Please enter a simple description first");
      return;
    }

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-prompt", {
        body: { prompt: textInput, type: "prompt-to-prompt" },
      });

      if (error) throw error;

      setMagicPrompt(data.enhancedPrompt);
      toast.success("Description enhanced!");
    } catch (error: any) {
      console.error("Error enhancing prompt:", error);
      toast.error(error.message || "Failed to enhance description");
    } finally {
      setIsEnhancing(false);
    }
  };

  const models = [
    { id: "general", name: "General" },
    { id: "kling_ai", name: "Kling AI" },
    { id: "ideogram", name: "Ideogram" },
    { id: "leonardo_ai", name: "Leonardo AI" },
    { id: "midjourney", name: "MidJourney" },
    { id: "flux", name: "Flux" },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    const finalTextInput = magicPrompt || textInput;
    if (!finalTextInput && !imageFile) {
      toast.error("Please provide an image or text description");
      return;
    }

    setIsGenerating(true);
    try {
      let base64Image = null;
      if (imageFile) {
        base64Image = imagePreview?.split(",")[1];
      }

      const { data, error } = await supabase.functions.invoke("image-to-prompt", {
        body: {
          imageBase64: base64Image,
          textInput: finalTextInput,
          style: style !== "none" ? style : null,
          mood: mood !== "none" ? mood : null,
          negativePrompt: negativePrompt || null,
        },
      });

      if (error) throw error;

      setPrompts(data.prompts);
      setActiveTab("general");
      toast.success("Prompts generated successfully!");
    } catch (error: any) {
      console.error("Error generating prompts:", error);
      toast.error(error.message || "Failed to generate prompts");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copied to clipboard!");
  };

  const renderPromptContent = (modelId: string, promptData: any) => {
    if (typeof promptData === "string") {
      return (
        <div className="relative">
          <Textarea
            value={promptData}
            readOnly
            className="min-h-[150px] bg-card/50 border-border/50 text-foreground resize-none neon-glow"
          />
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2 neon-glow"
            onClick={() => handleCopy(promptData, modelId)}
          >
            {copiedId === modelId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      );
    } else if (promptData?.prompt) {
      return (
        <div className="space-y-4">
          <div className="relative">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Main Prompt</label>
            <Textarea
              value={promptData.prompt}
              readOnly
              className="min-h-[150px] bg-card/50 border-border/50 text-foreground resize-none neon-glow"
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-8 right-2 neon-glow"
              onClick={() => handleCopy(promptData.prompt, `${modelId}-main`)}
            >
              {copiedId === `${modelId}-main` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          {promptData.negative_prompt && (
            <div className="relative">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Negative Prompt</label>
              <Textarea
                value={promptData.negative_prompt}
                readOnly
                className="min-h-[75px] bg-card/50 border-border/50 text-foreground resize-none neon-glow"
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-8 right-2 neon-glow"
                onClick={() => handleCopy(promptData.negative_prompt, `${modelId}-neg`)}
              >
                {copiedId === `${modelId}-neg` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Input Section */}
      <Card className="p-8 bg-card/30 backdrop-blur-xl border-border/50 neon-glow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image Upload */}
          <div className="flex flex-col items-center justify-center">
            <label
              htmlFor="image-upload"
              className="w-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-primary/50 rounded-xl cursor-pointer hover:border-primary transition-all hover:neon-glow-strong relative overflow-hidden group"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-xl" />
              ) : (
                <div className="text-center space-y-4">
                  <Upload className="mx-auto h-12 w-12 text-primary animate-float" />
                  <p className="text-sm font-medium gradient-text">Upload an image</p>
                  <p className="text-xs text-muted-foreground">Or describe your idea below</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </label>
            <input id="image-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
          </div>

          {/* Text Input */}
          <div className="flex flex-col space-y-4">
            <Textarea
              placeholder="Simple description... e.g., cyberpunk city at night"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="min-h-[80px] bg-card/50 border-border/50 focus:border-primary neon-glow resize-none"
            />
            <Button
              onClick={handleMagicPrompt}
              disabled={isEnhancing || !textInput.trim()}
              variant="outline"
              className="w-full neon-glow"
            >
              {isEnhancing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Enhancing...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Magic Enhance Description
                </>
              )}
            </Button>
            {magicPrompt && (
              <Textarea
                value={magicPrompt}
                onChange={(e) => setMagicPrompt(e.target.value)}
                className="min-h-[100px] bg-card/50 border-border/50 focus:border-primary neon-glow resize-none"
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Style</label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger className="bg-card/50 border-border/50 neon-glow">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="photorealistic">Photorealistic</SelectItem>
                    <SelectItem value="anime">Anime</SelectItem>
                    <SelectItem value="cinematic">Cinematic</SelectItem>
                    <SelectItem value="fantasy">Fantasy Art</SelectItem>
                    <SelectItem value="vintage">Vintage</SelectItem>
                    <SelectItem value="abstract">Abstract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Mood</label>
                <Select value={mood} onValueChange={setMood}>
                  <SelectTrigger className="bg-card/50 border-border/50 neon-glow">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="serene">Serene</SelectItem>
                    <SelectItem value="energetic">Energetic</SelectItem>
                    <SelectItem value="ominous">Ominous</SelectItem>
                    <SelectItem value="whimsical">Whimsical</SelectItem>
                    <SelectItem value="melancholic">Melancholic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Negative Prompt</label>
              <Textarea
                placeholder="e.g., blurry, text, watermark"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                className="min-h-[60px] bg-card/50 border-border/50 focus:border-primary neon-glow resize-none"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || ((!textInput && !magicPrompt) && !imageFile)}
          className="w-full mt-8 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-semibold py-6 neon-glow-strong"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Generating Hyper-Detailed Prompts...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Generate Prompts
            </>
          )}
        </Button>
      </Card>

      {/* Results Section */}
      {Object.keys(prompts).length > 0 && (
        <Card className="p-8 bg-card/30 backdrop-blur-xl border-border/50 neon-glow">
          <h2 className="text-2xl font-bold mb-6 gradient-text">Generated Prompts</h2>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 bg-card/50 neon-glow">
              {models.map((model) => (
                <TabsTrigger key={model.id} value={model.id} className="data-[state=active]:neon-glow-strong">
                  {model.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {models.map((model) => (
              <TabsContent key={model.id} value={model.id} className="mt-6">
                {renderPromptContent(model.id, prompts[model.id])}
              </TabsContent>
            ))}
          </Tabs>
        </Card>
      )}
    </div>
  );
}
