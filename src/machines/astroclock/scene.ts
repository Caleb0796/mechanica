import type { SceneSpec } from "../../ui/scene/types";

const scene: SceneSpec = {
  ground: { kind: "courtyard-stone", radius: 3.4 },
  backdrop: {
    kind: "gradient-cyclorama",
    colors: ["#090b0d", "#2d2015"],
  },
  lightRig: "courtyard",
  props: [
    { kind: "column", position: [-2.5, 1.2, -1.4], scale: 1.15 },
    { kind: "column", position: [2.5, 1.2, -1.4], scale: 1.15 },
  ],
  ambientMotion: [{ kind: "dust", params: { count: 90, radius: 3 } }],
};

export default scene;
