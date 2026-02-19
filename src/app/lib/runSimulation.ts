/**
 * Dry-run simulation: walk the graph from triggers (nodes with no incoming edges)
 * in topological order. Returns execution steps without running real actions.
 */

import { validateWorkflow } from "./workflowValidation";

export type SimNode = { id: string };
export type SimEdge = { source: string; target: string };

export type SimulationStep = {
  stepIndex: number;
  nodeIds: string[];
};

export type SimulationResult =
  | { success: true; steps: SimulationStep[]; order: string[] }
  | { success: false; error: string };

/**
 * Build incoming edge count and outgoing adjacency for the graph.
 */
function getMaps(edges: SimEdge[]) {
  const incomingCount = new Map<string, number>();
  const outgoing = new Map<string, string[]>();

  for (const e of edges) {
    incomingCount.set(e.target, (incomingCount.get(e.target) ?? 0) + 1);
    const list = outgoing.get(e.source) ?? [];
    list.push(e.target);
    outgoing.set(e.source, list);
  }
  return { incomingCount, outgoing };
}

/**
 * Simulate execution: walk from trigger nodes (no incoming edges) in levels.
 * Each step runs when all its predecessors have run. Returns steps and flat order.
 */
export function runSimulation(
  nodes: SimNode[],
  edges: SimEdge[]
): SimulationResult {
  const nodeIds = new Set(nodes.map((n) => n.id));
  if (nodeIds.size === 0) {
    return { success: true, steps: [], order: [] };
  }

  const validation = validateWorkflow(
    nodes.map((n) => ({ id: n.id })),
    edges.map((e) => ({ source: e.source, target: e.target }))
  );

  if (validation.cycles.length > 0) {
    return {
      success: false,
      error: "Workflow has cycles. Fix cycles before simulating.",
    };
  }

  const { incomingCount, outgoing } = getMaps(edges);

  // Initialize: nodes not in any edge have 0 incoming
  for (const id of nodeIds) {
    if (!incomingCount.has(id)) incomingCount.set(id, 0);
  }

  const steps: SimulationStep[] = [];
  const order: string[] = [];
  const completed = new Set<string>();
  let currentLevel = nodeIds;
  let stepIndex = 0;

  while (currentLevel.size > 0) {
    const levelIds: string[] = [];
    for (const id of currentLevel) {
      if (completed.has(id)) continue;
      const inCount = incomingCount.get(id) ?? 0;
      const predecessorsDone = inCount === 0;
      if (predecessorsDone) {
        levelIds.push(id);
        order.push(id);
        completed.add(id);
      }
    }

    if (levelIds.length === 0) break;

    steps.push({ stepIndex, nodeIds: levelIds });

    const nextLevel = new Set<string>();
    for (const id of levelIds) {
      for (const target of outgoing.get(id) ?? []) {
        if (!nodeIds.has(target)) continue;
        const count = (incomingCount.get(target) ?? 1) - 1;
        incomingCount.set(target, count);
        if (count === 0) nextLevel.add(target);
      }
    }
    currentLevel = nextLevel;
    stepIndex++;
  }

  return { success: true, steps, order };
}
