import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { MachineModule, MachineSlug } from "../sim/types";
import HomeCarouselHero from "./HomeCarouselHero";
import PosterFallback from "./PosterFallback";
import type { SceneSpec } from "./scene/types";
import type { StoryStep } from "./story";

export function retryImportOnce<T>(loader: () => Promise<T>): Promise<T> {
  return loader().catch(() => loader());
}

const MachineViewer = lazy(() =>
  retryImportOnce(() => import("./viewer/MachineViewer")),
);
const MachineStoryStage = lazy(() =>
  retryImportOnce(() =>
    import("./viewer/MachineViewer").then((module) => ({
      default: module.MachineStoryStage,
    })),
  ),
);
const ScrollStory = lazy(() =>
  retryImportOnce(() =>
    import("./story").then((module) => ({ default: module.ScrollStory })),
  ),
);

export const MACHINE_SLUGS = [
  "astroclock",
  "seismoscope",
  "odometer",
  "loom",
] as const satisfies readonly MachineSlug[];

const machineModules = import.meta.glob<{ default: MachineModule }>(
  "../machines/*/build.ts",
);
const storyModules = import.meta.glob<{ default: StoryStep[] }>(
  "../machines/*/story.ts",
);
const sceneModules = import.meta.glob<{ default: SceneSpec }>(
  "../machines/*/scene.ts",
);

function withMachineScene(
  module: MachineModule,
  loadedScene?: { default: SceneSpec },
): MachineModule {
  if (module.scene || !loadedScene) return module;
  return { ...module, scene: loadedScene.default };
}

function currentPath() {
  return window.location.hash.replace(/^#/, "") || "/";
}

function HomePage() {
  return (
    <main className="home-page">
      <HomeCarouselHero slugs={MACHINE_SLUGS} />
    </main>
  );
}

function MachineRoute({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [module, setModule] = useState<MachineModule | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setModule(null);
    setError(false);

    const loader =
      slug === "demo"
        ? () => import("./demo")
        : machineModules[`../machines/${slug}/build.ts`];
    const sceneLoader = sceneModules[`../machines/${slug}/scene.ts`];
    if (!loader) {
      setError(true);
      return () => {
        cancelled = true;
      };
    }

    void Promise.all([loader(), sceneLoader?.()])
      .then(([loaded, loadedScene]) => {
        if (!cancelled) {
          setModule(withMachineScene(loaded.default, loadedScene));
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return (
      <main className="error-page">
        <h1>{t("app.loadError")}</h1>
        <p>{t("app.notFoundMachine", { slug })}</p>
        <div className="error-actions">
          <button
            className="gold-button"
            onClick={() => window.location.reload()}
            type="button"
          >
            {t("app.retry")}
          </button>
          <a className="ghost-button" href="#/">
            {t("app.home")}
          </a>
        </div>
      </main>
    );
  }

  if (!module) {
    return (
      <main aria-live="polite" className="loading-page">
        <PosterFallback slug={slug} />
      </main>
    );
  }

  return (
    <Suspense
      fallback={
        <main aria-live="polite" className="loading-page">
          <PosterFallback slug={slug} />
        </main>
      }
    >
      <MachineViewer module={module} schemeId={module.defaultSchemeId} />
    </Suspense>
  );
}

function StoryRoute({ slug }: { slug: string }) {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage === "en" ? "en" : "zh";
  const [bundle, setBundle] = useState<{
    module: MachineModule;
    steps: StoryStep[];
  } | null>(null);
  const [error, setError] = useState(false);
  const [spotlightRunId, setSpotlightRunId] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setBundle(null);
    setError(false);
    setSpotlightRunId(0);
    const machineLoader = machineModules[`../machines/${slug}/build.ts`];
    const storyLoader = storyModules[`../machines/${slug}/story.ts`];
    const sceneLoader = sceneModules[`../machines/${slug}/scene.ts`];
    if (!machineLoader || !storyLoader) {
      setError(true);
      return () => {
        cancelled = true;
      };
    }

    void Promise.all([machineLoader(), storyLoader(), sceneLoader?.()])
      .then(([loadedMachine, loadedStory, loadedScene]) => {
        if (!cancelled) {
          setBundle({
            module: withMachineScene(loadedMachine.default, loadedScene),
            steps: loadedStory.default,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const runSpotlight = useCallback(() => {
    setSpotlightRunId((current) => current + 1);
  }, []);

  if (error) {
    return (
      <main className="error-page">
        <h1>{t("app.loadError")}</h1>
        <p>{t("app.notFoundMachine", { slug })}</p>
        <div className="error-actions">
          <button
            className="gold-button"
            onClick={() => window.location.reload()}
            type="button"
          >
            {t("app.retry")}
          </button>
          <a className="ghost-button" href="#/">
            {t("app.home")}
          </a>
        </div>
      </main>
    );
  }

  if (!bundle) {
    return (
      <main aria-live="polite" className="loading-page">
        <PosterFallback slug={slug} />
      </main>
    );
  }

  return (
    <Suspense
      fallback={
        <main aria-live="polite" className="loading-page">
          <PosterFallback slug={slug} />
        </main>
      }
    >
      <a
        className="story-back-link"
        data-testid="story-back-link"
        href={`#/m/${slug}`}
      >
        {t("story.backToModel")}
      </a>
      <ScrollStory
        module={bundle.module}
        onSpotlight={runSpotlight}
        renderStage={(state) => (
          <MachineStoryStage
            module={bundle.module}
            spotlightRunId={spotlightRunId}
            state={state}
          />
        )}
        steps={bundle.steps}
      />
    </Suspense>
  );
}

export default function RouterView() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const updatePath = () => setPath(currentPath());
    window.addEventListener("hashchange", updatePath);
    return () => window.removeEventListener("hashchange", updatePath);
  }, []);

  const storyMatch = path.match(/^\/story\/([^/]+)\/?$/);
  if (storyMatch) {
    return <StoryRoute slug={decodeURIComponent(storyMatch[1])} />;
  }
  const match = path.match(/^\/m\/([^/]+)\/?$/);
  return match ? (
    <MachineRoute slug={decodeURIComponent(match[1])} />
  ) : (
    <HomePage />
  );
}
