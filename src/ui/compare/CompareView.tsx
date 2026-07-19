import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { ACESFilmicToneMapping } from "three";

import { KinematicGraph } from "../../sim/graph";
import type {
  IKinematicGraph,
  MachineModule,
  MachineSpec,
} from "../../sim/types";
import ComparisonTable from "./ComparisonTable";
import {
  differencePartIds,
  driveComparedMachineGraphs,
  driveNodeForSpec,
  specForScheme,
  tintForDifference,
  type CompareSide,
} from "./model";
import { useCompareStore } from "./store";
import SceneEnvironment, {
  prepareSceneEnvironment,
} from "../viewer/SceneEnvironment";
import {
  GeometryLoading,
  useMachineGeometryWarmup,
} from "../viewer/geometryWarmup";

export interface CompareSceneContext {
  cameraTarget: [number, number, number];
  differencePartIds: ReadonlySet<string>;
  driveDelta: (deltaRad: number) => void;
  driveNode: string;
  driveRevision: number;
  geometryReadyAt: number | null;
  graph: IKinematicGraph;
  hoveredPartId?: string;
  idleAutoRotationPaused: true;
  onHoverPart: (partId?: string) => void;
  onCameraTargetChange: (target: [number, number, number]) => void;
  onGeometryCommitted: (committedAt: number) => void;
  schemeId: string;
  side: CompareSide;
  spec: MachineSpec;
  tintForPart: (partId: string) => {
    color?: string;
    emissive?: string;
    opacity: number;
  };
}

interface CompareViewProps {
  leftSchemeId: string;
  module: MachineModule;
  renderScene: (context: CompareSceneContext) => ReactNode;
  rightSchemeId: string;
}

interface MechCompareHook {
  graphs: [IKinematicGraph, IKinematicGraph];
  drive: (deltaRad: number) => void;
  frameCounts: [number, number];
  resetFrameCounts: () => void;
}

declare global {
  interface Window {
    __mechCompare?: MechCompareHook;
  }
}

function LinkedCamera({ side }: { side: CompareSide }) {
  const { camera } = useThree();
  const appliedRevision = useRef(-1);

  useFrame(() => {
    const state = useCompareStore.getState();
    const zoomCamera = camera as typeof camera & {
      zoom?: number;
      updateProjectionMatrix?: () => void;
    };
    if (state.cameraOwner === side) {
      state.publishCamera(
        [camera.position.x, camera.position.y, camera.position.z],
        [
          camera.quaternion.x,
          camera.quaternion.y,
          camera.quaternion.z,
          camera.quaternion.w,
        ],
        zoomCamera.zoom ?? 1,
      );
      return;
    }
    if (appliedRevision.current === state.camera.revision) return;
    camera.position.set(...state.camera.position);
    camera.quaternion.set(...state.camera.quaternion);
    if (typeof zoomCamera.zoom === "number") {
      zoomCamera.zoom = state.camera.zoom;
      zoomCamera.updateProjectionMatrix?.();
    }
    appliedRevision.current = state.camera.revision;
  });

  return null;
}

function CompareFrameCounter({
  onFrame,
  onReady,
  readyEnabled,
}: {
  onFrame: () => void;
  onReady: () => void;
  readyEnabled: boolean;
}) {
  const readyFrame = useRef<number | undefined>(undefined);
  const stableFrames = useRef(0);

  useEffect(
    () => () => {
      if (readyFrame.current !== undefined) {
        cancelAnimationFrame(readyFrame.current);
      }
    },
    [],
  );

  useFrame((_, deltaSeconds) => {
    onFrame();
    if (!readyEnabled || readyFrame.current !== undefined) return;
    stableFrames.current =
      deltaSeconds <= 1 / 35 ? stableFrames.current + 1 : 0;
    if (stableFrames.current < 12) return;
    readyFrame.current = requestAnimationFrame(onReady);
  });
  return null;
}

