import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  memo,
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
  MachineModule,
  MachineSlug,
  MachineSpec,
  PartDef,
} from "../sim/types";
import {
  createHomeCarouselState,
  transitionHomeCarousel,
} from "./homeCarousel";
import PosterFallback from "./PosterFallback";
import {
  GeometryLoading,
  useMachineGeometryWarmup,
} from "./viewer/geometryWarmup";
import { visualMaterialFor } from "./viewer/visualRecovery";

const heroMachineModules = import.meta.glob<{ default: MachineModule }>(
  "../machines/*/build.ts",
);

function loadHeroMachine(slug: MachineSlug): Promise<MachineModule> {
  const loader = heroMachineModules[`../machines/${slug}/build.ts`];
  if (!loader) return Promise.reject(new Error(`Missing machine ${slug}`));
  return loader().then((loaded) => loaded.default);
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

function LoadedHeroStage({ module }: { module: MachineModule }) {
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
    consumerScope: `home:${module.data.slug}`,
    module,
    spec,
    warmupKey: `${module.data.slug}:${module.defaultSchemeId ?? "default"}`,
  });

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
  const [carousel] = useState(createHomeCarouselState);
  const activeSlug = slugs[carousel.activeIndex];
  const [module, setModule] = useState<MachineModule | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadHeroMachine(activeSlug)
      .then((loaded) => {
        if (!cancelled) setModule(loaded);
      })
      .catch(() => {
        if (!cancelled) setModule(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSlug]);

  const target = transitionHomeCarousel(
    carousel,
    { type: "activate" },
    slugs,
  ).navigateTo;
  const activeData = module?.data.slug === activeSlug ? module.data : null;

  return (
    <section className="hero home-carousel-hero">
      <a
        aria-label={
          activeData
            ? `${activeData.names[language]} — ${activeData.oneLiner[language]}`
            : t("home.open")
        }
        className="home-carousel-link"
        href={target}
      >
        <div className="home-carousel-heading">
          <p className="eyebrow">{t("home.eyebrow")}</p>
          <h1 className="display-title">{t("home.title")}</h1>
          <p className="hero-copy">{t("home.intro")}</p>
        </div>
        <div className="home-carousel-visual">
          {module ? (
            <LoadedHeroStage module={module} />
          ) : (
            <PosterFallback slug={activeSlug} />
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
