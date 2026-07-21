import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Fog,
  SRGBColorSpace,
  type Material,
  type Group,
  type Mesh,
  type Object3D,
  type Points,
  type PointLight,
} from "three";

import type { MachineModule } from "../../sim/types";
import { QUAKE_PAYOFF_EVENT } from "./types";
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

function BalustradeArc({
  position,
  scale,
  params,
}: {
  position: [number, number, number];
  scale: number;
  params: Record<string, number>;
}) {
  const radius = params.radius ?? 3.8;
  const posts = Math.min(18, Math.max(7, Math.round(params.posts ?? 13)));
  const arc = params.arc ?? Math.PI * 1.15;
  const closed = Math.abs(arc - Math.PI * 2) < 1e-6;
  return (
    <group position={position} scale={scale} userData={sceneryUserData()}>
      {Array.from({ length: posts }, (_, index) => {
        const angle = -arc / 2 + (arc * index) / (closed ? posts : posts - 1);
        return (
          <mesh
            key={index}
            position={[
              Math.sin(angle) * radius,
              0.42,
              -Math.cos(angle) * radius,
            ]}
            raycast={SCENERY_RAYCAST_DISABLED}
            userData={sceneryUserData()}
          >
            <cylinderGeometry args={[0.055, 0.065, 0.84, 8]} />
            <meshStandardMaterial color="#493328" roughness={0.86} />
          </mesh>
        );
      })}
      {[0.3, 0.72].map((height) => (
        <mesh
          key={height}
          position={[0, height, 0]}
          raycast={SCENERY_RAYCAST_DISABLED}
          rotation={[Math.PI / 2, 0, 0]}
          userData={sceneryUserData()}
        >
          <torusGeometry args={[radius, 0.035, 6, 32, arc]} />
          <meshStandardMaterial color="#573a2b" roughness={0.82} />
        </mesh>
      ))}
    </group>
  );
}

function Brazier({
  position,
  scale,
  phase,
}: {
  position: [number, number, number];
  scale: number;
  phase: number;
}) {
  const light = useRef<PointLight>(null);
  useFrame((state) => {
    if (light.current) {
      light.current.intensity =
        0.7 + Math.sin(state.clock.elapsedTime * 6.1 + phase) * 0.12;
    }
  });
  return (
    <group position={position} scale={scale} userData={sceneryUserData()}>
      <mesh
        position={[0, 0.56, 0]}
        raycast={SCENERY_RAYCAST_DISABLED}
        userData={sceneryUserData()}
      >
        <cylinderGeometry args={[0.25, 0.16, 0.14, 12, 1, true]} />
        <meshStandardMaterial
          color="#6c4228"
          metalness={0.72}
          roughness={0.4}
        />
      </mesh>
      {[-1, 0, 1].map((leg) => {
        const angle = (leg * Math.PI * 2) / 3;
        return (
          <mesh
            key={leg}
            position={[Math.sin(angle) * 0.13, 0.27, Math.cos(angle) * 0.13]}
            raycast={SCENERY_RAYCAST_DISABLED}
            rotation={[Math.sin(angle) * 0.18, 0, Math.cos(angle) * 0.18]}
            userData={sceneryUserData()}
          >
            <cylinderGeometry args={[0.025, 0.035, 0.5, 6]} />
            <meshStandardMaterial
              color="#4a3024"
              metalness={0.55}
              roughness={0.5}
            />
          </mesh>
        );
      })}
      {[-0.09, 0, 0.09].map((offset, index) => (
        <mesh
          key={offset}
          position={[offset, 0.61 + (index % 2) * 0.025, 0]}
          raycast={SCENERY_RAYCAST_DISABLED}
          userData={sceneryUserData()}
        >
          <sphereGeometry args={[0.075, 8, 6]} />
          <meshStandardMaterial
            color="#db6b2d"
            emissive="#a8380f"
            emissiveIntensity={1.2}
            roughness={0.72}
          />
        </mesh>
      ))}
      <pointLight
        color="#ff9a45"
        distance={4.5}
        intensity={0.7}
        position={[0, 0.82, 0]}
        ref={light}
      />
    </group>
  );
}

