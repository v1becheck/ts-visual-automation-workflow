"use client";

import { useEffect, useRef, useState } from "react";

export type NodeTypeOption = "input" | "default" | "output" | "email";

export const NODE_TYPE_OPTIONS: { value: NodeTypeOption; label: string }[] = [
  { value: "input", label: "Input" },
  { value: "default", label: "Default" },
  { value: "output", label: "Output" },
  { value: "email", label: "Email" },
];

export type NodeEditModalProps = {
  isOpen: boolean;
  nodeId: string | null;
  initialLabel: string;
  initialType: NodeTypeOption;
  onSave: (nodeId: string, label: string, type: NodeTypeOption) => void;
  onClose: () => void;
};

export default function NodeEditModal({
  isOpen,
  nodeId,
  initialLabel,
  initialType,
  onSave,
  onClose,
}: NodeEditModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const labelStateRef = useRef(initialLabel);
  const [selectedType, setSelectedType] = useState<NodeTypeOption>(initialType);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      labelStateRef.current = initialLabel;
      setSelectedType(initialType);
      const t = requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
      return () => cancelAnimationFrame(t);
    }
  }, [isOpen, initialLabel, initialType]);

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
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!visible || !nodeId) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputRef.current?.value?.trim() ?? labelStateRef.current;
    if (value) {
      onSave(nodeId, value, selectedType);
      onClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className={`node-edit-modal-overlay ${isOpen ? "node-edit-modal-overlay--open" : "node-edit-modal-overlay--closing"}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="node-edit-modal-title"
      aria-hidden={!isOpen}
    >
      <div className={`node-edit-modal ${isOpen ? "node-edit-modal--open" : "node-edit-modal--closing"}`}>
        <h2 id="node-edit-modal-title" className="node-edit-modal-title">
          Edit node
        </h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="node-edit-label" className="node-edit-modal-label">
            Name / Label
          </label>
          <input
            ref={inputRef}
            id="node-edit-label"
            type="text"
            className="node-edit-modal-input"
            defaultValue={initialLabel}
            placeholder="Enter node name"
            onBlur={(e) => {
              labelStateRef.current = e.target.value.trim();
            }}
            aria-required="true"
          />

          <label className="node-edit-modal-label">Type / Color</label>
          <div className="node-edit-modal-type-options" role="group">
            {NODE_TYPE_OPTIONS.map(({ value, label }) => (
              <label
                key={value}
                className={`node-edit-modal-type-option node-edit-modal-type-option--${value}`}
              >
                <input
                  type="radio"
                  name="node-type"
                  value={value}
                  checked={selectedType === value}
                  onChange={() => setSelectedType(value)}
                  className="node-edit-modal-type-radio"
                />
                <span className="node-edit-modal-type-swatch" />
                <span className="node-edit-modal-type-label">{label}</span>
              </label>
            ))}
          </div>

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
