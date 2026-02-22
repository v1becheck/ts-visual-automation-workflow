"use client";

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type ToastVariant = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
  createdAt: number;
};

type ToastContextType = {
  toasts: ToastItem[];
  addToast: (message: string, variant?: ToastVariant) => void;
  removeToast: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `toast-${idCounter}-${Date.now()}`;
}

const AUTO_DISMISS_MS = 4500;

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = nextId();
      const item: ToastItem = { id, message, variant, createdAt: Date.now() };
      setToasts((prev) => [...prev, item]);
      const t = setTimeout(() => {
        removeToast(id);
      }, AUTO_DISMISS_MS);
      return () => clearTimeout(t);
    },
    [removeToast]
  );

  const success = useCallback((message: string) => addToast(message, "success"), [addToast]);
  const error = useCallback((message: string) => addToast(message, "error"), [addToast]);
  const info = useCallback((message: string) => addToast(message, "info"), [addToast]);

  const value = useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      success,
      error,
      info,
    }),
    [toasts, addToast, removeToast, success, error, info]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
