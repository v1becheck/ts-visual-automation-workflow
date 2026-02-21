"use client";

import { useStore, Panel } from "@xyflow/react";
import { useMemo } from "react";
import type { Node } from "@xyflow/react";

export type DragCrosshairData = {
  centerX: number;
  centerY: number;
};

type Props = {
  /** When set, draw vertical and horizontal lines through this center (flow coords). */
  drag: DragCrosshairData | null;
};

const DEFAULT_NODE_WIDTH = 140;
const DEFAULT_NODE_HEIGHT = 50;

function flowToScreen(flowX: number, flowY: number, tx: number, ty: number, zoom: number) {
  return { x: flowX * zoom + tx, y: flowY * zoom + ty };
}

/** Use positionAbsolute when available so rect matches where React Flow actually renders the node (and handles). */
function getNodeScreenRect(
  node: Node,
  tx: number,
  ty: number,
  zoom: number,
  nodeLookup?: Map<string, {
    measured?: { width?: number; height?: number };
    internals?: { positionAbsolute?: { x: number; y: number }; measured?: { width?: number; height?: number } };
  }>
) {
  const internal = nodeLookup?.get(node.id);
  const m = internal?.measured ?? internal?.internals?.measured;
  const w = m?.width ?? (node as Node & { width?: number }).width ?? DEFAULT_NODE_WIDTH;
  const h = m?.height ?? (node as Node & { height?: number }).height ?? DEFAULT_NODE_HEIGHT;
  const posAbsolute = internal?.internals?.positionAbsolute;
  const flowX = posAbsolute != null ? posAbsolute.x : node.position.x;
  const flowY = posAbsolute != null ? posAbsolute.y : node.position.y;
  const left = flowToScreen(flowX, 0, tx, ty, zoom).x;
  const top = flowToScreen(0, flowY, tx, ty, zoom).y;
  return { left, top, right: left + w * zoom, bottom: top + h * zoom };
}

/** Build [start, end] y-segments for the vertical line at x, skipping nodes that contain x. */
function verticalSegments(
  x: number,
  nodes: Node[],
  nodeLookup: Map<string, { measured?: { width?: number; height?: number }; internals?: { positionAbsolute?: { x: number; y: number }; measured?: { width?: number; height?: number } } }> | undefined,
  tx: number,
  ty: number,
  zoom: number,
  height: number
): [number, number][] {
  const blocks = nodes
    .map((n) => getNodeScreenRect(n, tx, ty, zoom, nodeLookup))
    .filter((r) => x >= r.left && x <= r.right)
    .map((r) => [r.top, r.bottom] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [top, bottom] of blocks) {
    if (merged.length > 0 && top <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], bottom);
    } else {
      merged.push([top, bottom]);
    }
  }
  const out: [number, number][] = [];
  let y = 0;
  for (const [t, b] of merged) {
    if (y < t) out.push([y, t]);
    y = Math.max(y, b);
  }
  if (y < height) out.push([y, height]);
  return out;
}

/** Build [start, end] x-segments for the horizontal line at y, skipping nodes that contain y. */
function horizontalSegments(
  y: number,
  nodes: Node[],
  nodeLookup: Map<string, { measured?: { width?: number; height?: number }; internals?: { positionAbsolute?: { x: number; y: number }; measured?: { width?: number; height?: number } } }> | undefined,
  tx: number,
  ty: number,
  zoom: number,
  width: number
): [number, number][] {
  const blocks = nodes
    .map((n) => getNodeScreenRect(n, tx, ty, zoom, nodeLookup))
    .filter((r) => y >= r.top && y <= r.bottom)
    .map((r) => [r.left, r.right] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [left, right] of blocks) {
    if (merged.length > 0 && left <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], right);
    } else {
      merged.push([left, right]);
    }
  }
  const out: [number, number][] = [];
  let x = 0;
  for (const [l, r] of merged) {
    if (x < l) out.push([x, l]);
    x = Math.max(x, r);
  }
  if (x < width) out.push([x, width]);
  return out;
}

export default function AlignmentGuides({ drag }: Props) {
  const { transform, width, height, nodes, nodeLookup } = useStore(
    useMemo(
      () => (s: { transform: number[]; width: number; height: number; nodes: Node[]; nodeLookup: Map<string, unknown> }) => ({
        transform: s.transform,
        width: s.width,
        height: s.height,
        nodes: s.nodes,
        nodeLookup: s.nodeLookup as Map<string, {
          measured?: { width?: number; height?: number };
          internals?: { positionAbsolute?: { x: number; y: number }; measured?: { width?: number; height?: number } };
        }>,
      }),
      []
    )
  );

  const lineData = useMemo(() => {
    if (drag == null) return null;
    const [tx, ty, zoom] = transform;
    const verticalX = flowToScreen(drag.centerX, 0, tx, ty, zoom).x;
    const horizontalY = flowToScreen(0, drag.centerY, tx, ty, zoom).y;
    const vertSegs = verticalSegments(verticalX, nodes, nodeLookup, tx, ty, zoom, height);
    const horizSegs = horizontalSegments(horizontalY, nodes, nodeLookup, tx, ty, zoom, width);
    return { verticalX, horizontalY, vertSegs, horizSegs };
  }, [transform, drag, nodes, nodeLookup, width, height]);

  if (lineData == null) return null;

  const stroke = "var(--slate-500, #64748b)";
  const lineProps = { stroke, strokeWidth: 0.3, strokeOpacity: 0.9, strokeDasharray: "10 7" };

  return (
    <Panel
      position="top-left"
      style={{
        width: width,
        height: height,
        left: 0,
        top: 0,
        margin: 0,
        padding: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
      className="alignment-guides-panel"
    >
      <svg width={width} height={height} style={{ display: "block" }} aria-hidden>
        {lineData.vertSegs.map(([y1, y2], i) => (
          <line
            key={`v-${i}`}
            x1={lineData.verticalX}
            y1={y1}
            x2={lineData.verticalX}
            y2={y2}
            {...lineProps}
          />
        ))}
        {lineData.horizSegs.map(([x1, x2], i) => (
          <line
            key={`h-${i}`}
            x1={x1}
            y1={lineData.horizontalY}
            x2={x2}
            y2={lineData.horizontalY}
            {...lineProps}
          />
        ))}
      </svg>
    </Panel>
  );
}
