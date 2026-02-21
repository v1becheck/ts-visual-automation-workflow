"use client";

import { useStore, Panel } from "@xyflow/react";
import { useMemo } from "react";

export type DragCrosshairData = {
  centerX: number;
  centerY: number;
};

type Props = {
  /** When set, draw vertical and horizontal lines through this center (flow coords). */
  drag: DragCrosshairData | null;
};

function flowToScreen(flowX: number, flowY: number, tx: number, ty: number, zoom: number) {
  return { x: flowX * zoom + tx, y: flowY * zoom + ty };
}

export default function AlignmentGuides({ drag }: Props) {
  const { transform, width, height } = useStore(
    useMemo(
      () => (s) => ({
        transform: s.transform,
        width: s.width,
        height: s.height,
      }),
      []
    )
  );

  const lineCoords = useMemo(() => {
    if (drag == null) return null;
    const [tx, ty, zoom] = transform;
    const sx = flowToScreen(drag.centerX, 0, tx, ty, zoom).x;
    const sy = flowToScreen(0, drag.centerY, tx, ty, zoom).y;
    return { verticalX: sx, horizontalY: sy };
  }, [transform, drag]);

  if (lineCoords == null) return null;

  const stroke = "var(--slate-500, #64748b)";

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
        zIndex: 10,
      }}
      className="alignment-guides-panel"
    >
      <svg
        width={width}
        height={height}
        style={{ display: "block" }}
        aria-hidden
      >
        <line
          x1={lineCoords.verticalX}
          y1={0}
          x2={lineCoords.verticalX}
          y2={height}
          stroke={stroke}
          strokeWidth={0.3}
          strokeOpacity={0.35}
          strokeDasharray="10 7"
        />
        <line
          x1={0}
          y1={lineCoords.horizontalY}
          x2={width}
          y2={lineCoords.horizontalY}
          stroke={stroke}
          strokeWidth={0.3}
          strokeOpacity={0.35}
          strokeDasharray="10 7"
        />
      </svg>
    </Panel>
  );
}
