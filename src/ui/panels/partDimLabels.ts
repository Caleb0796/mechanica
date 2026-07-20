type Lang = "zh" | "en";

const DIM_LABELS: Record<string, { zh: string; en: string }> = {
  "box.depth": { zh: "进深", en: "Depth" },
  "box.height": { zh: "高度", en: "Height" },
  "box.width": { zh: "宽度", en: "Width" },
  "custom.params.depth": { zh: "进深", en: "Depth" },
  "custom.params.height": { zh: "高度", en: "Height" },
  "custom.params.shoulderWidth": { zh: "肩宽", en: "Shoulder width" },
  "cylinder.height": { zh: "高度", en: "Height" },
  "cylinder.radius": { zh: "半径", en: "Radius" },
  "gear.module": { zh: "模数", en: "Gear module" },
  "gear.teeth": { zh: "齿数", en: "Tooth count" },
  "gear.thickness": { zh: "轮厚", en: "Gear thickness" },
  "joint.limits.0": { zh: "行程下限", en: "Joint limit (min)" },
  "joint.limits.1": { zh: "行程上限", en: "Joint limit (max)" },
  "lathe.height": { zh: "高度", en: "Height" },
  "lathe.radius": { zh: "半径", en: "Radius" },
  "wheel.radius": { zh: "轮半径", en: "Wheel radius" },
  "wheel.spokes": { zh: "辐条数", en: "Spoke count" },
  "wheel.width": { zh: "轮宽", en: "Wheel width" },
};

function prettify(path: string): string {
  const leaf = path.split(".").pop() ?? path;
  const spaced = leaf
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function humanizeDimLabel(
  geometryType: string,
  path: string,
  language: Lang,
): string {
  const key = path.startsWith("joint.")
    ? path
    : `${geometryType}.${path}`;
  const hit = DIM_LABELS[key];
  if (hit) return hit[language];
  return prettify(path);
}
