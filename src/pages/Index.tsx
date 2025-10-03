import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImageToPrompt from "@/components/ImageToPrompt";
import ImageGenerator from "@/components/ImageGenerator";
import ImageEditor from "@/components/ImageEditor";
import { Sparkles, Wand2, Pencil } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("prompt");

  return (
    <div className="min-h-screen animated-gradient-bg">
      {/* Animated background overlay */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="text-center mb-12 space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            <span className="gradient-text">AI Creative Studio</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your ideas into stunning visuals with cutting-edge AI technology
          </p>
        </header>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-3 mb-8 bg-card/30 backdrop-blur-xl border border-border/50 neon-glow">
            <TabsTrigger 
              value="prompt" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground data-[state=active]:neon-glow-strong"
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Image to Prompt
            </TabsTrigger>
            <TabsTrigger 
              value="generate"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground data-[state=active]:neon-glow-strong"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Image Generator
            </TabsTrigger>
            <TabsTrigger 
              value="edit"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground data-[state=active]:neon-glow-strong"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Image Editor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="mt-0">
            <ImageToPrompt />
          </TabsContent>

          <TabsContent value="generate" className="mt-0">
            <ImageGenerator />
          </TabsContent>

          <TabsContent value="edit" className="mt-0">
            <ImageEditor />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>Powered by advanced AI models • Free and unlimited during beta</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
