import { useState } from "react";
import { Plus, FileText, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Page } from "@/pages/Index";

interface ProjectSidebarProps {
  pages: Page[];
  currentPageId: string;
  onPageSelect: (pageId: string) => void;
  onAddPage: (name: string, path: string) => void;
  onDeletePage: (pageId: string) => void;
  onOpenLibrary: () => void;
}

export const ProjectSidebar = ({
  pages,
  currentPageId,
  onPageSelect,
  onAddPage,
  onDeletePage,
  onOpenLibrary,
}: ProjectSidebarProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPagePath, setNewPagePath] = useState("");

  const handleAddPage = () => {
    if (newPageName && newPagePath) {
      onAddPage(newPageName, newPagePath);
      setNewPageName("");
      setNewPagePath("");
      setIsAddDialogOpen(false);
    }
  };

  return (
    <aside className="w-[280px] border-r border-border bg-card flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-sm mb-3">Project</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              New Page
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Page</DialogTitle>
              <DialogDescription>
                Add a new page to your project
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Page Name</label>
                <Input
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  placeholder="About Us"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Path</label>
                <Input
                  value={newPagePath}
                  onChange={(e) => setNewPagePath(e.target.value)}
                  placeholder="/about"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddPage}>Create Page</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-4 border-b border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onOpenLibrary}
        >
          <Package className="h-4 w-4 mr-2" />
          Component Library
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">
            PAGES
          </h3>
          {pages.map((page) => (
            <div
              key={page.id}
              className={`group flex items-center justify-between p-2 rounded-md transition-smooth cursor-pointer ${
                currentPageId === page.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              }`}
              onClick={() => onPageSelect(page.id)}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">{page.name}</span>
              </div>
              {pages.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-smooth"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePage(page.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
};
