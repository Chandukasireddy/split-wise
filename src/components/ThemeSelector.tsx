"use client";

import React, { useSyncExternalStore } from "react";
import { Sun, Moon, Laptop, Check } from "lucide-react";
import { useTheme, Theme } from "./ThemeProvider";

interface ThemeOption {
  id: Theme;
  label: string;
  description: string;
  icon: React.ElementType;
}

const themeOptions: ThemeOption[] = [
  {
    id: "light",
    label: "Bright",
    description: "Crisp, clean light theme",
    icon: Sun,
  },
  {
    id: "dark",
    label: "Dark",
    description: "True Black OLED theme",
    icon: Moon,
  },
  {
    id: "system",
    label: "System",
    description: "Follows your device preference",
    icon: Laptop,
  },
];

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <div style={styles.grid}>
        {themeOptions.map((opt) => (
          <div key={opt.id} style={styles.card}>
            <div style={styles.cardContent}>
              <opt.icon size={20} color="var(--text-muted)" />
              <div>
                <div style={styles.label}>{opt.label}</div>
                <div style={styles.description}>{opt.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={styles.grid}>
      {themeOptions.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.id;

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            style={{
              ...styles.card,
              ...(isSelected ? styles.cardSelected : {}),
            }}
          >
            <div style={styles.cardContent}>
              <div
                style={{
                  ...styles.iconBox,
                  ...(isSelected ? styles.iconBoxSelected : {}),
                }}
              >
                <Icon
                  size={19}
                  color={
                    isSelected
                      ? "var(--primary)"
                      : opt.id === "light"
                      ? "#F59E0B"
                      : "var(--text-secondary)"
                  }
                />
              </div>
              <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                <div style={styles.label}>{opt.label}</div>
                <div style={styles.description}>{opt.description}</div>
              </div>
            </div>

            <div
              style={{
                ...styles.checkCircle,
                ...(isSelected ? styles.checkCircleSelected : {}),
              }}
            >
              {isSelected && <Check size={13} strokeWidth={3} color="#fff" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
    width: "100%",
  },
  card: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.85rem 1rem",
    borderRadius: "14px",
    background: "var(--surface-hover)",
    border: "1.5px solid var(--border-light)",
    cursor: "pointer",
    transition: "all 0.15s ease",
    width: "100%",
  },
  cardSelected: {
    borderColor: "var(--primary)",
    background: "rgba(16, 185, 129, 0.08)",
  },
  cardContent: {
    display: "flex",
    alignItems: "center",
    gap: "0.85rem",
    minWidth: 0,
    flex: 1,
  },
  iconBox: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    background: "var(--surface)",
    border: "1px solid var(--border-light)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconBoxSelected: {
    borderColor: "rgba(16, 185, 129, 0.3)",
    background: "rgba(16, 185, 129, 0.12)",
  },
  label: {
    fontSize: "0.92rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  description: {
    fontSize: "0.76rem",
    color: "var(--text-secondary)",
    marginTop: "0.1rem",
  },
  checkCircle: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    border: "1.5px solid var(--border-light)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginLeft: "0.5rem",
    transition: "all 0.15s ease",
  },
  checkCircleSelected: {
    background: "var(--primary)",
    borderColor: "var(--primary)",
  },
};

