import { useState } from 'react';
import { 
  Plus, File, Home, Info, Mail, ShoppingCart, Users, Settings, 
  Trash2, MoreVertical, ChevronDown, ChevronRight, 
  FileCode, FileText as FileTextIcon, FolderOpen, Edit2, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ProjectPage, ProjectFile } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

interface ProjectSidebarProps {
  pages: ProjectPage[];
  files?: ProjectFile[];
  activePage: string;
  onPageSelect: (pageId: string) => void;
  onAddPage: (page: Omit<ProjectPage, 'id'>) => void;
  onDeletePage: (pageId: string) => void;
  onRenamePage: (pageId: string, name: string) => void;
  onFileSelect?: (name: string, content: string) => void;
}

const PAGE_ICONS: Record<string, React.ElementType> = {
  home: Home,
  about: Info,
  contact: Mail,
  pricing: DollarSign,
  shop: ShoppingCart,
  team: Users,
  settings: Settings,
  default: File,
};

const PAGE_TEMPLATES = [
  { name: 'About', path: '/about', icon: 'about' },
  { name: 'Contact', path: '/contact', icon: 'contact' },
  { name: 'Pricing', path: '/pricing', icon: 'pricing' },
  { name: 'Blog', path: '/blog', icon: 'default' },
  { name: 'Team', path: '/team', icon: 'team' },
];

const getFileIcon = (fileName: string) => {
  if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) return FileCode;
  if (fileName.endsWith('.ts') || fileName.endsWith('.js')) return FileCode;
  if (fileName.endsWith('.css') || fileName.endsWith('.scss')) return FileCode;
  return FileTextIcon;
};

export const ProjectSidebar = ({
  pages,
  files = [],
  activePage,
  onPageSelect,
  onAddPage,
  onDeletePage,
  onRenamePage,
  onFileSelect,
}: ProjectSidebarProps) => {
  const [pagesOpen, setPagesOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPagePath, setNewPagePath] = useState('');
  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAddPage = () => {
    if (newPageName && newPagePath) {
      onAddPage({
        name: newPageName,
        path: newPagePath.startsWith('/') ? newPagePath : `/${newPagePath}`,
        icon: 'default',
        preview: '',
      });
      setNewPageName('');
      setNewPagePath('');
      setIsAddDialogOpen(false);
    }
  };

  const handleQuickAdd = (template: typeof PAGE_TEMPLATES[0]) => {
    onAddPage({
      name: template.name,
      path: template.path,
      icon: template.icon,
      preview: '',
    });
    setIsAddDialogOpen(false);
  };

  const handleRename = (pageId: string) => {
    if (editName.trim()) {
      onRenamePage(pageId, editName.trim());
      setEditingPage(null);
      setEditName('');
    }
  };

  const getIcon = (iconName?: string) => {
    return PAGE_ICONS[iconName || 'default'] || PAGE_ICONS.default;
  };

  // Group files by folder
  const groupedFiles = files.reduce<Record<string, ProjectFile[]>>((acc, file) => {
    const parts = file.path.split('/');
    const folder = parts.length > 1 ? parts[0] : 'root';
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(file);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full bg-card/30">
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Pages Section */}
          <Collapsible open={pagesOpen} onOpenChange={setPagesOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <div className="flex items-center gap-2">
                  {pagesOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <span className="uppercase tracking-wider">Pages</span>
                  <span className="text-[10px] text-muted-foreground/60">({pages.length})</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 hover:bg-primary/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddDialogOpen(true);
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-0.5">
              {pages.map((page) => {
                const Icon = getIcon(page.icon);
                const isActive = page.id === activePage;
                const isEditing = editingPage === page.id;
                const hasContent = page.preview && page.preview.length > 100;

                return (
                  <div
                    key={page.id}
                    className={cn(
                      "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all ml-1",
                      isActive
                        ? 'bg-primary/15 text-primary border-l-2 border-primary'
                        : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground border-l-2 border-transparent'
                    )}
                    onClick={() => !isEditing && onPageSelect(page.id)}
                  >
                    <div className="relative">
                      <Icon className="h-4 w-4 shrink-0" />
                      {hasContent && (
                        <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    
                    {isEditing ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => handleRename(page.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(page.id);
                          if (e.key === 'Escape') setEditingPage(null);
                        }}
                        className="h-5 text-xs py-0 px-1"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <span className="flex-1 text-xs font-medium truncate">{page.name}</span>
                        <span className="text-[10px] text-muted-foreground/60 truncate max-w-[50px]">
                          {page.path}
                        </span>
                      </>
                    )}

                    {page.path !== '/' && !isEditing && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-28">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPage(page.id);
                              setEditName(page.name);
                            }}
                          >
                            <Edit2 className="h-3 w-3 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePage(page.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>

          {/* Files Section */}
          {files.length > 0 && (
            <Collapsible open={filesOpen} onOpenChange={setFilesOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground mt-2"
                >
                  {filesOpen ? <ChevronDown className="h-3 w-3 mr-2" /> : <ChevronRight className="h-3 w-3 mr-2" />}
                  <span className="uppercase tracking-wider">Files</span>
                  <span className="ml-auto text-[10px] text-muted-foreground/60">{files.length}</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-0.5 ml-1">
                {Object.entries(groupedFiles).map(([folder, folderFiles]) => (
                  <div key={folder}>
                    {folder !== 'root' && (
                      <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
                        <FolderOpen className="h-3 w-3" />
                        <span>{folder}</span>
                      </div>
                    )}
                    {folderFiles.map((file) => {
                      const FileIcon = getFileIcon(file.path);
                      const displayName = folder !== 'root' 
                        ? file.path.replace(`${folder}/`, '') 
                        : file.path;
                      
                      return (
                        <Button
                          key={file.path}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "w-full justify-start h-6 px-2 text-xs text-muted-foreground hover:text-foreground",
                            folder !== 'root' && "ml-4"
                          )}
                          onClick={() => onFileSelect?.(file.path, file.content)}
                        >
                          <FileIcon className="h-3 w-3 mr-2 shrink-0" />
                          <span className="truncate">{displayName}</span>
                        </Button>
                      );
                    })}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </ScrollArea>

      {/* Add Page Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Page</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-2">
                {PAGE_TEMPLATES.filter(
                  (t) => !pages.some((p) => p.path === t.path)
                ).map((template) => (
                  <Button
                    key={template.path}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAdd(template)}
                  >
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm text-muted-foreground mb-2">Or create custom:</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Page Name</label>
                  <Input
                    placeholder="e.g., Services"
                    value={newPageName}
                    onChange={(e) => setNewPageName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">URL Path</label>
                  <Input
                    placeholder="e.g., /services"
                    value={newPagePath}
                    onChange={(e) => setNewPagePath(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPage} disabled={!newPageName || !newPagePath}>
              Add Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
