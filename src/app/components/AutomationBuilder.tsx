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

import Sidebar from "./Sidebar";
import NodeEditModal, { type NodeTypeOption } from "./NodeEditModal";
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
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const initialLoadDoneRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SAVE_DEBOUNCE_MS = 1500;

  // Load workflow from server on mount (first workflow or create one)
  useEffect(() => {
    const getData = async () => {
      try {
        const res = await fetch("/api/automation");
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("Failed to load workflow:", err.error || res.statusText);
          return;
        }
        const automation = await res.json();
        setNodes(Array.isArray(automation.nodes) ? automation.nodes : []);
        setEdges(Array.isArray(automation.edges) ? automation.edges : []);
        if (automation.id) setWorkflowId(automation.id);
      } finally {
        setTimeout(() => {
          initialLoadDoneRef.current = true;
        }, 0);
      }
    };
    getData();
  }, [setNodes, setEdges]);

  // Debounced save when nodes/edges change (after initial load)
  useEffect(() => {
    if (!workflowId || !initialLoadDoneRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      fetch("/api/automation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: workflowId, nodes, edges }),
      }).catch((err) => console.error("Failed to save workflow:", err));
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [workflowId, nodes, edges]);

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
        } else {
          deselectAll();
        }
        return;
      }
      if (e.key === "Enter" && editingNodeId === null) {
        const selected = nodes.filter((n) => n.selected);
        if (selected.length === 1) {
          e.preventDefault();
          const node = selected[0];
          setEditingNodeId(node.id);
          setEditingNodeLabel(getNodeLabel(node));
          setEditingNodeType(getNodeType(node));
        }
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
    deleteSelected,
    deselectAll,
    editingNodeId,
    nodes,
    setEditingNodeId,
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
          nodeTypes={nodeTypes}
        >
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
              <ExportImportPanel
                nodes={nodes}
                edges={edges}
                onImport={handleImport}
                embedded
              />
              <ValidationPanel result={validationResult} nodes={nodes} embedded />
            </div>
          </Panel>
          <UndoRedoPanel undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} />
          <CustomMinimapWithEdges />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
      <Sidebar onLoadTemplate={loadTemplate} />

      <NodeEditModal
        isOpen={editingNodeId !== null}
        nodeId={editingNodeId}
        initialLabel={editingNodeLabel}
        initialType={editingNodeType}
        onSave={handleSaveNodeEdit}
        onClose={handleCloseNodeEdit}
      />

      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </div>
  );
};

export default AutomationBuilder;
