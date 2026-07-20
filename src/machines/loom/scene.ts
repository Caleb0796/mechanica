import type { SceneSpec } from "../../ui/scene/types";

const scene: SceneSpec = {
  ground: { kind: "timber-floor", radius: 3.4, y: -0.3 },
  backdrop: {
    kind: "gradient-cyclorama",
    colors: ["#0c0d0d", "#4a2d1e"],
  },
  lightRig: "hall",
  props: [
    { kind: "workbench", position: [-1.5, 0, -0.5], scale: 0.5 },
    { kind: "silk-swatch", position: [-0.8, 0.7, -2.2], scale: 0.4 },
  ],
  ambientMotion: [{ kind: "dust", params: { count: 85, radius: 3 } }],
};

export default scene;
