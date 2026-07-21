import { ContactShadows, OrbitControls } from "@react-three/drei";
import type { TFunction } from "i18next";
import {
  Canvas,
  type RootState,
  type ThreeEvent,
  useFrame,
  useThree,
} from "@react-three/fiber";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ACESFilmicToneMapping,
  BackSide,
  Box3,
  type BufferGeometry,
  type Camera,
  type DirectionalLight,
  Euler,
  type Group,
  type InstancedMesh,
  Matrix4,
  type Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  type OrthographicCamera,
  PerspectiveCamera,
  Quaternion,
  type Scene,
  Sphere,
  Vector3,
} from "three";

import {
  acquireMaterial,
  getMaterial,
  materialVariantKey,
} from "../../core/materialCache";
import { machineGeometryCache } from "../../core/geometryCache";
import {
  standardMaterial,
  type StandardMaterialPresentation,
} from "../../core/materials";
import {
  defaultTextureVariant,
  materialTextureStats,
  textureShaderFeatureHash,
  warmMaterialTextures,
} from "../../core/textures";
import {
  applyMechanicaInstanceMatrices,
  getMechanicaInstanceMatrices,
  partGeometryEntries,
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
import CompareView, { type CompareSceneContext } from "../compare/CompareView";
import {
  schemeGhostPresentation,
  specForScheme,
  type SchemeTransitionMetadata,
} from "../compare/model";
import GalleryPanel from "../panels/GalleryPanel";
import PosterFallback from "../PosterFallback";
import DocentChat from "../panels/DocentChat";
import PartInspector from "../panels/PartInspector";
import SchemeSwitcher from "../panels/SchemeSwitcher";
import MachineEnvironment, {
  SCENERY_RAYCAST_DISABLED,
} from "../scene/MachineEnvironment";
import { QUAKE_PAYOFF_EVENT } from "../scene/types";
import { useUiStore } from "../store";
import type { StoryStageState } from "../story/types";
import AidLayer from "./AidLayer";
import DriveHandle, {
  beginPointerIntent,
  handleDriveKeyDown,
  isPointerTap,
  type PointerIntent,
} from "./DriveHandle";
import DemoFocusRig from "./DemoFocusRig";
import { buildDemoTimeline } from "./demoTimeline";
import ExplodedControl from "./ExplodedControl";
import {
  GeometryLoading,
  useMachineGeometryWarmup,
} from "./geometryWarmup";
import {
  transitionViewerIdle,
  VIEWER_IDLE_TIMEOUT_MS,
  type ViewerIdleState,
} from "./idleActivity";
import SceneEnvironment, { prepareSceneEnvironment } from "./SceneEnvironment";
import {
  ASSEMBLY_COMPLETION_DURATION_MS,
  type AssemblyController,
  assemblyEaseOutCubic,
  assemblyFlightOffset,
  assemblyPartAppearance,
  assemblyPartLocalProgress,
  isPartVisibleInAssemblyStep,
  useAssemblyController,
} from "./assembly";
import {
  DEMO_VIEWER_PROFILE,
  safeHomePose,
  type ViewerProfile,
  VIEWER_PROFILES,
  visualMaterialFor,
} from "./visualRecovery";

type CameraPhase = "waiting-geometry" | "intro" | "idle" | "spotlight";

interface OrbitControlsHandle {
  enabled: boolean;
  target: Vector3;
  update: () => void;
}

interface CameraDiagnostics {
  boundingRadius: number;
  camera: Camera;
  controlsEnabled: boolean;
  distance: number;
  focusFallback: boolean;
  geometryReadyAt: number;
  homeDistance: number;
  introCompletedAt: number | null;
  introStartedAt: number | null;
  introStartDistance: number;
  phase: CameraPhase;
  refitCount: number;
  sphere: Sphere;
  target: Vector3;
  viewportHeight: number;
  viewportWidth: number;
}

interface CameraDiagnosticSnapshot {
  cameraDistance: number;
  controlsEnabled: boolean;
  focusFallback: boolean;
  geometryReadyAt: number;
  homeDistance: number;
  introCompletedAt: number | null;
  introStartedAt: number | null;
  introStartDistance: number;
  phase: CameraPhase;
  position: [number, number, number];
  refitCount: number;
  sphereRadius: number;
  target: [number, number, number];
}

interface ShadowDiagnostics {
  casters: number;
  castingLights: number;
  configured: boolean;
  mapSize: number;
  suppressed: number;
}

declare global {
  interface Window {
    __mech?: {
      graph: IKinematicGraph;
      forceIdle: () => void;
      frameCount: () => number;
      idleState: () => {
        autoPaused: boolean;
        demand: boolean;
        paused: boolean;
        timeoutMs: number;
      };
      cameraState: () => CameraDiagnosticSnapshot | null;
      frameFill: () => number;
      module: MachineModule;
      machineReady: number | null;
      memory: () => { geometries: number; textures: number };
      partMaterials: (partId: string) => Array<{
        alphaTest: number;
        color: string;
        opacity: number;
        side: number;
      }>;
      partScreenPoint: (partId: string) => { x: number; y: number } | null;
      spec: MachineModule["spec"];
      sceneryRaycastViolations: () => number;
      sceneryTriangles: () => number;
      partMeshCount: (partId: string) => number;
      resetFrameCount: () => void;
      shadowState: () => ShadowDiagnostics;
      textureStats: () => {
        entries: number;
        generationMs: number;
        textures: number;
      };
      triangles: () => number;
      warmTextures: () => {
        entries: number;
        generationMs: number;
        textures: number;
      };
    };
    __mechExplodeSpread?: () => number;
    __mechCamera?: { boundingRadius: number; distance: number };
    __mechDemoFocus?: { focusPartId: string | null };
    __mechSelect?: (partId: string | null) => void;
    __mechAssembly?: {
      advanceStep: () => void;
      enterExplodedMode: () => void;
      enterStepMode: () => void;
      exitAssembly: () => void;
      partPosition: (partId: string) => [number, number, number] | null;
      plan: () => {
        durationMs: number;
        orderedPartIds: string[];
        stagingByPartId: Record<
          string,
          {
            groundOffset: number;
            position: readonly [number, number, number];
            radius: number;
          }
        >;
        stagingGroundY: number;
      };
      seat: (
        partId: string,
        distanceFromHome?: number,
        radius?: number,
      ) => void;
      selectPart: (partId: string | null) => void;
      state: () => {
        complete: boolean;
        errorPartId: string | null;
        assemblyProgress: number;
        completionProgress: number;
        explode: number;
        mode: string;
        seatedPartIds: string[];
        transmissionEnabled: boolean;
      };
    };
  }
}

export interface MachineViewerProps {
  module: MachineModule;
  schemeId?: string;
}

const EMPTY_PART_IDS: string[] = [];
const SEISMOSCOPE_BEARINGS = [
  "N",
  "NE",
  "E",
  "SE",
  "S",
  "SW",
  "W",
  "NW",
] as const;

function registerContextLossHandlers(
  { gl, invalidate }: Pick<RootState, "gl" | "invalidate">,
  onChange: (lost: boolean) => void,
): () => void {
  const handleLost = (event: Event) => {
    event.preventDefault();
    onChange(true);
  };
  const handleRestored = () => {
    onChange(false);
    invalidate();
  };
  gl.domElement.addEventListener("webglcontextlost", handleLost);
  gl.domElement.addEventListener("webglcontextrestored", handleRestored);
  return () => {
    gl.domElement.removeEventListener("webglcontextlost", handleLost);
    gl.domElement.removeEventListener("webglcontextrestored", handleRestored);
  };
}

interface PartNodeProps {
  aidCutawayPartIds?: readonly string[];
  aidHighlightPartIds?: readonly string[];
  appearance?: PartAppearance;
  assembly?: AssemblyController;
  assemblyProgress: number;
  childrenByParent: Map<string, PartDef[]>;
  compareContext?: CompareSceneContext;
  crankByRod: Map<string, CrankConstraint>;
  displayState: { current: Record<string, number> | null };
  driveCoachVisible?: boolean;
  drivePartIds: ReadonlySet<string>;
  explode: number;
  geometryScope: string;
  graph: IKinematicGraph;
  interactionDisabled?: boolean;
  maxAssemblyStep: number;
  module: MachineModule;
  onDraggingChange: (dragging: boolean) => void;
  onDrivePart: (partId: string, delta: number) => void;
  onDriveSuccess?: () => void;
  part: PartDef;
  partsById: Map<string, PartDef>;
  schemeId?: string;
  spotlightActive: boolean;
  spotlightPartIds: string[];
  visiblePartIds?: ReadonlySet<string>;
}

interface PartAppearance {
  color?: string;
  opacity: number;
  partIds?: ReadonlySet<string>;
  variant: string;
}

type CrankConstraint = Extract<
  MachineSpec["constraints"][number],
  { type: "crank" }
>;

function mechanicaBounds(root: Object3D): Box3 {
  const bounds = new Box3();
  root.updateWorldMatrix(true, true);
  root.traverse((object) => {
    const mesh = object as typeof object & { isMesh?: boolean };
    if (!mesh.isMesh || mesh.userData.mechanicaAffordance) return;
    bounds.expandByObject(mesh, true);
  });
  return bounds;
}

function SpotlightRig({
  active,
  controls,
  diagnostics,
  runId,
  targetPartId,
}: {
  active: boolean;
  controls: RefObject<OrbitControlsHandle | null>;
  diagnostics?: MutableRefObject<CameraDiagnostics | null>;
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
  const startTarget = useRef(new Vector3());
  const endTarget = useRef(new Vector3());
  const hasTarget = useRef(false);

  useLayoutEffect(() => {
    if (!active) {
      if (hasTarget.current && controls.current) {
        controls.current.target.copy(endTarget.current);
        controls.current.update();
      }
      if (hasTarget.current && diagnostics?.current) {
        diagnostics.current.target.copy(endTarget.current);
      }
      return;
    }
    const targetObject = targetPartId
      ? scene.getObjectByName(targetPartId)
      : undefined;
    if (!targetObject) return;
    const target = targetObject.getWorldPosition(new Vector3());
    const size = mechanicaBounds(targetObject).getSize(new Vector3()).length();
    const direction = camera.getWorldDirection(new Vector3()).normalize();
    startedAt.current = performance.now();
    startPosition.current.copy(camera.position);
    startQuaternion.current.copy(camera.quaternion);
    startTarget.current.copy(controls.current?.target ?? target);
    endTarget.current.copy(target);
    hasTarget.current = true;
    if (diagnostics?.current) diagnostics.current.phase = "spotlight";
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
  }, [
    active,
    camera,
    controls,
    diagnostics,
    runId,
    scene,
    targetPartId,
  ]);

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
    if (controls.current) {
      controls.current.target.lerpVectors(
        startTarget.current,
        endTarget.current,
        eased,
      );
      diagnostics?.current?.target.copy(controls.current.target);
      controls.current.update();
    }
    camera.updateMatrixWorld();
  });

  return null;
}

function boxVolume(bounds: Box3): number {
  const size = bounds.getSize(new Vector3());
  return size.x * size.y * size.z;
}

function fitDistanceForBounds(
  bounds: Box3,
  direction: Vector3,
  target: Vector3,
  fov: number,
  aspect: number,
): number {
  const cameraPosition = target.clone().add(direction);
  const quaternion = new Quaternion().setFromRotationMatrix(
    new Matrix4().lookAt(cameraPosition, target, new Vector3(0, 1, 0)),
  );
  const inverseQuaternion = quaternion.invert();
  const tanVertical = Math.tan((fov * Math.PI) / 360);
  const tanHorizontal = tanVertical * aspect;
  let distance = 0;

  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const corner = new Vector3(x, y, z)
          .sub(target)
          .applyQuaternion(inverseQuaternion);
        distance = Math.max(
          distance,
          corner.z + Math.abs(corner.x) / tanHorizontal,
          corner.z + Math.abs(corner.y) / tanVertical,
        );
      }
    }
  }

  return distance;
}

function projectedFrameFill(diagnostics: CameraDiagnostics | null): number {
  if (!diagnostics || !(diagnostics.camera instanceof PerspectiveCamera)) {
    return 0;
  }
  const distance = diagnostics.camera.position.distanceTo(
    diagnostics.sphere.center,
  );
  if (distance <= 0 || diagnostics.viewportHeight <= 0) return 0;
  const tanVertical = Math.tan((diagnostics.camera.fov * Math.PI) / 360);
  const aspect = diagnostics.viewportWidth / diagnostics.viewportHeight;
  const tanShortAxis =
    diagnostics.viewportWidth <= diagnostics.viewportHeight
      ? tanVertical * aspect
      : tanVertical;
  return diagnostics.sphere.radius / (distance * tanShortAxis);
}

function cameraSnapshot(
  diagnostics: CameraDiagnostics | null,
): CameraDiagnosticSnapshot | null {
  if (!diagnostics) return null;
  return {
    cameraDistance: diagnostics.camera.position.distanceTo(diagnostics.target),
    controlsEnabled: diagnostics.controlsEnabled,
    focusFallback: diagnostics.focusFallback,
    geometryReadyAt: diagnostics.geometryReadyAt,
    homeDistance: diagnostics.homeDistance,
    introCompletedAt: diagnostics.introCompletedAt,
    introStartedAt: diagnostics.introStartedAt,
    introStartDistance: diagnostics.introStartDistance,
    phase: diagnostics.phase,
    position: diagnostics.camera.position.toArray(),
    refitCount: diagnostics.refitCount,
    sphereRadius: diagnostics.sphere.radius,
    target: diagnostics.target.toArray(),
  };
}

function cameraFitKey(
  slug: string,
  schemeId: string | undefined,
  assemblyState: string,
  explode: number,
): string {
  return `${slug}:${schemeId ?? "default"}:${assemblyState}:explode-${Math.round(Math.max(0, Math.min(1, explode)) * 20)}`;
}

interface CameraTransition {
  endPosition: Vector3;
  endQuaternion: Quaternion;
  startPosition: Vector3;
  startQuaternion: Quaternion;
  startedAt: number;
}

function CameraDirector({
  blocked,
  blockedFitKeyToConsume,
  controls,
  diagnostics,
  enabled,
  explode,
  fitFullBounds,
  fitKey,
  fitWholeMachine,
  introPlayed,
  machineRoot,
  onIntroActiveChange,
  onTargetChange,
  playIntro,
  profile,
  readyAt,
  spec,
}: {
  blocked: boolean;
  blockedFitKeyToConsume?: string;
  controls: RefObject<OrbitControlsHandle | null>;
  diagnostics?: MutableRefObject<CameraDiagnostics | null>;
  enabled: boolean;
  explode: number;
  fitFullBounds: boolean;
  fitKey: string;
  fitWholeMachine: boolean;
  introPlayed?: MutableRefObject<boolean>;
  machineRoot: RefObject<Group | null>;
  onIntroActiveChange: (active: boolean) => void;
  onTargetChange?: (target: [number, number, number]) => void;
  playIntro: boolean;
  profile: ViewerProfile;
  readyAt: number | null;
  spec: MachineSpec;
}) {
  const camera = useThree((state) => state.camera);
  const viewport = useThree((state) => state.size);
  const fittedKey = useRef<string | null>(null);
  const localIntroPlayed = useRef(false);
  const hasPlayedIntro = introPlayed ?? localIntroPlayed;
  const transition = useRef<CameraTransition | null>(null);
  const viewportFitKey = `${fitKey}:${viewport.width}x${viewport.height}`;

  useFrame(() => {
    const activeTransition = transition.current;
    if (activeTransition) {
      if (blocked) {
        transition.current = null;
        if (controls.current) controls.current.enabled = false;
        onIntroActiveChange(false);
        if (diagnostics?.current) {
          diagnostics.current.controlsEnabled = false;
          diagnostics.current.introCompletedAt = performance.now();
          diagnostics.current.phase = "spotlight";
        }
        return;
      }
      const progress = Math.min(
        1,
        (performance.now() - activeTransition.startedAt) / 1200,
      );
      const eased = 1 - (1 - progress) ** 3;
      camera.position.lerpVectors(
        activeTransition.startPosition,
        activeTransition.endPosition,
        eased,
      );
      camera.quaternion.slerpQuaternions(
        activeTransition.startQuaternion,
        activeTransition.endQuaternion,
        eased,
      );
      camera.updateMatrixWorld();
      if (progress === 1) {
        transition.current = null;
        if (controls.current) {
          controls.current.enabled = true;
          controls.current.update();
        }
        onIntroActiveChange(false);
        if (diagnostics?.current) {
          diagnostics.current.controlsEnabled = true;
          diagnostics.current.introCompletedAt = performance.now();
          diagnostics.current.phase = "idle";
        }
      }
      return;
    }

    if (!enabled || readyAt === null) return;
    if (blocked) {
      if (hasPlayedIntro.current && fitKey === blockedFitKeyToConsume) {
        fittedKey.current = viewportFitKey;
      }
      return;
    }
    if (fittedKey.current === viewportFitKey) return;
    const root = machineRoot.current;
    if (!root) return;

    let meshes = 0;
    let geometryReady = true;
    root.traverse((object) => {
      const mesh = object as typeof object & {
        geometry?: BufferGeometry;
        isMesh?: boolean;
      };
      if (!mesh.isMesh || mesh.userData.mechanicaAffordance) return;
      meshes += 1;
      if (!mesh.geometry?.getAttribute("position")?.count) {
        geometryReady = false;
      }
    });
    if (
      meshes === 0 ||
      !geometryReady ||
      spec.parts.some((part) => !root.getObjectByName(part.id))
    ) {
      return;
    }

    const wholeBounds = mechanicaBounds(root);
    if (wholeBounds.isEmpty()) return;

    let focusBounds: Box3 | null = null;
    let focusFallback = false;
    if (!fitWholeMachine && !fitFullBounds && profile.focusPartIds?.length) {
      const candidate = new Box3();
      const allFocusPartsFound = profile.focusPartIds.every((partId) => {
        const object = root.getObjectByName(partId);
        if (object) candidate.union(mechanicaBounds(object));
        return Boolean(object);
      });
      const wholeVolume = boxVolume(wholeBounds);
      const candidateVolume = boxVolume(candidate);
      if (
        allFocusPartsFound &&
        !candidate.isEmpty() &&
        wholeVolume > 0 &&
        candidateVolume / wholeVolume >= 0.05
      ) {
        focusBounds = candidate;
      } else {
        focusFallback = true;
      }
    }

    const fitBounds = focusBounds ?? wholeBounds;
    const fitSize = fitBounds.getSize(new Vector3());
    const fitSphere = fitBounds.getBoundingSphere(new Sphere());
    const wholeSphere = wholeBounds.getBoundingSphere(new Sphere());
    const homePose = profile.homePose
      ? safeHomePose(profile.homePose, wholeSphere)
      : null;
    if (import.meta.env.DEV && profile.homePose && !homePose) {
      console.warn("[camera] stale homePose rejected for", spec.slug);
    }
    const target =
      fitWholeMachine || explode > 0 || !homePose
        ? fitBounds.getCenter(new Vector3())
        : new Vector3(...homePose.target);
    if (fitWholeMachine) {
      target.y -= fitSize.y * 0.12;
    }
    if (!homePose && profile.targetOffset) {
      target.add(
        new Vector3(...profile.targetOffset).multiply(
          new Vector3(fitSize.x, fitSize.y, fitSize.z),
        ),
      );
    }
    const authoredPosition = homePose
      ? fitWholeMachine
        ? target
            .clone()
            .add(
              new Vector3(...homePose.position).sub(
                new Vector3(...homePose.target),
              ),
            )
        : new Vector3(...homePose.position)
      : target.clone().add(new Vector3(...profile.direction));
    const direction = authoredPosition.sub(target).normalize();
    const fov = homePose?.fov ?? 36;
    const fitDistance = fitDistanceForBounds(
      fitBounds,
      direction,
      target,
      fov,
      Math.max(viewport.width / viewport.height, 0.001),
    );
    const explodedFitMargin =
      1 +
      (Math.max(
        profile.explodedMargin / Math.max(profile.margin, 0.001),
        1,
      ) -
        1) *
        Math.max(0, Math.min(1, explode));
    const authoredDistance = homePose
      ? new Vector3(...homePose.position).distanceTo(
          new Vector3(...homePose.target),
        )
      : fitDistance * Math.max(profile.margin, 1);
    const fittedHomeDistance = Math.max(
      fitDistance * explodedFitMargin,
      fitSphere.radius * (profile.minDistanceFactor ?? 1.6),
      authoredDistance,
    );
    const homeDistance = fitWholeMachine
      ? fittedHomeDistance * 1.25
      : fittedHomeDistance;
    const endPosition = target.clone().addScaledVector(direction, homeDistance);
    const endQuaternion = new Quaternion().setFromRotationMatrix(
      new Matrix4().lookAt(endPosition, target, camera.up),
    );
    const now = performance.now();
    const shouldPlayIntro = playIntro && !hasPlayedIntro.current;
    const startPosition = target.clone().add(
      endPosition
        .clone()
        .sub(target)
        .multiplyScalar(1.35)
        .applyAxisAngle(new Vector3(0, 1, 0), 0.08),
    );
    const startQuaternion = new Quaternion().setFromRotationMatrix(
      new Matrix4().lookAt(startPosition, target, camera.up),
    );

    if (camera instanceof PerspectiveCamera) {
      camera.fov = fov;
      camera.near = Math.max(wholeSphere.radius * 0.01, 0.0001);
      camera.far = Math.max(
        homeDistance + wholeSphere.radius * 4,
        camera.near + 1,
      );
      camera.updateProjectionMatrix();
    }
    controls.current?.target.copy(target);
    controls.current?.update();
    onTargetChange?.(target.toArray());
    fittedKey.current = viewportFitKey;
    hasPlayedIntro.current ||= shouldPlayIntro;

    if (diagnostics) {
      diagnostics.current = {
        boundingRadius: wholeSphere.radius,
        camera,
        controlsEnabled: !shouldPlayIntro,
        distance: (shouldPlayIntro ? startPosition : endPosition).distanceTo(
          target,
        ),
        focusFallback,
        geometryReadyAt: readyAt,
        homeDistance,
        introCompletedAt: shouldPlayIntro ? null : now,
        introStartedAt: shouldPlayIntro ? now : null,
        introStartDistance: startPosition.distanceTo(target),
        phase: shouldPlayIntro ? "intro" : "idle",
        refitCount: (diagnostics.current?.refitCount ?? 0) + 1,
        sphere: fitSphere,
        target: target.clone(),
        viewportHeight: viewport.height,
        viewportWidth: viewport.width,
      };
    }

    if (shouldPlayIntro) {
      camera.position.copy(startPosition);
      camera.quaternion.copy(startQuaternion);
      camera.updateMatrixWorld();
      if (controls.current) controls.current.enabled = false;
      onIntroActiveChange(true);
      transition.current = {
        endPosition,
        endQuaternion,
        startPosition,
        startQuaternion,
        startedAt: now,
      };
    } else {
      camera.position.copy(endPosition);
      camera.quaternion.copy(endQuaternion);
      camera.updateMatrixWorld();
      onIntroActiveChange(false);
    }
  });

  return null;
}

