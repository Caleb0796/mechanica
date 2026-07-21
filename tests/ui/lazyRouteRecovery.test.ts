import { describe, expect, it } from "vitest";

import { LazyRouteErrorBoundary } from "../../src/ui/App";
import { retryImportOnce } from "../../src/ui/routes";

describe("lazy route recovery", () => {
  it("retries a rejected dynamic import once", async () => {
    let attempts = 0;
    const loaded = await retryImportOnce(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("stale chunk");
      return "loaded";
    });

    expect(loaded).toBe("loaded");
    expect(attempts).toBe(2);
  });

  it("surfaces the second rejection to the error boundary", async () => {
    let attempts = 0;
    await expect(
      retryImportOnce(async () => {
        attempts += 1;
        throw new Error("missing chunk");
      }),
    ).rejects.toThrow("missing chunk");

    expect(attempts).toBe(2);
    expect(LazyRouteErrorBoundary.getDerivedStateFromError()).toEqual({
      failed: true,
    });
  });
});
