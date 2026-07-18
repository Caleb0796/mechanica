import type { ReactNode } from "react";

import type { MachineModule } from "../../sim/types";

export interface StoryStep {
  id: string;
  title: { zh: string; en: string };
  body: { zh: string; en: string };
  camera: {
    position: [number, number, number];
    target: [number, number, number];
  };
  cutaway?: { opacity: number; partIds: string[] };
  explode?: number;
  driveTo?: { node: string; seconds: number; value: number };
  highlight?: string[];
  schemeId?: string;
  sourceId?: string;
  spotlight?: true;
}

export interface StoryStageState {
  activeIndex: number;
  activeStep: StoryStep;
  camera: StoryStep["camera"];
  driveTo?: StoryStep["driveTo"];
  explode: number;
  fromStep: StoryStep;
  highlight: string[];
  progress: number;
  schemeId?: string;
  segmentProgress: number;
  spotlight: boolean;
  toStep: StoryStep;
}

export interface ScrollStoryProps {
  module: MachineModule;
  steps: readonly StoryStep[];
  renderStage: (state: StoryStageState) => ReactNode;
  onSourceOpen?: (sourceId: string) => void;
  onSpotlight?: (triggerId: "spotlight", step: StoryStep) => void;
}