function radialExplodeVector(part: PartDef) {
  if (part.explodeVector) return new Vector3(...part.explodeVector);
  const radial = new Vector3(...part.position);
  if (radial.lengthSq() < 0.0001) radial.set(0, 1, 0);
  return radial.normalize().multiplyScalar(0.25);
}

type InspectionState = "hovered" | "selected";

const hoveredOutlineMaterial = new MeshBasicMaterial({
  color: "#d9b86d",
  depthWrite: false,
  opacity: 0.72,
  side: BackSide,
  toneMapped: false,
  transparent: true,
});
const selectedOutlineMaterial = new MeshBasicMaterial({
  color: "#f0cf83",
  depthWrite: false,
  opacity: 0.92,
  side: BackSide,
  toneMapped: false,
  transparent: true,
});

interface TransientMaterialState {
  aidCutaway: boolean;
  aidHighlighted: boolean;
  assemblyError: boolean;
  assemblyHighlighted: boolean;
  assemblyStaged: boolean;
  compareColor?: string;
  compareEmissive?: string;
  compareOpacity?: number;
  inspectionState?: InspectionState;
  layerColor?: string;
  layerOpacity?: number;
  schemeHighlighted: boolean;
  seismoscopeDragonSpotlight: boolean;
  spotlightDimmed: boolean;
  spotlightHighlighted: boolean;
}

function applyTransientMaterialState(
  material: MeshStandardMaterial,
  baseMaterial: MeshStandardMaterial,
  state: TransientMaterialState,
): void {
  const cacheKey = material.userData.mechanicaMaterialCacheKey;
  material.copy(baseMaterial);
  material.userData.mechanicaMaterialCacheKey = cacheKey;

  if (state.aidCutaway) {
    material.opacity = 0.12;
    material.transparent = true;
    material.depthWrite = false;
  }
  if (
    state.aidHighlighted ||
    state.schemeHighlighted ||
    state.spotlightHighlighted
  ) {
    material.emissive.set(state.aidHighlighted ? "#f2b23e" : "#6e4e18");
    material.emissiveIntensity = state.spotlightHighlighted
      ? 1.4
      : state.aidHighlighted
        ? 2.1
        : 0.65;
  }
  if (state.seismoscopeDragonSpotlight) {
    material.color.set("#b62f2f");
    material.emissive.set("#7d1515");
    material.emissiveIntensity = 1.8;
  }
  if (state.compareColor) material.color.set(state.compareColor);
  if (state.compareEmissive) {
    material.emissive.set(state.compareEmissive);
    material.emissiveIntensity = 1;
  }
  if (state.compareOpacity !== undefined && state.compareOpacity < 1) {
    material.opacity = state.compareOpacity;
    material.transparent = true;
  }
  if (state.layerColor) material.color.set(state.layerColor);
  if (state.layerOpacity !== undefined && state.layerOpacity < 1) {
    material.opacity = state.layerOpacity;
    material.transparent = true;
    material.depthWrite = false;
  }
  if (state.spotlightDimmed) {
    material.opacity = Math.max(material.opacity, 0.3);
    if (material.emissive.getHex() === 0) material.emissive.set("#2a2114");
    material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.18);
  }
  if (state.inspectionState) {
    material.emissive.set(
      state.inspectionState === "selected" ? "#b97f25" : "#6e4e18",
    );
    material.emissiveIntensity =
      state.inspectionState === "selected" ? 1.5 : 0.9;
  }
  if (state.assemblyStaged) {
    material.color.set("#d7b968");
    material.emissive.set("#835d22");
    material.emissiveIntensity = 1.45;
    material.roughness = Math.min(material.roughness, 0.58);
  }
  if (state.assemblyHighlighted) {
    material.emissive.set("#b97f25");
    material.emissiveIntensity = 1.6;
  }
  if (state.assemblyError) {
    material.color.set("#b62f2f");
    material.emissive.set("#7d1515");
    material.emissiveIntensity = 1.6;
  }
}

function PartGeometryMesh({
  assemblyOpacity,
  compareContext,
  geometry,
  index,
  inspectionOutline,
  instanceMatrices,
  onInstancedMesh,
  part,
  transientState,
  transientStateKey,
  visualPresentation,
}: {
  assemblyOpacity: number;
  compareContext?: CompareSceneContext;
  geometry: BufferGeometry;
  index: number;
  inspectionOutline?: InspectionState;
  instanceMatrices: readonly number[][] | null;
  onInstancedMesh: (index: number, mesh: InstancedMesh | null) => void;
  part: PartDef;
  transientState: TransientMaterialState;
  transientStateKey: string;
  visualPresentation?: StandardMaterialPresentation;
}) {
  const materialOverride = useMemo(
    () =>
      geometry.userData.mechanicaMaterial as
        StandardMaterialPresentation | undefined,
    [geometry],
  );
  const textureVariant = compareContext
    ? "none"
    : (materialOverride?.textureVariant ??
      visualPresentation?.textureVariant ??
      defaultTextureVariant(part.material));
  const texturePresentation = useMemo<StandardMaterialPresentation>(
    () => ({
      shaderFeatureHash: textureShaderFeatureHash(textureVariant),
      textureVariant,
    }),
    [textureVariant],
  );
  const baseMaterialVariant = useMemo(
    () =>
      materialVariantKey(
        visualPresentation,
        texturePresentation,
        materialOverride,
      ),
    [materialOverride, texturePresentation, visualPresentation],
  );
  const baseMaterialKey = `base:${baseMaterialVariant}`;
  const baseMaterial = getMaterial(part.material, baseMaterialKey, () =>
    standardMaterial(
      part.material,
      visualPresentation,
      texturePresentation,
      materialOverride,
    ),
  );
  const activeMaterialKey = transientStateKey
    ? `${baseMaterialKey}:state:${transientStateKey}`
    : baseMaterialKey;
  const material = transientStateKey
    ? getMaterial(part.material, activeMaterialKey, () => {
        const transientMaterial = baseMaterial.clone();
        applyTransientMaterialState(
          transientMaterial,
          baseMaterial,
          transientState,
        );
        return transientMaterial;
      })
    : baseMaterial;
  const assemblyMaterial = useMemo(() => material.clone(), [material]);
  const renderedMaterial = assemblyOpacity < 1 ? assemblyMaterial : material;

  useEffect(() => {
    const lease = acquireMaterial(
      part.material,
      activeMaterialKey,
      () => material,
    );
    return lease.release;
  }, [activeMaterialKey, material, part.material]);

  useEffect(() => () => assemblyMaterial.dispose(), [assemblyMaterial]);

  useLayoutEffect(() => {
    if (!transientStateKey) return;
    applyTransientMaterialState(material, baseMaterial, transientState);
  }, [baseMaterial, material, transientState, transientStateKey]);

  useLayoutEffect(() => {
    const cacheKey = assemblyMaterial.userData.mechanicaMaterialCacheKey;
    assemblyMaterial.copy(material);
    assemblyMaterial.userData.mechanicaMaterialCacheKey = cacheKey;
    assemblyMaterial.opacity = material.opacity * assemblyOpacity;
    assemblyMaterial.transparent = material.transparent || assemblyOpacity < 1;
    assemblyMaterial.depthWrite = material.depthWrite && assemblyOpacity >= 1;
  }, [assemblyMaterial, assemblyOpacity, material]);

  return instanceMatrices ? (
    <instancedMesh
      args={[geometry, renderedMaterial, instanceMatrices.length]}
      castShadow
      receiveShadow
      ref={(mesh) => {
        onInstancedMesh(index, mesh);
        if (mesh) applyMechanicaInstanceMatrices(mesh, instanceMatrices);
      }}
    />
  ) : (
    <>
      <mesh
        castShadow
        geometry={geometry}
        material={renderedMaterial}
        receiveShadow
      />
      {inspectionOutline ? (
        <mesh
          geometry={geometry}
          material={
            inspectionOutline === "selected"
              ? selectedOutlineMaterial
              : hoveredOutlineMaterial
          }
          raycast={() => undefined}
          scale={inspectionOutline === "selected" ? 1.025 : 1.018}
          userData={{ mechanicaAffordance: true }}
        />
      ) : null}
    </>
  );
}

