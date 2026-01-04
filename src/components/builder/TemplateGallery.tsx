import { useState } from 'react';
import { 
  Sparkles, Layout, ShoppingBag, Briefcase, PenTool, Rocket, 
  Code, Newspaper, GraduationCap, Utensils, Home, Heart,
  Building2, Music, Plane, Camera, Dumbbell, Leaf
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  prompt: string;
  gradient: string;
  tags: string[];
}

const templates: Template[] = [
  {
    id: 'saas-landing',
    name: 'SaaS Landing Page',
    description: 'Modern landing page for software products with hero, features, pricing, and CTA sections',
    category: 'Business',
    icon: <Rocket className="h-5 w-5" />,
    gradient: 'from-violet-500 to-purple-600',
    tags: ['software', 'startup', 'product'],
    prompt: 'Create a modern SaaS landing page with: 1) A stunning hero section with gradient background, headline, subheadline, and two CTA buttons 2) Trusted by logos section 3) Features grid with 6 key features and icons 4) How it works section with 3 steps 5) Pricing section with 3 tiers (Free, Pro, Enterprise) 6) Testimonials carousel 7) FAQ section 8) Final CTA section 9) Professional footer. Use a modern tech color scheme with purple/blue gradients. Make it fully responsive and premium looking.',
  },
  {
    id: 'portfolio',
    name: 'Creative Portfolio',
    description: 'Stunning portfolio for designers, developers, and creatives',
    category: 'Personal',
    icon: <PenTool className="h-5 w-5" />,
    gradient: 'from-pink-500 to-rose-600',
    tags: ['designer', 'developer', 'creative'],
    prompt: 'Create a creative portfolio website with: 1) Striking hero with animated text, name, title, and photo placeholder 2) About me section with bio and skills 3) Projects showcase grid with hover effects (6 project cards) 4) Services section with what I offer 5) Experience timeline 6) Testimonials from clients 7) Contact section with form 8) Social links footer. Use a bold, creative color scheme with pink/orange accents. Add subtle animations and make it visually stunning.',
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce Store',
    description: 'Beautiful online store with product showcase and shopping features',
    category: 'E-Commerce',
    icon: <ShoppingBag className="h-5 w-5" />,
    gradient: 'from-emerald-500 to-teal-600',
    tags: ['shop', 'products', 'retail'],
    prompt: 'Create a modern e-commerce store homepage with: 1) Navigation with logo, search bar, cart icon 2) Hero banner with featured product/sale 3) Category cards (4 categories) 4) Featured products grid (8 products with image, name, price, rating) 5) Special offer banner 6) New arrivals section 7) Brand logos 8) Newsletter signup 9) Footer with links, payment icons, social media. Use an elegant color scheme. Make products look appealing with hover effects.',
  },
  {
    id: 'agency',
    name: 'Digital Agency',
    description: 'Professional agency website with services and case studies',
    category: 'Business',
    icon: <Briefcase className="h-5 w-5" />,
    gradient: 'from-blue-500 to-cyan-600',
    tags: ['marketing', 'design', 'consulting'],
    prompt: 'Create a digital agency website with: 1) Bold hero with agency tagline, description, and contact CTA 2) Services section (Web Design, Development, Marketing, Branding) 3) Stats/numbers section (projects completed, clients, awards) 4) Case studies grid with featured work 5) Team section with 4 team members 6) Client logos 7) Process/approach section 8) Contact section with form 9) Professional footer. Use a clean, corporate blue color scheme. Make it trustworthy and professional.',
  },
  {
    id: 'blog',
    name: 'Modern Blog',
    description: 'Clean blog layout with featured posts and categories',
    category: 'Content',
    icon: <Newspaper className="h-5 w-5" />,
    gradient: 'from-amber-500 to-orange-600',
    tags: ['articles', 'writing', 'news'],
    prompt: 'Create a modern blog homepage with: 1) Header with logo, navigation, and search 2) Featured post hero with large image 3) Recent posts grid (6 posts with image, title, excerpt, date, category tag) 4) Categories sidebar 5) Newsletter subscription box 6) Popular posts sidebar 7) Author spotlight section 8) Footer with links. Use a warm, readable color scheme. Focus on typography and readability. Add hover effects on post cards.',
  },
  {
    id: 'startup',
    name: 'Startup Launch',
    description: 'Coming soon / launch page for new products or startups',
    category: 'Business',
    icon: <Sparkles className="h-5 w-5" />,
    gradient: 'from-indigo-500 to-violet-600',
    tags: ['coming soon', 'beta', 'waitlist'],
    prompt: 'Create a startup launch/coming soon page with: 1) Dramatic hero with product name, tagline, and animated background 2) Email signup form for early access 3) Key features preview (4 features) 4) Countdown timer component 5) Social proof (waitlist count, press mentions) 6) Founders section 7) FAQ section 8) Social media links. Use a bold, energetic color scheme with indigo/violet. Make it feel exclusive and exciting. Add animations.',
  },
  {
    id: 'developer',
    name: 'Developer Portfolio',
    description: 'Technical portfolio for software developers with GitHub integration',
    category: 'Personal',
    icon: <Code className="h-5 w-5" />,
    gradient: 'from-slate-600 to-slate-800',
    tags: ['coding', 'github', 'tech'],
    prompt: 'Create a developer portfolio with: 1) Terminal-style hero with typing animation effect 2) About section with tech stack icons 3) Featured projects with GitHub links (6 projects) 4) Skills section with progress bars 5) Open source contributions section 6) Blog/writing section 7) Contact form 8) Dark themed footer with social links. Use a dark, techy color scheme with green accents. Include code-like styling elements.',
  },
  {
    id: 'restaurant',
    name: 'Restaurant & Cafe',
    description: 'Appetizing website for restaurants, cafes, and food businesses',
    category: 'Food & Drink',
    icon: <Utensils className="h-5 w-5" />,
    gradient: 'from-orange-500 to-red-600',
    tags: ['food', 'menu', 'dining'],
    prompt: 'Create a restaurant website with: 1) Hero with appetizing food image and restaurant name 2) About/story section 3) Featured menu items grid 4) Full menu section with categories 5) Reservation booking form 6) Gallery of restaurant ambiance 7) Location map and hours 8) Customer reviews 9) Footer with contact info. Use warm, appetizing colors. Make food look delicious with proper styling.',
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    description: 'Property listing website with search and featured homes',
    category: 'Business',
    icon: <Home className="h-5 w-5" />,
    gradient: 'from-sky-500 to-blue-600',
    tags: ['property', 'homes', 'listings'],
    prompt: 'Create a real estate website with: 1) Hero with property search bar 2) Featured properties grid (6 listings with image, price, beds, baths) 3) Property categories (Buy, Rent, Sell) 4) Why choose us section 5) Agent team section 6) Testimonials from clients 7) Blog/resources section 8) Contact and newsletter 9) Footer. Use clean, professional blue colors. Make property cards look appealing.',
  },
  {
    id: 'fitness',
    name: 'Fitness & Gym',
    description: 'Energetic website for gyms, fitness centers, and trainers',
    category: 'Health',
    icon: <Dumbbell className="h-5 w-5" />,
    gradient: 'from-red-500 to-orange-600',
    tags: ['workout', 'training', 'health'],
    prompt: 'Create a fitness website with: 1) High-energy hero with workout imagery 2) Programs/classes section 3) Trainer profiles (4 trainers) 4) Membership plans (3 tiers) 5) Success stories/transformations 6) Class schedule 7) Facilities gallery 8) Free trial signup form 9) Footer. Use bold, energetic red/orange colors. Make it feel motivating and powerful.',
  },
  {
    id: 'nonprofit',
    name: 'Non-Profit',
    description: 'Heartfelt website for charities and non-profit organizations',
    category: 'Non-Profit',
    icon: <Heart className="h-5 w-5" />,
    gradient: 'from-rose-500 to-pink-600',
    tags: ['charity', 'donate', 'cause'],
    prompt: 'Create a non-profit website with: 1) Emotional hero with cause statement and donate CTA 2) Mission/about section 3) Impact stats (people helped, funds raised) 4) Programs/initiatives 5) Ways to help (donate, volunteer, spread word) 6) Success stories 7) Team/leadership section 8) Events calendar 9) Donation form 10) Footer. Use warm, compassionate colors. Make it feel trustworthy and inspiring.',
  },
  {
    id: 'education',
    name: 'Online Course',
    description: 'Learning platform with course catalog and enrollment',
    category: 'Education',
    icon: <GraduationCap className="h-5 w-5" />,
    gradient: 'from-teal-500 to-cyan-600',
    tags: ['learning', 'courses', 'teaching'],
    prompt: 'Create an online course website with: 1) Hero with course value proposition 2) Featured courses grid (6 courses with thumbnail, title, instructor, rating) 3) Course categories 4) How it works section 5) Instructor spotlight 6) Student success stories 7) Pricing/subscription options 8) FAQ section 9) Newsletter signup 10) Footer. Use clean, educational colors. Make it feel professional and trustworthy.',
  },
  {
    id: 'travel',
    name: 'Travel & Tourism',
    description: 'Wanderlust-inspiring website for travel agencies and destinations',
    category: 'Travel',
    icon: <Plane className="h-5 w-5" />,
    gradient: 'from-cyan-500 to-blue-600',
    tags: ['vacation', 'tours', 'destinations'],
    prompt: 'Create a travel website with: 1) Stunning hero with destination search 2) Popular destinations grid (6 places with image and price) 3) Featured tours/packages 4) Why book with us section 5) Traveler reviews 6) Travel tips blog section 7) Special offers banner 8) Newsletter for deals 9) Footer with quick links. Use vibrant, adventurous colors. Make destinations look irresistible.',
  },
  {
    id: 'photography',
    name: 'Photography Studio',
    description: 'Visual portfolio for photographers with gallery showcase',
    category: 'Personal',
    icon: <Camera className="h-5 w-5" />,
    gradient: 'from-neutral-600 to-neutral-800',
    tags: ['photos', 'gallery', 'visual'],
    prompt: 'Create a photography portfolio with: 1) Full-screen hero with stunning image 2) About the photographer 3) Portfolio galleries by category (6+ images) 4) Services offered (weddings, portraits, events) 5) Pricing packages 6) Client testimonials 7) Behind the scenes section 8) Contact/booking form 9) Instagram feed integration 10) Minimal footer. Use minimal, elegant colors that let photos shine. Focus on visual impact.',
  },
  {
    id: 'music',
    name: 'Music Artist',
    description: 'Bold website for musicians, bands, and music producers',
    category: 'Entertainment',
    icon: <Music className="h-5 w-5" />,
    gradient: 'from-purple-600 to-pink-600',
    tags: ['artist', 'band', 'producer'],
    prompt: 'Create a music artist website with: 1) Dramatic hero with artist image and latest release 2) Music player/streaming links 3) Discography/albums section 4) Tour dates/events 5) Music videos section 6) Merchandise store 7) Bio/about section 8) Fan newsletter signup 9) Social media links 10) Footer. Use bold, vibrant colors. Make it feel artistic and expressive.',
  },
  {
    id: 'eco',
    name: 'Eco & Sustainability',
    description: 'Green website for eco-friendly brands and sustainability initiatives',
    category: 'Non-Profit',
    icon: <Leaf className="h-5 w-5" />,
    gradient: 'from-green-500 to-emerald-600',
    tags: ['green', 'sustainable', 'environment'],
    prompt: 'Create an eco-friendly brand website with: 1) Natural hero with environmental message 2) Mission/values section 3) Sustainable products or initiatives 4) Environmental impact stats 5) How it works/process 6) Certifications and partners 7) Blog/resources section 8) Join the movement CTA 9) Footer with sustainability pledge. Use natural green colors. Make it feel authentic and purposeful.',
  },
  {
    id: 'corporate',
    name: 'Corporate Website',
    description: 'Professional website for enterprises and B2B companies',
    category: 'Business',
    icon: <Building2 className="h-5 w-5" />,
    gradient: 'from-slate-600 to-blue-700',
    tags: ['enterprise', 'b2b', 'professional'],
    prompt: 'Create a corporate website with: 1) Professional hero with company value proposition 2) Services/solutions section 3) Industry expertise areas 4) Case studies/success stories 5) Key metrics and achievements 6) Leadership team 7) Company values/culture 8) Careers section 9) Contact form 10) Professional footer. Use conservative, trustworthy colors. Make it feel established and reliable.',
  },
];

