import { useState } from "react";
import { Download, Github, Loader2, ExternalLink, FolderArchive, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import sdk from "@stackblitz/sdk";

interface ProjectFile {
  path: string;
  content: string;
}

interface ExportOptionsProps {
  code: string;
  files?: ProjectFile[];
  projectName?: string;
}

export const ExportOptions = ({ code, files, projectName = "weblitho-project" }: ExportOptionsProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showGitHubDialog, setShowGitHubDialog] = useState(false);
  const [repoName, setRepoName] = useState(projectName);
  const [isPrivate, setIsPrivate] = useState(true);
  const { toast } = useToast();

  const sanitizedProjectName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");

  // Generate a complete, production-ready Vite + React + TypeScript + Tailwind project
  const generateViteProject = (): Record<string, string> => {
    const projectFiles: Record<string, string> = {};

    // package.json - Complete with all necessary dependencies
    projectFiles["package.json"] = JSON.stringify({
      name: sanitizedProjectName,
      private: true,
      version: "1.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc && vite build",
        lint: "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
        preview: "vite preview"
      },
      dependencies: {
        "react": "^18.3.1",
        "react-dom": "^18.3.1",
        "lucide-react": "^0.462.0",
        "clsx": "^2.1.1",
        "tailwind-merge": "^2.6.0"
      },
      devDependencies: {
        "@types/react": "^18.3.0",
        "@types/react-dom": "^18.3.0",
        "@typescript-eslint/eslint-plugin": "^7.0.0",
        "@typescript-eslint/parser": "^7.0.0",
        "@vitejs/plugin-react": "^4.3.0",
        "autoprefixer": "^10.4.19",
        "eslint": "^8.57.0",
        "eslint-plugin-react-hooks": "^4.6.2",
        "eslint-plugin-react-refresh": "^0.4.7",
        "postcss": "^8.4.38",
        "tailwindcss": "^3.4.4",
        "typescript": "^5.4.5",
        "vite": "^5.3.0"
      }
    }, null, 2);

    // vite.config.ts
    projectFiles["vite.config.ts"] = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
  },
})
`;

    // tsconfig.json
    projectFiles["tsconfig.json"] = JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        baseUrl: ".",
        paths: {
          "@/*": ["./src/*"]
        }
      },
      include: ["src"],
      references: [{ path: "./tsconfig.node.json" }]
    }, null, 2);

    // tsconfig.node.json
    projectFiles["tsconfig.node.json"] = JSON.stringify({
      compilerOptions: {
        composite: true,
        skipLibCheck: true,
        module: "ESNext",
        moduleResolution: "bundler",
        allowSyntheticDefaultImports: true,
        strict: true
      },
      include: ["vite.config.ts"]
    }, null, 2);

    // tailwind.config.js
    projectFiles["tailwind.config.js"] = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
`;

    // postcss.config.js
    projectFiles["postcss.config.js"] = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;

    // index.html (root level for Vite)
    projectFiles["index.html"] = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

    // src/main.tsx
    projectFiles["src/main.tsx"] = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;

    // src/index.css - Complete Tailwind setup with CSS variables
    projectFiles["src/index.css"] = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground antialiased;
  }
}
`;

    // src/lib/utils.ts - Utility for className merging
    projectFiles["src/lib/utils.ts"] = `import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`;

    // Extract and create App.tsx from generated code
    const appCode = extractAppComponent(code);
    projectFiles["src/App.tsx"] = appCode;

    // public/vite.svg
    projectFiles["public/vite.svg"] = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 257"><defs><linearGradient id="IconifyId1813088fe1fbc01fb466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"></stop><stop offset="100%" stop-color="#BD34FE"></stop></linearGradient><linearGradient id="IconifyId1813088fe1fbc01fb467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FFBD4F"></stop><stop offset="100%" stop-color="#FF980E"></stop></linearGradient></defs><path fill="url(#IconifyId1813088fe1fbc01fb466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"></path><path fill="url(#IconifyId1813088fe1fbc01fb467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.838l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.759-4.114l16.646-57.705c.677-2.35-1.37-4.583-3.769-4.113Z"></path></svg>`;

    // .gitignore
    projectFiles[".gitignore"] = `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
`;

    // README.md
    projectFiles["README.md"] = `# ${projectName}

Generated with [Weblitho](https://weblitho.com) - AI Website Builder

## 🚀 Quick Start

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
\`\`\`

## 📁 Project Structure

\`\`\`
├── public/          # Static assets
├── src/
│   ├── lib/         # Utilities
│   ├── App.tsx      # Main application
│   ├── main.tsx     # Entry point
│   └── index.css    # Global styles + Tailwind
├── index.html       # HTML template
├── package.json     # Dependencies
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
\`\`\`

## 🛠️ Tech Stack

- **React 18** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## 📦 Build

\`\`\`bash
npm run build
\`\`\`

Output will be in the \`dist/\` folder, ready for deployment.
`;

    return projectFiles;
  };

  // Extract React component from HTML code
  const extractAppComponent = (htmlCode: string): string => {
    // Try to extract from script tag
    const scriptMatch = htmlCode.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
    
    if (scriptMatch) {
      let reactCode = scriptMatch[1];
      
      // Clean up the code
      reactCode = reactCode
        .replace(/const root = ReactDOM\.createRoot[\s\S]*?root\.render[\s\S]*?;/g, "")
        .replace(/const \{ useState, useEffect \} = React;/g, "")
        .replace(/const \{[^}]+\} = lucideReact;/g, "")
        .trim();

      return `import { useState, useEffect } from 'react'
import { 
  Menu, X, ArrowRight, Check, Star, Zap, Shield, Code, 
  Layers, Rocket, ChevronRight, Mail, Phone, MapPin,
  Facebook, Twitter, Instagram, Linkedin, Github,
  Play, Pause, Volume2, VolumeX, Heart, Share2,
  Search, Filter, Grid, List, Download, Upload,
  User, Settings, Bell, LogOut, Plus, Minus,
  Eye, EyeOff, Lock, Unlock, Copy, Trash, Edit
} from 'lucide-react'
import { cn } from './lib/utils'

${reactCode}

export default App
`;
    }

    // Fallback - create a simple App component
    return `import { useState } from 'react'

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-center">
          Welcome to ${projectName}
        </h1>
        <p className="text-center text-muted-foreground mt-4">
          Generated with Weblitho AI
        </p>
      </main>
    </div>
  )
}

export default App
`;
  };

  const handleDownloadZip = async () => {
    setIsExporting(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      
      // Use provided files if available, otherwise generate complete Vite project
      if (files && files.length > 0) {
        files.forEach(({ path, content }) => {
          zip.file(path, content);
        });
      } else {
        const projectFiles = generateViteProject();
        Object.entries(projectFiles).forEach(([path, content]) => {
          zip.file(path, content);
        });
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sanitizedProjectName}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Project Downloaded!",
        description: "Complete Vite + React + TypeScript + Tailwind project ready to build",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Failed to generate ZIP file",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenInStackBlitz = async () => {
    setIsExporting(true);
    try {
      const projectFiles = generateViteProject();
      
      // Open in StackBlitz
      await sdk.openProject({
        title: projectName,
        description: `Generated with Weblitho AI`,
        template: "node",
        files: projectFiles,
      }, {
        newWindow: true,
        openFile: "src/App.tsx",
      });

      toast({
        title: "Opened in StackBlitz!",
        description: "Your project is now running in the cloud",
      });
    } catch (error) {
      console.error("StackBlitz error:", error);
      toast({
        title: "Failed to open StackBlitz",
        description: "Please try downloading the ZIP instead",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleGitHubPush = async () => {
    toast({
      title: "GitHub Integration",
      description: "Connect your GitHub account in settings to push directly",
    });
    setShowGitHubDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white/60 hover:text-white hover:bg-white/10 h-8"
            disabled={!code || isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-[#1a1a1a] border-white/10">
          <DropdownMenuItem 
            onClick={handleOpenInStackBlitz}
            className="text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <Rocket className="h-4 w-4 mr-2 text-blue-400" />
            <div className="flex flex-col">
              <span>Open in StackBlitz</span>
              <span className="text-xs text-white/40">Build & preview in cloud</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem 
            onClick={handleDownloadZip}
            className="text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <FolderArchive className="h-4 w-4 mr-2 text-orange-400" />
            <div className="flex flex-col">
              <span>Download as ZIP</span>
              <span className="text-xs text-white/40">Full Vite project</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem 
            onClick={() => setShowGitHubDialog(true)}
            className="text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <Github className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span>Push to GitHub</span>
              <span className="text-xs text-white/40">Create repository</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showGitHubDialog} onOpenChange={setShowGitHubDialog}>
        <DialogContent className="bg-[#1a1a1a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Github className="h-5 w-5" />
              Push to GitHub
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Create a new repository and push your generated code
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="repo-name" className="text-white/80">Repository name</Label>
              <Input
                id="repo-name"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="private-repo"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded border-white/20 bg-white/5"
              />
              <Label htmlFor="private-repo" className="text-white/80">Private repository</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowGitHubDialog(false)} className="text-white/60">
              Cancel
            </Button>
            <Button onClick={handleGitHubPush} className="bg-orange-500 hover:bg-orange-600 text-white">
              <Github className="h-4 w-4 mr-2" />
              Create & Push
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
