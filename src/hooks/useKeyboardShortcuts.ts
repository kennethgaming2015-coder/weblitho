import { useEffect, useCallback } from 'react';
import { useToast } from './use-toast';

interface ShortcutConfig {
  onNewProject?: () => void;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onPreview?: () => void;
  onCode?: () => void;
  onPublish?: () => void;
  onToggleTheme?: () => void;
  onExport?: () => void;
  onSearch?: () => void;
  onGenerate?: () => void;
}

export const useKeyboardShortcuts = (config: ShortcutConfig) => {
  const { toast } = useToast();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

    // Ignore if in input/textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Allow some shortcuts even in inputs
      if (!(ctrlOrCmd && (event.key === 's' || event.key === 'S'))) {
        return;
      }
    }

    // Ctrl/Cmd + N = New Project
    if (ctrlOrCmd && (event.key === 'n' || event.key === 'N') && !event.shiftKey) {
      event.preventDefault();
      config.onNewProject?.();
      toast({ title: 'Keyboard Shortcut', description: 'New Project (Ctrl+N)' });
    }

    // Ctrl/Cmd + S = Save
    if (ctrlOrCmd && (event.key === 's' || event.key === 'S') && !event.shiftKey) {
      event.preventDefault();
      config.onSave?.();
    }

    // Ctrl/Cmd + Z = Undo
    if (ctrlOrCmd && (event.key === 'z' || event.key === 'Z') && !event.shiftKey) {
      event.preventDefault();
      config.onUndo?.();
    }

    // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y = Redo
    if ((ctrlOrCmd && event.shiftKey && (event.key === 'z' || event.key === 'Z')) ||
        (ctrlOrCmd && (event.key === 'y' || event.key === 'Y'))) {
      event.preventDefault();
      config.onRedo?.();
    }

    // Ctrl/Cmd + P = Preview
    if (ctrlOrCmd && (event.key === 'p' || event.key === 'P') && !event.shiftKey) {
      event.preventDefault();
      config.onPreview?.();
    }

    // Ctrl/Cmd + E = Export
    if (ctrlOrCmd && (event.key === 'e' || event.key === 'E') && !event.shiftKey) {
      event.preventDefault();
      config.onExport?.();
    }

    // Ctrl/Cmd + Shift + P = Publish
    if (ctrlOrCmd && event.shiftKey && (event.key === 'p' || event.key === 'P')) {
      event.preventDefault();
      config.onPublish?.();
    }

    // Ctrl/Cmd + K = Search/Command palette
    if (ctrlOrCmd && (event.key === 'k' || event.key === 'K')) {
      event.preventDefault();
      config.onSearch?.();
    }

    // Ctrl/Cmd + D = Toggle theme
    if (ctrlOrCmd && (event.key === 'd' || event.key === 'D') && !event.shiftKey) {
      event.preventDefault();
      config.onToggleTheme?.();
    }

    // Ctrl/Cmd + Enter = Generate
    if (ctrlOrCmd && event.key === 'Enter') {
      event.preventDefault();
      config.onGenerate?.();
    }
  }, [config, toast]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

// Shortcut labels for display
export const getShortcutLabel = (action: string): string => {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts: Record<string, string> = {
    new: `${cmdKey}+N`,
    save: `${cmdKey}+S`,
    undo: `${cmdKey}+Z`,
    redo: isMac ? `${cmdKey}+⇧+Z` : `${cmdKey}+Y`,
    preview: `${cmdKey}+P`,
    code: `${cmdKey}+⇧+C`,
    publish: `${cmdKey}+⇧+P`,
    export: `${cmdKey}+E`,
    search: `${cmdKey}+K`,
    theme: `${cmdKey}+D`,
    generate: `${cmdKey}+↵`,
  };

  return shortcuts[action] || '';
};
