import type { SceneSpec } from "../../ui/scene/types";

const scene: SceneSpec = {
  ground: { kind: "courtyard-stone", radius: 2.8 },
  backdrop: {
    kind: "gradient-cyclorama",
    colors: ["#080b0c", "#302116"],
  },
  lightRig: "hall",
  props: [
    {
      kind: "plinth",
      params: { depth: 1.9, height: 0.12, width: 1.9 },
      position: [0, -0.06, 0],
    },
  ],
};

export default scene;
