import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, ChevronUp, History, TrendingUp, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useCredits, PLAN_DETAILS } from '@/hooks/useCredits';
import { PricingDialog } from './PricingDialog';
import { cn } from '@/lib/utils';

interface CreditsDisplayProps {
  className?: string;
}

export function CreditsDisplay({ className }: CreditsDisplayProps) {
  const navigate = useNavigate();
  const { credits, transactions, loading } = useCredits();
  const [pricingOpen, setPricingOpen] = useState(false);

  if (loading || !credits) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 animate-pulse",
        className
      )}>
        <Coins className="h-4 w-4" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  const planDetails = PLAN_DETAILS[credits.plan];
  const usagePercent = (credits.credits_balance / planDetails.monthlyCredits) * 100;
  const isUnlimited = credits.is_unlimited || credits.plan === 'owner';
  const isLow = !isUnlimited && credits.credits_balance <= 5;
  const isEmpty = !isUnlimited && credits.credits_balance === 0;

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "flex items-center gap-2 px-3 h-9",
              isUnlimited ? "text-primary" :
              isEmpty ? "text-destructive" : isLow ? "text-yellow-600 dark:text-yellow-400" : "",
              className
            )}
          >
            <Coins className="h-4 w-4" />
            <span className="font-medium">{isUnlimited ? "∞" : credits.credits_balance.toFixed(1)}</span>
            <ChevronUp className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Credits Balance</h4>
                <p className="text-xs text-muted-foreground capitalize">{credits.plan} Plan</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{isUnlimited ? "∞" : credits.credits_balance.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">
                  {isUnlimited ? "Unlimited" : `of ${planDetails.monthlyCredits}`}
                </p>
              </div>
            </div>

            {!isUnlimited && <Progress value={usagePercent} className="h-2" />}

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-muted-foreground text-xs">Daily Allowance</p>
                <p className="font-medium">{planDetails.dailyCredits} credits</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-muted-foreground text-xs">Monthly</p>
                <p className="font-medium">{planDetails.monthlyCredits} credits</p>
              </div>
            </div>

            {transactions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <History className="h-3 w-3" />
                  <span>Recent Activity</span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {transactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between text-xs py-1">
                      <span className="truncate flex-1">{tx.description || 'Generation'}</span>
                      <span className={cn(
                        "font-medium",
                        tx.amount < 0 ? "text-destructive" : "text-green-600"
                      )}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button 
              className="w-full gap-2" 
              onClick={() => setPricingOpen(true)}
            >
              <TrendingUp className="h-4 w-4" />
              Upgrade Plan
            </Button>
            
            <Separator />
            
            <Button 
              variant="ghost"
              className="w-full gap-2 justify-start" 
              onClick={() => navigate('/profile')}
            >
              <User className="h-4 w-4" />
              Account Settings
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <PricingDialog open={pricingOpen} onOpenChange={setPricingOpen} />
    </>
  );
}
