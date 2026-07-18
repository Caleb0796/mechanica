export { default as ComparisonTable } from "./ComparisonTable";
export { default as CompareView } from "./CompareView";
export type { CompareSceneContext } from "./CompareView";
export { CompareGeometryCache, compareGeometryCache } from "./geometryCache";
export {
  createSchemeTransition,
  differencePartIds,
  driveComparedGraphs,
  driveComparedMachineGraphs,
  driveNodeForSpec,
  schemeGhostPresentation,
  specForScheme,
  tintForDifference,
} from "./model";
export type {
  CompareSide,
  SchemeGhostPresentation,
  SchemeTransitionMetadata,
} from "./model";
export { useCompareStore } from "./store";
