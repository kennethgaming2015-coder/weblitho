import { Coins } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { cn } from '@/lib/utils';

interface CreditsBadgeProps {
  className?: string;
  showPlan?: boolean;
}

export function CreditsBadge({ className, showPlan = false }: CreditsBadgeProps) {
  const { credits, loading } = useCredits();

  if (loading || !credits) {
    return (
      <div className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 animate-pulse",
        className
      )}>
        <Coins className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">--</span>
      </div>
    );
  }

  const isLow = credits.credits_balance <= 5;
  const isEmpty = credits.credits_balance === 0;

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors",
      isEmpty ? "bg-destructive/20 text-destructive" :
      isLow ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" :
      "bg-primary/10 text-primary",
      className
    )}>
      <Coins className="h-4 w-4" />
      <span className="text-sm font-medium">{credits.credits_balance}</span>
      {showPlan && (
        <span className="text-xs opacity-70 capitalize">({credits.plan})</span>
      )}
    </div>
  );
}
