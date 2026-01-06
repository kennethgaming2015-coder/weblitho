import { useState, useRef, useCallback, useEffect } from "react";
import { Image, Upload, Trash2, Copy, X, Plus, FolderOpen, Link, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useImageUpload, UploadedImage } from "@/hooks/useImageUpload";
import { cn } from "@/lib/utils";

interface AssetLibraryProps {
  onInsertImage?: (url: string) => void;
  onSelectImage?: (image: UploadedImage) => void;
}

export const AssetLibrary = ({ onInsertImage, onSelectImage }: AssetLibraryProps) => {
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { images, uploading, uploadImage, deleteImage, fetchUserImages } = useImageUpload();

  // Fetch images when dialog opens
  useEffect(() => {
    if (open) {
      fetchUserImages();
    }
  }, [open, fetchUserImages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await uploadImage(file);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    for (const file of files) {
      await uploadImage(file);
    }
  }, [uploadImage]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleCopyUrl = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast({ title: "URL copied", description: "Image URL copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsert = (url: string) => {
    if (onInsertImage) {
      onInsertImage(url);
    }
    setOpen(false);
  };

  const handleUrlInsert = () => {
    if (urlInput.trim()) {
      handleInsert(urlInput.trim());
      setUrlInput("");
    }
  };

  const handleDelete = async (imageId: string) => {
    await deleteImage(imageId);
    if (selectedImage?.id === imageId) {
      setSelectedImage(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Image className="h-4 w-4" />
          <span className="hidden md:inline">Assets</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Asset Library
          </DialogTitle>
          <DialogDescription>
            Upload and manage images for your website
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="library" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library" className="gap-2">
              <Image className="h-4 w-4" />
              My Images
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <Link className="h-4 w-4" />
              URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-4 space-y-4">
            {/* Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                dragActive 
                  ? "border-primary bg-primary/5" 
                  : "border-border/60 hover:border-primary/50"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2">
                {uploading ? (
                  <>
                    <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </>
                ) : (
                  <>
                    <div className="p-3 rounded-full bg-primary/10">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Drop images here or click to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, GIF, WebP up to 5MB
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Image Grid */}
            <ScrollArea className="h-[350px]">
              {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Image className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No images yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Upload images to use in your website
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className={cn(
                        "group relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
                        selectedImage?.id === image.id 
                          ? "border-primary ring-2 ring-primary/20" 
                          : "border-border/60 hover:border-primary/50"
                      )}
                      onClick={() => setSelectedImage(image)}
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-white hover:bg-white/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyUrl(image.url, image.id);
                            }}
                          >
                            {copiedId === image.id ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-white hover:bg-red-500/80"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(image.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="text-white">
                          <p className="text-xs truncate font-medium">{image.name}</p>
                          <p className="text-[10px] opacity-70">{formatFileSize(image.size)}</p>
                        </div>
                      </div>

                      {/* Selection indicator */}
                      {selectedImage?.id === image.id && (
                        <div className="absolute top-2 left-2 p-1 bg-primary rounded-full">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Selected Image Info & Actions */}
            {selectedImage && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-3 overflow-hidden">
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate">{selectedImage.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedImage.size)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyUrl(selectedImage.url, selectedImage.id)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy URL
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleInsert(selectedImage.url)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Insert
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="url" className="mt-4 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Enter an image URL to use in your website
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUrlInsert()}
                />
                <Button onClick={handleUrlInsert} disabled={!urlInput.trim()}>
                  Insert
                </Button>
              </div>
            </div>

            {/* URL Preview */}
            {urlInput && (
              <div className="border rounded-lg overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <img
                    src={urlInput}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="p-4 bg-muted/50 rounded-lg text-sm">
              <p className="font-medium mb-2">Tips for image URLs:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                <li>Use direct image links (ending in .jpg, .png, .gif, .webp)</li>
                <li>Ensure the image is publicly accessible</li>
                <li>Consider using a CDN for faster loading</li>
                <li>Recommended formats: WebP for best compression, PNG for transparency</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
