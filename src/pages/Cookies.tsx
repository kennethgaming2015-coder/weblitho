import { PageHeader } from "@/components/layout/PageHeader";
import { Footer } from "@/components/layout/Footer";

const Cookies = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader />

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Cookie Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 2024</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files stored on your device when you visit our website. They help us 
              provide you with a better experience by remembering your preferences and understanding how 
              you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Types of Cookies We Use</h2>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <h3 className="font-semibold mb-2">Essential Cookies</h3>
                <p className="text-sm text-muted-foreground">
                  Required for the website to function properly. These cannot be disabled.
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <h3 className="font-semibold mb-2">Authentication Cookies</h3>
                <p className="text-sm text-muted-foreground">
                  Keep you signed in and remember your session across pages.
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <h3 className="font-semibold mb-2">Preference Cookies</h3>
                <p className="text-sm text-muted-foreground">
                  Remember your settings like theme preference (light/dark mode).
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <h3 className="font-semibold mb-2">Analytics Cookies</h3>
                <p className="text-sm text-muted-foreground">
                  Help us understand how visitors interact with our website to improve the experience.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Third-Party Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may use third-party services that set their own cookies, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li><strong>Analytics providers:</strong> To analyze website traffic and usage patterns</li>
              <li><strong>Payment processors:</strong> To securely process transactions</li>
              <li><strong>Authentication services:</strong> For social login functionality</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Managing Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              You can control and manage cookies through your browser settings. Note that disabling certain 
              cookies may affect the functionality of our website. Here is how to manage cookies in popular browsers:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
              <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
              <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Cookie Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              Different cookies have different retention periods:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li><strong>Session cookies:</strong> Deleted when you close your browser</li>
              <li><strong>Persistent cookies:</strong> Remain for a set period (typically 30 days to 1 year)</li>
              <li><strong>Authentication cookies:</strong> Valid until you log out or they expire</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Updates to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Cookie Policy from time to time. Any changes will be posted on this page 
              with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about our use of cookies, please contact us at{" "}
              <a href="mailto:privacy@weblitho.com" className="text-primary hover:underline">
                privacy@weblitho.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Cookies;