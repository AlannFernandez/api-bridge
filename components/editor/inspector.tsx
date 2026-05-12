"use client";

import { useMemo, useState } from "react";
import type { Node } from "@xyflow/react";
import { X, Plus, Trash2, Play, CheckCircle2, AlertCircle, Bookmark } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useNodeTest } from "@/components/editor/node-test-context";
import type { LogEntry } from "@/components/editor/console-log";
import {
  flattenSchema,
  generateTransformPreview,
  type FieldMapping,
  resolveTemplate,
  applyTransform,
} from "@/lib/transform";
import type { FieldMapping as UIFieldMapping } from "@/components/editor/custom-nodes";

interface InspectorProps {
  selectedNode: Node | null;
  onNodeUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
  onLog: (type: LogEntry["type"], message: string) => void;
  nodes?: Node[];
  edges?: Array<{ source: string; target: string }>;
}

interface PairItem {
  id: string;
  key: string;
  value: string;
}

function normalizePairs(pairs: unknown): PairItem[] {
  if (!Array.isArray(pairs)) {
    return [];
  }

  return pairs.map((item, index) => {
    const pair = item as Record<string, unknown>;
    return {
      id: (pair.id as string) || `pair-${index}`,
      key: (pair.key as string) || "",
      value: (pair.value as string) || "",
    };
  });
}

function extractRouteVariableNames(path: string) {
  const matches = Array.from(path.matchAll(/\{([^}]+)\}/g));
  return matches.map((match) => match[1]);
}

function normalizeUrlSegments(baseUrl: string, path: string) {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const trimmedPath = path.replace(/^\/+/, "");
  return trimmedPath ? `${trimmedBase}/${trimmedPath}` : trimmedBase;
}

function replaceRouteVariables(path: string, routeVariables: Record<string, string>) {
  return path.replace(/\{([^}]+)\}/g, (_, key) => {
    const value = routeVariables[key];
    return value !== undefined ? encodeURIComponent(value) : `{${key}}`;
  });
}

