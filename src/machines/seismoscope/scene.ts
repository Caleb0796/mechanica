import type { SceneSpec } from "../../ui/scene/types";

const scene: SceneSpec = {
  ground: { kind: "courtyard-stone", radius: 4.8 },
  backdrop: {
    kind: "gradient-cyclorama",
    colors: ["#090d16", "#422719"],
  },
  fog: { color: "#12131a", near: 8, far: 19 },
  lightRig: "dusk-west",
  props: [
    {
      kind: "plinth",
      params: { depth: 1.9, height: 0.12, width: 1.9 },
      position: [0, -0.06, 0],
    },
    {
      kind: "balustrade-arc",
      params: { arc: Math.PI * 2, posts: 13, radius: 4.1 },
      position: [0, 0, 0],
    },
    {
      kind: "brazier",
      params: { phase: 0 },
      position: [-2.45, 0, 1.6],
    },
    {
      kind: "brazier",
      params: { phase: 2.4 },
      position: [2.45, 0, 1.6],
    },
  ],
  ambientMotion: [
    { kind: "dust", params: { count: 45, radius: 4.2 } },
    { kind: "quake-shockwave" },
  ],
};

export default scene;