const PartNode = memo(function PartNode({
  aidCutawayPartIds = EMPTY_PART_IDS,
  aidHighlightPartIds = EMPTY_PART_IDS,
  appearance,
  assembly,
  assemblyProgress,
  childrenByParent,
  compareContext,
  crankByRod,
  displayState,
  driveCoachVisible,
  drivePartIds,
  explode,
  geometryScope,
  graph,
  interactionDisabled,
  maxAssemblyStep,
  module,
  onDraggingChange,
  onDrivePart,
  onDriveSuccess,
  part,
  partsById,
  schemeId,
  spotlightActive,
  spotlightPartIds,
  visiblePartIds,
}: PartNodeProps) {
  const group = useRef<Group>(null);
  const instancedMeshes = useRef<Array<InstancedMesh | null>>([]);
  const staticPositioned = useRef(false);
  const assemblyPointer = useRef<number | null>(null);
  const partPointerIntent = useRef<PointerIntent | null>(null);
  const assemblyStartPoint = useRef(new Vector3());
  const assemblyOffset = useRef(new Vector3());
  const hovered = useUiStore((state) => state.hoveredPartId === part.id);
  const selected = useUiStore((state) => state.selectedPartId === part.id);
  const setHoveredPartId = useUiStore((state) => state.setHoveredPartId);
  const setSelectedPartId = useUiStore((state) => state.setSelectedPartId);
  const geometryResource = useMemo(
    () =>
      machineGeometryCache.prepare(module, part.geometry, {
        consumerKey: `${geometryScope}:${part.id}`,
      }),
    [geometryScope, module, part],
  );
  const geometries = useMemo(
    () => [...partGeometryEntries(geometryResource.geometry)],
    [geometryResource.geometry],
  );
  const instanceMatrices = useMemo(
    () => geometries.map((geometry) => getMechanicaInstanceMatrices(geometry)),
    [geometries],
  );
  const hasAnimatedGeometry = geometries.some(
    (geometry) => typeof geometry.userData.mechanicaUpdate === "function",
  );
  const hasInstancedGeometry = instanceMatrices.some(Boolean);
  const visualPresentation = useMemo(
    () => visualMaterialFor(module.data.slug, part),
    [module.data.slug, part],
  );
  const comparePresentation = compareContext?.tintForPart(part.id);
  const compareColor = comparePresentation?.color;
  const compareEmissive = comparePresentation?.emissive;
  const compareOpacity = comparePresentation?.opacity;
  const layerPresentation =
    appearance && (!appearance.partIds || appearance.partIds.has(part.id))
      ? appearance
      : undefined;
  const reassembling = assembly?.state.mode === "reassemble";
  const seated = assembly?.state.seatedPartIds.has(part.id) ?? true;
  const assemblyError = assembly?.state.errorPartId === part.id;
  const assemblyHighlighted = assembly?.currentPartId === part.id;
  const assemblyStaged = reassembling && !seated;
  const inspectionState: InspectionState | undefined = reassembling
    ? undefined
    : selected
      ? "selected"
      : hovered
        ? "hovered"
        : undefined;
  const inspectionMaterialState = hasInstancedGeometry
    ? inspectionState
    : undefined;
  const aidCutaway = aidCutawayPartIds.includes(part.id);
  const aidHighlighted = aidHighlightPartIds.includes(part.id);
  const schemeHighlighted = part.schemeTags?.includes(schemeId ?? "") ?? false;
  const spotlightHighlighted =
    spotlightActive && spotlightPartIds.includes(part.id);
  const spotlightDimmed = spotlightActive && !spotlightHighlighted;
  const seismoscopeDragonSpotlight =
    module.data.slug === "seismoscope" &&
    spotlightHighlighted &&
    part.id.startsWith("dragon-");
  const layerColor = layerPresentation?.color;
  const layerOpacity = layerPresentation?.opacity;
  const transientStateKey = [
    aidCutaway ? "aid-cutaway" : "",
    aidHighlighted ? "aid-highlight" : "",
    schemeHighlighted ? "scheme" : "",
    spotlightHighlighted ? "spotlight" : "",
    spotlightDimmed ? "spotlight-dim" : "",
    seismoscopeDragonSpotlight ? "dragon" : "",
    compareColor ? `compare-color:${compareColor}` : "",
    compareEmissive ? `compare-emissive:${compareEmissive}` : "",
    compareOpacity !== undefined && compareOpacity < 1
      ? `compare-opacity:${compareOpacity}`
      : "",
    layerPresentation
      ? `layer:${layerPresentation.variant}:${layerColor ?? "base"}`
      : "",
    inspectionMaterialState ? `inspection:${inspectionMaterialState}` : "",
    assemblyHighlighted ? "assembly-highlight" : "",
    assemblyStaged ? "assembly-staged" : "",
    assemblyError ? "assembly-error" : "",
  ]
    .filter(Boolean)
    .join("|");
  const transientState: TransientMaterialState = {
    aidCutaway,
    aidHighlighted,
    assemblyError,
    assemblyHighlighted,
    assemblyStaged,
    compareColor,
    compareEmissive,
    compareOpacity,
    inspectionState: inspectionMaterialState,
    layerColor,
    layerOpacity,
    schemeHighlighted,
    seismoscopeDragonSpotlight,
    spotlightDimmed,
    spotlightHighlighted,
  };
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
  const baseQuaternion = useMemo(
    () => new Quaternion().setFromEuler(new Euler(...baseRotation)),
    [baseRotation],
  );
  const assemblyStep = part.assemblyStep ?? 0;
  const visibleStep = Math.floor(
    assemblyProgress * Math.max(maxAssemblyStep, 1),
  );
  const assemblyLocalProgress = assembly
    ? assemblyPartLocalProgress(assembly.plan, assemblyProgress, part.id)
    : 1;
  const assemblyAppearance =
    assembly?.state.mode === "step"
      ? assemblyPartAppearance(assemblyLocalProgress)
      : 1;
  const assemblyFlight = useMemo(
    () =>
      new Vector3(
        ...assemblyFlightOffset(
          part,
          assembly?.state.mode === "step" ? assemblyLocalProgress : 1,
        ),
      ),
    [assembly?.state.mode, assemblyLocalProgress, part],
  );
  const visible = assembly
    ? isPartVisibleInAssemblyStep(
        assembly.plan,
        assembly.state,
        part.id,
        assemblyProgress,
      )
    : assemblyStep <= visibleStep;
  const childParts = childrenByParent.get(part.id) ?? [];
  const renderOwnPart = !visiblePartIds || visiblePartIds.has(part.id);
  const partExplode = reassembling ? 0 : explode;
  const stagingSlot = assembly?.plan.stagingByPartId.get(part.id);
  const drivable = drivePartIds.has(part.id);
  const crank = crankByRod.get(part.id);
  const wheel = crank ? partsById.get(crank.wheel) : undefined;
  const staticTransform = Boolean(
    !reassembling &&
      !crank &&
      !part.joint &&
      !hasAnimatedGeometry &&
      !(module.data.slug === "astroclock" && part.id === "scoop-01"),
  );

  useLayoutEffect(() => geometryResource.retain(), [geometryResource]);
  useLayoutEffect(() => {
    staticPositioned.current = false;
  }, [
    assemblyAppearance,
    assemblyFlight,
    part,
    partExplode,
    reassembling,
    seated,
    stagingSlot,
    staticTransform,
  ]);

  const setInstancedMesh = useCallback(
    (index: number, mesh: InstancedMesh | null) => {
      instancedMeshes.current[index] = mesh;
    },
    [],
  );

  useFrame(() => {
    if (!group.current) return;
    if (staticTransform && staticPositioned.current) return;
    group.current.scale.setScalar(assemblyAppearance);
    const state = displayState.current ?? graph.state();
    if (reassembling && !seated && stagingSlot) {
      const parentObject = group.current.parent;
      const stagingPosition = new Vector3(...stagingSlot.position);
      if (parentObject) {
        parentObject.updateWorldMatrix(true, false);
        parentObject.worldToLocal(stagingPosition);
        const parentQuaternion = parentObject.getWorldQuaternion(
          new Quaternion(),
        );
        group.current.quaternion
          .copy(parentQuaternion.invert())
          .multiply(baseQuaternion);
      } else {
        group.current.quaternion.copy(baseQuaternion);
      }
      group.current.position.copy(stagingPosition).add(assemblyOffset.current);
      return;
    }
    // Composition order: kinematic seat, explode, assembly flight or staging,
    // pointer drag, then any joint translation below.
    if (crank && wheel) {
      const pose = planarCrankRodPose(
        state[crank.wheel] ?? 0,
        wheel.position,
        crank.crankRadius,
        crank.rodLength,
      );
      group.current.position
        .set(...pose.center)
        .addScaledVector(explodeVector, partExplode)
        .add(assemblyFlight);
      group.current.position.add(assemblyOffset.current);
      group.current.rotation.set(0, 0, pose.rotationZ);
      return;
    }
    const value = state[part.id] ?? 0;
    for (let index = 0; index < geometries.length; index += 1) {
      const geometry = geometries[index];
      const geometryUpdate = geometry.userData.mechanicaUpdate;
      const geometryAnimation = geometry.userData.mechanicaAnimation as
        { currentStateRad?: number } | undefined;
      if (
        typeof geometryUpdate === "function" &&
        geometryAnimation?.currentStateRad !== value
      ) {
        geometryUpdate(value);
        const mesh = instancedMeshes.current[index];
        const matrices = instanceMatrices[index];
        if (mesh && matrices) applyMechanicaInstanceMatrices(mesh, matrices);
      }
    }
    const attitude = attitudeQuaternion(state, part.id);
    group.current.position
      .copy(basePosition)
      .addScaledVector(explodeVector, partExplode)
      .add(assemblyFlight);
    group.current.position.add(assemblyOffset.current);
    group.current.rotation.set(...baseRotation);

    if (attitude) {
      group.current.quaternion.fromArray(attitude).normalize();
    } else if (module.data.slug === "astroclock" && part.id === "scoop-01") {
      group.current.rotateOnAxis(axis, value);
    } else if (part.joint?.kind === "revolute") {
      group.current.rotateOnAxis(axis, value);
    } else if (part.joint?.kind === "prismatic") {
      group.current.position.addScaledVector(axis, value);
    }
    staticPositioned.current = true;
  });

  if (!visible) return null;

  const beginAssemblyDrag = (event: ThreeEvent<PointerEvent>) => {
    if (interactionDisabled || !reassembling || seated) return;
    event.stopPropagation();
    assemblyPointer.current = event.pointerId;
    assemblyStartPoint.current.copy(event.point);
    assemblyOffset.current.set(0, 0, 0);
    assembly?.beginDrag(part.id);
    setSelectedPartId(part.id);
    (event.target as Element).setPointerCapture(event.pointerId);
  };
  const moveAssemblyPart = (event: ThreeEvent<PointerEvent>) => {
    if (assemblyPointer.current !== event.pointerId) return;
    event.stopPropagation();
    const parentObject = group.current?.parent;
    if (!parentObject) {
      assemblyOffset.current.copy(event.point).sub(assemblyStartPoint.current);
      return;
    }
    parentObject.updateWorldMatrix(true, false);
    const start = parentObject.worldToLocal(assemblyStartPoint.current.clone());
    const current = parentObject.worldToLocal(event.point.clone());
    assemblyOffset.current.copy(current.sub(start));
  };
  const endAssemblyDrag = (event: ThreeEvent<PointerEvent>) => {
    if (assemblyPointer.current !== event.pointerId) return;
    event.stopPropagation();
    assemblyPointer.current = null;
    if ((event.target as Element).hasPointerCapture(event.pointerId)) {
      (event.target as Element).releasePointerCapture(event.pointerId);
    }
    const bounds = new Box3();
    for (const geometry of geometries) {
      geometry.computeBoundingBox();
      if (geometry.boundingBox) bounds.union(geometry.boundingBox);
    }
    const radius = Math.max(
      bounds.isEmpty() ? 0.1 : bounds.getBoundingSphere(new Sphere()).radius,
      0.001,
    );
    const state = displayState.current ?? graph.state();
    const crank = crankByRod.get(part.id);
    const wheel = crank ? partsById.get(crank.wheel) : undefined;
    const seatPosition =
      crank && wheel
        ? new Vector3(
            ...planarCrankRodPose(
              state[crank.wheel] ?? 0,
              wheel.position,
              crank.crankRadius,
              crank.rodLength,
            ).center,
          )
        : basePosition.clone();
    if (!crank && part.joint?.kind === "prismatic") {
      seatPosition.addScaledVector(axis, state[part.id] ?? 0);
    }
    const parentObject = group.current?.parent;
    const seatWorldPosition = seatPosition.clone();
    if (parentObject) {
      parentObject.updateWorldMatrix(true, false);
      parentObject.localToWorld(seatWorldPosition);
    }
    group.current?.updateWorldMatrix(true, false);
    const currentWorldPosition = group.current?.getWorldPosition(new Vector3());
    const distance = currentWorldPosition
      ? currentWorldPosition.distanceTo(seatWorldPosition)
      : Number.POSITIVE_INFINITY;
    assembly?.attemptSeat(part.id, distance, radius);
    assembly?.endDrag();
    assemblyOffset.current.set(0, 0, 0);
  };

  const beginPartPointer = (event: ThreeEvent<PointerEvent>) => {
    if (interactionDisabled || reassembling || drivable) return;
    partPointerIntent.current = beginPointerIntent(event.nativeEvent);
  };
  const endPartPointer = (event: ThreeEvent<PointerEvent>) => {
    const intent = partPointerIntent.current;
    if (!intent || intent.pointerId !== event.pointerId) return;
    partPointerIntent.current = null;
    if (!isPointerTap(intent, event.nativeEvent)) return;
    event.stopPropagation();
    setSelectedPartId(part.id);
  };
  const cancelPartPointer = (event: ThreeEvent<PointerEvent>) => {
    if (partPointerIntent.current?.pointerId === event.pointerId) {
      partPointerIntent.current = null;
    }
  };
  const content = (
    <>
      {renderOwnPart
        ? geometries.map((geometry, index) => (
            <PartGeometryMesh
              assemblyOpacity={assemblyAppearance}
              compareContext={compareContext}
              geometry={geometry}
              index={index}
              inspectionOutline={
                hasInstancedGeometry ? undefined : inspectionState
              }
              instanceMatrices={instanceMatrices[index]}
              key={geometry.uuid}
              onInstancedMesh={setInstancedMesh}
              part={part}
              transientState={transientState}
              transientStateKey={transientStateKey}
              visualPresentation={visualPresentation}
            />
          ))
        : null}
      {childParts.map((child) => (
        <PartNode
          aidCutawayPartIds={aidCutawayPartIds}
          aidHighlightPartIds={aidHighlightPartIds}
          appearance={appearance}
          assembly={assembly}
          assemblyProgress={assemblyProgress}
          childrenByParent={childrenByParent}
          compareContext={compareContext}
          crankByRod={crankByRod}
          displayState={displayState}
          driveCoachVisible={driveCoachVisible}
          drivePartIds={drivePartIds}
          explode={explode}
          geometryScope={geometryScope}
          graph={graph}
          interactionDisabled={interactionDisabled}
          key={child.id}
          maxAssemblyStep={maxAssemblyStep}
          module={module}
          onDraggingChange={onDraggingChange}
          onDrivePart={onDrivePart}
          onDriveSuccess={onDriveSuccess}
          part={child}
          partsById={partsById}
          schemeId={schemeId}
          spotlightActive={spotlightActive}
          spotlightPartIds={spotlightPartIds}
          visiblePartIds={visiblePartIds}
        />
      ))}
    </>
  );

  return (
    <group
      name={part.id}
      onPointerCancel={
        interactionDisabled || reassembling ? undefined : cancelPartPointer
      }
      onPointerDown={(event) => {
        if (interactionDisabled) return;
        if (reassembling) {
          beginAssemblyDrag(event);
        } else {
          beginPartPointer(event);
        }
      }}
      onPointerMove={moveAssemblyPart}
      onPointerOut={() => {
        if (!interactionDisabled) {
          compareContext?.onHoverPart(undefined);
          if (useUiStore.getState().hoveredPartId === part.id) {
            setHoveredPartId(null);
          }
        }
      }}
      onPointerOver={(event) => {
        if (interactionDisabled) return;
        event.stopPropagation();
        compareContext?.onHoverPart(part.id);
        setHoveredPartId(part.id);
      }}
      onPointerUp={(event) => {
        if (reassembling) {
          endAssemblyDrag(event);
        } else {
          endPartPointer(event);
        }
      }}
      ref={group}
      visible={visible}
    >
      {drivable &&
      !reassembling &&
      !interactionDisabled &&
      (!compareContext || compareContext.driveNode === part.id) ? (
        <DriveHandle
          active={hovered || selected}
          coachTarget={
            driveCoachVisible &&
            !compareContext &&
            part.id === module.spec.primaryDrive
          }
          drive={(delta) => onDrivePart(part.id, delta)}
          gizmoTestId={`drive-gizmo-${compareContext ? `${compareContext.side}-` : ""}${part.id}`}
          onDraggingChange={onDraggingChange}
          onDriveSuccess={() => onDriveSuccess?.()}
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
});

interface MachineSceneProps {
  activeSpec: MachineSpec;
  aidCutawayPartIds?: readonly string[];
  aidHighlightPartIds?: readonly string[];
  appearance?: PartAppearance;
  assembly?: AssemblyController;
  assemblyProgress: number;
  blockedFitKeyToConsume?: string;
  cameraDiagnostics?: MutableRefObject<CameraDiagnostics | null>;
  compareContext?: CompareSceneContext;
  displayState: { current: Record<string, number> | null };
  driveCoachVisible?: boolean;
  explode: number;
  geometryReadyAt: number | null;
  graph: IKinematicGraph;
  introPlayed?: MutableRefObject<boolean>;
  interactionDisabled?: boolean;
  module: MachineModule;
  onDrivePart: (partId: string, delta: number) => void;
  onDriveSuccess?: () => void;
  onGeometryCommitted: (committedAt: number) => void;
  paused: boolean;
  schemeId?: string;
  shadowDiagnostics?: MutableRefObject<ShadowDiagnostics>;
  showScene?: boolean;
  spotlightActive: boolean;
  spotlightPartIds: string[];
  spotlightRunId: number;
  storyCamera?: StoryStageState["camera"];
  storyHighlightPartIds?: string[];
  transitionLayer?: {
    appearance: PartAppearance;
    spec: MachineSpec;
  };
}

function StoryCameraRig({ pose }: { pose?: StoryStageState["camera"] }) {
  const camera = useThree((state) => state.camera);
  const targetPosition = useMemo(() => new Vector3(), []);
  const targetPoint = useMemo(() => new Vector3(), []);
  const targetQuaternion = useMemo(() => new Quaternion(), []);
  const lookAtMatrix = useMemo(() => new Matrix4(), []);

  useFrame(() => {
    if (!pose) return;
    targetPosition.set(...pose.position);
    targetPoint.set(...pose.target);
    lookAtMatrix.lookAt(targetPosition, targetPoint, camera.up);
    targetQuaternion.setFromRotationMatrix(lookAtMatrix);
    camera.position.copy(targetPosition);
    camera.quaternion.copy(targetQuaternion);
    camera.updateMatrixWorld();
  });

  return null;
}

function SceneComplexityProbe({
  count,
  frames,
  memory,
  sceneRef,
  sceneryCount,
  sceneryRaycastViolations,
}: {
  count: { current: number };
  frames: { current: number };
  memory: { current: { geometries: number; textures: number } };
  sceneRef: { current: Scene | null };
  sceneryCount: { current: number };
  sceneryRaycastViolations: { current: number };
}) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const trianglesByGeometry = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    sceneRef.current = scene;
    return () => {
      if (sceneRef.current === scene) sceneRef.current = null;
    };
  }, [scene, sceneRef]);

  useFrame(() => {
    frames.current += 1;
    let triangles = 0;
    let sceneryTriangles = 0;
    let raycastViolations = 0;
    scene.traverse((object) => {
      const mesh = object as typeof object & {
        count?: number;
        geometry?: BufferGeometry;
        isInstancedMesh?: boolean;
        isMesh?: boolean;
      };
      if (!mesh.isMesh || !mesh.geometry || mesh.userData.mechanicaAffordance) {
        return;
      }
      let geometryTriangles = trianglesByGeometry.current.get(
        mesh.geometry.uuid,
      );
      if (geometryTriangles === undefined) {
        const vertices =
          mesh.geometry.index?.count ??
          mesh.geometry.getAttribute("position")?.count ??
          0;
        geometryTriangles = Math.floor(vertices / 3);
        trianglesByGeometry.current.set(mesh.geometry.uuid, geometryTriangles);
      }
      const meshTriangles =
        geometryTriangles *
        (mesh.isInstancedMesh ? (mesh.count ?? 0) : 1);
      if (mesh.userData.mechanicaScenery) {
        sceneryTriangles += meshTriangles;
        if (mesh.raycast !== SCENERY_RAYCAST_DISABLED) raycastViolations += 1;
      } else {
        triangles += meshTriangles;
      }
    });
    count.current = triangles;
    sceneryCount.current = sceneryTriangles;
    sceneryRaycastViolations.current = raycastViolations;
    memory.current = {
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
    };
  });

  return null;
}

function ShadowBudget({
  diagnostics,
  fitKey,
  machineRoot,
  partIds,
}: {
  diagnostics: { current: ShadowDiagnostics };
  fitKey: string;
  machineRoot: RefObject<Group | null>;
  partIds: ReadonlySet<string>;
}) {
  const scene = useThree((state) => state.scene);
  const configuredKey = useRef<string | null>(null);

  useFrame(() => {
    if (configuredKey.current === fitKey || !machineRoot.current) return;
    const machineBounds = mechanicaBounds(machineRoot.current);
    if (machineBounds.isEmpty()) return;

    const shadowLights: DirectionalLight[] = [];
    scene.traverse((object) => {
      const light = object as DirectionalLight;
      if (!light.isDirectionalLight || !light.castShadow) return;
      shadowLights.push(light);
    });
    const shadowLight = shadowLights[0];
    if (!shadowLight) return;

    const machineSphere = machineBounds.getBoundingSphere(new Sphere());
    let casters = 0;
    let suppressed = 0;
    const meshesByPart = new Map<string, Mesh[]>();
    machineRoot.current.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh || mesh.userData.mechanicaAffordance) return;
      let parent: Object3D | null = mesh.parent;
      while (parent && !partIds.has(parent.name)) parent = parent.parent;
      if (!parent) return;
      const meshes = meshesByPart.get(parent.name) ?? [];
      meshes.push(mesh);
      meshesByPart.set(parent.name, meshes);
    });
    const shadowCandidates = [...meshesByPart.values()]
      .map((meshes) => {
        const partBounds = new Box3();
        for (const mesh of meshes) partBounds.union(mechanicaBounds(mesh));
        return {
          meshes,
          radius: partBounds.isEmpty()
            ? 0
            : partBounds.getBoundingSphere(new Sphere()).radius,
        };
      })
      .sort((first, second) => second.radius - first.radius);
    let remainingShadowMeshes = 12;
    for (const candidate of shadowCandidates) {
      const castShadow =
        candidate.radius >= machineSphere.radius * 0.02 &&
        candidate.meshes.length <= remainingShadowMeshes;
      if (castShadow) remainingShadowMeshes -= candidate.meshes.length;
      const { meshes } = candidate;
      for (const mesh of meshes) mesh.castShadow = castShadow;
      if (castShadow) casters += meshes.length;
      else suppressed += meshes.length;
    }

    const direction = shadowLight.position
      .clone()
      .sub(shadowLight.target.position);
    if (direction.lengthSq() < 1e-8) direction.set(3, 5, 4);
    const lightDistance = Math.max(machineSphere.radius * 3, 1);
    shadowLight.position
      .copy(machineSphere.center)
      .addScaledVector(direction.normalize(), lightDistance);
    shadowLight.target.position.copy(machineSphere.center);
    shadowLight.target.updateMatrixWorld();
    shadowLight.updateMatrixWorld();
    shadowLight.shadow.updateMatrices(shadowLight);

    const shadowCamera = shadowLight.shadow.camera as OrthographicCamera;
    const lightBounds = new Box3();
    for (const x of [machineBounds.min.x, machineBounds.max.x]) {
      for (const y of [machineBounds.min.y, machineBounds.max.y]) {
        for (const z of [machineBounds.min.z, machineBounds.max.z]) {
          lightBounds.expandByPoint(
            new Vector3(x, y, z).applyMatrix4(shadowCamera.matrixWorldInverse),
          );
        }
      }
    }
    const padding = Math.max(machineSphere.radius * 0.1, 0.01);
    shadowCamera.left = lightBounds.min.x - padding;
    shadowCamera.right = lightBounds.max.x + padding;
    shadowCamera.bottom = lightBounds.min.y - padding;
    shadowCamera.top = lightBounds.max.y + padding;
    shadowCamera.near = Math.max(0.01, -lightBounds.max.z - padding);
    shadowCamera.far = Math.max(
      shadowCamera.near + 0.01,
      -lightBounds.min.z + padding,
    );
    shadowCamera.updateProjectionMatrix();
    if (
      shadowLight.shadow.mapSize.width !== 1024 ||
      shadowLight.shadow.mapSize.height !== 1024
    ) {
      shadowLight.shadow.map?.dispose();
      shadowLight.shadow.map = null;
      shadowLight.shadow.mapSize.set(1024, 1024);
    }
    shadowLight.shadow.needsUpdate = true;
    diagnostics.current = {
      casters,
      castingLights: shadowLights.length,
      configured: true,
      mapSize: shadowLight.shadow.mapSize.width,
      suppressed,
    };
    configuredKey.current = fitKey;
  });

  return null;
}

