import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import weblithoLogo from "@/assets/weblitho-logo.png";

interface PageHeaderProps {
  showBackButton?: boolean;
  maxWidth?: string;
}

export function PageHeader({ showBackButton = true, maxWidth = "max-w-4xl" }: PageHeaderProps) {
  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
      <div className={`${maxWidth} mx-auto px-6 py-4 flex items-center justify-between`}>
        {showBackButton ? (
          <Link to="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        ) : (
          <div />
        )}
        <Link to="/" className="flex items-center">
          <img src={weblithoLogo} alt="Weblitho" className="h-7 w-auto" />
        </Link>
      </div>
    </header>
  );
}