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
import {
  standardMaterial,
  type StandardMaterialPresentation,
} from "../core/materials";
import {
  applyMechanicaInstanceMatrices,
  getMechanicaInstanceMatrices,
  partGeometryEntries,
} from "../core/primitives";
import {
  defaultTextureVariant,
  textureShaderFeatureHash,
} from "../core/textures";
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
  homeCarouselDriftSpeed,
  homeMachineScale,
  targetHomeCarouselQuarterRotation,
  targetHomeCarouselRotation,
} from "./homeCarousel";
import { GeometryLoading } from "./viewer/geometryWarmup";
import SceneEnvironment, {
  prepareSceneEnvironment,
} from "./viewer/SceneEnvironment";
import { visualMaterialFor } from "./viewer/visualRecovery";

const TURNTABLE_RADIUS = 2.6;
const QUARTER_TURN = Math.PI / 2;
const TURN_DURATION_SECONDS = 0.9;
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
  part,
  visualPresentation,
}: {
  geometry: BufferGeometry;
  part: PartDef;
  visualPresentation?: StandardMaterialPresentation;
}) {
  const materialOverride = useMemo(
    () =>
      geometry.userData.mechanicaMaterial as
        StandardMaterialPresentation | undefined,
    [geometry],
  );
  const textureVariant =
    materialOverride?.textureVariant ??
    visualPresentation?.textureVariant ??
    defaultTextureVariant(part.material);
  const texturePresentation = useMemo<StandardMaterialPresentation>(
    () => ({
      shaderFeatureHash: textureShaderFeatureHash(textureVariant),
      textureVariant,
    }),
    [textureVariant],
  );
  const materialKey = useMemo(
    () =>
      `base:${materialVariantKey(
        visualPresentation,
        texturePresentation,
        materialOverride,
      )}`,
    [materialOverride, texturePresentation, visualPresentation],
  );
  const material = getMaterial(part.material, materialKey, () =>
    standardMaterial(
      part.material,
      visualPresentation,
      texturePresentation,
      materialOverride,
    ),
  );
  const matrices = getMechanicaInstanceMatrices(geometry);

  useEffect(
    () => acquireMaterial(part.material, materialKey, () => material).release,
    [material, materialKey, part.material],
  );

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

  useLayoutEffect(() => geometryResource.retain(), [geometryResource]);

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
          part={part}
          visualPresentation={presentation}
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
        position={[0, PLATFORM_TOP + 0.007, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry
          args={[radius * 0.72, radius * 0.725, 72, 1, 0, Math.PI * 2]}
        />
        <meshBasicMaterial
          color="#c88a42"
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function FixedCamera() {
  const camera = useThree((state) => state.camera);
  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    camera.position.set(0, 2.9, 9);
    camera.lookAt(0, 0.86, 0);
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
      <ambientLight color="#d8b46c" intensity={0.12} />
      <hemisphereLight args={["#ead7b2", "#211811", 0.2]} />
      <directionalLight color="#ffe1b6" intensity={0.55} position={[3, 5, 4]} />
      <directionalLight
        color="#b88a5a"
        intensity={0.18}
        position={[-4, 2, -3]}
      />
      <spotLight
        angle={0.45}
        color="#ffc66f"
        decay={2}
        distance={12}
        intensity={110}
        penumbra={0.6}
        position={[0, 6.5, 1.8]}
        ref={light}
      />
      <group position={[0, PLATFORM_TOP, TURNTABLE_RADIUS]} ref={target} />
    </>
  );
}

type TurnRequest =
  | { id: number; type: "machine"; index: number }
  | { id: number; type: "quarter"; direction: -1 | 1 };

interface TurnAnimation {
  elapsed: number;
  fromRotation: number;
  toRotation: number;
}

function easeInOutCubic(value: number): number {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function Turntable({
  modulesBySlug,
  onActiveIndexChange,
  onActivate,
  paused,
  reducedMotion,
  request,
  slugs,
}: {
  modulesBySlug: Partial<Record<MachineSlug, MachineModule>>;
  onActiveIndexChange: (index: number) => void;
  onActivate: (index: number) => void;
  paused: boolean;
  reducedMotion: boolean;
  request: TurnRequest | null;
  slugs: readonly MachineSlug[];
}) {
  const turntable = useRef<Group>(null);
  const anchors = useRef<Array<Group | null>>([]);
  const animation = useRef<TurnAnimation | null>(null);
  const activeIndex = useRef(0);
  const driftSpeed = useRef(homeCarouselDriftSpeed(paused, reducedMotion));
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    if (!turntable.current || !request) return;
    const targetRotation =
      request.type === "machine"
        ? targetHomeCarouselRotation(
            turntable.current.rotation.y,
            request.index,
            slugs.length,
          )
        : targetHomeCarouselQuarterRotation(
            turntable.current.rotation.y,
            request.direction,
            slugs.length,
          );
    if (reducedMotion) {
      turntable.current.rotation.y = targetRotation;
      anchors.current.forEach((anchor, index) =>
        anchor?.scale.setScalar(
          homeMachineScale(targetRotation, index, slugs.length),
        ),
      );
      const nextActiveIndex = activeHomeCarouselIndex(
        targetRotation,
        slugs.length,
      );
      activeIndex.current = nextActiveIndex;
      onActiveIndexChange(nextActiveIndex);
      animation.current = null;
      driftSpeed.current = 0;
      invalidate();
      return;
    }
    animation.current = {
      elapsed: 0,
      fromRotation: turntable.current.rotation.y,
      toRotation: targetRotation,
    };
  }, [invalidate, onActiveIndexChange, reducedMotion, request, slugs.length]);

  useFrame((_, delta) => {
    if (!turntable.current) return;
    const frameDelta = Math.min(delta, 0.05);
    const current = animation.current;
    if (current) {
      current.elapsed += frameDelta;
      const progress = Math.min(current.elapsed / TURN_DURATION_SECONDS, 1);
      turntable.current.rotation.y = MathUtils.lerp(
        current.fromRotation,
        current.toRotation,
        easeInOutCubic(progress),
      );
      if (progress === 1) animation.current = null;
    } else {
      const targetSpeed = homeCarouselDriftSpeed(paused, reducedMotion);
      driftSpeed.current = MathUtils.damp(
        driftSpeed.current,
        targetSpeed,
        9.2,
        frameDelta,
      );
      if (paused && Math.abs(driftSpeed.current) < 0.0001) {
        driftSpeed.current = 0;
      }
      turntable.current.rotation.y += driftSpeed.current * frameDelta;
    }
    const rotationY = turntable.current.rotation.y;
    anchors.current.forEach((anchor, index) => {
      if (!anchor) return;
      anchor.scale.setScalar(homeMachineScale(rotationY, index, slugs.length));
    });
    const nextActiveIndex = activeHomeCarouselIndex(rotationY, slugs.length);
    if (nextActiveIndex !== activeIndex.current) {
      activeIndex.current = nextActiveIndex;
      onActiveIndexChange(nextActiveIndex);
    }
  });

  return (
    <group ref={turntable}>
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
            scale={homeMachineScale(0, index, slugs.length)}
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
  modulesBySlug,
  onActiveIndexChange,
  onActivate,
  paused,
  reducedMotion,
  rendering,
  request,
  slugs,
}: {
  modulesBySlug: Partial<Record<MachineSlug, MachineModule>>;
  onActiveIndexChange: (index: number) => void;
  onActivate: (index: number) => void;
  paused: boolean;
  reducedMotion: boolean;
  rendering: boolean;
  request: TurnRequest | null;
  slugs: readonly MachineSlug[];
}) {
  return (
    <Canvas
      camera={{ fov: 34, position: [0, 2.9, 9] }}
      dpr={[1, 1.5]}
      frameloop={!rendering ? "never" : reducedMotion ? "demand" : "always"}
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
        modulesBySlug={modulesBySlug}
        onActiveIndexChange={onActiveIndexChange}
        onActivate={onActivate}
        paused={paused}
        reducedMotion={reducedMotion}
        request={request}
        slugs={slugs}
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
  const requestId = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [turnRequest, setTurnRequest] = useState<TurnRequest | null>(null);
  const dataBySlug = useMachineCatalog(slugs);
  const { modulesBySlug, progress } = useSequentialMachineWarmup(
    !compact,
    slugs,
  );
  const activeSlug = slugs[activeIndex];
  const activeData = dataBySlug[activeSlug];
  const mountedMachineCount = Object.keys(modulesBySlug).length;

  const activateMachine = useCallback(
    (index: number) => {
      window.location.hash = `/m/${slugs[index]}`;
    },
    [slugs],
  );
  const turnToMachine = useCallback(
    (index: number) => {
      if (compact || reduceMotion) setActiveIndex(index);
      if (compact) return;
      requestId.current += 1;
      setTurnRequest({ id: requestId.current, type: "machine", index });
    },
    [compact, reduceMotion],
  );
  const turnQuarter = useCallback(
    (direction: -1 | 1) => {
      const nextIndex = (activeIndex + direction + slugs.length) % slugs.length;
      if (compact || reduceMotion) setActiveIndex(nextIndex);
      if (compact) return;
      requestId.current += 1;
      setTurnRequest({
        direction,
        id: requestId.current,
        type: "quarter",
      });
    },
    [activeIndex, compact, reduceMotion, slugs.length],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    turnQuarter(event.key === "ArrowLeft" ? -1 : 1);
  };

  return (
    <section
      aria-label={t("app.home")}
      className="hero home-carousel-hero"
      data-active-slug={activeSlug}
      data-rendering={rendering ? "true" : "false"}
      onBlur={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
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
            modulesBySlug={modulesBySlug}
            onActiveIndexChange={setActiveIndex}
            onActivate={activateMachine}
            paused={paused}
            reducedMotion={reduceMotion}
            rendering={rendering}
            request={turnRequest}
            slugs={slugs}
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
          key={activeSlug}
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
              onClick={() => turnToMachine(index)}
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
