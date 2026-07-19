import type { SceneSpec } from "../../ui/scene/types";

const scene: SceneSpec = {
  ground: { kind: "courtyard-stone", radius: 3.8 },
  backdrop: {
    kind: "gradient-cyclorama",
    colors: ["#0b0b0c", "#39251b"],
  },
  lightRig: "night",
  props: [
    { kind: "lantern", position: [-2.7, 0.75, -1.6] },
    { kind: "lantern", position: [2.7, 0.75, -1.6] },
  ],
  ambientMotion: [
    { kind: "dust", params: { count: 55, radius: 3.2 } },
    { kind: "lantern-flicker" },
  ],
};

export default scene;
