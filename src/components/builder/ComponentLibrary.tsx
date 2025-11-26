import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";

interface ComponentLibraryProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ComponentTemplate {
  id: string;
  name: string;
  category: string;
  preview: string;
  code: string;
}

const components: ComponentTemplate[] = [
  {
    id: "1",
    name: "Hero Section",
    category: "Sections",
    preview: "Full-width hero with title and CTA",
    code: "<div class='bg-gradient-to-r from-blue-500 to-purple-600 text-white p-20'><h1 class='text-5xl font-bold mb-4'>Welcome</h1><p class='text-xl mb-6'>Your journey starts here</p><button class='bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold'>Get Started</button></div>",
  },
  {
    id: "2",
    name: "Navigation Bar",
    category: "Navigation",
    preview: "Responsive navbar with logo and links",
    code: "<nav class='flex items-center justify-between p-4 bg-white shadow-md'><div class='text-xl font-bold'>Logo</div><div class='flex gap-4'><a href='#' class='hover:text-blue-600'>Home</a><a href='#' class='hover:text-blue-600'>About</a><a href='#' class='hover:text-blue-600'>Contact</a></div></nav>",
  },
  {
    id: "3",
    name: "Card Grid",
    category: "Sections",
    preview: "3-column card layout",
    code: "<div class='grid grid-cols-3 gap-6 p-8'><div class='bg-white p-6 rounded-lg shadow-md'><h3 class='font-semibold mb-2'>Feature 1</h3><p class='text-gray-600'>Description</p></div><div class='bg-white p-6 rounded-lg shadow-md'><h3 class='font-semibold mb-2'>Feature 2</h3><p class='text-gray-600'>Description</p></div><div class='bg-white p-6 rounded-lg shadow-md'><h3 class='font-semibold mb-2'>Feature 3</h3><p class='text-gray-600'>Description</p></div></div>",
  },
  {
    id: "4",
    name: "Contact Form",
    category: "Forms",
    preview: "Simple contact form with validation",
    code: "<form class='max-w-md mx-auto p-6 bg-white rounded-lg shadow-md'><h2 class='text-2xl font-bold mb-4'>Contact Us</h2><input type='text' placeholder='Name' class='w-full p-2 mb-4 border rounded'/><input type='email' placeholder='Email' class='w-full p-2 mb-4 border rounded'/><textarea placeholder='Message' class='w-full p-2 mb-4 border rounded h-32'></textarea><button class='w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700'>Send</button></form>",
  },
  {
    id: "5",
    name: "Button Primary",
    category: "Buttons",
    preview: "Primary action button",
    code: "<button class='bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition'>Click Me</button>",
  },
  {
    id: "6",
    name: "Footer",
    category: "Sections",
    preview: "Multi-column footer",
    code: "<footer class='bg-gray-900 text-white p-12'><div class='grid grid-cols-4 gap-8'><div><h4 class='font-bold mb-4'>Company</h4><ul class='space-y-2'><li><a href='#'>About</a></li><li><a href='#'>Careers</a></li></ul></div><div><h4 class='font-bold mb-4'>Resources</h4><ul class='space-y-2'><li><a href='#'>Blog</a></li><li><a href='#'>Docs</a></li></ul></div><div><h4 class='font-bold mb-4'>Legal</h4><ul class='space-y-2'><li><a href='#'>Privacy</a></li><li><a href='#'>Terms</a></li></ul></div><div><h4 class='font-bold mb-4'>Social</h4><ul class='space-y-2'><li><a href='#'>Twitter</a></li><li><a href='#'>LinkedIn</a></li></ul></div></div></footer>",
  },
];

export const ComponentLibrary = ({ isOpen, onClose }: ComponentLibraryProps) => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(components.map((c) => c.category)));

  const filteredComponents = components.filter((component) => {
    const matchesSearch = component.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      !selectedCategory || component.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Component Library</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search components..."
              className="pl-9"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          <ScrollArea className="h-[calc(100vh-240px)]">
            <div className="space-y-4">
              {filteredComponents.map((component) => (
                <div
                  key={component.id}
                  className="p-4 border border-border rounded-lg hover:border-primary transition-smooth cursor-pointer"
                  onClick={() => {
                    // Here you would implement the logic to insert the component
                    console.log("Insert component:", component.code);
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-sm">{component.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {component.category}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost">
                      Insert
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {component.preview}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};
