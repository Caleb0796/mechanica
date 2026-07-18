import {
  Bounds,
  ContactShadows,
  OrbitControls,
  useBounds,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box3,
  type BufferGeometry,
  type Group,
  type InstancedMesh,
  type Material,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";

import { standardMaterial } from "../../core/materials";
import {
  applyMechanicaInstanceMatrices,
  buildPartGeometry,
  getMechanicaInstanceMatrices,
} from "../../core/primitives";
import { planarCrankRodPose } from "../../sim/edges";
import {
  applySchemePatch,
  attitudeQuaternion,
  KinematicGraph,
} from "../../sim/graph";
import type {
  IKinematicGraph,
  MachineModule,
  MachineSpec,
  PartDef,
  SolveResult,
} from "../../sim/types";
import GalleryPanel from "../panels/GalleryPanel";
import PartInspector from "../panels/PartInspector";
import SchemeSwitcher from "../panels/SchemeSwitcher";
import { useUiStore } from "../store";
import DriveHandle from "./DriveHandle";
import ExplodedControl from "./ExplodedControl";

declare global {
  interface Window {
    __mech?: {
      graph: IKinematicGraph;
      module: MachineModule;
      spec: MachineModule["spec"];
    };
    __mechExplodeSpread?: () => number;
    __mechSelect?: (partId: string) => void;
  }
}

export interface MachineViewerProps {
  module: MachineModule;
  schemeId?: string;
}

interface PartNodeProps {
  assemblyProgress: number;
  childrenByParent: Map<string, PartDef[]>;
  crankByRod: Map<string, CrankConstraint>;
  displayState: { current: Record<string, number> | null };
  explode: number;
  graph: IKinematicGraph;
  maxAssemblyStep: number;
  module: MachineModule;
  onDraggingChange: (dragging: boolean) => void;
  onDrivePart: (partId: string, delta: number) => void;
  part: PartDef;
  partsById: Map<string, PartDef>;
  schemeId?: string;
  spotlightActive: boolean;
  spotlightPartIds: string[];
}

type CrankConstraint = Extract<
  MachineSpec["constraints"][number],
  { type: "crank" }
>;

const TYPECASE_PROCESS_STEPS = [
  {
    label: { zh: "拣取活字", en: "Pick type" },
    quote: "左右俱可推轉摘字",
    source: "nongshu-zaolun",
  },
  {
    label: { zh: "排入铁范", en: "Set the forme" },
    quote: "以一鐵範置鐵板上，乃密布字印",
    source: "mengxi-bisheng",
  },
  {
    label: { zh: "加热药层", en: "Heat the resin" },
    quote: "持就火煬之，藥稍鎔",
    source: "mengxi-bisheng",
  },
  {
    label: { zh: "压平字面", en: "Press flat" },
    quote: "以一平板按其面，則字平如砥",
    source: "mengxi-bisheng",
  },
  {
    label: { zh: "交替印刷", en: "Print" },
    quote: "一板印刷，一板已自布字",
    source: "mengxi-bisheng",
  },
] as const;

function SpotlightRig({
  active,
  runId,
  targetPartId,
}: {
  active: boolean;
  runId: number;
  targetPartId?: string;
}) {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const startedAt = useRef(0);
  const startPosition = useRef(new Vector3());
  const endPosition = useRef(new Vector3());
  const startQuaternion = useRef(new Quaternion());
  const endQuaternion = useRef(new Quaternion());

  useEffect(() => {
    if (!active) return;
    const targetObject = targetPartId
      ? scene.getObjectByName(targetPartId)
      : undefined;
    if (!targetObject) return;
    const target = targetObject.getWorldPosition(new Vector3());
    const size = new Box3()
      .setFromObject(targetObject)
      .getSize(new Vector3())
      .length();
    const direction = camera.getWorldDirection(new Vector3()).normalize();
    startedAt.current = performance.now();
    startPosition.current.copy(camera.position);
    startQuaternion.current.copy(camera.quaternion);
    if (targetPartId === "lower-figure") {
      endPosition.current
        .copy(target)
        .add(new Vector3(size * 0.8, size * 1.5, size * 4));
    } else {
      endPosition.current
        .copy(target)
        .addScaledVector(
          direction,
          -Math.max(size * 3, camera.position.distanceTo(target) * 0.45),
        );
    }
    endQuaternion.current.setFromRotationMatrix(
      new Matrix4().lookAt(endPosition.current, target, camera.up),
    );
  }, [active, camera, runId, scene, targetPartId]);

  useFrame(() => {
    if (!active || !targetPartId) return;
    const progress = Math.min(
      1,
      (performance.now() - startedAt.current) / 1800,
    );
    const eased = 1 - (1 - progress) ** 3;
    camera.position.lerpVectors(
      startPosition.current,
      endPosition.current,
      eased,
    );
    camera.quaternion.slerpQuaternions(
      startQuaternion.current,
      endQuaternion.current,
      eased,
    );
  });

  return null;
}

function BoundsRefit({ active, spec }: { active: boolean; spec: MachineSpec }) {
  const bounds = useBounds();

  useLayoutEffect(() => {
    if (!active) bounds.refresh().fit().clip();
  }, [active, bounds, spec]);

  return null;
}

function radialExplodeVector(part: PartDef) {
  if (part.explodeVector) return new Vector3(...part.explodeVector);
  const radial = new Vector3(...part.position);
  if (radial.lengthSq() < 0.0001) radial.set(0, 1, 0);
  return radial.normalize().multiplyScalar(0.25);
}

function PartNode({
  assemblyProgress,
  childrenByParent,
  crankByRod,
  displayState,
  explode,
  graph,
  maxAssemblyStep,
  module,
  onDraggingChange,
  onDrivePart,
  part,
  partsById,
  schemeId,
  spotlightActive,
  spotlightPartIds,
}: PartNodeProps) {
  const group = useRef<Group>(null);
  const instancedMesh = useRef<InstancedMesh>(null);
  const setSelectedPartId = useUiStore((state) => state.setSelectedPartId);
  const geometry = useMemo(
    () => buildPartGeometry(part.geometry, module.customBuilders),
    [module.customBuilders, part.geometry],
  );
  const material = useMemo<Material>(() => {
    const nextMaterial = standardMaterial(part.material);
    const materialOverride = geometry.userData.mechanicaMaterial as
      | {
          color?: string;
          metalness?: number;
          opacity?: number;
          roughness?: number;
          transparent?: boolean;
        }
      | undefined;
    if (materialOverride && nextMaterial instanceof MeshStandardMaterial) {
      if (materialOverride.color) {
        nextMaterial.color.set(materialOverride.color);
      }
      if (Number.isFinite(materialOverride.metalness)) {
        nextMaterial.metalness = materialOverride.metalness!;
      }
      if (Number.isFinite(materialOverride.roughness)) {
        nextMaterial.roughness = materialOverride.roughness!;
      }
      if (Number.isFinite(materialOverride.opacity)) {
        nextMaterial.opacity = materialOverride.opacity!;
      }
      if (typeof materialOverride.transparent === "boolean") {
        nextMaterial.transparent = materialOverride.transparent;
      }
    }
    const schemeHighlighted = part.schemeTags?.includes(schemeId ?? "");
    const spotlightHighlighted =
      spotlightActive && spotlightPartIds.includes(part.id);
    const highlighted = schemeHighlighted || spotlightHighlighted;
    if (highlighted && nextMaterial instanceof MeshStandardMaterial) {
      nextMaterial.emissive.set("#6e4e18");
      nextMaterial.emissiveIntensity = spotlightHighlighted ? 1.4 : 0.65;
    }
    return nextMaterial;
  }, [
    part.id,
    part.material,
    part.schemeTags,
    geometry,
    schemeId,
    spotlightActive,
    spotlightPartIds,
  ]);
  const instanceMatrices = useMemo(
    () => getMechanicaInstanceMatrices(geometry),
    [geometry],
  );
  const explodeVector = useMemo(() => radialExplodeVector(part), [part]);
  const axis = useMemo(
    () => new Vector3(...(part.joint?.axis ?? [0, 0, 1])).normalize(),
    [part.joint?.axis],
  );
  const basePosition = useMemo(
    () => new Vector3(...part.position),
    [part.position],
  );
  const baseRotation = part.rotationEuler ?? [0, 0, 0];
  const assemblyStep = part.assemblyStep ?? 0;
  const visibleStep = Math.floor(
    assemblyProgress * Math.max(maxAssemblyStep, 1),
  );
  const visible = assemblyStep <= visibleStep;
  const childParts = childrenByParent.get(part.id) ?? [];

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useLayoutEffect(() => {
    if (!instancedMesh.current || !instanceMatrices) return;
    applyMechanicaInstanceMatrices(instancedMesh.current, instanceMatrices);
  }, [instanceMatrices]);

  useFrame(() => {
    if (!group.current) return;
    const state = displayState.current ?? graph.state();
    const crank = crankByRod.get(part.id);
    const wheel = crank ? partsById.get(crank.wheel) : undefined;
    if (crank && wheel) {
      const pose = planarCrankRodPose(
        state[crank.wheel] ?? 0,
        wheel.position,
        crank.crankRadius,
        crank.rodLength,
      );
      group.current.position
        .set(...pose.center)
        .addScaledVector(explodeVector, explode);
      group.current.rotation.set(0, 0, pose.rotationZ);
      return;
    }
    const value = state[part.id] ?? 0;
    const geometryUpdate = geometry.userData.mechanicaUpdate;
    const geometryAnimation = geometry.userData.mechanicaAnimation as
      { currentStateRad?: number } | undefined;
    if (
      typeof geometryUpdate === "function" &&
      geometryAnimation?.currentStateRad !== value
    ) {
      geometryUpdate(value);
      if (instancedMesh.current && instanceMatrices) {
        applyMechanicaInstanceMatrices(instancedMesh.current, instanceMatrices);
      }
    }
    const attitude = attitudeQuaternion(state, part.id);
    group.current.position
      .copy(basePosition)
      .addScaledVector(explodeVector, explode);
    group.current.rotation.set(...baseRotation);

    if (attitude) {
      group.current.quaternion.fromArray(attitude).normalize();
    } else if (part.joint?.kind === "revolute") {
      group.current.rotateOnAxis(axis, value);
    } else if (part.joint?.kind === "prismatic") {
      group.current.position.addScaledVector(axis, value);
    }
  });

  if (!visible) return null;

  const handlePointerDown = part.interactive
    ? undefined
    : (event: { stopPropagation: () => void }) => {
        event.stopPropagation();
        setSelectedPartId(part.id);
      };
  const content = (
    <>
      {instanceMatrices ? (
        <instancedMesh
          args={[geometry as BufferGeometry, material, instanceMatrices.length]}
          castShadow
          onPointerDown={handlePointerDown}
          receiveShadow
          ref={instancedMesh}
        />
      ) : (
        <mesh
          castShadow
          geometry={geometry}
          material={material}
          onPointerDown={handlePointerDown}
          receiveShadow
        />
      )}
      {childParts.map((child) => (
        <PartNode
          assemblyProgress={assemblyProgress}
          childrenByParent={childrenByParent}
          crankByRod={crankByRod}
          displayState={displayState}
          explode={explode}
          graph={graph}
          key={child.id}
          maxAssemblyStep={maxAssemblyStep}
          module={module}
          onDraggingChange={onDraggingChange}
          onDrivePart={onDrivePart}
          part={child}
          partsById={partsById}
          schemeId={schemeId}
          spotlightActive={spotlightActive}
          spotlightPartIds={spotlightPartIds}
        />
      ))}
    </>
  );

  return (
    <group name={part.id} ref={group} visible={visible}>
      {part.interactive ? (
        <DriveHandle
          drive={(delta) => onDrivePart(part.id, delta)}
          onDraggingChange={onDraggingChange}
          onSelect={() => setSelectedPartId(part.id)}
          part={part}
        >
          {content}
        </DriveHandle>
      ) : (
        content
      )}
    </group>
  );
}

interface MachineSceneProps {
  activeSpec: MachineSpec;
  assemblyProgress: number;
  displayState: { current: Record<string, number> | null };
  explode: number;
  graph: IKinematicGraph;
  module: MachineModule;
  onDrivePart: (partId: string, delta: number) => void;
  paused: boolean;
  schemeId?: string;
  spotlightActive: boolean;
  spotlightPartIds: string[];
  spotlightRunId: number;
}

function MachineScene({
  activeSpec,
  assemblyProgress,
  displayState,
  explode,
  graph,
  module,
  onDrivePart,
  paused,
  schemeId,
  spotlightActive,
  spotlightPartIds,
  spotlightRunId,
}: MachineSceneProps) {
  const dragging = useRef(false);
  const escapementElapsed = useRef(0);
  const partIds = useMemo(
    () => new Set(activeSpec.parts.map((part) => part.id)),
    [activeSpec],
  );
  const rootParts = useMemo(
    () =>
      activeSpec.parts.filter(
        (part) => !part.parent || !partIds.has(part.parent),
      ),
    [activeSpec, partIds],
  );
  const partsById = useMemo(
    () => new Map(activeSpec.parts.map((part) => [part.id, part])),
    [activeSpec.parts],
  );
  const crankByRod = useMemo(
    () =>
      new Map(
        activeSpec.constraints.flatMap((constraint) =>
          constraint.type === "crank"
            ? ([[constraint.rod, constraint]] as const)
            : [],
        ),
      ),
    [activeSpec.constraints],
  );
  const childrenByParent = useMemo(() => {
    const children = new Map<string, PartDef[]>();
    for (const part of activeSpec.parts) {
      if (!part.parent) continue;
      const siblings = children.get(part.parent) ?? [];
      siblings.push(part);
      children.set(part.parent, siblings);
    }
    return children;
  }, [activeSpec]);
  const maxAssemblyStep = useMemo(
    () =>
      Math.max(1, ...activeSpec.parts.map((part) => part.assemblyStep ?? 0)),
    [activeSpec],
  );

  useFrame((_, delta) => {
    if (paused || dragging.current) return;
    if (activeSpec.escapement) {
      escapementElapsed.current += delta;
      if (escapementElapsed.current < activeSpec.escapement.fillSecondsPerScoop)
        return;
      escapementElapsed.current = 0;
      onDrivePart(activeSpec.primaryDrive, activeSpec.escapement.stepRad);
      return;
    }
    onDrivePart(activeSpec.primaryDrive, delta * 0.12);
  });

  return (
    <>
      <color args={["#090a0a"]} attach="background" />
      <ambientLight intensity={0.8} />
      <directionalLight castShadow intensity={3.2} position={[1.5, 2.5, 3]} />
      <directionalLight
        color="#b88a42"
        intensity={1.2}
        position={[-2, -1, 2]}
      />
      <OrbitControls enableDamping enabled={!spotlightActive} makeDefault />
      <Bounds clip margin={1.25}>
        <BoundsRefit active={spotlightActive} spec={activeSpec} />
        {rootParts.map((part) => (
          <PartNode
            assemblyProgress={assemblyProgress}
            childrenByParent={childrenByParent}
            crankByRod={crankByRod}
            displayState={displayState}
            explode={explode}
            graph={graph}
            key={part.id}
            maxAssemblyStep={maxAssemblyStep}
            module={module}
            onDraggingChange={(nextDragging) => {
              dragging.current = nextDragging;
            }}
            onDrivePart={onDrivePart}
            part={part}
            partsById={partsById}
            schemeId={schemeId}
            spotlightActive={spotlightActive}
            spotlightPartIds={spotlightPartIds}
          />
        ))}
      </Bounds>
      <ContactShadows
        blur={2.5}
        far={3}
        opacity={0.38}
        position={[0, -0.45, 0]}
        scale={2}
      />
      <SpotlightRig
        active={spotlightActive}
        runId={spotlightRunId}
        targetPartId={spotlightPartIds.at(-1)}
      />
    </>
  );
}

interface CapturedEvent {
  type: string;
  part: string;
  state: Record<string, number>;
}

function statesDiffer(
  before: Record<string, number>,
  after: Record<string, number>,
): boolean {
  const ids = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const id of ids) {
    if (Math.abs((before[id] ?? 0) - (after[id] ?? 0)) > 1e-10) return true;
  }
  return false;
}

