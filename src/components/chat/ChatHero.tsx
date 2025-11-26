import { Sparkles, Code2, Zap, Shield } from "lucide-react";

export const ChatHero = () => {
  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-12 md:py-20 animate-fade-in">
      <div className="text-center space-y-6">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full" />
          <div className="relative h-20 w-20 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="h-10 w-10 text-white animate-pulse" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent leading-tight">
            QubeAI Builder
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Build stunning websites and secure smart contracts with AI
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 max-w-3xl mx-auto">
          <div className="p-6 rounded-2xl bg-card/50 backdrop-blur border border-border/50 hover:border-primary/50 transition-all hover:shadow-glow">
            <Code2 className="h-8 w-8 text-primary mb-3 mx-auto" />
            <h3 className="font-semibold mb-2">Web Builder</h3>
            <p className="text-sm text-muted-foreground">Generate beautiful, responsive websites instantly</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-card/50 backdrop-blur border border-border/50 hover:border-primary/50 transition-all hover:shadow-glow">
            <Shield className="h-8 w-8 text-primary mb-3 mx-auto" />
            <h3 className="font-semibold mb-2">Smart Contracts</h3>
            <p className="text-sm text-muted-foreground">Create secure Solidity contracts for Qubetics L1</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-card/50 backdrop-blur border border-border/50 hover:border-primary/50 transition-all hover:shadow-glow">
            <Zap className="h-8 w-8 text-primary mb-3 mx-auto" />
            <h3 className="font-semibold mb-2">AI Powered</h3>
            <p className="text-sm text-muted-foreground">QubeAI 2.0 with advanced model options</p>
          </div>
        </div>
      </div>
    </div>
  );
};
