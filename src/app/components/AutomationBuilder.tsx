"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  Background,
  Controls,
  Node,
  Edge,
  NodeTypes,
  OnConnect,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStoreApi,
} from "@xyflow/react";
import {
  getBezierPath,
  getEdgePosition,
  ConnectionMode,
} from "@xyflow/system";

import Sidebar, { type WorkflowListItem } from "./Sidebar";
import NodeEditModal, { type NodeTypeOption } from "./NodeEditModal";
import EdgeEditModal from "./EdgeEditModal";
import RunSimulationPanel from "./RunSimulationPanel";
import ValidationPanel from "./ValidationPanel";
import UndoRedoPanel from "./UndoRedoPanel";
import ExportImportPanel from "./ExportImportPanel";
import { useDnD } from "../contexts/DnDContext";
import { useToast } from "../contexts/ToastContext";
import { validateWorkflow } from "../lib/workflowValidation";
import { useWorkflowHistory } from "../hooks/useWorkflowHistory";
import {
  instantiateTemplate,
  type WorkflowTemplate,
} from "../lib/workflowTemplates";

import "@xyflow/react/dist/style.css";
import "./styles.css";
import EmailNode from "./nodes/EmailNode";
import WebhookNode from "./nodes/WebhookNode";
import DelayNode from "./nodes/DelayNode";
import ConditionNode from "./nodes/ConditionNode";
import HttpNode from "./nodes/HttpNode";
import ScheduleNode from "./nodes/ScheduleNode";
import SetNode from "./nodes/SetNode";
import MergeNode from "./nodes/MergeNode";
import SlackNode from "./nodes/SlackNode";
import CodeNode from "./nodes/CodeNode";
import CustomMinimapWithEdges from "./CustomMinimapWithEdges";
import ThemeToggle from "./ThemeToggle";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import GoToNodePanel from "./GoToNodePanel";
import AlignmentGuides from "./AlignmentGuides";

/** Returns an ID that does not exist in nodes (or in reserved). Use for new nodes so pasted/duplicated nodes never overwrite existing ones. */
function getUniqueNodeId(nodes: Node[], reserved?: Set<string>): string {
  const used = new Set(nodes.map((n) => n.id));
  if (reserved) reserved.forEach((id) => used.add(id));
  let n = 0;
  while (used.has(`dndnode_${n}`)) n++;
  return `dndnode_${n}`;
}

/** Legacy single-id getter; prefer getUniqueNodeId(nodes) when you have nodes to avoid collisions after load. */
let id = 0;
const getId = () => `dndnode_${id++}`;

/** Custom nodes are all wrapped in React.memo to avoid re-renders when only other nodes or drag state change. */
const nodeTypes: NodeTypes = {
  email: EmailNode,
  webhook: WebhookNode,
  delay: DelayNode,
  condition: ConditionNode,
  http: HttpNode,
  schedule: ScheduleNode,
  set: SetNode,
  merge: MergeNode,
  slack: SlackNode,
  code: CodeNode,
};

const DEFAULT_NODE_WIDTH = 140;
const DEFAULT_NODE_HEIGHT = 50;

/** When "true" in localStorage, throttle drag state updates to ~30fps to reduce CPU on low-end devices. */
const DRAG_THROTTLE_30FPS_KEY = "workflow-builder-drag-30fps";
const DRAG_THROTTLE_MS = 33;

/** When "false" in localStorage, crosshair lines are hidden when dragging a node. Default true. */
const CROSSHAIR_ENABLED_KEY = "workflow-builder-crosshair-enabled";

/** Internal node has measured at top level; fall back to internals.measured then node.width/height */
function getNodeDimensions(
  node: Node,
  nodeLookup?: Map<string, { measured?: { width?: number; height?: number }; internals?: { measured?: { width?: number; height?: number } } }>
): { width: number; height: number } {
  const entry = nodeLookup?.get(node.id);
  const m = entry?.measured ?? entry?.internals?.measured;
  const w = m?.width ?? (node as Node & { width?: number }).width ?? DEFAULT_NODE_WIDTH;
  const h = m?.height ?? (node as Node & { height?: number }).height ?? DEFAULT_NODE_HEIGHT;
  return { width: w, height: h };
}

/** All nodes have at least data.label for the edit modal */
function getNodeLabel(node: Node): string {
  return (node.data as { label?: string })?.label ?? "Unnamed node";
}

