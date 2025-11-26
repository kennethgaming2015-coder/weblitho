import { useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CanvasPreviewProps {
  content: string;
}

type ViewportSize = "desktop" | "tablet" | "mobile";

const viewportSizes: Record<ViewportSize, { width: string; icon: any }> = {
  desktop: { width: "100%", icon: Monitor },
  tablet: { width: "768px", icon: Tablet },
  mobile: { width: "375px", icon: Smartphone },
};

export const CanvasPreview = ({ content }: CanvasPreviewProps) => {
  const [viewport, setViewport] = useState<ViewportSize>("desktop");

  return (
    <main className="flex-1 flex flex-col bg-editor-bg overflow-hidden">
      <div className="h-12 border-b border-border bg-card flex items-center justify-center gap-2 px-4">
        {(Object.keys(viewportSizes) as ViewportSize[]).map((size) => {
          const { icon: Icon } = viewportSizes[size];
          return (
            <Button
              key={size}
              variant={viewport === size ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewport(size)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
        <div
          className="bg-canvas-bg rounded-lg shadow-lg transition-smooth overflow-hidden"
          style={{
            width: viewportSizes[viewport].width,
            minHeight: "600px",
          }}
        >
          <div
            dangerouslySetInnerHTML={{ __html: content }}
            className="w-full h-full"
          />
        </div>
      </div>
    </main>
  );
};