interface TemplateGalleryProps {
  onSelectTemplate: (prompt: string) => void;
}

export const TemplateGallery = ({ onSelectTemplate }: TemplateGalleryProps) => {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = Array.from(new Set(templates.map(t => t.category)));
  
  const filteredTemplates = templates.filter(t => {
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleSelect = (template: Template) => {
    onSelectTemplate(template.prompt);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="gap-2 bg-white/5 border-border/50 hover:bg-white/10 hover:border-primary/50 h-8"
        >
          <Layout className="h-4 w-4" />
          <span className="hidden md:inline">Templates</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            Template Gallery
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              {templates.length} templates
            </span>
          </DialogTitle>
        </DialogHeader>
        
        {/* Search & Filter */}
        <div className="px-6 py-3 border-b border-border/50 space-y-3">
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="h-7 text-xs"
            >
              All
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="h-7 text-xs"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 max-h-[60vh]">
          {filteredTemplates.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No templates match your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  className={cn(
                    "group relative p-4 rounded-xl border border-border/50 text-left transition-all",
                    "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
                    "bg-card/50 hover:bg-card/80"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2.5 rounded-xl bg-gradient-to-br text-white shrink-0 shadow-lg",
                      template.gradient
                    )}>
                      {template.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {template.category}
                        </span>
                        {template.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/70">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Hover indicator */}
                  <div className="absolute inset-0 rounded-xl border-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
