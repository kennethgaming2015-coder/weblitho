import { useState } from "react";
import { 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink,
  Monitor,
  Tablet,
  Smartphone,
  Columns,
  Maximize2,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ViewportSize = "desktop" | "tablet" | "mobile";

interface PreviewToolbarProps {
  currentUrl: string;
  onUrlChange?: (url: string) => void;
  onRefresh: () => void;
  onBack?: () => void;
  onForward?: () => void;
  onOpenExternal?: () => void;
  viewport: ViewportSize;
  onViewportChange: (viewport: ViewportSize) => void;
  showSplitView: boolean;
  onToggleSplitView: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
}

export const PreviewToolbar = ({
  currentUrl,
  onUrlChange,
  onRefresh,
  onBack,
  onForward,
  onOpenExternal,
  viewport,
  onViewportChange,
  showSplitView,
  onToggleSplitView,
  canGoBack = false,
  canGoForward = false,
}: PreviewToolbarProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(currentUrl);

  const handleUrlSubmit = () => {
    setIsEditing(false);
    onUrlChange?.(editUrl);
  };

  const viewportButtons: { id: ViewportSize; icon: typeof Monitor; label: string }[] = [
    { id: "desktop", icon: Monitor, label: "Desktop" },
    { id: "tablet", icon: Tablet, label: "Tablet" },
    { id: "mobile", icon: Smartphone, label: "Mobile" },
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 px-3 py-2 bg-[#252526] border-b border-border/30">
        {/* Navigation Controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                disabled={!canGoBack}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onForward}
                disabled={!canGoForward}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Forward</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-5 bg-border/30" />

        {/* URL Bar */}
        <div className="flex-1 flex items-center gap-2 max-w-2xl">
          <div className="flex-1 flex items-center gap-2 h-7 px-3 bg-[#1e1e1e] rounded-md border border-border/30">
            <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {isEditing ? (
              <Input
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                onBlur={handleUrlSubmit}
                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                className="h-5 border-0 bg-transparent p-0 text-xs text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                autoFocus
              />
            ) : (
              <span
                className="flex-1 text-xs text-muted-foreground truncate cursor-text"
                onClick={() => {
                  setEditUrl(currentUrl);
                  setIsEditing(true);
                }}
              >
                {currentUrl || "localhost:5173/"}
              </span>
            )}
          </div>
        </div>

        <Separator orientation="vertical" className="h-5 bg-border/30" />

        {/* Viewport Controls */}
        <div className="flex items-center gap-1 bg-[#1e1e1e] rounded-md p-0.5">
          {viewportButtons.map(({ id, icon: Icon, label }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <Button
                  variant={viewport === id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewportChange(id)}
                  className={`h-6 w-6 p-0 ${
                    viewport === id 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator orientation="vertical" className="h-5 bg-border/30" />

        {/* Split View Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showSplitView ? "default" : "ghost"}
              size="sm"
              onClick={onToggleSplitView}
              className={`h-7 w-7 p-0 ${
                showSplitView 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split View (Code + Preview)</TooltipContent>
        </Tooltip>

        {/* Open External */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenExternal}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open in New Tab</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
