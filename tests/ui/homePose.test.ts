import { describe, expect, it } from "vitest";
import { Sphere, Vector3 } from "three";

import {
  safeHomePose,
  VIEWER_PROFILES,
} from "../../src/ui/viewer/visualRecovery";

describe("safeHomePose", () => {
  it("rejects a pose whose camera sits inside the model bounding sphere", () => {
    const sphere = new Sphere(new Vector3(0, 1, 0), 3);
    const inside = {
      position: [0.5, 1, 0.5] as const,
      target: [0, 1, 0] as const,
    };
    expect(safeHomePose(inside, sphere)).toBeNull();
  });

  it("accepts a pose comfortably outside the sphere", () => {
    const sphere = new Sphere(new Vector3(0, 1, 0), 3);
    const outside = {
      position: [8, 5, 9] as const,
      target: [0, 1, 0] as const,
    };
    expect(safeHomePose(outside, sphere)).toEqual(outside);
  });

  it("every declared profile pose passes its own sanity shape", () => {
    for (const profile of Object.values(VIEWER_PROFILES)) {
      if (!profile.homePose) continue;
      expect(profile.homePose.position).toHaveLength(3);
      expect(profile.homePose.target).toHaveLength(3);
    }
  });
});
