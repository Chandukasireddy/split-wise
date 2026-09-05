"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

const STORAGE_KEY = "spliteasy-theme";

function getInitialTheme(): Theme {
  if (typeof window !== "undefined") {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
        return savedTheme;
      }
    } catch {
      // localStorage may be unavailable in restricted environments
    }
  }
  return "system";
}

function getInitialResolved(theme: Theme): ResolvedTheme {
  if (typeof window !== "undefined") {
    if (theme === "dark") return "dark";
    if (theme === "light") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => getInitialResolved(theme));

  // Compute resolved theme & apply data-theme attribute
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      let active: ResolvedTheme = "light";
      if (theme === "dark") {
        active = "dark";
      } else if (theme === "light") {
        active = "light";
      } else {
        active = mediaQuery.matches ? "dark" : "light";
      }

      setResolvedTheme(active);
      document.documentElement.setAttribute("data-theme", active);
      document.documentElement.style.colorScheme = active;
    }

    applyTheme();

    function handleChange() {
      if (theme === "system") {
        applyTheme();
      }
    }

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  function setTheme(newTheme: Theme) {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // ignore
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

