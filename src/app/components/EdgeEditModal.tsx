"use client";

import { useEffect, useRef, useState } from "react";

export type EdgeEditModalProps = {
  isOpen: boolean;
  edgeId: string | null;
  initialLabel: string;
  onSave: (edgeId: string, label: string) => void;
  onClose: () => void;
};

export default function EdgeEditModal({
  isOpen,
  edgeId,
  initialLabel,
  onSave,
  onClose,
}: EdgeEditModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const labelStateRef = useRef(initialLabel);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      labelStateRef.current = initialLabel;
      const t = requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
      return () => cancelAnimationFrame(t);
    }
  }, [isOpen, initialLabel]);

  useEffect(() => {
    if (!isOpen && visible) {
      const t = setTimeout(() => setVisible(false), 650);
      return () => clearTimeout(t);
    }
  }, [isOpen, visible]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
    };
    // Close on keydown only (not keyup)
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!visible || !edgeId) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputRef.current?.value?.trim() ?? labelStateRef.current;
    onSave(edgeId, value);
    onClose();
  };

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className={`node-edit-modal-overlay ${isOpen ? "node-edit-modal-overlay--open" : "node-edit-modal-overlay--closing"}`}
      onMouseDown={handleOverlayMouseDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edge-edit-modal-title"
      aria-hidden={!isOpen}
    >
      <div className={`node-edit-modal ${isOpen ? "node-edit-modal--open" : "node-edit-modal--closing"}`}>
        <h2 id="edge-edit-modal-title" className="node-edit-modal-title">
          Edit edge label
        </h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="edge-edit-label" className="node-edit-modal-label">
            Label
          </label>
          <input
            ref={inputRef}
            id="edge-edit-label"
            type="text"
            className="node-edit-modal-input"
            defaultValue={initialLabel}
            placeholder="Optional label"
            onBlur={(e) => {
              labelStateRef.current = e.target.value.trim();
            }}
          />

          <div className="node-edit-modal-actions">
            <button
              type="button"
              className="node-edit-modal-btn node-edit-modal-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="node-edit-modal-btn node-edit-modal-btn-save"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
