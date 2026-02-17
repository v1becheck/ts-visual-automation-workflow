import { Edge, Node } from "@xyflow/react";

export const initialNodes: Node[] = [
  {
    id: "1",
    position: { x: 0, y: 0 },
    data: { label: "Node 1" },
    type: "input",
  },
  {
    id: "2",
    position: { x: 0, y: 100 },
    data: { label: "Node 2" },
  },
  {
    id: "3",
    position: { x: 200, y: 100 },
    data: { label: "Node 3" },
    type: "output",
  },
];

export const initialEdges: Edge[] = [{ id: "e1-2", source: "1", target: "2" }];
