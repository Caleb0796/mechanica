import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Fog,
  SRGBColorSpace,
  type Material,
  type Mesh,
  type Object3D,
  type Points,
  type PointLight,
} from "three";

import type { MachineModule } from "../../sim/types";
import type {
  SceneAmbientMotion,
  SceneGroundKind,
  SceneLightRig,
  SceneProp,
  SceneSpec,
} from "./types";

export const SCENERY_RAYCAST_DISABLED = () => undefined;

function sceneryUserData() {
  return { mechanicaScenery: true };
}

function markScenery(object: Object3D): void {
  object.traverse((child) => {
    child.userData.mechanicaScenery = true;
    const mesh = child as Mesh;
    if (mesh.isMesh) mesh.raycast = SCENERY_RAYCAST_DISABLED;
  });
}

function isObject3D(value: unknown): value is Object3D {
  return Boolean(
    value &&
    typeof value === "object" &&
    (value as { isObject3D?: boolean }).isObject3D,
  );
}

function GradientCyclorama({ colors }: { colors: [string, string] }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable");
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, colors[1]);
    gradient.addColorStop(1, colors[0]);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const next = new CanvasTexture(canvas);
    next.colorSpace = SRGBColorSpace;
    return next;
  }, [colors]);

  useEffect(() => () => texture.dispose(), [texture]);

  return <primitive attach="background" object={texture} />;
}

function Ground({
  floorY,
  kind,
  radius,
}: {
  floorY: number;
  kind: SceneGroundKind;
  radius: number;
}) {
  const color =
    kind === "timber-floor"
      ? "#251812"
      : kind === "rammed-earth"
        ? "#302219"
        : kind === "water"
          ? "#143f48"
          : "#282b2c";
  return (
    <mesh
      position={[0, floorY - 0.006, 0]}
      raycast={SCENERY_RAYCAST_DISABLED}
      receiveShadow
      rotation={[-Math.PI / 2, 0, 0]}
      userData={sceneryUserData()}
    >
      <circleGeometry args={[radius, 64]} />
      {kind === "water" ? (
        <meshStandardMaterial
          color={color}
          depthWrite={false}
          metalness={0.25}
          opacity={0.62}
          roughness={0.24}
          transparent
        />
      ) : (
        <meshBasicMaterial color={color} fog={false} toneMapped={false} />
      )}
    </mesh>
  );
}

function BuiltInProp({ floorY, prop }: { floorY: number; prop: SceneProp }) {
  const params = prop.params ?? {};
  const position: [number, number, number] = [
    prop.position[0],
    floorY + prop.position[1],
    prop.position[2],
  ];
  const scale = prop.scale ?? 1;

  if (prop.kind === "column") {
    const height = params.height ?? 2.3;
    const radius = params.radius ?? 0.14;
    return (
      <mesh
        position={position}
        raycast={SCENERY_RAYCAST_DISABLED}
        scale={scale}
        userData={sceneryUserData()}
      >
        <cylinderGeometry args={[radius, radius * 1.08, height, 20]} />
        <meshStandardMaterial color="#49352b" roughness={0.82} />
      </mesh>
    );
  }

  if (prop.kind === "plinth") {
    return (
      <mesh
        position={position}
        raycast={SCENERY_RAYCAST_DISABLED}
        receiveShadow
        scale={scale}
        userData={sceneryUserData()}
      >
        <boxGeometry
          args={[
            params.width ?? 1.6,
            params.height ?? 0.14,
            params.depth ?? 1.6,
          ]}
        />
        <meshStandardMaterial color="#292723" roughness={0.78} />
      </mesh>
    );
  }

  if (prop.kind === "water-channel") {
    return (
      <mesh
        position={position}
        raycast={SCENERY_RAYCAST_DISABLED}
        scale={scale}
        userData={sceneryUserData()}
      >
        <boxGeometry
          args={[params.length ?? 3, params.depth ?? 0.12, params.width ?? 0.7]}
        />
        <meshStandardMaterial
          color="#2d7885"
          depthWrite={false}
          metalness={0.2}
          opacity={0.58}
          roughness={0.2}
          transparent
        />
      </mesh>
    );
  }

  if (prop.kind === "lantern") {
    return (
      <group position={position} scale={scale} userData={sceneryUserData()}>
        <mesh raycast={SCENERY_RAYCAST_DISABLED} userData={sceneryUserData()}>
          <cylinderGeometry args={[0.13, 0.13, 0.34, 12]} />
          <meshStandardMaterial
            color="#c4853d"
            emissive="#7d3c13"
            emissiveIntensity={0.8}
            opacity={0.78}
            transparent
          />
        </mesh>
        <mesh
          position={[0, -0.22, 0]}
          raycast={SCENERY_RAYCAST_DISABLED}
          userData={sceneryUserData()}
        >
          <cylinderGeometry args={[0.08, 0.1, 0.1, 12]} />
          <meshStandardMaterial color="#35261e" roughness={0.8} />
        </mesh>
      </group>
    );
  }

  return null;
}

