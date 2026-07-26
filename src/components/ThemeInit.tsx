"use client";

import { useEffect } from "react";
import { getAppTheme, THEME_EVENT, type ThemeId } from "@/lib/theme";

// Themes that should always render dark regardless of OS setting.
const ALWAYS_DARK: ThemeId[] = ["dark", "neon"];
// Themes that should always render light regardless of OS setting.
const ALWAYS_LIGHT: ThemeId[] = ["light", "comfort", "kawaii", "formal"];

function applyTheme(theme: ThemeId) {
  const root = document.documentElement;
  root.setAttribute("data-app-theme", theme);

  if (ALWAYS_DARK.includes(theme)) {
    root.classList.add("dark");
  } else if (ALWAYS_LIGHT.includes(theme)) {
    root.classList.remove("dark");
  } else {
    // "default" (System/Auto) — follow the OS preference.
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
}

// Applies the persisted theme to <html> on every page load (including
// login/register, where NavBar isn't mounted), and keeps "System (Auto)" in
// sync if the OS preference changes while the tab is open. A brief flash of
// the default theme is possible before hydration — acceptable tradeoff for
// keeping this dependency-free.
export function ThemeInit() {
  useEffect(() => {
    applyTheme(getAppTheme());

    const onThemeChange = (e: Event) => applyTheme((e as CustomEvent<ThemeId>).detail);
    window.addEventListener(THEME_EVENT, onThemeChange);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = () => {
      if (getAppTheme() === "default") applyTheme("default");
    };
    media.addEventListener("change", onMediaChange);

    return () => {
      window.removeEventListener(THEME_EVENT, onThemeChange);
      media.removeEventListener("change", onMediaChange);
    };
  }, []);
  return null;
}
