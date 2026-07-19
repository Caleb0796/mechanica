import {
  BoxGeometry,
  Color,
  DataTexture,
  DoubleSide,
  MeshStandardMaterial,
} from "three";
import { describe, expect, it } from "vitest";

import { materialVariantKey } from "../../src/core/materialCache";
import { standardMaterial } from "../../src/core/materials";
import {
  buildPartGeometry,
  disposePartGeometry,
  partGeometryEntries,
} from "../../src/core/primitives";
import { KinematicGraph } from "../../src/sim/graph";
import type { MachineModule, PartDef } from "../../src/sim/types";
import { collisionPairsAtAngle } from "../../src/validate/collision";

const provenance = {
  kind: "tuice" as const,
  ref: "composite-test",
  note: "Purpose-built composite geometry test fixture.",
};

function fixturePart(
  id: string,
  geometry: PartDef["geometry"],
  position: [number, number, number],
): PartDef {
  return {
    id,
    name: { zh: id, en: id },
    geometry,
    material: "wood",
    position,
    joint: { kind: "revolute", axis: [0, 1, 0] },
    provenance,
    dimensionProvenance: { "@rest": provenance },
  };
}

describe("composite custom builders", () => {
  it("passes through up to four geometry entries with independent materials", () => {
    const alphaMap = new DataTexture(new Uint8Array([255]), 1, 1);
    const first = new BoxGeometry(1, 1, 1);
    const second = new BoxGeometry(0.5, 0.5, 0.5);
    second.userData.mechanicaMaterial = {
      alphaMap,
      alphaTest: 0.4,
      bumpMap: alphaMap,
      normalMap: alphaMap,
      side: DoubleSide,
      textureVariant: "none",
    };
    const composite = [first, second];
    const built = buildPartGeometry(
      { type: "custom", builder: "fixture", params: {} },
      { fixture: () => composite },
    );

    expect(built).toBe(composite);
    expect(Array.isArray(built)).toBe(true);
    expect(partGeometryEntries(built)).toHaveLength(2);
    expect(partGeometryEntries(built)[1].userData.mechanicaMaterial).toEqual(
      expect.objectContaining({ alphaMap, alphaTest: 0.4, side: DoubleSide }),
    );

    const presentation =
      partGeometryEntries(built)[1].userData.mechanicaMaterial;
    const material = standardMaterial("wood", presentation);
    const otherAlphaMap = new DataTexture();
    const layeredMaterial = standardMaterial(
      "wood",
      { alphaTest: 0.42, color: "#78998a" },
      { textureVariant: "none" },
      { alphaTest: 0.73, color: "#d6b26e" },
    );
    expect(material).toBeInstanceOf(MeshStandardMaterial);
    expect(material.alphaMap).toBe(alphaMap);
    expect(material.bumpMap).toBe(alphaMap);
    expect(material.normalMap).toBe(alphaMap);
    expect(material.side).toBe(DoubleSide);
    expect(materialVariantKey({ alphaMap })).not.toBe(
      materialVariantKey({ alphaMap: otherAlphaMap }),
    );
    expect(materialVariantKey({ color: new Color("red") })).not.toBe(
      materialVariantKey({ color: new Color("blue") }),
    );
    expect(layeredMaterial.alphaTest).toBe(0.73);
    expect(layeredMaterial.color.getHexString()).toBe("d6b26e");

    material.dispose();
    layeredMaterial.dispose();
    alphaMap.dispose();
    otherAlphaMap.dispose();
    disposePartGeometry(built);
  });

  it("rejects more than four entries and instancing inside composites", () => {
    expect(() =>
      buildPartGeometry(
        { type: "custom", builder: "tooMany", params: {} },
        {
          tooMany: () =>
            Array.from({ length: 5 }, () => new BoxGeometry(1, 1, 1)),
        },
      ),
    ).toThrow("one to 4");

    expect(() =>
      buildPartGeometry(
        { type: "custom", builder: "instanced", params: {} },
        {
          instanced: () => {
            const geometry = new BoxGeometry(1, 1, 1);
            geometry.userData.mechanicaInstances = {
              matrices: [[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]],
            };
            return [geometry, new BoxGeometry(1, 1, 1)];
          },
        },
      ),
    ).toThrow("cannot contain mechanicaInstances");
  });

  it("samples the union when only the second entry collides", () => {
    const composite = fixturePart(
      "composite",
      { type: "custom", builder: "collisionFixture", params: {} },
      [0, 0, 0],
    );
    const obstacle = fixturePart(
      "obstacle",
      { type: "box", size: [0.5, 0.5, 0.5] },
      [1.2, 0, 0],
    );
    const spec = {
      slug: "composite-test",
      parts: [composite, obstacle],
      constraints: [],
      driveNodes: ["composite"],
      primaryDrive: "composite",
      cycleRad: Math.PI * 2,
    };
    const module = {
      spec,
      data: {} as MachineModule["data"],
      customBuilders: {
        collisionFixture: () => {
          const distant = new BoxGeometry(0.5, 0.5, 0.5);
          distant.translate(-2, 0, 0);
          const colliding = new BoxGeometry(0.5, 0.5, 0.5);
          colliding.translate(1, 0, 0);
          return [distant, colliding];
        },
      },
    } satisfies MachineModule;

    expect(
      collisionPairsAtAngle(module, new KinematicGraph(spec), 0),
    ).toContainEqual(["composite", "obstacle"]);
  });
});
