import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Box3,
  type BufferGeometry,
  type Group,
  PerspectiveCamera,
  Sphere,
  Vector3,
} from "three";

import { machineGeometryCache } from "../core/geometryCache";
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
  createHomeCarouselState,
  transitionHomeCarousel,
} from "./homeCarousel";
import {
  GeometryLoading,
  useMachineGeometryWarmup,
} from "./viewer/geometryWarmup";
import { visualMaterialFor } from "./viewer/visualRecovery";

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

const HeroMachinePart = memo(function HeroMachinePart({
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
        consumerKey: `home:${module.data.slug}:${part.id}`,
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
    () => `home:${materialVariantKey(presentation)}`,
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
        <HeroMachinePart
          childrenByParent={childrenByParent}
          key={child.id}
          module={module}
          part={child}
        />
      ))}
    </group>
  );
});

function fitHeroCamera(camera: PerspectiveCamera, model: Group): void {
  model.position.set(0, 0, 0);
  model.updateWorldMatrix(true, true);
  const bounds = new Box3().setFromObject(model);
  if (bounds.isEmpty()) return;
  const center = bounds.getCenter(new Vector3());
  const sphere = bounds.getBoundingSphere(new Sphere());
  model.position.sub(center);
  const verticalFov = (camera.fov * Math.PI) / 180;
  const horizontalFov =
    2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  const limitingFov = Math.min(verticalFov, horizontalFov);
  const distance = Math.max(
    sphere.radius / Math.sin(limitingFov / 2),
    sphere.radius * 2,
  );
  const direction = new Vector3(0.68, 0.36, 1).normalize();
  camera.position.copy(direction.multiplyScalar(distance * 1.16));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function HeroMachineModel({
  module,
  onMounted,
  spec,
}: {
  module: MachineModule;
  onMounted: () => void;
  spec: MachineSpec;
}) {
  const camera = useThree((state) => state.camera);
  const viewport = useThree((state) => state.size);
  const stage = useRef<Group>(null);
  const model = useRef<Group>(null);
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
    if (!(camera instanceof PerspectiveCamera) || !model.current) return;
    fitHeroCamera(camera, model.current);
    onMounted();
  }, [camera, module, onMounted, viewport]);

  useFrame((_, delta) => {
    if (stage.current) stage.current.rotation.y += Math.min(delta, 0.05) * 0.1;
  });

  return (
    <group ref={stage}>
      <group ref={model}>
        {rootParts.map((part) => (
          <HeroMachinePart
            childrenByParent={childrenByParent}
            key={part.id}
            module={module}
            part={part}
          />
        ))}
      </group>
    </group>
  );
}