function interpolateState(
  before: Record<string, number>,
  after: Record<string, number>,
  progress: number,
): Record<string, number> {
  const state = { ...after };
  for (const [id, value] of Object.entries(before)) {
    if (after[id] !== undefined)
      state[id] = value + (after[id] - value) * progress;
  }
  return state;
}

export function captureSpotlightState(
  spec: MachineSpec,
  state: Record<string, number>,
  type: string,
  part: string,
): Record<string, number> {
  const captured = { ...state };
  if (type === "mallet:raise") {
    const cam = spec.constraints.find(
      (constraint) => constraint.type === "cam" && constraint.follower === part,
    );
    if (cam?.type === "cam") captured[part] = cam.liftHeight;
  }
  return captured;
}

export default function MachineViewer({
  module,
  schemeId,
}: MachineViewerProps) {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage === "en" ? "en" : "zh";
  const graph = useMemo(() => new KinematicGraph(module.spec), [module.spec]);
  const [activeSchemeId, setActiveSchemeId] = useState(schemeId);
  const activeSpec = useMemo(
    () =>
      applySchemePatch(
        module.spec,
        activeSchemeId ? module.schemes?.[activeSchemeId] : undefined,
      ),
    [activeSchemeId, module.schemes, module.spec],
  );
  const activeModule = useMemo(
    () => ({ ...module, spec: activeSpec }),
    [activeSpec, module],
  );
  const [caption, setCaption] = useState("");
  const [spotlightActive, setSpotlightActive] = useState(false);
  const [spotlightDone, setSpotlightDone] = useState(false);
  const [spotlightPartIds, setSpotlightPartIds] = useState<string[]>([]);
  const [spotlightRunId, setSpotlightRunId] = useState(0);
  const [typecaseProcessBusy, setTypecaseProcessBusy] = useState(false);
  const [typecaseProcessStep, setTypecaseProcessStep] = useState(-1);
  const [odometerReadout, setOdometerReadout] = useState<string | null>(
    module.spec.slug === "odometer" ? "0.00" : null,
  );
  const [assemblyPlaying, setAssemblyPlaying] = useState(false);
  const animationFrame = useRef<number | null>(null);
  const processFrame = useRef<number | null>(null);
  const spotlightFrame = useRef<number | null>(null);
  const displayState = useRef<Record<string, number> | null>(null);
  const assemblyProgress = useUiStore((state) => state.assemblyProgress);
  const explode = useUiStore((state) => state.explode);
  const paused = useUiStore((state) => state.paused);
  const setAssemblyProgress = useUiStore((state) => state.setAssemblyProgress);
  const setPaused = useUiStore((state) => state.setPaused);
  const setSelectedPartId = useUiStore((state) => state.setSelectedPartId);

  useLayoutEffect(() => {
    if (spotlightFrame.current !== null) {
      cancelAnimationFrame(spotlightFrame.current);
      spotlightFrame.current = null;
    }
    if (processFrame.current !== null) {
      cancelAnimationFrame(processFrame.current);
      processFrame.current = null;
    }
    displayState.current = null;
    setSpotlightActive(false);
    setSpotlightDone(false);
    setSpotlightPartIds([]);
    setTypecaseProcessBusy(false);
    setTypecaseProcessStep(-1);
    setSelectedPartId(null);
    setActiveSchemeId(schemeId);
    setOdometerReadout(module.spec.slug === "odometer" ? "0.00" : null);
  }, [graph, module.spec.slug, schemeId, setSelectedPartId]);

  useLayoutEffect(() => {
    graph.setScheme(
      activeSchemeId ? module.schemes?.[activeSchemeId] : undefined,
    );
    setSelectedPartId(null);
  }, [activeSchemeId, graph, module.schemes, setSelectedPartId]);

  useEffect(
    () => () => {
      if (spotlightFrame.current !== null) {
        cancelAnimationFrame(spotlightFrame.current);
      }
      if (processFrame.current !== null) {
        cancelAnimationFrame(processFrame.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!assemblyPlaying) return;
    const startedAt = performance.now();
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 1600);
      setAssemblyProgress(progress);
      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate);
      } else {
        setAssemblyPlaying(false);
      }
    };
    animationFrame.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrame.current !== null)
        cancelAnimationFrame(animationFrame.current);
    };
  }, [assemblyPlaying, setAssemblyProgress]);

  useLayoutEffect(() => {
    const hooksEnabled =
      import.meta.env.DEV || import.meta.env.VITE_E2E === "1";
    if (!hooksEnabled) return;
    window.__mech = { graph, module: activeModule, spec: activeSpec };
    window.__mechSelect = (partId) => setSelectedPartId(partId);
    window.__mechExplodeSpread = () => {
      const currentExplode = useUiStore.getState().explode;
      if (activeSpec.parts.length === 0) return 0;
      const total = activeSpec.parts.reduce(
        (sum, part) =>
          sum + radialExplodeVector(part).length() * currentExplode,
        0,
      );
      return total / activeSpec.parts.length;
    };

    return () => {
      if (window.__mech?.graph === graph) {
        delete window.__mech;
        delete window.__mechSelect;
        delete window.__mechExplodeSpread;
      }
    };
  }, [activeModule, activeSpec, graph, setSelectedPartId]);

  const recordEvent = (type: string, part: string) => {
    setCaption(`${type} · ${part}`);
    if (type === "odometer:update" || type === "odometer:readout") {
      const value = Number.parseFloat(part);
      if (Number.isFinite(value)) setOdometerReadout(value.toFixed(2));
    }
    if (type === "scheme:switch" && module.schemes?.[part]) {
      setActiveSchemeId(part);
    }
    if (type === "spotlight:done") setSpotlightDone(true);
  };

  const handleSolve = (result: SolveResult) => {
    for (const event of result.events) recordEvent(event.type, event.part);
  };

  const runTrigger = (triggerId: string) => {
    const trigger = module.mechanism?.triggers.find(
      (candidate) => candidate.id === triggerId,
    );
    if (!trigger) return;
    if (triggerId !== "spotlight") {
      trigger.run(graph, recordEvent);
      return;
    }

    if (spotlightFrame.current !== null) {
      cancelAnimationFrame(spotlightFrame.current);
      spotlightFrame.current = null;
    }
    setPaused(true);
    setSpotlightActive(true);
    setSpotlightDone(false);
    setSpotlightPartIds([activeSpec.primaryDrive]);
    setSpotlightRunId((current) => current + 1);

    const initialState = graph.state();
    const captured: CapturedEvent[] = [];
    let donePart = activeSpec.primaryDrive;
    trigger.run(graph, (type, part) => {
      if (type === "spotlight:done") {
        donePart = part;
        return;
      }
      captured.push({
        type,
        part,
        state: captureSpotlightState(activeSpec, graph.state(), type, part),
      });
    });
    displayState.current = initialState;

    let index = 0;
    let previousState = initialState;
    const playNext = () => {
      const event = captured[index];
      if (!event) {
        displayState.current = null;
        recordEvent("spotlight:done", donePart);
        setSpotlightActive(false);
        spotlightFrame.current = null;
        return;
      }

      recordEvent(event.type, event.part);
      if (event.type === "highlight:off") {
        setSpotlightPartIds((current) =>
          current.filter((partId) => partId !== event.part),
        );
      } else if (
        event.type.includes("drive") ||
        event.type.includes("highlight") ||
        event.type === "mallet:raise"
      ) {
        setSpotlightPartIds((current) =>
          current.includes(event.part) ? current : [...current, event.part],
        );
      }

      const changed = statesDiffer(previousState, event.state);
      const priorType = captured[index - 1]?.type;
      const duration =
        changed && priorType === "drive:slow"
          ? 1200
          : changed && event.type.includes("drive")
            ? 420
            : changed
              ? 240
              : 90;
      const startedAt = performance.now();
      const animate = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        displayState.current = interpolateState(
          previousState,
          event.state,
          1 - (1 - progress) ** 3,
        );
        if (progress < 1) {
          spotlightFrame.current = requestAnimationFrame(animate);
          return;
        }
        previousState = event.state;
        index += 1;
        playNext();
      };
      spotlightFrame.current = requestAnimationFrame(animate);
    };
    playNext();
  };

  const runTypecaseProcessStage = (stage: number) => {
    if (typecaseProcessBusy) return;
    const trigger = module.mechanism?.triggers.find(
      (candidate) => candidate.id === "process",
    );
    if (!trigger) return;
    const nextStep = stage - 1;
    if (stage !== 0 && nextStep !== typecaseProcessStep + 1) return;
    const before = graph.state();
    const events: Array<{ type: string; part: string }> = [];
    trigger.run(graph, (type, part) => events.push({ type, part }), stage);
    const after = graph.state();
    for (const event of events) recordEvent(event.type, event.part);
    setPaused(true);
    setTypecaseProcessBusy(true);
    setTypecaseProcessStep(nextStep);
    displayState.current = before;
    const startedAt = performance.now();
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 420);
      displayState.current = interpolateState(
        before,
        after,
        1 - (1 - progress) ** 3,
      );
      if (progress < 1) {
        processFrame.current = requestAnimationFrame(animate);
        return;
      }
      displayState.current = null;
      setTypecaseProcessBusy(false);
      processFrame.current = null;
    };
    processFrame.current = requestAnimationFrame(animate);
  };

  const drivePart = (partId: string, delta: number) => {
    const trigger = module.mechanism?.triggers.find(
      (candidate) =>
        candidate.id === `drive:${partId}` ||
        (module.spec.slug === "astroclock" &&
          candidate.id === `drag-${partId}`),
    );
    if (trigger) {
      trigger.run(graph, recordEvent, delta);
      return;
    }
    handleSolve(graph.drive(partId, delta));
  };

  const spotlight = module.mechanism?.triggers.find(
    (trigger) => trigger.id === "spotlight",
  );

  return (
    <main className="viewer-page">
      <section className="viewer-stage">
        <div className="viewer-title">
          <h1>{module.data.names[language]}</h1>
          <p>
            {module.data.oneLiner[language]} · {t("viewer.rotateHint")}
          </p>
        </div>
        <div
          className="viewer-canvas"
          data-spotlight-active={spotlightActive ? "true" : "false"}
        >
          <Canvas
            camera={{ fov: 36, position: [0.9, 1.1, 1.6] }}
            dpr={[1, 2]}
            shadows
          >
            <MachineScene
              activeSpec={activeSpec}
              assemblyProgress={assemblyProgress}
              displayState={displayState}
              explode={explode}
              graph={graph}
              module={module}
              onDrivePart={drivePart}
              paused={paused}
              schemeId={activeSchemeId}
              spotlightActive={spotlightActive}
              spotlightPartIds={spotlightPartIds}
              spotlightRunId={spotlightRunId}
            />
          </Canvas>
        </div>
        <div className="viewer-toolbar">
          <button
            className="ghost-button"
            onClick={() => setPaused(!paused)}
            type="button"
          >
            {paused ? t("viewer.resume") : t("viewer.pause")}
          </button>
          <label className="range-control">
            <span>{t("viewer.assembly")}</span>
            <input
              aria-label={t("viewer.assembly")}
              max="1"
              min="0"
              onChange={(event) => {
                setAssemblyPlaying(false);
                setAssemblyProgress(Number(event.currentTarget.value));
              }}
              step="0.01"
              type="range"
              value={assemblyProgress}
            />
          </label>
          <button
            className="ghost-button"
            data-testid="assembly-play"
            onClick={() => {
              setAssemblyProgress(0);
              setAssemblyPlaying(true);
            }}
            type="button"
          >
            {t("viewer.assemblyPlay")}
          </button>
          <ExplodedControl />
        </div>
      </section>

      <aside className="viewer-sidebar">
        <PartInspector module={module} spec={activeSpec} />
        <SchemeSwitcher
          module={module}
          onChange={setActiveSchemeId}
          schemeId={activeSchemeId}
        />
        <section className="panel">
          <h2>{t("viewer.mechanisms")}</h2>
          <div className="mechanism-list">
            {module.mechanism?.triggers.some(
              (trigger) => !trigger.id.startsWith("drive:"),
            ) ? (
              module.mechanism.triggers
                .filter(
                  (trigger) =>
                    !trigger.id.startsWith("drive:") &&
                    !(
                      module.spec.slug === "typecase" &&
                      trigger.id === "process"
                    ),
                )
                .map((trigger) => (
                  <button
                    className="mechanism-button"
                    data-testid={`mech-trigger-${trigger.id}`}
                    key={trigger.id}
                    onClick={() => runTrigger(trigger.id)}
                    type="button"
                  >
                    {trigger.label[language]}
                  </button>
                ))
            ) : (
              <p className="panel-empty">{t("viewer.noMechanisms")}</p>
            )}
            {module.spec.slug === "typecase" ? (
              <div data-testid="typecase-process-stepper">
                {TYPECASE_PROCESS_STEPS.map((step, index) => (
                  <button
                    aria-current={
                      typecaseProcessStep === index ? "step" : undefined
                    }
                    className="mechanism-button"
                    data-testid={`typecase-process-step-${index + 1}`}
                    disabled={
                      typecaseProcessBusy || index !== typecaseProcessStep + 1
                    }
                    key={step.source + step.quote}
                    onClick={() => runTypecaseProcessStage(index + 1)}
                    type="button"
                  >
                    {index + 1}. {step.label[language]}
                  </button>
                ))}
                <button
                  className="ghost-button"
                  data-testid="typecase-process-reset"
                  disabled={typecaseProcessBusy || typecaseProcessStep < 0}
                  onClick={() => runTypecaseProcessStage(0)}
                  type="button"
                >
                  {language === "zh" ? "重置流程" : "Reset process"}
                </button>
                {typecaseProcessStep >= 0 ? (
                  <p
                    className="event-caption"
                    data-testid="typecase-process-source"
                  >
                    「{TYPECASE_PROCESS_STEPS[typecaseProcessStep].quote}」 ·{" "}
                    {TYPECASE_PROCESS_STEPS[typecaseProcessStep].source}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          {odometerReadout !== null ? (
            <p aria-live="polite" className="event-caption">
              <strong>{language === "zh" ? "里程" : "Distance"}</strong>{" "}
              <output data-testid="odometer-readout">
                {odometerReadout} li
              </output>
            </p>
          ) : null}
          <p
            aria-live="polite"
            className="event-caption"
            data-testid="event-captions"
          >
            {caption}
          </p>

          <article className="spotlight-card">
            <strong>{t("viewer.spotlight")}</strong>
            <p className="panel-copy">{module.data.ingenuity.hook[language]}</p>
            <button
              className="gold-button"
              data-testid="spotlight-play"
              disabled={!spotlight}
              onClick={() => spotlight && runTrigger(spotlight.id)}
              type="button"
            >
              {t("viewer.spotlightPlay")}
            </button>
            <p className="panel-copy">{module.data.ingenuity.echo[language]}</p>
            {spotlightDone ? (
              <span className="spotlight-done">
                {t("viewer.spotlightDone")}
              </span>
            ) : null}
          </article>
        </section>
        <GalleryPanel data={module.data} />
      </aside>
    </main>
  );
}