function CustomScenery({
  floorY,
  module,
  prop,
}: {
  floorY: number;
  module: MachineModule;
  prop: SceneProp;
}) {
  const object = useMemo(() => {
    if (!prop.builder) return null;
    const builder = module.customSceneBuilders?.[prop.builder];
    const built = builder?.(prop.params ?? {});
    return isObject3D(built) ? built : null;
  }, [module.customSceneBuilders, prop.builder, prop.params]);

  useLayoutEffect(() => {
    if (object) markScenery(object);
  }, [object]);

  if (!object) return null;
  return (
    <group
      position={[prop.position[0], floorY + prop.position[1], prop.position[2]]}
      scale={prop.scale ?? 1}
      userData={sceneryUserData()}
    >
      <primitive dispose={null} object={object} />
    </group>
  );
}

function Dust({
  floorY,
  params,
}: {
  floorY: number;
  params?: Record<string, number>;
}) {
  const points = useRef<Points>(null);
  const count = Math.min(200, Math.max(1, Math.round(params?.count ?? 70)));
  const radius = params?.radius ?? 3;
  const geometry = useMemo(() => {
    const values = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const angle = index * 2.3999632297;
      const distance = radius * Math.sqrt((index + 0.5) / count);
      values[index * 3] = Math.cos(angle) * distance;
      values[index * 3 + 1] = ((index * 37) % count) / count;
      values[index * 3 + 2] = Math.sin(angle) * distance;
    }
    const next = new BufferGeometry();
    next.setAttribute("position", new Float32BufferAttribute(values, 3));
    return next;
  }, [count, radius]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((state) => {
    if (points.current)
      points.current.rotation.y = state.clock.elapsedTime * 0.02;
  });

  return (
    <points
      geometry={geometry}
      position={[0, floorY + 0.08, 0]}
      raycast={SCENERY_RAYCAST_DISABLED}
      ref={points}
      userData={sceneryUserData()}
    >
      <pointsMaterial
        color="#d8c4a5"
        depthWrite={false}
        opacity={0.28}
        size={0.012}
        transparent
      />
    </points>
  );
}

function WaterRipple({
  floorY,
  params,
}: {
  floorY: number;
  params?: Record<string, number>;
}) {
  const mesh = useRef<Mesh>(null);
  useFrame((state) => {
    if (!mesh.current) return;
    const cycle = (state.clock.elapsedTime * 0.28) % 1;
    mesh.current.scale.setScalar(0.7 + cycle * 0.9);
    const material = mesh.current.material as Material & { opacity: number };
    material.opacity = 0.26 * (1 - cycle);
  });
  return (
    <mesh
      position={[0, floorY + 0.004, 0]}
      raycast={SCENERY_RAYCAST_DISABLED}
      ref={mesh}
      rotation={[-Math.PI / 2, 0, 0]}
      userData={sceneryUserData()}
    >
      <ringGeometry
        args={[(params?.radius ?? 0.6) * 0.82, params?.radius ?? 0.6, 48]}
      />
      <meshBasicMaterial
        color="#8ec9d0"
        depthWrite={false}
        opacity={0.2}
        transparent
      />
    </mesh>
  );
}

