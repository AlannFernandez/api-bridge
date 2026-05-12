"use client";

import { useState } from "react";
import { Zap, Globe, FileCode, ArrowRightLeft, GripVertical, Plus, Trash2 } from "lucide-react";
import { useNodeTest } from "@/components/editor/node-test-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface DraggableItemProps {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

function DraggableItem({ type, label, icon, color }: DraggableItemProps) {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, type)}
      className="flex cursor-grab items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 transition-all hover:border-zinc-700 hover:bg-zinc-900 active:cursor-grabbing"
    >
      <GripVertical className="h-4 w-4 text-zinc-600" />
      <div
        className="flex h-8 w-8 items-center justify-center rounded-md"
        style={{ backgroundColor: `${color}20` }}
      >
        {icon}
      </div>
      <span className="text-sm font-medium text-zinc-300">{label}</span>
    </div>
  );
}

export function Sidebar() {
  const { secrets, runtimeVariables, setSecret, deleteSecret, setRuntimeVariable, deleteRuntimeVariable } = useNodeTest();
  const [newSecretKey, setNewSecretKey] = useState("");
  const [newSecretValue, setNewSecretValue] = useState("");
  const [newRuntimeKey, setNewRuntimeKey] = useState("");
  const [newRuntimeValue, setNewRuntimeValue] = useState("");

  const handleAddSecret = () => {
    const key = newSecretKey.trim();
    if (!key) return;
    setSecret(key, newSecretValue);
    setNewSecretKey("");
    setNewSecretValue("");
  };

  const handleAddRuntime = () => {
    const key = newRuntimeKey.trim();
    if (!key) return;
    setRuntimeVariable(key, newRuntimeValue);
    setNewRuntimeKey("");
    setNewRuntimeValue("");
  };

  const components = [
    {
      category: "Triggers",
      items: [
        {
          type: "trigger",
          label: "Webhook",
          icon: <Zap className="h-4 w-4 text-emerald-400" />,
          color: "#10b981",
        },
      ],
    },
    {
      category: "Integrations",
      items: [
        {
          type: "integration-rest",
          label: "REST API",
          icon: <Globe className="h-4 w-4 text-blue-400" />,
          color: "#3b82f6",
        },
        {
          type: "integration-soap",
          label: "SOAP Service",
          icon: <FileCode className="h-4 w-4 text-purple-400" />,
          color: "#a855f7",
        },
      ],
    },
    {
      category: "Logic",
      items: [
        {
          type: "transform",
          label: "Data Transform",
          icon: <ArrowRightLeft className="h-4 w-4 text-amber-400" />,
          color: "#f59e0b",
        },
      ],
    },
  ];

  return (
    <aside className="flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-100">Components</h2>
        <p className="text-xs text-zinc-500">Drag to canvas</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">

        
          {components.map((group) => (
            <div key={group.category}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                {group.category}
              </h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <DraggableItem key={item.type} {...item} />
                ))}
              </div>
            </div>
          ))}
          //TODO: Extract variables section to its own component
          
          {/* <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Variables</h3>
                <p className="text-xs text-zinc-500">Manage secrets and runtime values</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-zinc-400">Secrets</Label>
                </div>
                <div className="space-y-2">
                  {Object.entries(secrets).length === 0 ? (
                    <p className="text-xs text-zinc-500">No secrets configured yet.</p>
                  ) : (
                    Object.entries(secrets).map(([key, value]) => (
                      <div key={key} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                        <Input
                          value={key}
                          disabled
                          className="border-zinc-800 bg-zinc-950 text-zinc-300"
                        />
                        <Input
                          type="password"
                          value={value}
                          onChange={(event) => setSecret(key, event.target.value)}
                          className="border-zinc-800 bg-zinc-900 text-zinc-100"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-zinc-400 hover:text-zinc-100"
                          onClick={() => deleteSecret(key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    placeholder="Secret key"
                    value={newSecretKey}
                    onChange={(event) => setNewSecretKey(event.target.value)}
                    className="border-zinc-800 bg-zinc-900 text-zinc-100"
                  />
                  <Input
                    type="password"
                    placeholder="Secret value"
                    value={newSecretValue}
                    onChange={(event) => setNewSecretValue(event.target.value)}
                    className="border-zinc-800 bg-zinc-900 text-zinc-100"
                  />
                  <Button
                    variant="secondary"
                    className="h-9"
                    onClick={handleAddSecret}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-zinc-400">Runtime vars</Label>
                  <span className="text-[11px] text-zinc-500">Use {'{{runtime.key}}'}</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(runtimeVariables).length === 0 ? (
                    <p className="text-xs text-zinc-500">No runtime variables configured yet.</p>
                  ) : (
                    Object.entries(runtimeVariables).map(([key, value]) => (
                      <div key={key} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                        <Input
                          value={key}
                          disabled
                          className="border-zinc-800 bg-zinc-950 text-zinc-300"
                        />
                        <Input
                          placeholder="Value"
                          value={value}
                          onChange={(event) => setRuntimeVariable(key, event.target.value)}
                          className="border-zinc-800 bg-zinc-900 text-zinc-100"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-zinc-400 hover:text-zinc-100"
                          onClick={() => deleteRuntimeVariable(key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    placeholder="Variable key"
                    value={newRuntimeKey}
                    onChange={(event) => setNewRuntimeKey(event.target.value)}
                    className="border-zinc-800 bg-zinc-900 text-zinc-100"
                  />
                  <Input
                    placeholder="Value"
                    value={newRuntimeValue}
                    onChange={(event) => setNewRuntimeValue(event.target.value)}
                    className="border-zinc-800 bg-zinc-900 text-zinc-100"
                  />
                  <Button
                    variant="secondary"
                    className="h-9"
                    onClick={handleAddRuntime}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </aside>
  );
}
