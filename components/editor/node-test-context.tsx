"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import { resolveObjectTemplates, resolveTemplateValue } from "@/lib/variables";

export interface NodeTestPair {
  id: string;
  key: string;
  value: string;
}

export interface NodeTestConfig {
  type: "REST" | "SOAP";
  baseUrl: string;
  path: string;
  routeVariables: NodeTestPair[];
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers: NodeTestPair[];
  params: NodeTestPair[];
  body?: string;
  wsdl?: string;
}

export interface NodeExecutionRequest {
  type: "REST" | "SOAP";
  baseUrl: string;
  path: string;
  routeVariables: Record<string, string>;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers: Record<string, string>;
  params: Record<string, string>;
  body?: string;
  wsdl?: string;
}

export interface NodeExecutionEntry {
  id: string;
  timestamp: string;
  status: number;
  data: unknown;
  headers: Record<string, string>;
  latency: number;
  config: NodeTestConfig;
  extractedKeys: string[];
  error?: string;
  pinned?: boolean;
}

export interface NodeTestStatus {
  statusCode?: number;
  loading: boolean;
  badgeVariant: "success" | "destructive" | "secondary";
  message?: string;
  lastRunAt?: string;
}

interface NodeTestContextValue {
  executionHistory: Record<string, NodeExecutionEntry[]>;
  nodeStatus: Record<string, NodeTestStatus>;
  workflowContext: Record<string, unknown>;
  secrets: Record<string, string>;
  runtimeVariables: Record<string, string>;
  executeNodeTest: (nodeId: string, config: NodeTestConfig) => Promise<NodeExecutionEntry>;
  runWorkflow: (nodes: Node[], edges: Edge[], runtime?: Record<string, string>) => Promise<Record<string, unknown>>;
  clearHistory: (nodeId: string) => void;
  pinHistoryEntry: (nodeId: string, entryId: string) => void;
  getNodeData: (nodeId: string) => unknown;
  setNodeData: (nodeId: string, data: unknown) => void;
  clearWorkflow: () => void;
  setSecret: (key: string, value: string) => void;
  deleteSecret: (key: string) => void;
  setRuntimeVariable: (key: string, value: string) => void;
  deleteRuntimeVariable: (key: string) => void;
  clearRuntimeVariables: () => void;
}

const NodeTestContext = createContext<NodeTestContextValue | undefined>(undefined);

