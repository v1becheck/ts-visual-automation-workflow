import type { Node, Edge } from "@xyflow/react";

export type WorkflowExport = {
  nodes: Node[];
  edges: Edge[];
  exportedAt: string;
  version: 1;
};

const EXPORT_VERSION = 1;

export function exportWorkflow(nodes: Node[], edges: Edge[]): string {
  const data: WorkflowExport = {
    nodes,
    edges,
    exportedAt: new Date().toISOString(),
    version: EXPORT_VERSION,
  };
  return JSON.stringify(data, null, 2);
}

function isNodeLike(value: unknown): value is Node {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as Node).id === "string" &&
    "position" in value &&
    typeof (value as Node).position === "object"
  );
}

function isEdgeLike(value: unknown): value is Edge {
  return (
    typeof value === "object" &&
    value !== null &&
    "source" in value &&
    typeof (value as Edge).source === "string" &&
    "target" in value &&
    typeof (value as Edge).target === "string"
  );
}

export type ImportResult =
  | { ok: true; nodes: Node[]; edges: Edge[] }
  | { ok: false; error: string };

export function parseWorkflowFile(json: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
  if (typeof data !== "object" || data === null) {
    return { ok: false, error: "Invalid workflow file" };
  }
  const obj = data as Record<string, unknown>;
  const nodes = obj.nodes;
  const edges = obj.edges;
  if (!Array.isArray(nodes)) {
    return { ok: false, error: "Missing or invalid 'nodes' array" };
  }
  if (!Array.isArray(edges)) {
    return { ok: false, error: "Missing or invalid 'edges' array" };
  }
  const validNodes = nodes.filter(isNodeLike) as Node[];
  const validEdges = edges.filter(isEdgeLike) as Edge[];
  if (validNodes.length !== nodes.length) {
    return { ok: false, error: "Some nodes are invalid (need id and position)" };
  }
  if (validEdges.length !== edges.length) {
    return { ok: false, error: "Some edges are invalid (need source and target)" };
  }
  return { ok: true, nodes: validNodes, edges: validEdges };
}
