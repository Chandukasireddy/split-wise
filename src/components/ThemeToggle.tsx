"use client";

import React, { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

interface ThemeToggleProps {
  style?: React.CSSProperties;
  className?: string;
}

export default function ThemeToggle({ style, className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <button
        type="button"
        style={{ ...styles.toggleBtn, ...style }}
        aria-label="Toggle theme"
        disabled
      >
        <span style={{ width: 18, height: 18 }} />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  function handleToggle() {
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={className}
      style={{ ...styles.toggleBtn, ...style }}
      title={isDark ? "Switch to Bright mode" : "Switch to Dark mode"}
      aria-label={isDark ? "Switch to Bright mode" : "Switch to Dark mode"}
    >
      {isDark ? (
        <Sun size={17} color="#FBBF24" style={styles.icon} />
      ) : (
        <Moon size={17} color="var(--text-secondary)" style={styles.icon} />
      )}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toggleBtn: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    background: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    flexShrink: 0,
    padding: 0,
  },
  icon: {
    transition: "transform 0.25s ease",
  },
};

