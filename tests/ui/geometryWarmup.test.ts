import { describe, expect, it } from "vitest";

import astroclock from "../../src/machines/astroclock/build";
import bellows from "../../src/machines/bellows/build";
import odometer from "../../src/machines/odometer/build";
import woodenOx from "../../src/machines/wooden-ox/build";
import type { MachineModule } from "../../src/sim/types";
import { geometryOptionsForPart } from "../../src/ui/viewer/geometryWarmup";

describe("viewer geometry warmup recipe", () => {
  it.each([
    [astroclock, "jack-01", "semantic:jack"],
    [odometer, "lower-figure", "semantic:striking-figure"],
    [odometer, "upper-figure", "semantic:striking-figure"],
    [woodenOx, "curved-head", "semantic:ox-head"],
    [bellows, "bellows-chest", "semantic:bellows-chest"],
  ] as const)(
    "uses the exact semantic geometry for %s:%s",
    (module, partId, variant) => {
      const part = module.spec.parts.find(
        (candidate) => candidate.id === partId,
      );
      if (!part) throw new Error(`Missing semantic fixture ${partId}`);
      const options = geometryOptionsForPart(module as MachineModule, part);

      expect(options?.variant).toBe(variant);
      const geometry = options?.factory?.();
      expect(geometry?.getAttribute("position").count).toBeGreaterThan(0);
      geometry?.dispose();
    },
  );

  it("leaves ordinary parts on the primitive recipe", () => {
    const ordinary = bellows.spec.parts.find(
      (part) => part.id !== "bellows-chest",
    );
    if (!ordinary) throw new Error("Missing ordinary Bellows fixture");

    expect(geometryOptionsForPart(bellows, ordinary)).toBeUndefined();
  });
});
