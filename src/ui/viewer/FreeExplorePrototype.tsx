import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ACESFilmicToneMapping, Euler, Quaternion, Vector3 } from "three";
import WebGL from "three/addons/capabilities/WebGL.js";

import { applySchemePatch, KinematicGraph } from "../../sim/graph";
import type { MachineModule } from "../../sim/types";
import type { FreeMoveControl } from "./FreeMovePart";
import type { FreeMoveOffset } from "./freeMove";
import { MachineScene } from "./MachineViewer";
import { useMachineGeometryWarmup } from "./geometryWarmup";
import SceneEnvironment, { prepareSceneEnvironment } from "./SceneEnvironment";
import FreeExploreScene, {
  EXPLORE_HOME,
  EXPLORE_PROFILE,
  type ExploreCameraActions,
  type ExploreGeometry,
  type ExploreOffsets,
} from "./FreeExploreScene";
import {
  MOVABLE_PART_IDS,
  coupledToadMove,
  createSeismoscopeExperiment,
  experimentBallAttachment,
  experimentQuake,
  resolveExperimentRelease,
  type ExperimentQuake,
} from "./seismoscopeExperiment";
import {
  createExploreAction,
  sampleExploreAction,
  type ExploreActionClip,
} from "./freeExploreAction";
import "./freeExplore.css";
import { useExploreDoubleTap } from "./useExploreDoubleTap";
import ExploreTremorEffects, {
  type ExploreTremorRun,
} from "./ExploreTremorEffects";
import {
  tremorFromPoint,
  tremorForChannel,
  TREMOR_DURATION_SECONDS,
  type ExploreTremor,
} from "./exploreTremor";

const SCHEME_ID = "fengrui";
const NO_PARTS: string[] = [];
const BEARINGS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
const emptyOffsets = (): ExploreOffsets =>
  Object.fromEntries(MOVABLE_PART_IDS.map((id) => [id, [0, 0, 0]]));
const copyOffsets = (offsets: ExploreOffsets): ExploreOffsets =>
  Object.fromEntries(
    Object.entries(offsets).map(([id, value]) => [
      id,
      [...value] as FreeMoveOffset,
    ]),
  );
const moved = (offset: FreeMoveOffset | undefined) =>
  offset ? Math.hypot(...offset) > 1e-6 : false;
const different = (a: ExploreOffsets, b: ExploreOffsets) =>
  MOVABLE_PART_IDS.some((id) =>
    a[id].some((v, axis) => Math.abs(v - b[id][axis]) > 1e-6),
  );
interface Motion {
  from: FreeMoveOffset;
  to: FreeMoveOffset;
  elapsed: number;
  duration: number;
}
interface ActionRun {
  clip: ExploreActionClip;
  result: ExperimentQuake;
  elapsed: number;
  released: boolean;
}
type Notice =
  | "idle"
  | "ground"
  | "loaded"
  | "caught"
  | "missed"
  | "no-trigger"
  | "empty"
  | "seat-occupied";

