"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
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
import { useDnD } from "../contexts/DnDContext";

import "@xyflow/react/dist/style.css";
import "./styles.css";
import EmailNode from "./nodes/EmailNode";

let id = 0;
const getId = () => `dndnode_${id++}`;

// list of possible node types
const nodeTypes: NodeTypes = {
  email: EmailNode,
};

const AutomationBuilder = () => {
  const reactFlowWrapper = useRef(null);

  const { screenToFlowPosition } = useReactFlow();
  const { type } = useDnD();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

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

      // check if the dropped element is valid
      if (!type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, type, setNodes]
  );

  return (
    <div className="automation-builder">
      <div className="reactflow-wrapper" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          className="overview"
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
        >
          <MiniMap zoomable pannable />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
      <Sidebar />
    </div>
  );
};

export default AutomationBuilder;
