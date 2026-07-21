import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import {
  Box3,
  Matrix4,
  PerspectiveCamera,
  Quaternion,
  Sphere,
  Vector3,
} from "three";

import {
  safeHomePose,
  usesAuthoredHomeFocus,
  type ViewerProfile,
} from "./visualRecovery";

type ControlsLike = {
  target: Vector3;
  update: () => void;
  enabled: boolean;
} | null;

function fitDistanceForBounds(
  bounds: Box3,
  direction: Vector3,
  target: Vector3,
  fov: number,
  aspect: number,
): number {
  const cameraPosition = target.clone().add(direction);
  const quaternion = new Quaternion().setFromRotationMatrix(
    new Matrix4().lookAt(cameraPosition, target, new Vector3(0, 1, 0)),
  );
  const inverseQuaternion = quaternion.invert();
  const tanVertical = Math.tan((fov * Math.PI) / 360);
  const tanHorizontal = tanVertical * aspect;
  let distance = 0;

  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const corner = new Vector3(x, y, z)
          .sub(target)
          .applyQuaternion(inverseQuaternion);
        distance = Math.max(
          distance,
          corner.z + Math.abs(corner.x) / tanHorizontal,
          corner.z + Math.abs(corner.y) / tanVertical,
        );
      }
    }
  }

  return distance;
}

export default function DemoFocusRig({
  focusPartId,
  onActiveChange,
  onRestored,
  onSettled,
  partIds,
  profile,
}: {
  focusPartId: string | null;
  onActiveChange?: (active: boolean) => void;
  onRestored?: () => void;
  onSettled?: () => void;
  partIds: readonly string[];
  profile: ViewerProfile;
}) {
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as ControlsLike;
  const viewport = useThree((state) => state.size);
  const goal = useRef<{ position: Vector3; target: Vector3 } | null>(null);
  const goalKind = useRef<"focus" | "home" | "restore" | null>(null);
  const homeGoal = useRef(false);
  const processedFocusPartId = useRef<string | null>(null);
  const restore = useRef<{ position: Vector3; target: Vector3 } | null>(null);
  const onSettledRef = useRef(onSettled);
  const onRestoredRef = useRef(onRestored);
  onSettledRef.current = onSettled;
  onRestoredRef.current = onRestored;

  useEffect(() => {
    if (!controls) return;
    if (focusPartId) {
      if (processedFocusPartId.current === focusPartId) return;
      processedFocusPartId.current = focusPartId;
      if (!restore.current) {
        restore.current = {
          position: camera.position.clone(),
          target: controls.target.clone(),
        };
      }
      if (usesAuthoredHomeFocus(focusPartId)) {
        const wholeBounds = new Box3();
        for (const partId of partIds) {
          const part = scene.getObjectByName(partId);
          if (part) wholeBounds.expandByObject(part, true);
        }
        if (wholeBounds.isEmpty()) return;
        const wholeSphere = wholeBounds.getBoundingSphere(new Sphere());
        const homePose = profile.homePose
          ? safeHomePose(profile.homePose, wholeSphere)
          : null;
        if (homePose) {
          if (
            camera instanceof PerspectiveCamera &&
            homePose.fov !== undefined
          ) {
            camera.fov = homePose.fov;
            camera.updateProjectionMatrix();
          }
          goal.current = {
            position: new Vector3(...homePose.position),
            target: new Vector3(...homePose.target),
          };
        } else {
          const target = wholeBounds.getCenter(new Vector3());
          const direction = new Vector3(...profile.direction).normalize();
          const fov =
            camera instanceof PerspectiveCamera ? camera.fov : 36;
          const fitDistance = fitDistanceForBounds(
            wholeBounds,
            direction,
            target,
            fov,
            Math.max(viewport.width / viewport.height, 0.001),
          );
          const distance = Math.max(
            fitDistance * Math.max(profile.margin, 1),
            wholeSphere.radius * (profile.minDistanceFactor ?? 1.6),
          );
          goal.current = {
            position: target.clone().addScaledVector(direction, distance),
            target,
          };
        }
        homeGoal.current = true;
        goalKind.current = "home";
        onActiveChange?.(true);
        return;
      }
      const object = scene.getObjectByName(focusPartId);
      if (!object) return;
      const sphere = new Box3()
        .setFromObject(object)
        .getBoundingSphere(new Sphere());
      const fov = ((camera as PerspectiveCamera).fov * Math.PI) / 180;
      const distance = Math.max(1.6, (sphere.radius * 2.4) / Math.tan(fov / 2));
      const direction = camera.position
        .clone()
        .sub(controls.target)
        .normalize();
      goal.current = {
        position: sphere.center.clone().add(direction.multiplyScalar(distance)),
        target: sphere.center.clone(),
      };
      homeGoal.current = false;
      goalKind.current = "focus";
      onActiveChange?.(true);
    } else if (homeGoal.current) {
      processedFocusPartId.current = null;
      restore.current = null;
    } else if (restore.current) {
      processedFocusPartId.current = null;
      goal.current = restore.current;
      restore.current = null;
      goalKind.current = "restore";
      onActiveChange?.(true);
    }
  }, [
    camera,
    controls,
    focusPartId,
    onActiveChange,
    partIds,
    profile,
    scene,
    viewport,
  ]);

  useFrame(() => {
    if (!goal.current || !controls) return;
    controls.enabled = false;
    camera.position.lerp(goal.current.position, 0.08);
    controls.target.lerp(goal.current.target, 0.08);
    controls.update();
    if (
      camera.position.distanceTo(goal.current.position) < 0.02 &&
      controls.target.distanceTo(goal.current.target) < 0.02
    ) {
      const settledKind = goalKind.current;
      goal.current = null;
      goalKind.current = null;
      controls.enabled = true;
      onActiveChange?.(false);
      if (settledKind === "restore") onRestoredRef.current?.();
      if (homeGoal.current) {
        homeGoal.current = false;
        restore.current = null;
        onSettledRef.current?.();
      }
    }
  });

  return null;
}
