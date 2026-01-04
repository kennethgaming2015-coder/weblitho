import { useState } from 'react';
import { 
  Plus, Palette, Type, Layout, Wand2, Sparkles, 
  Image, Layers, Grid, ArrowUp, ArrowDown, 
  Trash2, Copy, RefreshCw, Zap, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface QuickActionBarProps {
  onAction: (prompt: string) => void;
  disabled?: boolean;
}

const sectionActions = [
  { icon: Layout, label: 'Hero Section', prompt: 'Add a stunning hero section with headline, subheadline, and CTA buttons' },
  { icon: Grid, label: 'Features Grid', prompt: 'Add a features section with 6 feature cards in a grid layout with icons' },
  { icon: Layers, label: 'Testimonials', prompt: 'Add a testimonials section with customer quotes, photos, and company logos' },
  { icon: Image, label: 'Gallery', prompt: 'Add an image gallery section with a grid of photos and lightbox effect' },
  { icon: Type, label: 'Pricing Table', prompt: 'Add a pricing section with 3 pricing tiers showing features and CTA buttons' },
  { icon: Plus, label: 'FAQ Section', prompt: 'Add an FAQ section with accordion-style questions and answers' },
  { icon: Sparkles, label: 'CTA Banner', prompt: 'Add a call-to-action banner with gradient background, compelling headline and signup form' },
  { icon: Layout, label: 'Footer', prompt: 'Add a professional footer with multiple columns, links, social icons, and newsletter signup' },
];

const styleActions = [
  { icon: Palette, label: 'Darker Theme', prompt: 'Make the design darker with deeper backgrounds and more contrast' },
  { icon: Palette, label: 'Lighter Theme', prompt: 'Make the design lighter and cleaner with more white space' },
  { icon: Sparkles, label: 'Add Gradients', prompt: 'Add beautiful gradient backgrounds and gradient text effects' },
  { icon: Zap, label: 'More Animations', prompt: 'Add more animations, hover effects, and micro-interactions throughout' },
  { icon: Type, label: 'Modern Typography', prompt: 'Improve typography with better font choices, sizes, and spacing' },
  { icon: Layout, label: 'More Spacing', prompt: 'Add more breathing room with generous padding and margins' },
];

const improveActions = [
  { icon: RefreshCw, label: 'Improve Overall', prompt: 'Improve the overall design quality with better visuals, spacing, and polish' },
  { icon: Wand2, label: 'Make Premium', prompt: 'Make the design look more premium and professional with refined details' },
  { icon: Sparkles, label: 'Add Effects', prompt: 'Add glassmorphism, shadows, and subtle visual effects for depth' },
  { icon: Image, label: 'Better Images', prompt: 'Improve image placeholders with better aspect ratios and modern styling' },
];

export const QuickActionBar = ({ onAction, disabled }: QuickActionBarProps) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/90 backdrop-blur-xl border-border/50 shadow-xl"
      >
        <Wand2 className="h-4 w-4 mr-2" />
        Quick Actions
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2 rounded-2xl bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl animate-fade-in">
      {/* Add Section Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-9 px-3 gap-2 rounded-xl hover:bg-primary/10 hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Add Section
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Add New Section</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sectionActions.map((action, index) => (
            <DropdownMenuItem 
              key={index}
              onClick={() => onAction(action.prompt)}
              className="gap-2 cursor-pointer"
            >
              <action.icon className="h-4 w-4 text-muted-foreground" />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-6 w-px bg-border/50" />

      {/* Style Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-9 px-3 gap-2 rounded-xl hover:bg-primary/10 hover:text-primary"
          >
            <Palette className="h-4 w-4" />
            Style
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Change Style</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {styleActions.map((action, index) => (
            <DropdownMenuItem 
              key={index}
              onClick={() => onAction(action.prompt)}
              className="gap-2 cursor-pointer"
            >
              <action.icon className="h-4 w-4 text-muted-foreground" />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-6 w-px bg-border/50" />

      {/* Improve Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-9 px-3 gap-2 rounded-xl hover:bg-primary/10 hover:text-primary"
          >
            <Wand2 className="h-4 w-4" />
            Improve
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Improve Design</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {improveActions.map((action, index) => (
            <DropdownMenuItem 
              key={index}
              onClick={() => onAction(action.prompt)}
              className="gap-2 cursor-pointer"
            >
              <action.icon className="h-4 w-4 text-muted-foreground" />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-6 w-px bg-border/50" />

      {/* Quick Actions */}
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => onAction('Regenerate this design with a completely fresh approach while keeping the same structure')}
        className="h-9 px-3 gap-2 rounded-xl hover:bg-primary/10 hover:text-primary"
        title="Regenerate"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => onAction('Add smooth scroll animations and micro-interactions to all elements')}
        className="h-9 px-3 gap-2 rounded-xl hover:bg-primary/10 hover:text-primary"
        title="Add Animations"
      >
        <Sparkles className="h-4 w-4" />
      </Button>

      {/* Close */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsVisible(false)}
        className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
        title="Hide toolbar"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
};
