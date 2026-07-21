"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  Icosahedron,
  Torus,
  Dodecahedron,
  Octahedron,
  TorusKnot,
} from "@react-three/drei";
import type { Group, Mesh } from "three";
import * as THREE from "three";

type ShapeKind = "ico" | "torus" | "dodec" | "octa" | "knot";

function Shape({
  position,
  color,
  kind,
  scale = 1,
  speed = 1,
}: {
  position: [number, number, number];
  color: string;
  kind: ShapeKind;
  scale?: number;
  speed?: number;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.15 * speed;
      ref.current.rotation.y += delta * 0.22 * speed;
    }
  });
  const material = (
    <meshStandardMaterial
      color={color}
      roughness={0.3}
      metalness={0.65}
      transparent
      opacity={0.6}
    />
  );
  return (
    <Float
      speed={1.2 * speed}
      rotationIntensity={0.7}
      floatIntensity={1.6}
      floatingRange={[-0.4, 0.4]}
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
    target.current.x = THREE.MathUtils.lerp(target.current.x, pointer.y * 0.18, 0.03);
    target.current.y = THREE.MathUtils.lerp(target.current.y, pointer.x * 0.25, 0.03);

    group.current.rotation.x = target.current.x;
    group.current.rotation.y =
      Math.sin(clock.elapsedTime * 0.08) * 0.15 + target.current.y;
  });

  return <group ref={group}>{children}</group>;
}

export function Background3D() {
  const shapes = useMemo(
    () =>
      [
        { position: [-4.5, 2, -2], color: "#6366f1", kind: "ico", scale: 1.2, speed: 0.9 },
        { position: [4.5, -1.5, -1], color: "#8b5cf6", kind: "torus", scale: 1, speed: 1.1 },
        { position: [-3.5, -2.8, -3], color: "#38bdf8", kind: "dodec", scale: 0.9, speed: 0.8 },
        { position: [4, 2.8, -4], color: "#a78bfa", kind: "ico", scale: 0.75, speed: 1.3 },
        { position: [0, 0.3, -6.5], color: "#4f46e5", kind: "dodec", scale: 1.7, speed: 0.6 },
        { position: [-5.5, 0, -5], color: "#22d3ee", kind: "torus", scale: 0.7, speed: 1.2 },
        { position: [2, -3, -2.5], color: "#c084fc", kind: "octa", scale: 0.8, speed: 1 },
        { position: [-2, 3.2, -3.5], color: "#818cf8", kind: "knot", scale: 0.7, speed: 0.7 },
        { position: [5.5, 0.5, -6], color: "#67e8f9", kind: "octa", scale: 0.6, speed: 1.4 },
        { position: [-1, -1.5, -1.5], color: "#a5b4fc", kind: "ico", scale: 0.45, speed: 1.6 },
      ] as const,
    []
  );

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none opacity-70 dark:opacity-60"
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <pointLight position={[-5, -5, 2]} intensity={0.9} color="#8b5cf6" />
        <pointLight position={[5, 4, -2]} intensity={0.6} color="#22d3ee" />
        <Rig>
          {shapes.map((s, i) => (
            <Shape
              key={i}
              position={s.position as [number, number, number]}
              color={s.color}
              kind={s.kind}
              scale={s.scale}
              speed={s.speed}
            />
          ))}
        </Rig>
      </Canvas>
    </div>
  );
}
