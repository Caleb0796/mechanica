import type { SceneSpec } from "../../ui/scene/types";

const scene: SceneSpec = {
  ground: { kind: "timber-floor", radius: 3.4, y: -0.3 },
  backdrop: {
    kind: "gradient-cyclorama",
    colors: ["#080b0c", "#2c2018"],
  },
  lightRig: "hall",
  props: [
    { kind: "column", position: [-2.65, 1.15, -1.5] },
    { kind: "column", position: [2.65, 1.15, -1.5] },
  ],
  ambientMotion: [{ kind: "dust", params: { count: 85, radius: 3 } }],
};

export default scene;
