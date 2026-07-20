import type { SceneSpec } from "../../ui/scene/types";

const scene: SceneSpec = {
  ground: { kind: "rammed-earth", radius: 3.6 },
  backdrop: {
    kind: "gradient-cyclorama",
    colors: ["#0a0d0d", "#3c2c1e"],
  },
  lightRig: "courtyard",
  props: [],
  ambientMotion: [{ kind: "dust", params: { count: 70, radius: 3.2 } }],
};

export default scene;