function LanternFlicker({ floorY }: { floorY: number }) {
  const light = useRef<PointLight>(null);
  useFrame((state) => {
    if (light.current) {
      light.current.intensity =
        0.42 + Math.sin(state.clock.elapsedTime * 5.3) * 0.04;
    }
  });
  return (
    <pointLight
      color="#ffb45f"
      distance={5}
      intensity={0.42}
      position={[0, floorY + 1.4, -1.2]}
      ref={light}
    />
  );
}

function AmbientMotion({
  floorY,
  motion,
  module,
}: {
  floorY: number;
  motion: SceneAmbientMotion;
  module: MachineModule;
}) {
  if (motion.kind === "dust") {
    return <Dust floorY={floorY} params={motion.params} />;
  }
  if (motion.kind === "water-ripple") {
    return <WaterRipple floorY={floorY} params={motion.params} />;
  }
  if (motion.kind === "lantern-flicker") {
    return <LanternFlicker floorY={floorY} />;
  }
  if (!motion.emitter) return null;
  const prop: SceneProp = {
    builder: motion.emitter,
    kind: "custom",
    params: motion.params,
    position: [0, 0, 0],
  };
  return <CustomScenery floorY={floorY} module={module} prop={prop} />;
}

function LightRig({ floorY, rig }: { floorY: number; rig: SceneLightRig }) {
  const hall = rig === "hall";
  const night = rig === "night";
  return (
    <>
      <hemisphereLight
        args={[
          night ? "#9fb9cc" : "#d7e3ef",
          hall ? "#271c17" : "#35271c",
          night ? 0.2 : hall ? 0.3 : 0.42,
        ]}
        position={[0, floorY + 3, 0]}
      />
      <directionalLight
        castShadow
        color={night ? "#ffd09a" : "#ffe1b6"}
        intensity={night ? 1.75 : hall ? 2.05 : 2.35}
        position={[3, floorY + 5, 4]}
      />
      <directionalLight
        color={night ? "#729bbb" : "#9fc7da"}
        intensity={night ? 1.05 : 0.68}
        position={[-4, floorY + 2, -3]}
      />
    </>
  );
}

export default function MachineEnvironment({
  floorY,
  module,
  scene: sceneSpec,
}: {
  floorY: number;
  module: MachineModule;
  scene: SceneSpec;
}) {
  const threeScene = useThree((state) => state.scene);
  const backdropColors = sceneSpec.backdrop?.colors ?? ["#090a0a", "#24201b"];

  useEffect(() => {
    if (!sceneSpec.fog) return;
    const previousFog = threeScene.fog;
    const fog = new Fog(
      sceneSpec.fog.color,
      sceneSpec.fog.near,
      sceneSpec.fog.far,
    );
    threeScene.fog = fog;
    return () => {
      if (threeScene.fog === fog) threeScene.fog = previousFog;
    };
  }, [sceneSpec.fog, threeScene]);

  return (
    <group name="mechanica-scenery" userData={sceneryUserData()}>
      <GradientCyclorama colors={backdropColors} />
      {sceneSpec.ground ? (
        <Ground
          floorY={floorY}
          kind={sceneSpec.ground.kind}
          radius={sceneSpec.ground.radius}
        />
      ) : null}
      <LightRig floorY={floorY} rig={sceneSpec.lightRig ?? "hall"} />
      {sceneSpec.props?.map((prop, index) =>
        prop.kind === "custom" ? (
          <CustomScenery
            floorY={floorY}
            key={`${prop.kind}:${prop.builder ?? "missing"}:${index}`}
            module={module}
            prop={prop}
          />
        ) : (
          <BuiltInProp
            floorY={floorY}
            key={`${prop.kind}:${index}`}
            prop={prop}
          />
        ),
      )}
      {sceneSpec.ambientMotion?.map((motion, index) => (
        <AmbientMotion
          floorY={floorY}
          key={`${motion.kind}:${motion.emitter ?? "built-in"}:${index}`}
          module={module}
          motion={motion}
        />
      ))}
    </group>
  );
}
