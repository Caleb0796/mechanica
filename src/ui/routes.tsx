import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { MachineModule, MachineSlug } from "../sim/types";
import type { SceneSpec } from "./scene/types";
import type { StoryStep } from "./story";

const MachineViewer = lazy(() => import("./viewer/MachineViewer"));
const MachineStoryStage = lazy(() =>
  import("./viewer/MachineViewer").then((module) => ({
    default: module.MachineStoryStage,
  })),
);
const ScrollStory = lazy(() =>
  import("./story").then((module) => ({ default: module.ScrollStory })),
);

export const MACHINE_SLUGS = [
  "astroclock",
  "seismoscope",
  "chariot",
  "odometer",
  "wooden-ox",
  "loom",
  "typecase",
  "chainpump",
  "bellows",
  "gimbal",
] as const satisfies readonly MachineSlug[];

interface MachineCardCopy {
  era: { en: string; zh: string };
  name: { en: string; zh: string };
  principle: { en: string; zh: string };
}

const machineCards: Record<MachineSlug, MachineCardCopy> = {
  astroclock: {
    name: { en: "Astronomical Clock Tower", zh: "水运仪象台" },
    era: { en: "Northern Song · 1092", zh: "北宋 · 1092 年" },
    principle: {
      en: "Water escapement synchronizes the heavens, time, and chimes.",
      zh: "水运擒纵同步驱动天象、计时与报时机构。",
    },
  },
  seismoscope: {
    name: { en: "Seismoscope", zh: "候风地动仪" },
    era: { en: "Eastern Han · 132", zh: "东汉 · 132 年" },
    principle: {
      en: "Inertia selects one of eight directional ball releases.",
      zh: "以惯性辨别震向，并触发八方之一落丸。",
    },
  },
  chariot: {
    name: { en: "South-Pointing Chariot", zh: "指南车" },
    era: { en: "Three Kingdoms · c. 235", zh: "三国 · 约 235 年" },
    principle: {
      en: "A differential cancels the chassis turn to preserve heading.",
      zh: "差动齿轮抵消车身转向，使木人恒指南方。",
    },
  },
  odometer: {
    name: { en: "Odometer Carriage", zh: "记里鼓车" },
    era: { en: "Northern Song record · 1027", zh: "北宋记载 · 1027 年" },
    principle: {
      en: "Decimal gear reductions turn road distance into drum strikes.",
      zh: "十进齿轮减速把行程转化为击鼓报里。",
    },
  },
  "wooden-ox": {
    name: { en: "Wooden Ox & Gliding Horse", zh: "木牛流马" },
    era: { en: "Shu Han · 231–234", zh: "蜀汉 · 231–234 年" },
    principle: {
      en: "Competing reconstructions test how one carrier moved grain.",
      zh: "并列轮式与步行式复原，检验运粮方式之争。",
    },
  },
  loom: {
    name: { en: "Pattern Loom", zh: "提花织机" },
    era: { en: "Western Han · c. 157–88 BCE", zh: "西汉 · 约公元前 157–88 年" },
    principle: {
      en: "A heddle-lift sequence stores the woven pattern as a program.",
      zh: "综框升降次序把纹样固化为可执行程序。",
    },
  },
  typecase: {
    name: { en: "Revolving Typecase", zh: "转轮排字盘" },
    era: {
      en: "Northern Song–Yuan · 1041–1298",
      zh: "北宋至元 · 1041–1298 年",
    },
    principle: {
      en: "Rotating indexed storage brings movable type to the compositor.",
      zh: "按韵索引的转盘让活字“以字就人”。",
    },
  },
  chainpump: {
    name: { en: "Chain Pump", zh: "龙骨水车" },
    era: { en: "Eastern Han–Yuan", zh: "东汉至元" },
    principle: {
      en: "Pedals circulate a pallet chain that scrapes water uphill.",
      zh: "脚踏驱动刮板链循环，将水沿槽提升。",
    },
  },
  bellows: {
    name: { en: "Water-Powered Bellows", zh: "水排" },
    era: { en: "Eastern Han · 31", zh: "东汉 · 31 年" },
    principle: {
      en: "A crank-and-rod train converts waterwheel rotation to pumping.",
      zh: "曲柄连杆把水轮旋转转化为风箱往复。",
    },
  },
  gimbal: {
    name: { en: "Gimbal Censer", zh: "被中香炉" },
    era: { en: "Western Han–Tang", zh: "西汉至唐" },
    principle: {
      en: "Orthogonal rings and a low bowl passively keep incense level.",
      zh: "正交环与低重心香盂无需动力即可保持水平。",
    },
  },
};

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
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage === "en" ? "en" : "zh";

  return (
    <main className="home-page">
      <section className="hero">
        <p className="eyebrow">{t("home.eyebrow")}</p>
        <h1 className="display-title">{t("home.title")}</h1>
        <p className="hero-copy">{t("home.intro")}</p>
      </section>
      <aside className="demo-callout">
        <p>{t("app.demoHint")}</p>
        <a className="gold-button" href="#/m/demo">
          {t("app.demo")}
        </a>
      </aside>
      <section aria-label={t("app.home")} className="machine-grid">
        {MACHINE_SLUGS.map((slug, index) => {
          const card = machineCards[slug];
          return (
            <a
              className="machine-card"
              data-testid="machine-card"
              href={`#/m/${slug}`}
              key={slug}
            >
              <span className="machine-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="machine-thumbnail">
                <img
                  alt=""
                  data-testid="machine-thumbnail-image"
                  loading={index < 2 ? "eager" : "lazy"}
                  src={`${import.meta.env.BASE_URL}assets/renders/${slug}/overall.jpg`}
                />
              </span>
              <h2>{card.name[language]}</h2>
              <p className="machine-era">{card.era[language]}</p>
              <p className="machine-principle">{card.principle[language]}</p>
            </a>
          );
        })}
      </section>
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
        <p>{slug}</p>
        <a className="gold-button" href="#/">
          {t("app.home")}
        </a>
      </main>
    );
  }

  if (!module) {
    return (
      <main aria-live="polite" className="loading-page">
        <p>{t("app.loading")}</p>
      </main>
    );
  }

  return (
    <Suspense
      fallback={
        <main aria-live="polite" className="loading-page">
          <p>{t("app.loading")}</p>
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
        <p>{slug}</p>
        <a className="gold-button" href="#/">
          {t("app.home")}
        </a>
      </main>
    );
  }

  if (!bundle) {
    return (
      <main aria-live="polite" className="loading-page">
        <p>{t("app.loading")}</p>
      </main>
    );
  }

  return (
    <Suspense
      fallback={
        <main aria-live="polite" className="loading-page">
          <p>{t("app.loading")}</p>
        </main>
      }
    >
      <a
        className="story-back-link"
        data-testid="story-back-link"
        href={`#/m/${slug}`}
      >
        {language === "zh" ? "返回模型" : "Back to model"}
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
