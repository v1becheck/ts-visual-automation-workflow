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
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";

import Sidebar from "./Sidebar";
import NodeEditModal, { type NodeTypeOption } from "./NodeEditModal";
import ValidationPanel from "./ValidationPanel";
import { useDnD } from "../contexts/DnDContext";
import { validateWorkflow } from "../lib/workflowValidation";

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

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeLabel, setEditingNodeLabel] = useState("");
  const [editingNodeType, setEditingNodeType] = useState<NodeTypeOption>("default");

  // we load the data from the server on mount
  useEffect(() => {
    const getData = async () => {
      const data = await fetch("/api/automation");
      const automation = await data.json();
      setNodes(automation.nodes);
      setEdges(automation.edges);
    };
    getData();
  }, [setNodes, setEdges]);

  // various callbacks
  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!type) return;

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
    [screenToFlowPosition, type, setNodes]
  );

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    setEditingNodeId(node.id);
    setEditingNodeLabel(getNodeLabel(node));
    setEditingNodeType(getNodeType(node));
  }, []);

  const handleSaveNodeEdit = useCallback(
    (nodeId: string, label: string, nodeType: NodeTypeOption) => {
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
    [setNodes]
  );

  const handleCloseNodeEdit = useCallback(() => {
    setEditingNodeId(null);
  }, []);

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
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          className="overview"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={nodeTypes}
        >
          <ValidationPanel result={validationResult} nodes={nodes} />
          <CustomMinimapWithEdges />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
      <Sidebar />

      <NodeEditModal
        isOpen={editingNodeId !== null}
        nodeId={editingNodeId}
        initialLabel={editingNodeLabel}
        initialType={editingNodeType}
        onSave={handleSaveNodeEdit}
        onClose={handleCloseNodeEdit}
      />
    </div>
  );
};

export default AutomationBuilder;
