import { useState } from "react";
import { Monitor, Tablet, Smartphone, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ViewportSize = "desktop" | "tablet" | "mobile";

interface ViewportConfig {
  width: number;
  height: number;
  icon: typeof Monitor;
  label: string;
}

const viewports: Record<ViewportSize, ViewportConfig> = {
  desktop: { width: 1440, height: 900, icon: Monitor, label: "Desktop" },
  tablet: { width: 768, height: 1024, icon: Tablet, label: "Tablet" },
  mobile: { width: 375, height: 812, icon: Smartphone, label: "Mobile" },
};

interface ResponsivePreviewProps {
  viewport: ViewportSize;
  onViewportChange: (viewport: ViewportSize) => void;
  isRotated?: boolean;
  onRotate?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const ResponsivePreviewToolbar = ({
  viewport,
  onViewportChange,
  isRotated = false,
  onRotate,
  isFullscreen = false,
  onToggleFullscreen,
}: ResponsivePreviewProps) => {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border/50">
        {(Object.keys(viewports) as ViewportSize[]).map((size) => {
          const config = viewports[size];
          const Icon = config.icon;
          const isActive = viewport === size;
          
          return (
            <Tooltip key={size}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewportChange(size)}
                  className={cn(
                    "h-8 w-8 p-0 transition-all",
                    isActive && "shadow-sm"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{config.label} ({config.width}×{config.height})</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        
        {/* Rotate for tablet/mobile */}
        {viewport !== "desktop" && onRotate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRotate}
                className={cn("h-8 w-8 p-0", isRotated && "text-primary")}
              >
                <RotateCcw className={cn("h-4 w-4 transition-transform", isRotated && "rotate-90")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Rotate Device</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Fullscreen toggle */}
        {onToggleFullscreen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleFullscreen}
                className="h-8 w-8 p-0"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

interface ResponsiveFrameProps {
  viewport: ViewportSize;
  isRotated?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveFrame = ({
  viewport,
  isRotated = false,
  children,
  className,
}: ResponsiveFrameProps) => {
  const config = viewports[viewport];
  const width = isRotated && viewport !== "desktop" ? config.height : config.width;
  const height = isRotated && viewport !== "desktop" ? config.width : config.height;

  if (viewport === "desktop") {
    return (
      <div className={cn("w-full h-full", className)}>
        {children}
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
      <div
        className={cn(
          "relative bg-card rounded-[2rem] shadow-2xl border-[8px] border-muted transition-all duration-500",
          viewport === "mobile" && "rounded-[2.5rem] border-[6px]",
          className
        )}
        style={{
          width: `${width}px`,
          maxWidth: "100%",
          height: `${height}px`,
          maxHeight: "calc(100vh - 200px)",
        }}
      >
        {/* Device notch for mobile */}
        {viewport === "mobile" && !isRotated && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[25px] bg-muted rounded-b-2xl z-10" />
        )}
        
        {/* Device home indicator */}
        {viewport === "mobile" && (
          <div className={cn(
            "absolute bg-muted-foreground/30 rounded-full z-10",
            isRotated 
              ? "right-2 top-1/2 -translate-y-1/2 w-[4px] h-[80px]"
              : "bottom-2 left-1/2 -translate-x-1/2 w-[100px] h-[4px]"
          )} />
        )}

        <div className={cn(
          "w-full h-full overflow-hidden",
          viewport === "mobile" ? "rounded-[2rem]" : "rounded-[1.5rem]"
        )}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Hook for responsive preview state
export const useResponsivePreview = (initialViewport: ViewportSize = "desktop") => {
  const [viewport, setViewport] = useState<ViewportSize>(initialViewport);
  const [isRotated, setIsRotated] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleRotate = () => setIsRotated(prev => !prev);
  const handleToggleFullscreen = () => setIsFullscreen(prev => !prev);

  return {
    viewport,
    setViewport,
    isRotated,
    handleRotate,
    isFullscreen,
    handleToggleFullscreen,
    viewportConfig: viewports[viewport],
  };
};
