export type SceneGroundKind =
  "courtyard-stone" | "timber-floor" | "rammed-earth" | "water";

export const QUAKE_PAYOFF_EVENT = "mechanica:quake-payoff";

export type SceneLightRig = "hall" | "courtyard" | "night" | "dusk-west";

export type SceneVector3 = [number, number, number];

export interface SceneProp {
  builder?: string;
  kind:
    | "balustrade-arc"
    | "banner-pole"
    | "brazier"
    | "column"
    | "custom"
    | "lantern"
    | "milestone"
    | "plinth"
    | "road-strip"
    | "silk-swatch"
    | "water-channel"
    | "workbench";
  params?: Record<string, number>;
  position: SceneVector3;
  scale?: number;
}

export interface SceneAmbientMotion {
  emitter?: string;
  kind:
    "custom" | "dust" | "lantern-flicker" | "quake-shockwave" | "water-ripple";
  params?: Record<string, number>;
}

export interface SceneSpec {
  ambientMotion?: SceneAmbientMotion[];
  backdrop?: {
    colors: [string, string];
    kind: "gradient-cyclorama";
  };
  fog?: {
    color: string;
    far: number;
    near: number;
  };
  ground?: {
    kind: SceneGroundKind;
    radius: number;
    y?: number;
  };
  lightRig?: SceneLightRig;
  props?: SceneProp[];
}
