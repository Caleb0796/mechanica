import { useFrame, useThree } from "@react-three/fiber";
import { useRef, type MutableRefObject, type ReactNode } from "react";
import type { Group, Mesh, MeshBasicMaterial } from "three";

import {
  sampleTremorDisplacement,
  TREMOR_DURATION_SECONDS,
  type ExploreTremor,
} from "./exploreTremor";

export interface ExploreTremorRun {
  input: ExploreTremor;
  elapsed: number;
}

/** Display feedback moves the ground and its contents, never the camera or
 * stored part placements. Joint motion remains sourced from the mechanism. */
export default function ExploreTremorEffects({
  tremor,
  floorY,
  children,
}: {
  tremor: MutableRefObject<ExploreTremorRun | null>;
  floorY: number;
  children: ReactNode;
}) {
  const ground = useRef<Group>(null);
  const waves = useRef<(Mesh | null)[]>([]);
  const { gl } = useThree();
  useFrame(() => {
    const run = tremor.current;
    const displacement = run
      ? sampleTremorDisplacement(run.input, run.elapsed)
      : ([0, 0, 0] as const);
    ground.current?.position.set(
      displacement[0],
      displacement[1],
      displacement[2],
    );
    gl.domElement.dataset.groundDisplacement = displacement.join(",");
    for (const [index, wave] of waves.current.entries()) {
      if (!wave) continue;
      const progress = run
        ? (run.elapsed - index * 0.25) / TREMOR_DURATION_SECONDS
        : -1;
      wave.visible = progress >= 0 && progress < 1;
      if (!run || !wave.visible) continue;
      wave.scale.setScalar(1.25 + progress * (1.8 + run.input.strength));
      (wave.material as MeshBasicMaterial).opacity =
        (0.12 + run.input.strength * 0.2) * (1 - progress) ** 2;
    }
  }, -1.5);

  return (
    <group ref={ground}>
      {children}
      {[0, 1].map((index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            waves.current[index] = mesh;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, floorY + 0.008 + index * 0.001, 0]}
          visible={false}
          userData={{ mechanicaAffordance: true }}
          raycast={() => undefined}
        >
          <ringGeometry args={[0.99, 1, 96]} />
          <meshBasicMaterial
            color="#d9b86d"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
