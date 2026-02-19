"use client";

import { Panel } from "@xyflow/react";

type Props = {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** When true, render only the content (no Panel) for use inside a parent Panel. */
  embedded?: boolean;
};

export default function UndoRedoPanel({ undo, redo, canUndo, canRedo, embedded }: Props) {
  const content = (
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
  );
  if (embedded) {
    return <div className="undo-redo-panel">{content}</div>;
  }
  return (
    <Panel position="top-center" className="undo-redo-panel">
      {content}
    </Panel>
  );
}
