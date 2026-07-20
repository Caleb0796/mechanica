import { describe, expect, it } from "vitest";
import { humanizeDimLabel } from "../../src/ui/panels/partDimLabels";

describe("humanizeDimLabel", () => {
  it("maps known paths in both languages", () => {
    expect(humanizeDimLabel("wheel", "radius", "zh")).toBe("轮半径");
    expect(humanizeDimLabel("wheel", "radius", "en")).toBe("Wheel radius");
    expect(humanizeDimLabel("gear", "module", "zh")).toBe("模数");
    expect(humanizeDimLabel("custom", "params.shoulderWidth", "en")).toBe(
      "Shoulder width",
    );
  });
  it("prettifies unknown paths instead of echoing them", () => {
    expect(humanizeDimLabel("custom", "params.hatBrimAngleDeg", "en")).toBe(
      "Hat brim angle deg",
    );
    expect(humanizeDimLabel("custom", "params.hatBrimAngleDeg", "zh")).toBe(
      "Hat brim angle deg",
    );
  });
  it("keeps joint limits readable", () => {
    expect(humanizeDimLabel("joint", "limits.0", "zh")).toBe("行程下限");
    expect(humanizeDimLabel("joint", "limits.1", "en")).toBe(
      "Joint limit (max)",
    );
  });
});
