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
} from "@xyflow/react";

import Sidebar, { type WorkflowListItem } from "./Sidebar";
import NodeEditModal, { type NodeTypeOption } from "./NodeEditModal";
import EdgeEditModal from "./EdgeEditModal";
import ValidationPanel from "./ValidationPanel";
import UndoRedoPanel from "./UndoRedoPanel";
import ExportImportPanel from "./ExportImportPanel";
import { useDnD } from "../contexts/DnDContext";
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

let id = 0;
const getId = () => `dndnode_${id++}`;

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
  const reactFlowWrapper = useRef(null);

  const { screenToFlowPosition } = useReactFlow();
  const { type } = useDnD();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

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
      return false;
    }
  }, [workflowId, nodes, edges]);

  const loadWorkflow = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/automations/${id}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("Failed to load workflow:", err.error || res.statusText);
          return;
        }
        const data = await res.json();
        skipDirtyRef.current = true;
        setNodes(Array.isArray(data.nodes) ? data.nodes : []);
        setEdges(Array.isArray(data.edges) ? data.edges : []);
        setWorkflowId(data.id);
        setIsDirty(false);
      } catch (err) {
        console.error("Failed to load workflow:", err);
      }
    },
    [setNodes, setEdges]
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
        window.alert(err.error ?? "Failed to create workflow");
        return;
      }
      const data = await res.json();
      skipDirtyRef.current = true;
      setNodes(Array.isArray(data.nodes) ? data.nodes : []);
      setEdges(Array.isArray(data.edges) ? data.edges : []);
      setWorkflowId(data.id);
      setIsDirty(false);
      await fetchWorkflows();
    } catch (err) {
      console.error("Failed to create workflow:", err);
      window.alert("Failed to create workflow");
    }
  }, [setNodes, setEdges, fetchWorkflows]);

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
          window.alert(err.error ?? "Failed to rename workflow");
          return;
        }
        await fetchWorkflows();
      } catch (err) {
        console.error("Failed to rename workflow:", err);
        window.alert("Failed to rename workflow");
      }
    },
    [fetchWorkflows]
  );

  const deleteWorkflow = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this workflow? This cannot be undone.")) return;
      try {
        const res = await fetch(`/api/automations/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          window.alert(err.error ?? "Failed to delete workflow");
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
      } catch (err) {
        console.error("Failed to delete workflow:", err);
        window.alert("Failed to delete workflow");
      }
    },
    [workflowId, fetchWorkflows, loadWorkflow, setNodes, setEdges]
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
        }
        if (listRes.ok) {
          const list = await listRes.json();
          setWorkflows(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error("Failed to load:", err);
      } finally {
        setIsInitialLoading(false);
        setTimeout(() => {
          initialLoadDoneRef.current = true;
        }, 0);
      }
    };
    getData();
  }, [setNodes, setEdges]);

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
    if (!ok) window.alert("Failed to save workflow.");
  }, [workflowId, isSaving, saveCurrentWorkflow]);

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
    clipboard.nodes.forEach((n) => idMap.set(n.id, getId()));
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
    selectedNodes.forEach((n) => idMap.set(n.id, getId()));
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
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
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
      const newId = getId();
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

  const onNodeDragStop = useCallback(() => {
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
          selectionOnDrag
          selectionKeyCode="Shift"
          multiSelectionKeyCode={["Shift", "Control", "Meta"]}
          panOnDrag={[1, 2]}
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
            <button
              type="button"
              className="shortcuts-help-btn"
              onClick={() => setShortcutsModalOpen(true)}
              title="Keyboard shortcuts (Ctrl+/)"
              aria-label="Show keyboard shortcuts"
            >
              ?
            </button>
            <ThemeToggle />
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
                embedded
              />
              <ValidationPanel result={validationResult} nodes={nodes} embedded />
            </div>
          </Panel>
          <CustomMinimapWithEdges />
          <Controls />
          <Background />
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
