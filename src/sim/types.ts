// src/sim/types.ts — project-wide data contracts (FROZEN file)
export type ProvenanceKind = 'wenxian' | 'wenwu' | 'tuice';
export interface Provenance {
  kind: ProvenanceKind;
  /** points to a data-JSON sources[].id, or a short quotation */
  ref: string;
  note?: string;
}
export interface Quantity {
  value: number;
  unit: 'm' | 'rad' | 'ratio' | 'count';
  ancient?: string;
  provenance: Provenance;
}

export type GeometryDef =
  | {
      type: 'gear';
      module: number;
      teeth: number;
      thickness: number;
      toothStyle: 'involute' | 'trapezoid' | 'pin';
      pressureAngleDeg?: number;
      innerRadius?: number;
    }
  | { type: 'shaft'; radius: number; length: number }
  | { type: 'beam'; size: [number, number, number] }
  | { type: 'wheel'; radius: number; width: number; spokes?: number }
  | { type: 'scoop'; size: [number, number, number] }
  | { type: 'shell'; radius: number; cutaway?: boolean }
  | { type: 'ring'; radius: number; tube: number }
  | { type: 'link'; length: number; width: number }
  | { type: 'box'; size: [number, number, number] }
  | { type: 'custom'; builder: string; params: Record<string, number> };

export interface PartDef {
  id: string;
  name: { zh: string; en: string };
  geometry: GeometryDef;
  material: 'wood' | 'bronze' | 'iron' | 'silver' | 'silk' | 'clay';
  position: [number, number, number];
  rotationEuler?: [number, number, number];
  parent?: string;
  joint?: {
    kind: 'revolute' | 'prismatic' | 'fixed';
    axis: [number, number, number];
    limits?: [number, number];
  };
  provenance: Provenance;
  dimensionProvenance: Record<string, Provenance>;
  dimensionNotes?: Quantity[];
  explodeVector?: [number, number, number];
  assemblyStep?: number;
  schemeTags?: string[];
  interactive?: boolean;
}

export type ConstraintDef =
  | { type: 'mesh'; a: string; b: string; internal?: boolean }
  | { type: 'belt'; a: string; b: string; crossed?: boolean }
  | {
      type: 'crank';
      wheel: string;
      rod: string;
      slider: string;
      crankRadius: number;
      rodLength: number;
      axis: [number, number, number];
      provenance: Provenance;
    }
  | {
      type: 'cam';
      cam: string;
      follower: string;
      profile: 'lift' | 'heddle';
      liftHeight: number;
      dwellRatio?: number;
      provenance: Provenance;
    }
  | {
      type: 'differential';
      carrier: string;
      sunA: string;
      sunB: string;
      ratio: number;
      provenance: Provenance;
    }
  | { type: 'gimbal'; outer: string; middle: string; inner: string }
  | {
      type: 'lockstep';
      a: string;
      b: string;
      ratio: number;
      provenance?: Provenance;
    };

export interface EscapementDef {
  wheel: string;
  scoops: number;
  fillSecondsPerScoop: number;
  stepRad: number;
  leverParts: {
    tianguan: string;
    gecha: string;
    guanshe: string;
    tiansuoL: string;
    tiansuoR: string;
  };
}

export interface SchemePatch {
  id: string;
  scholar: { zh: string; en: string };
  year: number;
  summary: { zh: string; en: string };
  addParts?: PartDef[];
  removePartIds?: string[];
  overrideParts?: Array<Partial<PartDef> & { id: string }>;
  addConstraints?: ConstraintDef[];
  removeConstraintIndexes?: number[];
  notes?: { zh: string; en: string };
}

export interface MachineSpec {
  slug: string;
  parts: PartDef[];
  constraints: ConstraintDef[];
  escapement?: EscapementDef;
  driveNodes: string[];
  primaryDrive: string;
  cycleRad: number;
  expectedRatios?: Array<{
    from: string;
    to: string;
    ratio: number;
    sourceRef: string;
  }>;
  collisionWhitelist?: Array<[string, string]>;
}

export interface SolveResult {
  angles: Record<string, number>;
  events: Array<{ t: number; type: string; part: string }>;
}

export const MACHINE_SLUGS = [
  'astroclock',
  'seismoscope',
  'chariot',
  'odometer',
  'wooden-ox',
  'loom',
  'typecase',
  'chainpump',
  'bellows',
  'gimbal',
] as const;
export type MachineSlug = (typeof MACHINE_SLUGS)[number];

export interface IKinematicGraph {
  drive(nodeId: string, deltaRad: number): SolveResult;
  setInput(nodeId: string, absoluteRad: number): SolveResult;
  setAttitude(nodeId: string, quat: [number, number, number, number]): SolveResult;
  ratioBetween(from: string, to: string): number | null;
  setScheme(patch?: SchemePatch): void;
  state(): Record<string, number>;
}

export interface MechanismScript {
  triggers: Array<{
    id: string;
    label: { zh: string; en: string };
    run: (
      graph: IKinematicGraph,
      emit: (type: string, part: string) => void,
      param?: number,
    ) => void;
  }>;
}

export interface MachineData {
  slug: MachineSlug;
  names: { zh: string; en: string };
  era: { zh: string; en: string };
  inventors: Array<{ zh: string; en: string }>;
  oneLiner: { zh: string; en: string };
  principle: { zh: string; en: string };
  sources: Array<{
    id: string;
    book: string;
    chapter?: string;
    quote: string;
    translation?: { zh: string; en: string };
    url: string;
  }>;
  dimensions: Array<{
    label: { zh: string; en: string };
    ancient: string;
    meters: number | [number, number];
    basis: string;
    sourceId: string;
    confidence: ProvenanceKind;
  }>;
  schemes: Array<{
    id: string;
    scholar: { zh: string; en: string };
    year: number;
    summary: { zh: string; en: string };
    evidence: { zh: string; en: string };
    critique?: { zh: string; en: string };
  }>;
  controversies: Array<{
    topic: { zh: string; en: string };
    detail: { zh: string; en: string };
    sourceIds: string[];
  }>;
  museums: Array<{
    name: { zh: string; en: string };
    city: { zh: string; en: string };
    exhibit: { zh: string; en: string };
    url?: string;
    isOriginalArtifact: boolean;
  }>;
  images: Array<{
    file?: string;
    hotlink?: string;
    title: string;
    angle: string;
    author?: string;
    license: 'CC0' | 'PD' | 'CC-BY' | 'CC-BY-SA' | 'linkout';
    licenseUrl?: string;
    attributionText?: string;
    sourceUrl: string;
  }>;
  ingenuity: {
    hook: { zh: string; en: string };
    demo: { zh: string; en: string };
    echo: { zh: string; en: string };
  };
}

export interface MachineModule {
  spec: MachineSpec;
  data: MachineData;
  mechanism?: MechanismScript;
  schemes?: Record<string, SchemePatch>;
  defaultSchemeId?: string;
  customBuilders?: Record<string, (params: Record<string, number>) => unknown>;
}
