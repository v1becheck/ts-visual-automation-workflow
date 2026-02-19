"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel, useStore, useReactFlow } from "@xyflow/react";
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
  const { setViewport, zoomIn, zoomOut } = useReactFlow();
  const { nodeLookup, edges, transform, width: flowWidth, height: flowHeight, minZoom, maxZoom } =
    useStore((s) => ({
      nodeLookup: s.nodeLookup,
      edges: s.edges,
      transform: s.transform,
      width: s.width,
      height: s.height,
      minZoom: s.minZoom,
      maxZoom: s.maxZoom,
    }));

  const zoom = transform[2];
  const minZoomReached = zoom <= minZoom;
  const maxZoomReached = zoom >= maxZoom;

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  const { nodeRects, viewBox, maskPath, elementWidth, elementHeight, flowScaleX, flowScaleY } =
    useMemo(() => {
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
    const flowScaleX = vw / elementWidth;
    const flowScaleY = vh / elementHeight;

    return {
      nodeRects,
      viewBox,
      maskPath,
      elementWidth,
      elementHeight,
      flowScaleX,
      flowScaleY,
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

  const svgRef = useRef<SVGSVGElement>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const [tx, ty] = transform;
      panStartRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        vx: tx,
        vy: ty,
      };
      setIsPanning(true);
      svg.setPointerCapture(e.pointerId);
    },
    [transform]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = panStartRef.current;
      if (!start) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = e.clientX - rect.left - start.x;
      const dy = e.clientY - rect.top - start.y;
      const flowDx = dx * flowScaleX;
      const flowDy = dy * flowScaleY;
      setViewport({
        x: start.vx - flowDx,
        y: start.vy - flowDy,
        zoom: transform[2],
      });
    },
    [flowScaleX, flowScaleY, transform, setViewport]
  );

  const handlePointerUp = useCallback(() => {
    panStartRef.current = null;
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY === 0) return;
      if (e.deltaY < 0 && !maxZoomReached) {
        zoomIn({ duration: 150 });
      } else if (e.deltaY > 0 && !minZoomReached) {
        zoomOut({ duration: 150 });
      }
    },
    [zoomIn, zoomOut, minZoomReached, maxZoomReached]
  );

  const svgWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = svgWrapRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  return (
    <Panel
      position="bottom-right"
      className="react-flow__minimap automation-minimap"
      data-testid="rf__minimap"
    >
      <div className="automation-minimap__wrap">
        <div className="automation-minimap__zoom">
          <button
            type="button"
            className="automation-minimap__zoom-btn"
            onClick={() => zoomIn({ duration: 200 })}
            disabled={maxZoomReached}
            title="Zoom in"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="automation-minimap__zoom-btn"
            onClick={() => zoomOut({ duration: 200 })}
            disabled={minZoomReached}
            title="Zoom out"
            aria-label="Zoom out"
          >
            −
          </button>
        </div>
        <div
          ref={svgWrapRef}
          className="automation-minimap__svg-wrap"
          style={{ width: elementWidth, height: elementHeight }}
        >
      <svg
        ref={svgRef}
        width={elementWidth}
        height={elementHeight}
        viewBox={viewBox}
        className="react-flow__minimap-svg"
        role="img"
        aria-label="Workflow overview. Drag to pan the canvas."
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
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
        </div>
      </div>
    </Panel>
  );
}
