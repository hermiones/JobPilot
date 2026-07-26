// Client-only preference for the animated 3D background. Stored in
// localStorage (not the DB) since it's a per-device rendering preference,
// not account data — instant to read/toggle with no network round trip.
export const BG3D_STORAGE_KEY = "jobpilot:bg3d-enabled";
export const BG3D_EVENT = "jobpilot:bg3d-changed";

// Off by default — a plain, distraction-free UI is the baseline; the 3D
// scene is an opt-in flourish via the header's theme picker or Profile.
export function getBg3dEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(BG3D_STORAGE_KEY);
  return stored === "1";
}

export function setBg3dEnabled(enabled: boolean) {
  window.localStorage.setItem(BG3D_STORAGE_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new CustomEvent(BG3D_EVENT, { detail: enabled }));
}
