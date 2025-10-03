import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Sparkles, Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("none");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quality, setQuality] = useState("medium");
  const [seed, setSeed] = useState<number>(Math.floor(Math.random() * 1000000));
  const [negativePrompt, setNegativePrompt] = useState("blurry, text, watermark, low quality");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          prompt,
          style: style !== "none" ? style : null,
          aspectRatio,
          quality,
          seed,
          negativePrompt,
        },
      });

      if (error) throw error;

      setGeneratedImage(data.imageUrl);
      toast.success("Image generated successfully!");
    } catch (error: any) {
      console.error("Error generating image:", error);
      toast.error(error.message || "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `ai-generated-${Date.now()}.png`;
    link.click();
  };

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Controls */}
      <Card className="p-8 bg-card/30 backdrop-blur-xl border-border/50 neon-glow space-y-6">
        <div>
          <Label className="text-sm font-medium mb-2 block">Prompt</Label>
          <Textarea
            placeholder="Describe your image in detail..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px] bg-card/50 border-border/50 focus:border-primary neon-glow resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Style</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="bg-card/50 border-border/50 neon-glow">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="photorealistic">Photorealistic</SelectItem>
                <SelectItem value="anime">Anime</SelectItem>
                <SelectItem value="fantasy">Fantasy</SelectItem>
                <SelectItem value="vintage">Vintage</SelectItem>
                <SelectItem value="cinematic">Cinematic</SelectItem>
                <SelectItem value="abstract">Abstract</SelectItem>
                <SelectItem value="watercolor">Watercolor</SelectItem>
                <SelectItem value="oil-painting">Oil Painting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="bg-card/50 border-border/50 neon-glow">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1:1">Square (1:1)</SelectItem>
                <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                <SelectItem value="9:16">Portrait (9:16)</SelectItem>
                <SelectItem value="4:3">Standard (4:3)</SelectItem>
                <SelectItem value="3:2">Photo (3:2)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Quality</Label>
          <Select value={quality} onValueChange={setQuality}>
            <SelectTrigger className="bg-card/50 border-border/50 neon-glow">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft (Fast)</SelectItem>
              <SelectItem value="medium">Medium (Balanced)</SelectItem>
              <SelectItem value="high">High (Detailed)</SelectItem>
              <SelectItem value="ultra">Ultra (Maximum Quality)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">Seed: {seed}</Label>
            <Button size="sm" variant="ghost" onClick={randomizeSeed} className="neon-glow">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <Slider
            value={[seed]}
            onValueChange={([value]) => setSeed(value)}
            max={999999}
            step={1}
            className="neon-glow"
          />
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Negative Prompt</Label>
          <Textarea
            placeholder="What to avoid..."
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            className="min-h-[80px] bg-card/50 border-border/50 focus:border-primary neon-glow resize-none"
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-semibold py-6 neon-glow-strong"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Generating Image...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Generate Image
            </>
          )}
        </Button>
      </Card>

      {/* Preview */}
      <Card className="p-8 bg-card/30 backdrop-blur-xl border-border/50 neon-glow flex flex-col items-center justify-center min-h-[600px]">
        {generatedImage ? (
          <div className="w-full space-y-4">
            <div className="relative group">
              <img
                src={generatedImage}
                alt="Generated"
                className="w-full rounded-lg shadow-2xl neon-glow-strong"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end justify-center pb-8">
                <Button onClick={handleDownload} className="neon-glow-strong">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center justify-center neon-glow animate-neon-pulse">
              <Sparkles className="h-16 w-16 text-primary" />
            </div>
            <p className="text-muted-foreground">Your generated image will appear here</p>
          </div>
        )}
      </Card>
    </div>
  );
}
