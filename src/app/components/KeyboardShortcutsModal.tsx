"use client";

import { useEffect } from "react";

const SHORTCUTS: { action: string; keys: string }[] = [
  { action: "Undo", keys: "Ctrl+Z" },
  { action: "Redo", keys: "Ctrl+Shift+Z or Ctrl+Y" },
  { action: "Save workflow", keys: "Ctrl+S" },
  { action: "Copy selected nodes", keys: "Ctrl+C" },
  { action: "Paste nodes", keys: "Ctrl+V" },
  { action: "Duplicate selected nodes", keys: "Ctrl+D" },
  { action: "Select multiple", keys: "Shift+drag (box), Shift+click (add)" },
  { action: "Move canvas (pan)", keys: "Hold Space + left mouse drag" },
  { action: "Delete node or connection", keys: "Ctrl+Click, Delete or Backspace" },
  { action: "Close modal / Deselect all", keys: "Escape" },
  { action: "Edit selected node", keys: "Enter" },
  { action: "Edit edge label", keys: "Double-click edge or select edge + Enter" },
  { action: "Fit view", keys: "Ctrl+0" },
  { action: "Open this shortcuts help", keys: "Ctrl+/" },
];

const isMac =
  typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

function formatKeys(keys: string): string {
  if (isMac) {
    return keys
      .replace(/\bCtrl\b/g, "⌘")
      .replace(/\bShift\b/g, "⇧")
      .replace(/\bAlt\b/g, "⌥")
      .replace(/\bBackspace\b/g, "⌫")
      .replace(/\bDelete\b/g, "⌦")
      .replace(/\bEnter\b/g, "↵");
  }
  return keys;
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function KeyboardShortcutsModal({ isOpen, onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="node-edit-modal-overlay node-edit-modal-overlay--open"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
    >
      <div
        className="node-edit-modal node-edit-modal--open keyboard-shortcuts-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="keyboard-shortcuts-title" className="keyboard-shortcuts-modal__title">
          Keyboard shortcuts
        </h2>
        <p className="keyboard-shortcuts-modal__hint">
          {isMac ? "Use ⌘ for Command on Mac." : "Use Ctrl on Windows/Linux."}
        </p>
        <table className="keyboard-shortcuts-modal__table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Shortcut</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map(({ action, keys }) => (
              <tr key={action}>
                <td>{action}</td>
                <td>
                  <kbd className="keyboard-shortcuts-modal__kbd">
                    {formatKeys(keys)}
                  </kbd>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="keyboard-shortcuts-modal__actions">
          <button
            type="button"
            className="node-edit-modal-btn node-edit-modal-btn-save"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
