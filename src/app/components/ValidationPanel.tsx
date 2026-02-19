"use client";

import { Panel } from "@xyflow/react";
import type { ValidationResult } from "../lib/workflowValidation";
import type { Node } from "@xyflow/react";

type Props = {
  result: ValidationResult;
  nodes: Node[];
  /** When true, render only the content (no Panel). Use inside a shared Panel. */
  embedded?: boolean;
};

function getNodeLabel(nodes: Node[], id: string): string {
  const node = nodes.find((n) => n.id === id);
  const label = (node?.data as { label?: string })?.label;
  return label || id;
}

export default function ValidationPanel({ result, nodes, embedded }: Props) {
  const hasIssues = !result.valid;

  const content = (
    <div className={`validation-panel__content ${hasIssues ? "validation-panel__content--invalid" : ""}`}>
        {result.valid ? (
          <p className="validation-panel__status validation-panel__status--valid">
            <span className="validation-panel__icon" aria-hidden>✓</span>
            Workflow valid
          </p>
        ) : (
          <div className="validation-panel__issues">
            <p className="validation-panel__status validation-panel__status--invalid">
              <span className="validation-panel__icon" aria-hidden>!</span>
              Validation issues
            </p>
            {result.cycles.length > 0 && (
              <div className="validation-panel__section">
                <strong>Cycles</strong>
                <ul className="validation-panel__list">
                  {result.cycles.map((cycle, i) => (
                    <li key={i}>
                      {cycle.map((id, j) => (
                        <span key={id}>
                          {j > 0 && " → "}
                          {getNodeLabel(nodes, id)}
                        </span>
                      ))}
                      {cycle.length > 1 && " → …"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.orphanedNodeIds.length > 0 && (
              <div className="validation-panel__section">
                <strong>Orphaned nodes</strong>
                <ul className="validation-panel__list">
                  {result.orphanedNodeIds.map((id) => (
                    <li key={id}>{getNodeLabel(nodes, id)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
  );

  if (embedded) {
    return <div className="validation-panel">{content}</div>;
  }

  return (
    <Panel position="top-left" className="validation-panel">
      {content}
    </Panel>
  );
}
