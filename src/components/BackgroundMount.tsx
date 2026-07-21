"use client";

import dynamic from "next/dynamic";

// WebGL can't render on the server, so load the 3D scene client-side only.
const Background3D = dynamic(
  () => import("@/components/Background3D").then((m) => m.Background3D),
  { ssr: false }
);

export function BackgroundMount() {
  return <Background3D />;
}
