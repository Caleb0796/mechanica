import { create } from "zustand";

import { initialLanguage } from "./i18n";

export type UiLanguage = "zh" | "en";

interface UiState {
  assemblyProgress: number;
  explode: number;
  language: UiLanguage;
  paused: boolean;
  selectedPartId: string | null;
  setAssemblyProgress: (progress: number) => void;
  setExplode: (explode: number) => void;
  setLanguage: (language: UiLanguage) => void;
  setPaused: (paused: boolean) => void;
  setSelectedPartId: (partId: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  assemblyProgress: 1,
  explode: 0,
  language: initialLanguage,
  paused: false,
  selectedPartId: null,
  setAssemblyProgress: (assemblyProgress) => set({ assemblyProgress }),
  setExplode: (explode) => set({ explode }),
  setLanguage: (language) => set({ language }),
  setPaused: (paused) => set({ paused }),
  setSelectedPartId: (selectedPartId) => set({ selectedPartId }),
}));
