import type { SceneSpec } from "../../ui/scene/types";

const scene: SceneSpec = {
  ground: { kind: "courtyard-stone", radius: 4.2 },
  backdrop: {
    kind: "gradient-cyclorama",
    colors: ["#071012", "#23362f"],
  },
  lightRig: "courtyard",
  props: [
    {
      kind: "water-channel",
      params: { depth: 0.12, length: 4.4, width: 0.75 },
      position: [0, -0.18, 0],
    },
  ],
  ambientMotion: [{ kind: "water-ripple", params: { radius: 0.6 } }],
};

export default scene;
