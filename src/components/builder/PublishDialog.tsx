import { useState } from 'react';
import { Rocket, Globe, Download, ExternalLink, Check, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface PublishDialogProps {
  projectName: string;
  preview: string;
  files?: Array<{ path: string; content: string }>;
}

export const PublishDialog = ({ projectName, preview, files = [] }: PublishDialogProps) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'my-site';
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    
    // Simulate publishing (in production, this would call an actual deploy API)
    setTimeout(() => {
      const slug = generateSlug(projectName);
      const url = `https://${slug}.weblitho.app`;
      setPublishedUrl(url);
      setIsPublishing(false);
      toast({
        title: "Site Published! 🎉",
        description: `Your site is now live at ${url}`,
      });
    }, 2000);
  };

  const copyUrl = () => {
    if (publishedUrl) {
      navigator.clipboard.writeText(publishedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "URL copied!" });
    }
  };

  const handleDownload = () => {
    // Create a zip file with all project files
    const htmlContent = preview;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generateSlug(projectName)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Your site has been downloaded as HTML" });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
          disabled={!preview}
        >
          <Rocket className="h-4 w-4" />
          Publish
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Publish Your Site
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="publish" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="publish">Publish</TabsTrigger>
            <TabsTrigger value="download">Download</TabsTrigger>
          </TabsList>

          <TabsContent value="publish" className="space-y-4 pt-4">
            {!publishedUrl ? (
              <>
                <div className="space-y-2">
                  <Label>Site URL</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">https://</span>
                    <Input
                      value={generateSlug(projectName)}
                      className="flex-1"
                      readOnly
                    />
                    <span className="text-sm text-muted-foreground">.weblitho.app</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <h4 className="font-medium mb-2">What's included:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      Free SSL certificate
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      Global CDN delivery
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      Automatic deployments
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      weblitho.app subdomain
                    </li>
                  </ul>
                </div>

                <Button 
                  onClick={handlePublish} 
                  className="w-full gap-2"
                  disabled={isPublishing}
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4" />
                      Publish to Web
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-4">
                    <Check className="h-6 w-6 text-emerald-500" />
                  </div>
                  <h4 className="font-semibold text-lg mb-2">Site Published!</h4>
                  <p className="text-sm text-muted-foreground">Your site is now live</p>
                </div>

                <div className="space-y-2">
                  <Label>Your Site URL</Label>
                  <div className="flex items-center gap-2">
                    <Input value={publishedUrl} readOnly className="flex-1" />
                    <Button variant="outline" size="icon" onClick={copyUrl}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" asChild>
                      <a href={publishedUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Custom Domain (Pro)</Label>
                  <Input
                    placeholder="www.yoursite.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Upgrade to Pro to connect your custom domain
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="download" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleDownload}
                className="p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                    <Download className="h-4 w-4" />
                  </div>
                  <span className="font-medium">HTML</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Single HTML file with embedded CSS
                </p>
              </button>

              <button
                className="p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group opacity-50 cursor-not-allowed"
                disabled
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
                    <Download className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Next.js</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Full Next.js project (Pro)
                </p>
              </button>

              <button
                className="p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group opacity-50 cursor-not-allowed"
                disabled
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                    <Download className="h-4 w-4" />
                  </div>
                  <span className="font-medium">React</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  React + Vite project (Pro)
                </p>
              </button>

              <button
                className="p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group opacity-50 cursor-not-allowed"
                disabled
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                    <Download className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Vue</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Vue.js project (Pro)
                </p>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
              <p className="text-sm text-muted-foreground">
                <strong>Pro tip:</strong> Download as HTML to host on any static hosting provider like Netlify, Vercel, or GitHub Pages.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
