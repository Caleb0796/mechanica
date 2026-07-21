import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  type Camera,
  Float32BufferAttribute,
  type Group,
  Line as ThreeLine,
  LineDashedMaterial,
  type Material,
  type MeshBasicMaterial,
  type Object3D,
  type Points,
  SRGBColorSpace,
  type Texture,
  TubeGeometry,
  Vector3,
} from "three";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import type { MachineModule, PrincipleAid } from "../../sim/types";

type Language = "zh" | "en";

interface AidState {
  active: boolean;
  averageFrameMs: number;
  highlightedPartIds: string[];
  index: number | null;
  kind: PrincipleAid["kind"] | null;
  flowMode: "custom" | "points" | null;
  flowParticleCount: number;
  sampledFrames: number;
}

interface AidWindow extends Window {
  __mechAid?: {
    activate: (index?: number) => void;
    deactivate: () => void;
    projectPart: (partId: string) => { x: number; y: number } | null;
    state: () => AidState;
  };
}

interface AidLayerProps {
  activeTriggerId?: string;
  aids: PrincipleAid[];
  language: Language;
  module: MachineModule;
  onCutawayChange: (partIds: string[]) => void;
  onHighlightChange: (partIds: string[]) => void;
  onRunTrigger: (triggerId: string) => void;
}

interface FramePerformance {
  samples: number[];
  totalMs: number;
}

interface FlowRuntime {
  count: number;
  mode: "custom" | "points" | null;
}

const aidNames: Record<PrincipleAid["kind"], Record<Language, string>> = {
  callouts: { zh: "部件标注", en: "Part callouts" },
  cutaway: { zh: "剖切视图", en: "Cutaway" },
  flowParticles: { zh: "流动路径", en: "Flow path" },
  powerPath: { zh: "动力路径", en: "Power path" },
  subDemo: { zh: "原理演示", en: "Principle demo" },
};

const particleColors: Record<
  Extract<PrincipleAid, { kind: "flowParticles" }>["flavor"],
  string
> = {
  custom: "#e9ddc4",
  grain: "#d8b35b",
  smoke: "#c8c5bd",
  sparks: "#ffae42",
  thread: "#e9ddc4",
  water: "#6fc7d9",
};

function softParticleTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.42, "rgba(255, 255, 255, 0.9)");
  gradient.addColorStop(0.72, "rgba(255, 255, 255, 0.35)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function calculateFullscreenPosition(
  _object: Object3D,
  _camera: Camera,
  size: { height: number; width: number },
): [number, number] {
  return [size.width / 2, size.height / 2];
}

function isObject3D(value: unknown): value is Object3D {
  return Boolean(
    value &&
    typeof value === "object" &&
    (value as { isObject3D?: boolean }).isObject3D,
  );
}

function collectTextures(
  value: unknown,
  textures: Set<Texture>,
  visited: WeakSet<object>,
): void {
  if (!value || typeof value !== "object") return;
  if ((value as Texture).isTexture) {
    textures.add(value as Texture);
    return;
  }
  if (ArrayBuffer.isView(value)) return;
  if (visited.has(value)) return;
  visited.add(value);
  for (const child of Object.values(value)) {
    collectTextures(child, textures, visited);
  }
}

