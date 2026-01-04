import { X, MousePointer2, Edit3, Palette, Trash2, Copy, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export interface SelectedElement {
  tagName: string;
  className: string;
  id: string;
  text: string;
  path: string; // CSS selector path
  rect: { top: number; left: number; width: number; height: number };
  styles: {
    backgroundColor?: string;
    color?: string;
    fontSize?: string;
    padding?: string;
  };
}

interface ElementSelectorPanelProps {
  selectedElement: SelectedElement | null;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  onClearSelection: () => void;
  onEditElement: (prompt: string) => void;
}

const quickEditActions = [
  { icon: Palette, label: 'Change Colors', prompt: 'Change the colors of this element to be more vibrant' },
  { icon: Edit3, label: 'Edit Text', prompt: 'Improve the text content of this element' },
  { icon: ArrowUp, label: 'Make Larger', prompt: 'Make this element larger with more padding and bigger font' },
  { icon: ArrowDown, label: 'Make Smaller', prompt: 'Make this element more compact and smaller' },
  { icon: Copy, label: 'Duplicate', prompt: 'Duplicate this element with similar styling' },
  { icon: Trash2, label: 'Remove', prompt: 'Remove this element from the page' },
];

export const ElementSelectorPanel = ({
  selectedElement,
  isSelectionMode,
  onToggleSelectionMode,
  onClearSelection,
  onEditElement,
}: ElementSelectorPanelProps) => {
  const [customPrompt, setCustomPrompt] = useState('');

  const handleQuickEdit = (prompt: string) => {
    if (!selectedElement) return;
    
    const elementDescription = getElementDescription(selectedElement);
    const fullPrompt = `For the ${elementDescription}: ${prompt}`;
    onEditElement(fullPrompt);
  };

  const handleCustomEdit = () => {
    if (!selectedElement || !customPrompt.trim()) return;
    
    const elementDescription = getElementDescription(selectedElement);
    const fullPrompt = `For the ${elementDescription}: ${customPrompt}`;
    onEditElement(fullPrompt);
    setCustomPrompt('');
  };

  const getElementDescription = (el: SelectedElement): string => {
    const parts = [];
    
    // Tag name
    parts.push(el.tagName.toLowerCase());
    
    // ID if exists
    if (el.id) {
      parts.push(`with id "${el.id}"`);
    }
    
    // Class names (first 2)
    if (el.className) {
      const classes = el.className.split(' ').filter(c => c && !c.startsWith('hover:')).slice(0, 2);
      if (classes.length > 0) {
        parts.push(`with class "${classes.join(' ')}"`);
      }
    }
    
    // Text content (truncated)
    if (el.text && el.text.length > 0) {
      const truncatedText = el.text.slice(0, 50) + (el.text.length > 50 ? '...' : '');
      parts.push(`containing "${truncatedText}"`);
    }
    
    return parts.join(' ');
  };

  return (
    <div className="border-t border-border/50 bg-card/80 backdrop-blur-xl">
      {/* Selection Mode Toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Button
            variant={isSelectionMode ? "default" : "outline"}
            size="sm"
            onClick={onToggleSelectionMode}
            className={`h-8 gap-2 ${isSelectionMode ? 'bg-primary text-primary-foreground' : ''}`}
          >
            <MousePointer2 className="h-4 w-4" />
            {isSelectionMode ? 'Selection Mode ON' : 'Select Element'}
          </Button>
          {isSelectionMode && (
            <span className="text-xs text-muted-foreground">
              Click on any element in the preview to select it
            </span>
          )}
        </div>
        {selectedElement && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8 gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Selected Element Info */}
      {selectedElement && (
        <div className="p-4 space-y-4">
          {/* Element Info */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  &lt;{selectedElement.tagName.toLowerCase()}&gt;
                </Badge>
                {selectedElement.id && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    #{selectedElement.id}
                  </Badge>
                )}
              </div>
              {selectedElement.className && (
                <p className="text-xs text-muted-foreground font-mono truncate max-w-md">
                  .{selectedElement.className.split(' ').slice(0, 4).join(' .')}
                </p>
              )}
              {selectedElement.text && (
                <p className="text-sm text-foreground/80 truncate max-w-md">
                  "{selectedElement.text.slice(0, 60)}{selectedElement.text.length > 60 ? '...' : ''}"
                </p>
              )}
            </div>
            
            {/* Element Preview Box */}
            <div className="flex-shrink-0 flex items-center gap-2">
              {selectedElement.styles.backgroundColor && (
                <div 
                  className="w-6 h-6 rounded border border-border"
                  style={{ backgroundColor: selectedElement.styles.backgroundColor }}
                  title={`Background: ${selectedElement.styles.backgroundColor}`}
                />
              )}
              {selectedElement.styles.color && (
                <div 
                  className="w-6 h-6 rounded border border-border flex items-center justify-center text-xs font-bold"
                  style={{ color: selectedElement.styles.color }}
                  title={`Text Color: ${selectedElement.styles.color}`}
                >
                  A
                </div>
              )}
            </div>
          </div>

          {/* Quick Edit Actions */}
          <div className="flex flex-wrap gap-2">
            {quickEditActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleQuickEdit(action.prompt)}
                className="h-8 gap-1.5 text-xs"
              >
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            ))}
          </div>

          {/* Custom Edit Input */}
          <div className="flex gap-2">
            <Input
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Describe your change... (e.g., 'make it blue', 'add shadow')"
              className="flex-1 h-9 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCustomEdit();
                }
              }}
            />
            <Button
              onClick={handleCustomEdit}
              disabled={!customPrompt.trim()}
              size="sm"
              className="h-9 gap-1.5"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedElement && isSelectionMode && (
        <div className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
            <MousePointer2 className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">Click on an element</p>
          <p className="text-xs text-muted-foreground mt-1">
            Hover over elements to highlight them, then click to select
          </p>
        </div>
      )}
    </div>
  );
};