export function Inspector({ selectedNode, onNodeUpdate, onClose, onLog, nodes, edges }: InspectorProps) {
  const { executionHistory, nodeStatus, executeNodeTest, clearHistory, pinHistoryEntry, workflowContext } = useNodeTest();

  if (!selectedNode) {
    return (
      <aside className="flex h-full w-72 flex-col border-l border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">Inspector</h2>
          <p className="text-xs text-zinc-500">Select a node to edit</p>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-center text-sm text-zinc-600">
            Click on a node to view and edit its properties
          </p>
        </div>
      </aside>
    );
  }

  const data = selectedNode.data as Record<string, unknown>;
  const headers = normalizePairs(data.headers);
  const params = normalizePairs(data.params);
  const routeVariables = normalizePairs(data.routeVariables);
  const status = nodeStatus[selectedNode.id];
  const history = executionHistory[selectedNode.id] || [];
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const pathValue = (data.path as string) || "";
  const baseUrlValue = (data.baseUrl as string) || "";
  const selectedEntry = history.find((entry) => entry.id === selectedEntryId) ?? null;

  const routeVariableKeys = extractRouteVariableNames(pathValue);
  const routeVariablesByKey = Object.fromEntries(routeVariables.map((item) => [item.key, item.value]));
  const pathVariables = routeVariableKeys.map((key) => ({
    id: routeVariables.find((item) => item.key === key)?.id || crypto.randomUUID(),
    key,
    value: routeVariablesByKey[key] || "",
  }));

  const previewUrl = baseUrlValue
    ? normalizeUrlSegments(baseUrlValue, replaceRouteVariables(pathValue, Object.fromEntries(pathVariables.map((item) => [item.key, item.value]))))
    : "";

  const timeAgo = (timestamp: string) => {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    if (diffSeconds < 60) return `Hace ${diffSeconds} segundos`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} días`;
  };

  const getHistoryColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return "border-emerald-500/30 bg-emerald-500/5";
    if (statusCode >= 400 && statusCode < 500) return "border-amber-500/30 bg-amber-500/5";
    if (statusCode >= 500) return "border-red-500/30 bg-red-500/5";
    return "border-zinc-700 bg-zinc-900";
  };

  const handleChange = (key: string, value: unknown) => {
    onNodeUpdate(selectedNode.id, { ...data, [key]: value });
  };

  const handlePathChange = (path: string) => {
    const variableNames = extractRouteVariableNames(path);
    const currentVariables = Object.fromEntries(routeVariables.map((item) => [item.key, item.value]));

    const nextVariables = variableNames.map((key) => ({
      id: routeVariables.find((item) => item.key === key)?.id || crypto.randomUUID(),
      key,
      value: currentVariables[key] || "",
    }));

    onNodeUpdate(selectedNode.id, {
      ...data,
      path,
      routeVariables: nextVariables,
    });
  };

  const updatePair = (
    field: "headers" | "params",
    index: number,
    key: "key" | "value",
    value: string
  ) => {
    const current = field === "headers" ? headers : params;
    const next = current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [key]: value } : item
    );
    onNodeUpdate(selectedNode.id, { ...data, [field]: next });
  };

  const updateRouteVariable = (index: number, value: string) => {
    const next = pathVariables.map((item, itemIndex) =>
      itemIndex === index ? { ...item, value } : item
    );
    onNodeUpdate(selectedNode.id, { ...data, routeVariables: next });
  };

  const addPair = (field: "headers" | "params") => {
    const current = field === "headers" ? headers : params;
    const next = [...current, { id: crypto.randomUUID(), key: "", value: "" }];
    onNodeUpdate(selectedNode.id, { ...data, [field]: next });
  };

  const removePair = (field: "headers" | "params", index: number) => {
    const current = field === "headers" ? headers : params;
    const next = current.filter((_, itemIndex) => itemIndex !== index);
    onNodeUpdate(selectedNode.id, { ...data, [field]: next });
  };

  const buildRequestConfig = () => ({
    type: (data.type as "REST" | "SOAP") || "REST",
    baseUrl: baseUrlValue,
    path: pathValue,
    routeVariables: pathVariables,
    method: (data.method as "GET" | "POST" | "PUT" | "DELETE" | "PATCH") || "GET",
    headers,
    params,
    body: ((data.body as string) || "").trim() || undefined,
    wsdl: (data.wsdl as string) || undefined,
  });

  // Transform node helpers - Multi-source support
  const getConnectedSourceNodes = useMemo(() => {
    if (selectedNode.type !== "transform" || !edges || !nodes) return [];
    // Find all edges pointing to this transform node
    const incomingEdges = edges.filter((e) => e.target === selectedNode.id);
    const sourceNodeIds = incomingEdges.map((e) => e.source);
    return nodes.filter((n) => sourceNodeIds.includes(n.id) && n.type === "integration");
  }, [selectedNode, edges, nodes]);

  const getAvailableFieldsByNode = useMemo(() => {
    const fieldsByNode: Record<string, string[]> = {};

    for (const sourceNode of getConnectedSourceNodes) {
      const nodeHistory = executionHistory[sourceNode.id] || [];
      const pinnedEntryId = (sourceNode.data as Record<string, unknown>).pinnedEntryId as string | undefined;
      const referenceEntry = pinnedEntryId
        ? nodeHistory.find((entry) => entry.id === pinnedEntryId)
        : nodeHistory[0];

      if (referenceEntry && referenceEntry.data) {
        const flatPaths = flattenSchema(referenceEntry.data);
        fieldsByNode[sourceNode.id] = flatPaths.sort();
      }
    }

    return fieldsByNode;
  }, [getConnectedSourceNodes, executionHistory]);

  const transformMappings = (data.mappings as UIFieldMapping[]) || [];
  const [transformPreview, setTransformPreview] = useState<{ output: Record<string, unknown>; sources: Record<string, string> } | null>(null);

  const updateTransformMapping = (index: number, field: keyof UIFieldMapping, value: unknown) => {
    const next = transformMappings.map((m, i) =>
      i === index ? { ...m, [field]: value } : m
    );

    // Generate preview using workflowContext
    const preview = generateTransformPreview(workflowContext as Record<string, unknown>, next as FieldMapping[]);
    setTransformPreview(preview);

    onNodeUpdate(selectedNode.id, { ...data, mappings: next });
  };

  const addTransformMapping = () => {
    const defaultNodeId = getConnectedSourceNodes[0]?.id || "";
    const next = [
      ...transformMappings,
      {
        id: crypto.randomUUID(),
        nodeId: defaultNodeId,
        from: "",
        to: "",
        type: "string" as const,
        optional: false,
      },
    ];
    onNodeUpdate(selectedNode.id, { ...data, mappings: next });
  };

  const removeTransformMapping = (index: number) => {
    const next = transformMappings.filter((_, i) => i !== index);
    onNodeUpdate(selectedNode.id, { ...data, mappings: next });
  };

  const handleRunTest = async () => {
    const config = buildRequestConfig();
    if (!config.baseUrl) {
      onLog("info", "Add a Base URL before running the test.");
      return;
    }

    onLog("info", `Running test for node ${selectedNode.data.label}`);
    const result = await executeNodeTest(selectedNode.id, config);

    onNodeUpdate(selectedNode.id, {
      statusCode: result.status,
      lastTestAt: result.timestamp,
      outputKeys: result.extractedKeys,
    });

    if (result.extractedKeys.length > 0) {
      onLog("info", `Extracted keys: ${result.extractedKeys.join(", ")}`);
    }
    onLog(
      "info",
      `Test completed: ${selectedNode.data.label} → ${result.status} (${result.latency}ms)`
    );
  };

  const handleClearHistory = () => {
    clearHistory(selectedNode.id);
    setSelectedEntryId(null);
    onLog("info", `History cleared for node ${selectedNode.data.label}`);
  };

  const handlePinEntry = (entryId: string) => {
    const entry = history.find((item) => item.id === entryId);
    if (!entry) return;

    pinHistoryEntry(selectedNode.id, entryId);
    onNodeUpdate(selectedNode.id, {
      documentation: {
        status: entry.status,
        data: entry.data,
        headers: entry.headers,
        latency: entry.latency,
        timestamp: entry.timestamp,
        config: entry.config,
      },
      pinnedEntryId: entry.id,
      outputKeys: entry.extractedKeys,
    });

    onLog("info", `Saved response reference for node ${selectedNode.data.label}`);
  };

  const badgeColor = status?.badgeVariant === "success" ? "bg-emerald-500/10 text-emerald-300" : status?.badgeVariant === "destructive" ? "bg-red-500/10 text-red-300" : "bg-zinc-800 text-zinc-400";

  return (
    <aside className="flex h-full w-72 flex-col border-l border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Inspector</h2>
          <p className="text-xs text-zinc-500">{selectedNode.type} node</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label" className="text-zinc-400">
              Label
            </Label>
            <Input
              id="label"
              value={(data.label as string) || ""}
              onChange={(e) => handleChange("label", e.target.value)}
              className="border-zinc-800 bg-zinc-900 text-zinc-100"
            />
          </div>

          {selectedNode.type === "trigger" && (
            <div className="space-y-2">
              <Label htmlFor="triggerType" className="text-zinc-400">
                Trigger Type
              </Label>
              <Select
                value={(data.triggerType as string) || "webhook"}
                onValueChange={(value) => handleChange("triggerType", value)}
              >
                <SelectTrigger className="border-zinc-800 bg-zinc-900 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-900">
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="schedule">Schedule</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedNode.type === "integration" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="type" className="text-zinc-400 text-white">
                  API Type
                </Label>
                <Select
                  value={(data.type as string) || "REST"}
                  onValueChange={(value) => handleChange("type", value)}
                >
                  <SelectTrigger className="border-zinc-800 bg-zinc-900 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-800 bg-zinc-900 text-white">
                    <SelectItem value="REST">REST</SelectItem>
                    <SelectItem value="SOAP">SOAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseUrl" className="text-zinc-400">
                  Base URL
                </Label>
                <Input
                  id="baseUrl"
                  placeholder="https://api.example.com"
                  value={baseUrlValue}
                  onChange={(e) => handleChange("baseUrl", e.target.value)}
                  className="border-zinc-800 bg-zinc-900 text-zinc-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="path" className="text-zinc-400">
                  Endpoint Path
                </Label>
                <Input
                  id="path"
                  placeholder="/users/{userId}/orders"
                  value={pathValue}
                  onChange={(e) => handlePathChange(e.target.value)}
                  className="border-zinc-800 bg-zinc-900 text-zinc-100"
                />
              </div>

              {previewUrl && (
                <div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
                  <span className="font-medium text-zinc-100">Preview URL:</span>{" "}
                  <span className="break-all text-emerald-200">{previewUrl}</span>
                </div>
              )}

              {pathVariables.length > 0 && (
                <div className="space-y-3 rounded border border-zinc-800 bg-zinc-950 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-zinc-400">Route Variables</Label>
                    <span className="text-xs text-zinc-500">{pathVariables.length} found</span>
                  </div>
                  <div className="space-y-2">
                    {pathVariables.map((variable, index) => (
                      <div key={variable.id} className="grid gap-2 sm:grid-cols-[0.5fr_1fr]">
                        <Input
                          value={variable.key}
                          disabled
                          className="border-zinc-800 bg-zinc-900 text-zinc-100"
                        />
                        <Input
                          placeholder="Value"
                          value={variable.value}
                          onChange={(e) => updateRouteVariable(index, e.target.value)}
                          className="border-zinc-800 bg-zinc-900 text-zinc-100"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="method" className="text-zinc-400">
                  Method
                </Label>
                <Select
                  value={(data.method as string) || "GET"}
                  onValueChange={(value) => handleChange("method", value)}
                >
                  <SelectTrigger className="border-zinc-800 bg-zinc-900 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-800 bg-zinc-900 text-white">
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {data.type === "SOAP" && (
                <div className="space-y-2">
                  <Label htmlFor="wsdl" className="text-zinc-400">
                    WSDL URL
                  </Label>
                  <Input
                    id="wsdl"
                    placeholder="https://service.example.com?wsdl"
                    value={(data.wsdl as string) || ""}
                    onChange={(e) => handleChange("wsdl", e.target.value)}
                    className="border-zinc-800 bg-zinc-900 text-zinc-100"
                  />
                </div>
              )}

              <Accordion type="single" collapsible defaultValue="headers">
                <AccordionItem value="headers">
                  <AccordionTrigger>Headers</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {headers.map((header, index) => (
                        <div key={header.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                          <Input
                            placeholder="Header key"
                            value={header.key}
                            onChange={(event) => updatePair("headers", index, "key", event.target.value)}
                            className="border-zinc-800 bg-zinc-900 text-zinc-100"
                          />
                          <Input
                            placeholder="Header value"
                            value={header.value}
                            onChange={(event) => updatePair("headers", index, "value", event.target.value)}
                            className="border-zinc-800 bg-zinc-900 text-zinc-100"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-zinc-400 hover:text-zinc-100"
                            onClick={() => removePair("headers", index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => addPair("headers")}
                      >
                        <Plus className="h-4 w-4" />
                        Add header
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="params">
                  <AccordionTrigger>Query Params</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {params.map((param, index) => (
                        <div key={param.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                          <Input
                            placeholder="Param key"
                            value={param.key}
                            onChange={(event) => updatePair("params", index, "key", event.target.value)}
                            className="border-zinc-800 bg-zinc-900 text-zinc-100"
                          />
                          <Input
                            placeholder="Param value"
                            value={param.value}
                            onChange={(event) => updatePair("params", index, "value", event.target.value)}
                            className="border-zinc-800 bg-zinc-900 text-zinc-100"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-zinc-400 hover:text-zinc-100"
                            onClick={() => removePair("params", index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => addPair("params")}
                      >
                        <Plus className="h-4 w-4" />
                        Add param
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="space-y-2">
                <Label htmlFor="body" className="text-zinc-400">
                  Body
                </Label>
                <Textarea
                  id="body"
                  placeholder="Request payload for POST/PUT/PATCH or SOAP body"
                  value={(data.body as string) || ""}
                  onChange={(e) => handleChange("body", e.target.value)}
                  className="border-zinc-800 bg-zinc-900 text-zinc-100"
                />
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="default"
                    className="flex items-center gap-2"
                    onClick={handleRunTest}
                    disabled={status?.loading}
                  >
                    {status?.loading ? (
                      <span>Running...</span>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Run Test
                      </>
                    )}
                  </Button>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${badgeColor}`}>
                    {status?.statusCode ? (
                      <>
                        {status.badgeVariant === "success" ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5" />
                        )}
                        {status.statusCode}
                      </>
                    ) : (
                      "No run yet"
                    )}
                  </span>
                </div>

                {status?.lastRunAt ? (
                  <p className="text-xs text-zinc-500">Last run: {new Date(status.lastRunAt).toLocaleString()}</p>
                ) : null}

                {Array.isArray(data.outputKeys) && data.outputKeys.length > 0 ? (
                  <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2 text-xs text-emerald-200">
                    <p className="font-medium text-zinc-200">Extracted response keys</p>
                    <p className="mt-1 text-[11px] text-zinc-400">{(data.outputKeys as string[]).join(", ")}</p>
                  </div>
                ) : null}
              </div>

              {history.length > 0 && (
                <div className="space-y-3 border-t border-zinc-800 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">Execution history</p>
                      <span className="text-xs text-zinc-500">{history.length} runs</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                      onClick={handleClearHistory}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {history.slice(0, 6).map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setSelectedEntryId(entry.id)}
                        className={`w-full text-left rounded-md border p-3 text-xs transition ${getHistoryColor(entry.status)} ${entry.pinned ? "ring-2 ring-sky-400" : "border-zinc-800"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-zinc-100">{new Date(entry.timestamp).toLocaleTimeString()}</p>
                            <p className="text-[11px] text-zinc-500">{timeAgo(entry.timestamp)} · {entry.latency} ms</p>
                          </div>
                          <Badge
                            variant={entry.status === 200 ? "default" : entry.status >= 500 ? "destructive" : "secondary"}
                          >
                            {entry.status}
                          </Badge>
                        </div>
                        {entry.pinned ? (
                          <p className="mt-1 text-[11px] text-sky-300">Documento de referencia guardado</p>
                        ) : null}
                      </button>
                    ))}
                  </div>

                  {selectedEntry ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-300">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">Execution details</p>
                          <p className="text-[11px] text-zinc-500">{timeAgo(selectedEntry.timestamp)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={() => handlePinEntry(selectedEntry.id)}
                            disabled={selectedEntry.status !== 200}
                          >
                            <Bookmark className="h-4 w-4" />
                            Save for docs
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                            onClick={() => setSelectedEntryId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-4">
                        <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-950 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-zinc-100">Request</p>
                            <span className="text-[11px] text-zinc-500">{selectedEntry.config.method}</span>
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            <p className="font-semibold text-zinc-200">Headers</p>
                            <pre className="whitespace-pre-wrap rounded bg-zinc-900 p-2 text-[11px] text-zinc-200">{JSON.stringify(selectedEntry.config.headers, null, 2)}</pre>
                          </div>
                          {selectedEntry.config.body ? (
                            <div className="text-[11px] text-zinc-400">
                              <p className="font-semibold text-zinc-200">Body</p>
                              <pre className="whitespace-pre-wrap rounded bg-zinc-900 p-2 text-[11px] text-zinc-200">{selectedEntry.config.body}</pre>
                            </div>
                          ) : null}
                        </div>

                        <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-950 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-zinc-100">Response</p>
                            <Badge variant={selectedEntry.status === 200 ? "default" : selectedEntry.status >= 500 ? "destructive" : "secondary"}>
                              {selectedEntry.status}
                            </Badge>
                          </div>
                          <pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded bg-zinc-900 p-3 text-[11px] text-zinc-200">{JSON.stringify(selectedEntry.data, null, 2)}</pre>
                        </div>

                        {(selectedEntry.status >= 400 || selectedEntry.error) && (
                          <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-200">
                            <p className="font-semibold text-red-100">Error details</p>
                            <p className="mt-1 text-[11px] text-red-200">
                              {String((selectedEntry.data as Record<string, unknown>)?.error ?? selectedEntry.error ?? "API returned an error")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          )}

          {selectedNode.type === "transform" && (
            <>
              {getConnectedSourceNodes.length === 0 ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
                  <p className="font-semibold">No source nodes connected</p>
                  <p className="mt-1">Connect integration nodes to this transformer by dragging edges.</p>
                </div>
              ) : Object.keys(getAvailableFieldsByNode).length === 0 ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
                  <p className="font-semibold">No response data available</p>
                  <p className="mt-1">Run the connected nodes to extract available fields.</p>
                </div>
              ) : null}

              {Object.keys(getAvailableFieldsByNode).length > 0 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-zinc-400">Field Mappings</Label>
                      <span className="text-xs text-zinc-500">
                        {transformMappings.length} mapping(s)
                      </span>
                    </div>

                    <div className="space-y-3">
                      {transformMappings.map((mapping, index) => {
                        const fieldsForNode = getAvailableFieldsByNode[mapping.nodeId] || [];

                        return (
                          <div
                            key={mapping.id}
                            className="flex flex-col gap-3 rounded border border-zinc-800 bg-zinc-950 p-3"
                          >
                            <div className="space-y-3">
                              <div>
                                <Label htmlFor={`map-node-${index}`} className="text-[11px] text-zinc-500">
                                  Source Node
                                </Label>
                                <Select
                                  value={mapping.nodeId}
                                  onValueChange={(value) =>
                                    updateTransformMapping(index, "nodeId", value)
                                  }
                                >
                                  <SelectTrigger
                                    id={`map-node-${index}`}
                                    className="border-zinc-800 bg-zinc-900 text-zinc-100"
                                  >
                                    <SelectValue placeholder="Select node..." />
                                  </SelectTrigger>
                                  <SelectContent className="border-zinc-800 bg-zinc-900 text-white">
                                    {getConnectedSourceNodes.map((node) => (
                                      <SelectItem key={node.id} value={node.id}>
                                        {String(node.data.label)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor={`map-from-${index}`} className="text-[11px] text-zinc-500">
                                  Source Field
                                </Label>
                                <Select
                                  value={mapping.from}
                                  onValueChange={(value) =>
                                    updateTransformMapping(index, "from", value)
                                  }
                                >
                                  <SelectTrigger
                                    id={`map-from-${index}`}
                                    className="border-zinc-800 bg-zinc-900 text-zinc-100"
                                  >
                                    <SelectValue placeholder="Select field..." />
                                  </SelectTrigger>
                                  <SelectContent className="border-zinc-800 bg-zinc-900 text-white">
                                    {fieldsForNode.map((field) => (
                                      <SelectItem key={field} value={field}>
                                        {field}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor={`map-to-${index}`} className="text-[11px] text-zinc-500">
                                  Target Name
                                </Label>
                                <Input
                                  id={`map-to-${index}`}
                                  placeholder="output_field"
                                  value={mapping.to}
                                  onChange={(e) =>
                                    updateTransformMapping(index, "to", e.target.value)
                                  }
                                  className="border-zinc-800 bg-zinc-900 text-zinc-100"
                                />
                              </div>

                              <div>
                                <Label htmlFor={`map-type-${index}`} className="text-[11px] text-zinc-500">
                                  Type
                                </Label>
                                <Select
                                  value={mapping.type}
                                  onValueChange={(value) =>
                                    updateTransformMapping(index, "type", value)
                                  }
                                >
                                  <SelectTrigger
                                    id={`map-type-${index}`}
                                    className="border-zinc-800 bg-zinc-900 text-zinc-100"
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="border-zinc-800 bg-zinc-900 text-white">
                                    <SelectItem value="string">String</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="boolean">Boolean</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <label className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={mapping.optional || false}
                                  onChange={(e) =>
                                    updateTransformMapping(index, "optional", e.target.checked)
                                  }
                                  className="rounded"
                                />
                                <span className="text-zinc-400">Optional</span>
                              </label>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeTransformMapping(index)}
                                className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Button
                      onClick={addTransformMapping}
                      className="w-full bg-amber-600 hover:bg-amber-700"
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Mapping
                    </Button>
                  </div>

                  {/* Transform Preview with Source Attribution */}
                  {transformPreview && transformPreview.output && (
                    <div className="space-y-2 rounded border border-emerald-500/30 bg-emerald-500/5 p-3">
                      <p className="text-xs font-semibold text-emerald-200">
                        Transform Preview
                      </p>
                      <div className="max-h-48 overflow-auto">
                        {Object.entries(transformPreview.output).map(([key, value]) => (
                          <div key={key} className="mb-2 text-[10px] text-emerald-100">
                            <p className="font-mono font-semibold">{key}:</p>
                            <p className="ml-2 text-emerald-300">
                              {JSON.stringify(value)}
                            </p>
                            {transformPreview.sources && transformPreview.sources[key] && (
                              <p className="ml-2 text-[9px] text-emerald-600">
                                ← {transformPreview.sources[key]}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="border-t border-zinc-800 px-4 py-2">
        <p className="text-[10px] font-mono text-zinc-600">ID: {selectedNode.id}</p>
      </div>
    </aside>
  );
}