function RoadStrip({
  position,
  scale,
  params,
}: {
  position: [number, number, number];
  scale: number;
  params: Record<string, number>;
}) {
  const length = params.length ?? 12;
  const width = params.width ?? 4.6;
  const rutOffset = params.rutOffset ?? 1.15;
  return (
    <group position={position} scale={scale} userData={sceneryUserData()}>
      <mesh
        position={[0, 0.01, 0]}
        raycast={SCENERY_RAYCAST_DISABLED}
        receiveShadow
        userData={sceneryUserData()}
      >
        <boxGeometry args={[width, 0.025, length]} />
        <meshStandardMaterial color="#806346" roughness={0.96} />
      </mesh>
      {[-rutOffset, rutOffset].map((x) => (
        <mesh
          key={x}
          position={[x, 0.026, 0]}
          raycast={SCENERY_RAYCAST_DISABLED}
          userData={sceneryUserData()}
        >
          <boxGeometry args={[0.18, 0.018, length * 0.95]} />
          <meshBasicMaterial color="#4b392b" />
        </mesh>
      ))}
    </group>
  );
}

function Milestone({
  position,
  scale,
}: {
  position: [number, number, number];
  scale: number;
}) {
  return (
    <group position={position} scale={scale} userData={sceneryUserData()}>
      <mesh
        position={[0, 0.45, 0]}
        raycast={SCENERY_RAYCAST_DISABLED}
        userData={sceneryUserData()}
      >
        <boxGeometry args={[0.35, 0.9, 0.3]} />
        <meshStandardMaterial color="#777169" roughness={0.92} />
      </mesh>
      <mesh
        position={[0, 0.98, 0]}
        raycast={SCENERY_RAYCAST_DISABLED}
        rotation={[0, Math.PI / 4, 0]}
        userData={sceneryUserData()}
      >
        <coneGeometry args={[0.27, 0.2, 4]} />
        <meshStandardMaterial color="#625d57" roughness={0.94} />
      </mesh>
    </group>
  );
}

function BannerPole({
  position,
  scale,
  phase,
}: {
  position: [number, number, number];
  scale: number;
  phase: number;
}) {
  const pennant = useRef<Group>(null);
  useFrame((state) => {
    if (pennant.current) {
      pennant.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.8 + phase) * 0.035;
    }
  });
  return (
    <group position={position} scale={scale} userData={sceneryUserData()}>
      <mesh
        position={[0, 1.6, 0]}
        raycast={SCENERY_RAYCAST_DISABLED}
        userData={sceneryUserData()}
      >
        <cylinderGeometry args={[0.035, 0.045, 3.2, 8]} />
        <meshStandardMaterial color="#4b3024" roughness={0.8} />
      </mesh>
      <group position={[0, 2.55, 0]} ref={pennant} userData={sceneryUserData()}>
        <mesh
          position={[0.52, 0, 0]}
          raycast={SCENERY_RAYCAST_DISABLED}
          userData={sceneryUserData()}
        >
          <planeGeometry args={[1.05, 0.62, 4, 2]} />
          <meshStandardMaterial
            color="#8f2f27"
            metalness={0.02}
            roughness={0.74}
            side={2}
          />
        </mesh>
      </group>
    </group>
  );
}

function Workbench({
  position,
  scale,
}: {
  position: [number, number, number];
  scale: number;
}) {
  return (
    <group position={position} scale={scale} userData={sceneryUserData()}>
      <mesh
        position={[0, 0.72, 0]}
        raycast={SCENERY_RAYCAST_DISABLED}
        userData={sceneryUserData()}
      >
        <boxGeometry args={[1.45, 0.12, 0.55]} />
        <meshStandardMaterial color="#503425" roughness={0.82} />
      </mesh>
      {[-0.58, 0.58].flatMap((x) =>
        [-0.18, 0.18].map((z) => (
          <mesh
            key={`${x}:${z}`}
            position={[x, 0.35, z]}
            raycast={SCENERY_RAYCAST_DISABLED}
            userData={sceneryUserData()}
          >
            <boxGeometry args={[0.1, 0.7, 0.1]} />
            <meshStandardMaterial color="#432b20" roughness={0.86} />
          </mesh>
        )),
      )}
      {[-0.42, -0.14, 0.16, 0.43].map((x, index) => (
        <mesh
          key={x}
          position={[x, 0.89, 0]}
          raycast={SCENERY_RAYCAST_DISABLED}
          rotation={[Math.PI / 2, 0, 0]}
          userData={sceneryUserData()}
        >
          <cylinderGeometry args={[0.09, 0.09, 0.24, 10]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? "#a33e32" : "#c89a4e"}
            roughness={0.58}
          />
        </mesh>
      ))}
    </group>
  );
}

