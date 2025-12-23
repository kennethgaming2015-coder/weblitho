import { useState } from 'react';
import { Rocket, Globe, Download, ExternalLink, Check, Copy, Loader2, Key, Settings, ChevronRight } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';

interface PublishDialogProps {
  projectName: string;
  preview: string;
  files?: Array<{ path: string; content: string }>;
}

type Provider = 'netlify' | 'vercel';

interface DeploymentResult {
  success: boolean;
  url?: string;
  error?: string;
  deployId?: string;
}

export const PublishDialog = ({ projectName, preview, files = [] }: PublishDialogProps) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [netlifyToken, setNetlifyToken] = useState('');
  const [vercelToken, setVercelToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<string>('');
  const { toast } = useToast();

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'my-site';
  };

  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider);
    const token = provider === 'netlify' ? netlifyToken : vercelToken;
    if (!token) {
      setShowTokenInput(true);
    } else {
      handleDeploy(provider, token);
    }
  };

  const handleDeploy = async (provider: Provider, token: string) => {
    if (!token) {
      toast({
        title: "Token Required",
        description: `Please enter your ${provider} access token`,
        variant: "destructive",
      });
      return;
    }

    setIsDeploying(true);
    setShowTokenInput(false);
    setDeploymentStatus('Preparing files...');

    try {
      // Prepare files for deployment
      const deployFiles = files.length > 0 
        ? files 
        : [{ path: 'index.html', content: preview }];

      setDeploymentStatus(`Connecting to ${provider}...`);

      const { data, error } = await supabase.functions.invoke('deploy-site', {
        body: {
          provider,
          accessToken: token,
          projectName: generateSlug(projectName),
          files: deployFiles,
          htmlContent: preview,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      const result = data as DeploymentResult;

      if (result.success && result.url) {
        setDeployedUrl(result.url);
        setDeploymentStatus('');
        toast({
          title: "Deployment Successful! 🎉",
          description: `Your site is live at ${result.url}`,
        });
      } else {
        throw new Error(result.error || 'Deployment failed');
      }
    } catch (error) {
      console.error('Deployment error:', error);
      setDeploymentStatus('');
      toast({
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const copyUrl = () => {
    if (deployedUrl) {
      navigator.clipboard.writeText(deployedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "URL copied!" });
    }
  };

  const handleDownload = () => {
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

  const resetDeployment = () => {
    setDeployedUrl(null);
    setSelectedProvider(null);
    setShowTokenInput(false);
  };

  const ProviderCard = ({ 
    provider, 
    name, 
    logo, 
    color,
    description 
  }: { 
    provider: Provider; 
    name: string; 
    logo: React.ReactNode;
    color: string;
    description: string;
  }) => (
    <button
      onClick={() => handleProviderSelect(provider)}
      disabled={isDeploying}
      className={`p-4 rounded-xl border border-border/50 hover:border-${color}/50 hover:bg-${color}/5 transition-all text-left group w-full disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {logo}
          <span className="font-semibold">{name}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </button>
  );

  return (
    <Dialog onOpenChange={(open) => !open && resetDeployment()}>
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

        <Tabs defaultValue="deploy" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="deploy">Deploy</TabsTrigger>
            <TabsTrigger value="download">Download</TabsTrigger>
          </TabsList>

          <TabsContent value="deploy" className="space-y-4 pt-4">
            {isDeploying ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <Rocket className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Deploying to {selectedProvider}...</p>
                  <p className="text-sm text-muted-foreground">{deploymentStatus}</p>
                </div>
              </div>
            ) : deployedUrl ? (
              <div className="space-y-4">
                <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-4">
                    <Check className="h-6 w-6 text-emerald-500" />
                  </div>
                  <h4 className="font-semibold text-lg mb-2">Site Deployed!</h4>
                  <p className="text-sm text-muted-foreground">
                    Your site is now live on {selectedProvider}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Your Live URL</Label>
                  <div className="flex items-center gap-2">
                    <Input value={deployedUrl} readOnly className="flex-1 font-mono text-sm" />
                    <Button variant="outline" size="icon" onClick={copyUrl}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" asChild>
                      <a href={deployedUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={resetDeployment}
                >
                  Deploy to Another Platform
                </Button>
              </div>
            ) : showTokenInput && selectedProvider ? (
              <div className="space-y-4">
                <button 
                  onClick={() => setShowTokenInput(false)}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  ← Back to providers
                </button>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Key className="h-4 w-4 text-primary" />
                    <span className="font-medium capitalize">{selectedProvider} Access Token</span>
                  </div>
                  
                  <div className="space-y-3">
                    <Input
                      type="password"
                      placeholder={`Enter your ${selectedProvider} access token`}
                      value={selectedProvider === 'netlify' ? netlifyToken : vercelToken}
                      onChange={(e) => selectedProvider === 'netlify' 
                        ? setNetlifyToken(e.target.value)
                        : setVercelToken(e.target.value)
                      }
                    />
                    
                    <p className="text-xs text-muted-foreground">
                      {selectedProvider === 'netlify' ? (
                        <>Get your token from <a href="https://app.netlify.com/user/applications#personal-access-tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Netlify Settings → Personal Access Tokens</a></>
                      ) : (
                        <>Get your token from <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Vercel Settings → Tokens</a></>
                      )}
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={() => handleDeploy(selectedProvider, selectedProvider === 'netlify' ? netlifyToken : vercelToken)}
                  className="w-full gap-2"
                  disabled={!(selectedProvider === 'netlify' ? netlifyToken : vercelToken)}
                >
                  <Rocket className="h-4 w-4" />
                  Deploy to {selectedProvider}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Choose a platform to deploy your site:
                </p>

                <ProviderCard
                  provider="netlify"
                  name="Netlify"
                  logo={
                    <div className="p-2 rounded-lg bg-[#00C7B7]/10">
                      <svg className="h-5 w-5" viewBox="0 0 40 40" fill="none">
                        <path d="M28.589 14.135l-.014-.006c-.008-.003-.016-.006-.023-.013a.11.11 0 01-.028-.093l.773-4.726 3.625 3.626-3.77 1.604a.083.083 0 01-.033.006h-.015a.104.104 0 01-.02-.017 1.716 1.716 0 00-.495-.381zm5.258-.288l3.876 3.876c.805.806 1.208 1.208 1.355 1.674.022.069.04.138.054.209l-9.263-3.923a.728.728 0 00-.015-.006c-.037-.015-.08-.032-.08-.07s.044-.056.081-.071l.012-.005 3.98-1.684zm5.127 7.003c-.2.376-.59.766-1.25 1.427l-4.37 4.369-5.652-1.177-.033-.007c-.04-.008-.082-.017-.082-.059s.043-.05.082-.058l.033-.007 5.652-1.177 5.652 1.177.033.007c.04.008.082.017.082.059s-.043.05-.082.058l-.033.007-5.652 1.177 4.37 4.369c.66.66 1.05 1.05 1.25 1.427l-9.307-3.94a.628.628 0 00-.011-.005c-.037-.015-.08-.032-.08-.07s.044-.056.081-.071l.012-.005 9.305-3.94zm-6.745 6.93l-3.625 3.626-.773-4.726a.11.11 0 01.028-.093c.007-.007.015-.01.023-.013l.014-.006c.18-.075.369-.178.495-.381a.104.104 0 01.02-.017h.015a.083.083 0 01.033.006l3.77 1.604zm-4.92 4.92l-5.166 5.166c-.254.254-.47.47-.664.66a.628.628 0 00-.012.005c-.036.015-.08.033-.08.07s.043.056.08.071l.012.005 3.34 1.413-1.51-7.39zm-6.46 6.46l-1.427-.297c-.466-.148-.868-.55-1.674-1.356l-5.488-5.488c-.254-.254-.47-.47-.66-.664a.628.628 0 00-.005-.012c-.015-.036-.033-.08-.07-.08s-.056.043-.071.08l-.005.012-1.413 3.34 7.39-1.51-7.39-1.51 1.413 3.34.005.012c.015.037.033.08.07.08s.056-.044.071-.08l.005-.012c.19-.194.406-.41.66-.664l5.488-5.488c.806-.806 1.208-1.208 1.674-1.356l1.427-.297-7.39-1.51 3.34 1.413.012.005c.037.015.08.033.08.07s-.043.056-.08.071l-.012.005-3.34 1.413 7.39-1.51-1.427-.297c-.466-.148-.868-.55-1.674-1.356l-5.488-5.488c-.254-.254-.47-.47-.66-.664a.628.628 0 00-.005-.012c-.015-.036-.033-.08-.07-.08s-.056.043-.071.08l-.005.012-1.413 3.34 7.39-1.51-7.39-1.51 1.413 3.34.005.012c.015.037.033.08.07.08s.056-.044.071-.08l.005-.012c.19-.194.406-.41.66-.664l5.488-5.488c.806-.806 1.208-1.208 1.674-1.356l.297-1.427 1.51 7.39-1.413-3.34-.005-.012c-.015-.037-.033-.08-.07-.08s-.056.043-.071.08l-.005.012c-.19.194-.406.41-.66.664l-5.488 5.488c-.806.806-1.208 1.208-1.674 1.356l-.297 1.427 1.51-7.39-1.413 3.34-.005.012c-.015.037-.033.08-.07.08s-.056-.044-.071-.08l-.005-.012c-.19-.194-.406-.41-.66-.664l-5.488-5.488c-.806-.806-1.208-1.208-1.356-1.674l-.297-1.427 7.39 1.51-3.34-1.413-.012-.005c-.037-.015-.08-.033-.08-.07s.044-.056.08-.071l.012-.005 3.34-1.413-7.39 1.51 1.427-.297c.466-.148.868-.55 1.674-1.356l5.488-5.488c.254-.254.47-.47.66-.664.003-.004.003-.008.005-.012.015-.036.033-.08.07-.08s.056.043.071.08l.005.012c.19.194.406.41.66.664l5.488 5.488c.806.806 1.208 1.208 1.356 1.674l.297 1.427-7.39-1.51 3.34 1.413.012.005c.037.015.08.033.08.07s-.044.056-.08.071l-.012.005-3.34 1.413 7.39-1.51z" fill="#00C7B7"/>
                      </svg>
                    </div>
                  }
                  color="emerald"
                  description="Global CDN, automatic HTTPS, instant deploys"
                />

                <ProviderCard
                  provider="vercel"
                  name="Vercel"
                  logo={
                    <div className="p-2 rounded-lg bg-foreground/10">
                      <svg className="h-5 w-5" viewBox="0 0 116 100" fill="currentColor">
                        <path fillRule="evenodd" clipRule="evenodd" d="M57.5 0L115 100H0L57.5 0z" />
                      </svg>
                    </div>
                  }
                  color="foreground"
                  description="Edge network, analytics, serverless functions"
                />

                <div className="p-4 rounded-xl bg-muted/30 border border-border/30 mt-4">
                  <div className="flex items-start gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">First time deploying?</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        You'll need to create a free account and generate an access token from your chosen platform.
                      </p>
                    </div>
                  </div>
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
                <strong>Pro tip:</strong> Download as HTML then use the Deploy tab to publish to Netlify or Vercel for free hosting.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
