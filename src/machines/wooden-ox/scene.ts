import type { SceneSpec } from "../../ui/scene/types";

const scene: SceneSpec = {
  ground: { kind: "rammed-earth", radius: 3.5 },
  backdrop: {
    kind: "gradient-cyclorama",
    colors: ["#090c0c", "#3f2f21"],
  },
  lightRig: "courtyard",
  props: [
    { kind: "lantern", position: [-2.6, 0.7, -1.6], scale: 0.8 },
    { kind: "lantern", position: [2.6, 0.7, -1.6], scale: 0.8 },
  ],
  ambientMotion: [{ kind: "dust", params: { count: 80, radius: 3.1 } }],
};

export default scene;