function GhostPartLayer({
  appearance,
  geometryScope,
  module,
  spec,
}: {
  appearance: PartAppearance;
  geometryScope: string;
  module: MachineModule;
  spec: MachineSpec;
}) {
  const graph = useMemo(() => new KinematicGraph(spec), [spec]);
  const displayState = useRef<Record<string, number>>(graph.state());
  const partIds = useMemo(
    () => new Set(spec.parts.map((part) => part.id)),
    [spec.parts],
  );
  const rootParts = useMemo(
    () =>
      spec.parts.filter((part) => !part.parent || !partIds.has(part.parent)),
    [partIds, spec.parts],
  );
  const partsById = useMemo(
    () => new Map(spec.parts.map((part) => [part.id, part])),
    [spec.parts],
  );
  const crankByRod = useMemo(
    () =>
      new Map(
        spec.constraints.flatMap((constraint) =>
          constraint.type === "crank"
            ? ([[constraint.rod, constraint]] as const)
            : [],
        ),
      ),
    [spec.constraints],
  );
  const drivePartIds = useMemo(
    () =>
      new Set([
        spec.primaryDrive,
        ...spec.driveNodes,
        ...spec.parts.filter((part) => part.interactive).map((part) => part.id),
      ]),
    [spec.driveNodes, spec.parts, spec.primaryDrive],
  );
  const childrenByParent = useMemo(() => {
    const children = new Map<string, PartDef[]>();
    for (const part of spec.parts) {
      if (!part.parent) continue;
      const siblings = children.get(part.parent) ?? [];
      siblings.push(part);
      children.set(part.parent, siblings);
    }
    return children;
  }, [spec.parts]);
  const maxAssemblyStep = useMemo(
    () => Math.max(1, ...spec.parts.map((part) => part.assemblyStep ?? 0)),
    [spec.parts],
  );

  useLayoutEffect(() => {
    displayState.current = graph.state();
  }, [graph]);

  return rootParts.map((part) => (
    <PartNode
      appearance={appearance}
      assemblyProgress={1}
      childrenByParent={childrenByParent}
      crankByRod={crankByRod}
      displayState={displayState}
      drivePartIds={drivePartIds}
      explode={0}
      geometryScope={geometryScope}
      graph={graph}
      interactionDisabled
      key={`ghost:${part.id}`}
      maxAssemblyStep={maxAssemblyStep}
      module={module}
      onDraggingChange={() => undefined}
      onDrivePart={() => undefined}
      part={part}
      partsById={partsById}
      spotlightActive={false}
      spotlightPartIds={EMPTY_PART_IDS}
      visiblePartIds={appearance.partIds}
    />
  ));
}

function AssemblyStagingGround({
  assembly,
}: {
  assembly?: AssemblyController;
}) {
  const layout = useMemo(() => {
    if (!assembly) return null;
    const slots = [...assembly.plan.stagingByPartId.values()];
    if (slots.length === 0) return null;
    const minimumX = Math.min(...slots.map((slot) => slot.position[0]));
    const maximumX = Math.max(...slots.map((slot) => slot.position[0]));
    const minimumZ = Math.min(...slots.map((slot) => slot.position[2]));
    const maximumZ = Math.max(...slots.map((slot) => slot.position[2]));
    const padding = Math.max(...slots.map((slot) => slot.radius)) * 1.5;
    return {
      center: [(minimumX + maximumX) / 2, (minimumZ + maximumZ) / 2] as const,
      divisions: Math.max(2, Math.ceil(Math.sqrt(slots.length))),
      size: Math.max(maximumX - minimumX, maximumZ - minimumZ) + padding * 2,
    };
  }, [assembly]);

  if (
    !assembly ||
    !layout ||
    assembly.state.mode !== "reassemble" ||
    assembly.state.complete
  ) {
    return null;
  }
  return (
    <>
      <gridHelper
        args={[layout.size, layout.divisions, "#b98b42", "#554328"]}
        position={[
          layout.center[0],
          assembly.plan.stagingGroundY + 0.0005,
          layout.center[1],
        ]}
        raycast={() => undefined}
        userData={{ mechanicaAffordance: true }}
      />
      {[...assembly.plan.stagingByPartId.entries()].map(([partId, slot]) => (
        <mesh
          key={`assembly-slot:${partId}`}
          position={[
            slot.position[0],
            assembly.plan.stagingGroundY + 0.01,
            slot.position[2],
          ]}
          raycast={() => undefined}
          renderOrder={10}
          rotation={[-Math.PI / 2, 0, 0]}
          userData={{ mechanicaAffordance: true }}
        >
          <torusGeometry
            args={[Math.max(0.12, Math.min(slot.radius * 0.35, 0.35)), 0.018, 8, 32]}
          />
          <meshBasicMaterial
            color="#d9b86d"
            depthTest={false}
            depthWrite={false}
            transparent
          />
        </mesh>
      ))}
    </>
  );
}

