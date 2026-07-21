"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { BG3D_EVENT, getBg3dEnabled } from "@/lib/bg3dPref";

// WebGL can't render on the server, so load the 3D scene client-side only.
const Background3D = dynamic(
  () => import("@/components/Background3D").then((m) => m.Background3D),
  { ssr: false }
);

export function BackgroundMount() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(getBg3dEnabled());
    const onChange = (e: Event) =>
      setEnabled((e as CustomEvent<boolean>).detail);
    window.addEventListener(BG3D_EVENT, onChange);
    return () => window.removeEventListener(BG3D_EVENT, onChange);
  }, []);

  if (!enabled) return null;
  return <Background3D />;
}
