import { useState } from "react";
import { Search, Plus, ExternalLink, Sparkles, Layout, Box, Type, BarChart3, FormInput, Navigation, Footprints, CreditCard, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Component {
  id: string;
  name: string;
  description: string;
  category: string;
  prompt: string;
  tags: string[];
  isNew?: boolean;
}

const componentLibrary: Component[] = [
  // Hero Components
  {
    id: "hero-gradient",
    name: "Hero with Gradient Orbs",
    description: "Stunning hero with animated gradient orbs and glass effects",
    category: "hero",
    prompt: "Add a hero section with: large gradient text headline (text-7xl), subtitle in gray, two buttons (primary gradient + secondary outline), animated gradient orbs in background with blur effect, floating glassmorphic elements. Dark theme with violet/purple accents.",
    tags: ["hero", "gradient", "animated", "glass"],
    isNew: true,
  },
  {
    id: "hero-split",
    name: "Split Hero with Mockup",
    description: "Content on left, product mockup on right",
    category: "hero",
    prompt: "Add a split hero: left side has headline, description paragraph, feature list with checkmarks, and CTA buttons. Right side has a floating product mockup/dashboard screenshot with glow effect and subtle rotation animation.",
    tags: ["hero", "split", "image", "mockup"],
  },
  {
    id: "hero-centered",
    name: "Centered Hero",
    description: "Centered headline with trust badges below",
    category: "hero",
    prompt: "Add a centered hero with massive headline (text-6xl md:text-7xl), gradient text on key words, brief description, email signup form, and a row of company logos below. Include subtle particle animation in background.",
    tags: ["hero", "centered", "signup", "logos"],
  },
  {
    id: "hero-video",
    name: "Video Background Hero",
    description: "Hero with video background and overlay",
    category: "hero",
    prompt: "Add a hero with dark video background placeholder, semi-transparent overlay, centered white text headline and description, and prominent CTA button with hover glow effect.",
    tags: ["hero", "video", "dark", "overlay"],
  },
  // Navigation
  {
    id: "navbar-glass",
    name: "Glass Navbar",
    description: "Sticky navbar with glassmorphism and blur",
    category: "navigation",
    prompt: "Add a fixed navbar with: glassmorphism effect (bg-white/5 backdrop-blur-xl), logo on left, centered nav links (Features, Pricing, FAQ), CTA button on right. On mobile: hamburger menu that opens full-screen overlay. Add border-bottom that appears on scroll.",
    tags: ["navbar", "glass", "sticky", "responsive"],
    isNew: true,
  },
  {
    id: "navbar-solid",
    name: "Solid Dark Navbar",
    description: "Clean dark navbar with subtle border",
    category: "navigation",
    prompt: "Add a sticky dark navbar with bg-[#0a0a0a], logo, horizontal nav links, and a gradient CTA button. Include mobile hamburger menu.",
    tags: ["navbar", "dark", "solid"],
  },
  // Features
  {
    id: "features-grid",
    name: "6-Card Features Grid",
    description: "Clean 3x2 grid of feature cards",
    category: "features",
    prompt: "Add a features section with section title and subtitle, then 6 feature cards in 3x2 grid. Each card has: icon (use emoji or SVG), title, description. Cards have glass effect with subtle border and hover lift animation.",
    tags: ["features", "grid", "cards", "icons"],
  },
  {
    id: "features-bento",
    name: "Bento Box Layout",
    description: "Modern asymmetric bento grid",
    category: "features",
    prompt: "Add a bento-style features section with varying card sizes (some span 2 columns, some span 2 rows). Include icons, images, and text. Each card has glass effect and hover animation. Make it visually interesting with different content types.",
    tags: ["bento", "grid", "modern", "asymmetric"],
    isNew: true,
  },
  {
    id: "features-alternating",
    name: "Alternating Features",
    description: "Image left, text right, then swap",
    category: "features",
    prompt: "Add 3 feature rows that alternate: first has image on left and content on right, second swaps, third swaps again. Each row has title, description, bullet points with checkmarks, and a small illustration/mockup.",
    tags: ["features", "alternating", "zigzag"],
  },
  // Pricing
  {
    id: "pricing-cards",
    name: "3-Tier Pricing Cards",
    description: "Standard pricing comparison with highlighted plan",
    category: "pricing",
    prompt: "Add a pricing section with 3 cards: Basic ($9/mo), Pro ($29/mo, highlighted with glow and 'Most Popular' badge), Enterprise ($99/mo). Each shows: price, billing period, 5-6 features with checkmarks, CTA button. Pro card has gradient border and elevated shadow.",
    tags: ["pricing", "cards", "comparison", "tiers"],
  },
  {
    id: "pricing-toggle",
    name: "Pricing with Monthly/Yearly Toggle",
    description: "Toggle switch showing annual discount",
    category: "pricing",
    prompt: "Add pricing section with a monthly/yearly toggle at top showing 'Save 20%' badge. 3 pricing cards that update prices based on toggle. Include feature comparison and highlighted Pro tier.",
    tags: ["pricing", "toggle", "discount", "annual"],
  },
  // Testimonials
  {
    id: "testimonials-cards",
    name: "Testimonial Cards Grid",
    description: "Grid of customer testimonials",
    category: "testimonials",
    prompt: "Add a testimonials section with 3 cards showing: 5-star rating, quote text in italics, customer avatar (placeholder circle with initials), name, role and company. Cards have glass effect with subtle glow on hover.",
    tags: ["testimonials", "grid", "ratings", "avatars"],
  },
  {
    id: "testimonials-marquee",
    name: "Scrolling Testimonials",
    description: "Auto-scrolling testimonial marquee",
    category: "testimonials",
    prompt: "Add a testimonials section with horizontally scrolling testimonial cards (CSS animation, infinite scroll). Each card shows avatar, name, company logo, and quote. Two rows scrolling in opposite directions for visual interest.",
    tags: ["testimonials", "marquee", "scrolling", "animated"],
    isNew: true,
  },
  {
    id: "testimonials-large",
    name: "Featured Testimonial",
    description: "Single large featured customer quote",
    category: "testimonials",
    prompt: "Add a centered testimonial section with large quote text (text-2xl), large avatar, customer name, title, company logo. Include quotation marks as decorative elements and subtle background gradient.",
    tags: ["testimonials", "featured", "large", "centered"],
  },
  // CTA
  {
    id: "cta-gradient",
    name: "Gradient CTA Section",
    description: "Full-width gradient call-to-action",
    category: "cta",
    prompt: "Add a CTA section with gradient background (violet to purple), large centered headline, brief description, and prominent white CTA button. Add subtle animated background pattern or noise texture.",
    tags: ["cta", "gradient", "conversion", "full-width"],
  },
  {
    id: "cta-newsletter",
    name: "Newsletter Signup CTA",
    description: "Email capture with inline form",
    category: "cta",
    prompt: "Add a newsletter signup section with headline, brief description, email input field with submit button inline. Include privacy note below form. Glass card effect on dark background.",
    tags: ["newsletter", "email", "signup", "form"],
  },
  {
    id: "cta-split",
    name: "Split CTA with Image",
    description: "CTA with image or illustration on side",
    category: "cta",
    prompt: "Add a CTA section: left side has headline, description, and two buttons (primary and secondary). Right side has an illustration or product mockup. Background has subtle gradient.",
    tags: ["cta", "split", "image", "two-column"],
  },
  // Footer
  {
    id: "footer-mega",
    name: "Mega Footer",
    description: "Full footer with multiple columns and newsletter",
    category: "footer",
    prompt: "Add a comprehensive footer with: logo and tagline, 4 link columns (Product, Company, Resources, Legal), newsletter signup form, social media icons row. Bottom bar with copyright and secondary links.",
    tags: ["footer", "links", "newsletter", "mega"],
  },
  {
    id: "footer-simple",
    name: "Simple Footer",
    description: "Minimal single-row footer",
    category: "footer",
    prompt: "Add a minimal footer with logo on left, inline navigation links, and social icons on right. Single row layout with subtle top border.",
    tags: ["footer", "minimal", "simple", "inline"],
  },
  // Forms
  {
    id: "contact-form",
    name: "Contact Form",
    description: "Full contact form with glass effect",
    category: "forms",
    prompt: "Add a contact section with two columns: left has heading, description, contact details (email, phone, address with icons). Right has glass-effect form with name, email, subject dropdown, message textarea, and submit button.",
    tags: ["form", "contact", "glass", "two-column"],
  },
  {
    id: "login-form",
    name: "Login Form",
    description: "Auth form with social logins",
    category: "forms",
    prompt: "Add a centered login form with: email input, password input with show/hide toggle, 'Remember me' checkbox, 'Forgot password' link, gradient submit button, social login buttons (Google, GitHub), and 'Sign up' link at bottom. Glass card effect.",
    tags: ["form", "login", "auth", "social"],
  },
  // Stats
  {
    id: "stats-counter",
    name: "Stats Counter Row",
    description: "4 key metrics in a row",
    category: "stats",
    prompt: "Add a stats section with 4 metrics in a row: e.g., '10,000+' customers, '99.9%' uptime, '5x' faster, '24/7' support. Large numbers with gradient text, labels below. Subtle dividers between each stat.",
    tags: ["stats", "numbers", "metrics", "counter"],
  },
  {
    id: "stats-cards",
    name: "Stats Cards",
    description: "Individual stat cards with icons",
    category: "stats",
    prompt: "Add a stats section with 4 glass cards, each containing: large number, metric label, icon, and small trend indicator (up arrow with percentage). Cards have subtle glow on hover.",
    tags: ["stats", "cards", "icons", "trends"],
  },
  // FAQ
  {
    id: "faq-accordion",
    name: "FAQ Accordion",
    description: "Expandable FAQ items",
    category: "faq",
    prompt: "Add an FAQ section with title and 6 expandable accordion items. Use HTML details/summary for expand/collapse. Each has question as summary and answer that reveals on click. Include plus/minus icon that rotates on open.",
    tags: ["faq", "accordion", "expandable", "questions"],
  },
  {
    id: "faq-grid",
    name: "FAQ Cards Grid",
    description: "FAQ in a card grid layout",
    category: "faq",
    prompt: "Add an FAQ section displayed as a 2-column grid of cards. Each card shows question as title and answer below. Cards have glass effect and hover animation.",
    tags: ["faq", "grid", "cards"],
  },
  // How It Works
  {
    id: "how-it-works-steps",
    name: "Numbered Steps",
    description: "3-step process with connecting lines",
    category: "howto",
    prompt: "Add a 'How It Works' section with 3 numbered steps. Each step has: large number in gradient circle, title, description. Connect steps with a decorative line or arrow. Layout horizontally on desktop, vertically on mobile.",
    tags: ["steps", "process", "numbered", "howto"],
    isNew: true,
  },
  {
    id: "how-it-works-timeline",
    name: "Vertical Timeline",
    description: "Timeline-style steps",
    category: "howto",
    prompt: "Add a vertical timeline showing 4 steps. Each step has: dot on the timeline, step number, title, description, and optional icon. Timeline line connects all dots with subtle gradient.",
    tags: ["timeline", "vertical", "steps"],
  },
  // Social Proof
  {
    id: "logo-cloud",
    name: "Logo Cloud",
    description: "Row of company logos",
    category: "social",
    prompt: "Add a social proof section with 'Trusted by industry leaders' text and a row of 6+ company logos (use placeholder boxes with company initials or generic SVG icons). Logos should be grayscale with hover color effect.",
    tags: ["logos", "trust", "companies", "social-proof"],
  },
  {
    id: "logo-marquee",
    name: "Scrolling Logo Banner",
    description: "Auto-scrolling logo strip",
    category: "social",
    prompt: "Add an infinitely scrolling logo banner with company logos. Uses CSS animation for smooth horizontal scroll. Logos are grayscale with subtle opacity. Include 'Trusted by 10,000+ teams' text above.",
    tags: ["logos", "marquee", "scrolling", "animated"],
  },
];

const categories = [
  { id: "all", name: "All", icon: Layout },
  { id: "hero", name: "Hero", icon: Sparkles },
  { id: "navigation", name: "Nav", icon: Navigation },
  { id: "features", name: "Features", icon: Box },
  { id: "pricing", name: "Pricing", icon: CreditCard },
  { id: "testimonials", name: "Reviews", icon: MessageSquare },
  { id: "cta", name: "CTA", icon: Type },
  { id: "footer", name: "Footer", icon: Footprints },
  { id: "forms", name: "Forms", icon: FormInput },
  { id: "stats", name: "Stats", icon: BarChart3 },
  { id: "faq", name: "FAQ", icon: MessageSquare },
  { id: "howto", name: "Steps", icon: Layout },
  { id: "social", name: "Logos", icon: Box },
];

interface ComponentLibraryProps {
  onAddComponent: (prompt: string) => void;
}

export const ComponentLibrary = ({ onAddComponent }: ComponentLibraryProps) => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isOpen, setIsOpen] = useState(false);

  const filteredComponents = componentLibrary.filter((component) => {
    const matchesSearch = 
      component.name.toLowerCase().includes(search.toLowerCase()) ||
      component.description.toLowerCase().includes(search.toLowerCase()) ||
      component.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || component.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleAddComponent = (component: Component) => {
    onAddComponent(component.prompt);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 h-8">
          <Plus className="h-4 w-4 mr-2" />
          Components
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[400px] sm:w-[480px] bg-[#0d0d0d] border-white/10 p-0">
        <SheetHeader className="p-4 border-b border-white/10">
          <SheetTitle className="text-white flex items-center gap-2">
            <Box className="h-5 w-5 text-orange-500" />
            Component Library
          </SheetTitle>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Search components..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
        </SheetHeader>

        <Tabs defaultValue="all" className="flex flex-col h-[calc(100vh-140px)]">
          <div className="px-4 py-2 border-b border-white/10">
            <ScrollArea className="w-full">
              <TabsList className="bg-transparent h-auto p-0 gap-1 flex-wrap justify-start">
                {categories.map((cat) => (
                  <TabsTrigger
                    key={cat.id}
                    value={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400 text-white/60 text-xs px-3 py-1.5 rounded-full"
                  >
                    <cat.icon className="h-3 w-3 mr-1.5" />
                    {cat.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
          </div>

          <ScrollArea className="flex-1 px-4 py-3">
            <div className="grid gap-3">
              {filteredComponents.map((component) => (
                <div
                  key={component.id}
                  className="group p-4 rounded-xl bg-white/5 border border-white/10 hover:border-orange-500/50 hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => handleAddComponent(component)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-white group-hover:text-orange-400 transition-colors">
                          {component.name}
                        </h4>
                        {component.isNew && (
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px] px-1.5 py-0">
                            NEW
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-white/50 mt-1">{component.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {component.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {filteredComponents.length === 0 && (
                <div className="text-center py-8 text-white/40">
                  <Box className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No components found</p>
                </div>
              )}
            </div>

            {/* 21st.dev Link */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-orange-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-white">Browse More</h4>
                  <p className="text-xs text-white/50 mt-0.5">Explore 21st.dev community components</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/20"
                  onClick={() => window.open("https://21st.dev/community/components", "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
