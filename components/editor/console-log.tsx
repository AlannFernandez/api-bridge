"use client";

import { useRef, useEffect } from "react";
import { Terminal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: "info" | "connection" | "move" | "add" | "delete";
  message: string;
}

interface ConsoleLogProps {
  logs: LogEntry[];
  onClear: () => void;
}

export function ConsoleLog({ logs, onClear }: ConsoleLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getTypeColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "connection":
        return "text-blue-400";
      case "move":
        return "text-amber-400";
      case "add":
        return "text-emerald-400";
      case "delete":
        return "text-red-400";
      default:
        return "text-zinc-400";
    }
  };

  return (
    <div className="flex h-40 flex-col border-t border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-400">Console</span>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
            {logs.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
          onClick={onClear}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 font-mono text-xs"
      >
        {logs.length === 0 ? (
          <p className="text-zinc-600">No events logged yet...</p>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2">
                <span className="text-zinc-600">
                  [{log.timestamp.toLocaleTimeString()}]
                </span>
                <span className={getTypeColor(log.type)}>[{log.type}]</span>
                <span className="text-zinc-300">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