export default function FreeExplorePrototype({
  module,
}: {
  module: MachineModule;
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage === "zh" ? "zh" : "en";
  const [graphicsAvailable] = useState(() => WebGL.isWebGL2Available());
  const [offsets, setOffsets] = useState<ExploreOffsets>(emptyOffsets);
  const offsetsRef = useRef(offsets);
  const [selectedId, setSelectedId] = useState("lid");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<"explore" | "action">("explore");
  const [lastTremor, setLastTremor] = useState<ExploreTremor | null>(null);
  const [tremorCount, setTremorCount] = useState(0);
  const [bearing, setBearing] = useState(1);
  const [notice, setNotice] = useState<Notice>("idle");
  const [history, setHistory] = useState<ExploreOffsets[]>([]);
  const [geometry, setGeometry] = useState<ExploreGeometry | null>(null);
  const dragStart = useRef<ExploreOffsets>(offsets);
  const keyboardMoving = useRef(false);
  const motions = useRef<Record<string, Motion>>({});
  const action = useRef<ActionRun | null>(null);
  const tremor = useRef<ExploreTremorRun | null>(null);
  const stage = useRef<HTMLElement>(null);
  const cameraActions = useRef<ExploreCameraActions | null>(null);
  const displayState = useRef<Record<string, number> | null>(null);
  const activeSpec = useMemo(
    () => applySchemePatch(module.spec, module.schemes?.[SCHEME_ID]),
    [module],
  );
  const partsById = useMemo(
    () => new Map(activeSpec.parts.map((part) => [part.id, part])),
    [activeSpec],
  );
  const graph = useMemo(() => new KinematicGraph(activeSpec), [activeSpec]);
  const model = useMemo(
    () =>
      geometry
        ? createSeismoscopeExperiment(
            activeSpec,
            geometry.homeBounds,
            geometry.assemblyBounds,
            geometry.floorY,
          )
        : null,
    [activeSpec, geometry],
  );
  const modelRef = useRef(model);
  modelRef.current = model;
  const warmup = useMachineGeometryWarmup({
    module,
    spec: activeSpec,
    consumerScope: "viewer",
    warmupKey: `free-explore:${SCHEME_ID}`,
  });
  const ready = warmup.committedAt !== null && Boolean(model);
  const busy = Boolean(draggingId) || settling || running;
  const sensorCovered = !moved(offsets.lid) && !moved(offsets.duzhu);
  const sensorBlocked = selectedId === "duzhu" && sensorCovered;
  const selectedPart = partsById.get(selectedId)!;
  const anyMoved = MOVABLE_PART_IDS.some((id) => moved(offsets[id]));

  const commit = useCallback((next: ExploreOffsets) => {
    offsetsRef.current = next;
    setOffsets(next);
  }, []);
  const moveWorld = useCallback(
    (id: string, next: FreeMoveOffset) => {
      const current = offsetsRef.current;
      commit(
        id.startsWith("toad-") && modelRef.current
          ? coupledToadMove(modelRef.current, id, current, next)
          : { ...current, [id]: [...next] },
      );
    },
    [commit],
  );
  const remember = useCallback(
    (previous: ExploreOffsets) =>
      setHistory((current) => [...current.slice(-29), copyOffsets(previous)]),
    [],
  );
  const cancelMotion = useCallback(() => {
    motions.current = {};
    action.current = null;
    tremor.current = null;
    displayState.current = null;
    setSettling(false);
    setRunning(false);
  }, []);
  const animateTo = useCallback(
    (id: string, to: FreeMoveOffset) => {
      const from = offsetsRef.current[id];
      if (from.every((value, axis) => Math.abs(value - to[axis]) < 1e-6))
        return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        moveWorld(id, to);
        return;
      }
      motions.current[id] = {
        from: [...from],
        to: [...to],
        elapsed: 0,
        duration: 0.48,
      };
      setSettling(true);
    },
    [moveWorld],
  );
  const settle = useCallback(
    (id: string, snapHome = true) => {
      const currentModel = modelRef.current;
      if (!currentModel) return;
      let proposed = offsetsRef.current[id];
      const ball = currentModel.channels.find(
        (channel) => channel.ballId === id,
      );
      // A screen-plane drag cannot reach a seat at a different depth. Resolve
      // a nearby visible, vacant target before applying the world-space rules.
      if (ball && snapHome && cameraActions.current) {
        const origin = new Vector3(...ball.dragonSeat);
        const screen = cameraActions.current.project(
          origin
            .clone()
            .add(new Vector3(...proposed))
            .toArray() as FreeMoveOffset,
        );
        if (screen) {
          const targets = currentModel.channels
            .flatMap((channel) =>
              (["dragon", "toad"] as const).map((kind) => {
                const point = new Vector3(
                  ...(kind === "dragon"
                    ? channel.dragonSeat
                    : channel.toadMouth),
                );
                if (kind === "toad")
                  point.add(new Vector3(...offsetsRef.current[channel.toadId]));
                const occupied = currentModel.channels.some((candidate) => {
                  if (candidate.ballId === id) return false;
                  const attached = experimentBallAttachment(
                    currentModel,
                    candidate.ballId,
                    offsetsRef.current,
                  );
                  return (
                    attached?.kind === kind &&
                    attached.channel === channel.channel
                  );
                });
                const projected = occupied
                  ? null
                  : cameraActions.current!.project(
                      point.toArray() as FreeMoveOffset,
                      id,
                    );
                return {
                  point,
                  distance: projected
                    ? Math.hypot(
                        projected[0] - screen[0],
                        projected[1] - screen[1],
                      )
                    : Infinity,
                };
              }),
            )
            .sort((a, b) => a.distance - b.distance);
          if (targets[0]?.distance <= 22)
            proposed = targets[0].point.sub(origin).toArray() as FreeMoveOffset;
        }
      }
      const release = resolveExperimentRelease(
        currentModel,
        id,
        proposed,
        offsetsRef.current,
        { snapHome },
      );
      animateTo(id, release.offset);
      setNotice(
        release.surface === "dragon"
          ? "loaded"
          : release.surface === "toad"
            ? "caught"
            : release.surface === "ground"
              ? "ground"
              : "idle",
      );
    },
    [animateTo],
  );
  const onDraggingChange = useCallback(
    (id: string, active: boolean) => {
      if (active) {
        dragStart.current = copyOffsets(offsetsRef.current);
        setSelectedId(id);
        setNotice("idle");
      } else if (different(dragStart.current, offsetsRef.current)) {
        remember(dragStart.current);
        settle(id);
      }
      setDraggingId(active ? id : null);
    },
    [remember, settle],
  );
  const freeMoves = useMemo(
    () =>
      Object.fromEntries(
        MOVABLE_PART_IDS.map((id) => {
          const rotation = new Quaternion().setFromEuler(
            new Euler(...(partsById.get(id)?.rotationEuler ?? [0, 0, 0])),
          );
          const localOffset = new Vector3(...offsets[id])
            .applyQuaternion(rotation.clone().invert())
            .toArray() as FreeMoveOffset;
          const control: FreeMoveControl = {
            partId: id,
            offset: localOffset,
            enabled:
              mode === "explore" &&
              !running &&
              !settling &&
              (!draggingId || draggingId === id) &&
              (id !== "duzhu" || !sensorCovered),
            pickupPadding: id.startsWith("ball-") ? 0.045 : undefined,
            onSelect: () => setSelectedId(id),
            onMove: (next) =>
              moveWorld(
                id,
                new Vector3(...next)
                  .applyQuaternion(rotation)
                  .toArray() as FreeMoveOffset,
              ),
            onDraggingChange: (active) => onDraggingChange(id, active),
          };
          return [id, control];
        }),
      ),
    [
      partsById,
      offsets,
      mode,
      running,
      settling,
      draggingId,
      sensorCovered,
      moveWorld,
      onDraggingChange,
    ],
  );

  const onFrame = useCallback(
    (delta: number) => {
      if (tremor.current) {
        tremor.current.elapsed += delta;
        if (tremor.current.elapsed >= TREMOR_DURATION_SECONDS) {
          tremor.current = null;
          setRunning(false);
        }
      }
      const currentAction = action.current;
      if (currentAction) {
        currentAction.elapsed += delta;
        const frame = sampleExploreAction(
          currentAction.clip,
          currentAction.elapsed,
        );
        displayState.current = frame.state;
        if (frame.release && !currentAction.released) {
          currentAction.released = true;
          const result = currentAction.result;
          if (result.kind === "caught" || result.kind === "missed") {
            animateTo(result.ballId, result.to);
            setNotice(result.kind);
          }
        }
        if (frame.done) {
          action.current = null;
          displayState.current = null;
        }
      }
      const entries = Object.entries(motions.current);
      for (const [id, motion] of entries) {
        motion.elapsed += delta;
        const progress = Math.min(1, motion.elapsed / motion.duration);
        const sideways = 1 - (1 - progress) ** 3;
        moveWorld(
          id,
          motion.from.map(
            (value, axis) =>
              value +
              (motion.to[axis] - value) *
                (axis === 1 ? progress ** 2 : sideways),
          ) as FreeMoveOffset,
        );
        if (progress === 1) delete motions.current[id];
      }
      if (entries.length && !Object.keys(motions.current).length)
        setSettling(false);
    },
    [animateTo, moveWorld],
  );

  const runTremor = (input: ExploreTremor) => {
    if (!model || busy || action.current || tremor.current) return;
    const result = experimentQuake(model, input.channel, offsetsRef.current);
    setBearing(input.channel);
    setLastTremor(input);
    setTremorCount((count) => count + 1);
    const releasesBall = result.kind === "caught" || result.kind === "missed";
    if (releasesBall) remember(offsetsRef.current);
    setNotice(releasesBall ? "idle" : result.kind);
    const clip = createExploreAction(module, activeSpec, input.channel);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (releasesBall) moveWorld(result.ballId, result.to);
      setNotice(result.kind);
      return;
    }
    tremor.current = { input, elapsed: 0 };
    // An absent sensor cannot respond. An empty dragon can still open.
    if (result.kind !== "no-trigger")
      action.current = { clip, result, elapsed: 0, released: false };
    setRunning(true);
  };
  useExploreDoubleTap({
    stageRef: stage,
    enabled: ready && mode === "explore" && !running && !settling,
    onDoubleTap: (x, y) => {
      const camera = cameraActions.current;
      if (!camera || !geometry) return;
      const center = camera.project(
        geometry.assemblyBounds
          .getCenter(new Vector3())
          .toArray() as FreeMoveOffset,
      );
      const basis = camera.groundBasis();
      runTremor(
        tremorFromPoint(
          center ? [x - center[0], y - center[1]] : [0, 0],
          basis.right,
          basis.up,
          bearing,
        ),
      );
    },
  });
  const restoreSelected = () => {
    if (model && selectedId.startsWith("ball-")) {
      const channel = Number(selectedId.slice(5));
      const occupied = model.channels.some(({ ballId }) => {
        const attachment = experimentBallAttachment(
          model,
          ballId,
          offsetsRef.current,
        );
        return (
          ballId !== selectedId &&
          attachment?.kind === "dragon" &&
          attachment.channel === channel
        );
      });
      if (occupied) {
        setNotice("seat-occupied");
        return;
      }
    }
    cancelMotion();
    remember(offsetsRef.current);
    moveWorld(selectedId, [0, 0, 0]);
    setNotice("idle");
  };
  const nudge = useCallback(
    (delta: Vector3) => {
      if (!keyboardMoving.current) {
        dragStart.current = copyOffsets(offsetsRef.current);
        keyboardMoving.current = true;
      }
      moveWorld(
        selectedId,
        new Vector3(...offsetsRef.current[selectedId])
          .add(delta)
          .toArray() as FreeMoveOffset,
      );
    },
    [moveWorld, selectedId],
  );
  const releaseKeyboard = () => {
    if (keyboardMoving.current) {
      keyboardMoving.current = false;
      if (different(dragStart.current, offsetsRef.current))
        remember(dragStart.current);
      settle(selectedId, false);
    }
  };
  const drive = useCallback(
    (id: string, delta: number) => {
      graph.drive(id, delta);
    },
    [graph],
  );
  useEffect(() => {
    document.title = t("freeExplore.pageTitle");
    return () => {
      document.title = t("app.pageTitle");
    };
  }, [t]);

  const status = running
    ? t("freeExplore.sensing")
    : draggingId
      ? t("freeExplore.moving")
      : notice === "caught"
        ? t("freeExplore.caught")
        : notice === "missed"
          ? t("freeExplore.missed")
          : notice === "no-trigger"
            ? t("freeExplore.sensorMissing")
            : notice === "empty"
              ? t("freeExplore.emptyDragon")
              : notice === "seat-occupied"
                ? t("freeExplore.seatOccupied")
                : notice === "loaded"
                  ? t("freeExplore.loaded")
                  : notice === "ground"
                    ? t("freeExplore.leftAside")
                    : sensorBlocked
                      ? t("freeExplore.openLid")
                      : mode === "action"
                        ? t("freeExplore.actionHint")
                        : t("freeExplore.hint");

  return (
    <main
      className="free-explore"
      data-testid="free-explore"
      data-ready={ready}
      data-lid-offset={offsets.lid.join(",")}
      data-offsets={JSON.stringify(offsets)}
      data-dragging={Boolean(draggingId)}
      data-dragging-part={draggingId ?? ""}
      data-settling={settling}
      data-running={running}
      data-result={notice}
      data-tremor-count={tremorCount}
      data-tremor-channel={lastTremor?.channel ?? ""}
      data-tremor-strength={lastTremor?.strength ?? ""}
    >
      <header className="free-explore-heading">
        <div>
          <p className="eyebrow">{t("freeExplore.eyebrow")}</p>
          <h1>{t("freeExplore.title")}</h1>
          <p>{t("freeExplore.intro")}</p>
        </div>
        <a href="#/m/seismoscope" className="free-explore-back">
          {t("freeExplore.back")}
        </a>
      </header>
      <div className="free-explore-mode-row">
        <div
          className="free-explore-modes"
          role="group"
          aria-label={t("freeExplore.mode")}
        >
          <button
            type="button"
            aria-pressed={mode === "explore"}
            disabled={busy}
            onClick={() => {
              setMode("explore");
              setNotice("idle");
            }}
          >
            {t("freeExplore.explore")}
          </button>
          <button
            type="button"
            aria-pressed={mode === "action"}
            disabled={busy}
            onClick={() => {
              setMode("action");
              setNotice("idle");
            }}
          >
            {t("freeExplore.inAction")}
          </button>
        </div>
        <span className="free-explore-scheme">{t("freeExplore.scheme")}</span>
      </div>
      <section
        ref={stage}
        data-testid="free-explore-stage"
        className="free-explore-stage"
        aria-label={t("freeExplore.stage")}
      >
        {graphicsAvailable && (
          <Canvas
            shadows
            camera={{ position: EXPLORE_HOME, fov: 36 }}
            dpr={[1, 2]}
            gl={{
              antialias: true,
              toneMapping: ACESFilmicToneMapping,
              toneMappingExposure: 1.05,
            }}
            onCreated={prepareSceneEnvironment}
            fallback={<p>{t("freeExplore.stage")}</p>}
          >
            <color args={["#090a0a"]} attach="background" />
            <SceneEnvironment />
            {warmup.prepared && (
              <ExploreTremorEffects
                tremor={tremor}
                floorY={geometry?.floorY ?? 0}
              >
                <MachineScene
                  activeSpec={activeSpec}
                  assemblyProgress={1}
                  displayState={displayState}
                  explode={0}
                  freeMoves={freeMoves}
                  geometryReadyAt={warmup.committedAt}
                  graph={graph}
                  module={module}
                  onDrivePart={drive}
                  onGeometryCommitted={warmup.commit}
                  paused
                  profile={EXPLORE_PROFILE}
                  schemeId={SCHEME_ID}
                  spotlightActive={false}
                  spotlightPartIds={NO_PARTS}
                  spotlightRunId={0}
                />
                <FreeExploreScene
                  spec={activeSpec}
                  movableIds={MOVABLE_PART_IDS}
                  offsets={offsets}
                  geometry={geometry}
                  onGeometry={setGeometry}
                  actions={cameraActions}
                  onNudge={nudge}
                  onFrame={onFrame}
                />
              </ExploreTremorEffects>
            )}
          </Canvas>
        )}
        {!graphicsAvailable ? (
          <div className="free-explore-loading" role="status">
            {t("freeExplore.noGraphics")}
          </div>
        ) : (
          !ready && (
            <div className="free-explore-loading" role="status">
              {warmup.error ? t("app.loadError") : t("app.loading")}
              {Boolean(warmup.error) && (
                <button onClick={() => window.location.reload()} type="button">
                  {t("app.retry")}
                </button>
              )}
            </div>
          )
        )}
      </section>
      <div className="free-explore-footer">
        <div
          className="free-explore-actions"
          aria-label={t("freeExplore.actions")}
        >
          {mode === "explore" ? (
            <>
              <span className="free-explore-selected">
                {selectedPart.name[language]}
              </span>
              <button
                className="gold-button"
                type="button"
                data-testid="free-put-back"
                disabled={!moved(offsets[selectedId]) || busy}
                onClick={restoreSelected}
              >
                {t("freeExplore.putBack")}
              </button>
            </>
          ) : (
            <>
              <label className="free-explore-direction">
                {t("freeExplore.direction")}
                <select
                  value={bearing}
                  disabled={!ready || busy}
                  onChange={(event) => {
                    setBearing(Number(event.target.value));
                    setNotice("idle");
                  }}
                >
                  {BEARINGS.map((key, index) => (
                    <option value={index} key={key}>
                      {t(`seismo.bearing.${key}`)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="gold-button"
                type="button"
                data-testid="free-send-tremor"
                disabled={!ready || busy}
                onClick={() => runTremor(tremorForChannel(bearing))}
              >
                {running
                  ? t("freeExplore.sensing")
                  : t("freeExplore.sendTremor")}
              </button>
            </>
          )}
          <button
            className="ghost-button"
            type="button"
            disabled={!history.length || busy}
            onClick={() => {
              cancelMotion();
              const previous = history.at(-1);
              if (previous) {
                commit(copyOffsets(previous));
                setHistory((current) => current.slice(0, -1));
                setNotice("idle");
              }
            }}
          >
            {t("freeExplore.undo")}
          </button>
          <button
            className="ghost-button"
            type="button"
            disabled={!anyMoved || busy}
            onClick={() => {
              cancelMotion();
              remember(offsetsRef.current);
              commit(emptyOffsets());
              setNotice("idle");
            }}
          >
            {t("freeExplore.resetAll")}
          </button>
          <div className="free-explore-camera-controls">
            <div
              className="free-explore-zoom"
              aria-label={t("freeExplore.zoom")}
            >
              <button
                type="button"
                aria-label={t("freeExplore.zoomOut")}
                disabled={!ready || Boolean(draggingId)}
                onClick={() => cameraActions.current?.zoom(1.2)}
              >
                −
              </button>
              <button
                type="button"
                aria-label={t("freeExplore.zoomIn")}
                disabled={!ready || Boolean(draggingId)}
                onClick={() => cameraActions.current?.zoom(1 / 1.2)}
              >
                +
              </button>
            </div>
            <button
              className="ghost-button"
              type="button"
              disabled={!ready || Boolean(draggingId)}
              onClick={() => cameraActions.current?.reset()}
            >
              {t("viewer.resetView")}
            </button>
          </div>
        </div>
        <p className="free-explore-status" role="status">
          {status}
        </p>
        {mode === "explore" && (
          <details className="free-explore-keyboard">
            <summary>{t("freeExplore.keyboard")}</summary>
            <p>{t("freeExplore.keyboardHint")}</p>
            <label>
              {t("freeExplore.part")}
              <select
                aria-label={t("freeExplore.part")}
                value={selectedId}
                disabled={!ready || busy}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  setNotice("idle");
                }}
              >
                {MOVABLE_PART_IDS.map((id) => (
                  <option key={id} value={id}>
                    {partsById.get(id)?.name[language]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="ghost-button"
              data-testid="free-keyboard-move"
              aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
              disabled={!ready || busy || sensorBlocked}
              onKeyDown={(event) => {
                const directions: Record<string, [number, number]> = {
                  ArrowLeft: [-1, 0],
                  ArrowRight: [1, 0],
                  ArrowUp: [0, 1],
                  ArrowDown: [0, -1],
                };
                const delta = directions[event.key];
                if (delta) {
                  event.preventDefault();
                  cameraActions.current?.nudge(...delta);
                }
              }}
              onKeyUp={releaseKeyboard}
              onBlur={releaseKeyboard}
            >
              {t("freeExplore.movePart")}
            </button>
            <button
              type="button"
              className="ghost-button"
              data-testid="free-keyboard-tremor"
              disabled={!ready || busy}
              onClick={() => runTremor(tremorForChannel(bearing))}
            >
              {t("freeExplore.sendTremor")}
            </button>
          </details>
        )}
      </div>
    </main>
  );
}
