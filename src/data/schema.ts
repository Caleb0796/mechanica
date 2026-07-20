export type { MachineData } from '../sim/types';
import { MACHINE_SLUGS, type MachineData, type MachineModule, type MachineSlug, type PrincipleAid } from '../sim/types';

export const SOURCE_MINIMUMS: Readonly<Record<MachineSlug, number>> = {
  astroclock: 6,
  seismoscope: 1,
  odometer: 2,
  loom: 3,
};

export const IMAGE_MINIMUMS: Readonly<Record<MachineSlug, number>> = {
  astroclock: 5,
  seismoscope: 5,
  odometer: 0,
  loom: 1,
};

type UnknownRecord = Record<string, unknown>;

function fail(path: string, expectation: string): never {
  throw new Error(`${path}: ${expectation}`);
}

function object(value: unknown, path: string): UnknownRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(path, 'expected an object');
  }
  return value as UnknownRecord;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, 'expected an array');
  return value;
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(path, 'expected a non-empty string');
  }
  return value;
}

function optionalString(value: unknown, path: string): void {
  if (value !== undefined) string(value, path);
}

function number(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(path, 'expected a finite number');
  }
  return value;
}

function positiveNumber(value: unknown, path: string): number {
  const resolved = number(value, path);
  if (resolved <= 0) fail(path, 'expected a positive number');
  return resolved;
}

function boolean(value: unknown, path: string): void {
  if (typeof value !== 'boolean') fail(path, 'expected a boolean');
}

function bilingual(value: unknown, path: string): void {
  const item = object(value, path);
  exactKeys(item, ['zh', 'en'], path);
  string(item.zh, `${path}.zh`);
  string(item.en, `${path}.en`);
}

function exactKeys(value: UnknownRecord, allowed: readonly string[], path: string): void {
  const allowedKeys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) fail(`${path}.${key}`, 'unknown field');
  }
}

function aidBilingual(value: unknown, path: string): void {
  const item = object(value, path);
  exactKeys(item, ['zh', 'en'], path);
  string(item.zh, `${path}.zh`);
  string(item.en, `${path}.en`);
}

function nonEmptyStringArray(value: unknown, path: string): string[] {
  const items = array(value, path);
  if (items.length === 0) fail(path, 'expected at least one item');
  return items.map((item, index) => string(item, `${path}[${index}]`));
}

function objectArray(value: unknown, path: string): UnknownRecord[] {
  return array(value, path).map((item, index) => object(item, `${path}[${index}]`));
}

export function assertPrincipleAids(value: unknown, path = '$.aids'): asserts value is PrincipleAid[] {
  const aids = array(value, path);
  aids.forEach((value, index) => {
    const aidPath = `${path}[${index}]`;
    const aid = object(value, aidPath);
    const kind = string(aid.kind, `${aidPath}.kind`);
    if (kind === 'powerPath') {
      exactKeys(aid, ['kind', 'sequence', 'dwellMs'], aidPath);
      nonEmptyStringArray(aid.sequence, `${aidPath}.sequence`);
      if (aid.dwellMs !== undefined) positiveNumber(aid.dwellMs, `${aidPath}.dwellMs`);
      return;
    }
    if (kind === 'callouts') {
      exactKeys(aid, ['kind', 'anchors'], aidPath);
      const anchors = objectArray(aid.anchors, `${aidPath}.anchors`);
      if (anchors.length === 0) fail(`${aidPath}.anchors`, 'expected at least one anchor');
      anchors.forEach((anchor, anchorIndex) => {
        const anchorPath = `${aidPath}.anchors[${anchorIndex}]`;
        exactKeys(anchor, ['partId', 'label'], anchorPath);
        string(anchor.partId, `${anchorPath}.partId`);
        aidBilingual(anchor.label, `${anchorPath}.label`);
      });
      return;
    }
    if (kind === 'flowParticles') {
      exactKeys(aid, ['kind', 'flavor', 'emitter', 'pathPartIds', 'rate'], aidPath);
      const flavor = string(aid.flavor, `${aidPath}.flavor`);
      if (!['water', 'grain', 'thread', 'smoke', 'sparks', 'custom'].includes(flavor)) {
        fail(`${aidPath}.flavor`, 'expected water, grain, thread, smoke, sparks, or custom');
      }
      optionalString(aid.emitter, `${aidPath}.emitter`);
      if (flavor === 'custom' && aid.emitter === undefined) {
        fail(`${aidPath}.emitter`, 'expected a custom scene builder id');
      }
      if (flavor !== 'custom' && aid.emitter !== undefined) {
        fail(`${aidPath}.emitter`, 'only custom flow particles may declare an emitter');
      }
      nonEmptyStringArray(aid.pathPartIds, `${aidPath}.pathPartIds`);
      if (aid.rate !== undefined) positiveNumber(aid.rate, `${aidPath}.rate`);
      return;
    }
    if (kind === 'cutaway') {
      exactKeys(aid, ['kind', 'partIds', 'label'], aidPath);
      nonEmptyStringArray(aid.partIds, `${aidPath}.partIds`);
      aidBilingual(aid.label, `${aidPath}.label`);
      return;
    }
    if (kind === 'subDemo') {
      exactKeys(aid, ['kind', 'triggerId', 'caption'], aidPath);
      string(aid.triggerId, `${aidPath}.triggerId`);
      aidBilingual(aid.caption, `${aidPath}.caption`);
      return;
    }
    fail(`${aidPath}.kind`, 'expected powerPath, callouts, flowParticles, cutaway, or subDemo');
  });
}