export function NodeTestProvider({ children }: { children: React.ReactNode }) {
  const [executionHistory, setExecutionHistory] = useState<Record<string, NodeExecutionEntry[]>>({});
  const [nodeStatus, setNodeStatus] = useState<Record<string, NodeTestStatus>>({});
  const [workflowContext, setWorkflowContext] = useState<Record<string, unknown>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [runtimeVariables, setRuntimeVariables] = useState<Record<string, string>>({});

  const resolveNodeTestConfig = (config: NodeTestConfig): NodeExecutionRequest => {
    const context = {
      secrets,
      runtime: runtimeVariables,
      nodes: workflowContext,
    };

    const resolvedRouteVariables = config.routeVariables.reduce<Record<string, string>>((acc, item) => {
      if (!item.key.trim()) return acc;
      const resolved = resolveTemplateValue(item.value, context);
      acc[item.key] = String(resolved);
      return acc;
    }, {});

    const resolvedHeaders = config.headers.reduce<Record<string, string>>((acc, item) => {
      if (!item.key.trim()) return acc;
      const resolved = resolveTemplateValue(item.value, context);
      acc[item.key] = String(resolved);
      return acc;
    }, {});

    const resolvedParams = config.params.reduce<Record<string, string>>((acc, item) => {
      if (!item.key.trim()) return acc;
      const resolved = resolveTemplateValue(item.value, context);
      acc[item.key] = String(resolved);
      return acc;
    }, {});

    return {
      type: config.type,
      baseUrl: String(resolveTemplateValue(config.baseUrl, context)),
      path: String(resolveTemplateValue(config.path, context)),
      routeVariables: resolvedRouteVariables,
      method: config.method,
      headers: resolvedHeaders,
      params: resolvedParams,
      body: resolveObjectTemplates(config.body, context) as string | undefined,
      wsdl: config.wsdl ? String(resolveTemplateValue(config.wsdl, context)) : undefined,
    };
  };

  const getExecutionOrder = (nodes: Node[], edges: Edge[]) => {
    const incoming = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    nodes.forEach((node) => {
      incoming.set(node.id, 0);
      adjacency.set(node.id, []);
    });

    edges.forEach((edge) => {
      const targetCount = incoming.get(edge.target) ?? 0;
      incoming.set(edge.target, targetCount + 1);
      adjacency.get(edge.source)?.push(edge.target);
    });

    const queue = nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0).map((node) => node.id);
    const result: string[] = [];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);
      const neighbors = adjacency.get(nodeId) ?? [];
      neighbors.forEach((neighbor) => {
        const count = (incoming.get(neighbor) ?? 0) - 1;
        incoming.set(neighbor, count);
        if (count === 0) {
          queue.push(neighbor);
        }
      });
    }

    return result.map((id) => nodes.find((node) => node.id === id)!).filter(Boolean as any);
  };

  const executeNodeTest = async (nodeId: string, config: NodeTestConfig) => {
    setNodeStatus((prev) => ({
      ...prev,
      [nodeId]: {
        ...(prev[nodeId] ?? {}),
        loading: true,
        message: "Running test...",
      },
    }));

    const start = Date.now();
    let entry: NodeExecutionEntry;
    const requestBody: NodeExecutionRequest = resolveNodeTestConfig(config);

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const payload = await response.json();
      const status = typeof payload.status === "number" ? payload.status : 0;
      const responseData = payload.data;

      const extractedKeys =
        status === 200 &&
        responseData &&
        typeof responseData === "object" &&
        !Array.isArray(responseData)
          ? Object.keys(responseData)
          : [];

      entry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        status,
        headers: (payload.headers ?? {}) as Record<string, string>,
        data: responseData,
        latency: typeof payload.latency === "number" ? payload.latency : Date.now() - start,
        config,
        extractedKeys,
        error: status === 0 ? payload.data?.error ?? "Unknown error" : undefined,
      };

      setExecutionHistory((prev) => ({
        ...prev,
        [nodeId]: [entry, ...(prev[nodeId] ?? [])].slice(0, 20),
      }));

      if (status === 200) {
        setWorkflowContext((prev) => ({
          ...prev,
          [nodeId]: responseData,
        }));
      }

      setNodeStatus((prev) => ({
        ...prev,
        [nodeId]: {
          statusCode: status,
          loading: false,
          badgeVariant: status === 200 ? "success" : "destructive",
          message: status === 200 ? "OK" : `Status ${status}`,
          lastRunAt: entry.timestamp,
        },
      }));
    } catch (error) {
      const latency = Date.now() - start;
      const errorMessage = error instanceof Error ? error.message : String(error);

      entry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        status: 0,
        data: { error: errorMessage },
        headers: {},
        latency,
        config,
        extractedKeys: [],
        error: errorMessage,
      };

      setExecutionHistory((prev) => ({
        ...prev,
        [nodeId]: [entry, ...(prev[nodeId] ?? [])].slice(0, 20),
      }));

      setNodeStatus((prev) => ({
        ...prev,
        [nodeId]: {
          statusCode: 0,
          loading: false,
          badgeVariant: "destructive",
          message: errorMessage,
          lastRunAt: entry.timestamp,
        },
      }));
    }

    return entry;
  };

  const runWorkflow = async (nodes: Node[], edges: Edge[], runtime: Record<string, string> = {}) => {
    setRuntimeVariables(runtime);
    setWorkflowContext((prev) => ({ ...prev }));

    const executionOrder = getExecutionOrder(nodes, edges);
    const results: Record<string, unknown> = {};

    for (const node of executionOrder) {
      if (node.id === undefined) continue;
      if (node.type !== "default") continue;

      const nodeConfig = node.data as unknown as NodeTestConfig;
      if (!nodeConfig) continue;

      const nodeEntry = await executeNodeTest(node.id, nodeConfig);
      results[node.id] = nodeEntry.data;
    }

    return results;
  };

  const clearHistory = (nodeId: string) => {
    setExecutionHistory((prev) => ({
      ...prev,
      [nodeId]: [],
    }));
  };

  const pinHistoryEntry = (nodeId: string, entryId: string) => {
    setExecutionHistory((prev) => ({
      ...prev,
      [nodeId]: (prev[nodeId] ?? []).map((entry) => ({
        ...entry,
        pinned: entry.id === entryId,
      })),
    }));
  };

  const getNodeData = (nodeId: string) => {
    return workflowContext[nodeId];
  };

  const setNodeData = (nodeId: string, data: unknown) => {
    setWorkflowContext((prev) => ({
      ...prev,
      [nodeId]: data,
    }));
  };

  const clearWorkflow = () => {
    setWorkflowContext({});
  };

  const setSecret = (key: string, value: string) => {
    setSecrets((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const deleteSecret = (key: string) => {
    setSecrets((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setRuntimeVariable = (key: string, value: string) => {
    setRuntimeVariables((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const deleteRuntimeVariable = (key: string) => {
    setRuntimeVariables((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const clearRuntimeVariables = () => {
    setRuntimeVariables({});
  };

  const value = useMemo(
    () => ({
      executionHistory,
      nodeStatus,
      workflowContext,
      secrets,
      runtimeVariables,
      executeNodeTest,
      runWorkflow,
      clearHistory,
      pinHistoryEntry,
      getNodeData,
      setNodeData,
      clearWorkflow,
      setSecret,
      deleteSecret,
      setRuntimeVariable,
      deleteRuntimeVariable,
      clearRuntimeVariables,
    }),
    [executionHistory, nodeStatus, workflowContext, secrets, runtimeVariables]
  );

  return <NodeTestContext.Provider value={value}>{children}</NodeTestContext.Provider>;
}

export function useNodeTest() {
  const context = useContext(NodeTestContext);
  if (!context) {
    throw new Error("useNodeTest must be used within NodeTestProvider");
  }
  return context;
}
