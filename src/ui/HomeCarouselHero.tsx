import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ACESFilmicToneMapping,
  Box3,
  type BufferGeometry,
  type Group,
  MathUtils,
  PerspectiveCamera,
  type SpotLight,
  Vector3,
} from "three";

import { machineGeometryCache } from "../core/geometryCache";
import {
  type GeometryWarmupProgress,
  warmMachine,
} from "../core/geometryWarmup";
import {
  acquireMaterial,
  getMaterial,
  materialVariantKey,
} from "../core/materialCache";
import { standardMaterial } from "../core/materials";
import {
  applyMechanicaInstanceMatrices,
  getMechanicaInstanceMatrices,
  partGeometryEntries,
} from "../core/primitives";
import { applySchemePatch } from "../sim/graph";
import type {
  MachineData,
  MachineModule,
  MachineSlug,
  MachineSpec,
  PartDef,
} from "../sim/types";
import {
  activeHomeCarouselIndex,
  createHomeCarouselState,
  transitionHomeCarousel,
} from "./homeCarousel";
import { GeometryLoading } from "./viewer/geometryWarmup";
import SceneEnvironment, {
  prepareSceneEnvironment,
} from "./viewer/SceneEnvironment";
import { visualMaterialFor } from "./viewer/visualRecovery";

const TURNTABLE_RADIUS = 2.6;
const QUARTER_TURN = Math.PI / 2;
const TURN_DURATION_SECONDS = 1.1;
const PLATFORM_TOP = 0.16;

const heroMachineModules = import.meta.glob<{ default: MachineModule }>(
  "../machines/*/build.ts",
);
const heroDataModules = import.meta.glob<{ default: MachineData }>(
  "../data/machines/*.json",
);

function loadHeroMachine(slug: MachineSlug): Promise<MachineModule> {
  const loader = heroMachineModules[`../machines/${slug}/build.ts`];
  if (!loader) return Promise.reject(new Error(`Missing machine ${slug}`));
  return loader().then((loaded) => loaded.default);
}

function loadHeroData(slug: MachineSlug): Promise<MachineData> {
  const loader = heroDataModules[`../data/machines/${slug}.json`];
  if (!loader) return Promise.reject(new Error(`Missing machine data ${slug}`));
  return loader().then((loaded) => loaded.default);
}

function machineSpec(module: MachineModule): MachineSpec {
  return applySchemePatch(
    module.spec,
    module.defaultSchemeId
      ? module.schemes?.[module.defaultSchemeId]
      : undefined,
  );
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(
    () => document.visibilityState !== "hidden",
  );
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}

function useElementInView(ref: RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.01 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}

