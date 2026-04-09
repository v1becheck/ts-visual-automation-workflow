"use client";

import { useEffect } from "react";
import "./styles.css";

export type FirstRunModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function FirstRunModal({ isOpen, onClose }: FirstRunModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape" || e.key === "Enter") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="first-run-modal-overlay first-run-modal-overlay--open"
      onMouseDown={handleOverlayMouseDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-run-modal-title"
      aria-describedby="first-run-modal-desc"
    >
      <div className="first-run-modal first-run-modal--open">
        <h2 id="first-run-modal-title" className="first-run-modal-title">
          Welcome to Workflow Builder
        </h2>
        <p id="first-run-modal-desc" className="first-run-modal-desc">
          Quick start:
        </p>
        <ol className="first-run-modal-list">
          <li>Drag a node from the sidebar onto the canvas.</li>
          <li>Connect node handles to build your workflow path.</li>
          <li>Click nodes/edges to edit labels and settings.</li>
          <li>Use Save (Ctrl+S), Validate, and Run Simulation to test.</li>
        </ol>
        <p className="first-run-modal-note">
          Tip: open keyboard shortcuts anytime with Ctrl+/.
        </p>
        <div className="first-run-modal-actions">
          <button
            type="button"
            className="first-run-modal-btn first-run-modal-btn-primary"
            onClick={onClose}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
