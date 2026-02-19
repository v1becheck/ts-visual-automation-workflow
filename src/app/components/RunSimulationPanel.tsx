"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Node, Edge } from "@xyflow/react";
import { runSimulation, type SimulationResult } from "../lib/runSimulation";

function getNodeLabel(nodes: Node[], id: string): string {
  const node = nodes.find((n) => n.id === id);
  return (node?.data as { label?: string })?.label ?? id;
}

type Props = {
  nodes: Node[];
  edges: Edge[];
  valid: boolean;
  onHighlightNodes?: (nodeIds: string[]) => void;
  /** When true, render only the content (no wrapper). */
  embedded?: boolean;
};

export default function RunSimulationPanel({
  nodes,
  edges,
  valid,
  onHighlightNodes,
  embedded,
}: Props) {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const el = panelRef.current;
      if (el && e.target instanceof Element && !el.contains(e.target)) {
        setResult(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [result]);

  const handleRun = useCallback(() => {
    const sim = runSimulation(
      nodes.map((n) => ({ id: n.id })),
      edges.map((e) => ({ source: e.source, target: e.target }))
    );
    setResult(sim);
    if (sim.success && sim.order.length > 0 && onHighlightNodes) {
      onHighlightNodes(sim.order);
    }
  }, [nodes, edges, onHighlightNodes]);

  const content = (
    <div ref={panelRef} className="run-simulation-panel">
      <div className="run-simulation-panel__row">
        <button
          type="button"
          className="run-simulation-panel__btn"
          onClick={handleRun}
          disabled={nodes.length === 0}
          title="Simulate execution order (trigger → output). No real actions run."
          aria-label="Run simulation"
        >
          Run simulation
        </button>
      </div>
      {result && (
        <div
          className={`run-simulation-panel__result ${
            result.success ? "run-simulation-panel__result--success" : "run-simulation-panel__result--error"
          }`}
        >
          {result.success ? (
            <>
              {result.steps.length === 0 ? (
                <p className="run-simulation-panel__empty">No nodes to run. Add triggers and connect the flow.</p>
              ) : (
                <>
                  <p className="run-simulation-panel__title">Execution order (dry run)</p>
                  <ol className="run-simulation-panel__steps">
                    {result.steps.map((step) => (
                      <li key={step.stepIndex} className="run-simulation-panel__step">
                        <span className="run-simulation-panel__step-num">Step {step.stepIndex + 1}</span>
                        <span className="run-simulation-panel__step-nodes">
                          {step.nodeIds.map((id) => getNodeLabel(nodes, id)).join(" → ")}
                        </span>
                      </li>
                    ))}
                  </ol>
                  {result.unreachableNodeIds.length > 0 && (
                    <p className="run-simulation-panel__unreachable">
                      Not run (no path from triggers):{" "}
                      {result.unreachableNodeIds.map((id) => getNodeLabel(nodes, id)).join(", ")}
                    </p>
                  )}
                </>
              )}
            </>
          ) : (
            <p className="run-simulation-panel__error">{result.error}</p>
          )}
        </div>
      )}
      {!valid && !result && (
        <p className="run-simulation-panel__hint">Fix validation issues (e.g. cycles) to simulate.</p>
      )}
    </div>
  );

  if (embedded) return content;
  return <div className="run-simulation-panel__wrap">{content}</div>;
}