function MachineScene({
  activeSpec,
  aidCutawayPartIds = EMPTY_PART_IDS,
  aidHighlightPartIds = EMPTY_PART_IDS,
  appearance,
  assembly,
  assemblyProgress,
  blockedFitKeyToConsume,
  cameraDiagnostics,
  compareContext,
  displayState,
  driveCoachVisible,
  explode,
  geometryReadyAt,
  graph,
  introPlayed,
  interactionDisabled,
  module,
  onDrivePart,
  onDriveSuccess,
  onGeometryCommitted,
  paused,
  schemeId,
  shadowDiagnostics,
  showScene,
  spotlightActive,
  spotlightPartIds,
  spotlightRunId,
  storyCamera,
  storyHighlightPartIds,
  transitionLayer,
}: MachineSceneProps) {
  const camera = useThree((state) => state.camera);
  const dragging = useRef(false);
  const escapementElapsed = useRef(0);
  const floorMeasurement = useRef({
    readyAt: null as number | null,
    settleFrames: 0,
  });
  const machineRoot = useRef<Group>(null);
  const orbitControls = useRef<OrbitControlsHandle>(null);
  const [cameraIntroActive, setCameraIntroActive] = useState(false);
  const [spotlightHandoffActive, setSpotlightHandoffActive] = useState(false);
  const [machineFloorY, setMachineFloorY] = useState(-0.45);
  const spotlightWasActive = useRef(false);
  const partIds = useMemo(
    () => new Set(activeSpec.parts.map((part) => part.id)),
    [activeSpec],
  );
  const viewerProfile =
    module.data.slug === "demo"
      ? {
          ...DEMO_VIEWER_PROFILE,
          focusPartIds: undefined,
          homePose: undefined,
        }
      : VIEWER_PROFILES[module.data.slug];
  const desiredAssemblyCameraState =
    assembly?.state.mode === "reassemble"
      ? assembly.state.complete
        ? "reassemble-complete"
        : "reassemble-staged"
      : "default";
  const [assemblyCameraState, setAssemblyCameraState] = useState(
    desiredAssemblyCameraState,
  );
  useEffect(() => {
    if (assemblyCameraState === desiredAssemblyCameraState) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        setAssemblyCameraState(desiredAssemblyCameraState);
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [assemblyCameraState, desiredAssemblyCameraState]);
  const assemblyCameraPending =
    assemblyCameraState !== desiredAssemblyCameraState;
  const controlsEnabled =
    !cameraIntroActive &&
    !interactionDisabled &&
    !spotlightActive &&
    !spotlightHandoffActive &&
    !storyCamera;
  const sceneVisible = Boolean(
    showScene && module.scene && !compareContext && !storyCamera,
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
  const drivePartIds = useMemo(
    () =>
      new Set([
        activeSpec.primaryDrive,
        ...activeSpec.driveNodes,
        ...activeSpec.parts
          .filter((part) => part.interactive)
          .map((part) => part.id),
      ]),
    [activeSpec.driveNodes, activeSpec.parts, activeSpec.primaryDrive],
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
  const highlightedPartIds = storyHighlightPartIds ?? spotlightPartIds;
  const highlightActive = spotlightActive || highlightedPartIds.length > 0;
  const geometryScope = compareContext
    ? `compare:${compareContext.side}`
    : storyCamera
      ? "story"
      : "viewer";
  const frameState = useRef<Record<string, number>>(graph.state());
  const setDragging = useCallback((nextDragging: boolean) => {
    dragging.current = nextDragging;
  }, []);

  useLayoutEffect(() => {
    onGeometryCommitted(performance.now());
  }, [onGeometryCommitted]);

  useLayoutEffect(() => {
    frameState.current = displayState.current ?? graph.state();
  }, [displayState, graph]);

  useLayoutEffect(() => {
    if (cameraDiagnostics?.current) {
      cameraDiagnostics.current.controlsEnabled = Boolean(controlsEnabled);
      cameraDiagnostics.current.distance = camera.position.distanceTo(
        cameraDiagnostics.current.target,
      );
    }
  }, [camera, cameraDiagnostics, controlsEnabled]);

  useLayoutEffect(() => {
    if (spotlightActive) {
      spotlightWasActive.current = true;
      return;
    }
    if (!spotlightWasActive.current) return;
    spotlightWasActive.current = false;
    setSpotlightHandoffActive(true);
    if (orbitControls.current) orbitControls.current.enabled = false;
    if (cameraDiagnostics?.current) {
      cameraDiagnostics.current.controlsEnabled = false;
      cameraDiagnostics.current.phase = "spotlight";
    }
    const frame = requestAnimationFrame(() => {
      setSpotlightHandoffActive(false);
      if (orbitControls.current) orbitControls.current.enabled = true;
      if (cameraDiagnostics?.current) {
        cameraDiagnostics.current.controlsEnabled = true;
        cameraDiagnostics.current.phase = "idle";
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [cameraDiagnostics, spotlightActive]);

  useFrame((_, delta) => {
    const measurement = floorMeasurement.current;
    if (geometryReadyAt === null) {
      measurement.readyAt = null;
      measurement.settleFrames = 0;
    } else if (measurement.readyAt !== geometryReadyAt) {
      if (measurement.settleFrames < 2) {
        measurement.settleFrames += 1;
      } else if (machineRoot.current) {
        const bounds = mechanicaBounds(machineRoot.current);
        if (!bounds.isEmpty()) {
          const nextFloorY = module.scene?.ground?.y ?? bounds.min.y;
          setMachineFloorY((current) =>
            Math.abs(current - nextFloorY) < 1e-6 ? current : nextFloorY,
          );
          measurement.readyAt = geometryReadyAt;
          measurement.settleFrames = 0;
        }
      }
    }
    if (!paused && !dragging.current && module.spec.slug !== "seismoscope") {
      if (activeSpec.escapement) {
        escapementElapsed.current += delta;
        if (
          escapementElapsed.current >= activeSpec.escapement.fillSecondsPerScoop
        ) {
          escapementElapsed.current = 0;
          onDrivePart(activeSpec.primaryDrive, activeSpec.escapement.stepRad);
        }
      } else {
        onDrivePart(activeSpec.primaryDrive, delta * 0.12);
      }
    }
    frameState.current = displayState.current ?? graph.state();
  }, -1);

  return (
    <>
      {sceneVisible && module.scene ? (
        <MachineEnvironment
          floorY={machineFloorY}
          module={module}
          scene={module.scene}
        />
      ) : (
        <>
          <color args={["#090a0a"]} attach="background" />
          <hemisphereLight
            args={["#d7e3ef", "#2d2118", 0.35]}
            position={[0, 2, 0]}
          />
          <directionalLight
            castShadow
            color="#ffe1b6"
            intensity={2.2}
            position={[3, 5, 4]}
          />
          <directionalLight
            color="#9fc7da"
            intensity={0.75}
            position={[-4, 2, -3]}
          />
        </>
      )}
      <OrbitControls
        autoRotate={false}
        enableDamping
        enabled={controlsEnabled}
        makeDefault
        maxAzimuthAngle={viewerProfile.maxAzimuthAngle}
        maxPolarAngle={viewerProfile.maxPolarAngle}
        minAzimuthAngle={viewerProfile.minAzimuthAngle}
        minPolarAngle={viewerProfile.minPolarAngle}
        onChange={() => {
          const target = orbitControls.current?.target;
          if (target && compareContext) {
            compareContext.onCameraTargetChange([target.x, target.y, target.z]);
          }
        }}
        ref={(controls) => {
          orbitControls.current = controls;
          if (controls && compareContext) {
            controls.target.set(...compareContext.cameraTarget);
          }
        }}
        target={compareContext?.cameraTarget}
      />
      {transitionLayer ? (
        <GhostPartLayer
          appearance={transitionLayer.appearance}
          geometryScope={`${geometryScope}:ghost`}
          module={module}
          spec={transitionLayer.spec}
        />
      ) : null}
      <group ref={machineRoot}>
        {rootParts.map((part) => (
          <PartNode
            aidCutawayPartIds={aidCutawayPartIds}
            aidHighlightPartIds={aidHighlightPartIds}
            appearance={appearance}
            assembly={assembly}
            assemblyProgress={assemblyProgress}
            childrenByParent={childrenByParent}
            compareContext={compareContext}
            crankByRod={crankByRod}
            displayState={frameState}
            driveCoachVisible={driveCoachVisible}
            drivePartIds={drivePartIds}
            explode={explode}
            geometryScope={geometryScope}
            graph={graph}
            interactionDisabled={interactionDisabled}
            key={part.id}
            maxAssemblyStep={maxAssemblyStep}
            module={module}
            onDraggingChange={setDragging}
            onDrivePart={onDrivePart}
            onDriveSuccess={onDriveSuccess}
            part={part}
            partsById={partsById}
            schemeId={schemeId}
            spotlightActive={highlightActive}
            spotlightPartIds={highlightedPartIds}
          />
        ))}
      </group>
      {shadowDiagnostics ? (
        <ShadowBudget
          diagnostics={shadowDiagnostics}
          fitKey={`${geometryReadyAt ?? "warming"}:${sceneVisible ? "scene" : "plain"}:${machineFloorY.toFixed(6)}`}
          machineRoot={machineRoot}
          partIds={partIds}
        />
      ) : null}
      <AssemblyStagingGround assembly={assembly} />
      <CameraDirector
        blocked={spotlightActive}
        blockedFitKeyToConsume={blockedFitKeyToConsume}
        controls={orbitControls}
        diagnostics={cameraDiagnostics}
        enabled={!storyCamera && !assemblyCameraPending}
        explode={explode}
        fitFullBounds={Boolean(compareContext)}
        fitKey={cameraFitKey(
          module.data.slug,
          schemeId,
          assemblyCameraState,
          explode,
        )}
        fitWholeMachine={assemblyCameraState === "reassemble-staged"}
        introPlayed={introPlayed}
        machineRoot={machineRoot}
        onIntroActiveChange={setCameraIntroActive}
        onTargetChange={compareContext?.onCameraTargetChange}
        playIntro={!compareContext && module.spec.slug !== "demo"}
        profile={viewerProfile}
        readyAt={geometryReadyAt}
        spec={activeSpec}
      />
      {!compareContext && !storyCamera && !sceneVisible ? (
        <ContactShadows
          blur={2.5}
          far={3}
          frames={module.spec.slug === "demo" ? 1 : Infinity}
          opacity={0.38}
          position={[0, machineFloorY + 0.002, 0]}
          scale={2}
        />
      ) : null}
      <StoryCameraRig pose={storyCamera} />
      {!storyCamera ? (
        <SpotlightRig
          active={spotlightActive && module.spec.slug === "demo"}
          controls={orbitControls}
          diagnostics={cameraDiagnostics}
          runId={spotlightRunId}
          targetPartId={spotlightPartIds.at(-1)}
        />
      ) : null}
    </>
  );
}

function CompareSceneAdapter({
  context,
  module,
}: {
  context: CompareSceneContext;
  module: MachineModule;
}) {
  const displayState = useRef<Record<string, number> | null>(null);
  const drivePart = useCallback(
    (_partId: string, delta: number) => context.driveDelta(delta),
    [context.driveDelta],
  );

  return (
    <MachineScene
      activeSpec={context.spec}
      assemblyProgress={1}
      compareContext={context}
      displayState={displayState}
      explode={0}
      geometryReadyAt={context.geometryReadyAt}
      graph={context.graph}
      module={module}
      onDrivePart={drivePart}
      onGeometryCommitted={context.onGeometryCommitted}
      paused
      schemeId={context.schemeId}
      spotlightActive={false}
      spotlightPartIds={EMPTY_PART_IDS}
      spotlightRunId={0}
    />
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
  if (spec.slug === "loom" && type === "treadle:press") {
    for (let index = 0; index < 8; index += 1) {
      captured[`heddle-${index}`] = 0;
    }
    captured["warp-shed"] = 0;
    captured["warp-shed-odd"] = 0;
  } else if (spec.slug === "loom" && type === "heddle:lift") {
    captured["warp-shed"] = 0;
    captured["warp-shed-odd"] = 0;
  }
  return captured;
}

function AspectAwareStoryCamera({
  pose,
}: {
  pose: StoryStageState["camera"];
}) {
  const camera = useThree((threeState) => threeState.camera);
  const size = useThree((threeState) => threeState.size);
  const authoredPosition = useMemo(() => new Vector3(), []);
  const target = useMemo(() => new Vector3(), []);
  const targetQuaternion = useMemo(() => new Quaternion(), []);
  const lookAtMatrix = useMemo(() => new Matrix4(), []);

  useFrame(() => {
    const aspect = size.width / size.height;
    const compensation = aspect >= 1.6 ? 1 : Math.min(1.45, 1.6 / aspect);
    authoredPosition.set(...pose.position);
    target.set(...pose.target);
    camera.position.copy(authoredPosition).multiplyScalar(compensation);
    lookAtMatrix.lookAt(camera.position, target, camera.up);
    targetQuaternion.setFromRotationMatrix(lookAtMatrix);
    camera.quaternion.copy(targetQuaternion);
    camera.updateMatrixWorld();
  });

  return null;
}

export function MachineStoryStage({
  module,
  spotlightRunId,
  state,
}: {
  module: MachineModule;
  spotlightRunId: number;
  state: StoryStageState;
}) {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage === "en" ? "en" : "zh";
  const [contextLost, setContextLost] = useState(false);
  const contextLossCleanup = useRef<(() => void) | null>(null);
  const [storedStoryReady, setStoredStoryReady] = useState<{
    at: number;
    key: string;
    module: MachineModule;
    schemeId: string | undefined;
    spec: MachineSpec;
  } | null>(null);
  const storedActiveSelection =
    storedStoryReady?.module === module ? storedStoryReady : null;
  const storyReadyAt = storedActiveSelection?.at ?? null;
  const fromSchemeId = state.fromStep.schemeId ?? module.defaultSchemeId;
  const toSchemeId = state.toStep.schemeId ?? module.defaultSchemeId;
  const fromSpec = useMemo(
    () =>
      applySchemePatch(
        module.spec,
        fromSchemeId ? module.schemes?.[fromSchemeId] : undefined,
      ),
    [fromSchemeId, module.schemes, module.spec],
  );
  const toSpec = useMemo(
    () =>
      applySchemePatch(
        module.spec,
        toSchemeId ? module.schemes?.[toSchemeId] : undefined,
      ),
    [module.schemes, module.spec, toSchemeId],
  );
  const schemeTransition = fromSchemeId !== toSchemeId;
  const requestedShowingFromScheme =
    !schemeTransition || state.segmentProgress < 0.5;
  const showingFromScheme = requestedShowingFromScheme;
  const fromActiveWarmup = useMachineGeometryWarmup({
    consumerScope: "story",
    module,
    spec: fromSpec,
    warmupKey: `${module.data.slug}:${fromSchemeId ?? "default"}:from-active`,
  });
  const toGhostWarmup = useMachineGeometryWarmup({
    consumerScope: "story:ghost",
    module,
    spec: schemeTransition ? toSpec : null,
    warmupKey: `${module.data.slug}:${toSchemeId ?? "default"}:to-ghost`,
  });
  const toActiveEnabled = schemeTransition && toGhostWarmup.prepared;
  const toActiveWarmup = useMachineGeometryWarmup({
    consumerScope: "story",
    module,
    spec: toActiveEnabled ? toSpec : null,
    warmupKey: `${module.data.slug}:${toSchemeId ?? "default"}:to-active`,
  });
  const fromGhostEnabled = toActiveEnabled && toActiveWarmup.prepared;
  const fromGhostWarmup = useMachineGeometryWarmup({
    consumerScope: "story:ghost",
    module,
    spec: fromGhostEnabled ? fromSpec : null,
    warmupKey: `${module.data.slug}:${fromSchemeId ?? "default"}:from-ghost`,
  });
  const requestedSchemeId = showingFromScheme ? fromSchemeId : toSchemeId;
  const requestedSpec = showingFromScheme ? fromSpec : toSpec;
  const requestedGeometryKey = `${module.data.slug}:${requestedSchemeId ?? "default"}:${showingFromScheme ? "from-active" : "to-active"}`;
  const ghostSpec = schemeTransition
    ? showingFromScheme
      ? toSpec
      : fromSpec
    : null;
  const storyWarmups = schemeTransition
    ? [fromActiveWarmup, toGhostWarmup, toActiveWarmup, fromGhostWarmup]
    : [fromActiveWarmup];
  const activeWarmup = showingFromScheme ? fromActiveWarmup : toActiveWarmup;
  const ghostWarmup = schemeTransition
    ? showingFromScheme
      ? toGhostWarmup
      : fromGhostWarmup
    : null;
  const activeGeometryPrepared = showingFromScheme
    ? activeWarmup.prepared
    : toActiveEnabled && activeWarmup.prepared;
  const ghostGeometryPrepared = !schemeTransition
    ? true
    : showingFromScheme
      ? ghostWarmup?.prepared === true
      : fromGhostEnabled && ghostWarmup?.prepared === true;
  const commitGhostGeometry = ghostWarmup?.commit;
  const activeSelection = activeGeometryPrepared
    ? {
        key: requestedGeometryKey,
        schemeId: requestedSchemeId,
        spec: requestedSpec,
      }
    : storedActiveSelection;
  const schemeId = activeSelection
    ? activeSelection.schemeId
    : requestedSchemeId;
  const activeSpec = activeSelection?.spec ?? requestedSpec;
  const geometryPrepared = activeSelection !== null;
  const renderingRequestedGeometry =
    activeGeometryPrepared && activeSelection?.key === requestedGeometryKey;
  const renderingTransition =
    schemeTransition && renderingRequestedGeometry && ghostGeometryPrepared;
  const commitGeometry = useCallback(
    (committedAt: number) => {
      if (!renderingRequestedGeometry) return;
      activeWarmup.commit(committedAt);
      if (renderingTransition) commitGhostGeometry?.(committedAt);
      setStoredStoryReady((current) => {
        if (
          current?.module === module &&
          current.key === requestedGeometryKey &&
          current.schemeId === requestedSchemeId &&
          current.spec === requestedSpec
        ) {
          return current;
        }
        return {
          at: committedAt,
          key: requestedGeometryKey,
          module,
          schemeId: requestedSchemeId,
          spec: requestedSpec,
        };
      });
    },
    [
      activeWarmup.commit,
      commitGhostGeometry,
      module,
      renderingRequestedGeometry,
      renderingTransition,
      requestedGeometryKey,
      requestedSchemeId,
      requestedSpec,
    ],
  );
  const geometryStatus = storyWarmups.some(
    (warmup) => warmup.status === "failed",
  )
    ? "failed"
    : storyReadyAt !== null
      ? "committed"
      : activeGeometryPrepared
        ? "prepared"
        : "warming";
  const geometryBuilt = storyWarmups.reduce(
    (total, warmup) => total + warmup.built,
    0,
  );
  const geometryTotal = storyWarmups.reduce(
    (total, warmup) => total + warmup.total,
    0,
  );
  const graph = useMemo(() => new KinematicGraph(activeSpec), [activeSpec]);
  const cutawayAppearance = useMemo(
    () =>
      state.activeStep.cutaway
        ? {
            opacity: state.activeStep.cutaway.opacity,
            partIds: new Set(state.activeStep.cutaway.partIds),
            variant: "story-cutaway",
          }
        : undefined,
    [state.activeStep.cutaway],
  );
  const displayState = useRef<Record<string, number> | null>(null);
  const driveState = useRef<{ node: string; value: number } | null>(null);
  const spotlightFrame = useRef<number | null>(null);
  const [spotlightActive, setSpotlightActive] = useState(false);
  const [spotlightParts, setSpotlightParts] = useState<string[]>([]);
  const [spotlightRuns, setSpotlightRuns] = useState(0);
  const drivePart = useCallback(
    (partId: string, delta: number) => {
      graph.drive(partId, delta);
    },
    [graph],
  );

  useEffect(
    () => () => {
      contextLossCleanup.current?.();
    },
    [],
  );

  useLayoutEffect(() => {
    driveState.current = null;
    displayState.current = null;
  }, [graph]);

  useLayoutEffect(() => {
    if (state.spotlight) return;
    const driveTo = state.driveTo;
    if (!driveTo) {
      const previous = driveState.current;
      if (previous && Math.abs(previous.value) > 1e-10) {
        graph.drive(previous.node, -previous.value);
      }
      driveState.current = null;
      displayState.current = null;
      return;
    }
    const previous = driveState.current;
    if (previous && previous.node !== driveTo.node) {
      if (Math.abs(previous.value) > 1e-10) {
        graph.drive(previous.node, -previous.value);
      }
      driveState.current = null;
    }
    const delta =
      previous?.node === driveTo.node
        ? driveTo.value - previous.value
        : driveTo.value;
    if (Math.abs(delta) > 1e-10) graph.drive(driveTo.node, delta);
    driveState.current = { node: driveTo.node, value: driveTo.value };
    displayState.current = graph.state();
  }, [graph, state.driveTo, state.spotlight]);

  useEffect(() => {
    if (spotlightFrame.current !== null) {
      cancelAnimationFrame(spotlightFrame.current);
      spotlightFrame.current = null;
    }
    if (!state.spotlight || spotlightRunId === 0) {
      setSpotlightActive(false);
      setSpotlightParts([]);
      return;
    }

    const trigger = module.mechanism?.triggers.find(
      (candidate) => candidate.id === "spotlight",
    );
    if (!trigger) return;

    const initialState = graph.state();
    const captured: CapturedEvent[] = [];
    trigger.run(graph, (type, part) => {
      if (type !== "spotlight:done") {
        captured.push({
          type,
          part,
          state: captureSpotlightState(activeSpec, graph.state(), type, part),
        });
      }
    });
    displayState.current = initialState;
    setSpotlightActive(true);
    setSpotlightParts([activeSpec.primaryDrive]);
    setSpotlightRuns((current) => current + 1);

    const speed = useUiStore.getState().demoSpeed || 1;
    const timeline = buildDemoTimeline(
      captured,
      (type, part) => mechanismCaption(module, language, type, part, t),
      statesDiffer,
      initialState,
    );
    let index = 0;
    let previousState = initialState;
    const playNext = () => {
      const entry = timeline[index];
      if (!entry) {
        displayState.current = null;
        setSpotlightActive(false);
        spotlightFrame.current = null;
        return;
      }
      if (entry.kind !== "camera") {
        if (entry.event.type === "highlight:off") {
          setSpotlightParts((current) =>
            current.filter((partId) => partId !== entry.event.part),
          );
        } else if (
          entry.event.type.includes("drive") ||
          entry.event.type.includes("highlight") ||
          entry.event.type === "mallet:raise"
        ) {
          setSpotlightParts((current) =>
            current.includes(entry.event.part)
              ? current
              : [...current, entry.event.part],
          );
        }
      }

      const motion = entry.motionMs / speed;
      const dwell = entry.dwellMs / speed;
      const startedAt = performance.now();
      const animate = (now: number) => {
        const progress = Math.min(
          1,
          motion === 0 ? 1 : (now - startedAt) / motion,
        );
        displayState.current = interpolateState(
          previousState,
          entry.event.state,
          1 - (1 - progress) ** 3,
        );
        if (now - startedAt < motion + dwell) {
          spotlightFrame.current = requestAnimationFrame(animate);
          return;
        }
        previousState = entry.event.state;
        index += 1;
        playNext();
      };
      spotlightFrame.current = requestAnimationFrame(animate);
    };
    playNext();

    return () => {
      if (spotlightFrame.current !== null) {
        cancelAnimationFrame(spotlightFrame.current);
        spotlightFrame.current = null;
      }
    };
  }, [
    activeSpec,
    graph,
    language,
    module,
    module.mechanism?.triggers,
    spotlightRunId,
    state.spotlight,
  ]);

  const highlightedParts = spotlightActive ? spotlightParts : state.highlight;
  const activeAppearance = renderingTransition
    ? {
        opacity: showingFromScheme
          ? 1 - state.segmentProgress
          : state.segmentProgress,
        variant: "story-active",
      }
    : schemeTransition
      ? { opacity: 1, variant: "story-active" }
      : cutawayAppearance;
  const transitionLayer = renderingTransition
    ? {
        appearance: {
          opacity: showingFromScheme
            ? state.segmentProgress
            : 1 - state.segmentProgress,
          variant: "story-transition",
        },
        spec: ghostSpec ?? activeSpec,
      }
    : undefined;

  return (
    <div
      className="story-machine-stage"
      data-active-step={state.activeStep.id}
      data-cutaway={state.activeStep.cutaway ? "true" : "false"}
      data-scheme-transition={schemeTransition ? "true" : "false"}
      data-geometry-built={geometryBuilt}
      data-geometry-state={geometryStatus}
      data-geometry-total={geometryTotal}
      data-machine-ready={storyReadyAt !== null ? "true" : "false"}
      data-rendered-geometry-key={activeSelection?.key ?? "none"}
      data-requested-geometry-key={requestedGeometryKey}
      data-requested-geometry-prepared={
        activeGeometryPrepared ? "true" : "false"
      }
      data-spotlight-active={spotlightActive ? "true" : "false"}
      data-spotlight-runs={spotlightRuns}
      data-testid="story-machine-stage"
    >
      <Canvas
        camera={{ fov: 36, position: state.camera.position }}
        dpr={[1, 2]}
        frameloop={spotlightActive ? "always" : "demand"}
        gl={{
          alpha: false,
          antialias: false,
          powerPreference: "high-performance",
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onCreated={(rootState) => {
          prepareSceneEnvironment(rootState);
          contextLossCleanup.current?.();
          setContextLost(false);
          contextLossCleanup.current = registerContextLossHandlers(
            rootState,
            setContextLost,
          );
        }}
      >
        <SceneEnvironment />
        {geometryPrepared ? (
          <MachineScene
            activeSpec={activeSpec}
            aidHighlightPartIds={highlightedParts}
            appearance={activeAppearance}
            assemblyProgress={1}
            displayState={displayState}
            explode={state.explode}
            geometryReadyAt={storyReadyAt}
            graph={graph}
            interactionDisabled
            module={module}
            onDrivePart={drivePart}
            onGeometryCommitted={commitGeometry}
            paused
            schemeId={schemeId}
            spotlightActive={false}
            spotlightPartIds={EMPTY_PART_IDS}
            spotlightRunId={0}
            storyCamera={state.camera}
            transitionLayer={transitionLayer}
          />
        ) : null}
        <AspectAwareStoryCamera pose={state.camera} />
      </Canvas>
      {contextLost ? (
        <div className="context-lost-overlay" role="alert">
          <p>{t("viewer.contextLost")}</p>
          <button
            className="gold-button"
            onClick={() => window.location.reload()}
            type="button"
          >
            {t("app.retry")}
          </button>
        </div>
      ) : null}
      <div
        className="poster-overlay"
        data-ready={storyReadyAt !== null ? "true" : "false"}
      >
        <PosterFallback slug={module.data.slug} />
      </div>
      {!geometryPrepared ? (
        <GeometryLoading
          built={geometryBuilt}
          label={t("app.loading")}
          scope="story"
          total={geometryTotal}
        />
      ) : null}
    </div>
  );
}

function mechanismCaption(
  module: MachineModule,
  language: "en" | "zh",
  type: string,
  part: string,
  t: TFunction,
): string {
  const eventKey = type.replaceAll(":", "_");
  if (module.data.slug === "astroclock") {
    const captionTypes = new Set([
      "caption:reservoir",
      "caption:constant-head",
      "caption:fill",
      "caption:yield",
      "caption:open",
      "caption:advance",
      "caption:relock",
      "caption:return",
      "caption:tier-report",
      "caption:drag-coach",
    ]);
    if (captionTypes.has(type)) {
      const source = module.data.sources.find(
        (candidate) => candidate.id === "xyxfy-action",
      );
      return `${t(`events.astroclock.${eventKey}`)} · ${source?.book ?? "xyxfy-action"}`;
    }
  }
  if (
    module.data.slug === "seismoscope" &&
    (type === "caption:quake-report" ||
      type === "caption:quake-reset-hint" ||
      type === "caption:scheme-switch" ||
      type === "releaseBall" ||
      type === "locked")
  ) {
    if (type === "caption:quake-report") {
      const bearingIndex = Number.parseInt(part.replace("dragon-", ""), 10);
      const bearing = SEISMOSCOPE_BEARINGS[bearingIndex];
      return t(`events.seismoscope.${eventKey}`, {
        bearing: bearing ? t(`seismo.bearing.${bearing}`) : part,
      });
    }
    return t(`events.seismoscope.${eventKey}`);
  }

  const eventLabel = t(`events.labels.${eventKey}`, {
    defaultValue: t("events.fallback"),
  });
  const namedPart = module.spec.parts.find((candidate) => candidate.id === part);
  const partLabel = namedPart?.name[language];
  return partLabel ? `${eventLabel} · ${partLabel}` : eventLabel;
}

function SpotlightSemanticReadout({
  module,
  seismoscopeBearing,
  visible,
}: {
  module: MachineModule;
  seismoscopeBearing: (typeof SEISMOSCOPE_BEARINGS)[number];
  visible: boolean;
}) {
  const { t } = useTranslation();
  if (!visible) return null;
  const rows: Array<{ label: string; value: string }> = [];

  if (module.data.slug === "seismoscope") {
    rows.push(
      {
        label: t("viewer.semanticBearingDragon", {
          bearing: t(`seismo.bearing.${seismoscopeBearing}`),
        }),
        value: t("viewer.semanticBallReleased"),
      },
      {
        label: t("viewer.semanticOtherPaths"),
        value: t("viewer.semanticLocked"),
      },
    );
  }
  if (module.data.slug === "loom") {
    rows.push({
      label: t("viewer.semanticLoomPrograms"),
      value: "▦ ▦ ▦   →   ◆ ◇ ◆",
    });
  }
  if (rows.length === 0) return null;
  return (
    <div data-testid="spotlight-semantic-readout">
      <dl className="record-list">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {module.data.slug === "loom" ? (
        <output data-testid="loom-pattern-swatches">▦▦▦ · ◆◇◆</output>
      ) : null}
    </div>
  );
}

const DRIVE_COACH_KEY = "mechanica:drive-coach";

export default function MachineViewer({
  module,
  schemeId,
}: MachineViewerProps) {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage === "en" ? "en" : "zh";
  const storyAvailable =
    module.data.slug === "astroclock" ||
    module.data.slug === "seismoscope";
  const viewerProfile =
    module.data.slug === "demo"
      ? {
          ...DEMO_VIEWER_PROFILE,
          focusPartIds: undefined,
          homePose: undefined,
        }
      : VIEWER_PROFILES[module.data.slug];
  const graph = useMemo(() => new KinematicGraph(module.spec), [module.spec]);
  const storedScheme = useUiStore(
    (state) => state.schemeByMachine[module.data.slug],
  );
  const [activeSchemeId, setActiveSchemeId] = useState<string | undefined>(
    storedScheme ?? schemeId,
  );
  const activeSpec = useMemo(
    () =>
      applySchemePatch(
        module.spec,
        activeSchemeId ? module.schemes?.[activeSchemeId] : undefined,
      ),
    [activeSchemeId, module.schemes, module.spec],
  );
  const activeDrivePartIds = useMemo(
    () =>
      new Set([
        activeSpec.primaryDrive,
        ...activeSpec.driveNodes,
        ...activeSpec.parts
          .filter((part) => part.interactive)
          .map((part) => part.id),
      ]),
    [activeSpec.driveNodes, activeSpec.parts, activeSpec.primaryDrive],
  );
  const activeModule = useMemo(
    () => ({ ...module, spec: activeSpec }),
    [activeSpec, module],
  );
  const activePartIds = useMemo(
    () => activeSpec.parts.map((part) => part.id),
    [activeSpec.parts],
  );
  const assembly = useAssemblyController(activeSpec.parts);
  const schemeIds = useMemo(
    () => Object.keys(module.schemes ?? {}),
    [module.schemes],
  );
  const defaultCompareSchemeIds = useMemo<[string, string]>(() => {
    const left = schemeId ?? schemeIds[0] ?? "";
    const right = schemeIds.find((id) => id !== left) ?? left;
    return [left, right];
  }, [schemeId, schemeIds]);
  const [compareActive, setCompareActive] = useState(false);
  const [compareSchemeIds, setCompareSchemeIds] = useState<[string, string]>(
    defaultCompareSchemeIds,
  );
  const [schemeTransition, setSchemeTransition] =
    useState<SchemeTransitionMetadata | null>(null);
  const [schemeTransitionNow, setSchemeTransitionNow] = useState(0);
  const [caption, setCaption] = useState("");
  const [captionPulseToken, setCaptionPulseToken] = useState(0);
  const [activeTrigger, setActiveTrigger] = useState<{
    arg?: number;
    triggerId: string;
  } | null>(null);
  const [demoProgress, setDemoProgress] = useState(0);
  const [aidCutawayPartIds, setAidCutawayPartIds] = useState<string[]>([]);
  const [aidHighlightPartIds, setAidHighlightPartIds] = useState<string[]>([]);
  const [spotlightActive, setSpotlightActive] = useState(false);
  const [spotlightAutoFitKey, setSpotlightAutoFitKey] = useState<string | null>(
    null,
  );
  const [spotlightDone, setSpotlightDone] = useState(false);
  const [demoFocusPartId, setDemoFocusPartId] = useState<string | null>(null);
  const [demoFocusActive, setDemoFocusActive] = useState(false);
  const [spotlightPartIds, setSpotlightPartIds] = useState<string[]>([]);
  const [spotlightRunId, setSpotlightRunId] = useState(0);
  const [spotlightTranscript, setSpotlightTranscript] = useState<string[]>([]);
  const [quakeBearing, setQuakeBearing] = useState(6);
  const [armedQuakeBearing, setArmedQuakeBearing] = useState<number | null>(
    null,
  );
  const [odometerReadout, setOdometerReadout] = useState<string | null>(
    module.spec.slug === "odometer" ? "0.00" : null,
  );
  const [assemblyPlaying, setAssemblyPlaying] = useState(false);
  const [assemblyPickHintToken, setAssemblyPickHintToken] = useState(0);
  const [completionProgress, setCompletionProgress] = useState(1);
  const [driveCoachVisible, setDriveCoachVisible] = useState(false);
  const [idleDemand, setIdleDemand] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const contextLossCleanup = useRef<(() => void) | null>(null);
  const animationFrame = useRef<number | null>(null);
  const completionFrame = useRef<number | null>(null);
  const spotlightFrame = useRef<number | null>(null);
  const pendingDemoCompletion = useRef(false);
  const pendingSpotlightDonePart = useRef<string | null>(null);
  const spotlightCaptionLockUntil = useRef(0);
  const pendingTrigger = useRef<{ arg?: number; triggerId: string } | null>(
    null,
  );
  const demoFocusRef = useRef<string | null>(null);
  demoFocusRef.current = demoFocusPartId;
  const cameraDiagnostics = useRef<CameraDiagnostics | null>(null);
  const handleDemoFocusActiveChange = useCallback((active: boolean) => {
    setDemoFocusActive(active);
    if (cameraDiagnostics.current) {
      cameraDiagnostics.current.controlsEnabled = !active;
      cameraDiagnostics.current.phase = active ? "spotlight" : "idle";
    }
  }, []);
  const viewerIntroPlayed = useRef(false);
  const viewerIdleTimer = useRef<number | null>(null);
  const viewerIdleAutoPaused = useRef(false);
  const viewerIdleDemand = useRef(false);
  const viewerTimelineActive = useRef(false);
  const sceneFrames = useRef(0);
  const sceneTriangles = useRef(0);
  const sceneryTriangles = useRef(0);
  const sceneryRaycastViolations = useRef(0);
  const sceneMemory = useRef({ geometries: 0, textures: 0 });
  const shadowDiagnostics = useRef<ShadowDiagnostics>({
    casters: 0,
    castingLights: 0,
    configured: false,
    mapSize: 0,
    suppressed: 0,
  });
  const machineScene = useRef<Scene | null>(null);
  const hooksEnabled = import.meta.env.DEV || import.meta.env.VITE_E2E === "1";
  const observedCompletionEffect = useRef(0);
  const displayState = useRef<Record<string, number> | null>(null);
  const assemblyProgress = useUiStore((state) => state.assemblyProgress);
  const explode = useUiStore((state) => state.explode);
  const hoveredPartId = useUiStore((state) => state.hoveredPartId);
  const idleAutoPaused = useUiStore((state) => state.idleAutoPaused);
  const paused = useUiStore((state) => state.paused);
  const showScene = useUiStore((state) => state.showScene);
  const setAssemblyProgress = useUiStore((state) => state.setAssemblyProgress);
  const setExplode = useUiStore((state) => state.setExplode);
  const setHoveredPartId = useUiStore((state) => state.setHoveredPartId);
  const setIdleAutoPaused = useUiStore((state) => state.setIdleAutoPaused);
  const setPaused = useUiStore((state) => state.setPaused);
  const setShowScene = useUiStore((state) => state.setShowScene);
  const selectedPartId = useUiStore((state) => state.selectedPartId);
  const setSelectedPartId = useUiStore((state) => state.setSelectedPartId);
  const timelineActive =
    activeTrigger !== null || assemblyPlaying || completionProgress < 1;
  viewerTimelineActive.current = timelineActive;
  const mechanismCutawayPartIds = useMemo(() => {
    const aid = module.aids?.find((candidate) => candidate.kind === "cutaway");
    return aid?.kind === "cutaway" ? aid.partIds : EMPTY_PART_IDS;
  }, [module.aids]);
  const visibleCutawayPartIds = useMemo(
    () =>
      spotlightActive
        ? [...new Set([...aidCutawayPartIds, ...mechanismCutawayPartIds])]
        : aidCutawayPartIds,
    [aidCutawayPartIds, mechanismCutawayPartIds, spotlightActive],
  );
  const selectedDrivePart = useMemo(
    () =>
      activeSpec.parts.find(
        (part) => part.id === selectedPartId && activeDrivePartIds.has(part.id),
      ),
    [activeDrivePartIds, activeSpec.parts, selectedPartId],
  );
  const activeDrivePartId =
    hoveredPartId && activeDrivePartIds.has(hoveredPartId)
      ? hoveredPartId
      : selectedDrivePart?.id;
  const dismissDriveCoach = useCallback(() => {
    setDriveCoachVisible(false);
    try {
      window.localStorage.setItem(DRIVE_COACH_KEY, "dismissed");
    } catch {
      return;
    }
  }, []);
  const clearViewerIdleTimer = useCallback(() => {
    if (viewerIdleTimer.current === null) return;
    window.clearTimeout(viewerIdleTimer.current);
    viewerIdleTimer.current = null;
  }, []);
  const idleState = useCallback(
    (): ViewerIdleState => ({
      autoPaused: viewerIdleAutoPaused.current,
      demand: viewerIdleDemand.current,
      paused: useUiStore.getState().paused,
      timelineActive: viewerTimelineActive.current,
    }),
    [],
  );
  const applyIdleState = useCallback(
    (next: ViewerIdleState) => {
      viewerIdleAutoPaused.current = next.autoPaused;
      viewerIdleDemand.current = next.demand;
      setIdleAutoPaused(next.autoPaused);
      setIdleDemand(next.demand);
      setPaused(next.paused);
    },
    [setIdleAutoPaused, setIdleDemand, setPaused],
  );
  const enterViewerIdle = useCallback(() => {
    clearViewerIdleTimer();
    applyIdleState(
      transitionViewerIdle(idleState(), { type: "idle-elapsed" }).state,
    );
  }, [applyIdleState, clearViewerIdleTimer, idleState]);
  const armViewerIdleTimer = useCallback(() => {
    clearViewerIdleTimer();
    if (viewerTimelineActive.current) return;
    viewerIdleTimer.current = window.setTimeout(
      enterViewerIdle,
      VIEWER_IDLE_TIMEOUT_MS,
    );
  }, [clearViewerIdleTimer, enterViewerIdle]);
  const registerViewerInteraction = useCallback(() => {
    applyIdleState(
      transitionViewerIdle(idleState(), { type: "interaction" }).state,
    );
    armViewerIdleTimer();
  }, [applyIdleState, armViewerIdleTimer, idleState]);

  const oldSchemeSpec = useMemo(
    () =>
      schemeTransition
        ? specForScheme(module, schemeTransition.previousSchemeId)
        : null,
    [module, schemeTransition],
  );
  const oldSchemePresentation = schemeTransition
    ? schemeGhostPresentation(schemeTransition, "old", schemeTransitionNow)
    : null;
  const newSchemePresentation = schemeTransition
    ? schemeGhostPresentation(schemeTransition, "new", schemeTransitionNow)
    : null;
  const oldSchemeAppearance =
    schemeTransition && oldSchemePresentation?.visible
      ? {
          color: oldSchemePresentation.color,
          opacity: oldSchemePresentation.opacity,
          partIds: new Set(schemeTransition.oldPartIds),
          variant: "scheme-old",
        }
      : undefined;
  const newSchemeAppearance =
    schemeTransition && newSchemePresentation
      ? {
          color: newSchemePresentation.color,
          opacity: newSchemePresentation.opacity,
          partIds: new Set(schemeTransition.newPartIds),
          variant: "scheme-new",
        }
      : undefined;
  const viewerWarmup = useMachineGeometryWarmup({
    consumerScope: "viewer",
    module,
    spec: compareActive ? null : activeSpec,
    warmupKey: `${module.data.slug}:${activeSchemeId ?? "default"}`,
  });
  const viewerGhostSpec =
    !compareActive && oldSchemeSpec && oldSchemeAppearance
      ? oldSchemeSpec
      : null;
  const viewerGhostWarmup = useMachineGeometryWarmup({
    consumerScope: "viewer:ghost",
    module,
    spec: viewerGhostSpec,
    warmupKey: `${module.data.slug}:${schemeTransition?.previousSchemeId ?? "default"}`,
  });
  const viewerGeometryPrepared =
    viewerWarmup.prepared && viewerGhostWarmup.prepared;
  const viewerGeometryReadyAt =
    viewerWarmup.committedAt !== null &&
    (viewerGhostSpec === null || viewerGhostWarmup.committedAt !== null)
      ? Math.max(
          viewerWarmup.committedAt,
          viewerGhostWarmup.committedAt ?? viewerWarmup.committedAt,
        )
      : null;
  const commitViewerGeometry = useCallback(
    (committedAt: number) => {
      viewerWarmup.commit(committedAt);
      viewerGhostWarmup.commit(committedAt);
    },
    [viewerGhostWarmup.commit, viewerWarmup.commit],
  );
  const viewerGeometryStatus = compareActive
    ? "idle"
    : viewerWarmup.status === "failed" || viewerGhostWarmup.status === "failed"
      ? "failed"
      : viewerGeometryReadyAt !== null
        ? "committed"
        : viewerGeometryPrepared
          ? "prepared"
          : "warming";
  const viewerGeometryBuilt = viewerWarmup.built + viewerGhostWarmup.built;
  const viewerGeometryTotal = viewerWarmup.total + viewerGhostWarmup.total;

  useEffect(() => {
    try {
      setDriveCoachVisible(
        window.localStorage.getItem(DRIVE_COACH_KEY) !== "dismissed",
      );
    } catch {
      setDriveCoachVisible(true);
    }
  }, []);

  useEffect(() => {
    clearViewerIdleTimer();
    viewerIdleDemand.current = false;
    setIdleDemand(false);
    if (compareActive) {
      if (viewerIdleAutoPaused.current) setPaused(false);
      viewerIdleAutoPaused.current = false;
      setIdleAutoPaused(false);
      return;
    }
    if (viewerIdleAutoPaused.current) setPaused(false);
    viewerIdleAutoPaused.current = false;
    setIdleAutoPaused(false);
    armViewerIdleTimer();
    return clearViewerIdleTimer;
  }, [
    activeSchemeId,
    armViewerIdleTimer,
    clearViewerIdleTimer,
    compareActive,
    module.spec.slug,
    setIdleAutoPaused,
    setPaused,
  ]);

  useEffect(() => {
    applyIdleState(
      transitionViewerIdle(idleState(), {
        type: "timeline-change",
        active: timelineActive,
      }).state,
    );
    if (timelineActive || compareActive) {
      clearViewerIdleTimer();
      return;
    }
    armViewerIdleTimer();
    return clearViewerIdleTimer;
  }, [
    applyIdleState,
    armViewerIdleTimer,
    clearViewerIdleTimer,
    compareActive,
    idleState,
    timelineActive,
  ]);

  useEffect(
    () => () => {
      contextLossCleanup.current?.();
      clearViewerIdleTimer();
      if (viewerIdleAutoPaused.current) setPaused(false);
      viewerIdleAutoPaused.current = false;
      setIdleAutoPaused(false);
      viewerIdleDemand.current = false;
    },
    [clearViewerIdleTimer, setIdleAutoPaused, setPaused],
  );

  useLayoutEffect(() => {
    if (spotlightFrame.current !== null) {
      cancelAnimationFrame(spotlightFrame.current);
      spotlightFrame.current = null;
    }
    displayState.current = null;
    pendingDemoCompletion.current = false;
    pendingSpotlightDonePart.current = null;
    spotlightCaptionLockUntil.current = 0;
    cameraDiagnostics.current = null;
    setAidCutawayPartIds([]);
    setAidHighlightPartIds([]);
    setActiveTrigger(null);
    setDemoProgress(0);
    setSpotlightActive(false);
    setSpotlightAutoFitKey(null);
    setSpotlightDone(false);
    setDemoFocusActive(false);
    pendingTrigger.current = null;
    setDemoFocusPartId(null);
    setSpotlightPartIds([]);
    setSpotlightTranscript([]);
    setArmedQuakeBearing(null);
    setHoveredPartId(null);
    setSelectedPartId(null);
    setActiveSchemeId(
      useUiStore.getState().schemeByMachine[module.data.slug] ?? schemeId,
    );
    setSchemeTransition(null);
    setCompareActive(false);
    setCompareSchemeIds(defaultCompareSchemeIds);
    assembly.exitAssembly();
    setAssemblyProgress(1);
    setExplode(0);
    setOdometerReadout(module.spec.slug === "odometer" ? "0.00" : null);
  }, [
    assembly.exitAssembly,
    defaultCompareSchemeIds,
    graph,
    module.spec.slug,
    schemeId,
    setAssemblyProgress,
    setExplode,
    setHoveredPartId,
    setSelectedPartId,
  ]);

  useEffect(() => {
    if (!schemeTransition) return;
    let frame = 0;
    const animate = (now: number) => {
      setSchemeTransitionNow(now);
      if (now - schemeTransition.startedAt < schemeTransition.durationMs) {
        frame = requestAnimationFrame(animate);
      } else {
        setSchemeTransition(null);
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [schemeTransition]);

  useLayoutEffect(() => {
    graph.setScheme(
      activeSchemeId ? module.schemes?.[activeSchemeId] : undefined,
    );
    setHoveredPartId(null);
    setSelectedPartId(null);
  }, [
    activeSchemeId,
    graph,
    module.schemes,
    setHoveredPartId,
    setSelectedPartId,
  ]);

  useEffect(
    () => () => {
      if (spotlightFrame.current !== null) {
        cancelAnimationFrame(spotlightFrame.current);
      }
      if (completionFrame.current !== null) {
        cancelAnimationFrame(completionFrame.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!assemblyPlaying) return;
    const startedAt = performance.now();
    let heldDurationMs = 0;
    let stageHoldStartedAt = 0;
    let stageHoldUntil = 0;
    let previousStage: number | null = null;
    const animate = (now: number) => {
      if (now < stageHoldUntil) {
        animationFrame.current = requestAnimationFrame(animate);
        return;
      }
      if (stageHoldUntil > 0) {
        heldDurationMs += stageHoldUntil - stageHoldStartedAt;
        stageHoldStartedAt = 0;
        stageHoldUntil = 0;
      }
      const progress = Math.min(
        1,
        (now - startedAt - heldDurationMs) / assembly.plan.durationMs,
      );
      setAssemblyProgress(progress);
      const partIndex = Math.min(
        Math.floor(progress * assembly.plan.orderedPartIds.length),
        assembly.plan.orderedPartIds.length - 1,
      );
      const partId = assembly.plan.orderedPartIds[partIndex];
      const stage = partId
        ? (assembly.plan.partById.get(partId)?.assemblyStep ?? 0)
        : null;
      if (
        previousStage !== null &&
        stage !== null &&
        stage !== previousStage &&
        progress < 1
      ) {
        stageHoldStartedAt = now;
        stageHoldUntil = now + 700;
      }
      previousStage = stage;
      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate);
      } else {
        animationFrame.current = null;
        setAssemblyPlaying(false);
      }
    };
    animationFrame.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrame.current !== null)
        cancelAnimationFrame(animationFrame.current);
    };
  }, [assembly.plan, assemblyPlaying, setAssemblyProgress]);

  useEffect(() => {
    if (assembly.state.mode !== "step") return;
    const targetIndex = Math.floor(
      assemblyProgress * assembly.plan.orderedPartIds.length,
    );
    if (assembly.state.stepIndex < targetIndex) assembly.advanceStep();
    if (assembly.state.stepIndex > targetIndex) assembly.previousStep();
  }, [
    assembly.advanceStep,
    assembly.plan.orderedPartIds.length,
    assembly.previousStep,
    assembly.state.mode,
    assembly.state.stepIndex,
    assemblyProgress,
  ]);

  useEffect(() => {
    if (!assembly.state.hint) return;
    const token = assembly.state.feedbackToken;
    const timeout = window.setTimeout(() => assembly.clearFeedback(token), 900);
    return () => window.clearTimeout(timeout);
  }, [
    assembly.clearFeedback,
    assembly.state.feedbackToken,
    assembly.state.hint,
  ]);

  useEffect(() => {
    if (
      assembly.state.mode !== "reassemble" ||
      assembly.state.selectedPartId
    ) {
      setAssemblyPickHintToken(0);
    }
  }, [assembly.state.mode, assembly.state.selectedPartId]);

  useEffect(() => {
    if (
      assembly.state.completionEffectToken <= observedCompletionEffect.current
    ) {
      return;
    }
    observedCompletionEffect.current = assembly.state.completionEffectToken;
    setAssemblyProgress(1);
    setPaused(false);
    if (completionFrame.current !== null) {
      cancelAnimationFrame(completionFrame.current);
    }
    const startingExplode = useUiStore.getState().explode;
    const startedAt = performance.now();
    setCompletionProgress(0);
    const animate = (now: number) => {
      const progress = Math.min(
        1,
        (now - startedAt) / ASSEMBLY_COMPLETION_DURATION_MS,
      );
      setCompletionProgress(progress);
      setExplode(startingExplode * (1 - assemblyEaseOutCubic(progress)));
      if (progress < 1) {
        completionFrame.current = requestAnimationFrame(animate);
      } else {
        completionFrame.current = null;
        setExplode(0);
      }
    };
    completionFrame.current = requestAnimationFrame(animate);
    return () => {
      if (completionFrame.current !== null) {
        cancelAnimationFrame(completionFrame.current);
        completionFrame.current = null;
      }
    };
  }, [
    assembly.state.completionEffectToken,
    setAssemblyProgress,
    setExplode,
    setPaused,
  ]);

  useLayoutEffect(() => {
    if (!hooksEnabled) return;
    window.__mech = {
      cameraState: () => cameraSnapshot(cameraDiagnostics.current),
      forceIdle: enterViewerIdle,
      frameFill: () => projectedFrameFill(cameraDiagnostics.current),
      frameCount: () => sceneFrames.current,
      graph,
      idleState: () => ({
        autoPaused: viewerIdleAutoPaused.current,
        demand: viewerIdleDemand.current,
        paused: useUiStore.getState().paused,
        timeoutMs: VIEWER_IDLE_TIMEOUT_MS,
      }),
      machineReady: viewerGeometryReadyAt,
      memory: () => ({ ...sceneMemory.current }),
      module: activeModule,
      partMaterials: (partId) => {
        const part = machineScene.current?.getObjectByName(partId);
        if (!part) return [];
        const presentations: Array<{
          alphaTest: number;
          color: string;
          opacity: number;
          side: number;
        }> = [];
        part.traverse((object) => {
          const mesh = object as typeof object & {
            isMesh?: boolean;
            material?: MeshStandardMaterial | MeshStandardMaterial[];
          };
          if (!mesh.isMesh || !mesh.material) return;
          const materials = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          for (const material of materials) {
            if (!material.isMeshStandardMaterial) continue;
            presentations.push({
              alphaTest: material.alphaTest,
              color: `#${material.color.getHexString()}`,
              opacity: material.opacity,
              side: material.side,
            });
          }
        });
        return presentations;
      },
      partMeshCount: (partId) => {
        const part = machineScene.current?.getObjectByName(partId);
        if (!part) return 0;
        let count = 0;
        part.traverse((object) => {
          if (
            (object as typeof object & { isMesh?: boolean }).isMesh &&
            !object.userData.mechanicaAffordance
          ) {
            count += 1;
          }
        });
        return count;
      },
      partScreenPoint: (partId) => {
        const part = machineScene.current?.getObjectByName(partId);
        const camera = cameraDiagnostics.current?.camera;
        const canvas = document.querySelector<HTMLCanvasElement>(
          ".viewer-canvas canvas",
        );
        if (!part || !camera || !canvas) return null;
        const bounds = mechanicaBounds(part);
        if (bounds.isEmpty()) return null;
        const projected = bounds.getCenter(new Vector3()).project(camera);
        const rect = canvas.getBoundingClientRect();
        return {
          x: rect.left + ((projected.x + 1) * rect.width) / 2,
          y: rect.top + ((1 - projected.y) * rect.height) / 2,
        };
      },
      resetFrameCount: () => {
        sceneFrames.current = 0;
      },
      sceneryRaycastViolations: () => sceneryRaycastViolations.current,
      sceneryTriangles: () => sceneryTriangles.current,
      shadowState: () => ({ ...shadowDiagnostics.current }),
      spec: activeSpec,
      textureStats: materialTextureStats,
      triangles: () => sceneTriangles.current,
      warmTextures: warmMaterialTextures,
    };
    window.__mechSelect = (partId) => setSelectedPartId(partId);
    window.__mechDemoFocus = {
      get focusPartId() {
        return demoFocusRef.current;
      },
    };
    window.__mechCamera = {
      get boundingRadius() {
        return cameraDiagnostics.current?.boundingRadius ?? 0;
      },
      get distance() {
        return cameraDiagnostics.current?.distance ?? 0;
      },
    };
    window.__mechAssembly = {
      advanceStep: assembly.advanceStep,
      enterExplodedMode: assembly.enterExplodedMode,
      enterStepMode: assembly.enterStepMode,
      exitAssembly: assembly.exitAssembly,
      partPosition: (partId) => {
        const part = machineScene.current?.getObjectByName(partId);
        return part ? part.getWorldPosition(new Vector3()).toArray() : null;
      },
      plan: () => ({
        durationMs: assembly.plan.durationMs,
        orderedPartIds: [...assembly.plan.orderedPartIds],
        stagingByPartId: Object.fromEntries(assembly.plan.stagingByPartId),
        stagingGroundY: assembly.plan.stagingGroundY,
      }),
      seat: (partId, distanceFromHome = 0, radius = 1) =>
        assembly.attemptSeat(partId, distanceFromHome, radius),
      selectPart: assembly.selectPart,
      state: () => ({
        assemblyProgress,
        complete: assembly.state.complete,
        completionProgress,
        errorPartId: assembly.state.errorPartId,
        explode,
        mode: assembly.state.mode,
        seatedPartIds: [...assembly.state.seatedPartIds],
        transmissionEnabled: assembly.state.transmissionEnabled,
      }),
    };
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
        delete window.__mechCamera;
        delete window.__mechSelect;
        delete window.__mechDemoFocus;
        delete window.__mechExplodeSpread;
        delete window.__mechAssembly;
      }
    };
  }, [
    activeModule,
    activeSpec,
    assembly,
    assemblyProgress,
    completionProgress,
    enterViewerIdle,
    explode,
    graph,
    setSelectedPartId,
    viewerGeometryReadyAt,
  ]);

  const recordEvent = (type: string, part: string) => {
    const nextCaption = mechanismCaption(module, language, type, part, t);
    const speed = useUiStore.getState().demoSpeed || 1;
    if (
      type === "spotlight:done" ||
      performance.now() >= spotlightCaptionLockUntil.current
    ) {
      setCaption(nextCaption);
    }
    if (type === "spotlight:done") {
      spotlightCaptionLockUntil.current = performance.now() + 6000 / speed;
      window.setTimeout(() => {
        setCaption((current) => (current === nextCaption ? "" : current));
      }, 6000 / speed);
    }
    if (type === "reset") {
      spotlightCaptionLockUntil.current = 0;
      setSpotlightDone(false);
      setSpotlightTranscript([]);
    }
    if (module.data.slug === "seismoscope" && type === "releaseBall") {
      const bearing = Number.parseInt(part.replace("dragon-", ""), 10);
      if (Number.isInteger(bearing)) {
        window.dispatchEvent(
          new CustomEvent(QUAKE_PAYOFF_EVENT, { detail: { bearing } }),
        );
      }
    }
    if (
      (module.data.slug === "astroclock" &&
        (type.startsWith("caption:") || type.startsWith("phase:"))) ||
      (module.data.slug === "seismoscope" &&
        (type.startsWith("caption:") ||
          type === "releaseBall" ||
          type === "locked"))
    ) {
      setSpotlightTranscript((current) =>
        current.includes(nextCaption) ? current : [...current, nextCaption],
      );
    }
    if (type === "odometer:update" || type === "odometer:readout") {
      const value = Number.parseFloat(part);
      if (Number.isFinite(value)) setOdometerReadout(value.toFixed(2));
    }
    if (type === "scheme:switch" && module.schemes?.[part]) {
      setSpotlightAutoFitKey(
        cameraFitKey(module.data.slug, part, "default", explode),
      );
      setActiveSchemeId(part);
      useUiStore.getState().setMachineScheme(module.data.slug, part);
    }
    if (type === "spotlight:done") setSpotlightDone(true);
  };

  const handleSolve = (result: SolveResult) => {
    for (const event of result.events) recordEvent(event.type, event.part);
  };

  const startTrigger = (triggerId: string, arg?: number) => {
    const trigger = module.mechanism?.triggers.find(
      (candidate) => candidate.id === triggerId,
    );
    if (!trigger) return;
    const isSpotlight = triggerId === "spotlight";

    setSpotlightAutoFitKey(null);
    let spotlightSpec = activeSpec;
    let switchedToFengrui = false;
    if (
      module.spec.slug === "seismoscope" &&
      (isSpotlight || triggerId === "quake" || triggerId === "quake:arm") &&
      activeSchemeId !== "fengrui" &&
      module.schemes?.fengrui
    ) {
      graph.setScheme(module.schemes.fengrui);
      setActiveSchemeId("fengrui");
      useUiStore.getState().setMachineScheme(module.data.slug, "fengrui");
      setSpotlightAutoFitKey(
        cameraFitKey("seismoscope", "fengrui", "default", explode),
      );
      spotlightSpec = applySchemePatch(module.spec, module.schemes.fengrui);
      switchedToFengrui = true;
    }

    if (spotlightFrame.current !== null) {
      cancelAnimationFrame(spotlightFrame.current);
      spotlightFrame.current = null;
    }
    const pausedBefore = useUiStore.getState().paused;
    setPaused(true);
    setSpotlightActive(true);
    if (isSpotlight) setSpotlightDone(false);
    setSpotlightPartIds([spotlightSpec.primaryDrive]);
    if (isSpotlight) setSpotlightTranscript([]);
    setSpotlightRunId((current) => current + 1);

    const initialState = graph.state();
    const captured: CapturedEvent[] = [];
    if (switchedToFengrui) {
      captured.push({
        type: "caption:scheme-switch",
        part: "fengrui",
        state: initialState,
      });
    }
    let donePart: string | null = null;
    trigger.run(graph, (type, part) => {
      if (type === "spotlight:done") {
        donePart = part;
        return;
      }
      captured.push({
        type,
        part,
        state: captureSpotlightState(spotlightSpec, graph.state(), type, part),
      });
    }, arg);
    displayState.current = initialState;

    const speed = useUiStore.getState().demoSpeed || 1;
    const timeline = buildDemoTimeline(
      captured,
      (type, part) => mechanismCaption(module, language, type, part, t),
      statesDiffer,
      initialState,
    );
    const totalDuration = timeline.reduce(
      (duration, entry) =>
        duration + (entry.motionMs + entry.dwellMs) / speed,
      0,
    );
    let index = 0;
    let completedDuration = 0;
    let lastProgressUpdateAt = 0;
    let previousState = initialState;
    const playNext = () => {
      const entry = timeline[index];
      if (!entry) {
        displayState.current = null;
        if (demoFocusRef.current) {
          pendingDemoCompletion.current = true;
          pendingSpotlightDonePart.current = donePart;
        } else {
          if (donePart) recordEvent("spotlight:done", donePart);
          setActiveTrigger(null);
        }
        setDemoProgress(1);
        setSpotlightActive(false);
        setSpotlightPartIds([]);
        setDemoFocusPartId(null);
        setPaused(pausedBefore);
        spotlightFrame.current = null;
        return;
      }

      if (entry.kind === "camera") {
        setDemoFocusPartId(entry.event.part);
      } else {
        recordEvent(entry.event.type, entry.event.part);
        const changed = statesDiffer(previousState, entry.event.state);
        const realPart = spotlightSpec.parts.some(
          (part) => part.id === entry.event.part,
        );
        if (entry.event.type === "highlight:off") {
          setSpotlightPartIds((current) =>
            current.filter((partId) => partId !== entry.event.part),
          );
        } else if (
          realPart &&
          (changed || entry.event.type.includes("highlight"))
        ) {
          setSpotlightPartIds((current) =>
            current.includes(entry.event.part)
              ? current
              : [...current, entry.event.part],
          );
        }
      }

      const motion = entry.motionMs / speed;
      const dwell = entry.dwellMs / speed;
      const startedAt = performance.now();
      const animate = (now: number) => {
        const progress = Math.min(
          1,
          motion === 0 ? 1 : (now - startedAt) / motion,
        );
        const entryElapsed = Math.min(
          motion + dwell,
          Math.max(0, now - startedAt),
        );
        if (
          now - lastProgressUpdateAt >= 50 ||
          entryElapsed >= motion + dwell
        ) {
          setDemoProgress(
            totalDuration === 0
              ? 1
              : Math.min(1, (completedDuration + entryElapsed) / totalDuration),
          );
          lastProgressUpdateAt = now;
        }
        displayState.current = interpolateState(
          previousState,
          entry.event.state,
          1 - (1 - progress) ** 3,
        );
        if (now - startedAt < motion + dwell) {
          spotlightFrame.current = requestAnimationFrame(animate);
          return;
        }
        completedDuration += motion + dwell;
        previousState = entry.event.state;
        index += 1;
        playNext();
      };
      spotlightFrame.current = requestAnimationFrame(animate);
    };
    playNext();
  };

  const pulseDemoInProgress = () => {
    setCaption(t("viewer.demoInProgress"));
    setCaptionPulseToken((token) => token + 1);
  };

  const runTrigger = (triggerId: string, arg?: number) => {
    registerViewerInteraction();
    if (pendingTrigger.current || activeTrigger) {
      pulseDemoInProgress();
      return;
    }
    if (
      !module.mechanism?.triggers.some(
        (candidate) => candidate.id === triggerId,
      )
    ) {
      return;
    }
    if (module.data.slug === "seismoscope") {
      if (
        triggerId === "quake:arm" &&
        typeof arg === "number" &&
        SEISMOSCOPE_BEARINGS[arg]
      ) {
        setArmedQuakeBearing(arg);
      } else if (triggerId === "quake" || triggerId === "quake:reset") {
        setArmedQuakeBearing(null);
      }
    }
    const requestedTrigger = { arg, triggerId };
    pendingTrigger.current = requestedTrigger;
    setActiveTrigger(requestedTrigger);
    setDemoProgress(0);
    setDemoFocusPartId("tower-shell");
  };

  const completePendingDemo = () => {
    if (!pendingDemoCompletion.current) return;
    pendingDemoCompletion.current = false;
    const donePart = pendingSpotlightDonePart.current;
    pendingSpotlightDonePart.current = null;
    if (donePart) recordEvent("spotlight:done", donePart);
    setActiveTrigger(null);
  };

  const handleDemoFocusSettled = () => {
    setDemoFocusPartId(null);
    const pending = pendingTrigger.current;
    pendingTrigger.current = null;
    if (pending) {
      startTrigger(pending.triggerId, pending.arg);
      return;
    }
    completePendingDemo();
  };

  const handleDemoFocusRestored = () => completePendingDemo();

  const drivePart = (partId: string, delta: number) => {
    if (module.spec.slug === "astroclock" && delta < 0) {
      const reverseLock = module.mechanism?.triggers.find(
        (candidate) => candidate.id === "drag-shulun",
      );
      reverseLock?.run(graph, recordEvent, delta);
      return;
    }
    if (
      module.spec.slug === "seismoscope" &&
      (partId === "vessel" || partId === "duzhu")
    ) {
      const quake = module.mechanism?.triggers.find(
        (candidate) => candidate.id === "quake",
      );
      quake?.run(graph, recordEvent, delta >= 0 ? 6 : 2);
      return;
    }
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
  const assemblyStateHint = assembly.state.hint;
  const requiredAssemblyPartName =
    assemblyStateHint?.kind === "parent-required"
      ? (module.spec.parts.find(
          (part) => part.id === assemblyStateHint.requiredPartId,
        )?.name[language] ?? assemblyStateHint.requiredPartId)
      : null;
  const assemblyHint = assemblyStateHint
    ? assemblyStateHint.kind === "parent-required"
      ? t("assembly.hintParent", { part: requiredAssemblyPartName })
      : t("assembly.hintMoveCloser")
    : null;

  return (
    <main
      className="viewer-page"
      onClickCapture={registerViewerInteraction}
      onKeyDownCapture={registerViewerInteraction}
      onPointerDownCapture={registerViewerInteraction}
      onPointerMoveCapture={registerViewerInteraction}
      onWheelCapture={registerViewerInteraction}
    >
      <section className="viewer-stage">
        {compareActive || assembly.state.mode === "reassemble" ? null : (
          <div className="viewer-title-row">
            <div className="viewer-title">
              <h1>{module.data.names[language]}</h1>
              <p>
                {module.data.oneLiner[language]} · {t("viewer.rotateHint")}
              </p>
            </div>
            {storyAvailable ? (
              <a
                className="story-launch-button"
                data-testid="story-launch"
                href={`#/story/${module.data.slug}`}
              >
                {t("viewer.enterStory")}
              </a>
            ) : null}
          </div>
        )}
        <div
          className="viewer-canvas"
          data-assembly-complete={assembly.state.complete ? "true" : "false"}
          data-assembly-mode={assembly.state.mode}
          data-geometry-built={viewerGeometryBuilt}
          data-geometry-state={viewerGeometryStatus}
          data-geometry-total={viewerGeometryTotal}
          data-frameloop={
            compareActive ? "compare-demand" : idleDemand ? "demand" : "always"
          }
          data-drive-gizmo-testid={
            activeDrivePartId ? `drive-gizmo-${activeDrivePartId}` : undefined
          }
          data-machine-ready={viewerGeometryReadyAt !== null ? "true" : "false"}
          data-scene-enabled={
            showScene && module.scene && assembly.state.mode === "idle"
              ? "true"
              : "false"
          }
          data-scheme-transition={schemeTransition ? "true" : "false"}
          data-spotlight-active={spotlightActive ? "true" : "false"}
          onWheel={(event) => event.stopPropagation()}
        >
          {compareActive && compareSchemeIds[0] && compareSchemeIds[1] ? (
            <CompareView
              leftSchemeId={compareSchemeIds[0]}
              module={module}
              onClose={() => setCompareActive(false)}
              renderScene={(context) => (
                <CompareSceneAdapter context={context} module={module} />
              )}
              rightSchemeId={compareSchemeIds[1]}
            />
          ) : (
            <Canvas
              camera={{
                fov: viewerProfile.homePose?.fov ?? 36,
                position: viewerProfile.homePose
                  ? [...viewerProfile.homePose.position]
                  : [0.9, 1.1, 1.6],
              }}
              dpr={[1, 2]}
              frameloop={idleDemand ? "demand" : "always"}
              gl={{
                antialias: false,
                toneMapping: ACESFilmicToneMapping,
                toneMappingExposure: 1.05,
              }}
              onCreated={(rootState) => {
                prepareSceneEnvironment(rootState);
                contextLossCleanup.current?.();
                setContextLost(false);
                contextLossCleanup.current = registerContextLossHandlers(
                  rootState,
                  setContextLost,
                );
              }}
              shadows
            >
              <SceneEnvironment />
              {hooksEnabled ? (
                <SceneComplexityProbe
                  count={sceneTriangles}
                  frames={sceneFrames}
                  memory={sceneMemory}
                  sceneRef={machineScene}
                  sceneryCount={sceneryTriangles}
                  sceneryRaycastViolations={sceneryRaycastViolations}
                />
              ) : null}
              {viewerGeometryPrepared ? (
                <>
                  <MachineScene
                    activeSpec={activeSpec}
                    aidCutawayPartIds={visibleCutawayPartIds}
                    aidHighlightPartIds={aidHighlightPartIds}
                    appearance={newSchemeAppearance}
                    assembly={assembly}
                    assemblyProgress={assemblyProgress}
                    blockedFitKeyToConsume={spotlightAutoFitKey ?? undefined}
                    cameraDiagnostics={cameraDiagnostics}
                    displayState={displayState}
                    driveCoachVisible={driveCoachVisible}
                    explode={explode}
                    geometryReadyAt={viewerGeometryReadyAt}
                    graph={graph}
                    introPlayed={viewerIntroPlayed}
                    interactionDisabled={demoFocusActive}
                    module={module}
                    onDrivePart={drivePart}
                    onDriveSuccess={dismissDriveCoach}
                    onGeometryCommitted={commitViewerGeometry}
                    paused={paused || !assembly.state.transmissionEnabled}
                    schemeId={activeSchemeId}
                    shadowDiagnostics={shadowDiagnostics}
                    showScene={showScene && assembly.state.mode === "idle"}
                    spotlightActive={spotlightActive}
                    spotlightPartIds={spotlightPartIds}
                    spotlightRunId={spotlightRunId}
                    transitionLayer={
                      oldSchemeSpec && oldSchemeAppearance
                        ? {
                            appearance: oldSchemeAppearance,
                            spec: oldSchemeSpec,
                          }
                        : undefined
                    }
                  />
                  <DemoFocusRig
                    focusPartId={demoFocusPartId}
                    onActiveChange={handleDemoFocusActiveChange}
                    onRestored={handleDemoFocusRestored}
                    onSettled={handleDemoFocusSettled}
                    partIds={activePartIds}
                    profile={viewerProfile}
                  />
                  {assembly.state.mode === "idle" ? (
                    <AidLayer
                      activeTriggerId={activeTrigger?.triggerId}
                      aids={module.aids ?? []}
                      language={language}
                      module={module}
                      onCutawayChange={setAidCutawayPartIds}
                      onHighlightChange={setAidHighlightPartIds}
                      onRunTrigger={runTrigger}
                    />
                  ) : null}
                </>
              ) : null}
            </Canvas>
          )}
          {!compareActive && contextLost ? (
            <div className="context-lost-overlay" role="alert">
              <p>{t("viewer.contextLost")}</p>
              <button
                className="gold-button"
                onClick={() => window.location.reload()}
                type="button"
              >
                {t("app.retry")}
              </button>
            </div>
          ) : null}
          {!compareActive ? (
            <div
              className="poster-overlay"
              data-ready={viewerGeometryReadyAt !== null ? "true" : "false"}
            >
              <PosterFallback slug={module.data.slug} />
            </div>
          ) : null}
          {!compareActive && !viewerGeometryPrepared ? (
            <GeometryLoading
              built={viewerGeometryBuilt}
              label={t("app.loading")}
              scope="viewer"
              total={viewerGeometryTotal}
            />
          ) : null}
          {driveCoachVisible &&
          !compareActive &&
          viewerGeometryPrepared &&
          assembly.state.mode === "idle" ? (
            <div
              className="drive-coach"
              data-testid="drive-coach"
              style={{
                alignItems: "center",
                color: "#f0cf83",
                display: "flex",
                fontSize: "0.72rem",
                gap: "0.35rem",
                left: "var(--drive-coach-x, 50%)",
                letterSpacing: "0.04em",
                pointerEvents: "none",
                position: "absolute",
                textShadow: "0 1px 4px #090a0a",
                top: "var(--drive-coach-y, 50%)",
                transform: "translate(0.75rem, -100%)",
                zIndex: 4,
              }}
            >
              <svg
                aria-hidden="true"
                fill="none"
                height="34"
                viewBox="0 0 42 34"
                width="42"
              >
                <path
                  d="M38 4C21 4 8 13 8 27"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                />
                <path
                  d="m3 22 5 6 6-5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
              <span>
                {t("viewer.driveCoach")}
              </span>
            </div>
          ) : null}
        </div>
        {assembly.state.mode === "reassemble" ? (
          <div
            className="assembly-banner"
            data-pulse={assemblyPickHintToken}
            data-testid="assembly-banner"
            key={assemblyPickHintToken}
          >
            <strong>{t("assembly.title")}</strong>
            <span>
              {t("assembly.progressLabel", {
                seated: assembly.state.seatedPartIds.size,
                total: assembly.plan.orderedPartIds.length,
              })}
            </span>
            {assemblyPickHintToken > 0 ? (
              <span className="assembly-banner-hint">
                {t("assembly.hintPickFirst")}
              </span>
            ) : null}
            <button
              onClick={() => {
                setAssemblyPickHintToken(0);
                assembly.exitAssembly();
                setAssemblyProgress(1);
                setExplode(0);
              }}
              type="button"
            >
              {t("assembly.exit")}
            </button>
          </div>
        ) : null}
        <div
          className="viewer-controls viewer-toolbar"
          data-completion-effect={assembly.state.completionEffectToken}
          hidden={compareActive}
        >
          <div className="primary-row">
            {assembly.state.mode !== "reassemble" ? (
              <button
                aria-pressed={paused}
                className="ghost-button"
                disabled={!assembly.state.transmissionEnabled}
                onClick={() => setPaused(!paused)}
                type="button"
              >
                {paused ? t("viewer.resume") : t("viewer.pause")}
              </button>
            ) : null}
            {idleAutoPaused ? (
              <span className="idle-chip" data-testid="idle-chip">
                {t("viewer.idlePaused")}
              </span>
            ) : null}
            <button
              className="ghost-button"
              data-testid="reset-view"
              onClick={() => setDemoFocusPartId("tower-shell")}
              type="button"
            >
              {t("viewer.resetView")}
            </button>
            {selectedDrivePart ? (
              <>
                <button
                  aria-keyshortcuts="ArrowLeft ArrowDown"
                  aria-label={t("viewer.driveReverse", {
                    part: selectedDrivePart.name[language],
                  })}
                  data-drive-part-id={selectedDrivePart.id}
                  data-testid="drive-keyboard-reverse"
                  onKeyDown={(event) =>
                    handleDriveKeyDown(
                      event,
                      (delta) => drivePart(selectedDrivePart.id, delta),
                      dismissDriveCoach,
                    )
                  }
                  style={{
                    border: 0,
                    clip: "rect(0, 0, 0, 0)",
                    height: 1,
                    margin: -1,
                    overflow: "hidden",
                    padding: 0,
                    position: "absolute",
                    whiteSpace: "nowrap",
                    width: 1,
                  }}
                  type="button"
                >
                  {t("viewer.driveReverse", {
                    part: selectedDrivePart.name[language],
                  })}
                </button>
                <button
                  aria-keyshortcuts="ArrowRight ArrowUp"
                  aria-label={t("viewer.driveForward", {
                    part: selectedDrivePart.name[language],
                  })}
                  data-drive-part-id={selectedDrivePart.id}
                  data-testid="drive-keyboard-forward"
                  onKeyDown={(event) =>
                    handleDriveKeyDown(
                      event,
                      (delta) => drivePart(selectedDrivePart.id, delta),
                      dismissDriveCoach,
                    )
                  }
                  style={{
                    border: 0,
                    clip: "rect(0, 0, 0, 0)",
                    height: 1,
                    margin: -1,
                    overflow: "hidden",
                    padding: 0,
                    position: "absolute",
                    whiteSpace: "nowrap",
                    width: 1,
                  }}
                  type="button"
                >
                  {t("viewer.driveForward", {
                    part: selectedDrivePart.name[language],
                  })}
                </button>
              </>
            ) : null}
            {module.scene && assembly.state.mode !== "reassemble" ? (
              <button
                aria-pressed={!showScene}
                className="ghost-button"
                data-testid="scene-toggle"
                disabled={assembly.state.mode !== "idle"}
                onClick={() => setShowScene(!showScene)}
                type="button"
              >
                {showScene
                  ? t("viewer.plainBackground")
                  : t("viewer.showScene")}
              </button>
            ) : null}
          </div>
          <details className="controls-advanced">
            <summary>{t("viewer.moreControls")}</summary>
            <div className="controls-advanced-body">
              <label className="range-control">
                <span>{t("viewer.assembly")}</span>
                <input
                  aria-label={t("viewer.assembly")}
                  max="1"
                  min="0"
                  onChange={(event) => {
                    setAssemblyPlaying(false);
                    assembly.enterStepMode();
                    setExplode(0);
                    setAssemblyProgress(Number(event.currentTarget.value));
                  }}
                  step="0.01"
                  type="range"
                  value={assemblyProgress}
                />
              </label>
              {assembly.state.mode !== "reassemble" ? (
                <>
                  <button
                    className="ghost-button"
                    data-testid="assembly-play"
                    onClick={() => {
                      assembly.enterStepMode();
                      setExplode(0);
                      setAssemblyProgress(0);
                      setAssemblyPlaying(true);
                    }}
                    type="button"
                  >
                    {t("assembly.play")}
                  </button>
                  <button
                    className="ghost-button"
                    data-testid="assembly-reassemble"
                    onClick={() => {
                      setAssemblyPlaying(false);
                      setAssemblyPickHintToken(0);
                      setAssemblyProgress(1);
                      setExplode(0);
                      assembly.enterExplodedMode();
                      setDemoFocusPartId("base-platform");
                    }}
                    type="button"
                  >
                    {t("assembly.reassemble")}
                  </button>
                </>
              ) : null}
              {assembly.state.mode === "step" ? (
                <div className="assembly-step-controls">
                  <button
                    className="ghost-button"
                    data-testid="assembly-previous"
                    disabled={assembly.state.stepIndex === 0}
                    onClick={() => {
                      setAssemblyPlaying(false);
                      assembly.previousStep();
                      setAssemblyProgress(
                        Math.max(0, assembly.state.stepIndex - 1) /
                          Math.max(assembly.plan.orderedPartIds.length, 1),
                      );
                    }}
                    type="button"
                  >
                    {t("assembly.previous")}
                  </button>
                  <button
                    className="ghost-button"
                    data-testid="assembly-next"
                    disabled={assembly.state.complete}
                    onClick={() => {
                      setAssemblyPlaying(false);
                      assembly.advanceStep();
                      setAssemblyProgress(
                        Math.min(
                          1,
                          (assembly.state.stepIndex + 1) /
                            Math.max(assembly.plan.orderedPartIds.length, 1),
                        ),
                      );
                    }}
                    type="button"
                  >
                    {t("assembly.next")}
                  </button>
                </div>
              ) : null}
              {assembly.state.mode === "reassemble" ? (
                <button
                  className="assembly-target-slot"
                  data-testid="assembly-seat-target"
                  onClick={() => {
                    if (!assembly.state.selectedPartId) {
                      setAssemblyPickHintToken((token) => token + 1);
                      return;
                    }
                    assembly.attemptSeatSelected(0, 1);
                  }}
                  type="button"
                >
                  {t("assembly.targetSlot")}
                </button>
              ) : null}
              {assembly.currentPartName ? (
                <p
                  className="assembly-current"
                  data-testid="assembly-current-part"
                >
                  {assembly.currentPartName[language]}
                  {assembly.currentPartCaption
                    ? ` · ${assembly.currentPartCaption[language]}`
                    : null}
                </p>
              ) : null}
              {assemblyHint ? (
                <p
                  className="assembly-hint"
                  data-testid="assembly-hint"
                  role="alert"
                >
                  {assemblyHint}
                </p>
              ) : null}
              {assembly.state.mode !== "idle" ? (
                <button
                  className="ghost-button"
                  data-testid="assembly-reset"
                  onClick={() => {
                    setAssemblyPlaying(false);
                    setAssemblyPickHintToken(0);
                    assembly.exitAssembly();
                    setAssemblyProgress(1);
                    setExplode(0);
                  }}
                  type="button"
                >
                  {t("assembly.showAll")}
                </button>
              ) : null}
              <ExplodedControl />
            </div>
          </details>
        </div>
      </section>

      <aside className="viewer-sidebar">
        <section className="panel">
          <article className="spotlight-card">
            <strong>{t("viewer.spotlight")}</strong>
            <p className="panel-copy">{module.data.ingenuity.hook[language]}</p>
            <p className="panel-copy">{module.data.ingenuity.demo[language]}</p>
            <button
              aria-pressed={activeTrigger?.triggerId === spotlight?.id}
              className="gold-button demo-trigger-button"
              data-demo-state={
                activeTrigger
                  ? activeTrigger.triggerId === spotlight?.id
                    ? "playing"
                    : "dimmed"
                  : "idle"
              }
              data-testid="spotlight-play"
              disabled={!spotlight || viewerGeometryReadyAt === null}
              onClick={() => spotlight && runTrigger(spotlight.id)}
              type="button"
            >
              {t("viewer.spotlightPlay")}
            </button>
            <SpotlightSemanticReadout
              module={module}
              seismoscopeBearing={SEISMOSCOPE_BEARINGS[quakeBearing]}
              visible={spotlightActive || spotlightDone}
            />
            {spotlightTranscript.length > 0 ? (
              <ol
                className="panel-copy"
                data-testid="spotlight-source-transcript"
              >
                {spotlightTranscript.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ol>
            ) : null}
            <p className="panel-copy">{module.data.ingenuity.echo[language]}</p>
            {spotlightDone ? (
              <span className="spotlight-done">
                {t("viewer.spotlightDone")}
              </span>
            ) : null}
          </article>
        </section>
        <section className="panel">
          <h2>{t("viewer.mechanisms")}</h2>
          {module.data.slug === "seismoscope" ? (
            <>
              <div
                aria-label={t("seismo.bearingLabel")}
                className="bearing-picker"
                data-testid="bearing-picker"
                role="group"
              >
                {SEISMOSCOPE_BEARINGS.map((bearing, index) => (
                  <button
                    aria-pressed={quakeBearing === index}
                    className={`chip demo-trigger-button${
                      quakeBearing === index ? " active" : ""
                    }`}
                    data-demo-state={
                      activeTrigger
                        ? activeTrigger.triggerId === "quake:arm" &&
                          activeTrigger.arg === index
                          ? "playing"
                          : "dimmed"
                        : "idle"
                    }
                    key={bearing}
                    onClick={() => {
                      if (!activeTrigger) setQuakeBearing(index);
                      runTrigger("quake:arm", index);
                    }}
                    type="button"
                  >
                    {t(`seismo.bearing.${bearing}`)}
                  </button>
                ))}
              </div>
              {armedQuakeBearing !== null ? (
                <p
                  aria-live="polite"
                  className="panel-copy"
                  data-testid="armed-bearing"
                >
                  {t("seismo.armedStatus", {
                    bearing: t(
                      `seismo.bearing.${SEISMOSCOPE_BEARINGS[armedQuakeBearing]}`,
                    ),
                  })}
                </p>
              ) : null}
            </>
          ) : null}
          <div className="mechanism-list">
            {module.mechanism?.triggers.some(
              (trigger) => !trigger.id.startsWith("drive:"),
            ) ? (
              module.mechanism.triggers
                .filter((trigger) => !trigger.id.startsWith("drive:"))
                .map((trigger) => (
                  <button
                    aria-pressed={activeTrigger?.triggerId === trigger.id}
                    className="mechanism-button demo-trigger-button"
                    data-demo-state={
                      activeTrigger
                        ? activeTrigger.triggerId === trigger.id
                          ? "playing"
                          : "dimmed"
                        : "idle"
                    }
                    data-testid={`mech-trigger-${trigger.id}`}
                    key={trigger.id}
                    onClick={() =>
                      runTrigger(
                        trigger.id,
                        trigger.id === "quake:arm"
                          ? quakeBearing
                          : undefined,
                      )
                    }
                    type="button"
                  >
                    {trigger.label[language]}
                  </button>
                ))
            ) : (
              <p className="panel-empty">{t("viewer.noMechanisms")}</p>
            )}
          </div>
          {odometerReadout !== null ? (
            <p aria-live="polite" className="event-caption">
              <strong>{t("viewer.odometerDistance")}</strong>{" "}
              <output data-testid="odometer-readout">
                {odometerReadout} {t("viewer.odometerUnit")}
              </output>
            </p>
          ) : null}
          <div
            aria-live="polite"
            className="event-caption-bar"
            data-pulsing={captionPulseToken > 0 ? "true" : "false"}
            data-testid="event-captions"
            key={captionPulseToken}
          >
            {activeTrigger ? (
              <progress
                aria-label={t("viewer.demoInProgress")}
                className="demo-progress"
                max={1}
                value={demoProgress}
              />
            ) : null}
            {caption !== "" ? <p className="event-caption">{caption}</p> : null}
          </div>
        </section>
        <SchemeSwitcher
          compareActive={compareActive}
          compareSchemeIds={compareSchemeIds}
          module={module}
          onChange={(nextSchemeId) => {
            assembly.exitAssembly();
            setSpotlightAutoFitKey(null);
            setActiveSchemeId(nextSchemeId);
            if (nextSchemeId) {
              useUiStore
                .getState()
                .setMachineScheme(module.data.slug, nextSchemeId);
            }
          }}
          onCompareChange={(active) => {
            setCompareActive(active);
            if (active) {
              setPaused(true);
              assembly.exitAssembly();
              setExplode(0);
            }
          }}
          onCompareSchemesChange={setCompareSchemeIds}
          onTransition={setSchemeTransition}
          schemeId={activeSchemeId}
        />
        <PartInspector module={module} spec={activeSpec} />
        <GalleryPanel data={module.data} />
      </aside>
      <DocentChat
        module={module}
        partId={selectedPartId}
        schemeId={activeSchemeId}
      />
    </main>
  );
}
