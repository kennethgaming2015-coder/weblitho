import { useState, useEffect } from "react";
import { Globe, FileText, Image, Share2, Search, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export interface SEOData {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: "summary" | "summary_large_image";
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  favicon: string;
  canonicalUrl: string;
}

interface SEOEditorProps {
  seoData: SEOData;
  onSave: (data: SEOData) => void;
  onApplyToCode?: (data: SEOData) => void;
}

const defaultSEO: SEOData = {
  title: "",
  description: "",
  keywords: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  twitterCard: "summary_large_image",
  twitterTitle: "",
  twitterDescription: "",
  twitterImage: "",
  favicon: "",
  canonicalUrl: "",
};

export const SEOEditor = ({ seoData = defaultSEO, onSave, onApplyToCode }: SEOEditorProps) => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SEOData>(seoData);
  const { toast } = useToast();

  useEffect(() => {
    setData(seoData);
  }, [seoData]);

  const handleSave = () => {
    onSave(data);
    toast({ title: "SEO settings saved", description: "Your SEO metadata has been updated" });
    setOpen(false);
  };

  const handleApplyToCode = () => {
    if (onApplyToCode) {
      onApplyToCode(data);
      toast({ title: "Applied to code", description: "SEO meta tags have been injected into your HTML" });
    }
  };

  const updateField = (field: keyof SEOData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  // Character count helpers
  const titleLength = data.title.length;
  const descLength = data.description.length;
  const titleOk = titleLength > 0 && titleLength <= 60;
  const descOk = descLength > 0 && descLength <= 160;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          <span className="hidden md:inline">SEO</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            SEO & Meta Editor
          </DialogTitle>
          <DialogDescription>
            Optimize your website for search engines and social media sharing
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic" className="gap-2">
              <FileText className="h-4 w-4" />
              Basic
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-2">
              <Share2 className="h-4 w-4" />
              Social
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Search className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Page Title</Label>
                <Badge variant={titleOk ? "default" : "destructive"} className="text-xs">
                  {titleLength}/60
                  {titleOk ? <Check className="h-3 w-3 ml-1" /> : <X className="h-3 w-3 ml-1" />}
                </Badge>
              </div>
              <Input
                id="title"
                placeholder="My Awesome Website"
                value={data.title}
                onChange={(e) => updateField("title", e.target.value)}
                className={titleLength > 60 ? "border-destructive" : ""}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 50-60 characters
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Meta Description</Label>
                <Badge variant={descOk ? "default" : "destructive"} className="text-xs">
                  {descLength}/160
                  {descOk ? <Check className="h-3 w-3 ml-1" /> : <X className="h-3 w-3 ml-1" />}
                </Badge>
              </div>
              <Textarea
                id="description"
                placeholder="A brief description of your website..."
                value={data.description}
                onChange={(e) => updateField("description", e.target.value)}
                className={descLength > 160 ? "border-destructive" : ""}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 120-160 characters
              </p>
            </div>

            {/* Keywords */}
            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords</Label>
              <Input
                id="keywords"
                placeholder="website, builder, ai, design"
                value={data.keywords}
                onChange={(e) => updateField("keywords", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated keywords (less important for modern SEO)
              </p>
            </div>

            {/* Canonical URL */}
            <div className="space-y-2">
              <Label htmlFor="canonical">Canonical URL</Label>
              <Input
                id="canonical"
                placeholder="https://example.com/page"
                value={data.canonicalUrl}
                onChange={(e) => updateField("canonicalUrl", e.target.value)}
              />
            </div>

            {/* Favicon */}
            <div className="space-y-2">
              <Label htmlFor="favicon">Favicon URL</Label>
              <Input
                id="favicon"
                placeholder="https://example.com/favicon.ico"
                value={data.favicon}
                onChange={(e) => updateField("favicon", e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-6 mt-4">
            {/* Open Graph */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Open Graph (Facebook, LinkedIn)
              </h3>
              <div className="space-y-3 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="ogTitle">OG Title</Label>
                  <Input
                    id="ogTitle"
                    placeholder="Leave empty to use page title"
                    value={data.ogTitle}
                    onChange={(e) => updateField("ogTitle", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ogDescription">OG Description</Label>
                  <Textarea
                    id="ogDescription"
                    placeholder="Leave empty to use meta description"
                    value={data.ogDescription}
                    onChange={(e) => updateField("ogDescription", e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ogImage">OG Image URL</Label>
                  <Input
                    id="ogImage"
                    placeholder="https://example.com/og-image.jpg"
                    value={data.ogImage}
                    onChange={(e) => updateField("ogImage", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended: 1200x630 pixels
                  </p>
                </div>
              </div>
            </div>

            {/* Twitter Card */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Image className="h-4 w-4" />
                Twitter Card
              </h3>
              <div className="space-y-3 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="twitterCard">Card Type</Label>
                  <select
                    id="twitterCard"
                    value={data.twitterCard}
                    onChange={(e) => updateField("twitterCard", e.target.value as "summary" | "summary_large_image")}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="summary">Summary</option>
                    <option value="summary_large_image">Summary Large Image</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitterTitle">Twitter Title</Label>
                  <Input
                    id="twitterTitle"
                    placeholder="Leave empty to use OG title"
                    value={data.twitterTitle}
                    onChange={(e) => updateField("twitterTitle", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitterDescription">Twitter Description</Label>
                  <Textarea
                    id="twitterDescription"
                    placeholder="Leave empty to use OG description"
                    value={data.twitterDescription}
                    onChange={(e) => updateField("twitterDescription", e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitterImage">Twitter Image URL</Label>
                  <Input
                    id="twitterImage"
                    placeholder="Leave empty to use OG image"
                    value={data.twitterImage}
                    onChange={(e) => updateField("twitterImage", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6 mt-4">
            {/* Google Preview */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Google Search Preview</h3>
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="text-blue-600 dark:text-blue-400 text-lg hover:underline cursor-pointer truncate">
                  {data.title || "Page Title"}
                </div>
                <div className="text-green-700 dark:text-green-500 text-sm truncate">
                  {data.canonicalUrl || "https://example.com/page"}
                </div>
                <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {data.description || "Meta description will appear here..."}
                </div>
              </div>
            </div>

            {/* Social Preview */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Social Media Preview</h3>
              <div className="rounded-lg border overflow-hidden">
                {(data.ogImage || data.twitterImage) && (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <img
                      src={data.ogImage || data.twitterImage}
                      alt="OG Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    {!data.ogImage && !data.twitterImage && (
                      <Image className="h-12 w-12 text-muted-foreground/50" />
                    )}
                  </div>
                )}
                {!data.ogImage && !data.twitterImage && (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <Image className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                )}
                <div className="p-3 bg-card">
                  <div className="text-xs text-muted-foreground uppercase">
                    {data.canonicalUrl ? new URL(data.canonicalUrl).hostname : "example.com"}
                  </div>
                  <div className="font-semibold mt-1 truncate">
                    {data.ogTitle || data.title || "Page Title"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {data.ogDescription || data.description || "Description..."}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {onApplyToCode && (
              <Button variant="secondary" onClick={handleApplyToCode}>
                Apply to Code
              </Button>
            )}
            <Button onClick={handleSave}>
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
