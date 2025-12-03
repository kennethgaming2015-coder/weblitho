import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ModelType } from '@/components/builder/SettingsDialog';

export type SubscriptionPlan = 'free' | 'pro' | 'business';

export interface UserCredits {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  credits_balance: number;
  monthly_credits: number;
  daily_credits: number;
  last_daily_reset: string;
  last_monthly_reset: string;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  project_id: string | null;
  created_at: string;
}

// Model credit multipliers - paid models cost more
export const MODEL_CREDIT_MULTIPLIERS: Record<ModelType, number> = {
  "deepseek-free": 1,              // Free model - base cost
  "google/gemini-2.0-flash": 1.5,  // 1.5x cost
  "google/gemini-2.0-pro": 2,      // 2x cost
  "google/gemini-2.5-flash": 1.5,  // 1.5x cost
  "google/gemini-2.5-pro": 2.5,    // 2.5x cost (premium)
};

export const PLAN_DETAILS = {
  free: {
    name: 'Free',
    price: 0,
    monthlyCredits: 5,
    dailyCredits: 5,
    features: ['5 daily credits', 'Free AI model only', 'Community support'],
  },
  pro: {
    name: 'Pro',
    price: 20,
    monthlyCredits: 100,
    dailyCredits: 20,
    features: ['100 monthly credits', '20 daily credits', 'All AI models', 'Priority support', 'Export to GitHub'],
  },
  business: {
    name: 'Business',
    price: 50,
    monthlyCredits: 500,
    dailyCredits: 50,
    features: ['500 monthly credits', '50 daily credits', 'All AI models', 'Priority support', 'Team collaboration', 'Custom domains'],
  },
};

export function useCredits() {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCredits = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCredits(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no credits record exists, create one
        if (error.code === 'PGRST116') {
          const { data: newCredits, error: insertError } = await supabase
            .from('user_credits')
            .insert({ user_id: user.id })
            .select()
            .single();
          
          if (!insertError && newCredits) {
            setCredits(newCredits as UserCredits);
          }
        } else {
          console.error('Error fetching credits:', error);
        }
      } else {
        setCredits(data as UserCredits);
      }
    } catch (err) {
      console.error('Error in fetchCredits:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setTransactions(data as CreditTransaction[]);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  }, []);

  const calculateCost = useCallback((outputLength: number, model?: ModelType): number => {
    // Base cost by output length (0.2 - 1.2 range)
    let baseCost = 0.2;
    if (outputLength < 2000) baseCost = 0.2;
    else if (outputLength < 5000) baseCost = 0.5;
    else if (outputLength < 10000) baseCost = 0.8;
    else baseCost = 1.2;
    
    // Apply model multiplier (final range: 0.2 - 3)
    const multiplier = model ? MODEL_CREDIT_MULTIPLIERS[model] || 1 : 1;
    return Math.round((baseCost * multiplier) * 100) / 100; // Round to 2 decimals
  }, []);

  const deductCredits = useCallback(async (
    amount: number,
    description?: string,
    projectId?: string
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !credits) return false;

      if (credits.credits_balance < amount) {
        toast({
          title: 'Insufficient Credits',
          description: `You need ${amount} credits but only have ${credits.credits_balance}. Please upgrade your plan.`,
          variant: 'destructive',
        });
        return false;
      }

      // Deduct credits
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ 
          credits_balance: credits.credits_balance - amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error deducting credits:', updateError);
        return false;
      }

      // Log transaction
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          amount: -amount,
          transaction_type: 'generation',
          description,
          project_id: projectId || null,
        });

      // Update local state
      setCredits(prev => prev ? { ...prev, credits_balance: prev.credits_balance - amount } : null);
      
      return true;
    } catch (err) {
      console.error('Error in deductCredits:', err);
      return false;
    }
  }, [credits, toast]);

  const upgradePlan = useCallback(async (newPlan: SubscriptionPlan): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const planDetails = PLAN_DETAILS[newPlan];
      
      const { error } = await supabase
        .from('user_credits')
        .update({
          plan: newPlan,
          monthly_credits: planDetails.monthlyCredits,
          daily_credits: planDetails.dailyCredits,
          credits_balance: planDetails.monthlyCredits,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error upgrading plan:', error);
        return false;
      }

      await fetchCredits();
      
      toast({
        title: 'Plan Upgraded!',
        description: `You're now on the ${planDetails.name} plan with ${planDetails.monthlyCredits} credits.`,
      });

      return true;
    } catch (err) {
      console.error('Error in upgradePlan:', err);
      return false;
    }
  }, [fetchCredits, toast]);

  useEffect(() => {
    fetchCredits();
    fetchTransactions();
  }, [fetchCredits, fetchTransactions]);

  return {
    credits,
    transactions,
    loading,
    calculateCost,
    deductCredits,
    upgradePlan,
    refetch: fetchCredits,
  };
}
