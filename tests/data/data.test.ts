import { describe, expect, it } from 'vitest';
import astroclockJson from '../../src/data/machines/astroclock.json';
import loomJson from '../../src/data/machines/loom.json';
import odometerJson from '../../src/data/machines/odometer.json';
import seismoscopeJson from '../../src/data/machines/seismoscope.json';
import { assertMachineData, IMAGE_MINIMUMS, SOURCE_MINIMUMS } from '../../src/data/schema';
import { MACHINE_SLUGS, type MachineData, type MachineSlug } from '../../src/sim/types';

const fixtures: unknown[] = [
  astroclockJson,
  seismoscopeJson,
  odometerJson,
  loomJson,
];

const machines = new Map<MachineSlug, MachineData>();
for (const fixture of fixtures) {
  assertMachineData(fixture);
  machines.set(fixture.slug, fixture);
}

function expectBilingual(value: unknown, path = '$'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => expectBilingual(item, `${path}[${index}]`));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  const item = value as Record<string, unknown>;
  if ('zh' in item || 'en' in item) {
    expect(item.zh, `${path}.zh`).toEqual(expect.any(String));
    expect((item.zh as string).trim(), `${path}.zh`).not.toBe('');
    expect(item.en, `${path}.en`).toEqual(expect.any(String));
    expect((item.en as string).trim(), `${path}.en`).not.toBe('');
  }
  Object.entries(item).forEach(([key, child]) => expectBilingual(child, `${path}.${key}`));
}

describe('four-machine knowledge base', () => {
  it('contains one valid record for every allowed slug', () => {
    expect([...machines.keys()]).toEqual(MACHINE_SLUGS);
  });

  it.each(MACHINE_SLUGS)('%s meets its honest source and image supply floors', (slug) => {
    const machine = machines.get(slug)!;
    const downloadableImages = machine.images.filter((image) => image.license !== 'linkout');
    expect(machine.sources.length).toBeGreaterThanOrEqual(SOURCE_MINIMUMS[slug]);
    expect(downloadableImages.length).toBeGreaterThanOrEqual(IMAGE_MINIMUMS[slug]);
  });

  it.each(MACHINE_SLUGS)('%s has complete bilingual exhibit data', (slug) => {
    const machine = machines.get(slug)!;
    expectBilingual(machine);
    expect(machine.sources.every((source) => (
      source.translation?.zh.trim() && source.translation.en.trim()
    ))).toBe(true);
    expect(machine.dimensions.length).toBeGreaterThanOrEqual(3);
    expect(machine.museums.length).toBeGreaterThanOrEqual(2);
    expect(machine.ingenuity.hook.zh.trim()).not.toBe('');
    expect(machine.ingenuity.hook.en.trim()).not.toBe('');
    expect(machine.ingenuity.demo.zh.trim()).not.toBe('');
    expect(machine.ingenuity.demo.en.trim()).not.toBe('');
    expect(machine.ingenuity.echo.zh.trim()).not.toBe('');
    expect(machine.ingenuity.echo.en.trim()).not.toBe('');
  });

  it('preserves the tooth-count keyword in the odometer quotations', () => {
    expect(machines.get('odometer')!.sources.some((source) => source.quote.includes('出齒'))).toBe(true);
  });

  it('keeps local image attribution consistent before and after the fetch pipeline', () => {
    for (const machine of machines.values()) {
      for (const image of machine.images) {
        if (!image.file) {
          expect(image).not.toHaveProperty('author');
          expect(image).not.toHaveProperty('licenseUrl');
          expect(image).not.toHaveProperty('attributionText');
        } else if (image.license === 'CC-BY' || image.license === 'CC-BY-SA') {
          expect(image.author?.trim()).not.toBe('');
          expect(image.licenseUrl?.trim()).not.toBe('');
          expect(image.attributionText?.trim()).not.toBe('');
        }
      }
    }
  });

  it('reports the failing field path for unresolved dimension provenance', () => {
    const corrupted = structuredClone(astroclockJson);
    corrupted.dimensions[0].sourceId = 'missing-source';
    expect(() => assertMachineData(corrupted)).toThrow('$.dimensions[0].sourceId');
  });

  it('rejects a local file on a linkout image with its field path', () => {
    const corrupted = structuredClone(astroclockJson);
    (corrupted.images.at(-1)! as (typeof astroclockJson.images)[number] & { file?: string }).file = 'public/forbidden.jpg';
    expect(() => assertMachineData(corrupted)).toThrow('$.images[11].file');
  });
});
