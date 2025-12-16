import { useState } from "react";
import { Github, ExternalLink, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ProjectFile } from "@/hooks/useProjects";

interface GitHubExportProps {
  files: ProjectFile[];
  projectName: string;
}

export const GitHubExport = ({ files, projectName }: GitHubExportProps) => {
  const [open, setOpen] = useState(false);
  const [repoName, setRepoName] = useState(projectName.toLowerCase().replace(/\s+/g, "-"));
  const [isPrivate, setIsPrivate] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [repoUrl, setRepoUrl] = useState("");
  const { toast } = useToast();

  const handlePush = async () => {
    if (!repoName.trim()) {
      toast({
        title: "Repository name required",
        description: "Please enter a name for your GitHub repository",
        variant: "destructive",
      });
      return;
    }

    setIsPushing(true);
    setStatus("idle");

    try {
      // This would connect to a GitHub OAuth flow and push to repo
      // For now, show a coming soon message
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "GitHub Integration Coming Soon",
        description: "We're working on direct GitHub integration. For now, use the Export ZIP option to download your code.",
      });
      
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      toast({
        title: "Failed to push to GitHub",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Github className="h-4 w-4" />
          Push to GitHub
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Push to GitHub
          </DialogTitle>
          <DialogDescription>
            Create a new repository and push your generated code to GitHub.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="repo-name">Repository Name</Label>
            <Input
              id="repo-name"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              placeholder="my-website"
              disabled={isPushing}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="private"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
              disabled={isPushing}
            />
            <Label htmlFor="private" className="text-sm text-muted-foreground">
              Make repository private
            </Label>
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>{files.length}</strong> files will be pushed:
            </p>
            <div className="mt-2 max-h-24 overflow-auto">
              {files.slice(0, 5).map((file, i) => (
                <p key={i} className="text-xs text-muted-foreground truncate">
                  📄 {file.path}
                </p>
              ))}
              {files.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  ...and {files.length - 5} more
                </p>
              )}
            </div>
          </div>

          {status === "success" && repoUrl && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <Check className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-emerald-400">Repository created!</span>
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-sm text-primary hover:underline flex items-center gap-1"
              >
                Open <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-400">Failed to push. Please try again.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPushing}>
            Cancel
          </Button>
          <Button onClick={handlePush} disabled={isPushing} className="gap-2">
            {isPushing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Pushing...
              </>
            ) : (
              <>
                <Github className="h-4 w-4" />
                Push to GitHub
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
