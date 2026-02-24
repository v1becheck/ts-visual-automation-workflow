"use client";

import { useEffect } from "react";
import "./styles.css";

export type DeleteWorkflowModalProps = {
  isOpen: boolean;
  workflowName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function DeleteWorkflowModal({
  isOpen,
  workflowName,
  onConfirm,
  onCancel,
}: DeleteWorkflowModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div
      className={`delete-workflow-modal-overlay ${isOpen ? "delete-workflow-modal-overlay--open" : "delete-workflow-modal-overlay--closing"}`}
      onMouseDown={handleOverlayMouseDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-workflow-modal-title"
      aria-describedby="delete-workflow-modal-desc"
    >
      <div
        className={`delete-workflow-modal ${isOpen ? "delete-workflow-modal--open" : "delete-workflow-modal--closing"}`}
      >
        <h2 id="delete-workflow-modal-title" className="delete-workflow-modal-title">
          Delete workflow
        </h2>
        <p id="delete-workflow-modal-desc" className="delete-workflow-modal-desc">
          Delete &quot;{workflowName}&quot;? This cannot be undone.
        </p>
        <div className="delete-workflow-modal-actions">
          <button
            type="button"
            id="delete-workflow-confirm-btn"
            className="delete-workflow-modal-btn delete-workflow-modal-btn-delete"
            onClick={onConfirm}
          >
            Delete
          </button>
          <button
            type="button"
            className="delete-workflow-modal-btn delete-workflow-modal-btn-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
