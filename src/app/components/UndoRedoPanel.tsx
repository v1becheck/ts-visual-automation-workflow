"use client";

import { Panel } from "@xyflow/react";

type Props = {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

export default function UndoRedoPanel({ undo, redo, canUndo, canRedo }: Props) {
  return (
    <Panel position="top-center" className="undo-redo-panel">
      <div className="undo-redo-panel__buttons">
        <button
          type="button"
          className="undo-redo-panel__btn"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          Undo
        </button>
        <button
          type="button"
          className="undo-redo-panel__btn"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          Redo
        </button>
      </div>
    </Panel>
  );
}