const NODE_TYPE_VALUES: NodeTypeOption[] = [
  "input",
  "default",
  "output",
  "email",
  "webhook",
  "delay",
  "condition",
  "http",
  "schedule",
  "set",
  "merge",
  "slack",
  "code",
];

function getNodeType(node: Node): NodeTypeOption {
  const t = node.type as string | undefined;
  if (t && NODE_TYPE_VALUES.includes(t as NodeTypeOption)) return t as NodeTypeOption;
  return "default";
}

const AutomationBuilder = () => {
  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);

  const { screenToFlowPosition, fitView } = useReactFlow();
  const { type } = useDnD();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const storeApi = useStoreApi();
  const toast = useToast();
  const [dragState, setDragState] = useState<{
    centerX: number;
    centerY: number;
    position: { x: number; y: number };
  } | null>(null);

  const {
    undo,
    redo,
    canUndo,
    canRedo,
    pushStateBefore,
    markAction,
    pushStateAfterDrag,
  } = useWorkflowHistory(nodes, setNodes, edges, setEdges);

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeLabel, setEditingNodeLabel] = useState("");
  const [editingNodeType, setEditingNodeType] = useState<NodeTypeOption>("default");
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [editingEdgeLabel, setEditingEdgeLabel] = useState("");
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [crosshairEnabled, setCrosshairEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(CROSSHAIR_ENABLED_KEY);
    return stored !== "false";
  });
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const initialLoadDoneRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipDirtyRef = useRef(false);
  const clipboardRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const lastMouseScreenRef = useRef({ x: 0, y: 0 });
  const dragStatePendingRef = useRef<{
    centerX: number;
    centerY: number;
    position: { x: number; y: number };
  } | null>(null);
  const dragStateRafRef = useRef<number | null>(null);
  const lastDragStateUpdateRef = useRef(0);
  const SAVE_DEBOUNCE_MS = 1500;

  const fetchWorkflows = useCallback(async (): Promise<WorkflowListItem[]> => {
    try {
      const res = await fetch("/api/automations");
      if (!res.ok) return [];
      const list = await res.json();
      const next = Array.isArray(list) ? list : [];
      setWorkflows(next);
      return next;
    } catch {
      setWorkflows([]);
      return [];
    }
  }, []);

  const saveCurrentWorkflow = useCallback(async (): Promise<boolean> => {
    if (!workflowId) return false;
    try {
      const res = await fetch("/api/automation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: workflowId, nodes, edges }),
      });
      if (res.ok) setIsDirty(false);
      return res.ok;
    } catch (err) {
      console.error("Failed to save workflow:", err);
      toast.error("Failed to save workflow.");
      return false;
    }
  }, [workflowId, nodes, edges, toast]);

  const loadWorkflow = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/automations/${id}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("Failed to load workflow:", err.error || res.statusText);
          toast.error(err.error ?? "Failed to load workflow.");
          return;
        }
        const data = await res.json();
        skipDirtyRef.current = true;
        setNodes(Array.isArray(data.nodes) ? data.nodes : []);
        setEdges(Array.isArray(data.edges) ? data.edges : []);
        setWorkflowId(data.id);
        setIsDirty(false);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }));
        });
      } catch (err) {
        console.error("Failed to load workflow:", err);
        toast.error("Failed to load workflow.");
      }
    },
    [setNodes, setEdges, toast, fitView]
  );

  const createNewWorkflow = useCallback(async () => {
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled workflow" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to create workflow");
        return;
      }
      const data = await res.json();
      skipDirtyRef.current = true;
      setNodes(Array.isArray(data.nodes) ? data.nodes : []);
      setEdges(Array.isArray(data.edges) ? data.edges : []);
      setWorkflowId(data.id);
      setIsDirty(false);
      await fetchWorkflows();
      toast.success("Workflow created");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }));
      });
    } catch (err) {
      console.error("Failed to create workflow:", err);
      toast.error("Failed to create workflow");
    }
  }, [setNodes, setEdges, fetchWorkflows, toast, fitView]);

  const renameWorkflow = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      try {
        const res = await fetch(`/api/automations/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error ?? "Failed to rename workflow");
          return;
        }
        toast.success("Workflow renamed");
      } catch (err) {
        console.error("Failed to rename workflow:", err);
        toast.error("Failed to rename workflow");
      }
    },
    [toast]
  );

  const deleteWorkflow = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this workflow? This cannot be undone.")) return;
      try {
        const res = await fetch(`/api/automations/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error ?? "Failed to delete workflow");
          return;
        }
        const wasCurrent = workflowId === id;
        const list = await fetchWorkflows();
        if (wasCurrent) {
          const next = list.length > 0 ? list[0] : null;
          if (next) {
            await loadWorkflow(next.id);
          } else {
            setWorkflowId(null);
            setNodes([]);
            setEdges([]);
          }
        }
        toast.success("Workflow deleted");
      } catch (err) {
        console.error("Failed to delete workflow:", err);
        toast.error("Failed to delete workflow");
      }
    },
    [workflowId, fetchWorkflows, loadWorkflow, setNodes, setEdges, toast]
  );

  // Load initial workflow and workflow list on mount
  useEffect(() => {
    const getData = async () => {
      try {
        const [autoRes, listRes] = await Promise.all([
          fetch("/api/automation"),
          fetch("/api/automations"),
        ]);
        if (autoRes.ok) {
          const automation = await autoRes.json();
          setNodes(Array.isArray(automation.nodes) ? automation.nodes : []);
          setEdges(Array.isArray(automation.edges) ? automation.edges : []);
          if (automation.id) setWorkflowId(automation.id);
          setIsDirty(false);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }));
          });
        }
        if (listRes.ok) {
          const list = await listRes.json();
          setWorkflows(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error("Failed to load:", err);
        toast.error("Failed to load workflows");
      } finally {
        setIsInitialLoading(false);
        setTimeout(() => {
          initialLoadDoneRef.current = true;
        }, 0);
      }
    };
    getData();
  }, [setNodes, setEdges, toast, fitView]);

  // Mark dirty when nodes/edges change (after initial load and when we have a workflow)
  useEffect(() => {
    if (skipDirtyRef.current) {
      skipDirtyRef.current = false;
      return;
    }
    if (!initialLoadDoneRef.current || !workflowId) return;
    setIsDirty(true);
  }, [nodes, edges, workflowId]);

  // Debounced auto-save when nodes/edges change (after initial load)
  useEffect(() => {
    if (!workflowId || !initialLoadDoneRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      saveCurrentWorkflow();
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [workflowId, nodes, edges, saveCurrentWorkflow]);

  const handleManualSave = useCallback(async () => {
    if (!workflowId || isSaving) return;
    setIsSaving(true);
    const ok = await saveCurrentWorkflow();
    setIsSaving(false);
    if (ok) toast.success("Workflow saved");
    else toast.error("Failed to save workflow.");
  }, [workflowId, isSaving, saveCurrentWorkflow, toast]);

  const deleteSelected = useCallback(() => {
    const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    const hasSelectedNodes = selectedNodeIds.size > 0;
    const hasSelectedEdges = edges.some((e) => e.selected);
    if (!hasSelectedNodes && !hasSelectedEdges) return;
    pushStateBefore(nodes, edges);
    markAction();
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) =>
      eds.filter(
        (e) => !e.selected && !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)
      )
    );
  }, [nodes, edges, pushStateBefore, markAction, setNodes, setEdges]);

  const handleImport = useCallback(
    (importedNodes: Node[], importedEdges: Edge[]) => {
      pushStateBefore(nodes, edges);
      markAction();
      setNodes(importedNodes);
      setEdges(importedEdges);
    },
    [nodes, edges, pushStateBefore, markAction, setNodes, setEdges]
  );

  const exportWorkflowPng = useCallback(async () => {
    const wrapper = reactFlowWrapper.current;
    if (!wrapper) return;
    const flowRoot = wrapper.querySelector(".react-flow");
    const pane = wrapper.querySelector(".react-flow__pane");
    if (!flowRoot || !pane || !(pane instanceof HTMLElement)) return;
    try {
      await fitView({ padding: 0.2, duration: 0 });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const state = storeApi.getState();
      const { transform, nodeLookup, connectionMode } = state;
      const [vx, vy, zoom] = transform;
      const isLight =
        document.documentElement.getAttribute("data-theme") === "light";
      const rootStyle = getComputedStyle(document.documentElement);
      const flowStyle = getComputedStyle(flowRoot as HTMLElement);
      const bg =
        flowStyle.getPropertyValue("--xy-background-color")?.trim() ||
        (isLight ? "#e2e8f0" : "#0f172a");
      const edgeStroke =
        rootStyle.getPropertyValue("--slate-400")?.trim() ||
        (isLight ? "#64748b" : "rgba(148, 163, 184, 0.5)");
      const labelColor =
        rootStyle.getPropertyValue("--slate-200")?.trim() ||
        (isLight ? "#334155" : "#e2e8f0");
      const labelBg =
        rootStyle.getPropertyValue("--slate-900")?.trim() ||
        (isLight ? "#f1f5f9" : "#0f172a");
      const labelStroke =
        rootStyle.getPropertyValue("--slate-600")?.trim() ||
        (isLight ? "#475569" : "#475569");
      const paneRect = pane.getBoundingClientRect();
      const pr = 2;
      const cw = Math.round(paneRect.width * pr);
      const ch = Math.round(paneRect.height * pr);

      const { toSvg } = await import("html-to-image");
      const svgDataUrl = await toSvg(pane, {
        pixelRatio: pr,
        backgroundColor: bg,
        cacheBust: true,
        filter: (node: HTMLElement) => {
          const c = node.classList;
          if (!c) return true;
          if (c.contains("react-flow__edges")) return false;
          return true;
        },
      });
      const nodesImg = new Image();
      await new Promise<void>((resolve, reject) => {
        nodesImg.onload = () => resolve();
        nodesImg.onerror = () => reject(new Error("Failed to load pane SVG"));
        nodesImg.src = svgDataUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2d not available");
      ctx.drawImage(nodesImg, 0, 0, cw, ch);

      ctx.save();
      ctx.translate(vx * pr, vy * pr);
      ctx.scale(zoom * pr, zoom * pr);
      const scale = zoom * pr;
      const edgeStrokeWidth = 2 / scale;
      const arrowSize = 8 / scale;
      const labelFont = "500 12px system-ui, sans-serif";

      for (const edge of edges) {
        const sourceNode = nodeLookup.get(edge.source);
        const targetNode = nodeLookup.get(edge.target);
        if (!sourceNode || !targetNode) continue;
        const pos = getEdgePosition({
          id: edge.id,
          sourceNode,
          targetNode,
          sourceHandle: edge.sourceHandle ?? null,
          targetHandle: edge.targetHandle ?? null,
          connectionMode: connectionMode ?? ConnectionMode.Strict,
        });
        if (!pos) continue;
        const [pathStr, labelX, labelY] = getBezierPath({
          sourceX: pos.sourceX,
          sourceY: pos.sourceY,
          sourcePosition: pos.sourcePosition,
          targetX: pos.targetX,
          targetY: pos.targetY,
          targetPosition: pos.targetPosition,
        });
        const path = new Path2D(pathStr);
        ctx.strokeStyle = edgeStroke;
        ctx.lineWidth = edgeStrokeWidth;
        ctx.stroke(path);

        const dx = pos.targetX - labelX;
        const dy = pos.targetY - labelY;
        const angle = Math.atan2(dy, dx);
        ctx.save();
        ctx.translate(pos.targetX, pos.targetY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(arrowSize, -arrowSize / 2);
        ctx.lineTo(0, 0);
        ctx.lineTo(arrowSize, arrowSize / 2);
        ctx.closePath();
        ctx.fillStyle = edgeStroke;
        ctx.fill();
        ctx.restore();

        const label = (edge as Edge & { label?: string }).label;
        if (label && typeof label === "string") {
          ctx.font = labelFont;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const metrics = ctx.measureText(label);
          const pad = 6;
          const minLabelW = 40;
          const lw = Math.max(minLabelW, metrics.width + pad * 2);
          const lh = 16;
          const radius = 6;
          const lx = labelX - lw / 2;
          const ly = labelY - lh / 2;
          const r = Math.min(radius, lw / 2, lh / 2);
          ctx.beginPath();
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(lx, ly, lw, lh, r);
          } else {
            ctx.moveTo(lx + r, ly);
            ctx.lineTo(lx + lw - r, ly);
            ctx.quadraticCurveTo(lx + lw, ly, lx + lw, ly + r);
            ctx.lineTo(lx + lw, ly + lh - r);
            ctx.quadraticCurveTo(lx + lw, ly + lh, lx + lw - r, ly + lh);
            ctx.lineTo(lx + r, ly + lh);
            ctx.quadraticCurveTo(lx, ly + lh, lx, ly + lh - r);
            ctx.lineTo(lx, ly + r);
            ctx.quadraticCurveTo(lx, ly, lx + r, ly);
            ctx.closePath();
          }
          ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
          ctx.shadowBlur = 4 / scale;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 2 / scale;
          ctx.fillStyle = labelBg;
          ctx.fill();
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.strokeStyle = labelStroke;
          ctx.lineWidth = 1 / scale;
          ctx.stroke();
          ctx.fillStyle = labelColor;
          ctx.fillText(label, labelX, labelY);
        }
      }

      ctx.restore();

      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "workflow.png";
      a.click();
    } catch (err) {
      console.error("Export PNG failed:", err);
      toast.error("Failed to export PNG.");
    }
  }, [fitView, storeApi, edges, toast]);

  const deselectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
    setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
  }, [setNodes, setEdges]);

  const copySelected = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length === 0) return;
    const selectedIds = new Set(selectedNodes.map((n) => n.id));
    const selectedEdges = edges.filter(
      (e) => selectedIds.has(e.source) && selectedIds.has(e.target)
    );
    clipboardRef.current = {
      nodes: selectedNodes.map((n) => ({ ...n })),
      edges: selectedEdges.map((e) => ({ ...e })),
    };
  }, [nodes, edges]);

  const pasteFromClipboard = useCallback(() => {
    const clipboard = clipboardRef.current;
    if (!clipboard || clipboard.nodes.length === 0) return;
    const idMap = new Map<string, string>();
    const reserved = new Set<string>();
    clipboard.nodes.forEach((n) => {
      const newId = getUniqueNodeId(nodes, reserved);
      idMap.set(n.id, newId);
      reserved.add(newId);
    });
    const targetFlow = screenToFlowPosition({
      x: lastMouseScreenRef.current.x,
      y: lastMouseScreenRef.current.y,
    });
    const cx =
      clipboard.nodes.reduce((s, n) => s + n.position.x, 0) / clipboard.nodes.length;
    const cy =
      clipboard.nodes.reduce((s, n) => s + n.position.y, 0) / clipboard.nodes.length;
    const dx = targetFlow.x - cx;
    const dy = targetFlow.y - cy;
    const newNodes: Node[] = clipboard.nodes.map((n) => ({
      ...n,
      id: idMap.get(n.id)!,
      position: {
        x: n.position.x + dx,
        y: n.position.y + dy,
      },
      selected: true,
    }));
    const newEdges: Edge[] = clipboard.edges
      .filter((e) => idMap.has(e.source) && idMap.has(e.target))
      .map((e, i) => ({
        ...e,
        id: `paste_e_${Date.now()}_${i}`,
        source: idMap.get(e.source)!,
        target: idMap.get(e.target)!,
      }));
    pushStateBefore(nodes, edges);
    markAction();
    // Defer to next frame so React Flow's internal state doesn't overwrite our update
    requestAnimationFrame(() => {
      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes]);
      setEdges((eds) => [...eds.map((e) => ({ ...e, selected: false })), ...newEdges]);
    });
  }, [nodes, edges, pushStateBefore, markAction, setNodes, setEdges, screenToFlowPosition]);

  const DUPLICATE_OFFSET = 80;

  const duplicateSelected = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length === 0) return;
    const selectedIds = new Set(selectedNodes.map((n) => n.id));
    const selectedEdges = edges.filter(
      (e) => selectedIds.has(e.source) && selectedIds.has(e.target)
    );
    const idMap = new Map<string, string>();
    const reserved = new Set<string>();
    selectedNodes.forEach((n) => {
      const newId = getUniqueNodeId(nodes, reserved);
      idMap.set(n.id, newId);
      reserved.add(newId);
    });
    const newNodes: Node[] = selectedNodes.map((n) => ({
      ...n,
      id: idMap.get(n.id)!,
      position: {
        x: n.position.x + DUPLICATE_OFFSET,
        y: n.position.y + DUPLICATE_OFFSET,
      },
      selected: true,
    }));
    const newEdges: Edge[] = selectedEdges.map((e, i) => ({
      ...e,
      id: `dup_e_${Date.now()}_${i}`,
      source: idMap.get(e.source)!,
      target: idMap.get(e.target)!,
    }));
    pushStateBefore(nodes, edges);
    markAction();
    // Defer to next frame so React Flow's internal state doesn't overwrite our update
    requestAnimationFrame(() => {
      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes]);
      setEdges((eds) => [...eds.map((e) => ({ ...e, selected: false })), ...newEdges]);
    });
  }, [nodes, edges, pushStateBefore, markAction, setNodes, setEdges]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      lastMouseScreenRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (inInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (editingNodeId !== null) {
          setEditingNodeId(null);
        } else if (editingEdgeId !== null) {
          setEditingEdgeId(null);
        } else {
          deselectAll();
        }
        return;
      }
      if (e.key === "Enter" && editingNodeId === null && editingEdgeId === null) {
        const selectedNodes = nodes.filter((n) => n.selected);
        const selectedEdges = edges.filter((e) => e.selected);
        if (selectedNodes.length === 1) {
          e.preventDefault();
          const node = selectedNodes[0];
          setEditingNodeId(node.id);
          setEditingNodeLabel(getNodeLabel(node));
          setEditingNodeType(getNodeType(node));
        } else if (selectedEdges.length === 1) {
          e.preventDefault();
          const edge = selectedEdges[0];
          setEditingEdgeId(edge.id);
          setEditingEdgeLabel((edge as Edge & { label?: string }).label ?? "");
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (workflowId && !isSaving) handleManualSave();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        copySelected();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        pasteFromClipboard();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setShortcutsModalOpen((open) => !open);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === " ") {
        e.preventDefault();
        fitView({ padding: 0.2, duration: 300 });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        toast.success("Sample success message");
        toast.error("Sample error message");
        toast.info("Sample info message");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    fitView,
    undo,
    redo,
    workflowId,
    isSaving,
    handleManualSave,
    deleteSelected,
    copySelected,
    pasteFromClipboard,
    duplicateSelected,
    deselectAll,
    editingNodeId,
    editingEdgeId,
    nodes,
    edges,
    setEditingNodeId,
    setEditingEdgeId,
    setEditingEdgeLabel,
    toast,
  ]);

  const onConnect: OnConnect = useCallback(
    (params) => {
      pushStateBefore(nodes, edges);
      markAction();
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges, nodes, edges, pushStateBefore, markAction]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!type) return;

      pushStateBefore(nodes, edges);
      markAction();

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newId = getUniqueNodeId(nodes);
      const defaultLabel = `${type} node`;
      const newNode: Node = {
        id: newId,
        type,
        position,
        data: { label: defaultLabel },
      };

      setNodes((nds) => [...nds, newNode]);
      setEditingNodeLabel(defaultLabel);
      setEditingNodeType(getNodeType(newNode));
      setEditingNodeId(newId);
    },
    [screenToFlowPosition, type, setNodes, nodes, edges, pushStateBefore, markAction]
  );

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    setEditingNodeId(node.id);
    setEditingNodeLabel(getNodeLabel(node));
    setEditingNodeType(getNodeType(node));
  }, []);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      pushStateBefore(nodes, edges);
      markAction();
      setNodes((nds) => nds.filter((n) => n.id !== node.id));
      setEdges((eds) =>
        eds.filter((e) => e.source !== node.id && e.target !== node.id)
      );
    },
    [nodes, edges, pushStateBefore, markAction, setNodes, setEdges]
  );

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      pushStateBefore(nodes, edges);
      markAction();
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    },
    [nodes, edges, pushStateBefore, markAction, setEdges]
  );

  const onEdgeDoubleClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    const label = (edge as Edge & { label?: string }).label ?? "";
    setEditingEdgeId(edge.id);
    setEditingEdgeLabel(label);
  }, []);

  const handleSaveEdgeEdit = useCallback(
    (edgeId: string, label: string) => {
      pushStateBefore(nodes, edges);
      markAction();
      setEdges((eds) =>
        eds.map((e) => (e.id === edgeId ? { ...e, label: label || undefined } : e))
      );
      setEditingEdgeId(null);
    },
    [nodes, edges, pushStateBefore, markAction, setEdges]
  );

  const handleCloseEdgeEdit = useCallback(() => {
    setEditingEdgeId(null);
  }, []);

  const handleSaveNodeEdit = useCallback(
    (nodeId: string, label: string, nodeType: NodeTypeOption) => {
      if (label === editingNodeLabel && nodeType === editingNodeType) {
        setEditingNodeId(null);
        return;
      }
      pushStateBefore(nodes, edges);
      markAction();
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                type: nodeType,
                data: { ...n.data, label } as { label: string },
              }
            : n
        )
      );
      setEditingNodeId(null);
    },
    [setNodes, nodes, edges, pushStateBefore, markAction, editingNodeLabel, editingNodeType]
  );

  const handleCloseNodeEdit = useCallback(() => {
    setEditingNodeId(null);
  }, []);

  const loadTemplate = useCallback(
    (template: WorkflowTemplate) => {
      pushStateBefore(nodes, edges);
      markAction();
      const { nodes: nextNodes, edges: nextEdges } = instantiateTemplate(template);
      setNodes(nextNodes);
      setEdges(nextEdges);
    },
    [nodes, edges, pushStateBefore, markAction, setNodes, setEdges]
  );

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      const hasRemove = changes.some((c) => (c as { type?: string }).type === "remove");
      if (hasRemove) {
        pushStateBefore(nodes, edges);
        markAction();
      }
      onNodesChange(changes);
    },
    [onNodesChange, nodes, edges, pushStateBefore, markAction]
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      const hasRemove = changes.some((c) => (c as { type?: string }).type === "remove");
      if (hasRemove) {
        pushStateBefore(nodes, edges);
        markAction();
      }
      onEdgesChange(changes);
    },
    [onEdgesChange, nodes, edges, pushStateBefore, markAction]
  );

  const onNodeDragStart = useCallback(() => {
    pushStateBefore(nodes, edges);
  }, [nodes, edges, pushStateBefore]);

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const state = storeApi.getState();
      const nodeLookup = state.nodeLookup as Parameters<typeof getNodeDimensions>[1];
      const dims = getNodeDimensions(node, nodeLookup);
      const internal = state.nodeLookup.get(node.id) as
        | { internals?: { positionAbsolute?: { x: number; y: number } } }
        | undefined;
      const posAbsolute = internal?.internals?.positionAbsolute;
      const topLeftX = posAbsolute != null ? posAbsolute.x : node.position.x;
      const topLeftY = posAbsolute != null ? posAbsolute.y : node.position.y;
      const centerX = topLeftX + dims.width / 2;
      const centerY = topLeftY + dims.height / 2;
      dragStatePendingRef.current = { centerX, centerY, position: { ...node.position } };
      if (dragStateRafRef.current === null) {
        dragStateRafRef.current = requestAnimationFrame(() => {
          dragStateRafRef.current = null;
          const pending = dragStatePendingRef.current;
          if (pending == null) return;
          const throttle30 =
            typeof window !== "undefined" && localStorage.getItem(DRAG_THROTTLE_30FPS_KEY) === "true";
          if (throttle30) {
            const now = Date.now();
            if (now - lastDragStateUpdateRef.current < DRAG_THROTTLE_MS) return;
            lastDragStateUpdateRef.current = now;
          }
          setDragState(pending);
        });
      }
    },
    [storeApi]
  );

  const onNodeDragStop = useCallback(() => {
    if (dragStateRafRef.current !== null) {
      cancelAnimationFrame(dragStateRafRef.current);
      dragStateRafRef.current = null;
    }
    dragStatePendingRef.current = null;
    lastDragStateUpdateRef.current = 0;
    setDragState(null);
    requestAnimationFrame(() => {
      pushStateAfterDrag();
    });
  }, [pushStateAfterDrag]);

  const validationResult = useMemo(
    () =>
      validateWorkflow(
        nodes.map((n) => ({ id: n.id })),
        edges.map((e) => ({ source: e.source, target: e.target }))
      ),
    [nodes, edges]
  );

  const nodesWithValidation = useMemo(() => {
    const errorIds = new Set<string>([
      ...validationResult.orphanedNodeIds,
      ...validationResult.cycles.flat(),
    ]);
    return nodes.map((n) =>
      errorIds.has(n.id)
        ? { ...n, className: [n.className, "node-validation-error"].filter(Boolean).join(" ") }
        : n
    );
  }, [nodes, validationResult]);

  if (isInitialLoading) {
    return (
      <div className="automation-builder automation-builder--loading">
        <div className="app-loader" role="status" aria-live="polite" aria-label="Loading workflow">
          <div className="app-loader__spinner" aria-hidden />
          <p className="app-loader__text">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="automation-builder">
      <div className="reactflow-wrapper" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodesWithValidation}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          fitView
          className="overview"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          nodeTypes={nodeTypes}
          elementsSelectable
          selectionOnDrag={false}
          selectionKeyCode="Shift"
          multiSelectionKeyCode="Shift"
          panOnDrag={true}
          panActivationKeyCode="Space"
        >
          <Panel position="top-center" className="top-center-stack">
            <UndoRedoPanel
              undo={undo}
              redo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              embedded
            />
            <GoToNodePanel nodes={nodes} setNodes={setNodes} embedded />
          </Panel>
          <Panel position="top-right" className="automation-builder__top-right">
            <div className="automation-builder__top-right-buttons">
              <button
                type="button"
                className="shortcuts-help-btn"
                onClick={() => setShortcutsModalOpen(true)}
                title="Keyboard shortcuts (Ctrl+/)"
                aria-label="Show keyboard shortcuts"
              >
                ?
              </button>
              <button
                type="button"
                className={`crosshair-toggle-btn ${crosshairEnabled ? "crosshair-toggle-btn--on" : ""}`}
                onClick={() => {
                  const next = !crosshairEnabled;
                  setCrosshairEnabled(next);
                  try {
                    window.localStorage.setItem(CROSSHAIR_ENABLED_KEY, String(next));
                  } catch {
                    /* ignore */
                  }
                }}
                title={crosshairEnabled ? "Hide crosshair when dragging" : "Show crosshair when dragging"}
                aria-label={crosshairEnabled ? "Hide crosshair when dragging" : "Show crosshair when dragging"}
                aria-pressed={crosshairEnabled}
              >
                <svg
                  className="crosshair-toggle-btn__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <line x1="12" y1="3" x2="12" y2="8" />
                  <line x1="12" y1="16" x2="12" y2="21" />
                  <line x1="3" y1="12" x2="8" y2="12" />
                  <line x1="16" y1="12" x2="21" y2="12" />
                  <circle cx="12" cy="12" r="3" strokeWidth="1.25" />
                </svg>
              </button>
              <ThemeToggle />
            </div>
            {dragState != null && (
              <span className="drag-position-text" aria-live="polite">
                X: {Math.round(dragState.position.x)} &nbsp; Y: {Math.round(dragState.position.y)}
              </span>
            )}
          </Panel>
          <Panel position="top-left" className="top-left-panel">
            <div className="top-left-panel__column">
              <div className="save-row">
                <button
                  type="button"
                  className="save-row__btn"
                  onClick={handleManualSave}
                  disabled={!workflowId || isSaving}
                  title={workflowId ? "Save workflow (Ctrl+S)" : "No workflow to save"}
                  aria-label="Save workflow"
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
                {isDirty && (
                  <span className="save-row__unsaved" aria-live="polite">
                    Unsaved
                  </span>
                )}
              </div>
              <ExportImportPanel
                nodes={nodes}
                edges={edges}
                onImport={handleImport}
                onExportPng={exportWorkflowPng}
                embedded
              />
              <ValidationPanel result={validationResult} nodes={nodes} embedded />
              <RunSimulationPanel
                nodes={nodes}
                edges={edges}
                valid={validationResult.valid}
                onHighlightNodes={(nodeIds) => {
                  setNodes((nds) =>
                    nds.map((n) => ({ ...n, selected: nodeIds.includes(n.id) }))
                  );
                }}
                embedded
              />
            </div>
          </Panel>
          <CustomMinimapWithEdges />
          <Controls />
          <Background />
          <AlignmentGuides
            drag={
              crosshairEnabled && dragState
                ? { centerX: dragState.centerX, centerY: dragState.centerY }
                : null
            }
          />
        </ReactFlow>
      </div>
      <Sidebar
        onLoadTemplate={loadTemplate}
        workflows={workflows}
        currentWorkflowId={workflowId}
        onNewWorkflow={createNewWorkflow}
        onSelectWorkflow={loadWorkflow}
        onRenameWorkflow={renameWorkflow}
        onDeleteWorkflow={deleteWorkflow}
      />

      <NodeEditModal
        isOpen={editingNodeId !== null}
        nodeId={editingNodeId}
        initialLabel={editingNodeLabel}
        initialType={editingNodeType}
        onSave={handleSaveNodeEdit}
        onClose={handleCloseNodeEdit}
      />

      <EdgeEditModal
        isOpen={editingEdgeId !== null}
        edgeId={editingEdgeId}
        initialLabel={editingEdgeLabel}
        onSave={handleSaveEdgeEdit}
        onClose={handleCloseEdgeEdit}
      />

      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </div>
  );
};

export default AutomationBuilder;
