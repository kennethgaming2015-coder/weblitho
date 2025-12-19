import { useState, useRef } from 'react';
import { ImagePlus, Upload, Sparkles, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface ImageToCodeProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
}

export const ImageToCode = ({ onGenerate, isGenerating }: ImageToCodeProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, or WebP)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleGenerate = () => {
    if (!selectedImage) {
      toast({
        title: "No image selected",
        description: "Please upload a design image first",
        variant: "destructive",
      });
      return;
    }

    // Create a detailed prompt based on the image
    const basePrompt = `Convert this design image to a pixel-perfect, responsive website. 
    
Match the exact:
- Layout and spacing
- Colors and gradients
- Typography and fonts
- Component styling
- Visual hierarchy

${additionalPrompt ? `Additional requirements: ${additionalPrompt}` : ''}

Create a production-quality implementation with smooth animations and hover effects.`;

    onGenerate(basePrompt);
    setIsOpen(false);
    toast({
      title: "Generating from design",
      description: "Converting your design to code...",
    });
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ImagePlus className="h-4 w-4" />
          <span className="hidden md:inline">Design to Code</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Image to Code
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload area */}
          <div
            className={`relative border-2 border-dashed rounded-xl transition-all ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : selectedImage 
                  ? 'border-border/30' 
                  : 'border-border/50 hover:border-primary/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {selectedImage ? (
              <div className="relative">
                <img 
                  src={selectedImage} 
                  alt="Design preview" 
                  className="w-full h-64 object-contain rounded-lg"
                />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ) : (
              <div 
                className="p-8 text-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-medium mb-1">Drop your design here</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports PNG, JPG, WebP up to 10MB
                </p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />

          {/* Additional instructions */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional instructions (optional)</label>
            <Textarea
              placeholder="e.g., Use a dark theme, add smooth hover animations, make the hero section full-screen..."
              value={additionalPrompt}
              onChange={(e) => setAdditionalPrompt(e.target.value)}
              rows={3}
            />
          </div>

          {/* Tips */}
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <h4 className="text-sm font-medium text-amber-400 mb-2">💡 Tips for best results:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Upload high-resolution screenshots or mockups</li>
              <li>• Figma/Sketch exports work great</li>
              <li>• Include full page designs for better accuracy</li>
              <li>• Add specific requirements in the text field</li>
            </ul>
          </div>

          {/* Generate button */}
          <Button 
            onClick={handleGenerate} 
            className="w-full gap-2"
            disabled={!selectedImage || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Code from Design
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
