"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap, Globe, FileCode, ArrowRightLeft } from "lucide-react";

// Types for node data
export interface TriggerNodeData {
  label: string;
  triggerType: "webhook" | "schedule" | "manual";
}

export interface IntegrationNodeData {
  label: string;
  type: "REST" | "SOAP";
  baseUrl?: string;
  path?: string;
  routeVariables?: Array<{ key: string; value: string }>;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  wsdl?: string;
  headers?: Array<{ key: string; value: string }>;
  params?: Array<{ key: string; value: string }>;
  body?: string;
  outputKeys?: string[];
  statusCode?: number;
  lastTestAt?: string;
  pinnedEntryId?: string;
  documentation?: {
    status: number;
    data: unknown;
    headers: Record<string, string>;
    latency: number;
    timestamp: string;
    config: {
      type: "REST" | "SOAP";
      baseUrl: string;
      path: string;
      routeVariables: Record<string, string>;
      method: string;
      headers: Record<string, string>;
      params: Record<string, string>;
      body?: string;
      wsdl?: string;
    };
  };
}

export interface FieldMapping {
  id: string;
  nodeId: string; // Source node ID
  from: string;
  to: string;
  type: "string" | "number" | "boolean" | "date";
  optional?: boolean;
}

export interface TransformNodeData {
  label: string;
  mappings: FieldMapping[];
  referenceNodeId?: string;
  lastPreviewOutput?: Record<string, unknown>;
  transformError?: string;
  connectedNodeIds?: string[]; // Track which nodes are connected
}

// Trigger Node - Entry point for workflows
export const TriggerNode = memo(function TriggerNode({
  data,
  selected,
}: NodeProps & { data: TriggerNodeData }) {
  return (
    <div
      className={`rounded-lg border-2 bg-zinc-900 px-4 py-3 shadow-lg transition-all ${
        selected ? "border-emerald-500 shadow-emerald-500/20" : "border-zinc-700"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/20">
          <Zap className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-100">{data.label}</p>
          <p className="text-xs text-zinc-500">{data.triggerType}</p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-emerald-500 !bg-zinc-900"
      />
    </div>
  );
});

// Integration Node - REST or SOAP API calls
export const IntegrationNode = memo(function IntegrationNode({
  data,
  selected,
}: NodeProps & { data: IntegrationNodeData }) {
  const isSOAP = data.type === "SOAP";
  const accentColor = isSOAP ? "purple" : "blue";

  return (
    <div
      className={`rounded-lg border-2 bg-zinc-900 px-4 py-3 shadow-lg transition-all ${
        selected
          ? `border-${accentColor}-500 shadow-${accentColor}-500/20`
          : "border-zinc-700"
      }`}
      style={{
        borderColor: selected
          ? isSOAP
            ? "#a855f7"
            : "#3b82f6"
          : undefined,
        boxShadow: selected
          ? isSOAP
            ? "0 4px 14px rgba(168, 85, 247, 0.2)"
            : "0 4px 14px rgba(59, 130, 246, 0.2)"
          : undefined,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !bg-zinc-900"
        style={{ borderColor: isSOAP ? "#a855f7" : "#3b82f6" }}
      />
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md"
          style={{
            backgroundColor: isSOAP
              ? "rgba(168, 85, 247, 0.2)"
              : "rgba(59, 130, 246, 0.2)",
          }}
        >
          {isSOAP ? (
            <FileCode
              className="h-4 w-4"
              style={{ color: isSOAP ? "#c084fc" : "#60a5fa" }}
            />
          ) : (
            <Globe
              className="h-4 w-4"
              style={{ color: isSOAP ? "#c084fc" : "#60a5fa" }}
            />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-100">{data.label}</p>
          <div className="flex flex-wrap items-center gap-1">
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: isSOAP
                  ? "rgba(168, 85, 247, 0.2)"
                  : "rgba(59, 130, 246, 0.2)",
                color: isSOAP ? "#c084fc" : "#60a5fa",
              }}
            >
              {data.type}
            </span>
            {data.method && (
              <span className="text-[10px] text-zinc-500">{data.method}</span>
            )}
            {data.statusCode ? (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  data.statusCode === 200
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-red-500/10 text-red-300"
                }`}
              >
                {data.statusCode}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !bg-zinc-900"
        style={{ borderColor: isSOAP ? "#a855f7" : "#3b82f6" }}
      />
    </div>
  );
});

// Transform Node - Data mapping between nodes
export const TransformNode = memo(function TransformNode({
  data,
  selected,
}: NodeProps & { data: TransformNodeData }) {
  const statusColor =
    data.transformError
      ? "red"
      : data.lastPreviewOutput
        ? "emerald"
        : "zinc";

  const statusIcon = data.transformError ? "⚠️" : data.lastPreviewOutput ? "✓" : "—";

  // Get unique node IDs from mappings
  const sourceNodeIds = Array.from(new Set(data.mappings.map((m) => m.nodeId).filter((id) => id)));
  const handleCount = Math.max(2, sourceNodeIds.length); // At least 2 handles

  return (
    <div
      className={`min-w-[280px] rounded-lg border-2 bg-zinc-900 px-4 py-3 shadow-lg transition-all ${
        selected ? "border-amber-500 shadow-amber-500/20" : "border-zinc-700"
      }`}
    >
      {/* Multiple input handles for different sources */}
      {Array.from({ length: handleCount }).map((_, index) => (
        <Handle
          key={`in-${index}`}
          id={`in-${index}`}
          type="target"
          position={Position.Left}
          style={{
            top: `${20 + index * 20}px`,
          }}
          className="!h-2 !w-2 !border !border-amber-500 !bg-amber-400"
        />
      ))}

      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/20">
          <ArrowRightLeft className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-100">{data.label}</p>
          <p className="text-xs text-zinc-500">
            {sourceNodeIds.length > 0 ? `${sourceNodeIds.length} source(s)` : "Aggregator"}
          </p>
        </div>
        <div
          className={`text-lg text-${statusColor}-400`}
          title={
            data.transformError
              ? data.transformError
              : data.lastPreviewOutput
                ? "Transform ready"
                : "Awaiting mappings"
          }
        >
          {statusIcon}
        </div>
      </div>
      {data.mappings && data.mappings.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-zinc-800 pt-2">
          {data.mappings.slice(0, 3).map((mapping, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-2 text-[10px] text-zinc-400"
            >
              <span
                className="rounded bg-zinc-800 px-1.5 py-0.5 truncate"
                title={mapping.nodeId}
              >
                {mapping.nodeId.split("-")[0]}...
              </span>
              <span className="text-zinc-600">→</span>
              <div className="flex items-center gap-1">
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 truncate">
                  {mapping.to}
                </span>
                <span
                  className={`rounded px-1 py-0.5 text-[8px] font-semibold ${
                    mapping.type === "string"
                      ? "bg-blue-500/20 text-blue-300"
                      : mapping.type === "number"
                        ? "bg-purple-500/20 text-purple-300"
                        : mapping.type === "boolean"
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "bg-orange-500/20 text-orange-300"
                  }`}
                >
                  {mapping.type}
                </span>
              </div>
            </div>
          ))}
          {data.mappings.length > 3 && (
            <p className="text-[10px] text-zinc-500">
              +{data.mappings.length - 3} more
            </p>
          )}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-amber-500 !bg-zinc-900"
      />
    </div>
  );
});

// Node types mapping for React Flow
export const nodeTypes = {
  trigger: TriggerNode,
  integration: IntegrationNode,
  transform: TransformNode,
};
