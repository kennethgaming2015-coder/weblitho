import { PageHeader } from "@/components/layout/PageHeader";
import { Footer } from "@/components/layout/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader />

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 2024</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using Weblitho, you agree to be bound by these Terms of Service. If you do not 
              agree to these terms, please do not use our service. We reserve the right to modify these terms 
              at any time, and continued use constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Weblitho is an AI-powered website builder that allows users to create websites through natural 
              language prompts. Our service generates HTML, CSS, and JavaScript code based on user inputs 
              using advanced AI models.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
              <li>One person or entity may not maintain multiple free accounts</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You agree NOT to use Weblitho to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Generate content that is illegal, harmful, or violates third-party rights</li>
              <li>Create websites that promote hate speech, violence, or discrimination</li>
              <li>Distribute malware, spam, or engage in phishing activities</li>
              <li>Attempt to reverse engineer or exploit our AI systems</li>
              <li>Resell or redistribute generated content without proper authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              Content you create using Weblitho belongs to you, subject to our license to use it for service 
              improvement. The Weblitho platform, including our AI models, branding, and interface, remains 
              our intellectual property.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Payment and Refunds</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Paid plans are billed monthly or annually as selected</li>
              <li>Credits are non-refundable once purchased</li>
              <li>We reserve the right to change pricing with 30 days notice</li>
              <li>Refunds may be considered on a case-by-case basis within 7 days of purchase</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              Weblitho is provided "as is" without warranties of any kind. We are not liable for any indirect, 
              incidental, or consequential damages arising from your use of the service. Our total liability 
              is limited to the amount you paid for the service in the past 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account at any time for violation of these terms. Upon termination, 
              your right to use the service ceases immediately. You may also terminate your account at any time 
              through your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms of Service, contact us at{" "}
              <a href="mailto:legal@weblitho.com" className="text-primary hover:underline">
                legal@weblitho.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;