function SilkSwatch({
  position,
  scale,
}: {
  position: [number, number, number];
  scale: number;
}) {
  const hanging = useRef<Group>(null);
  useFrame((state) => {
    if (hanging.current) {
      hanging.current.rotation.z =
        Math.sin(state.clock.elapsedTime * 0.45) * 0.01;
    }
  });
  return (
    <group position={position} scale={scale} userData={sceneryUserData()}>
      <mesh
        raycast={SCENERY_RAYCAST_DISABLED}
        rotation={[0, 0, Math.PI / 2]}
        userData={sceneryUserData()}
      >
        <cylinderGeometry args={[0.055, 0.055, 1.35, 10]} />
        <meshStandardMaterial color="#513427" roughness={0.84} />
      </mesh>
      <group
        position={[0, -0.55, 0]}
        ref={hanging}
        userData={sceneryUserData()}
      >
        <mesh raycast={SCENERY_RAYCAST_DISABLED} userData={sceneryUserData()}>
          <planeGeometry args={[1.25, 1.1, 8, 4]} />
          <meshStandardMaterial
            color="#9c332d"
            metalness={0.02}
            roughness={0.5}
            side={2}
          />
        </mesh>
      </group>
    </group>
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

  if (prop.kind === "balustrade-arc") {
    return <BalustradeArc params={params} position={position} scale={scale} />;
  }

  if (prop.kind === "brazier") {
    return (
      <Brazier phase={params.phase ?? 0} position={position} scale={scale} />
    );
  }

  if (prop.kind === "road-strip") {
    return <RoadStrip params={params} position={position} scale={scale} />;
  }

  if (prop.kind === "milestone") {
    return <Milestone position={position} scale={scale} />;
  }

  if (prop.kind === "banner-pole") {
    return (
      <BannerPole phase={params.phase ?? 0} position={position} scale={scale} />
    );
  }

  if (prop.kind === "workbench") {
    return <Workbench position={position} scale={scale} />;
  }

  if (prop.kind === "silk-swatch") {
    return <SilkSwatch position={position} scale={scale} />;
  }

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

function QuakeShockwave({ floorY }: { floorY: number }) {
  const group = useRef<Group>(null);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    const pulse = (event: Event) => {
      if (!group.current) return;
      const bearing =
        (event as CustomEvent<{ bearing?: number }>).detail?.bearing ?? 6;
      const angle = (bearing * Math.PI) / 4;
      group.current.position.set(
        Math.sin(angle) * 3.1,
        floorY + 0.018,
        -Math.cos(angle) * 3.1,
      );
      group.current.visible = true;
      startedAt.current = performance.now();
    };
    window.addEventListener(QUAKE_PAYOFF_EVENT, pulse);
    return () => window.removeEventListener(QUAKE_PAYOFF_EVENT, pulse);
  }, [floorY]);

  useFrame(() => {
    if (!group.current || startedAt.current === null) return;
    const progress = Math.min(1, (performance.now() - startedAt.current) / 950);
    group.current.scale.setScalar(0.35 + progress * 3.6);
    const ring = group.current.children[0] as Mesh;
    const material = ring.material as Material & { opacity: number };
    material.opacity = 0.72 * (1 - progress);
    if (progress === 1) {
      group.current.visible = false;
      startedAt.current = null;
    }
  });

  return (
    <group ref={group} userData={sceneryUserData()} visible={false}>
      <mesh
        raycast={SCENERY_RAYCAST_DISABLED}
        rotation={[-Math.PI / 2, 0, 0]}
        userData={sceneryUserData()}
      >
        <ringGeometry args={[0.34, 0.42, 48]} />
        <meshBasicMaterial
          color="#d59e4c"
          depthWrite={false}
          opacity={0}
          transparent
        />
      </mesh>
    </group>
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
  if (motion.kind === "quake-shockwave") {
    return <QuakeShockwave floorY={floorY} />;
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
  const duskWest = rig === "dusk-west";
  return (
    <>
      <hemisphereLight
        args={[
          night || duskWest ? "#9fb9cc" : "#d7e3ef",
          hall ? "#271c17" : "#35271c",
          night ? 0.2 : duskWest ? 0.28 : hall ? 0.3 : 0.42,
        ]}
        position={[0, floorY + 3, 0]}
      />
      <directionalLight
        castShadow
        color={night || duskWest ? "#ffbd74" : "#ffe1b6"}
        intensity={night ? 1.75 : duskWest ? 2.1 : hall ? 2.05 : 2.35}
        position={duskWest ? [-4.5, floorY + 2.4, 1.5] : [3, floorY + 5, 4]}
      />
      <directionalLight
        color={night ? "#729bbb" : "#9fc7da"}
        intensity={night ? 1.05 : duskWest ? 0.9 : 0.68}
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
