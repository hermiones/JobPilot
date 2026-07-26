"use client";

import { useEffect } from "react";

// Access tokens are short-lived (1 hour) so a stolen one has a small window
// of usefulness — this silently rotates it via the long-lived, revocable
// refresh token every 20 minutes while the app is open, so an active user
// never notices the short expiry as a forced logout.
const REFRESH_INTERVAL_MS = 20 * 60 * 1000;

export function SessionRefresher() {
  useEffect(() => {
    const tick = () => {
      fetch("/api/auth/refresh", { method: "POST" }).catch(() => {
        /* if this fails, the next protected navigation will redirect to /login as normal */
      });
    };
    const id = setInterval(tick, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
  return null;
}
