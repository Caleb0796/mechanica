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
  schemeByMachine: Record<string, string>;
  selectedPartId: string | null;
  showScene: boolean;
  setAssemblyProgress: (progress: number) => void;
  setExplode: (explode: number) => void;
  setHoveredPartId: (partId: string | null) => void;
  setIdleAutoPaused: (idleAutoPaused: boolean) => void;
  setLanguage: (language: UiLanguage) => void;
  setPaused: (paused: boolean) => void;
  setMachineScheme: (slug: string, schemeId: string) => void;
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
  schemeByMachine: {},
  selectedPartId: null,
  showScene: true,
  setAssemblyProgress: (assemblyProgress) => set({ assemblyProgress }),
  setExplode: (explode) => set({ explode }),
  setHoveredPartId: (hoveredPartId) => set({ hoveredPartId }),
  setIdleAutoPaused: (idleAutoPaused) => set({ idleAutoPaused }),
  setLanguage: (language) => {
    try {
      localStorage.setItem("mechanica-lang", language);
    } catch {}
    set({ language });
  },
  setPaused: (paused) => set({ paused }),
  setMachineScheme: (slug, schemeId) =>
    set((state) => ({
      schemeByMachine: { ...state.schemeByMachine, [slug]: schemeId },
    })),
  setSelectedPartId: (selectedPartId) => set({ selectedPartId }),
  setShowScene: (showScene) => set({ showScene }),
}));
