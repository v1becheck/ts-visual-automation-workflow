"use client";

import { useTheme } from "../contexts/ThemeContext";
import "./styles.css";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="theme-toggle__icon theme-toggle__icon--sun" aria-hidden>
        ☀
      </span>
      <span className="theme-toggle__icon theme-toggle__icon--moon" aria-hidden>
        ☽
      </span>
    </button>
  );
}
