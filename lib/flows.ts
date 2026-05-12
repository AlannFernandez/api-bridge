import type { Edge, Node } from "@xyflow/react";

export interface FlowBlueprint {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  secretKeys: string[];
  runtimeVariableKeys: string[];
  createdAt: string;
  updatedAt: string;
}

const FLOW_STORAGE_KEY = "api-bridge-flows";

export function loadLocalBlueprints(): FlowBlueprint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FLOW_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FlowBlueprint[];
  } catch {
    return [];
  }
}

export function persistLocalBlueprints(blueprints: FlowBlueprint[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(blueprints));
  } catch {
    // ignore storage errors
  }
}

export async function saveBlueprintRemote(blueprint: FlowBlueprint) {
  const response = await fetch("/api/flows", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(blueprint),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || "Remote save failed");
  }

  return response.json();
}

export function createBlueprintFromState(options: {
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  secretKeys: string[];
  runtimeVariableKeys: string[];
}) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: options.name,
    description: options.description,
    nodes: options.nodes,
    edges: options.edges,
    secretKeys: options.secretKeys,
    runtimeVariableKeys: options.runtimeVariableKeys,
    createdAt: now,
    updatedAt: now,
  };
}
