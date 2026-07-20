import type { SceneSpec } from "../../ui/scene/types";

const scene: SceneSpec = {
  ground: { kind: "timber-floor", radius: 3.4, y: -0.3 },
  backdrop: {
    kind: "gradient-cyclorama",
    colors: ["#080b0c", "#2c2018"],
  },
  lightRig: "hall",
  ambientMotion: [{ kind: "dust", params: { count: 85, radius: 3 } }],
};

export default scene;
