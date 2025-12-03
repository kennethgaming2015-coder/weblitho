import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, User, CreditCard, Mail, MapPin, Building, 
  Globe, Save, Coins, History, TrendingUp, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useCredits, PLAN_DETAILS, MODEL_CREDIT_MULTIPLIERS } from "@/hooks/useCredits";
import { PricingDialog } from "@/components/credits/PricingDialog";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface ProfileData {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  billing_name: string | null;
  billing_email: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_country: string | null;
  billing_postal_code: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { credits, transactions, loading: creditsLoading } = useCredits();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingCountry, setBillingCountry] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (!error && profileData) {
        setProfile(profileData as ProfileData);
        setFullName(profileData.full_name || "");
        setUsername(profileData.username || "");
        setBillingName(profileData.billing_name || "");
        setBillingEmail(profileData.billing_email || profileData.email || "");
        setBillingAddress(profileData.billing_address || "");
        setBillingCity(profileData.billing_city || "");
        setBillingCountry(profileData.billing_country || "");
        setBillingPostalCode(profileData.billing_postal_code || "");
      }
      setLoading(false);
    };

    fetchUserAndProfile();
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        username: username,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } else {
      toast({ title: "Profile updated", description: "Your profile has been saved" });
    }
  };

  const handleSaveBilling = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        billing_name: billingName,
        billing_email: billingEmail,
        billing_address: billingAddress,
        billing_city: billingCity,
        billing_country: billingCountry,
        billing_postal_code: billingPostalCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: "Failed to update billing info", variant: "destructive" });
    } else {
      toast({ title: "Billing updated", description: "Your billing information has been saved" });
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const planDetails = credits ? PLAN_DETAILS[credits.plan] : PLAN_DETAILS.free;
  const usagePercent = credits ? (credits.credits_balance / planDetails.monthlyCredits) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Builder
          </Button>
          <h1 className="font-semibold">Account Settings</h1>
          <div className="w-24" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-2">
              <Coins className="h-4 w-4" />
              Usage
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user.email || ""} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>Manage your subscription</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/5">
                  <div>
                    <h3 className="font-semibold text-lg capitalize">{credits?.plan || "Free"} Plan</h3>
                    <p className="text-sm text-muted-foreground">
                      ${planDetails.price}/month • {planDetails.monthlyCredits} credits
                    </p>
                  </div>
                  <Button onClick={() => setPricingOpen(true)}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Change Plan
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Billing Information */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Information</CardTitle>
                <CardDescription>Your billing details for invoices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billingName">
                      <User className="h-3 w-3 inline mr-1" />
                      Full Name
                    </Label>
                    <Input 
                      id="billingName" 
                      value={billingName} 
                      onChange={(e) => setBillingName(e.target.value)}
                      placeholder="Billing name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingEmail">
                      <Mail className="h-3 w-3 inline mr-1" />
                      Billing Email
                    </Label>
                    <Input 
                      id="billingEmail" 
                      type="email"
                      value={billingEmail} 
                      onChange={(e) => setBillingEmail(e.target.value)}
                      placeholder="billing@example.com"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="billingAddress">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      Address
                    </Label>
                    <Input 
                      id="billingAddress" 
                      value={billingAddress} 
                      onChange={(e) => setBillingAddress(e.target.value)}
                      placeholder="Street address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingCity">
                      <Building className="h-3 w-3 inline mr-1" />
                      City
                    </Label>
                    <Input 
                      id="billingCity" 
                      value={billingCity} 
                      onChange={(e) => setBillingCity(e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingPostalCode">Postal Code</Label>
                    <Input 
                      id="billingPostalCode" 
                      value={billingPostalCode} 
                      onChange={(e) => setBillingPostalCode(e.target.value)}
                      placeholder="12345"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="billingCountry">
                      <Globe className="h-3 w-3 inline mr-1" />
                      Country
                    </Label>
                    <Input 
                      id="billingCountry" 
                      value={billingCountry} 
                      onChange={(e) => setBillingCountry(e.target.value)}
                      placeholder="Country"
                    />
                  </div>
                </div>
                <Button onClick={handleSaveBilling} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Billing Info"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            {/* Credits Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Credits Balance</CardTitle>
                <CardDescription>Your current credit usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-4xl font-bold">{credits?.credits_balance || 0}</p>
                    <p className="text-sm text-muted-foreground">of {planDetails.monthlyCredits} credits</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Daily refresh</p>
                    <p className="font-medium">+{planDetails.dailyCredits} credits</p>
                  </div>
                </div>
                <Progress value={usagePercent} className="h-3" />
                
                {credits?.last_daily_reset && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Last reset: {new Date(credits.last_daily_reset).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Model Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Model Pricing</CardTitle>
                <CardDescription>Credit cost per model</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(MODEL_CREDIT_MULTIPLIERS).map(([model, multiplier]) => (
                    <div 
                      key={model} 
                      className={cn(
                        "p-3 rounded-lg border",
                        multiplier === 1 ? "border-green-500/30 bg-green-500/5" : "border-border bg-muted/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {model === "deepseek-free" ? "Weblitho Free" : 
                           model === "google/gemini-2.0-flash" ? "Weblitho 2.0" :
                           model === "google/gemini-2.0-pro" ? "Weblitho 2.0 Premium" :
                           model === "google/gemini-2.5-flash" ? "Weblitho 2.5 Fast" :
                           "Weblitho 2.5 Ultra"}
                        </span>
                        <span className={cn(
                          "text-sm font-bold",
                          multiplier === 1 ? "text-green-500" : "text-primary"
                        )}>
                          {multiplier}x
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {multiplier === 1 ? "Base credit cost" : `${multiplier}x base credit cost`}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>Your credit usage history</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No transactions yet
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {transactions.map((tx) => (
                      <div 
                        key={tx.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm truncate">{tx.description || "Generation"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleString()}
                          </p>
                        </div>
                        <span className={cn(
                          "font-bold",
                          tx.amount < 0 ? "text-destructive" : "text-green-500"
                        )}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <PricingDialog open={pricingOpen} onOpenChange={setPricingOpen} />
      
      <Footer />
    </div>
  );
};

export default Profile;