function disposeObject3D(root: Object3D): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  root.traverse((object) => {
    const renderable = object as typeof object & {
      geometry?: BufferGeometry;
      material?: Material | Material[];
    };
    if (renderable.geometry) geometries.add(renderable.geometry);
    const objectMaterials = Array.isArray(renderable.material)
      ? renderable.material
      : renderable.material
        ? [renderable.material]
        : [];
    for (const material of objectMaterials) {
      materials.add(material);
      collectTextures(material, textures, new WeakSet());
    }
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}

function Callouts({
  aid,
  language,
  recordFrame,
}: {
  aid: Extract<PrincipleAid, { kind: "callouts" }>;
  language: Language;
  recordFrame: (durationMs: number) => void;
}) {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const size = useThree((state) => state.size);
  const anchors = useRef(new Map<string, Group>());
  const labels = useRef(new Map<string, HTMLSpanElement>());
  const projectedPosition = useMemo(() => new Vector3(), []);
  const worldPosition = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const startedAt = performance.now();
    const placedLabels: Array<{
      bottom: number;
      left: number;
      right: number;
      top: number;
    }> = [];
    for (const [index, anchor] of aid.anchors.entries()) {
      const part = scene.getObjectByName(anchor.partId);
      const marker = anchors.current.get(anchor.partId);
      if (!marker) continue;
      marker.visible = Boolean(part);
      if (!part) continue;
      part.getWorldPosition(worldPosition);
      marker.position.copy(worldPosition);

      const label = labels.current.get(anchor.partId);
      if (!label || label.offsetWidth === 0 || label.offsetHeight === 0) {
        continue;
      }
      projectedPosition.copy(worldPosition).project(camera);
      const anchorX = ((projectedPosition.x + 1) * size.width) / 2;
      const anchorY = ((1 - projectedPosition.y) * size.height) / 2;
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / aid.anchors.length;
      const preferredX = anchorX + Math.cos(angle) * 76;
      const preferredY = anchorY + Math.sin(angle) * 34;
      const halfWidth = label.offsetWidth / 2;
      const halfHeight = label.offsetHeight / 2;
      const centerX = Math.min(
        size.width - halfWidth - 6,
        Math.max(halfWidth + 6, preferredX),
      );
      const verticalStep = label.offsetHeight + 6;
      let centerY = Math.min(
        size.height - halfHeight - 6,
        Math.max(halfHeight + 6, preferredY),
      );
      const candidate = {
        bottom: centerY + halfHeight,
        left: centerX - halfWidth,
        right: centerX + halfWidth,
        top: centerY - halfHeight,
      };
      const maximumSearchRing = Math.ceil(size.height / verticalStep);
      for (let attempt = 0; attempt <= maximumSearchRing * 2; attempt += 1) {
        const ring =
          attempt === 0
            ? 0
            : Math.ceil(attempt / 2) * (attempt % 2 === 1 ? -1 : 1);
        centerY = Math.min(
          size.height - halfHeight - 6,
          Math.max(halfHeight + 6, preferredY + ring * verticalStep),
        );
        candidate.bottom = centerY + halfHeight;
        candidate.top = centerY - halfHeight;
        const overlaps = placedLabels.some(
          (placed) =>
            candidate.left < placed.right + 4 &&
            candidate.right + 4 > placed.left &&
            candidate.top < placed.bottom + 4 &&
            candidate.bottom + 4 > placed.top,
        );
        if (!overlaps) break;
      }
      label.style.left = `${centerX - anchorX}px`;
      label.style.top = `${centerY - anchorY}px`;
      placedLabels.push({ ...candidate });
    }
    recordFrame(performance.now() - startedAt);
  });

  return aid.anchors.map((anchor, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / aid.anchors.length;
    const offsetX = Math.cos(angle) * 76;
    const offsetY = Math.sin(angle) * 34;
    return (
      <group
        key={anchor.partId}
        ref={(group) => {
          if (group) anchors.current.set(anchor.partId, group);
          else anchors.current.delete(anchor.partId);
        }}
      >
        <Html center style={{ pointerEvents: "none" }} zIndexRange={[30, 20]}>
          <span
            data-part-id={anchor.partId}
            data-testid="aid-callout-anchor"
            style={{
              display: "block",
              height: 0,
              pointerEvents: "none",
              position: "relative",
              width: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                background: "#d9b566",
                borderRadius: "50%",
                height: "4px",
                left: "-2px",
                position: "absolute",
                top: "-2px",
                width: "4px",
              }}
            />
            <span
              data-part-id={anchor.partId}
              data-testid="aid-callout"
              ref={(label) => {
                if (label) labels.current.set(anchor.partId, label);
                else labels.current.delete(anchor.partId);
              }}
              style={{
                background: "rgba(10, 12, 12, 0.9)",
                border: "1px solid rgba(219, 181, 102, 0.72)",
                borderRadius: "999px",
                color: "#f7e8c7",
                fontSize: "12px",
                left: `${offsetX}px`,
                padding: "4px 8px",
                position: "absolute",
                top: `${offsetY}px`,
                transform: "translate(-50%, -50%)",
                whiteSpace: "nowrap",
              }}
            >
              {anchor.label[language]}
            </span>
          </span>
        </Html>
      </group>
    );
  });
}