export function assertMachineModuleAids(module: MachineModule): void {
  const root = object(module, '$');
  exactKeys(root, ['spec', 'data', 'aids', 'mechanism', 'schemes', 'defaultSchemeId', 'customBuilders', 'customSceneBuilders', 'scene'], '$');
  if (module.aids === undefined) return;
  assertPrincipleAids(module.aids);
  const partIds = new Set([
    ...module.spec.parts.map((part) => part.id),
    ...Object.values(module.schemes ?? {}).flatMap((scheme) =>
      (scheme.addParts ?? []).map((part) => part.id),
    ),
  ]);
  const triggerIds = new Set(module.mechanism?.triggers.map((trigger) => trigger.id) ?? []);
  const emitterIds = new Set(Object.keys(module.customSceneBuilders ?? {}));
  const requirePart = (partId: string, path: string): void => {
    if (!partIds.has(partId)) fail(path, `unknown part id ${partId}`);
  };

  module.aids.forEach((aid, index) => {
    const path = `$.aids[${index}]`;
    if (aid.kind === 'powerPath') {
      aid.sequence.forEach((partId, partIndex) => requirePart(partId, `${path}.sequence[${partIndex}]`));
    } else if (aid.kind === 'callouts') {
      aid.anchors.forEach((anchor, anchorIndex) => requirePart(anchor.partId, `${path}.anchors[${anchorIndex}].partId`));
    } else if (aid.kind === 'flowParticles') {
      aid.pathPartIds.forEach((partId, partIndex) => requirePart(partId, `${path}.pathPartIds[${partIndex}]`));
      if (aid.flavor === 'custom' && !emitterIds.has(aid.emitter!)) {
        fail(`${path}.emitter`, `unknown custom scene builder ${aid.emitter}`);
      }
    } else if (aid.kind === 'cutaway') {
      aid.partIds.forEach((partId, partIndex) => requirePart(partId, `${path}.partIds[${partIndex}]`));
    } else if (!triggerIds.has(aid.triggerId)) {
      fail(`${path}.triggerId`, `unknown mechanism trigger ${aid.triggerId}`);
    }
  });
}

