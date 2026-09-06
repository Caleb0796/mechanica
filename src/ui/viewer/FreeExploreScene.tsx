import { Shadow } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type MutableRefObject } from "react";
import { Box3, type Mesh, type Object3D, Raycaster, Vector3 } from "three";

import type { MachineSpec } from "../../sim/types";
import type { FreeMoveOffset } from "./freeMove";
import { VIEWER_PROFILES, type ViewerProfile } from "./visualRecovery";

export type ExploreOffsets = Record<string, FreeMoveOffset>;
export interface ExploreGeometry {
  homeBounds: Record<string, Box3>;
  assemblyBounds: Box3;
  floorY: number;
}
export interface ExploreCameraActions {
  groundBasis: () => { right: FreeMoveOffset; up: FreeMoveOffset };
  zoom: (factor: number) => void;
  reset: () => void;
  nudge: (x: number, y: number) => void;
  project: (
    point: FreeMoveOffset,
    ignorePartId?: string,
  ) => [number, number] | null;
}
interface Controls {
  enabled: boolean;
  target: Vector3;
  update: () => void;
}

export const EXPLORE_HOME: FreeMoveOffset = [4.2, 3.9, 5.8];
const TARGET: FreeMoveOffset = [0, 0, 0];
export const EXPLORE_PROFILE: ViewerProfile = {
  ...VIEWER_PROFILES.seismoscope,
  homePose: { position: EXPLORE_HOME, target: TARGET, fov: 36 },
  minDistanceFactor: 0.75,
  maxPolarAngle: Math.PI / 2 - 0.05,
};

function geometryBounds(root: Object3D) {
  const bounds = new Box3();
  root.updateWorldMatrix(true, true);
  root.traverse((object) => {
    if ((object as Mesh).isMesh && !object.userData.mechanicaAffordance)
      bounds.expandByObject(object, true);
  });
  return bounds;
}