function FlowParticles({
  aid,
  module,
  onRuntimeChange,
  recordFrame,
}: {
  aid: Extract<PrincipleAid, { kind: "flowParticles" }>;
  module: MachineModule;
  onRuntimeChange: (runtime: FlowRuntime) => void;
  recordFrame: (durationMs: number) => void;
}) {
  const scene = useThree((state) => state.scene);
  const customRoot = useRef<Group>(null);
  const points = useRef<Points>(null);
  const runtimeKey = useRef("");
  const warnedRef = useRef(false);
  const count =
    aid.flavor === "thread"
      ? Math.min(72, Math.max(24, Math.round((aid.rate ?? 40) * 0.8)))
      : Math.min(200, Math.max(24, Math.round((aid.rate ?? 40) * 2)));
  const geometry = useMemo(() => {
    const next = new BufferGeometry();
    next.setAttribute("position", new Float32BufferAttribute(count * 3, 3));
    return next;
  }, [count]);
  const pathGeometry = useMemo(() => {
    const next = new BufferGeometry();
    next.setAttribute(
      "position",
      new Float32BufferAttribute(aid.pathPartIds.length * 3, 3),
    );
    next.setDrawRange(0, 0);
    return next;
  }, [aid.pathPartIds.length]);
  const pathMaterial = useMemo(
    () =>
      new LineDashedMaterial({
        blending: AdditiveBlending,
        color: particleColors[aid.flavor],
        dashSize: 0.13,
        depthTest: false,
        depthWrite: false,
        gapSize: 0.085,
        opacity: 0.8,
        transparent: true,
      }),
    [aid.flavor],
  );
  const pathLine = useMemo(() => {
    const next = new ThreeLine(pathGeometry, pathMaterial);
    next.frustumCulled = false;
    next.name = "mechanica-aid-flow-path";
    next.raycast = () => undefined;
    next.renderOrder = 11;
    next.visible = false;
    return next;
  }, [pathGeometry, pathMaterial]);
  const particleTexture = useMemo(softParticleTexture, []);
  const pathPositions = useMemo(
    () => aid.pathPartIds.map(() => new Vector3()),
    [aid.pathPartIds],
  );
  const [customEmitter, setCustomEmitter] = useState<Object3D | null>(null);

  useEffect(
    () => () => {
      geometry.dispose();
      particleTexture.dispose();
      pathGeometry.dispose();
      pathMaterial.dispose();
    },
    [geometry, particleTexture, pathGeometry, pathMaterial],
  );
  useEffect(() => {
    if (aid.flavor !== "custom") {
      setCustomEmitter(null);
      return;
    }
    const built = module.customSceneBuilders?.[aid.emitter]?.({
      pathCount: aid.pathPartIds.length,
      rate: aid.rate ?? 40,
    });
    const object = isObject3D(built) ? built : null;
    setCustomEmitter(object);
    return () => {
      if (object) disposeObject3D(object);
    };
  }, [
    aid.emitter,
    aid.flavor,
    aid.pathPartIds.length,
    aid.rate,
    module.customSceneBuilders,
  ]);
  useEffect(
    () => () => onRuntimeChange({ count: 0, mode: null }),
    [onRuntimeChange],
  );

  useFrame((state) => {
    const startedAt = performance.now();
    let resolved = 0;
    for (let index = 0; index < aid.pathPartIds.length; index += 1) {
      const part = scene.getObjectByName(aid.pathPartIds[index]);
      if (!part) continue;
      part.getWorldPosition(pathPositions[resolved]);
      resolved += 1;
    }
    if (import.meta.env.DEV && resolved === 0 && !warnedRef.current) {
      warnedRef.current = true;
      console.warn(
        "[aids] flowParticles resolved 0 of",
        aid.pathPartIds.length,
        "part ids",
        aid.pathPartIds,
      );
    }
    const mode =
      resolved === 0
        ? null
        : customEmitter
          ? "custom"
          : aid.flavor === "custom"
            ? null
            : "points";
    const nextRuntimeKey = `${resolved}:${mode ?? "none"}`;
    if (runtimeKey.current !== nextRuntimeKey) {
      runtimeKey.current = nextRuntimeKey;
      onRuntimeChange({ count: mode ? count : 0, mode });
    }
    if (customRoot.current) customRoot.current.visible = resolved > 0;
    if (points.current) points.current.visible = resolved > 0;
    const linePositions = pathGeometry.getAttribute(
      "position",
    ) as Float32BufferAttribute;
    for (let index = 0; index < resolved; index += 1) {
      linePositions.setXYZ(index, ...pathPositions[index].toArray());
    }
    pathGeometry.setDrawRange(0, resolved);
    linePositions.needsUpdate = true;
    pathLine.visible = resolved > 1;
    if (resolved > 1) {
      pathLine.computeLineDistances();
      const lineDistances = pathGeometry.getAttribute(
        "lineDistance",
      ) as Float32BufferAttribute;
      const dashOffset = state.clock.elapsedTime * 0.36;
      for (let index = 0; index < resolved; index += 1) {
        lineDistances.setX(index, lineDistances.getX(index) + dashOffset);
      }
      lineDistances.needsUpdate = true;
    }
    if (customEmitter && customRoot.current && resolved > 0) {
      if (resolved === 1) {
        customRoot.current.position.copy(pathPositions[0]);
      } else {
        const scaled = ((state.clock.elapsedTime * 0.12) % 1) * (resolved - 1);
        const segment = Math.min(resolved - 2, Math.floor(scaled));
        customRoot.current.position
          .copy(pathPositions[segment])
          .lerp(pathPositions[segment + 1], scaled - segment);
      }
    } else if (points.current) {
      const positions = geometry.getAttribute(
        "position",
      ) as Float32BufferAttribute;
      if (resolved === 1) {
        for (let index = 0; index < count; index += 1) {
          positions.setXYZ(index, ...pathPositions[0].toArray());
        }
      } else if (resolved > 1) {
        for (let index = 0; index < count; index += 1) {
          const progress = (index / count + state.clock.elapsedTime * 0.12) % 1;
          const scaled = progress * (resolved - 1);
          const segment = Math.min(resolved - 2, Math.floor(scaled));
          const local = scaled - segment;
          const start = pathPositions[segment];
          const end = pathPositions[segment + 1];
          positions.setXYZ(
            index,
            start.x + (end.x - start.x) * local,
            start.y + (end.y - start.y) * local,
            start.z + (end.z - start.z) * local,
          );
        }
      }
      positions.needsUpdate = true;
    }
    recordFrame(performance.now() - startedAt);
  });

  return (
    <>
      <primitive dispose={null} object={pathLine} />
      {aid.flavor === "custom" ? (
        customEmitter ? (
          <group
            name="mechanica-aid-custom-emitter"
            ref={customRoot}
            visible={false}
          >
            <primitive dispose={null} object={customEmitter} />
          </group>
        ) : null
      ) : (
        <points
          geometry={geometry}
          name="mechanica-aid-flow-particles"
          ref={points}
          renderOrder={12}
          visible={false}
        >
          <pointsMaterial
            alphaTest={0.02}
            blending={AdditiveBlending}
            color={particleColors[aid.flavor]}
            depthTest={false}
            depthWrite={false}
            map={particleTexture}
            opacity={0.95}
            size={
              aid.flavor === "thread"
                ? 0.034
                : aid.flavor === "sparks"
                  ? 0.065
                  : 0.075
            }
            sizeAttenuation
            transparent
          />
        </points>
      )}
    </>
  );
}

