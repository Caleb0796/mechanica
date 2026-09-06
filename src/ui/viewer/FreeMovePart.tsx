import { type ThreeEvent, useThree } from "@react-three/fiber";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Box3, type Group, Matrix4, type Mesh, Plane, Vector3 } from "three";

import { freeMoveOffsetFromRay, type FreeMoveOffset } from "./freeMove";

export interface FreeMoveControl {
  partId: string;
  offset: [number, number, number];
  enabled?: boolean;
  pickupPadding?: number;
  onSelect?: () => void;
  onMove: (offset: [number, number, number]) => void;
  onDraggingChange: (dragging: boolean) => void;
}

interface CanvasInteraction {
  cursorOwner?: symbol;
  previousCursor?: string;
  dragOwner?: symbol;
}

// Parts share one cursor and camera. A second finger or overlapping pickup
// volume must never acquire another drag and restore the camera prematurely.
const canvasInteractions = new WeakMap<HTMLCanvasElement, CanvasInteraction>();

function interactionFor(canvas: HTMLCanvasElement): CanvasInteraction {
  let interaction = canvasInteractions.get(canvas);
  if (!interaction) {
    interaction = {};
    canvasInteractions.set(canvas, interaction);
  }
  return interaction;
}

interface PointerCaptureTarget {
  setPointerCapture: (pointerId: number) => void;
  hasPointerCapture: (pointerId: number) => boolean;
  releasePointerCapture: (pointerId: number) => void;
}

interface EnabledControls {
  enabled: boolean;
}

interface ActiveDrag {
  startScreen: [number, number];
  moved: boolean;
  pointerId: number;
  target: PointerCaptureTarget;
  startWorld: Vector3;
  startOffset: FreeMoveOffset;
  plane: Plane;
  parentWorldMatrix: Matrix4;
  controls?: EnabledControls;
  controlsWereEnabled?: boolean;
}

