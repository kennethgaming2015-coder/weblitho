import { useState, useEffect, useRef } from "react";
import { AlertCircle, AlertTriangle, Info, Trash2, ChevronDown, ChevronUp, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConsoleLog {
  id: string;
  type: "log" | "warn" | "error" | "info";
  message: string;
  timestamp: Date;
  source?: string;
}

interface ConsolePanelProps {
  logs?: ConsoleLog[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onClear?: () => void;
}

export const ConsolePanel = ({
  logs = [],
  isCollapsed = false,
  onToggleCollapse,
  onClear,
}: ConsolePanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (scrollRef.current && !isCollapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isCollapsed]);

  const getIcon = (type: ConsoleLog["type"]) => {
    switch (type) {
      case "error":
        return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
      case "warn":
        return <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />;
      case "info":
        return <Info className="h-3.5 w-3.5 text-blue-400" />;
      default:
        return <Terminal className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getRowStyle = (type: ConsoleLog["type"]) => {
    switch (type) {
      case "error":
        return "bg-red-500/5 border-l-2 border-red-500/50";
      case "warn":
        return "bg-yellow-500/5 border-l-2 border-yellow-500/50";
      case "info":
        return "bg-blue-500/5 border-l-2 border-blue-500/50";
      default:
        return "border-l-2 border-transparent";
    }
  };

  const errorCount = logs.filter((l) => l.type === "error").length;
  const warnCount = logs.filter((l) => l.type === "warn").length;

  if (isCollapsed) {
    return (
      <div
        className="h-10 flex items-center justify-between px-4 bg-[#1e1e1e] border-t border-border/30 cursor-pointer hover:bg-[#252526] transition-colors"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-3">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Console</span>
          {errorCount > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
              {errorCount} {errorCount === 1 ? "error" : "errors"}
            </Badge>
          )}
          {warnCount > 0 && (
            <Badge className="h-5 px-1.5 text-[10px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              {warnCount} {warnCount === 1 ? "warning" : "warnings"}
            </Badge>
          )}
        </div>
        <ChevronUp className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#1e1e1e] border-t border-border/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-[#252526]">
        <div className="flex items-center gap-3">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Console</span>
          {errorCount > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
              {errorCount}
            </Badge>
          )}
          {warnCount > 0 && (
            <Badge className="h-5 px-1.5 text-[10px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              {warnCount}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-6 px-2 text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-6 px-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Log List */}
      <div ref={scrollRef} className="h-[200px] overflow-auto">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Terminal className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No console output</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`flex items-start gap-3 px-4 py-2 text-xs hover:bg-white/5 ${getRowStyle(log.type)}`}
              >
                <div className="mt-0.5 shrink-0">{getIcon(log.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground/90 font-mono break-all whitespace-pre-wrap">
                    {log.message}
                  </p>
                  {log.source && (
                    <p className="mt-1 text-muted-foreground text-[10px]">{log.source}</p>
                  )}
                </div>
                <span className="text-muted-foreground text-[10px] shrink-0">
                  {log.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
