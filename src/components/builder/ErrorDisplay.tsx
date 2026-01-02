import { AlertTriangle, RefreshCw, Zap, CreditCard, LogIn, Server, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

interface ErrorInfo {
  title: string;
  description: string;
  icon: typeof AlertTriangle;
  action?: {
    label: string;
    onClick?: () => void;
  };
  severity: "error" | "warning" | "info";
}

function parseError(error: string): ErrorInfo {
  const lowerError = error.toLowerCase();

  // Rate limit errors
  if (lowerError.includes("rate limit") || lowerError.includes("429") || lowerError.includes("too many")) {
    return {
      title: "Rate Limit Reached",
      description: "You've made too many requests. Please wait a moment before trying again.",
      icon: Zap,
      severity: "warning",
    };
  }

  // Credit errors
  if (lowerError.includes("credit") || lowerError.includes("402") || lowerError.includes("insufficient")) {
    return {
      title: "Insufficient Credits",
      description: "You don't have enough credits for this generation. Consider upgrading your plan.",
      icon: CreditCard,
      severity: "warning",
      action: {
        label: "View Plans",
      },
    };
  }

  // Auth errors
  if (lowerError.includes("session") || lowerError.includes("401") || lowerError.includes("unauthorized") || lowerError.includes("log in")) {
    return {
      title: "Session Expired",
      description: "Your session has expired. Please log in again to continue.",
      icon: LogIn,
      severity: "error",
      action: {
        label: "Log In",
      },
    };
  }

  // Paid plan required
  if (lowerError.includes("paid plan") || lowerError.includes("403") || lowerError.includes("upgrade")) {
    return {
      title: "Premium Model",
      description: "This model requires a paid plan. Upgrade to access premium features.",
      icon: CreditCard,
      severity: "warning",
      action: {
        label: "Upgrade",
      },
    };
  }

  // Server/AI errors
  if (lowerError.includes("server") || lowerError.includes("500") || lowerError.includes("unavailable") || lowerError.includes("service")) {
    return {
      title: "Service Temporarily Unavailable",
      description: "The AI service is experiencing issues. Please try again in a few moments.",
      icon: Server,
      severity: "error",
    };
  }

  // Network errors
  if (lowerError.includes("network") || lowerError.includes("connection") || lowerError.includes("fetch")) {
    return {
      title: "Connection Error",
      description: "Unable to connect to the server. Check your internet connection and try again.",
      icon: AlertTriangle,
      severity: "error",
    };
  }

  // Default error
  return {
    title: "Generation Failed",
    description: error || "An unexpected error occurred. Please try again.",
    icon: HelpCircle,
    severity: "error",
  };
}

export function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
  const errorInfo = parseError(error);
  const Icon = errorInfo.icon;

  const severityStyles = {
    error: "border-destructive/50 bg-destructive/5 text-destructive",
    warning: "border-orange-500/50 bg-orange-500/5 text-orange-600 dark:text-orange-400",
    info: "border-blue-500/50 bg-blue-500/5 text-blue-600 dark:text-blue-400",
  };

  return (
    <Alert className={`animate-fade-in ${severityStyles[errorInfo.severity]}`}>
      <Icon className="h-4 w-4" />
      <AlertTitle className="font-semibold">{errorInfo.title}</AlertTitle>
      <AlertDescription className="mt-1 text-sm opacity-90">
        {errorInfo.description}
      </AlertDescription>
      
      <div className="flex gap-2 mt-3">
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="h-7 px-3 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Try Again
          </Button>
        )}
        
        {errorInfo.action && (
          <Button
            size="sm"
            variant="secondary"
            onClick={errorInfo.action.onClick}
            className="h-7 px-3 text-xs"
          >
            {errorInfo.action.label}
          </Button>
        )}
        
        {onDismiss && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="h-7 px-3 text-xs"
          >
            Dismiss
          </Button>
        )}
      </div>
    </Alert>
  );
}
