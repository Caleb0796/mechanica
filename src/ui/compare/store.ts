import { create } from "zustand";

import type { CompareSide } from "./model";

export interface CompareCameraSnapshot {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  target: [number, number, number];
  zoom: number;
  revision: number;
}

interface CompareState {
  cameraOwner: CompareSide;
  camera: CompareCameraSnapshot;
  hoveredPartId?: string;
  idleAutoRotationPaused: true;
  setCameraOwner: (side: CompareSide) => void;
  setCameraTarget: (target: [number, number, number]) => void;
  publishCamera: (
    position: [number, number, number],
    quaternion: [number, number, number, number],
    zoom: number,
  ) => void;
  setHoveredPartId: (partId?: string) => void;
}

function differs(a: readonly number[], b: readonly number[]): boolean {
  return a.some((value, index) => Math.abs(value - b[index]) > 1e-7);
}

export const useCompareStore = create<CompareState>((set, get) => ({
  cameraOwner: "left",
  camera: {
    position: [0, 0, 5],
    quaternion: [0, 0, 0, 1],
    target: [0, 0, 0],
    zoom: 1,
    revision: 0,
  },
  idleAutoRotationPaused: true,
  setCameraOwner: (cameraOwner) => set({ cameraOwner }),
  setCameraTarget: (target) => {
    const previous = get().camera;
    if (!differs(previous.target, target)) return;
    set({
      camera: {
        ...previous,
        target,
        revision: previous.revision + 1,
      },
    });
  },
  publishCamera: (position, quaternion, zoom) => {
    const previous = get().camera;
    if (
      !differs(previous.position, position) &&
      !differs(previous.quaternion, quaternion) &&
      Math.abs(previous.zoom - zoom) <= 1e-7
    ) {
      return;
    }
    set({
      camera: {
        position,
        quaternion,
        target: previous.target,
        zoom,
        revision: previous.revision + 1,
      },
    });
  },
  setHoveredPartId: (hoveredPartId) => set({ hoveredPartId }),
}));
