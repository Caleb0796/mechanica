import type { SceneSpec } from "../../ui/scene/types";

const scene: SceneSpec = {
  ground: { kind: "rammed-earth", radius: 7.2 },
  backdrop: {
    kind: "gradient-cyclorama",
    colors: ["#151717", "#725034"],
  },
  fog: { color: "#80694f", near: 11, far: 24 },
  lightRig: "courtyard",
  props: [
    {
      kind: "road-strip",
      params: { length: 13, rutOffset: 1.15, width: 4.8 },
      position: [0, 0, 0],
    },
    { kind: "milestone", position: [-3.1, 0, -3.8] },
    { kind: "milestone", position: [3.15, 0, 0.4], scale: 0.9 },
    { kind: "milestone", position: [-3.2, 0, 4.2], scale: 0.78 },
    {
      kind: "banner-pole",
      params: { phase: 0.8 },
      position: [3.4, 0, -4.4],
    },
  ],
  ambientMotion: [{ kind: "dust", params: { count: 80, radius: 6.2 } }],
};

export default scene;
