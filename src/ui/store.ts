import { create } from "zustand";

import { initialLanguage } from "./i18n";

export type UiLanguage = "zh" | "en";

interface UiState {
  assemblyProgress: number;
  explode: number;
  language: UiLanguage;
  paused: boolean;
  selectedPartId: string | null;
  showScene: boolean;
  setAssemblyProgress: (progress: number) => void;
  setExplode: (explode: number) => void;
  setLanguage: (language: UiLanguage) => void;
  setPaused: (paused: boolean) => void;
  setSelectedPartId: (partId: string | null) => void;
  setShowScene: (showScene: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  assemblyProgress: 1,
  explode: 0,
  language: initialLanguage,
  paused: false,
  selectedPartId: null,
  showScene: true,
  setAssemblyProgress: (assemblyProgress) => set({ assemblyProgress }),
  setExplode: (explode) => set({ explode }),
  setLanguage: (language) => set({ language }),
  setPaused: (paused) => set({ paused }),
  setSelectedPartId: (selectedPartId) => set({ selectedPartId }),
  setShowScene: (showScene) => set({ showScene }),
}));
