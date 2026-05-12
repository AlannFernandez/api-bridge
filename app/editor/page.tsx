"use client";

import { useCallback, useState, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "@/components/editor/custom-nodes";
import { Sidebar } from "@/components/editor/sidebar";
import { Inspector } from "@/components/editor/inspector";
import { ConsoleLog, type LogEntry } from "@/components/editor/console-log";
import { NodeTestProvider } from "@/components/editor/node-test-context";

// Initial nodes for demo
const initialNodes: Node[] = [
  {
    id: "trigger-1",
    type: "trigger",
    position: { x: 100, y: 200 },
    data: { label: "Webhook Trigger", triggerType: "webhook" },
  },
  {
    id: "integration-1",
    type: "integration",
    position: { x: 400, y: 150 },
    data: {
      label: "Get Users",
      type: "REST",
      baseUrl: "https://api.example.com",
      path: "/users",
      routeVariables: [],
      method: "GET",
      headers: [],
      params: [],
      body: "",
      outputKeys: [],
    },
  },
  {
    id: "transform-1",
    type: "transform",
    position: { x: 700, y: 200 },
    data: {
      label: "Map Response",
      mappings: [
        { id: "m1", nodeId: "integration-1", from: "name", to: "userName", type: "string" as const },
        { id: "m2", nodeId: "integration-1", from: "email", to: "email", type: "string" as const },
        { id: "m3", nodeId: "integration-1", from: "id", to: "userId", type: "number" as const },
      ],
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: "e1-2",
    source: "trigger-1",
    target: "integration-1",
    animated: true,
    style: { stroke: "#3b82f6" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
  },
  {
    id: "e2-3",
    source: "integration-1",
    target: "transform-1",
    animated: true,
    style: { stroke: "#3b82f6" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
  },
];

export default function EditorPage() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "init",
      timestamp: new Date(),
      type: "info",
      message: "Editor initialized with demo workflow",
    },
  ]);

  // Add log entry
  const addLog = useCallback(
    (type: LogEntry["type"], message: string) => {
      setLogs((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          type,
          message,
        },
      ]);
      // Also log to browser console
      console.log(`[API Bridge] [${type}] ${message}`);
    },
    []
  );

  // Handle node changes (including position)
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      changes.forEach((change) => {
        if (change.type === "position" && change.dragging === false && change.position) {
          const node = nodes.find((n) => n.id === change.id);
          if (node) {
            addLog(
              "move",
              `Node "${node.data.label}" moved to (${Math.round(change.position.x)}, ${Math.round(change.position.y)})`
            );
          }
        }
        if (change.type === "remove") {
          addLog("delete", `Node removed: ${change.id}`);
        }
      });
    },
    [onNodesChange, nodes, addLog]
  );

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: `e${connection.source}-${connection.target}`,
        animated: true,
        style: { stroke: "#3b82f6" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
      };
      setEdges((eds) => addEdge(newEdge, eds));

      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      addLog(
        "connection",
        `Connected "${sourceNode?.data.label || connection.source}" → "${targetNode?.data.label || connection.target}"`
      );
    },
    [setEdges, nodes, addLog]
  );

  // Handle node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Handle click on canvas (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Update node data from inspector
  const handleNodeUpdate = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
        )
      );
      setSelectedNode((prev) =>
        prev && prev.id === nodeId ? { ...prev, data: { ...prev.data, ...data } } : prev
      );
    },
    [setNodes]
  );

  // Handle drag & drop from sidebar
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 100,
        y: event.clientY - bounds.top - 25,
      };

      let newNode: Node;
      const id = `${type}-${Date.now()}`;

      switch (type) {
        case "trigger":
          newNode = {
            id,
            type: "trigger",
            position,
            data: { label: "New Trigger", triggerType: "webhook" },
          };
          break;
        case "integration-rest":
          newNode = {
            id,
            type: "integration",
            position,
            data: {
              label: "REST API",
              type: "REST",
              baseUrl: "https://api.example.com",
              path: "/",
              routeVariables: [],
              method: "GET",
              headers: [],
              params: [],
              body: "",
              outputKeys: [],
            },
          };
          break;
        case "integration-soap":
          newNode = {
            id,
            type: "integration",
            position,
            data: {
              label: "SOAP Service",
              type: "SOAP",
              baseUrl: "",
              path: "",
              routeVariables: [],
              wsdl: "",
              headers: [],
              params: [],
              body: "",
              outputKeys: [],
            },
          };
          break;
        case "transform":
          newNode = {
            id,
            type: "transform",
            position,
            data: { label: "Transform", mappings: [] },
          };
          break;
        default:
          return;
      }

      setNodes((nds) => [...nds, newNode]);
      addLog("add", `Added new ${type} node: "${newNode.data.label}"`);
    },
    [setNodes, addLog]
  );

  // Clear logs
  const handleClearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Log current state to console (for debugging)
  const logState = useCallback(() => {
    const state = { nodes, edges };
    console.log("[API Bridge] Current State:", JSON.stringify(state, null, 2));
    addLog("info", `State exported to browser console (${nodes.length} nodes, ${edges.length} edges)`);
  }, [nodes, edges, addLog]);

  return (
    <NodeTestProvider>
      <div className="flex h-screen flex-col bg-zinc-950">
        {/* Header */}
        <header className="flex h-12 items-center justify-between border-b border-zinc-800 px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-zinc-100">API Bridge</h1>
          <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
            Editor
          </span>
        </div>
        <button
          onClick={logState}
          className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          Export State
        </button>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Canvas Area */}
        <div className="flex flex-1 flex-col">
          <div
            ref={reactFlowWrapper}
            className="flex-1"
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
              className="bg-zinc-950"
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="#27272a"
              />
              <Controls
                className="!border-zinc-800 !bg-zinc-900 [&>button]:!border-zinc-800 [&>button]:!bg-zinc-900 [&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-800"
              />
              <MiniMap
                nodeStrokeColor="#3f3f46"
                nodeColor="#18181b"
                nodeBorderRadius={8}
                maskColor="rgba(0, 0, 0, 0.8)"
                className="!border-zinc-800 !bg-zinc-900"
              />
            </ReactFlow>
          </div>

          {/* Console Log */}
          <ConsoleLog logs={logs} onClear={handleClearLogs} />
        </div>

        {/* Right Inspector Panel */}
        <Inspector
          selectedNode={selectedNode}
          onNodeUpdate={handleNodeUpdate}
          onClose={() => setSelectedNode(null)}
          onLog={addLog}
          nodes={nodes}
          edges={edges}
        />
      </div>
    </div>
    </NodeTestProvider>
  );
}
