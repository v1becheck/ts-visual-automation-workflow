"use client";

import { useMemo } from "react";
import { Panel, useStore } from "@xyflow/react";
import type { Node } from "@xyflow/react";

const DEFAULT_MINIMAP_WIDTH = 200;
const DEFAULT_MINIMAP_HEIGHT = 150;
const OFFSET_SCALE = 5;
const DEFAULT_NODE_WIDTH = 140;
const DEFAULT_NODE_HEIGHT = 50;

/** Node type → fill color (matches AutomationBuilder MINIMAP_NODE_COLORS) */
const MINIMAP_NODE_COLORS: Record<string, string> = {
  input: "#0ea5e9",
  default: "#64748b",
  output: "#10b981",
  email: "#38bdf8",
  webhook: "#14b8a6",
  delay: "#f59e0b",
  condition: "#8b5cf6",
  http: "#6366f1",
  schedule: "#10b981",
  set: "#f97316",
  merge: "#d946ef",
  slack: "#f43f5e",
  code: "#64748b",
};

function getNodeColor(node: Node): string {
  const t = (node.type as string) ?? "default";
  return MINIMAP_NODE_COLORS[t] ?? MINIMAP_NODE_COLORS.default;
}

type NodeRect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

function getNodeDimensions(userNode: Node): { width: number; height: number } {
  const m = (userNode as Node & { measured?: { width?: number; height?: number } }).measured;
  const w = m?.width ?? (userNode as Node & { width?: number }).width ?? DEFAULT_NODE_WIDTH;
  const h = m?.height ?? (userNode as Node & { height?: number }).height ?? DEFAULT_NODE_HEIGHT;
  return { width: w, height: h };
}

export default function CustomMinimapWithEdges() {
  const { nodeLookup, edges, transform, width: flowWidth, height: flowHeight } = useStore(
    (s) => ({
      nodeLookup: s.nodeLookup,
      edges: s.edges,
      transform: s.transform,
      width: s.width,
      height: s.height,
    })
  );

  const { nodeRects, viewBox, maskPath, elementWidth, elementHeight } = useMemo(() => {
    const [tx, ty, zoom] = transform;
    const viewBB = {
      x: -tx / zoom,
      y: -ty / zoom,
      width: flowWidth / zoom,
      height: flowHeight / zoom,
    };

    const nodeRects: NodeRect[] = [];
    let bounds = { ...viewBB, width: viewBB.width, height: viewBB.height };

    nodeLookup.forEach((entry, id) => {
      const { internals } = entry;
      const userNode = internals.userNode as Node;
      if (userNode.hidden) return;
      const { x, y } = internals.positionAbsolute;
      const { width, height } = getNodeDimensions(userNode);
      nodeRects.push({
        id,
        x,
        y,
        width,
        height,
        color: getNodeColor(userNode),
      });
      const right = x + width;
      const bottom = y + height;
      bounds.x = Math.min(bounds.x, x);
      bounds.y = Math.min(bounds.y, y);
      const bRight = bounds.x + bounds.width;
      const bBottom = bounds.y + bounds.height;
      bounds.width = Math.max(right, bRight) - bounds.x;
      bounds.height = Math.max(bottom, bBottom) - bounds.y;
    });

    const elementWidth = DEFAULT_MINIMAP_WIDTH;
    const elementHeight = DEFAULT_MINIMAP_HEIGHT;
    const scaledWidth = bounds.width / elementWidth;
    const scaledHeight = bounds.height / elementHeight;
    const viewScale = Math.max(scaledWidth, scaledHeight, 0.01);
    const viewWidth = viewScale * elementWidth;
    const viewHeight = viewScale * elementHeight;
    const offset = OFFSET_SCALE * viewScale;
    const vx = bounds.x - (viewWidth - bounds.width) / 2 - offset;
    const vy = bounds.y - (viewHeight - bounds.height) / 2 - offset;
    const vw = viewWidth + offset * 2;
    const vh = viewHeight + offset * 2;
    const viewBox = `${vx} ${vy} ${vw} ${vh}`;
    const maskPath =
      `M ${vx - offset} ${vy - offset} h ${vw + offset * 2} v ${vh + offset * 2} h ${-vw - offset * 2} z ` +
      `M ${viewBB.x} ${viewBB.y} h ${viewBB.width} v ${viewBB.height} h ${-viewBB.width} z`;

    return {
      nodeRects,
      viewBox,
      maskPath,
      elementWidth,
      elementHeight,
    };
  }, [nodeLookup, transform, flowWidth, flowHeight]);

  const edgePaths = useMemo(() => {
    const rectMap = new Map(
      nodeRects.map((r) => [
        r.id,
        {
          cx: r.x + r.width / 2,
          cy: r.y + r.height / 2,
        },
      ])
    );
    return edges
      .filter((e) => rectMap.has(e.source) && rectMap.has(e.target))
      .map((e) => {
        const a = rectMap.get(e.source)!;
        const b = rectMap.get(e.target)!;
        return `M ${a.cx} ${a.cy} L ${b.cx} ${b.cy}`;
      });
  }, [nodeRects, edges]);

  return (
    <Panel
      position="bottom-right"
      style={{ width: elementWidth, height: elementHeight }}
      className="react-flow__minimap automation-minimap"
      data-testid="rf__minimap"
    >
      <svg
        width={elementWidth}
        height={elementHeight}
        viewBox={viewBox}
        className="react-flow__minimap-svg"
        role="img"
        aria-label="Workflow overview"
      >
        <title>Workflow overview</title>
        {/* Edges (connectors) in flow coordinates */}
        <g className="react-flow__minimap-edges" stroke="var(--slate-500)" strokeWidth={1} fill="none">
          {edgePaths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        {/* Nodes */}
        <g className="react-flow__minimap-nodes">
          {nodeRects.map((r) => (
            <rect
              key={r.id}
              x={r.x}
              y={r.y}
              width={r.width}
              height={r.height}
              rx={4}
              ry={4}
              fill={r.color}
              stroke={r.color}
              strokeWidth={1}
            />
          ))}
        </g>
        {/* Viewport mask (outer rect then viewport cutout) */}
        <path
          className="react-flow__minimap-mask"
          d={maskPath}
          fillRule="evenodd"
          pointerEvents="none"
        />
      </svg>
    </Panel>
  );
}
