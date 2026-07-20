import type { SceneSpec } from "../../ui/scene/types";

const scene: SceneSpec = {
  ground: { kind: "courtyard-stone", radius: 5.2 },
  backdrop: {
    kind: "gradient-cyclorama",
    colors: ["#141312", "#5a3d24"],
  },
  lightRig: "courtyard",
  props: [
    { kind: "column", position: [-2.5, 1.2, -1.4], scale: 1.15 },
    { kind: "column", position: [2.5, 1.2, -1.4], scale: 1.15 },
    { kind: "column", position: [0, 1.2, -2.6], scale: 1.3 },
  ],
  ambientMotion: [{ kind: "dust", params: { count: 140, radius: 3 } }],
};

export default scene;