function PowerPathRoute({
  aid,
  currentPartId,
  language,
  module,
}: {
  aid: Extract<PrincipleAid, { kind: "powerPath" }>;
  currentPartId: string | null;
  language: Language;
  module: MachineModule;
}) {
  const scene = useThree((state) => state.scene);
  const [curveVersion, setCurveVersion] = useState(0);
  const labelAnchor = useRef<Group>(null);
  const material = useRef<MeshBasicMaterial>(null);
  const worldPosition = useMemo(() => new Vector3(), []);
  const tube = useMemo(() => {
    const points: Vector3[] = [];
    for (const partId of aid.sequence) {
      const object = scene.getObjectByName(partId);
      if (!object) continue;
      const point = new Vector3();
      object.getWorldPosition(point);
      points.push(point);
    }
    if (points.length < 2) return null;
    const curve = new CatmullRomCurve3(points, false, "catmullrom", 0.12);
    return new TubeGeometry(curve, points.length * 8, 0.028, 6, false);
  }, [aid.sequence, curveVersion, scene]);
  const currentPartName = currentPartId
    ? (module.spec.parts.find((part) => part.id === currentPartId)?.name[
        language
      ] ?? currentPartId)
    : null;

  useFrame((state) => {
    if (material.current) {
      material.current.opacity =
        0.55 + 0.25 * Math.sin(state.clock.elapsedTime * 3);
    }
    if (!labelAnchor.current) return;
    const part = currentPartId
      ? scene.getObjectByName(currentPartId)
      : undefined;
    labelAnchor.current.visible = Boolean(part);
    if (!part) return;
    part.getWorldPosition(worldPosition);
    labelAnchor.current.position.copy(worldPosition);
  });
  useEffect(() => {
    const id = window.setInterval(
      () => setCurveVersion((version) => version + 1),
      1200,
    );
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => () => tube?.dispose(), [tube]);

  if (!tube) return null;
  return (
    <>
      <mesh geometry={tube} name="mechanica-aid-power-route" renderOrder={5}>
        <meshBasicMaterial
          color="#f2b23e"
          depthTest={false}
          opacity={0.6}
          ref={material}
          transparent
        />
      </mesh>
      {currentPartName ? (
        <group ref={labelAnchor} visible={false}>
          <Html center style={{ pointerEvents: "none" }} zIndexRange={[30, 20]}>
            <span
              data-part-id={currentPartId ?? undefined}
              data-testid="aid-power-label"
              style={{
                background: "rgba(10, 12, 12, 0.9)",
                border: "1px solid rgba(242, 178, 62, 0.85)",
                borderRadius: "999px",
                color: "#fff3d5",
                display: "block",
                fontSize: "12px",
                padding: "4px 8px",
                transform: "translateY(-22px)",
                whiteSpace: "nowrap",
              }}
            >
              {currentPartName}
            </span>
          </Html>
        </group>
      ) : null}
    </>
  );
}

export default function AidLayer({
  activeTriggerId,
  aids,
  language,
  module,
  onCutawayChange,
  onHighlightChange,
  onRunTrigger,
}: AidLayerProps) {
  const { t } = useTranslation();
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [currentPartId, setCurrentPartId] = useState<string | null>(null);
  const highlightedPartIds = useRef<string[]>([]);
  const framePerformance = useRef<FramePerformance>({
    samples: [],
    totalMs: 0,
  });
  const flowRuntime = useRef<FlowRuntime>({ count: 0, mode: null });
  const projection = useMemo(() => new Vector3(), []);
  const aidWindow = window as AidWindow;
  const hooksEnabled = import.meta.env.DEV || import.meta.env.VITE_E2E === "1";
  const activeAid = activeIndex === null ? null : (aids[activeIndex] ?? null);
  const flowCutawayIndex =
    activeAid?.kind === "flowParticles"
      ? aids.findIndex((aid) => aid.kind === "cutaway")
      : -1;

  const resetPerformance = useCallback(() => {
    framePerformance.current = { samples: [], totalMs: 0 };
  }, []);
  const recordFrame = useCallback((durationMs: number) => {
    const measurement = framePerformance.current;
    measurement.samples.push(durationMs);
    measurement.totalMs += durationMs;
    if (measurement.samples.length > 60) {
      measurement.totalMs -= measurement.samples.shift() ?? 0;
    }
  }, []);
  const setFlowRuntime = useCallback((runtime: FlowRuntime) => {
    flowRuntime.current = runtime;
  }, []);

  useEffect(() => {
    if (!activeTriggerId) return;
    resetPerformance();
    setActiveIndex(null);
  }, [activeTriggerId, resetPerformance]);

  useFrame(() => {
    if (
      activeAid &&
      activeAid.kind !== "callouts" &&
      activeAid.kind !== "flowParticles"
    ) {
      recordFrame(0);
    }
  });

  useEffect(() => {
    if (activeTriggerId || !activeAid || activeAid.kind !== "powerPath") {
      highlightedPartIds.current = [];
      setCurrentPartId(null);
      onHighlightChange([]);
      return;
    }
    let index = 0;
    const showPart = () => {
      highlightedPartIds.current = [activeAid.sequence[index]];
      setCurrentPartId(activeAid.sequence[index]);
      onHighlightChange(highlightedPartIds.current);
      index = (index + 1) % activeAid.sequence.length;
    };
    showPart();
    const interval = window.setInterval(showPart, activeAid.dwellMs ?? 700);
    return () => {
      window.clearInterval(interval);
      highlightedPartIds.current = [];
      setCurrentPartId(null);
      onHighlightChange([]);
    };
  }, [activeAid, activeTriggerId, onHighlightChange]);

  useEffect(() => {
    const cutawayAid =
      activeAid?.kind === "cutaway"
        ? activeAid
        : activeAid?.kind === "flowParticles"
          ? aids.find((aid) => aid.kind === "cutaway")
          : undefined;
    const nextPartIds =
      cutawayAid?.kind === "cutaway" ? cutawayAid.partIds : [];
    onCutawayChange(nextPartIds);
    return () => onCutawayChange([]);
  }, [activeAid, aids, onCutawayChange]);

  useLayoutEffect(() => {
    if (!hooksEnabled) return;
    aidWindow.__mechAid = {
      activate: (index = 0) => {
        if (!aids[index]) return;
        resetPerformance();
        setActiveIndex(index);
      },
      deactivate: () => {
        resetPerformance();
        setActiveIndex(null);
      },
      projectPart: (partId) => {
        const part = scene.getObjectByName(partId);
        if (!part) return null;
        part.getWorldPosition(projection);
        projection.project(camera);
        const bounds = gl.domElement.getBoundingClientRect();
        return {
          x: bounds.left + ((projection.x + 1) * bounds.width) / 2,
          y: bounds.top + ((1 - projection.y) * bounds.height) / 2,
        };
      },
      state: () => {
        const measurement = framePerformance.current;
        return {
          active: activeAid !== null,
          averageFrameMs:
            measurement.samples.length > 0
              ? measurement.totalMs / measurement.samples.length
              : 0,
          highlightedPartIds: [...highlightedPartIds.current],
          index: activeIndex,
          kind: activeAid?.kind ?? null,
          flowMode: flowRuntime.current.mode,
          flowParticleCount: flowRuntime.current.count,
          sampledFrames: measurement.samples.length,
        };
      },
    };
    return () => {
      delete aidWindow.__mechAid;
    };
  }, [
    activeAid,
    activeIndex,
    aidWindow,
    aids,
    camera,
    gl.domElement,
    hooksEnabled,
    projection,
    resetPerformance,
    scene,
  ]);

  useEffect(
    () => () => {
      highlightedPartIds.current = [];
      onHighlightChange([]);
      onCutawayChange([]);
    },
    [onCutawayChange, onHighlightChange],
  );

  if (aids.length === 0) return null;

  return (
    <>
      {activeAid?.kind === "callouts" ? (
        <Callouts
          aid={activeAid}
          language={language}
          recordFrame={recordFrame}
        />
      ) : null}
      {activeAid?.kind === "flowParticles" ? (
        <FlowParticles
          aid={activeAid}
          module={module}
          onRuntimeChange={setFlowRuntime}
          recordFrame={recordFrame}
        />
      ) : null}
      {activeAid?.kind === "powerPath" && !activeTriggerId ? (
        <PowerPathRoute
          aid={activeAid}
          currentPartId={currentPartId}
          language={language}
          module={module}
        />
      ) : null}
      <Html
        calculatePosition={calculateFullscreenPosition}
        fullscreen
        style={{ pointerEvents: "none" }}
        zIndexRange={[40, 31]}
      >
        <div
          data-active-aid-kind={activeAid?.kind ?? "none"}
          data-testid="aid-layer"
          style={{
            inset: 0,
            pointerEvents: "none",
            position: "absolute",
          }}
        >
          <div
            aria-label={t("viewer.principleAids")}
            className="aid-chip-toolbar"
            role="toolbar"
          >
            {aids.map((aid, index) => {
              const pressed =
                activeIndex === index ||
                flowCutawayIndex === index ||
                (aid.kind === "subDemo" && activeTriggerId === aid.triggerId);
              return (
                <button
                  aria-pressed={pressed}
                  data-aid-kind={aid.kind}
                  data-aid-linked={
                    flowCutawayIndex === index ? "true" : undefined
                  }
                  data-testid="aid-select"
                  key={`${aid.kind}:${index}`}
                  onClick={() => {
                    resetPerformance();
                    if (aid.kind === "subDemo") {
                      setActiveIndex(index);
                      onRunTrigger(aid.triggerId);
                      return;
                    }
                    setActiveIndex((current) =>
                      current === index ? null : index,
                    );
                  }}
                  style={{
                    background: pressed
                      ? "rgba(178, 125, 44, 0.94)"
                      : "rgba(12, 14, 14, 0.88)",
                    border: "1px solid rgba(219, 181, 102, 0.7)",
                    borderRadius: "999px",
                    color: "#fff3d5",
                    cursor: "pointer",
                    font: "inherit",
                    fontSize: "12px",
                    padding: "6px 10px",
                  }}
                  type="button"
                >
                  {("label" in aid ? aid.label?.[language] : undefined) ??
                    aidNames[aid.kind][language]}
                </button>
              );
            })}
            {activeAid?.kind === "subDemo" ? (
              <button
                aria-pressed={activeTriggerId === activeAid.triggerId}
                className="demo-trigger-button"
                data-demo-state={
                  activeTriggerId
                    ? activeTriggerId === activeAid.triggerId
                      ? "playing"
                      : "dimmed"
                    : "idle"
                }
                data-testid="aid-sub-demo"
                onClick={() => onRunTrigger(activeAid.triggerId)}
                style={{
                  background: "#ead19c",
                  border: 0,
                  borderRadius: "999px",
                  color: "#21170d",
                  cursor: "pointer",
                  font: "inherit",
                  fontSize: "12px",
                  padding: "6px 10px",
                }}
                type="button"
              >
                {activeAid.caption[language]}
              </button>
            ) : null}
            {activeAid && "label" in activeAid && activeAid.label ? (
              <output
                style={{
                  alignItems: "center",
                  background: "rgba(12, 14, 14, 0.88)",
                  borderRadius: "999px",
                  color: "#fff3d5",
                  display: "flex",
                  fontSize: "12px",
                  padding: "6px 10px",
                }}
              >
                {activeAid.label[language]}
              </output>
            ) : null}
          </div>
        </div>
      </Html>
    </>
  );
}
