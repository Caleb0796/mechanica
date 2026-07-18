import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { Vector3 } from "three";

import type { PartDef } from "../../sim/types";

interface DriveHandleProps {
  children: ReactNode;
  drive: (delta: number) => void;
  onDraggingChange: (dragging: boolean) => void;
  onSelect: () => void;
  part: PartDef;
}

const keyboardStep = Math.PI / 36;

export default function DriveHandle({
  children,
  drive,
  onDraggingChange,
  onSelect,
  part,
}: DriveHandleProps) {
  const { t } = useTranslation();
  const activePointer = useRef<number | null>(null);
  const lastPoint = useRef(new Vector3());
  const tangent = useRef(new Vector3(1, 0, 0));
  const radius = useRef(0.1);

  const beginDrag = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onSelect();
    activePointer.current = event.pointerId;
    lastPoint.current.copy(event.point);

    const center = new Vector3();
    const axis = new Vector3(...(part.joint?.axis ?? [0, 0, 1]));
    event.object.getWorldPosition(center);
    axis
      .applyQuaternion(
        event.object.getWorldQuaternion(event.object.quaternion.clone()),
      )
      .normalize();
    const radial = event.point.clone().sub(center);
    radius.current = Math.max(radial.length(), 0.05);
    tangent.current.crossVectors(axis, radial).normalize();
    if (tangent.current.lengthSq() < 0.001) tangent.current.set(1, 0, 0);

    (event.target as Element).setPointerCapture(event.pointerId);
    onDraggingChange(true);
  };

  const continueDrag = (event: ThreeEvent<PointerEvent>) => {
    if (activePointer.current !== event.pointerId) return;
    event.stopPropagation();
    const movement = event.point.clone().sub(lastPoint.current);
    let delta = movement.dot(tangent.current) / radius.current;
    if (Math.abs(delta) < 0.0001) {
      delta =
        (event.nativeEvent.movementX - event.nativeEvent.movementY) * 0.008;
    }
    if (Number.isFinite(delta) && Math.abs(delta) > 0) drive(delta);
    lastPoint.current.copy(event.point);
  };

  const endDrag = (event: ThreeEvent<PointerEvent>) => {
    if (activePointer.current !== event.pointerId) return;
    event.stopPropagation();
    activePointer.current = null;
    if ((event.target as Element).hasPointerCapture(event.pointerId)) {
      (event.target as Element).releasePointerCapture(event.pointerId);
    }
    onDraggingChange(false);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      drive(-keyboardStep);
    }
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      drive(keyboardStep);
    }
  };

  return (
    <group
      onPointerCancel={endDrag}
      onPointerDown={beginDrag}
      onPointerMove={continueDrag}
      onPointerUp={endDrag}
    >
      {children}
      <Html center position={[0, 0, 0.08]}>
        <div className="drive-buttons">
          <button
            aria-label={t("viewer.driveReverse", { part: part.name.en })}
            onClick={(event) => {
              event.stopPropagation();
              drive(-keyboardStep);
            }}
            onKeyDown={handleKeyDown}
            type="button"
          >
            −
          </button>
          <button
            aria-label={t("viewer.driveForward", { part: part.name.en })}
            onClick={(event) => {
              event.stopPropagation();
              drive(keyboardStep);
            }}
            onKeyDown={handleKeyDown}
            type="button"
          >
            +
          </button>
        </div>
      </Html>
    </group>
  );
}
