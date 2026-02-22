"use client";

import { useToast } from "../contexts/ToastContext";
import "./styles.css";

function ToastIcon({ variant }: { variant: "success" | "error" | "info" }) {
  if (variant === "success") {
    return (
      <span className="toast__icon toast__icon--success" aria-hidden>
        ✓
      </span>
    );
  }
  if (variant === "error") {
    return (
      <span className="toast__icon toast__icon--error" aria-hidden>
        ✕
      </span>
    );
  }
  return (
    <span className="toast__icon toast__icon--info" aria-hidden>
      i
    </span>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast--${t.variant}`}
          role="status"
          aria-live="polite"
        >
          <ToastIcon variant={t.variant} />
          <p className="toast__message">{t.message}</p>
          <button
            type="button"
            className="toast__dismiss"
            onClick={() => removeToast(t.id)}
            aria-label="Dismiss notification"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
      ))}
    </div>
  );
}
