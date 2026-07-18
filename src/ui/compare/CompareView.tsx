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

import { KinematicGraph } from "../../sim/graph";
import type {
  IKinematicGraph,
  MachineModule,
  MachineSpec,
} from "../../sim/types";
import ComparisonTable from "./ComparisonTable";
import { compareGeometryCache } from "./geometryCache";
import {
  differencePartIds,
  driveComparedMachineGraphs,
  driveNodeForSpec,
  specForScheme,
  tintForDifference,
  type CompareSide,
} from "./model";
import { useCompareStore } from "./store";

export interface CompareSceneContext {
  cameraTarget: [number, number, number];
  differencePartIds: ReadonlySet<string>;
  driveDelta: (deltaRad: number) => void;
  driveNode: string;
  driveRevision: number;
  geometryCache: typeof compareGeometryCache;
  graph: IKinematicGraph;
  hoveredPartId?: string;
  idleAutoRotationPaused: true;
  onHoverPart: (partId?: string) => void;
  onCameraTargetChange: (target: [number, number, number]) => void;
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

function CompareFrameCounter({ onFrame }: { onFrame: () => void }) {
  useFrame(onFrame);
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
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage === "en" ? "en" : "zh";
  const hoveredPartId = useCompareStore((state) => state.hoveredPartId);
  const cameraTarget = useCompareStore((state) => state.camera.target);
  const cameraRevision = useCompareStore((state) => state.camera.revision);
  const setCameraOwner = useCompareStore((state) => state.setCameraOwner);
  const setHoveredPartId = useCompareStore((state) => state.setHoveredPartId);
  const setCameraTarget = useCompareStore((state) => state.setCameraTarget);
  const [driveRevision, setDriveRevision] = useState(0);
  const frameCounts = useRef<[number, number]>([0, 0]);
  const leftSpec = useMemo(
    () => specForScheme(module, leftSchemeId),
    [leftSchemeId, module],
  );
  const rightSpec = useMemo(
    () => specForScheme(module, rightSchemeId),
    [module, rightSchemeId],
  );
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
    const context: CompareSceneContext = {
      cameraTarget,
      differencePartIds: differences,
      driveDelta: drive,
      driveNode: driveNodes[side === "left" ? 0 : 1],
      driveRevision,
      geometryCache: compareGeometryCache,
      graph,
      hoveredPartId,
      idleAutoRotationPaused: true,
      onHoverPart: setHoveredPartId,
      onCameraTargetChange: setCameraTarget,
      schemeId,
      side,
      spec,
      tintForPart: (partId) =>
        tintForDifference(side, partId, differences, hoveredPartId),
    };
    return (
      <section
        className={`compare-viewport compare-viewport-${side}`}
        data-camera-revision={cameraRevision}
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
          gl={{ antialias: false, powerPreference: "high-performance" }}
        >
          <CompareFrameCounter
            onFrame={() => {
              frameCounts.current[side === "left" ? 0 : 1] += 1;
            }}
          />
          <LinkedCamera side={side} />
          {renderScene(context)}
        </Canvas>
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