function useMachineCatalog(slugs: readonly MachineSlug[]) {
  const [dataBySlug, setDataBySlug] = useState<
    Partial<Record<MachineSlug, MachineData>>
  >({});
  useEffect(() => {
    let active = true;
    void Promise.all(
      slugs.map(async (slug) => [slug, await loadHeroData(slug)] as const),
    ).then((entries) => {
      if (active) setDataBySlug(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [slugs]);
  return dataBySlug;
}

function useSequentialMachineWarmup(
  enabled: boolean,
  slugs: readonly MachineSlug[],
) {
  const [modulesBySlug, setModulesBySlug] = useState<
    Partial<Record<MachineSlug, MachineModule>>
  >({});
  const [progress, setProgress] = useState<GeometryWarmupProgress | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let running: ReturnType<typeof warmMachine> | null = null;

    void (async () => {
      for (const slug of slugs) {
        const module = await loadHeroMachine(slug);
        if (!active) return;
        const spec = machineSpec(module);
        setProgress({ built: 0, total: spec.parts.length });
        running = warmMachine(module, spec, setProgress, {
          consumerScope: `home-turntable:${slug}`,
        });
        const result = await running.done;
        running.release();
        running = null;
        if (!active) return;
        if (result.status === "completed") {
          setModulesBySlug((current) => ({ ...current, [slug]: module }));
        }
      }
      if (active) setProgress(null);
    })().catch(() => {
      if (active) setProgress(null);
    });

    return () => {
      active = false;
      running?.cancel();
    };
  }, [enabled, slugs]);

  return { modulesBySlug, progress };
}

function HeroPartGeometry({
  geometry,
  material,
}: {
  geometry: BufferGeometry;
  material: ReturnType<typeof standardMaterial>;
}) {
  const matrices = getMechanicaInstanceMatrices(geometry);
  return matrices ? (
    <instancedMesh
      args={[geometry, material, matrices.length]}
      ref={(mesh) => {
        if (mesh) applyMechanicaInstanceMatrices(mesh, matrices);
      }}
    />
  ) : (
    <mesh geometry={geometry} material={material} />
  );
}

const StaticMachinePart = memo(function StaticMachinePart({
  childrenByParent,
  module,
  part,
}: {
  childrenByParent: ReadonlyMap<string, PartDef[]>;
  module: MachineModule;
  part: PartDef;
}) {
  const geometryResource = useMemo(
    () =>
      machineGeometryCache.prepare(module, part.geometry, {
        consumerKey: `home-turntable:${module.data.slug}:${part.id}`,
      }),
    [module, part],
  );
  const geometries = useMemo(
    () => [...partGeometryEntries(geometryResource.geometry)],
    [geometryResource.geometry],
  );
  const presentation = useMemo(
    () => visualMaterialFor(module.data.slug, part),
    [module.data.slug, part],
  );
  const materialKey = useMemo(
    () => `home-turntable:${materialVariantKey(presentation)}`,
    [presentation],
  );
  const material = getMaterial(part.material, materialKey, () =>
    standardMaterial(part.material, presentation),
  );

  useLayoutEffect(() => geometryResource.retain(), [geometryResource]);
  useEffect(
    () => acquireMaterial(part.material, materialKey, () => material).release,
    [material, materialKey, part.material],
  );

  return (
    <group
      name={part.id}
      position={part.position}
      rotation={part.rotationEuler ?? [0, 0, 0]}
    >
      {geometries.map((geometry) => (
        <HeroPartGeometry
          geometry={geometry}
          key={geometry.uuid}
          material={material}
        />
      ))}
      {(childrenByParent.get(part.id) ?? []).map((child) => (
        <StaticMachinePart
          childrenByParent={childrenByParent}
          key={child.id}
          module={module}
          part={child}
        />
      ))}
    </group>
  );
});

function localBounds(group: Group): Box3 {
  group.updateWorldMatrix(true, true);
  const world = new Box3().setFromObject(group);
  const local = new Box3();
  const point = new Vector3();
  for (const x of [world.min.x, world.max.x]) {
    for (const y of [world.min.y, world.max.y]) {
      for (const z of [world.min.z, world.max.z]) {
        point.set(x, y, z);
        group.parent?.worldToLocal(point);
        local.expandByPoint(point);
      }
    }
  }
  return local;
}

function StaticMachineModel({
  module,
  onActivate,
  slug,
}: {
  module: MachineModule;
  onActivate: () => void;
  slug: MachineSlug;
}) {
  const model = useRef<Group>(null);
  const spec = useMemo(() => machineSpec(module), [module]);
  const partIds = useMemo(
    () => new Set(spec.parts.map((part) => part.id)),
    [spec.parts],
  );
  const childrenByParent = useMemo(() => {
    const children = new Map<string, PartDef[]>();
    for (const part of spec.parts) {
      if (!part.parent || !partIds.has(part.parent)) continue;
      const siblings = children.get(part.parent) ?? [];
      siblings.push(part);
      children.set(part.parent, siblings);
    }
    return children;
  }, [partIds, spec.parts]);
  const rootParts = useMemo(
    () =>
      spec.parts.filter((part) => !part.parent || !partIds.has(part.parent)),
    [partIds, spec.parts],
  );

  useLayoutEffect(() => {
    if (!model.current) return;
    model.current.position.set(0, 0, 0);
    model.current.scale.setScalar(1);
    const bounds = localBounds(model.current);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const scale = Math.min(1.85 / Math.max(size.x, size.z), 1.8 / size.y);
    model.current.scale.setScalar(scale);
    model.current.position.set(
      -center.x * scale,
      PLATFORM_TOP - bounds.min.y * scale,
      -center.z * scale,
    );
  }, [module]);

  return (
    <group
      name={`home-machine-${slug}`}
      onClick={(event) => {
        event.stopPropagation();
        onActivate();
      }}
      ref={model}
    >
      {rootParts.map((part) => (
        <StaticMachinePart
          childrenByParent={childrenByParent}
          key={part.id}
          module={module}
          part={part}
        />
      ))}
    </group>
  );
}

function RoundPlatform({ radius }: { radius: number }) {
  return (
    <group>
      <mesh position={[0, PLATFORM_TOP / 2, 0]}>
        <cylinderGeometry args={[radius, radius, PLATFORM_TOP, 72]} />
        <meshStandardMaterial
          color="#4f2d19"
          metalness={0.06}
          roughness={0.72}
        />
      </mesh>
      <mesh
        position={[0, PLATFORM_TOP + 0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[radius * 0.72, radius * 0.725, 72]} />
        <meshStandardMaterial
          color="#c88a42"
          metalness={0.18}
          roughness={0.58}
        />
      </mesh>
    </group>
  );
}

function FixedCamera() {
  const camera = useThree((state) => state.camera);
  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    camera.position.set(0, 2.3, 7.2);
    camera.lookAt(0, 0.9, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function WarmLightRig() {
  const light = useRef<SpotLight>(null);
  const target = useRef<Group>(null);
  useLayoutEffect(() => {
    if (light.current && target.current) light.current.target = target.current;
  }, []);
  return (
    <>
      <ambientLight color="#d8b46c" intensity={0.38} />
      <hemisphereLight args={["#ead7b2", "#2d2118", 0.48]} />
      <directionalLight color="#ffe1b6" intensity={2.2} position={[3, 5, 4]} />
      <directionalLight
        color="#b88a5a"
        intensity={0.42}
        position={[-4, 2, -3]}
      />
      <spotLight
        angle={0.42}
        color="#ffc66f"
        decay={2}
        distance={11}
        intensity={7}
        penumbra={0.72}
        position={[0, 4.8, 6.2]}
        ref={light}
      />
      <group position={[0, 0.9, TURNTABLE_RADIUS]} ref={target} />
    </>
  );
}

interface TurnAnimation {
  activeIndex: number;
  elapsed: number;
  fromRotation: number;
  fromScales: number[];
  toRotation: number;
}

function easeInOutCubic(value: number): number {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function Turntable({
  activeIndex,
  modulesBySlug,
  onActivate,
  onTurningChange,
  reducedMotion,
  slugs,
  step,
}: {
  activeIndex: number;
  modulesBySlug: Partial<Record<MachineSlug, MachineModule>>;
  onActivate: (index: number) => void;
  onTurningChange: (turning: boolean) => void;
  reducedMotion: boolean;
  slugs: readonly MachineSlug[];
  step: number;
}) {
  const turntable = useRef<Group>(null);
  const anchors = useRef<Array<Group | null>>([]);
  const animation = useRef<TurnAnimation | null>(null);
  const targetRotation = -step * QUARTER_TURN;

  useLayoutEffect(() => {
    if (!turntable.current) return;
    if (reducedMotion) {
      turntable.current.rotation.y = targetRotation;
      anchors.current.forEach((anchor, index) =>
        anchor?.scale.setScalar(index === activeIndex ? 1.12 : 1),
      );
      animation.current = null;
      onTurningChange(false);
      return;
    }
    onTurningChange(true);
    animation.current = {
      activeIndex,
      elapsed: 0,
      fromRotation: turntable.current.rotation.y,
      fromScales: anchors.current.map((anchor) => anchor?.scale.x ?? 1),
      toRotation: targetRotation,
    };
  }, [activeIndex, onTurningChange, reducedMotion, targetRotation]);

  useFrame((_, delta) => {
    const current = animation.current;
    if (!current || !turntable.current) return;
    current.elapsed += delta;
    const progress = Math.min(current.elapsed / TURN_DURATION_SECONDS, 1);
    const eased = easeInOutCubic(progress);
    turntable.current.rotation.y = MathUtils.lerp(
      current.fromRotation,
      current.toRotation,
      eased,
    );
    anchors.current.forEach((anchor, index) => {
      if (!anchor) return;
      anchor.scale.setScalar(
        MathUtils.lerp(
          current.fromScales[index] ?? 1,
          index === current.activeIndex ? 1.12 : 1,
          eased,
        ),
      );
    });
    if (progress === 1) {
      animation.current = null;
      onTurningChange(false);
    }
  });

  return (
    <group ref={turntable} rotation={[0, targetRotation, 0]}>
      {slugs.map((slug, index) => {
        const angle = index * QUARTER_TURN;
        const module = modulesBySlug[slug];
        return (
          <group
            key={slug}
            position={[
              TURNTABLE_RADIUS * Math.sin(angle),
              0,
              TURNTABLE_RADIUS * Math.cos(angle),
            ]}
            ref={(node) => {
              anchors.current[index] = node;
            }}
            rotation={[0, angle, 0]}
            scale={index === activeIndex ? 1.12 : 1}
          >
            {module ? (
              <StaticMachineModel
                module={module}
                onActivate={() => onActivate(index)}
                slug={slug}
              />
            ) : null}
          </group>
        );
      })}
      <RoundPlatform radius={TURNTABLE_RADIUS + 0.9} />
    </group>
  );
}

function TurntableStage({
  activeIndex,
  modulesBySlug,
  onActivate,
  onTurningChange,
  reducedMotion,
  rendering,
  slugs,
  step,
  turning,
}: {
  activeIndex: number;
  modulesBySlug: Partial<Record<MachineSlug, MachineModule>>;
  onActivate: (index: number) => void;
  onTurningChange: (turning: boolean) => void;
  reducedMotion: boolean;
  rendering: boolean;
  slugs: readonly MachineSlug[];
  step: number;
  turning: boolean;
}) {
  return (
    <Canvas
      camera={{ fov: 34, position: [0, 2.3, 7.2] }}
      dpr={[1, 1.5]}
      frameloop={!rendering ? "never" : turning ? "always" : "demand"}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      onCreated={prepareSceneEnvironment}
    >
      <color args={["#090a0a"]} attach="background" />
      <SceneEnvironment />
      <FixedCamera />
      <WarmLightRig />
      <Turntable
        activeIndex={activeIndex}
        modulesBySlug={modulesBySlug}
        onActivate={onActivate}
        onTurningChange={onTurningChange}
        reducedMotion={reducedMotion}
        slugs={slugs}
        step={step}
      />
    </Canvas>
  );
}

export default function HomeCarouselHero({
  slugs,
}: {
  slugs: readonly MachineSlug[];
}) {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage === "en" ? "en" : "zh";
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const compact = useMediaQuery("(max-width: 899px)");
  const heroRef = useRef<HTMLElement>(null);
  const documentVisible = useDocumentVisible();
  const heroInView = useElementInView(heroRef);
  const rendering = documentVisible && heroInView;
  const [carousel, setCarousel] = useState(createHomeCarouselState);
  const [turning, setTurning] = useState(false);
  const dataBySlug = useMachineCatalog(slugs);
  const { modulesBySlug, progress } = useSequentialMachineWarmup(
    !compact,
    slugs,
  );
  const activeIndex = activeHomeCarouselIndex(carousel.step, slugs.length);
  const activeSlug = slugs[activeIndex];
  const activeData = dataBySlug[activeSlug];
  const mountedMachineCount = Object.keys(modulesBySlug).length;

  const dispatch = useCallback(
    (event: Parameters<typeof transitionHomeCarousel>[1]) => {
      setCarousel(
        (current) => transitionHomeCarousel(current, event, slugs).state,
      );
    },
    [slugs],
  );
  const activateMachine = useCallback(
    (index: number) => {
      const target = transitionHomeCarousel(
        carousel,
        { type: "activate", index },
        slugs,
      ).navigateTo;
      if (target) window.location.hash = target.slice(1);
    },
    [carousel, slugs],
  );

  useEffect(() => {
    if (!rendering || reduceMotion || carousel.paused) return;
    const interval = window.setInterval(
      () => dispatch({ type: "advance", automatic: true }),
      7000,
    );
    return () => window.clearInterval(interval);
  }, [carousel.paused, dispatch, reduceMotion, rendering]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    dispatch({
      type: "advance",
      delta: event.key === "ArrowLeft" ? -1 : 1,
    });
  };

  return (
    <section
      aria-label={t("app.home")}
      className="hero home-carousel-hero"
      data-active-slug={activeSlug}
      data-rendering={rendering ? "true" : "false"}
      onBlur={() => dispatch({ type: "hover", paused: false })}
      onFocus={() => dispatch({ type: "hover", paused: true })}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => dispatch({ type: "hover", paused: true })}
      onMouseLeave={() => dispatch({ type: "hover", paused: false })}
      ref={heroRef}
      tabIndex={0}
    >
      <header className="home-carousel-heading">
        <p className="eyebrow">{t("home.eyebrow")}</p>
        <h1 className="display-title">{t("home.title")}</h1>
        <p className="hero-copy">{t("home.intro")}</p>
      </header>
      <div
        className="home-turntable-stage"
        data-mounted-machine-count={mountedMachineCount}
        data-testid="home-turntable"
      >
        {compact ? (
          <a className="home-carousel-poster-link" href={`#/m/${activeSlug}`}>
            <img
              alt=""
              className="home-carousel-poster"
              src={`${import.meta.env.BASE_URL}assets/renders/${activeSlug}/overall.jpg`}
            />
          </a>
        ) : (
          <TurntableStage
            activeIndex={activeIndex}
            modulesBySlug={modulesBySlug}
            onActivate={activateMachine}
            onTurningChange={setTurning}
            reducedMotion={reduceMotion}
            rendering={rendering}
            slugs={slugs}
            step={carousel.step}
            turning={turning}
          />
        )}
        {!compact && Object.keys(modulesBySlug).length === 0 && progress ? (
          <GeometryLoading
            built={progress.built}
            label={t("app.loading")}
            scope="home-turntable"
            total={progress.total}
          />
        ) : null}
      </div>
      {activeData ? (
        <a
          aria-live="polite"
          className="home-carousel-machine-copy"
          data-testid="home-active-machine"
          href={`#/m/${activeSlug}`}
        >
          <span className="machine-index">
            {String(activeIndex + 1).padStart(2, "0")}
          </span>
          <span className="home-carousel-machine-text">
            <strong>{activeData.names[language]}</strong>
            <span>{activeData.oneLiner[language]}</span>
          </span>
          <span className="machine-open">{t("home.open")}</span>
        </a>
      ) : null}
      <div className="home-machine-pills" role="group">
        {slugs.map((slug, index) => {
          const data = dataBySlug[slug];
          return (
            <button
              aria-pressed={index === activeIndex}
              data-machine-slug={slug}
              data-testid="home-machine-pill"
              key={slug}
              onClick={() => dispatch({ type: "select", index })}
              type="button"
            >
              {data?.names[language] ?? slug}
            </button>
          );
        })}
      </div>
    </section>
  );
}