export default function FreeExploreScene({
  spec,
  movableIds,
  offsets,
  geometry,
  onGeometry,
  actions,
  onNudge,
  onFrame,
}: {
  spec: MachineSpec;
  movableIds: readonly string[];
  offsets: ExploreOffsets;
  geometry: ExploreGeometry | null;
  onGeometry: (geometry: ExploreGeometry) => void;
  actions: MutableRefObject<ExploreCameraActions | null>;
  onNudge: (delta: Vector3) => void;
  onFrame: (delta: number) => void;
}) {
  const { camera, gl, invalidate, scene } = useThree();
  const controls = useThree(
    (state) => state.controls,
  ) as unknown as Controls | null;
  const measured = useRef(false);
  const initialFrames = useRef(0);
  const targetRay = useRef(new Raycaster());
  useEffect(() => {
    if (!controls) return;
    actions.current = {
      groundBasis() {
        const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        right.y = 0;
        right.normalize();
        const up = new Vector3().crossVectors(new Vector3(0, 1, 0), right);
        return {
          right: right.toArray() as FreeMoveOffset,
          up: up.toArray() as FreeMoveOffset,
        };
      },
      project(point, ignorePartId) {
        const world = new Vector3(...point);
        if (ignorePartId) {
          const origin = camera.getWorldPosition(new Vector3());
          const direction = world.clone().sub(origin);
          targetRay.current.set(origin, direction.clone().normalize());
          targetRay.current.far = Math.max(0, direction.length() - 0.18);
          const blocked = targetRay.current
            .intersectObjects(scene.children, true)
            .some((hit) => {
              let object: Object3D | null = hit.object;
              while (object) {
                if (
                  !object.visible ||
                  object.userData.mechanicaAffordance ||
                  object.name === `free-move-${ignorePartId}`
                )
                  return false;
                object = object.parent;
              }
              return true;
            });
          if (blocked) return null;
        }
        const projected = world.project(camera);
        if (
          projected.z < -1 ||
          projected.z > 1 ||
          Math.abs(projected.x) > 1 ||
          Math.abs(projected.y) > 1
        )
          return null;
        const rect = gl.domElement.getBoundingClientRect();
        return [
          rect.left + ((projected.x + 1) * rect.width) / 2,
          rect.top + ((1 - projected.y) * rect.height) / 2,
        ];
      },
      zoom(factor) {
        const direction = camera.position.clone().sub(controls.target);
        camera.position
          .copy(controls.target)
          .add(
            direction.setLength(
              Math.max(1.7, Math.min(24, direction.length() * factor)),
            ),
          );
        controls.update();
        invalidate();
      },
      reset() {
        camera.position.set(...EXPLORE_HOME);
        controls.target.set(...TARGET);
        controls.update();
        invalidate();
      },
      nudge(x, y) {
        onNudge(
          new Vector3(x, y, 0)
            .applyQuaternion(camera.quaternion)
            .multiplyScalar(0.12),
        );
      },
    };
    return () => {
      actions.current = null;
    };
  }, [actions, camera, controls, gl, invalidate, onNudge, scene]);

  useFrame((_, delta) => {
    onFrame(Math.min(delta, 0.05));
    if (!measured.current && ++initialFrames.current > 3) {
      const parts = spec.parts.map((part) => scene.getObjectByName(part.id));
      if (parts.every(Boolean)) {
        const homeBounds: Record<string, Box3> = {};
        const assemblyBounds = new Box3();
        for (let index = 0; index < parts.length; index++) {
          const id = spec.parts[index].id;
          if (movableIds.includes(id)) {
            const root = scene.getObjectByName(`free-move-${id}`);
            if (root)
              homeBounds[id] = geometryBounds(root).translate(
                new Vector3(...(offsets[id] ?? [0, 0, 0])).negate(),
              );
          } else assemblyBounds.union(geometryBounds(parts[index]!));
        }
        if (
          movableIds.every(
            (id) => homeBounds[id] && !homeBounds[id].isEmpty(),
          ) &&
          !assemblyBounds.isEmpty()
        ) {
          measured.current = true;
          onGeometry({
            homeBounds,
            assemblyBounds,
            floorY: assemblyBounds.min.y,
          });
        }
      }
    }
    const canvas = gl.domElement;
    canvas.dataset.cameraPosition = camera.position.toArray().join(",");
    canvas.dataset.controlsEnabled = String(controls?.enabled ?? false);
    canvas.dataset.groundReady = String(Boolean(geometry));
    if (!geometry) return;
    canvas.dataset.floorY = String(geometry.floorY);
    const rect = canvas.getBoundingClientRect();
    const screens: Record<string, number[]> = {};
    const bottoms: Record<string, number> = {};
    for (const id of movableIds) {
      const bounds = geometry.homeBounds[id];
      const point = bounds.getCenter(new Vector3());
      // The exposed top of the sensor is its natural pickup point.
      if (id === "duzhu") point.y = bounds.max.y - 0.04;
      point.add(new Vector3(...(offsets[id] ?? [0, 0, 0]))).project(camera);
      screens[id] = [
        rect.left + ((point.x + 1) * rect.width) / 2,
        rect.top + ((1 - point.y) * rect.height) / 2,
      ];
      bottoms[id] = bounds.min.y + (offsets[id]?.[1] ?? 0);
    }
    canvas.dataset.partScreens = JSON.stringify(screens);
    canvas.dataset.partBottoms = JSON.stringify(bottoms);
    canvas.dataset.lidScreen = screens.lid?.join(",");
    canvas.dataset.lidBottomY = String(bottoms.lid);
  }, -2);

  if (!geometry) return null;
  const assemblySize = geometry.assemblyBounds.getSize(new Vector3());
  return (
    <>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, geometry.floorY - 0.001, 0]}
        userData={{ mechanicaAffordance: true }}
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          color="#171a17"
          roughness={1}
          metalness={0}
          envMapIntensity={0}
        />
      </mesh>
      <Shadow
        position={[0, geometry.floorY + 0.003, 0]}
        scale={Math.max(assemblySize.x, assemblySize.z) * 1.08}
        opacity={0.55}
        colorStop={0.5}
        userData={{ mechanicaAffordance: true }}
        raycast={() => undefined}
      />
      {movableIds.map((id) => {
        const bounds = geometry.homeBounds[id];
        const center = bounds.getCenter(new Vector3());
        const size = bounds.getSize(new Vector3());
        const offset = offsets[id] ?? [0, 0, 0];
        const height = Math.max(0, bounds.min.y + offset[1] - geometry.floorY);
        return (
          <Shadow
            key={id}
            position={[
              center.x + offset[0],
              geometry.floorY + 0.004,
              center.z + offset[2],
            ]}
            scale={Math.max(size.x, size.z) * (1.12 + height * 0.15)}
            opacity={0.65 / (1 + height * 2)}
            colorStop={0.6}
            userData={{ mechanicaAffordance: true }}
            raycast={() => undefined}
          />
        );
      })}
    </>
  );
}
