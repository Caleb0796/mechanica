import type { SceneSpec } from "../../ui/scene/types";

const scene: SceneSpec = {
  ground: { kind: "timber-floor", radius: 2.6 },
  backdrop: {
    kind: "gradient-cyclorama",
    colors: ["#07090b", "#2c1d18"],
  },
  lightRig: "hall",
  props: [
    { kind: "lantern", position: [-1.8, 0.7, -1.1], scale: 0.75 },
    { kind: "lantern", position: [1.8, 0.7, -1.1], scale: 0.75 },
  ],
  ambientMotion: [{ kind: "lantern-flicker" }],
};

export default scene;
