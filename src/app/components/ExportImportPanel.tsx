"use client";

import { useRef } from "react";
import { Panel } from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import { exportWorkflow, parseWorkflowFile } from "../lib/workflowExport";
import "./styles.css";

const DEFAULT_FILENAME = "workflow.json";

type Props = {
  nodes: Node[];
  edges: Edge[];
  onImport: (nodes: Node[], edges: Edge[]) => void;
  /** Export current workflow view as PNG. Fits view to nodes first. */
  onExportPng?: () => void | Promise<void>;
  /** When true, render only the content (no Panel). Use inside a shared Panel. */
  embedded?: boolean;
};

export default function ExportImportPanel({ nodes, edges, onImport, onExportPng, embedded }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = exportWorkflow(nodes, edges);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = DEFAULT_FILENAME;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      if (typeof text !== "string") return;
      const result = parseWorkflowFile(text);
      if (result.ok) {
        onImport(result.nodes, result.edges);
      } else {
        window.alert(`Import failed: ${result.error}`);
      }
    };
    reader.readAsText(file);
  };

  const content = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="export-import-panel__input"
        aria-hidden
        onChange={handleFileChange}
      />
      <div className="export-import-panel__buttons">
        <button
          type="button"
          className="export-import-panel__btn"
          onClick={handleExport}
          title="Download workflow as JSON"
          aria-label="Export workflow"
        >
          Export
        </button>
        <button
          type="button"
          className="export-import-panel__btn"
          onClick={handleImportClick}
          title="Load workflow from JSON file"
          aria-label="Import workflow"
        >
          Import
        </button>
        {onExportPng && (
          <button
            type="button"
            className="export-import-panel__btn"
            onClick={() => void onExportPng()}
            title="Export workflow as PNG image (fits view to nodes)"
            aria-label="Export workflow as PNG"
          >
            Export PNG
          </button>
        )}
      </div>
    </>
  );

  if (embedded) {
    return <div className="export-import-panel">{content}</div>;
  }

  return (
    <Panel position="top-left" className="export-import-panel">
      {content}
    </Panel>
  );
}
