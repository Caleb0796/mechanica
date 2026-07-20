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
  onClose: () => void;
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
  const invalidate = useThree((state) => state.invalidate);
  const cameraRevision = useCompareStore((state) => state.camera.revision);
  const appliedRevision = useRef(-1);

  useEffect(() => {
    if (useCompareStore.getState().cameraOwner !== side) invalidate();
  }, [cameraRevision, invalidate, side]);

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
  const invalidate = useThree((state) => state.invalidate);
  const readyFrame = useRef<number | undefined>(undefined);
  const renderedFrames = useRef(0);

  useEffect(
    () => () => {
      if (readyFrame.current !== undefined) {
        cancelAnimationFrame(readyFrame.current);
      }
    },
    [],
  );

  useFrame(() => {
    onFrame();
    if (!readyEnabled || readyFrame.current !== undefined) return;
    renderedFrames.current += 1;
    if (renderedFrames.current < 2) {
      invalidate();
      return;
    }
    readyFrame.current = requestAnimationFrame(onReady);
  });
  return null;
}

function CompareInvalidator({
  register,
  revision,
  side,
}: {
  register: (side: CompareSide, invalidate?: () => void) => void;
  revision: string;
  side: CompareSide;
}) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    register(side, invalidate);
    return () => register(side, undefined);
  }, [invalidate, register, side]);

  useEffect(() => invalidate(), [invalidate, revision]);
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
  onClose,
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
  const [compiledSchemes, setCompiledSchemes] = useState<
    Partial<Record<CompareSide, string>>
  >({});
  const [readySchemes, setReadySchemes] = useState<
    Partial<Record<CompareSide, string>>
  >({});
  const [driveCaption, setDriveCaption] = useState("");
  const driveCaptionTimeout = useRef<number | null>(null);
  const driveRepeatInterval = useRef<number | null>(null);
  const frameCounts = useRef<[number, number]>([0, 0]);
  const viewportInvalidators = useRef<
    Partial<Record<CompareSide, () => void>>
  >({});
  const invalidateViewports = useCallback(() => {
    viewportInvalidators.current.left?.();
    viewportInvalidators.current.right?.();
  }, []);
  const registerInvalidator = useCallback(
    (side: CompareSide, invalidate?: () => void) => {
      viewportInvalidators.current[side] = invalidate;
    },
    [],
  );
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
      invalidateViewports();
    },
    [driveNodes, invalidateViewports, leftGraph, module, rightGraph],
  );
  const flashDriveCaption = useCallback(
    (deltaRad: number) => {
      setDriveCaption(
        language === "zh"
          ? deltaRad < 0
            ? "两侧同步后退一格"
            : "两侧同步前进一格"
          : deltaRad < 0
            ? "Both models move back one step"
            : "Both models advance one step",
      );
      if (driveCaptionTimeout.current !== null) {
        window.clearTimeout(driveCaptionTimeout.current);
      }
      driveCaptionTimeout.current = window.setTimeout(
        () => setDriveCaption(""),
        1200,
      );
    },
    [language],
  );
  const fireDrive = useCallback(
    (deltaRad: number) => {
      drive(deltaRad);
      flashDriveCaption(deltaRad);
    },
    [drive, flashDriveCaption],
  );
  const stopDriveRepeat = useCallback(() => {
    if (driveRepeatInterval.current === null) return;
    window.clearInterval(driveRepeatInterval.current);
    driveRepeatInterval.current = null;
  }, []);
  const startDriveRepeat = useCallback(
    (deltaRad: number) => {
      stopDriveRepeat();
      driveRepeatInterval.current = window.setInterval(
        () => fireDrive(deltaRad),
        160,
      );
    },
    [fireDrive, stopDriveRepeat],
  );
  const handleHoverPart = useCallback(
    (partId?: string) => {
      setHoveredPartId(partId);
      invalidateViewports();
    },
    [invalidateViewports, setHoveredPartId],
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

  useEffect(
    () => () => {
      stopDriveRepeat();
      if (driveCaptionTimeout.current !== null) {
        window.clearTimeout(driveCaptionTimeout.current);
      }
    },
    [stopDriveRepeat],
  );

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
      geometryReadyAt: geometryWarmup.committedAt,
      graph,
      hoveredPartId,
      idleAutoRotationPaused: true,
      onHoverPart: handleHoverPart,
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
          camera={{ position: useCompareStore.getState().camera.position }}
          dpr={[1, 2]}
          frameloop="demand"
          gl={{
            alpha: false,
            antialias: false,
            powerPreference: "high-performance",
            stencil: false,
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          onCreated={prepareSceneEnvironment}
        >
          <CompareInvalidator
            register={registerInvalidator}
            revision={`${cameraRevision}:${hoveredPartId ?? "none"}:${geometryWarmup.committedAt ?? "warming"}`}
            side={side}
          />
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
      <header className="compare-header">
        <strong>{module.data.names[language]}</strong>
        <span>{schemeLabel(module, leftSchemeId, language)}</span>
        <span>{schemeLabel(module, rightSchemeId, language)}</span>
        <button
          className="ghost-button"
          data-testid="compare-close"
          onClick={onClose}
          type="button"
        >
          {t("compare.close")}
        </button>
      </header>
      <div className="compare-viewports">
        {viewport("left", leftSchemeId, leftSpec, leftGraph)}
        {viewport("right", rightSchemeId, rightSpec, rightGraph)}
      </div>
      <div className="compare-drive-controls">
        <button
          aria-label={t("compare.driveReverse")}
          data-testid="compare-drive-backward"
          onClick={() => fireDrive(-Math.PI / 12)}
          onPointerCancel={stopDriveRepeat}
          onPointerDown={() => startDriveRepeat(-Math.PI / 12)}
          onPointerLeave={stopDriveRepeat}
          onPointerUp={stopDriveRepeat}
          type="button"
        >
          −
        </button>
        <button
          aria-label={t("compare.driveForward")}
          data-testid="compare-drive-forward"
          onClick={() => fireDrive(Math.PI / 12)}
          onPointerCancel={stopDriveRepeat}
          onPointerDown={() => startDriveRepeat(Math.PI / 12)}
          onPointerLeave={stopDriveRepeat}
          onPointerUp={stopDriveRepeat}
          type="button"
        >
          +
        </button>
        <p aria-live="polite" className="event-caption">
          {driveCaption}
        </p>
      </div>
      <div className="compare-table-wrap">
        <ComparisonTable
          leftSchemeId={leftSchemeId}
          module={module}
          rightSchemeId={rightSchemeId}
        />
      </div>
    </section>
  );
}
