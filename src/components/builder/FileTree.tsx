import { useState } from "react";
import { ChevronRight, ChevronDown, FileCode, FileText, Folder, FolderOpen, Code2, Braces } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  language?: string;
  lines?: number;
}

interface FileTreeProps {
  code: string;
}

const getFileIcon = (name: string, language?: string) => {
  if (name.endsWith(".tsx") || name.endsWith(".jsx")) return <Code2 className="h-4 w-4 text-cyan-400" />;
  if (name.endsWith(".ts") || name.endsWith(".js")) return <Braces className="h-4 w-4 text-amber-400" />;
  if (name.endsWith(".css") || name.endsWith(".scss")) return <FileCode className="h-4 w-4 text-pink-400" />;
  if (name.endsWith(".html")) return <FileCode className="h-4 w-4 text-orange-400" />;
  if (name.endsWith(".json")) return <Braces className="h-4 w-4 text-emerald-400" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
};

const parseCodeToFileTree = (code: string): FileNode[] => {
  const files: FileNode[] = [];
  
  files.push({
    name: "src",
    type: "folder",
    children: [
      {
        name: "components",
        type: "folder",
        children: [],
      },
      {
        name: "App.tsx",
        type: "file",
        language: "typescript",
        lines: 0,
      },
      {
        name: "index.tsx",
        type: "file",
        language: "typescript",
        lines: 0,
      },
    ],
  });

  const componentRegex = /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g;
  const functionComponentRegex = /function\s+(\w+)\s*\(/g;
  
  const components: string[] = [];
  let match;
  
  while ((match = componentRegex.exec(code)) !== null) {
    const componentName = match[1];
    if (componentName && componentName[0] === componentName[0].toUpperCase()) {
      components.push(componentName);
    }
  }
  
  while ((match = functionComponentRegex.exec(code)) !== null) {
    const componentName = match[1];
    if (componentName && componentName[0] === componentName[0].toUpperCase()) {
      components.push(componentName);
    }
  }

  const componentsFolder = files[0].children?.find(f => f.name === "components");
  if (componentsFolder && componentsFolder.children) {
    const uniqueComponents = [...new Set(components)];
    uniqueComponents.forEach((name) => {
      if (name !== "App") {
        componentsFolder.children?.push({
          name: `${name}.tsx`,
          type: "file",
          language: "typescript",
        });
      }
    });

    const appFile = files[0].children?.find(f => f.name === "App.tsx");
    if (appFile) {
      appFile.lines = code.split("\n").length;
    }
  }

  files.push({
    name: "public",
    type: "folder",
    children: [
      { name: "index.html", type: "file", language: "html" },
      { name: "favicon.ico", type: "file" },
    ],
  });

  files.push({ name: "package.json", type: "file", language: "json" });
  files.push({ name: "tailwind.config.js", type: "file", language: "javascript" });
  files.push({ name: "tsconfig.json", type: "file", language: "json" });

  return files;
};

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  selectedFile: string | null;
  onSelect: (name: string) => void;
}

const TreeNode = ({ node, depth, selectedFile, onSelect }: TreeNodeProps) => {
  const [isOpen, setIsOpen] = useState(depth < 2);

  const handleClick = () => {
    if (node.type === "folder") {
      setIsOpen(!isOpen);
    } else {
      onSelect(node.name);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 py-1.5 px-2 cursor-pointer rounded-lg hover:bg-white/5 transition-colors group",
          selectedFile === node.name && "bg-primary/20 text-primary"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === "folder" ? (
          <>
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {isOpen ? (
              <FolderOpen className="h-4 w-4 text-primary" />
            ) : (
              <Folder className="h-4 w-4 text-primary/70" />
            )}
          </>
        ) : (
          <>
            <span className="w-3.5" />
            {getFileIcon(node.name, node.language)}
          </>
        )}
        <span className={cn(
          "text-sm truncate",
          node.type === "folder" ? "text-foreground/80" : "text-muted-foreground group-hover:text-foreground"
        )}>
          {node.name}
        </span>
        {node.lines && (
          <span className="text-[10px] text-muted-foreground/50 ml-auto">{node.lines}</span>
        )}
      </div>
      {node.type === "folder" && isOpen && node.children && (
        <div>
          {node.children.map((child, index) => (
            <TreeNode
              key={`${child.name}-${index}`}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree = ({ code }: FileTreeProps) => {
  const [selectedFile, setSelectedFile] = useState<string | null>("App.tsx");
  const fileTree = parseCodeToFileTree(code);

  return (
    <div className="h-full bg-card/30 backdrop-blur-xl">
      <div className="px-3 py-2.5 border-b border-border/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Explorer</h3>
      </div>
      <ScrollArea className="h-[calc(100%-40px)]">
        <div className="py-2">
          {fileTree.map((node, index) => (
            <TreeNode
              key={`${node.name}-${index}`}
              node={node}
              depth={0}
              selectedFile={selectedFile}
              onSelect={setSelectedFile}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
