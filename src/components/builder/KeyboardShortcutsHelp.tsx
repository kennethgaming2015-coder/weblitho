import { Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getShortcutLabel } from '@/hooks/useKeyboardShortcuts';

const shortcuts = [
  { action: 'new', label: 'New Project', description: 'Create a new project' },
  { action: 'save', label: 'Save', description: 'Save current project' },
  { action: 'undo', label: 'Undo', description: 'Undo last action' },
  { action: 'redo', label: 'Redo', description: 'Redo last undone action' },
  { action: 'preview', label: 'Preview', description: 'Toggle preview mode' },
  { action: 'export', label: 'Export', description: 'Export project' },
  { action: 'publish', label: 'Publish', description: 'Publish website' },
  { action: 'search', label: 'Search', description: 'Open command palette' },
  { action: 'theme', label: 'Toggle Theme', description: 'Switch dark/light mode' },
  { action: 'generate', label: 'Generate', description: 'Submit prompt and generate' },
];

export const KeyboardShortcutsHelp = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Keyboard Shortcuts"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1 mt-4">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.action}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
            >
              <div>
                <p className="text-sm font-medium">{shortcut.label}</p>
                <p className="text-xs text-muted-foreground">{shortcut.description}</p>
              </div>
              <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded">
                {getShortcutLabel(shortcut.action)}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