export function assertMachineData(json: unknown): asserts json is MachineData {
  const root = object(json, '$');
  exactKeys(
    root,
    ['slug', 'names', 'era', 'inventors', 'oneLiner', 'principle', 'sources', 'dimensions', 'schemes', 'controversies', 'museums', 'images', 'ingenuity'],
    '$',
  );
  const slug = string(root.slug, '$.slug');
  if (!(MACHINE_SLUGS as readonly string[]).includes(slug)) {
    fail('$.slug', `expected one of ${MACHINE_SLUGS.join(', ')}`);
  }
  const machineSlug = slug as MachineSlug;

  bilingual(root.names, '$.names');
  bilingual(root.era, '$.era');
  const inventors = objectArray(root.inventors, '$.inventors');
  if (inventors.length === 0) fail('$.inventors', 'expected at least one inventor');
  inventors.forEach((item, index) => bilingual(item, `$.inventors[${index}]`));
  bilingual(root.oneLiner, '$.oneLiner');
  bilingual(root.principle, '$.principle');

  const sources = objectArray(root.sources, '$.sources');
  const minimumSources = SOURCE_MINIMUMS[machineSlug];
  if (sources.length < minimumSources) {
    fail('$.sources', `expected at least ${minimumSources} source(s) for ${slug}`);
  }
  const sourceIds = new Set<string>();
  sources.forEach((source, index) => {
    const path = `$.sources[${index}]`;
    exactKeys(source, ['id', 'book', 'chapter', 'quote', 'translation', 'url'], path);
    const id = string(source.id, `${path}.id`);
    if (sourceIds.has(id)) fail(`${path}.id`, `duplicate source id ${id}`);
    sourceIds.add(id);
    string(source.book, `${path}.book`);
    optionalString(source.chapter, `${path}.chapter`);
    string(source.quote, `${path}.quote`);
    bilingual(source.translation, `${path}.translation`);
    string(source.url, `${path}.url`);
  });

  const dimensions = objectArray(root.dimensions, '$.dimensions');
  if (dimensions.length < 3) fail('$.dimensions', 'expected at least three dimensions');
  dimensions.forEach((dimension, index) => {
    const path = `$.dimensions[${index}]`;
    exactKeys(dimension, ['label', 'ancient', 'meters', 'basis', 'sourceId', 'confidence'], path);
    bilingual(dimension.label, `${path}.label`);
    string(dimension.ancient, `${path}.ancient`);
    if (Array.isArray(dimension.meters)) {
      if (dimension.meters.length !== 2) fail(`${path}.meters`, 'expected a two-number range');
      dimension.meters.forEach((value, meterIndex) => number(value, `${path}.meters[${meterIndex}]`));
    } else {
      number(dimension.meters, `${path}.meters`);
    }
    string(dimension.basis, `${path}.basis`);
    const sourceId = string(dimension.sourceId, `${path}.sourceId`);
    if (!sourceIds.has(sourceId)) fail(`${path}.sourceId`, `unknown source id ${sourceId}`);
    if (dimension.confidence !== 'wenxian' && dimension.confidence !== 'wenwu' && dimension.confidence !== 'tuice') {
      fail(`${path}.confidence`, 'expected wenxian, wenwu, or tuice');
    }
  });

  objectArray(root.schemes, '$.schemes').forEach((scheme, index) => {
    const path = `$.schemes[${index}]`;
    exactKeys(scheme, ['id', 'scholar', 'year', 'summary', 'evidence', 'critique'], path);
    string(scheme.id, `${path}.id`);
    bilingual(scheme.scholar, `${path}.scholar`);
    number(scheme.year, `${path}.year`);
    bilingual(scheme.summary, `${path}.summary`);
    bilingual(scheme.evidence, `${path}.evidence`);
    if (scheme.critique !== undefined) bilingual(scheme.critique, `${path}.critique`);
  });

  objectArray(root.controversies, '$.controversies').forEach((controversy, index) => {
    const path = `$.controversies[${index}]`;
    exactKeys(controversy, ['topic', 'detail', 'sourceIds'], path);
    bilingual(controversy.topic, `${path}.topic`);
    bilingual(controversy.detail, `${path}.detail`);
    array(controversy.sourceIds, `${path}.sourceIds`).forEach((sourceId, sourceIndex) => {
      const resolved = string(sourceId, `${path}.sourceIds[${sourceIndex}]`);
      if (!sourceIds.has(resolved)) {
        fail(`${path}.sourceIds[${sourceIndex}]`, `unknown source id ${resolved}`);
      }
    });
  });

  const museums = objectArray(root.museums, '$.museums');
  if (museums.length < 2) fail('$.museums', 'expected at least two museum records');
  museums.forEach((museum, index) => {
    const path = `$.museums[${index}]`;
    exactKeys(museum, ['name', 'city', 'exhibit', 'url', 'isOriginalArtifact'], path);
    bilingual(museum.name, `${path}.name`);
    bilingual(museum.city, `${path}.city`);
    bilingual(museum.exhibit, `${path}.exhibit`);
    optionalString(museum.url, `${path}.url`);
    boolean(museum.isOriginalArtifact, `${path}.isOriginalArtifact`);
  });

  const images = objectArray(root.images, '$.images');
  const downloadableImages = images.filter((image) => image.license !== 'linkout');
  if (downloadableImages.length < IMAGE_MINIMUMS[machineSlug]) {
    fail('$.images', `expected at least ${IMAGE_MINIMUMS[machineSlug]} downloadable image(s) for ${slug}`);
  }
  images.forEach((image, index) => {
    const path = `$.images[${index}]`;
    exactKeys(image, ['file', 'hotlink', 'title', 'angle', 'author', 'license', 'licenseUrl', 'attributionText', 'sourceUrl'], path);
    optionalString(image.file, `${path}.file`);
    optionalString(image.hotlink, `${path}.hotlink`);
    string(image.title, `${path}.title`);
    string(image.angle, `${path}.angle`);
    optionalString(image.author, `${path}.author`);
    if (!['CC0', 'PD', 'CC-BY', 'CC-BY-SA', 'linkout'].includes(String(image.license))) {
      fail(`${path}.license`, 'expected CC0, PD, CC-BY, CC-BY-SA, or linkout');
    }
    optionalString(image.licenseUrl, `${path}.licenseUrl`);
    optionalString(image.attributionText, `${path}.attributionText`);
    string(image.sourceUrl, `${path}.sourceUrl`);
    if (image.license === 'linkout' && image.file !== undefined) {
      fail(`${path}.file`, 'linkout entries must not carry a local file');
    }
    if ((image.license === 'CC-BY' || image.license === 'CC-BY-SA') && image.file !== undefined) {
      string(image.author, `${path}.author`);
      string(image.licenseUrl, `${path}.licenseUrl`);
      string(image.attributionText, `${path}.attributionText`);
    }
  });

  const ingenuity = object(root.ingenuity, '$.ingenuity');
  exactKeys(ingenuity, ['hook', 'demo', 'echo'], '$.ingenuity');
  bilingual(ingenuity.hook, '$.ingenuity.hook');
  bilingual(ingenuity.demo, '$.ingenuity.demo');
  bilingual(ingenuity.echo, '$.ingenuity.echo');
}
