import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Check, Sparkles, Zap, Building2, Coins, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCredits, PLAN_DETAILS, SubscriptionPlan } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import weblithoLogo from "@/assets/weblitho-logo.png";

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
    });
  }, []);

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setUpgrading(plan);
    await upgradePlan(plan);
    setUpgrading(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={weblithoLogo} alt="Weblitho" className="h-9 w-auto" />
          </Link>
          
          {credits && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-primary/10 border border-primary/20">
              <Coins className="h-4 w-4 text-primary" />
              <span className="font-display font-semibold">{credits.credits_balance} credits</span>
              <span className="text-sm text-muted-foreground capitalize px-2 py-0.5 bg-muted rounded-full text-xs">
                {credits.plan}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Simple, transparent pricing</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-5 text-balance">
            Choose Your <span className="gradient-text">Plan</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get more credits to build amazing websites with AI. Credits are consumed based on generation complexity.
          </p>
        </div>

        {/* Credit Cost Explanation */}
        <div className="mb-16 p-8 rounded-3xl border border-border/60 bg-card/50 max-w-3xl mx-auto animate-slide-up delay-100">
          <h3 className="font-display font-semibold mb-6 flex items-center gap-3 text-lg">
            <div className="p-2 rounded-xl bg-primary/10">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            How Credits Work
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-4 rounded-2xl bg-muted/50 border border-border/40">
              <p className="font-display font-bold text-primary text-xl mb-1">0.2</p>
              <p className="font-medium text-foreground">Simple pages</p>
              <p className="text-xs text-muted-foreground mt-1">&lt;2K chars</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/50 border border-border/40">
              <p className="font-display font-bold text-primary text-xl mb-1">0.5</p>
              <p className="font-medium text-foreground">Medium pages</p>
              <p className="text-xs text-muted-foreground mt-1">2-5K chars</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/50 border border-border/40">
              <p className="font-display font-bold text-primary text-xl mb-1">0.8</p>
              <p className="font-medium text-foreground">Complex pages</p>
              <p className="text-xs text-muted-foreground mt-1">5-10K chars</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/50 border border-border/40">
              <p className="font-display font-bold text-primary text-xl mb-1">1.2</p>
              <p className="font-medium text-foreground">Large projects</p>
              <p className="text-xs text-muted-foreground mt-1">&gt;10K chars</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-5 text-center">
            Premium models have multipliers (1.5x - 2.5x) applied to base cost
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto animate-slide-up delay-200">
          {(Object.entries(PLAN_DETAILS) as [SubscriptionPlan, typeof PLAN_DETAILS.free][])
            .filter(([key]) => key !== 'owner')
            .map(([key, plan], index) => {
            const Icon = planIcons[key as keyof typeof planIcons];
            const isCurrentPlan = credits?.plan === key;
            const isPro = key === 'pro';

            return (
              <div
                key={key}
                className={cn(
                  "relative rounded-3xl border p-8 flex flex-col transition-all duration-300",
                  isPro 
                    ? "border-primary/50 bg-primary/5 shadow-glow scale-[1.02]" 
                    : "border-border/60 bg-card/50 hover:border-primary/30 card-hover",
                  isCurrentPlan && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {isPro && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 gradient-animated text-primary-foreground text-sm font-semibold rounded-full shadow-glow">
                    Most Popular
                  </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                  <div className={cn(
                    "p-3 rounded-2xl",
                    isPro ? "bg-primary/20" : "bg-muted"
                  )}>
                    <Icon className={cn(
                      "h-6 w-6",
                      isPro ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <h3 className="font-display font-bold text-xl">{plan.name}</h3>
                </div>

                <div className="mb-8">
                  <span className="text-5xl font-display font-bold">${plan.price}</span>
                  {plan.price > 0 && <span className="text-muted-foreground text-lg">/month</span>}
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 p-1 rounded-full bg-accent/20">
                        <Check className="h-3 w-3 text-accent" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isPro ? "default" : "outline"}
                  size="lg"
                  className={cn(
                    "w-full rounded-2xl font-semibold group",
                    isPro && "gradient-animated shadow-glow"
                  )}
                  disabled={isCurrentPlan || upgrading !== null || loading}
                  onClick={() => handleUpgrade(key)}
                >
                  {upgrading === key ? (
                    "Processing..."
                  ) : isCurrentPlan ? (
                    "Current Plan"
                  ) : (
                    <>
                      {credits?.plan === 'business' || (credits?.plan === 'pro' && key === 'free') ? 'Switch to' : 'Upgrade to'} {plan.name}
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-24 max-w-3xl mx-auto animate-slide-up delay-300">
          <h2 className="text-3xl font-display font-bold text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div className="p-6 rounded-2xl border border-border/60 bg-card/50 card-hover">
              <h4 className="font-display font-semibold mb-2 text-lg">Do credits expire?</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">Monthly credits reset at the start of each billing period. Daily credits reset every 24 hours.</p>
            </div>
            <div className="p-6 rounded-2xl border border-border/60 bg-card/50 card-hover">
              <h4 className="font-display font-semibold mb-2 text-lg">Can I upgrade anytime?</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">Yes! You can upgrade or change your plan at any time. Your new credits will be available immediately.</p>
            </div>
            <div className="p-6 rounded-2xl border border-border/60 bg-card/50 card-hover">
              <h4 className="font-display font-semibold mb-2 text-lg">What happens when I run out of credits?</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">You'll need to wait for your daily refresh or upgrade your plan to continue generating content.</p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Pricing;