function LoadedHeroStage({
  module,
  onReady,
  slug,
}: {
  module: MachineModule;
  onReady: (slug: MachineSlug) => void;
  slug: MachineSlug;
}) {
  const { t } = useTranslation();
  const spec = useMemo(
    () =>
      applySchemePatch(
        module.spec,
        module.defaultSchemeId
          ? module.schemes?.[module.defaultSchemeId]
          : undefined,
      ),
    [module],
  );
  const warmup = useMachineGeometryWarmup({
    consumerScope: `home:${slug}`,
    module,
    spec,
    warmupKey: `${slug}:${module.defaultSchemeId ?? "default"}`,
  });

  useEffect(() => {
    if (warmup.prepared) onReady(slug);
  }, [onReady, slug, warmup.prepared]);

  return (
    <>
      <Canvas
        camera={{ fov: 34, position: [0, 0, 5] }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <color args={["#0c0d0c"]} attach="background" />
        <ambientLight color="#d9c498" intensity={0.8} />
        <hemisphereLight args={["#dce8ef", "#241b13", 1.25]} />
        <directionalLight
          color="#ffe0a6"
          intensity={2.8}
          position={[4, 6, 5]}
        />
        <directionalLight
          color="#82b2c7"
          intensity={1.1}
          position={[-5, 2, -4]}
        />
        {warmup.prepared ? (
          <HeroMachineModel
            module={module}
            onMounted={warmup.commit}
            spec={spec}
          />
        ) : null}
      </Canvas>
      {!warmup.prepared ? (
        <GeometryLoading
          built={warmup.built}
          label={t("app.loading")}
          scope="home-carousel"
          total={warmup.total}
        />
      ) : null}
    </>
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
  const interactive = !reduceMotion && !compact;
  const [carousel, setCarousel] = useState(createHomeCarouselState);
  const [dataBySlug, setDataBySlug] = useState<
    Partial<Record<MachineSlug, MachineData>>
  >({});
  const [modulesBySlug, setModulesBySlug] = useState<
    Partial<Record<MachineSlug, MachineModule>>
  >({});
  const [exitElapsed, setExitElapsed] = useState(false);
  const [stageReadySlug, setStageReadySlug] = useState<MachineSlug | null>(
    null,
  );
  const activeSlug = slugs[carousel.activeIndex];
  const pendingSlug =
    carousel.pendingIndex === null ? null : slugs[carousel.pendingIndex];
  const wantedSlug = pendingSlug ?? activeSlug;
  const activeData = dataBySlug[activeSlug];
  const activeModule = modulesBySlug[activeSlug];

  const dispatch = useCallback(
    (event: Parameters<typeof transitionHomeCarousel>[1]) => {
      setCarousel(
        (current) => transitionHomeCarousel(current, event, slugs).state,
      );
    },
    [slugs],
  );

  useEffect(() => {
    let cancelled = false;
    if (dataBySlug[wantedSlug]) return;
    void loadHeroData(wantedSlug)
      .then((loaded) => {
        if (!cancelled) {
          setDataBySlug((current) => ({
            ...current,
            [wantedSlug]: loaded,
          }));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [dataBySlug, wantedSlug]);

  useEffect(() => {
    if (!interactive || modulesBySlug[wantedSlug]) return;
    let cancelled = false;
    void loadHeroMachine(wantedSlug)
      .then((loaded) => {
        if (!cancelled) {
          setModulesBySlug((current) => ({
            ...current,
            [wantedSlug]: loaded,
          }));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [interactive, modulesBySlug, wantedSlug]);

  useEffect(() => {
    if (!interactive) return;
    const interval = window.setInterval(
      () => dispatch({ type: "cycle" }),
      7000,
    );
    return () => window.clearInterval(interval);
  }, [dispatch, interactive]);

  useEffect(() => {
    if (carousel.phase !== "exiting") {
      setExitElapsed(false);
      return;
    }
    const timeout = window.setTimeout(() => setExitElapsed(true), 240);
    return () => window.clearTimeout(timeout);
  }, [carousel.phase]);

  useEffect(() => {
    if (
      carousel.phase !== "exiting" ||
      !exitElapsed ||
      !pendingSlug ||
      !dataBySlug[pendingSlug] ||
      !modulesBySlug[pendingSlug]
    ) {
      return;
    }
    setStageReadySlug(null);
    dispatch({ type: "exit-complete" });
  }, [
    carousel.phase,
    dataBySlug,
    dispatch,
    exitElapsed,
    modulesBySlug,
    pendingSlug,
  ]);

  useEffect(() => {
    if (carousel.phase !== "entering" || stageReadySlug !== activeSlug) {
      return;
    }
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() =>
        dispatch({ type: "enter-complete" }),
      );
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [activeSlug, carousel.phase, dispatch, stageReadySlug]);

  useEffect(() => {
    setCarousel((current) =>
      interactive
        ? { ...current, paused: false }
        : {
            ...current,
            paused: true,
            pendingIndex: null,
            phase: "idle",
          },
    );
  }, [interactive]);

  const target = transitionHomeCarousel(
    carousel,
    { type: "activate" },
    slugs,
  ).navigateTo;
  const handleStageReady = useCallback((slug: MachineSlug) => {
    setStageReadySlug(slug);
  }, []);

  return (
    <section className="hero home-carousel-hero">
      <a
        aria-label={
          activeData
            ? `${activeData.names[language]} — ${activeData.oneLiner[language]}`
            : t("home.open")
        }
        className="home-carousel-link"
        data-phase={carousel.phase}
        data-static={interactive ? "false" : "true"}
        href={target}
        onBlur={() => dispatch({ type: "hover", paused: false })}
        onFocus={() => dispatch({ type: "hover", paused: true })}
        onMouseEnter={() => dispatch({ type: "hover", paused: true })}
        onMouseLeave={() => dispatch({ type: "hover", paused: false })}
      >
        <div className="home-carousel-heading">
          <p className="eyebrow">{t("home.eyebrow")}</p>
          <h1 className="display-title">{t("home.title")}</h1>
          <p className="hero-copy">{t("home.intro")}</p>
        </div>
        <div className="home-carousel-visual">
          {interactive && activeModule ? (
            <LoadedHeroStage
              module={activeModule}
              onReady={handleStageReady}
              slug={activeSlug}
            />
          ) : (
            <img
              alt=""
              className="home-carousel-poster"
              src={`${import.meta.env.BASE_URL}assets/renders/${activeSlug}/overall.jpg`}
            />
          )}
        </div>
        {activeData ? (
          <div aria-live="polite" className="home-carousel-machine-copy">
            <span className="machine-index">
              {String(carousel.activeIndex + 1).padStart(2, "0")}
            </span>
            <h2>{activeData.names[language]}</h2>
            <p>{activeData.oneLiner[language]}</p>
            <span className="machine-open">{t("home.open")}</span>
          </div>
        ) : null}
      </a>
    </section>
  );
}