export default function FreeMovePart({
  control,
  children,
}: {
  control: FreeMoveControl;
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  const drag = useRef<ActiveDrag | null>(null);
  const latestControl = useRef(control);
  const owner = useRef(Symbol("free-move-part"));
  const currentOffset = useRef<FreeMoveOffset>([...control.offset]);
  const [pickBox, setPickBox] = useState<{
    center: FreeMoveOffset;
    size: FreeMoveOffset;
  } | null>(null);
  const { camera, controls, gl, invalidate } = useThree();

  useLayoutEffect(() => {
    const root = group.current;
    if (!root) return;
    root.updateWorldMatrix(true, true);
    const inverse = root.matrixWorld.clone().invert();
    const bounds = new Box3();
    root.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh || object.userData.mechanicaAffordance) return;
      mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) {
        bounds.union(
          mesh.geometry.boundingBox
            .clone()
            .applyMatrix4(
              new Matrix4().multiplyMatrices(inverse, mesh.matrixWorld),
            ),
        );
      }
    });
    if (bounds.isEmpty()) return;
    const size = bounds.getSize(new Vector3());
    // This invisible pickup volume bridges small apertures and gives touch
    // users a forgiving target. It is not reconstruction geometry.
    bounds.expandByScalar(
      Math.max(
        0,
        control.pickupPadding ?? Math.max(size.x, size.y, size.z) * 0.035,
      ),
    );
    setPickBox({
      center: bounds.getCenter(new Vector3()).toArray() as FreeMoveOffset,
      size: bounds.getSize(new Vector3()).toArray() as FreeMoveOffset,
    });
  }, [control.pickupPadding]);

  const claimCursor = useCallback(
    (cursor: "grab" | "grabbing") => {
      const interaction = interactionFor(gl.domElement);
      if (interaction.dragOwner && interaction.dragOwner !== owner.current)
        return;
      if (!interaction.cursorOwner)
        interaction.previousCursor = gl.domElement.style.cursor;
      interaction.cursorOwner = owner.current;
      gl.domElement.style.cursor = cursor;
    },
    [gl],
  );

  const restoreCursor = useCallback(() => {
    const interaction = interactionFor(gl.domElement);
    if (interaction.cursorOwner !== owner.current) return;
    gl.domElement.style.cursor = interaction.previousCursor ?? "";
    interaction.cursorOwner = undefined;
    interaction.previousCursor = undefined;
  }, [gl]);

  useLayoutEffect(() => {
    latestControl.current = control;
  }, [control]);

  useLayoutEffect(() => {
    currentOffset.current = [...control.offset];
    group.current?.position.set(...control.offset);
    invalidate();
  }, [control.offset[0], control.offset[1], control.offset[2], invalidate]);

  const finishDrag = useCallback(() => {
    const active = drag.current;
    if (!active) return;
    // Clear first: releasing capture can synchronously dispatch lostpointercapture.
    drag.current = null;
    const interaction = interactionFor(gl.domElement);
    if (interaction.dragOwner === owner.current)
      interaction.dragOwner = undefined;
    if (active.controls && active.controlsWereEnabled !== undefined) {
      active.controls.enabled = active.controlsWereEnabled;
    }
    try {
      if (active.target.hasPointerCapture(active.pointerId)) {
        active.target.releasePointerCapture(active.pointerId);
      }
    } catch {
      // The browser can release capture before a cancellation or unmount arrives.
    }
    latestControl.current.onDraggingChange(false);
    restoreCursor();
    invalidate();
  }, [gl, invalidate, restoreCursor]);

  useLayoutEffect(() => {
    if (control.enabled !== false) return;
    finishDrag();
    restoreCursor();
  }, [control.enabled, finishDrag, restoreCursor]);

  useEffect(() => {
    const finishPointer = (event: PointerEvent) => {
      if (drag.current?.pointerId === event.pointerId) finishDrag();
    };
    window.addEventListener("pointerup", finishPointer);
    window.addEventListener("pointercancel", finishPointer);
    window.addEventListener("blur", finishDrag);
    gl.domElement.addEventListener("lostpointercapture", finishPointer);
    return () => {
      window.removeEventListener("pointerup", finishPointer);
      window.removeEventListener("pointercancel", finishPointer);
      window.removeEventListener("blur", finishDrag);
      gl.domElement.removeEventListener("lostpointercapture", finishPointer);
      finishDrag();
      restoreCursor();
    };
  }, [finishDrag, gl, restoreCursor]);

  const beginDrag = (event: ThreeEvent<PointerEvent>) => {
    if (
      latestControl.current.enabled === false ||
      event.button !== 0 ||
      !group.current
    )
      return;
    if (isOccluded(event)) return;
    event.stopPropagation();
    if (drag.current) return;
    const interaction = interactionFor(gl.domElement);
    if (interaction.dragOwner) return;
    event.nativeEvent.preventDefault();

    group.current.parent?.updateWorldMatrix(true, false);
    const parentWorldMatrix =
      group.current.parent?.matrixWorld.clone() ?? new Matrix4();
    const activeControls = controls as unknown as EnabledControls | undefined;
    const target = event.target as unknown as PointerCaptureTarget;
    drag.current = {
      startScreen: [event.nativeEvent.clientX, event.nativeEvent.clientY],
      moved: false,
      pointerId: event.pointerId,
      target,
      startWorld: event.point.clone(),
      startOffset: [...currentOffset.current],
      plane: new Plane().setFromNormalAndCoplanarPoint(
        camera.getWorldDirection(new Vector3()),
        event.point,
      ),
      parentWorldMatrix,
      controls: activeControls,
      controlsWereEnabled: activeControls?.enabled,
    };
    interaction.dragOwner = owner.current;
    if (activeControls) activeControls.enabled = false;
    claimCursor("grabbing");
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      finishDrag();
      return;
    }
    latestControl.current.onSelect?.();
    latestControl.current.onDraggingChange(true);
    invalidate();
  };

  const isOccluded = (event: ThreeEvent<PointerEvent>) =>
    event.intersections.some((hit) => {
      if (
        hit.distance >= event.distance - 1e-5 ||
        hit.object.userData.mechanicaAffordance
      )
        return false;
      let object: typeof hit.object | null = hit.object;
      while (object) {
        if (
          !object.visible ||
          object === group.current ||
          object.userData.mechanicaAffordance
        )
          return false;
        object = object.parent;
      }
      return true;
    });

  const movePart = (event: ThreeEvent<PointerEvent>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.stopPropagation();
    // Taps, including the slight movement of a finger during a double tap,
    // select a part without lifting it. Only a deliberate drag moves geometry.
    if (!active.moved) {
      if (
        Math.hypot(
          event.nativeEvent.clientX - active.startScreen[0],
          event.nativeEvent.clientY - active.startScreen[1],
        ) <= 8
      )
        return;
      active.moved = true;
    }
    const offset = freeMoveOffsetFromRay(
      event.ray,
      active.plane,
      active.startWorld,
      active.startOffset,
      active.parentWorldMatrix,
    );
    if (!offset) return;
    currentOffset.current = offset;
    group.current?.position.set(...offset);
    latestControl.current.onMove(offset);
    invalidate();
  };

  const endPointer = (event: ThreeEvent<PointerEvent>) => {
    if (latestControl.current.enabled === false && !drag.current) return;
    // Consume the part release so a move never opens the parts panel.
    event.stopPropagation();
    if (drag.current?.pointerId === event.pointerId) finishDrag();
  };

  return (
    <group
      name={`free-move-${control.partId}`}
      onPointerCancel={endPointer}
      onPointerDown={beginDrag}
      onPointerMove={movePart}
      onPointerOver={(event) => {
        if (isOccluded(event)) return;
        if (latestControl.current.enabled === false) return;
        const interaction = interactionFor(gl.domElement);
        if (interaction.dragOwner && interaction.dragOwner !== owner.current)
          return;
        event.stopPropagation();
        claimCursor(drag.current ? "grabbing" : "grab");
      }}
      onPointerOut={() => {
        if (!drag.current) restoreCursor();
      }}
      onPointerUp={endPointer}
      position={control.offset}
      ref={group}
    >
      {children}
      {pickBox && control.enabled !== false && (
        <mesh
          position={pickBox.center}
          userData={{ mechanicaAffordance: true }}
        >
          <boxGeometry args={pickBox.size} />
          <meshBasicMaterial
            transparent
            opacity={0}
            depthWrite={false}
            colorWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
