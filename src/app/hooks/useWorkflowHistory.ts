"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Node, Edge } from "@xyflow/react";

const MAX_HISTORY = 50;

type Snapshot = { nodes: Node[]; edges: Edge[] };

function cloneSnapshot(nodes: Node[], edges: Edge[]): Snapshot {
  return {
    nodes: JSON.parse(JSON.stringify(nodes)),
    edges: JSON.parse(JSON.stringify(edges)),
  };
}

export type UseWorkflowHistoryResult = {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Call before applying an action; then apply the change (e.g. setNodes). */
  pushStateBefore: (nodes: Node[], edges: Edge[]) => void;
  /** Call after applying an action so the next state update will be pushed (enables redo). */
  markAction: () => void;
};

/**
 * Undo/redo for workflow (nodes + edges).
 * Before each user action call pushStateBefore(currentNodes, currentEdges), then apply the change.
 * Call markAction() so the resulting state is pushed after the next render (enables redo).
 */
export function useWorkflowHistory(
  nodes: Node[],
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void,
  edges: Edge[],
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void
): UseWorkflowHistoryResult {
  const historyRef = useRef<Snapshot[]>([]);
  const indexRef = useRef(-1);
  const skipPushRef = useRef(false);
  const actionPendingRef = useRef(false);
  const initializedRef = useRef(false);
  const [, setTick] = useState(0);

  const pushState = useCallback((snapshot: Snapshot, atTip: boolean) => {
    const history = historyRef.current;
    const index = indexRef.current;

    if (index < history.length) {
      historyRef.current = history.slice(0, index);
    }
    historyRef.current.push(snapshot);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    indexRef.current = atTip ? historyRef.current.length : historyRef.current.length - 1;
    setTick((t) => t + 1);
  }, []);

  const pushStateBefore = useCallback(
    (currentNodes: Node[], currentEdges: Edge[]) => {
      pushState(cloneSnapshot(currentNodes, currentEdges), true);
    },
    [pushState]
  );

  const markAction = useCallback(() => {
    actionPendingRef.current = true;
  }, []);

  useEffect(() => {
    if (skipPushRef.current) {
      skipPushRef.current = false;
      return;
    }
    if (!initializedRef.current) {
      if (nodes.length === 0 && edges.length === 0) return;
      pushState(cloneSnapshot(nodes, edges), false);
      initializedRef.current = true;
      return;
    }
    if (actionPendingRef.current) {
      actionPendingRef.current = false;
      pushState(cloneSnapshot(nodes, edges), false);
    }
  }, [nodes, edges, pushState]);

  const undo = useCallback(() => {
    const history = historyRef.current;
    if (indexRef.current <= 0) return;
    indexRef.current -= 1;
    skipPushRef.current = true;
    const snapshot = history[indexRef.current];
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    setTick((t) => t + 1);
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    const history = historyRef.current;
    if (indexRef.current >= history.length - 1) return;
    indexRef.current += 1;
    skipPushRef.current = true;
    const snapshot = history[indexRef.current];
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    setTick((t) => t + 1);
  }, [setNodes, setEdges]);

  const canUndo = indexRef.current > 0;
  const canRedo = indexRef.current < historyRef.current.length;

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    pushStateBefore,
    markAction,
  };
}
