import { Link } from "react-router-dom";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";
import weblithoLogo from "@/assets/weblitho-logo.png";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/50 bg-card/30 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <img src={weblithoLogo} alt="Weblitho" className="h-8 w-auto" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Build stunning websites in minutes with AI. No coding required. Just describe what you want and watch it come to life.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" 
                className="p-2 rounded-lg bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors">
                <Github className="h-4 w-4" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="mailto:support@weblitho.com"
                className="p-2 rounded-lg bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors">
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  AI Builder
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Templates
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  API Reference
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Changelog
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Weblitho. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}