import { useRef, useEffect } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { Copy, Download, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface MonacoEditorProps {
  content: string;
  language?: string;
  fileName?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const getLanguageFromFileName = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    'tsx': 'typescript',
    'ts': 'typescript',
    'jsx': 'javascript',
    'js': 'javascript',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'md': 'markdown',
  };
  return langMap[ext] || 'plaintext';
};

export const MonacoEditor = ({
  content,
  language,
  fileName = "index.tsx",
  readOnly = true,
  onChange,
  isFullscreen = false,
  onToggleFullscreen,
}: MonacoEditorProps) => {
  const { toast } = useToast();
  const editorRef = useRef<any>(null);

  const detectedLanguage = language || getLanguageFromFileName(fileName);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard" });
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Downloaded ${fileName}` });
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] rounded-lg overflow-hidden border border-border/30">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="ml-2 text-xs font-medium text-muted-foreground">{fileName}</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary/20 text-primary uppercase">
            {detectedLanguage}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          {onToggleFullscreen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFullscreen}
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={detectedLanguage}
          value={content}
          theme="vs-dark"
          onMount={handleEditorMount}
          onChange={(value) => onChange?.(value || "")}
          options={{
            readOnly,
            minimap: { enabled: true },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: "all",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, 'Courier New', monospace",
            fontLigatures: true,
          }}
        />
      </div>
    </div>
  );
};
