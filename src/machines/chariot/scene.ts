import type { SceneSpec } from "../../ui/scene/types";

const scene: SceneSpec = {
  ground: { kind: "rammed-earth", radius: 4 },
  backdrop: {
    kind: "gradient-cyclorama",
    colors: ["#0b0d0d", "#463322"],
  },
  lightRig: "courtyard",
  props: [
    { kind: "lantern", position: [-3, 0.75, -1.7], scale: 0.9 },
    { kind: "lantern", position: [3, 0.75, -1.7], scale: 0.9 },
  ],
  ambientMotion: [{ kind: "dust", params: { count: 70, radius: 3.6 } }],
};

export default scene;
