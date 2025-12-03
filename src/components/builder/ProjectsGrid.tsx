import { FolderOpen, Clock, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Project } from '@/hooks/useProjects';
import { formatDistanceToNow } from 'date-fns';

interface ProjectsGridProps {
  projects: Project[];
  loading: boolean;
  onOpenProject: (project: Project) => void;
  onNewProject: () => void;
}

export const ProjectsGrid = ({ projects, loading, onOpenProject, onNewProject }: ProjectsGridProps) => {
  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden bg-card/50 border-border/50">
              <Skeleton className="h-24 w-full" />
              <CardContent className="p-3">
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return null;
  }

  // Show max 8 recent projects
  const recentProjects = projects.slice(0, 8);

  return (
    <div className="w-full max-w-5xl mx-auto px-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground/90">Recent Projects</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onNewProject}
          className="text-muted-foreground hover:text-foreground gap-1.5"
        >
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {recentProjects.map((project) => (
          <Card
            key={project.id}
            className="overflow-hidden group hover:border-primary/50 bg-card/50 border-border/50 transition-all cursor-pointer hover:bg-card/80"
            onClick={() => onOpenProject(project)}
          >
            {/* Preview thumbnail */}
            <div className="h-24 bg-muted/20 relative overflow-hidden">
              {project.preview ? (
                <iframe
                  srcDoc={project.preview}
                  className="w-full h-full scale-[0.25] origin-top-left pointer-events-none"
                  style={{ width: '400%', height: '400%' }}
                  title={project.name}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <FolderOpen className="h-8 w-8 text-muted-foreground/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <CardContent className="p-3">
              <h3 className="font-medium text-sm truncate">{project.name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
