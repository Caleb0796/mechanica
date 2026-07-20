import type { ThreeEvent } from "@react-three/fiber";
import { useThree } from "@react-three/fiber";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";
import { Plane, Quaternion, Vector3, type Group } from "three";

import type { PartDef } from "../../sim/types";
import DriveGizmo from "./DriveGizmo";

interface DriveHandleProps {
  active: boolean;
  children: ReactNode;
  coachTarget?: boolean;
  drive: (delta: number, secondaryDelta?: number) => void;
  gizmoTestId: string;
  onDraggingChange: (dragging: boolean) => void;
  onDriveSuccess: () => void;
  onSelect: () => void;
  part: PartDef;
}

export const keyboardDriveStep = Math.PI / 36;

export function handleDriveKeyDown(
  event: ReactKeyboardEvent<HTMLButtonElement>,
  drive: (delta: number) => void,
  onDriveSuccess?: () => void,
) {
  let delta = 0;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
    delta = -keyboardDriveStep;
  }
  if (event.key === "ArrowRight" || event.key === "ArrowUp") {
    delta = keyboardDriveStep;
  }
  if (delta === 0) return;
  event.preventDefault();
  drive(delta);
  onDriveSuccess?.();
}

function gizmoRadius(part: PartDef): number {
  const geometry = part.geometry;
  let radius = 0.12;
  switch (geometry.type) {
    case "gear":
      radius = (geometry.module * geometry.teeth) / 2;
      break;
    case "shaft":
      radius = geometry.radius * 2.5;
      break;
    case "beam":
    case "scoop":
    case "box":
      radius = Math.max(...geometry.size) * 0.55;
      break;
    case "wheel":
    case "shell":
    case "ring":
      radius = geometry.radius;
      break;
    case "link":
      radius = Math.max(geometry.length * 0.5, geometry.width);
      break;
    case "custom": {
      const candidates = [
        "radius",
        "outerRadius",
        "rimRadius",
        "majorRadius",
        "width",
        "height",
        "length",
        "depth",
        "diameter",
      ]
        .map((key) => geometry.params[key])
        .filter((value): value is number => Number.isFinite(value));
      if (candidates.length > 0) radius = Math.max(...candidates) * 0.55;
      break;
    }
  }
  return Math.min(0.75, Math.max(0.08, radius * 1.12));
}

function normalizeAngle(delta: number): number {
  if (delta > Math.PI) return delta - Math.PI * 2;
  if (delta < -Math.PI) return delta + Math.PI * 2;
  return delta;
}

export default function DriveHandle({
  active,
  children,
  coachTarget = false,
  drive,
  gizmoTestId,
  onDraggingChange,
  onDriveSuccess,
  onSelect,
  part,
}: DriveHandleProps) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const group = useRef<Group>(null);
  const activePointer = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const axisWorld = useRef(new Vector3(0, 0, 1));
  const centerWorld = useRef(new Vector3());
  const currentRadial = useRef(new Vector3());
  const intersection = useRef(new Vector3());
  const lastRadial = useRef(new Vector3());
  const lastScreenAngle = useRef(0);
  const projectedCenter = useRef({ x: 0, y: 0 });
  const rotationPlane = useRef(new Plane());
  const useScreenArc = useRef(false);
  const worldQuaternion = useRef(new Quaternion());
  const axis: [number, number, number] = part.joint?.axis ?? [0, 0, 1];
  const radius = useMemo(() => gizmoRadius(part), [part]);

  const updateProjectedCenter = () => {
    const rect = gl.domElement.getBoundingClientRect();
    const projected = intersection.current
      .copy(centerWorld.current)
      .project(camera);
    projectedCenter.current.x =
      rect.left + (projected.x + 1) * 0.5 * rect.width;
    projectedCenter.current.y =
      rect.top + (1 - projected.y) * 0.5 * rect.height;
  };

  const beginDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!group.current) return;
    event.stopPropagation();
    onSelect();
    activePointer.current = event.pointerId;
    group.current.getWorldPosition(centerWorld.current);
    group.current.getWorldQuaternion(worldQuaternion.current);
    axisWorld.current
      .set(...axis)
      .applyQuaternion(worldQuaternion.current)
      .normalize();
    rotationPlane.current.setFromNormalAndCoplanarPoint(
      axisWorld.current,
      centerWorld.current,
    );
    updateProjectedCenter();

    useScreenArc.current =
      Math.abs(event.ray.direction.dot(axisWorld.current)) > 0.92;
    if (!useScreenArc.current) {
      const hit = event.ray.intersectPlane(
        rotationPlane.current,
        intersection.current,
      );
      if (hit) {
        lastRadial.current
          .copy(hit)
          .sub(centerWorld.current)
          .projectOnPlane(axisWorld.current);
        if (lastRadial.current.lengthSq() > 1e-8) {
          lastRadial.current.normalize();
        } else {
          useScreenArc.current = true;
        }
      } else {
        useScreenArc.current = true;
      }
    }
    if (useScreenArc.current) {
      lastScreenAngle.current = Math.atan2(
        event.nativeEvent.clientY - projectedCenter.current.y,
        event.nativeEvent.clientX - projectedCenter.current.x,
      );
    }

    (event.target as Element).setPointerCapture(event.pointerId);
    setDragging(true);
    onDraggingChange(true);
  };

  const continueDrag = (event: ThreeEvent<PointerEvent>) => {
    if (activePointer.current !== event.pointerId) return;
    event.stopPropagation();
    let delta = 0;
    if (useScreenArc.current) {
      const angle = Math.atan2(
        event.nativeEvent.clientY - projectedCenter.current.y,
        event.nativeEvent.clientX - projectedCenter.current.x,
      );
      const facing = Math.sign(event.ray.direction.dot(axisWorld.current)) || 1;
      delta = -normalizeAngle(angle - lastScreenAngle.current) * facing;
      lastScreenAngle.current = angle;
    } else {
      const hit = event.ray.intersectPlane(
        rotationPlane.current,
        intersection.current,
      );
      if (!hit) return;
      currentRadial.current
        .copy(hit)
        .sub(centerWorld.current)
        .projectOnPlane(axisWorld.current);
      if (currentRadial.current.lengthSq() < 1e-8) return;
      currentRadial.current.normalize();
      delta = Math.atan2(
        axisWorld.current.dot(
          intersection.current.crossVectors(
            lastRadial.current,
            currentRadial.current,
          ),
        ),
        lastRadial.current.dot(currentRadial.current),
      );
      lastRadial.current.copy(currentRadial.current);
    }

    if (Number.isFinite(delta) && Math.abs(delta) > 1e-6) {
      drive(delta);
      onDriveSuccess();
    }
  };

  const endDrag = (event: ThreeEvent<PointerEvent>) => {
    if (activePointer.current !== event.pointerId) return;
    event.stopPropagation();
    activePointer.current = null;
    if ((event.target as Element).hasPointerCapture(event.pointerId)) {
      (event.target as Element).releasePointerCapture(event.pointerId);
    }
    setDragging(false);
    onDraggingChange(false);
  };

  return (
    <group
      onPointerCancel={endDrag}
      onPointerDown={beginDrag}
      onPointerMove={continueDrag}
      onPointerUp={endDrag}
      ref={group}
    >
      {children}
      <DriveGizmo
        active={active}
        axis={axis}
        coachTarget={coachTarget}
        dragging={dragging}
        radius={radius}
        testId={gizmoTestId}
      />
    </group>
  );
}
