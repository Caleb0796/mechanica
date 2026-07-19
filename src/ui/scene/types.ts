export type SceneGroundKind =
  "courtyard-stone" | "timber-floor" | "rammed-earth" | "water";

export type SceneLightRig = "hall" | "courtyard" | "night";

export type SceneVector3 = [number, number, number];

export interface SceneProp {
  builder?: string;
  kind: "column" | "lantern" | "plinth" | "water-channel" | "custom";
  params?: Record<string, number>;
  position: SceneVector3;
  scale?: number;
}

export interface SceneAmbientMotion {
  emitter?: string;
  kind: "dust" | "water-ripple" | "lantern-flicker" | "custom";
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
