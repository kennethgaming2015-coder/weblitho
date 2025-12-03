import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get users who need daily credit reset (last reset > 24 hours ago)
    const { data: usersToReset, error: fetchError } = await supabase
      .from("user_credits")
      .select("*")
      .lt("last_daily_reset", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (fetchError) {
      console.error("Error fetching users:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${usersToReset?.length || 0} users to reset`);

    let resetCount = 0;
    
    for (const user of usersToReset || []) {
      // Calculate new balance based on plan
      let creditRefresh = 0;
      let maxCredits = 5;
      
      switch (user.plan) {
        case "free":
          creditRefresh = 5;
          maxCredits = 5;
          break;
        case "pro":
          creditRefresh = 20;
          maxCredits = user.monthly_credits;
          break;
        case "business":
          creditRefresh = 50;
          maxCredits = user.monthly_credits;
          break;
      }
      
      const newBalance = Math.min(user.credits_balance + creditRefresh, maxCredits);
      
      const { error: updateError } = await supabase
        .from("user_credits")
        .update({
          credits_balance: newBalance,
          last_daily_reset: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      
      if (updateError) {
        console.error(`Error updating user ${user.id}:`, updateError);
      } else {
        resetCount++;
        console.log(`Reset credits for user ${user.user_id}: ${user.credits_balance} -> ${newBalance}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Reset credits for ${resetCount} users`,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in reset-daily-credits:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
