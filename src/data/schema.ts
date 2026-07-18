export type { MachineData } from '../sim/types';
import { MACHINE_SLUGS, type MachineData, type MachineSlug } from '../sim/types';

export const SOURCE_MINIMUMS: Readonly<Record<MachineSlug, number>> = {
  astroclock: 6,
  seismoscope: 1,
  chariot: 4,
  odometer: 2,
  'wooden-ox': 4,
  loom: 3,
  typecase: 3,
  chainpump: 3,
  bellows: 3,
  gimbal: 1,
};

export const IMAGE_MINIMUMS: Readonly<Record<MachineSlug, number>> = {
  astroclock: 5,
  seismoscope: 5,
  chariot: 4,
  odometer: 0,
  'wooden-ox': 5,
  loom: 1,
  typecase: 4,
  chainpump: 4,
  bellows: 2,
  gimbal: 4,
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

function boolean(value: unknown, path: string): void {
  if (typeof value !== 'boolean') fail(path, 'expected a boolean');
}

function bilingual(value: unknown, path: string): void {
  const item = object(value, path);
  string(item.zh, `${path}.zh`);
  string(item.en, `${path}.en`);
}

function objectArray(value: unknown, path: string): UnknownRecord[] {
  return array(value, path).map((item, index) => object(item, `${path}[${index}]`));
}

export function assertMachineData(json: unknown): asserts json is MachineData {
  const root = object(json, '$');
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
    string(scheme.id, `${path}.id`);
    bilingual(scheme.scholar, `${path}.scholar`);
    number(scheme.year, `${path}.year`);
    bilingual(scheme.summary, `${path}.summary`);
    bilingual(scheme.evidence, `${path}.evidence`);
    if (scheme.critique !== undefined) bilingual(scheme.critique, `${path}.critique`);
  });

  objectArray(root.controversies, '$.controversies').forEach((controversy, index) => {
    const path = `$.controversies[${index}]`;
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
  bilingual(ingenuity.hook, '$.ingenuity.hook');
  bilingual(ingenuity.demo, '$.ingenuity.demo');
  bilingual(ingenuity.echo, '$.ingenuity.echo');
}
