import type { ExhibitData } from "../sim/types";

export const RECONSTRUCTION_RENDER_LICENSE = {
  attributionText: "Mechanica contributors, MIT License",
  author: "Mechanica contributors",
  license: "MIT" as const,
  licenseUrl: "https://opensource.org/license/mit",
};

export const RECONSTRUCTION_RENDER_VIEWS = [
  {
    file: "overall.jpg",
    label: { en: "Overall reconstruction", zh: "整体复原" },
  },
  {
    file: "cutaway.jpg",
    label: { en: "Open-side cutaway", zh: "开敞侧视" },
  },
  {
    file: "mechanism-close-up.jpg",
    label: { en: "Mechanism close-up", zh: "机构特写" },
  },
  {
    file: "exploded.jpg",
    label: { en: "Exploded assembly", zh: "爆炸装配" },
  },
] as const;

export function reconstructionRenderAssets(slug: ExhibitData["slug"]) {
  if (slug === "demo") return [];
  return RECONSTRUCTION_RENDER_VIEWS.map((view) => ({
    ...RECONSTRUCTION_RENDER_LICENSE,
    ...view,
    file: `public/assets/renders/${slug}/${view.file}`,
  }));
}
