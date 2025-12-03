import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles, Zap, Building2, ArrowLeft, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCredits, PLAN_DETAILS, SubscriptionPlan } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

const planIcons = {
  free: Sparkles,
  pro: Zap,
  business: Building2,
};

const Pricing = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const { credits, upgradePlan, loading } = useCredits();
  const [upgrading, setUpgrading] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    setUpgrading(plan);
    await upgradePlan(plan);
    setUpgrading(null);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Builder
          </Button>
          
          {credits && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10">
              <Coins className="h-4 w-4 text-primary" />
              <span className="font-medium">{credits.credits_balance} credits</span>
              <span className="text-sm text-muted-foreground capitalize">({credits.plan})</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get more credits to build amazing websites with AI. Credits are consumed based on generation complexity.
          </p>
        </div>

        {/* Credit Cost Explanation */}
        <div className="mb-12 p-6 rounded-2xl border border-border bg-card/50 max-w-2xl mx-auto">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            How Credits Work
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-primary">1 credit</p>
              <p className="text-muted-foreground">Simple pages</p>
              <p className="text-xs text-muted-foreground/70">&lt;2K chars</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-primary">2 credits</p>
              <p className="text-muted-foreground">Medium pages</p>
              <p className="text-xs text-muted-foreground/70">2-5K chars</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-primary">3 credits</p>
              <p className="text-muted-foreground">Complex pages</p>
              <p className="text-xs text-muted-foreground/70">5-10K chars</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-primary">5 credits</p>
              <p className="text-muted-foreground">Large projects</p>
              <p className="text-xs text-muted-foreground/70">&gt;10K chars</p>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {(Object.entries(PLAN_DETAILS) as [SubscriptionPlan, typeof PLAN_DETAILS.free][]).map(([key, plan]) => {
            const Icon = planIcons[key];
            const isCurrentPlan = credits?.plan === key;
            const isPro = key === 'pro';

            return (
              <div
                key={key}
                className={cn(
                  "relative rounded-2xl border p-8 flex flex-col transition-all",
                  isPro ? "border-primary bg-primary/5 shadow-xl scale-105" : "border-border bg-card",
                  isCurrentPlan && "ring-2 ring-primary"
                )}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                  <div className={cn(
                    "p-3 rounded-xl",
                    isPro ? "bg-primary/20" : "bg-muted"
                  )}>
                    <Icon className={cn(
                      "h-6 w-6",
                      isPro ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <h3 className="font-bold text-xl">{plan.name}</h3>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  {plan.price > 0 && <span className="text-muted-foreground">/month</span>}
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 p-0.5 rounded-full bg-primary/20">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isPro ? "default" : "outline"}
                  size="lg"
                  className="w-full"
                  disabled={isCurrentPlan || upgrading !== null || loading}
                  onClick={() => handleUpgrade(key)}
                >
                  {upgrading === key ? (
                    "Processing..."
                  ) : isCurrentPlan ? (
                    "Current Plan"
                  ) : (
                    `${credits?.plan === 'business' || (credits?.plan === 'pro' && key === 'free') ? 'Switch to' : 'Upgrade to'} ${plan.name}`
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-border bg-card/50">
              <h4 className="font-medium mb-2">Do credits expire?</h4>
              <p className="text-sm text-muted-foreground">Monthly credits reset at the start of each billing period. Daily credits reset every 24 hours.</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card/50">
              <h4 className="font-medium mb-2">Can I upgrade anytime?</h4>
              <p className="text-sm text-muted-foreground">Yes! You can upgrade or change your plan at any time. Your new credits will be available immediately.</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card/50">
              <h4 className="font-medium mb-2">What happens when I run out of credits?</h4>
              <p className="text-sm text-muted-foreground">You'll need to wait for your daily refresh or upgrade your plan to continue generating content.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
