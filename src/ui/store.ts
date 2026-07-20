import { create } from "zustand";

import { initialLanguage } from "./i18n";
import { demoSpeedFromEnv } from "./viewer/demoTimeline";

export type UiLanguage = "zh" | "en";

interface UiState {
  assemblyProgress: number;
  demoSpeed: number;
  explode: number;
  hoveredPartId: string | null;
  idleAutoPaused: boolean;
  language: UiLanguage;
  paused: boolean;
  selectedPartId: string | null;
  showScene: boolean;
  setAssemblyProgress: (progress: number) => void;
  setExplode: (explode: number) => void;
  setHoveredPartId: (partId: string | null) => void;
  setIdleAutoPaused: (idleAutoPaused: boolean) => void;
  setLanguage: (language: UiLanguage) => void;
  setPaused: (paused: boolean) => void;
  setSelectedPartId: (partId: string | null) => void;
  setShowScene: (showScene: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  assemblyProgress: 1,
  demoSpeed: demoSpeedFromEnv(),
  explode: 0,
  hoveredPartId: null,
  idleAutoPaused: false,
  language: initialLanguage,
  paused: false,
  selectedPartId: null,
  showScene: true,
  setAssemblyProgress: (assemblyProgress) => set({ assemblyProgress }),
  setExplode: (explode) => set({ explode }),
  setHoveredPartId: (hoveredPartId) => set({ hoveredPartId }),
  setIdleAutoPaused: (idleAutoPaused) => set({ idleAutoPaused }),
  setLanguage: (language) => set({ language }),
  setPaused: (paused) => set({ paused }),
  setSelectedPartId: (selectedPartId) => set({ selectedPartId }),
  setShowScene: (showScene) => set({ showScene }),
}));
