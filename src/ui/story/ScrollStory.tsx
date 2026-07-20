import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import type { MachineModule } from "../../sim/types";
import "./story.css";
import type { ScrollStoryProps, StoryStageState, StoryStep } from "./types";

export const STORY_FRAME_EVENT = "mechanica:story-frame";

declare global {
  interface Window {
    __mechStory?: {
      goToStep: (stepId: string) => void;
      state: () => StoryStageState;
    };
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function interpolate(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function interpolateVector(
  from: [number, number, number],
  to: [number, number, number],
  progress: number,
): [number, number, number] {
  return [
    interpolate(from[0], to[0], progress),
    interpolate(from[1], to[1], progress),
    interpolate(from[2], to[2], progress),
  ];
}

function interpolateDrive(
  from: StoryStep["driveTo"],
  to: StoryStep["driveTo"],
  progress: number,
): StoryStep["driveTo"] {
  if (!from && !to) return undefined;
  if (!to) {
    return from
      ? { ...from, value: interpolate(from.value, 0, progress) }
      : undefined;
  }
  if (!from) return { ...to, value: interpolate(0, to.value, progress) };
  if (from.node !== to.node) {
    return progress < 0.5
      ? { ...from, value: interpolate(from.value, 0, progress * 2) }
      : { ...to, value: interpolate(0, to.value, (progress - 0.5) * 2) };
  }
  return {
    node: to.node,
    seconds: interpolate(from.seconds, to.seconds, progress),
    value: interpolate(from.value, to.value, progress),
  };
}

function interpolateCamera(
  from: StoryStep,
  to: StoryStep,
  progress: number,
): StoryStep["camera"] {
  const target = interpolateVector(
    from.camera.target,
    to.camera.target,
    progress,
  );
  const position = interpolateVector(
    from.camera.position,
    to.camera.position,
    progress,
  );
  if (from.schemeId && to.schemeId && from.schemeId !== to.schemeId) {
    const distanceScale = 1 + Math.sin(progress * Math.PI) * 1.35;
    for (let axis = 0; axis < 3; axis += 1) {
      position[axis] =
        target[axis] + (position[axis] - target[axis]) * distanceScale;
    }
  }
  return { position, target };
}

export function storyStageState(
  steps: readonly StoryStep[],
  progress: number,
): StoryStageState {
  const scaledProgress = progress * Math.max(steps.length - 1, 0);
  const fromIndex = Math.min(Math.floor(scaledProgress), steps.length - 1);
  const toIndex = Math.min(fromIndex + 1, steps.length - 1);
  const linearProgress = scaledProgress - fromIndex;
  const segmentProgress =
    linearProgress * linearProgress * (3 - 2 * linearProgress);
  const fromStep = steps[fromIndex];
  const toStep = steps[toIndex];
  const activeIndex = segmentProgress < 0.5 ? fromIndex : toIndex;
  const activeStep = steps[activeIndex];

  return {
    activeIndex,
    activeStep,
    camera: interpolateCamera(fromStep, toStep, segmentProgress),
    driveTo: interpolateDrive(
      fromStep.driveTo,
      toStep.driveTo,
      segmentProgress,
    ),
    explode: interpolate(
      fromStep.explode ?? 0,
      toStep.explode ?? 0,
      segmentProgress,
    ),
    fromStep,
    highlight: activeStep.highlight ?? [],
    progress,
    schemeId: activeStep.schemeId,
    segmentProgress,
    spotlight: activeStep.spotlight === true,
    toStep,
  };
}

function sourceForStep(module: MachineModule, step: StoryStep) {
  return step.sourceId
    ? module.data.sources.find((source) => source.id === step.sourceId)
    : undefined;
}

export default function ScrollStory({
  module,
  onSourceOpen,
  onSpotlight,
  renderStage,
  steps,
}: ScrollStoryProps) {
  if (steps.length === 0) {
    throw new Error("ScrollStory requires at least one step");
  }

  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage === "en" ? "en" : "zh";
  const stepRefs = useRef<Array<HTMLElement | null>>([]);
  const sourceCloseRef = useRef<HTMLButtonElement>(null);
  const sourceTriggerRef = useRef<HTMLButtonElement | null>(null);
  const frameRequest = useRef<number | null>(null);
  const stateRef = useRef(storyStageState(steps, 0));
  const lastSpotlightStep = useRef<string | null>(null);
  const [state, setState] = useState(() => stateRef.current);
  const [openSourceId, setOpenSourceId] = useState<string | null>(null);
  const openSource = useMemo(
    () =>
      openSourceId
        ? module.data.sources.find((source) => source.id === openSourceId)
        : undefined,
    [module.data.sources, openSourceId],
  );

  const goToStep = useCallback(
    (stepId: string) => {
      const index = steps.findIndex((step) => step.id === stepId);
      if (index < 0) return;
      stepRefs.current[index]?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "center",
      });
    },
    [steps],
  );

  const closeSource = useCallback(() => {
    setOpenSourceId(null);
    requestAnimationFrame(() =>
      sourceTriggerRef.current?.focus({ preventScroll: true }),
    );
  }, []);

  const updateProgress = useCallback(() => {
    frameRequest.current = null;
    const first = stepRefs.current[0];
    const last = stepRefs.current[steps.length - 1];
    if (!first || !last) return;

    const viewportAnchor = window.innerHeight / 2;
    const firstCenter =
      first.getBoundingClientRect().top + first.offsetHeight / 2;
    const lastCenter = last.getBoundingClientRect().top + last.offsetHeight / 2;
    const progress = clamp(
      (viewportAnchor - firstCenter) / Math.max(lastCenter - firstCenter, 1),
      0,
      1,
    );
    const nextState = storyStageState(steps, progress);
    stateRef.current = nextState;
    setState(nextState);
    window.dispatchEvent(
      new CustomEvent<StoryStageState>(STORY_FRAME_EVENT, {
        detail: nextState,
      }),
    );

    if (nextState.spotlight) {
      if (lastSpotlightStep.current !== nextState.activeStep.id) {
        lastSpotlightStep.current = nextState.activeStep.id;
        onSpotlight?.("spotlight", nextState.activeStep);
      }
    } else {
      lastSpotlightStep.current = null;
    }
  }, [onSpotlight, steps]);

  const requestProgressUpdate = useCallback(() => {
    if (frameRequest.current !== null) return;
    frameRequest.current = requestAnimationFrame(updateProgress);
  }, [updateProgress]);

  useLayoutEffect(() => {
    updateProgress();
  }, [updateProgress]);

  useEffect(() => {
    window.addEventListener("resize", requestProgressUpdate);
    window.addEventListener("scroll", requestProgressUpdate, { passive: true });
    return () => {
      window.removeEventListener("resize", requestProgressUpdate);
      window.removeEventListener("scroll", requestProgressUpdate);
      if (frameRequest.current !== null) {
        cancelAnimationFrame(frameRequest.current);
      }
    };
  }, [requestProgressUpdate]);

  useEffect(() => {
    window.__mechStory = {
      goToStep,
      state: () => stateRef.current,
    };
    return () => {
      delete window.__mechStory;
    };
  }, [goToStep]);

  useEffect(() => {
    if (!openSource) return;
    sourceCloseRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSource();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeSource, openSource]);

  return (
    <main
      className="scroll-story"
      data-active-index={state.activeIndex}
      data-active-step={state.activeStep.id}
      data-story-progress={state.progress.toFixed(4)}
      data-testid="scroll-story"
    >
      <div className="scroll-story__stage">{renderStage(state)}</div>

      <div className="scroll-story__chapters">
        {steps.map((step, index) => {
          const source = sourceForStep(module, step);
          return (
            <section
              aria-current={state.activeIndex === index ? "step" : undefined}
              className="scroll-story__chapter"
              data-active={state.activeIndex === index ? "true" : "false"}
              data-story-step={step.id}
              key={step.id}
              ref={(element) => {
                stepRefs.current[index] = element;
              }}
            >
              <article className="scroll-story__card">
                <span className="scroll-story__index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2>{step.title[language]}</h2>
                <p>{step.body[language]}</p>
                {source ? (
                  <button
                    aria-controls="story-source-panel"
                    aria-expanded={openSourceId === source.id}
                    aria-haspopup="dialog"
                    className="scroll-story__source-button"
                    data-source-id={source.id}
                    data-testid={`story-source-${step.id}`}
                    onClick={(event) => {
                      sourceTriggerRef.current = event.currentTarget;
                      setOpenSourceId(source.id);
                      onSourceOpen?.(source.id);
                    }}
                    type="button"
                  >
                    {t("story.viewSource")}
                  </button>
                ) : null}
              </article>
            </section>
          );
        })}
      </div>

      <nav aria-label={t("story.progress")} className="story-progress">
        {steps.map((step, index) => (
          <span
            className={index === state.activeIndex ? "dot active" : "dot"}
            key={step.id}
          />
        ))}
      </nav>

      {openSource ? (
        <aside
          aria-labelledby="story-source-title"
          className="scroll-story__source-panel"
          data-source-id={openSource.id}
          data-testid="story-source-panel"
          id="story-source-panel"
          role="dialog"
        >
          <button
            aria-label={t("story.closeSource")}
            className="scroll-story__source-close"
            onClick={closeSource}
            ref={sourceCloseRef}
            type="button"
          >
            ×
          </button>
          <p className="scroll-story__source-label" id="story-source-title">
            {openSource.book}
            {openSource.chapter ? ` · ${openSource.chapter}` : ""}
          </p>
          <blockquote>
            {language === "en"
              ? (openSource.translation?.en ?? openSource.quote)
              : (openSource.translation?.zh ?? openSource.quote)}
          </blockquote>
          <a href={openSource.url} rel="noreferrer" target="_blank">
            {t("story.openSource")}
          </a>
        </aside>
      ) : null}
    </main>
  );
}
