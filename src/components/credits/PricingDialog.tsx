import { useState } from 'react';
import { Check, Sparkles, Zap, Building2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCredits, PLAN_DETAILS, SubscriptionPlan } from '@/hooks/useCredits';
import { cn } from '@/lib/utils';

interface PricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const planIcons = {
  free: Sparkles,
  pro: Zap,
  business: Building2,
};

export function PricingDialog({ open, onOpenChange }: PricingDialogProps) {
  const { credits, upgradePlan } = useCredits();
  const [upgrading, setUpgrading] = useState<SubscriptionPlan | null>(null);

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    setUpgrading(plan);
    const success = await upgradePlan(plan);
    setUpgrading(null);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Choose Your Plan</DialogTitle>
          <DialogDescription className="text-center">
            Get more credits to build amazing websites with AI
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {(Object.entries(PLAN_DETAILS) as [SubscriptionPlan, typeof PLAN_DETAILS.free][]).map(([key, plan]) => {
            const Icon = planIcons[key];
            const isCurrentPlan = credits?.plan === key;
            const isPro = key === 'pro';

            return (
              <div
                key={key}
                className={cn(
                  "relative rounded-2xl border p-6 flex flex-col",
                  isPro ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card",
                  isCurrentPlan && "ring-2 ring-primary"
                )}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <div className={cn(
                    "p-2 rounded-lg",
                    isPro ? "bg-primary/20" : "bg-muted"
                  )}>
                    <Icon className={cn(
                      "h-5 w-5",
                      isPro ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold">${plan.price}</span>
                  {plan.price > 0 && <span className="text-muted-foreground">/month</span>}
                </div>

                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isPro ? "default" : "outline"}
                  className="w-full"
                  disabled={isCurrentPlan || upgrading !== null}
                  onClick={() => handleUpgrade(key)}
                >
                  {upgrading === key ? (
                    "Upgrading..."
                  ) : isCurrentPlan ? (
                    "Current Plan"
                  ) : credits?.plan === 'business' && key !== 'business' ? (
                    "Downgrade"
                  ) : credits?.plan === 'pro' && key === 'free' ? (
                    "Downgrade"
                  ) : (
                    "Upgrade"
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Credits are deducted based on generation complexity: 1-5 credits per generation.
        </p>
      </DialogContent>
    </Dialog>
  );
}
