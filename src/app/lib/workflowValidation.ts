/**
 * Workflow validation: detect cycles and orphaned nodes in a directed graph.
 */

export type ValidationEdge = { source: string; target: string };
export type ValidationNode = { id: string };

export type ValidationResult = {
  valid: boolean;
  cycles: string[][];
  orphanedNodeIds: string[];
};

/**
 * Build adjacency list: node id -> list of target node ids.
 */
function getOutgoingMap(edges: ValidationEdge[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const e of edges) {
    const list = map.get(e.source) ?? [];
    list.push(e.target);
    map.set(e.source, list);
  }
  return map;
}

/**
 * Build reverse adjacency list: node id -> list of source node ids.
 */
function getIncomingMap(edges: ValidationEdge[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const e of edges) {
    const list = map.get(e.target) ?? [];
    list.push(e.source);
    map.set(e.target, list);
  }
  return map;
}

/**
 * Find all nodes that participate in at least one cycle.
 * Uses DFS with a recursion stack; back edge => cycle.
 * Returns one cycle per strongly connected component (we return the first cycle found per SCC).
 */
function findCycles(
  nodeIds: Set<string>,
  outgoing: Map<string, string[]>
): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const stack: string[] = [];
  const indexInStack = new Map<string, number>();
  const lowLink = new Map<string, number>();
  let depth = 0;

  function strongConnect(id: string): void {
    visited.add(id);
    const idx = depth++;
    indexInStack.set(id, idx);
    lowLink.set(id, idx);
    stack.push(id);
    inStack.add(id);

    for (const target of outgoing.get(id) ?? []) {
      if (!nodeIds.has(target)) continue;
      if (!visited.has(target)) {
        strongConnect(target);
        lowLink.set(id, Math.min(lowLink.get(id)!, lowLink.get(target)!));
      } else if (inStack.has(target)) {
        lowLink.set(id, Math.min(lowLink.get(id)!, indexInStack.get(target)!));
      }
    }

    if (lowLink.get(id) === indexInStack.get(id)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        inStack.delete(w);
        scc.push(w);
      } while (w !== id);
      if (scc.length > 1) {
        cycles.push(scc);
      } else {
        const selfLoop = outgoing.get(id)?.includes(id);
        if (selfLoop) cycles.push([id]);
      }
    }
  }

  for (const id of nodeIds) {
    if (!visited.has(id)) strongConnect(id);
  }
  return cycles;
}

/**
 * Orphaned = nodes with no edges at all, or nodes not reachable from any "source"
 * (a source is a node with no incoming edges). So we start BFS from every source
 * and mark reachable nodes; any node that is not reachable and is not a source is orphaned.
 * Isolated nodes (degree 0) are always orphaned.
 */
function findOrphanedNodes(
  nodeIds: Set<string>,
  outgoing: Map<string, string[]>,
  incoming: Map<string, string[]>
): string[] {
  const sources = [...nodeIds].filter((id) => !(incoming.get(id)?.length));
  const reachable = new Set<string>();

  function visit(id: string) {
    if (reachable.has(id)) return;
    reachable.add(id);
    for (const target of outgoing.get(id) ?? []) {
      if (nodeIds.has(target)) visit(target);
    }
  }

  for (const s of sources) visit(s);

  const orphaned: string[] = [];
  for (const id of nodeIds) {
    const hasIn = (incoming.get(id)?.length ?? 0) > 0;
    const hasOut = (outgoing.get(id)?.length ?? 0) > 0;
    if (!hasIn && !hasOut) {
      orphaned.push(id);
    } else if (!reachable.has(id) && !sources.includes(id)) {
      orphaned.push(id);
    }
  }
  return orphaned;
}

/**
 * Validate workflow: returns cycles (each is a list of node ids in a cycle) and orphaned node ids.
 */
export function validateWorkflow(
  nodes: ValidationNode[],
  edges: ValidationEdge[]
): ValidationResult {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const outgoing = getOutgoingMap(edges);
  const incoming = getIncomingMap(edges);

  const cycles = findCycles(nodeIds, outgoing);
  const orphanedNodeIds = findOrphanedNodes(nodeIds, outgoing, incoming);

  return {
    valid: cycles.length === 0 && orphanedNodeIds.length === 0,
    cycles,
    orphanedNodeIds,
  };
}
