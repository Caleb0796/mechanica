import type { SceneSpec } from "../../ui/scene/types";

const scene: SceneSpec = {
  ground: { kind: "timber-floor", radius: 3 },
  backdrop: {
    kind: "gradient-cyclorama",
    colors: ["#070a0b", "#2d2119"],
  },
  lightRig: "hall",
  props: [
    {
      kind: "plinth",
      params: { depth: 1.7, height: 0.1, width: 2.5 },
      position: [0, -0.05, 0],
    },
    { kind: "lantern", position: [-2.2, 0.7, -1.2], scale: 0.75 },
  ],
  ambientMotion: [{ kind: "lantern-flicker" }],
};

export default scene;
