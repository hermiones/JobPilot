"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  Icosahedron,
  Torus,
  Dodecahedron,
  Octahedron,
  TorusKnot,
  Sparkles,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import type { Group, Mesh } from "three";
import * as THREE from "three";
import { getAppTheme, THEME_EVENT, THEME_3D_PALETTES, type ThemeId } from "@/lib/theme";

type ShapeKind = "ico" | "torus" | "dodec" | "octa" | "knot";

function Shape({
  position,
  color,
  kind,
  scale = 1,
  speed = 1,
  wireframe = false,
}: {
  position: [number, number, number];
  color: string;
  kind: ShapeKind;
  scale?: number;
  speed?: number;
  wireframe?: boolean;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.15 * speed;
      ref.current.rotation.y += delta * 0.22 * speed;
    }
  });
  const material = wireframe ? (
    <meshBasicMaterial color={color} wireframe transparent opacity={0.5} />
  ) : (
    <meshStandardMaterial
      color={color}
      roughness={0.25}
      metalness={0.7}
      emissive={color}
      emissiveIntensity={0.35}
      transparent
      opacity={0.7}
    />
  );
  return (
    <Float
      speed={1.2 * speed}
      rotationIntensity={0.7}
      floatIntensity={1.8}
      floatingRange={[-0.5, 0.5]}
    >
      {kind === "ico" && (
        <Icosahedron ref={ref} args={[1, 0]} position={position} scale={scale}>
          {material}
        </Icosahedron>
      )}
      {kind === "torus" && (
        <Torus ref={ref} args={[0.8, 0.3, 16, 40]} position={position} scale={scale}>
          {material}
        </Torus>
      )}
      {kind === "dodec" && (
        <Dodecahedron ref={ref} args={[1, 0]} position={position} scale={scale}>
          {material}
        </Dodecahedron>
      )}
      {kind === "octa" && (
        <Octahedron ref={ref} args={[1, 0]} position={position} scale={scale}>
          {material}
        </Octahedron>
      )}
      {kind === "knot" && (
        <TorusKnot ref={ref} args={[0.6, 0.18, 100, 16]} position={position} scale={scale}>
          {material}
        </TorusKnot>
      )}
    </Float>
  );
}

// Rotates gently on its own, and eases toward the pointer position for a
// subtle parallax effect — the whole scene tilts a little as you move the mouse.
function Rig({ children }: { children: React.ReactNode }) {
  const group = useRef<Group>(null);
  const target = useRef({ x: 0, y: 0 });

  useFrame(({ clock, pointer }) => {
    if (!group.current) return;
    target.current.x = THREE.MathUtils.lerp(target.current.x, pointer.y * 0.2, 0.03);
    target.current.y = THREE.MathUtils.lerp(target.current.y, pointer.x * 0.3, 0.03);

    group.current.rotation.x = target.current.x;
    group.current.rotation.y =
      Math.sin(clock.elapsedTime * 0.08) * 0.15 + target.current.y;
  });

  return <group ref={group}>{children}</group>;
}

// Shape layout (position/kind/scale/speed/wireframe) stays fixed — only the
// color per shape changes with the selected theme, cycling through that
// theme's palette (see THEME_3D_PALETTES in src/lib/theme.ts).
const SHAPE_LAYOUT = [
  { position: [-4.5, 2, -2], kind: "ico", scale: 1.2, speed: 0.9 },
  { position: [4.5, -1.5, -1], kind: "torus", scale: 1, speed: 1.1 },
  { position: [-3.5, -2.8, -3], kind: "dodec", scale: 0.9, speed: 0.8 },
  { position: [4, 2.8, -4], kind: "ico", scale: 0.75, speed: 1.3 },
  { position: [0, 0.3, -6.5], kind: "dodec", scale: 1.7, speed: 0.6 },
  { position: [-5.5, 0, -5], kind: "torus", scale: 0.7, speed: 1.2 },
  { position: [2, -3, -2.5], kind: "octa", scale: 0.8, speed: 1 },
  { position: [-2, 3.2, -3.5], kind: "knot", scale: 0.7, speed: 0.7 },
  { position: [5.5, 0.5, -6], kind: "octa", scale: 0.6, speed: 1.4 },
  { position: [-1, -1.5, -1.5], kind: "ico", scale: 0.45, speed: 1.6, wireframe: true },
  { position: [1.5, 3.5, -2], kind: "octa", scale: 0.4, speed: 1.8, wireframe: true },
  { position: [-6, -1.5, -2], kind: "ico", scale: 0.55, speed: 1.1, wireframe: true },
  { position: [6, -2.5, -3], kind: "torus", scale: 0.5, speed: 1.5, wireframe: true },
] as const;

export function Background3D() {
  const [theme, setTheme] = useState<ThemeId>("default");

  useEffect(() => {
    setTheme(getAppTheme());
    const onChange = (e: Event) => setTheme((e as CustomEvent<ThemeId>).detail);
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  const palette = THEME_3D_PALETTES[theme] ?? THEME_3D_PALETTES.default;

  const shapes = useMemo(
    () =>
      SHAPE_LAYOUT.map((s, i) => ({
        ...s,
        color: palette.colors[i % palette.colors.length],
      })),
    [palette]
  );

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none opacity-80 dark:opacity-70"
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1.1} />
        <pointLight position={[-5, -5, 2]} intensity={1} color={palette.light1} />
        <pointLight position={[5, 4, -2]} intensity={0.7} color={palette.light2} />
        <Rig>
          {shapes.map((s, i) => (
            <Shape
              key={i}
              position={s.position as [number, number, number]}
              color={s.color}
              kind={s.kind}
              scale={s.scale}
              speed={s.speed}
              wireframe={"wireframe" in s ? s.wireframe : false}
            />
          ))}
          <Sparkles
            count={80}
            scale={[16, 10, 10]}
            size={2.5}
            speed={0.3}
            opacity={0.6}
            color={palette.sparkle}
          />
        </Rig>
        <EffectComposer>
          <Bloom
            intensity={palette.glowIntensity}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.15} darkness={0.6} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