function schemeLabel(
  module: MachineModule,
  schemeId: string,
  language: "zh" | "en",
): string {
  const scheme = module.schemes?.[schemeId];
  if (!scheme) return schemeId;
  return `${scheme.scholar[language]} · ${scheme.year}`;
}

function compareGraph(module: MachineModule, schemeId: string): KinematicGraph {
  const graph = new KinematicGraph(module.spec);
  graph.setScheme(module.schemes?.[schemeId]);
  return graph;
}

export default function CompareView({
  leftSchemeId,
  module,
  renderScene,
  rightSchemeId,
}: CompareViewProps) {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage === "en" ? "en" : "zh";
  const hoveredPartId = useCompareStore((state) => state.hoveredPartId);
  const cameraTarget = useCompareStore((state) => state.camera.target);
  const cameraRevision = useCompareStore((state) => state.camera.revision);
  const setCameraOwner = useCompareStore((state) => state.setCameraOwner);
  const setHoveredPartId = useCompareStore((state) => state.setHoveredPartId);
  const setCameraTarget = useCompareStore((state) => state.setCameraTarget);
  const [driveRevision, setDriveRevision] = useState(0);
  const [compiledSchemes, setCompiledSchemes] = useState<
    Partial<Record<CompareSide, string>>
  >({});
  const [readySchemes, setReadySchemes] = useState<
    Partial<Record<CompareSide, string>>
  >({});
  const frameCounts = useRef<[number, number]>([0, 0]);
  const leftSpec = useMemo(
    () => specForScheme(module, leftSchemeId),
    [leftSchemeId, module],
  );
  const rightSpec = useMemo(
    () => specForScheme(module, rightSchemeId),
    [module, rightSchemeId],
  );
  const leftWarmup = useMachineGeometryWarmup({
    consumerScope: "compare:left",
    module,
    spec: leftSpec,
    warmupKey: `${module.data.slug}:${leftSchemeId}`,
  });
  const rightWarmup = useMachineGeometryWarmup({
    consumerScope: "compare:right",
    module,
    spec: rightSpec,
    warmupKey: `${module.data.slug}:${rightSchemeId}`,
  });
  const leftGraph = useMemo(
    () => compareGraph(module, leftSchemeId),
    [leftSchemeId, module],
  );
  const rightGraph = useMemo(
    () => compareGraph(module, rightSchemeId),
    [module, rightSchemeId],
  );
  const differences = useMemo(
    () => differencePartIds(leftSpec, rightSpec),
    [leftSpec, rightSpec],
  );
  const driveNodes = useMemo(
    () => [driveNodeForSpec(leftSpec), driveNodeForSpec(rightSpec)] as const,
    [leftSpec, rightSpec],
  );
  const drive = useCallback(
    (deltaRad: number) => {
      driveComparedMachineGraphs(
        module,
        [leftGraph, rightGraph],
        driveNodes,
        deltaRad,
      );
      setDriveRevision((revision) => revision + 1);
    },
    [driveNodes, leftGraph, module, rightGraph],
  );
  const markViewportReady = useCallback(
    (side: CompareSide, schemeId: string) => {
      setReadySchemes((current) =>
        current[side] === schemeId ? current : { ...current, [side]: schemeId },
      );
    },
    [],
  );
  const markViewportCompiled = useCallback(
    (side: CompareSide, schemeId: string) => {
      setCompiledSchemes((current) =>
        current[side] === schemeId ? current : { ...current, [side]: schemeId },
      );
    },
    [],
  );

  useEffect(() => {
    const exposeHook =
      import.meta.env.DEV ||
      import.meta.env.VITE_E2E === "1" ||
      import.meta.env.VITE_E2E === "true";
    if (!exposeHook) return;
    window.__mechCompare = {
      graphs: [leftGraph, rightGraph],
      drive,
      frameCounts: frameCounts.current,
      resetFrameCounts: () => {
        frameCounts.current[0] = 0;
        frameCounts.current[1] = 0;
      },
    };
    return () => {
      delete window.__mechCompare;
    };
  }, [drive, leftGraph, rightGraph]);

  const viewport = (
    side: CompareSide,
    schemeId: string,
    spec: MachineSpec,
    graph: IKinematicGraph,
  ) => {
    const geometryWarmup = side === "left" ? leftWarmup : rightWarmup;
    const context: CompareSceneContext = {
      cameraTarget,
      differencePartIds: differences,
      driveDelta: drive,
      driveNode: driveNodes[side === "left" ? 0 : 1],
      driveRevision,
      geometryReadyAt: geometryWarmup.committedAt,
      graph,
      hoveredPartId,
      idleAutoRotationPaused: true,
      onHoverPart: setHoveredPartId,
      onCameraTargetChange: setCameraTarget,
      onGeometryCommitted: geometryWarmup.commit,
      schemeId,
      side,
      spec,
      tintForPart: (partId) =>
        tintForDifference(side, partId, differences, hoveredPartId),
    };
    const compiled = compiledSchemes[side] === schemeId;
    const ready = readySchemes[side] === schemeId;
    return (
      <section
        className={`compare-viewport-shell ${ready ? "compare-viewport" : ""} compare-viewport-${side}`}
        data-camera-revision={cameraRevision}
        data-geometry-built={geometryWarmup.built}
        data-geometry-state={geometryWarmup.status}
        data-geometry-total={geometryWarmup.total}
        data-machine-ready={
          geometryWarmup.committedAt !== null ? "true" : "false"
        }
        data-ready={ready}
        data-scheme-id={schemeId}
        onPointerDown={() => setCameraOwner(side)}
        onPointerEnter={() => setCameraOwner(side)}
      >
        <header className="compare-scholar-bar">
          {schemeLabel(module, schemeId, language)}
        </header>
        <Canvas
          dpr={module.spec.slug === "astroclock" ? 0.5 : undefined}
          frameloop="always"
          gl={{
            antialias: false,
            powerPreference: "high-performance",
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          onCreated={prepareSceneEnvironment}
        >
          <CompareFrameCounter
            key={`${schemeId}:${compiled ? "compiled" : "warming"}`}
            onFrame={() => {
              frameCounts.current[side === "left" ? 0 : 1] += 1;
            }}
            onReady={() => markViewportReady(side, schemeId)}
            readyEnabled={compiled && geometryWarmup.committedAt !== null}
          />
          <LinkedCamera side={side} />
          {geometryWarmup.prepared ? renderScene(context) : null}
          <SceneEnvironment
            onReady={() => markViewportCompiled(side, schemeId)}
          />
        </Canvas>
        {!geometryWarmup.prepared ? (
          <GeometryLoading
            built={geometryWarmup.built}
            label={t("app.loading")}
            scope={`compare:${side}`}
            total={geometryWarmup.total}
          />
        ) : null}
      </section>
    );
  };

  return (
    <section className="compare-view" data-testid="compare-view">
      {module.spec.slug === "astroclock" ? (
        <p className="compare-resolution-notice" role="note">
          {language === "en"
            ? "Astroclock comparison uses half-resolution rendering."
            : "水运仪象台对比模式使用半分辨率渲染。"}
        </p>
      ) : null}
      <div className="compare-viewports">
        {viewport("left", leftSchemeId, leftSpec, leftGraph)}
        {viewport("right", rightSchemeId, rightSpec, rightGraph)}
      </div>
      <div className="compare-drive-controls">
        <button
          data-testid="compare-drive-backward"
          onClick={() => drive(-Math.PI / 12)}
          type="button"
        >
          −
        </button>
        <button
          data-testid="compare-drive-forward"
          onClick={() => drive(Math.PI / 12)}
          type="button"
        >
          +
        </button>
      </div>
      <ComparisonTable
        leftSchemeId={leftSchemeId}
        module={module}
        rightSchemeId={rightSchemeId}
      />
    </section>
  );
}
