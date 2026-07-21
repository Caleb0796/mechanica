import { expect, test, type Page } from "@playwright/test";

const dualSchemeSlugs = [
  "astroclock",
  "seismoscope",
  "loom",
] as const;
const machineSlugs = [
  "astroclock",
  "seismoscope",
  "odometer",
  "loom",
] as const;
const removedMachineSlugs = [
  "chariot",
  "typecase",
  "bellows",
  "wooden-ox",
  "chainpump",
  "gimbal",
] as const;

async function waitForMechanica(
  page: Page,
  slug?: string,
  requireGeometry = true,
) {
  await expect
    .poll(() =>
      page.evaluate(
        ({ expectedSlug, geometryRequired }) =>
          Boolean(window.__mech) &&
          (!geometryRequired ||
            typeof window.__mech?.machineReady === "number") &&
          (!expectedSlug || window.__mech?.spec.slug === expectedSlug),
        { expectedSlug: slug, geometryRequired: requireGeometry },
      ),
    )
    .toBe(true);
}

async function waitForCamera(page: Page) {
  await expect
    .poll(() => page.evaluate(() => window.__mech?.cameraState()?.phase))
    .toBe("idle");
}

async function openAdvancedControls(page: Page) {
  const controls = page.locator(".controls-advanced");
  if (
    !(await controls.evaluate(
      (element) => (element as HTMLDetailsElement).open,
    ))
  ) {
    await controls.locator("summary").click();
  }
}

async function sampleFrameRate(page: Page, seconds: number) {
  return page.evaluate(
    (sampleSeconds) =>
      new Promise<number>((resolve) => {
        let frames = 0;
        let startedAt: number | undefined;
        const sample = (timestamp: number) => {
          startedAt ??= timestamp;
          frames += 1;
          const elapsedSeconds = (timestamp - startedAt) / 1000;
          if (elapsedSeconds >= sampleSeconds) {
            resolve((frames - 1) / elapsedSeconds);
          } else {
            requestAnimationFrame(sample);
          }
        };
        requestAnimationFrame(sample);
      }),
    seconds,
  );
}

async function sampleCompareInteractionFrameRates(
  page: Page,
  seconds: number,
) {
  return page.evaluate(
    (sampleSeconds) =>
      new Promise<number[]>((resolve, reject) => {
        const compare = window.__mechCompare;
        if (!compare) {
          reject(new Error("Comparison performance hook is unavailable"));
          return;
        }
        compare.resetFrameCounts();
        let startedAt: number | undefined;
        const sample = (timestamp: number) => {
          startedAt ??= timestamp;
          const elapsedSeconds = (timestamp - startedAt) / 1000;
          if (elapsedSeconds >= sampleSeconds) {
            requestAnimationFrame(() =>
              resolve(
                compare.frameCounts.map((count) => count / elapsedSeconds),
              ),
            );
            return;
          }
          compare.drive(Math.PI / 720);
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }),
    seconds,
  );
}

async function sampleCompareIdleFrames(page: Page) {
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__mechCompare?.resetFrameCounts());
  await page.waitForTimeout(500);
  return page.evaluate(() => window.__mechCompare?.frameCounts ?? []);
}

async function sampleMachineRenderRate(page: Page, seconds: number) {
  await page.evaluate(() => window.__mech?.resetFrameCount());
  await page.waitForTimeout(seconds * 1000);
  return page.evaluate(
    (sampleSeconds) => (window.__mech?.frameCount() ?? 0) / sampleSeconds,
    seconds,
  );
}

async function hoverDriveGizmo(page: Page, testIdPrefix: string) {
  await expect
    .poll(() =>
      page.evaluate(
        (prefix) =>
          Object.keys(window.__mechDriveGizmos ?? {}).find((testId) =>
            testId.startsWith(prefix),
          ) ?? null,
        testIdPrefix,
      ),
    )
    .not.toBeNull();
  const candidates = await page.evaluate(
    (prefix) =>
      Object.entries(window.__mechDriveGizmos ?? {}).flatMap(([id, state]) =>
        id.startsWith(prefix)
          ? state.points.map((point) => ({ id, ...point }))
          : [],
      ),
    testIdPrefix,
  );
  for (const candidate of candidates) {
    await page.mouse.move(candidate.x, candidate.y);
    const active = await page.evaluate(
      (id) =>
        new Promise<boolean>((resolve) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() =>
              resolve(window.__mechDriveGizmos?.[id]?.active ?? false),
            ),
          ),
        ),
      candidate.id,
    );
    if (active) return candidate;
  }
  throw new Error(`Drive gizmo ${testIdPrefix} has no projected points`);
}

async function dragDriveGizmo(page: Page, testIdPrefix: string, distance = 80) {
  const target = await hoverDriveGizmo(page, testIdPrefix);
  await page.mouse.down();
  await expect
    .poll(
      () =>
        page.evaluate(
          (id) => window.__mechDriveGizmos?.[id]?.dragging ?? false,
          target.id,
        ),
      {
        message: `Drive gizmo ${target.id} did not capture a real pointer drag`,
      },
    )
    .toBe(true);
  await page.mouse.move(
    target.x + target.dragX * distance,
    target.y + target.dragY * distance,
    { steps: 10 },
  );
  await page.mouse.up();
  return target.id;
}

test("smoke: homepage presents the four-machine collection", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("machine-card")).toHaveCount(4);
  await expect(page.locator(".machine-era")).toHaveCount(4);
  await expect(page.locator(".machine-principle")).toHaveCount(4);
  await expect(page.locator(".machine-thumbnail")).toHaveCount(4);
  const thumbnails = page.getByTestId("machine-thumbnail-image");
  await expect(thumbnails).toHaveCount(4);
  await expect
    .poll(() =>
      thumbnails.evaluateAll((images) =>
        images.every(
          (image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
});

test("smoke: removed machine routes do not resolve", async ({ page }) => {
  for (const slug of removedMachineSlugs) {
    await page.goto(`/#/m/${slug}`);
    await expect(page.locator(".error-page")).toBeVisible();
    await expect(page.locator(".viewer-page")).toHaveCount(0);
    expect(await page.evaluate(() => window.__mech)).toBeUndefined();
  }
});

test("smoke: all four machine routes render without console errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  for (const slug of machineSlugs) {
    errors.length = 0;
    await page.goto(`/#/m/${slug}`);
    await waitForMechanica(page, slug);
    await expect(page.locator(".viewer-canvas canvas").first()).toBeVisible();
    const evidenceCounts = await page.evaluate(() => ({
      controversies: window.__mech?.module.data.controversies.length ?? -1,
      dimensions: window.__mech?.module.data.dimensions.length ?? -1,
      schemes: window.__mech?.module.data.schemes.length ?? -1,
      sources: window.__mech?.module.data.sources.length ?? -1,
    }));
    const evidence = page.getByTestId("machine-evidence-register");
    await expect(evidence).toHaveCount(1);
    await expect(evidence.locator("[data-machine-dimension]")).toHaveCount(
      evidenceCounts.dimensions,
    );
    await expect(evidence.locator("[data-machine-source]")).toHaveCount(
      evidenceCounts.sources,
    );
    await expect(evidence.locator("[data-machine-scheme]")).toHaveCount(
      evidenceCounts.schemes,
    );
    await expect(evidence.locator("[data-machine-controversy]")).toHaveCount(
      evidenceCounts.controversies,
    );
    const directlySourcedPart = await page.evaluate(() => {
      const part = window.__mech?.spec.parts.find(
        (candidate) =>
          !candidate.dimensionNotes?.length &&
          Object.values(candidate.dimensionProvenance).some(
            (item) => item.kind !== "tuice",
          ),
      );
      if (part) window.__mechSelect?.(part.id);
      return part?.id ?? null;
    });
    if (directlySourcedPart) {
      await expect(
        page.locator('[data-evidence-gap="ancient-dimension"]'),
      ).toHaveCount(0);
    }
    expect(errors, `${slug} emitted browser errors`).toEqual([]);
  }
});

test("F0-T5c: geometry loading commits before the cold and scheme-switch deadlines", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const target = window as Window & {
      __mechanicaFirstGeometryWarmAt?: number | null;
    };
    target.__mechanicaFirstGeometryWarmAt = null;
    const recordWarmState = () => {
      if (
        target.__mechanicaFirstGeometryWarmAt === null &&
        document.querySelector('[data-geometry-state="warming"]')
      ) {
        target.__mechanicaFirstGeometryWarmAt = performance.now();
      }
    };
    new MutationObserver(recordWarmState).observe(document, {
      attributeFilter: ["data-geometry-state"],
      attributes: true,
      childList: true,
      subtree: true,
    });
    recordWarmState();
  });

  await page.goto("/#/m/astroclock");
  await waitForMechanica(page, "astroclock");
  await waitForCamera(page);
  const cold = await page.evaluate(() => ({
    firstWarmAt:
      (
        window as Window & {
          __mechanicaFirstGeometryWarmAt?: number | null;
        }
      ).__mechanicaFirstGeometryWarmAt ?? Number.POSITIVE_INFINITY,
    readyAt: window.__mech?.machineReady ?? Number.POSITIVE_INFINITY,
    state:
      document.querySelector<HTMLElement>(".viewer-canvas")?.dataset
        .geometryState,
  }));
  expect(cold.firstWarmAt).toBeLessThan(500);
  expect(cold.readyAt).toBeGreaterThanOrEqual(cold.firstWarmAt);
  expect(cold.readyAt).toBeLessThan(3_000);
  expect(cold.state).toBe("committed");
  await expect(page.locator(".viewer-canvas")).toHaveAttribute(
    "data-machine-ready",
    "true",
  );

  const select = page.locator(".viewer-sidebar .scheme-select").first();
  const currentScheme = await select.inputValue();
  const targetScheme = await select
    .locator("option")
    .evaluateAll(
      (options, current) =>
        options
          .map((option) => (option as HTMLOptionElement).value)
          .find((value) => value && value !== current) ?? null,
      currentScheme,
    );
  if (!targetScheme) throw new Error("Astroclock alternate scheme is missing");
  const previousReadyAt = cold.readyAt;
  const switchStartedAt = await page.evaluate(() => performance.now());
  await select.selectOption(targetScheme);
  await expect
    .poll(() => page.evaluate(() => window.__mech?.machineReady ?? 0))
    .toBeGreaterThan(previousReadyAt);
  const switchedReadyAt = await page.evaluate(
    () => window.__mech?.machineReady ?? Number.POSITIVE_INFINITY,
  );

  expect(switchedReadyAt - switchStartedAt).toBeLessThan(500);
  await expect(page.locator(".viewer-canvas")).toHaveAttribute(
    "data-geometry-state",
    "committed",
  );
  await expect
    .poll(() =>
      page.evaluate(() => {
        const readyAt = window.__mech?.machineReady;
        const camera = window.__mech?.cameraState();
        return (
          typeof readyAt === "number" &&
          camera?.geometryReadyAt === readyAt &&
          camera.phase === "idle"
        );
      }),
    )
    .toBe(true);
  const switchedCamera = await page.evaluate(() =>
    window.__mech?.cameraState(),
  );
  expect(switchedCamera?.phase).toBe("idle");
  expect(switchedCamera?.controlsEnabled).toBe(true);
  expect(switchedCamera?.introStartedAt).toBeNull();

  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLElement>(".viewer-canvas");
    if (!canvas) throw new Error("Viewer readiness surface is unavailable");
    canvas.dataset.compareExitWarmObserved = "false";
    new MutationObserver(() => {
      if (canvas.dataset.geometryState === "warming") {
        canvas.dataset.compareExitWarmObserved = "true";
      }
    }).observe(canvas, {
      attributeFilter: ["data-geometry-state"],
      attributes: true,
    });
  });
  const compareToggle = page.getByTestId("compare-toggle");
  await compareToggle.click();
  await expect(page.getByTestId("compare-view")).toBeVisible();
  await expect(
    page.locator('.compare-viewport-shell[data-machine-ready="true"]'),
  ).toHaveCount(2);
  await compareToggle.click();
  await expect(page.locator(".viewer-canvas")).toHaveAttribute(
    "data-machine-ready",
    "true",
  );
  const compareExit = await page.evaluate(() => ({
    readyAt: window.__mech?.machineReady ?? 0,
    warmObserved:
      document.querySelector<HTMLElement>(".viewer-canvas")?.dataset
        .compareExitWarmObserved,
  }));
  expect(compareExit.warmObserved).toBe("true");
  expect(compareExit.readyAt).toBeGreaterThan(switchedReadyAt);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const readyAt = window.__mech?.machineReady;
        const camera = window.__mech?.cameraState();
        return (
          typeof readyAt === "number" &&
          camera?.geometryReadyAt === readyAt &&
          camera.phase === "idle" &&
          camera.controlsEnabled
        );
      }),
    )
    .toBe(true);
  expect(errors).toEqual([]);
});

test("U2: demo exposes the exact external-gear ratio", async ({ page }) => {
  await page.goto("/#/m/demo");
  await waitForMechanica(page);
  await page.getByRole("button", { name: "Pause", exact: true }).click();

  const angles = await page.evaluate(() => {
    const graph = window.__mech?.graph;
    if (!graph) throw new Error("Mechanica graph hook is unavailable");
    graph.setInput("small-gear", 0);
    graph.drive("small-gear", Math.PI / 9);
    const state = graph.state();
    return { large: state["large-gear"], small: state["small-gear"] };
  });
  expect(angles.small).toBeCloseTo(Math.PI / 9, 8);
  expect(angles.large).toBeCloseTo(-Math.PI / 18, 8);
});

test("U2: odometer wheel advances the one-hundredth shaft exactly", async ({
  page,
}) => {
  await page.goto("/#/m/odometer");
  await waitForMechanica(page, "odometer");

  const result = await page.evaluate(() => {
    const graph = window.__mech?.graph;
    if (!graph) throw new Error("Mechanica graph hook is unavailable");
    const ratio = graph.ratioBetween("zulun", "zhongpinglun");
    const before = graph.state()["zhongpinglun"] ?? 0;
    graph.drive("zulun", Math.PI * 2);
    return {
      delta: graph.state()["zhongpinglun"] - before,
      ratio,
    };
  });

  expect(Math.abs(result.ratio ?? 0)).toBeCloseTo(0.01, 10);
  expect(Math.abs(result.delta)).toBeCloseTo((Math.PI * 2) / 100, 8);
});

test("U2 real pointer: dragging the demo gear changes graph state", async ({
  page,
}) => {
  await page.goto("/#/m/demo");
  await waitForMechanica(page);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const before = await page.evaluate(() => window.__mech?.graph.state());
  await dragDriveGizmo(page, "drive-gizmo-small-gear");
  const after = await page.evaluate(() => window.__mech?.graph.state());
  const smallDelta =
    (after?.["small-gear"] ?? 0) - (before?.["small-gear"] ?? 0);
  const largeDelta =
    (after?.["large-gear"] ?? 0) - (before?.["large-gear"] ?? 0);
  expect(Math.abs(smallDelta)).toBeGreaterThan(0.01);
  expect(largeDelta).toBeCloseTo(-smallDelta / 2, 8);
});

test("U2 pointer control: astroclock reverse lock cannot be bypassed", async ({
  page,
}) => {
  await page.goto("/#/m/astroclock");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await waitForMechanica(page, "astroclock");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const before = await page.evaluate(
    () => window.__mech?.graph.state().shulun ?? 0,
  );
  await page.evaluate(() => window.__mechSelect?.("shulun"));
  const reverse = page.getByRole("button", {
    name: "Drive Scoop escapement wheel in reverse",
  });
  await expect(reverse).toHaveAttribute("data-drive-part-id", "shulun");
  expect(
    await page.evaluate(() =>
      window.__mech?.spec.driveNodes.includes("shulun"),
    ),
  ).toBe(true);
  await expect(reverse).toHaveAttribute(
    "aria-keyshortcuts",
    "ArrowLeft ArrowDown",
  );
  await reverse.focus();
  await page.keyboard.press("ArrowLeft");

  await expect(page.getByTestId("event-captions")).toContainText(
    "Reverse motion is locked · Right celestial lock",
  );
  expect(
    await page.evaluate(() => window.__mech?.graph.state().shulun ?? 0),
  ).toBeCloseTo(before, 10);
});

test("F0-T7: coach dismisses after one drive and permanent controls stay absent", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    window.localStorage.removeItem("mechanica:drive-coach"),
  );
  await page.goto("/#/m/demo");
  await waitForMechanica(page);
  await expect(page.locator(".drive-buttons")).toHaveCount(0);
  await expect(page.getByTestId("drive-coach")).toContainText(
    "drag the glowing wheel",
  );
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await dragDriveGizmo(page, "drive-gizmo-small-gear");
  await expect(page.getByTestId("drive-coach")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      window.localStorage.getItem("mechanica:drive-coach"),
    ),
  ).toBe("dismissed");

  await page.reload();
  await waitForMechanica(page);
  await expect(page.getByTestId("drive-coach")).toHaveCount(0);
  await expect(page.locator(".drive-buttons")).toHaveCount(0);
});

test("F0-T7: selected drive exposes bilingual arrow-key control", async ({
  page,
}) => {
  await page.goto("/#/m/demo");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await waitForMechanica(page);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.evaluate(() => window.__mechSelect?.("small-gear"));
  const reverse = page.getByTestId("drive-keyboard-reverse");
  const forward = page.getByTestId("drive-keyboard-forward");
  await expect(reverse).toHaveCount(1);
  await expect(forward).toHaveCount(1);
  await expect(reverse).toHaveAttribute("aria-label", /Drive .+ in reverse/);
  await expect(forward).toHaveAttribute("aria-label", /Drive .+ forward/);
  await expect(reverse).toHaveAttribute("data-drive-part-id", "small-gear");
  await expect(forward).toHaveAttribute("data-drive-part-id", "small-gear");
  const before = await page.evaluate(
    () => window.__mech?.graph.state()["small-gear"] ?? 0,
  );
  await forward.focus();
  await page.keyboard.press("ArrowRight");
  const forwardState = await page.evaluate(
    () => window.__mech?.graph.state()["small-gear"] ?? 0,
  );
  expect(forwardState).toBeGreaterThan(before);
  await reverse.focus();
  await page.keyboard.press("ArrowLeft");
  expect(
    await page.evaluate(() => window.__mech?.graph.state()["small-gear"] ?? 0),
  ).toBeCloseTo(before, 8);

  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(reverse).toHaveAttribute("aria-label", /.+：反向驱动/);
  await expect(forward).toHaveAttribute("aria-label", /.+：正向驱动/);
});

test("F0-T7: declared drive nodes expose the toolbar control", async ({
  page,
}) => {
  await page.goto("/#/m/astroclock");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await waitForMechanica(page, "astroclock");
  expect(
    await page.evaluate(() => {
      const part = window.__mech?.spec.parts.find(
        (candidate) => candidate.id === "shulun",
      );
      return {
        declared: window.__mech?.spec.driveNodes.includes("shulun"),
        interactive: part?.interactive ?? false,
      };
    }),
  ).toEqual({ declared: true, interactive: true });

  await page.evaluate(() => window.__mechSelect?.("shulun"));
  const reverse = page.getByTestId("drive-keyboard-reverse");
  const forward = page.getByTestId("drive-keyboard-forward");
  await expect(reverse).toHaveCount(1);
  await expect(forward).toHaveCount(1);
  await expect(reverse).toHaveAttribute("data-drive-part-id", "shulun");
  await expect(forward).toHaveAttribute("data-drive-part-id", "shulun");
  await expect(reverse).toHaveAttribute("aria-label", /Drive .+ in reverse/);
  await expect(forward).toHaveAttribute("aria-label", /Drive .+ forward/);
});

test("U4: inspection responds within 300 ms and exploded view spreads parts", async ({
  page,
}) => {
  await page.goto("/#/m/demo");
  await waitForMechanica(page);

  const inspectorMs = await page.evaluate(async () => {
    const startedAt = performance.now();
    window.__mechSelect?.("large-gear");
    while (performance.now() - startedAt < 1000) {
      const text = document.querySelector(
        '[data-testid="part-inspector"]',
      )?.textContent;
      if (text?.includes("Large driven gear"))
        return performance.now() - startedAt;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    }
    return Number.POSITIVE_INFINITY;
  });
  expect(inspectorMs).toBeLessThanOrEqual(300);
  await expect(page.getByTestId("part-inspector")).toContainText(
    "Large driven gear",
  );

  await openAdvancedControls(page);
  await page.getByTestId("explode-slider").fill("1");
  const spread = await page.evaluate(() => window.__mechExplodeSpread?.() ?? 0);
  expect(spread).toBeGreaterThan(0.1);
});

test("U4: seismoscope part inspection exposes the duzhu source quote", async ({
  page,
}) => {
  await page.goto("/#/m/seismoscope");
  await waitForMechanica(page, "seismoscope");
  await page.evaluate(() => window.__mechSelect?.("duzhu"));

  await expect(page.getByTestId("part-inspector")).toContainText(/duzhu/i);
  await expect(
    page.locator('[data-source-id="houfeng-196"] .panel-copy'),
  ).toContainText("中有都柱");
});

test("seismoscope matched bearing releases only the corresponding ball", async ({
  page,
}) => {
  await page.goto("/#/m/seismoscope");
  await waitForMechanica(page, "seismoscope");

  await page.getByRole("button", { name: "E", exact: true }).click();
  await page.getByTestId("mech-trigger-quake:arm").click();
  await page.getByTestId("mech-trigger-quake").click();
  await expect(page.getByTestId("event-captions")).toContainText(/ball|铜丸/i);
  expect(
    await page.evaluate(() =>
      Object.entries(window.__mech?.graph.state() ?? {})
        .filter(([partId, value]) => partId.startsWith("ball-") && value > 0)
        .map(([partId]) => partId),
    ),
  ).toEqual(["ball-2"]);
});

test("U3: switching reconstructions runs the one-second ghost handoff", async ({
  page,
}) => {
  for (const slug of dualSchemeSlugs) {
    await page.goto(`/#/m/${slug}`);
    await waitForMechanica(page, slug);
    const before = await page.evaluate(() =>
      JSON.stringify(window.__mech?.spec.parts),
    );
    const select = page.locator(".viewer-sidebar .scheme-select").first();
    await expect(select.locator('option[value=""]')).toHaveCount(0);
    const target = await select.locator("option").evaluateAll(
      (options, current) => {
        const values = options
          .map((option) => (option as HTMLOptionElement).value)
          .filter(Boolean);
        return values.find((value) => value !== current) ?? values[0];
      },
      await select.inputValue(),
    );
    if (!target) throw new Error(`A second ${slug} reconstruction is required`);

    await select.selectOption(target);
    await expect(select).toHaveValue(target);
    await expect(page.locator(".viewer-canvas")).toHaveAttribute(
      "data-scheme-transition",
      "true",
    );
    await expect
      .poll(() =>
        page.evaluate(() => JSON.stringify(window.__mech?.spec.parts)),
      )
      .not.toBe(before);
    await expect(page.locator(".viewer-canvas")).toHaveAttribute(
      "data-scheme-transition",
      "false",
      { timeout: 2500 },
    );
  }
});

test("U3 compare: linked controls drive both reconstruction graphs", async ({
  page,
}) => {
  for (const slug of dualSchemeSlugs) {
    await page.goto(`/#/m/${slug}`);
    await waitForMechanica(page, slug);
    await page.evaluate(() => delete window.__mechCompare);
    await page.getByTestId("compare-toggle").click();
    await expect(page.getByTestId("compare-view")).toBeVisible();
    await expect(
      page.locator('.compare-viewport-shell[data-machine-ready="true"]'),
    ).toHaveCount(2);
    await expect
      .poll(() => page.evaluate(() => Boolean(window.__mechCompare)))
      .toBe(true);
    const before = await page.evaluate(() =>
      window.__mechCompare?.graphs.map((graph) => graph.state()),
    );

    await page.getByTestId("compare-drive-forward").click();

    const after = await page.evaluate(() =>
      window.__mechCompare?.graphs.map((graph) => graph.state()),
    );
    expect(before).toHaveLength(2);
    expect(after).toHaveLength(2);
    for (const side of [0, 1]) {
      expect(
        Object.keys(after?.[side] ?? {}).some(
          (partId) =>
            Math.abs(
              (after?.[side]?.[partId] ?? 0) - (before?.[side]?.[partId] ?? 0),
            ) > 1e-8,
        ),
      ).toBe(true);
    }
    if (slug === "seismoscope") {
      const dropped = after?.map((state) =>
        Object.entries(state).some(
          ([partId, value]) => partId.startsWith("ball-") && value > 0,
        ),
      );
      expect(dropped).toEqual([false, true]);
    }
  }
});

test("U3 compare pointer: dragging either canvas broadcasts to both graphs", async ({
  page,
}) => {
  await page.goto("/#/m/seismoscope");
  await waitForMechanica(page, "seismoscope");
  await page.getByTestId("compare-toggle").click();
  await expect(
    page.locator('.compare-viewport-shell[data-machine-ready="true"]'),
  ).toHaveCount(2);
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__mechCompare)))
    .toBe(true);
  const before = await page.evaluate(() =>
    window.__mechCompare?.graphs.map((graph) => JSON.stringify(graph.state())),
  );
  await dragDriveGizmo(page, "drive-gizmo-left-", 100);
  const after = await page.evaluate(() =>
    window.__mechCompare?.graphs.map((graph) => JSON.stringify(graph.state())),
  );
  expect(after?.[0]).not.toBe(before?.[0]);
  expect(after?.[1]).not.toBe(before?.[1]);
});

test("U1: odometer rejects dependency violations then restores", async ({
  page,
}) => {
  for (const slug of ["odometer"] as const) {
    await page.goto(`/#/m/${slug}`);
    await waitForMechanica(page, slug);
    await openAdvancedControls(page);
    await page.getByTestId("assembly-reassemble").click();
    await expect(page.locator(".viewer-canvas")).toHaveAttribute(
      "data-assembly-mode",
      "reassemble",
    );

    const childId = await page.evaluate(() => {
      const spec = window.__mech?.spec;
      if (!spec) throw new Error("Mechanica spec hook is unavailable");
      const byId = new Map(spec.parts.map((part) => [part.id, part]));
      const child = spec.parts.find(
        (part) => part.parent && !byId.get(part.parent)?.parent,
      );
      if (!child) throw new Error("A child with a root parent is required");
      window.__mechAssembly?.seat(child.id, 0, 1);
      return child.id;
    });
    await expect(page.getByTestId("assembly-hint")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => window.__mechAssembly?.state().errorPartId),
      )
      .toBe(childId);

    await page.evaluate(() => {
      const spec = window.__mech?.spec;
      const assembly = window.__mechAssembly;
      if (!spec || !assembly) throw new Error("Assembly hooks are unavailable");
      const remaining = [...spec.parts].sort(
        (a, b) =>
          (a.assemblyStep ?? Number.MAX_SAFE_INTEGER) -
          (b.assemblyStep ?? Number.MAX_SAFE_INTEGER),
      );
      const seated = new Set<string>();
      while (remaining.length > 0) {
        const index = remaining.findIndex(
          (part) =>
            !part.parent ||
            !spec.parts.some((candidate) => candidate.id === part.parent) ||
            seated.has(part.parent),
        );
        if (index < 0) throw new Error("Assembly dependency cycle");
        const [part] = remaining.splice(index, 1);
        assembly.seat(part.id, 0, 1);
        seated.add(part.id);
      }
    });
    await expect
      .poll(() => page.evaluate(() => window.__mechAssembly?.state().complete))
      .toBe(true);
    await expect
      .poll(() =>
        page.evaluate(() => window.__mechAssembly?.state().transmissionEnabled),
      )
      .toBe(true);
    await expect(page.locator(".viewer-canvas")).toHaveAttribute(
      "data-assembly-complete",
      "true",
    );
    await expect(page.locator(".viewer-toolbar")).not.toHaveAttribute(
      "data-completion-effect",
      "0",
    );
  }
});

test("F0-T8: assembly duration follows runtime part count and captions the Chinese step", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/#/m/astroclock");
  await waitForMechanica(page, "astroclock");
  const chineseToggle = page.getByRole("button", { name: "中文", exact: true });
  if ((await chineseToggle.count()) > 0) await chineseToggle.click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");

  const expected = await page.evaluate(() => {
    const assembly = window.__mechAssembly;
    const spec = window.__mech?.spec;
    if (!assembly || !spec) throw new Error("Assembly hooks are unavailable");
    const plan = assembly.plan();
    const firstPart = spec.parts.find(
      (part) => part.id === plan.orderedPartIds[0],
    );
    if (!firstPart) throw new Error("The first assembly part is unavailable");
    return {
      durationMs: plan.durationMs,
      holdBudgetMs:
        Math.max(
          0,
          new Set(
            plan.orderedPartIds.map(
              (partId) =>
                spec.parts.find((part) => part.id === partId)?.assemblyStep ??
                0,
            ),
          ).size - 1,
        ) * 700,
      formulaMs: Math.min(
        45_000,
        Math.max(9_000, spec.parts.length * 320),
      ),
      name: firstPart.name.zh,
    };
  });
  expect(expected.durationMs).toBe(expected.formulaMs);

  await openAdvancedControls(page);
  const startedAt = await page.evaluate(() => performance.now());
  await page.getByTestId("assembly-play").click();
  await expect(page.getByTestId("assembly-current-part")).toContainText(
    expected.name,
  );
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__mechAssembly?.state().assemblyProgress ?? 0,
        ),
      { timeout: expected.durationMs + expected.holdBudgetMs + 2_000 },
    )
    .toBe(1);
  const elapsed = (await page.evaluate(() => performance.now())) - startedAt;
  expect(elapsed).toBeGreaterThanOrEqual(expected.durationMs * 0.9);
  expect(elapsed).toBeLessThanOrEqual(
    expected.durationMs + expected.holdBudgetMs + 1_500,
  );
});

test("F0-T8: Reassemble stages on the ground, scrub resets explode, and completion settles", async ({
  page,
}) => {
  await page.goto("/#/m/odometer");
  await waitForMechanica(page, "odometer");
  await openAdvancedControls(page);
  await page.getByTestId("assembly-reassemble").click();
  await expect(page.locator(".viewer-canvas")).toHaveAttribute(
    "data-assembly-mode",
    "reassemble",
  );

  await expect
    .poll(() =>
      page.evaluate(() => {
        const assembly = window.__mechAssembly;
        if (!assembly) return Number.POSITIVE_INFINITY;
        const plan = assembly.plan();
        return Math.max(
          ...plan.orderedPartIds.map((partId) => {
            const actual = assembly.partPosition(partId);
            const staged = plan.stagingByPartId[partId]?.position;
            if (!actual || !staged) return Number.POSITIVE_INFINITY;
            return Math.hypot(
              actual[0] - staged[0],
              actual[1] - staged[1],
              actual[2] - staged[2],
            );
          }),
        );
      }),
    )
    .toBeLessThan(0.001);
  const grounded = await page.evaluate(() => {
    const plan = window.__mechAssembly?.plan();
    if (!plan) return 1;
    return Math.max(
      ...Object.values(plan.stagingByPartId).map((slot) =>
        Math.abs(slot.position[1] - slot.groundOffset - plan.stagingGroundY),
      ),
    );
  });
  expect(grounded).toBeCloseTo(0, 10);

  await page.getByTestId("explode-slider").fill("1");
  await page
    .locator('.viewer-toolbar .range-control input[type="range"]')
    .first()
    .fill("0.5");
  expect(
    await page.evaluate(() => window.__mechAssembly?.state()),
  ).toMatchObject({ explode: 0, mode: "step" });

  await page.getByTestId("assembly-reassemble").click();
  await page.getByTestId("explode-slider").fill("1");
  const settlingStartedAt = await page.evaluate(() => {
    const assembly = window.__mechAssembly;
    if (!assembly) throw new Error("Assembly hook is unavailable");
    const partIds = assembly.plan().orderedPartIds;
    for (const partId of partIds) assembly.seat(partId, 0, 1);
    return performance.now();
  });
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__mechAssembly?.state().completionProgress ?? 1,
        ),
      { intervals: [16], timeout: 1_500 },
    )
    .toBeLessThan(1);
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__mechAssembly?.state().completionProgress ?? 0,
        ),
      { intervals: [16], timeout: 1_500 },
    )
    .toBe(1);
  const settled = await page.evaluate(() => ({
    elapsed: performance.now(),
    state: window.__mechAssembly?.state(),
    supportsExistingSemantics:
      typeof window.__mechAssembly?.advanceStep === "function" &&
      typeof window.__mechAssembly?.enterStepMode === "function" &&
      typeof window.__mechAssembly?.exitAssembly === "function" &&
      typeof window.__mechAssembly?.seat === "function" &&
      typeof window.__mechAssembly?.selectPart === "function",
  }));
  expect(settled.elapsed - settlingStartedAt).toBeGreaterThanOrEqual(540);
  expect(settled.elapsed - settlingStartedAt).toBeLessThanOrEqual(750);
  expect(settled.state).toMatchObject({
    complete: true,
    completionProgress: 1,
    explode: 0,
    transmissionEnabled: true,
  });
  expect(settled.supportsExistingSemantics).toBe(true);
});

test("F0-T9: wheel tap selects, wheel drag drives, and orbit drag does not select", async ({
  page,
}) => {
  test.setTimeout(45_000);
  await page.goto("/#/m/odometer");
  await waitForMechanica(page, "odometer");
  await waitForCamera(page);
  const englishToggle = page.getByRole("button", { name: "EN", exact: true });
  if ((await englishToggle.count()) > 0) await englishToggle.click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.evaluate(() => window.__mechSelect?.(null));

  const beforeDrive = await page.evaluate(
    () => window.__mech?.graph.state().zulun ?? 0,
  );
  await dragDriveGizmo(page, "drive-gizmo-zulun");
  const afterDrive = await page.evaluate(
    () => window.__mech?.graph.state().zulun ?? 0,
  );
  expect(Math.abs(afterDrive - beforeDrive)).toBeGreaterThan(0.01);
  await expect(page.getByTestId("part-inspector")).toHaveAttribute(
    "data-selected-part-id",
    "",
  );

  const wheelPoint = await hoverDriveGizmo(page, "drive-gizmo-zulun");
  await page.mouse.click(wheelPoint.x, wheelPoint.y);
  await expect(page.getByTestId("part-inspector")).toHaveAttribute(
    "data-selected-part-id",
    "zulun",
  );
  await expect(page.getByTestId("part-inspector")).toContainText(
    "Left road wheel",
  );
  await expect(
    page.getByTestId("part-inspector").locator(".provenance-badge"),
  ).toBeVisible();

  await page.evaluate(() => window.__mechSelect?.(null));
  await expect(page.getByTestId("part-inspector")).toHaveAttribute(
    "data-selected-part-id",
    "",
  );
  const platformPoint = await page.evaluate(() =>
    window.__mech?.partScreenPoint("platform"),
  );
  if (!platformPoint) throw new Error("The odometer platform is unavailable");
  const cameraBefore = await page.evaluate(() => window.__mech?.cameraState());
  await page.mouse.move(platformPoint.x, platformPoint.y);
  await page.mouse.down();
  await page.mouse.move(platformPoint.x + 80, platformPoint.y + 36, {
    steps: 8,
  });
  await page.mouse.up();
  await page.waitForTimeout(100);
  const cameraAfter = await page.evaluate(() => window.__mech?.cameraState());
  const cameraDisplacement = Math.hypot(
    ...((cameraAfter?.position ?? [0, 0, 0]).map(
      (value, axis) => value - (cameraBefore?.position[axis] ?? 0),
    ) as [number, number, number]),
  );
  expect(cameraDisplacement).toBeGreaterThan(
    (cameraBefore?.sphereRadius ?? 1) * 0.01,
  );
  await expect(page.getByTestId("part-inspector")).toHaveAttribute(
    "data-selected-part-id",
    "",
  );
});

test("U6: spotlight completes after its ordered highlight sequence", async ({
  page,
}) => {
  await page.goto("/#/m/demo");
  await waitForMechanica(page);
  await page.evaluate(() => {
    const caption = document.querySelector<HTMLElement>(
      '[data-testid="event-captions"]',
    );
    const canvas = document.querySelector<HTMLElement>(".viewer-canvas");
    if (!caption || !canvas)
      throw new Error("Spotlight event surface is unavailable");
    const record = () => {
      const event = caption.textContent?.trim();
      const events =
        canvas.dataset.spotlightEvents?.split("\n").filter(Boolean) ?? [];
      if (event && events.at(-1) !== event) {
        canvas.dataset.spotlightEvents = [...events, event].join("\n");
      }
    };
    record();
    new MutationObserver(record).observe(caption, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });
  await page.getByTestId("spotlight-play").click();
  await expect(page.locator(".viewer-canvas")).toHaveAttribute(
    "data-spotlight-active",
    "true",
  );
  await expect(page.locator(".spotlight-done")).toBeVisible({
    timeout: 10_000,
  });
  const events = await page
    .locator(".viewer-canvas")
    .getAttribute("data-spotlight-events");
  const highlighted =
    "The mechanism enters its next working state · Large driven gear";
  const completed = "The demonstration is complete · Large driven gear";
  expect(events).toContain(highlighted);
  expect(events?.indexOf(highlighted)).toBeLessThan(
    events?.indexOf(completed) ?? -1,
  );
});

test("F0-T2: twenty spotlight toggles keep renderer memory flat", async ({
  page,
}) => {
  await page.goto("/#/m/demo");
  await waitForMechanica(page);
  await expect
    .poll(() => page.evaluate(() => window.__mech?.memory().geometries ?? 0))
    .toBeGreaterThan(0);
  await page.waitForTimeout(500);
  const before = await page.evaluate(() => window.__mech?.memory());

  await page.evaluate(async () => {
    const spotlight = document.querySelector<HTMLButtonElement>(
      '[data-testid="spotlight-play"]',
    );
    if (!spotlight) throw new Error("Spotlight control is unavailable");
    for (let toggle = 0; toggle < 20; toggle += 1) {
      spotlight.click();
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    }
  });
  await page.waitForTimeout(500);

  expect(await page.evaluate(() => window.__mech?.memory())).toEqual(before);
});

test("F0-T3: procedural textures stay bounded on retained material paths", async ({
  page,
}) => {
  for (const slug of ["loom", "astroclock"] as const) {
    await page.goto(`/#/m/${slug}`);
    await waitForMechanica(page, slug);
    const result = await page.evaluate(() => ({
      renderer: window.__mech?.memory(),
      textures: window.__mech?.warmTextures(),
    }));
    expect(result.textures?.entries).toBeGreaterThan(0);
    expect(result.textures?.generationMs).toBeGreaterThan(0);
    expect(result.textures?.generationMs).toBeLessThanOrEqual(200);
    expect(result.renderer?.textures).toBeLessThanOrEqual(40);
  }
});

test("F0-T4: all authored home cameras pass the framing gate", async ({
  page,
}) => {
  test.setTimeout(90_000);
  for (const slug of machineSlugs) {
    await page.goto(`/#/m/${slug}`);
    await waitForMechanica(page, slug);
    await waitForCamera(page);
    const result = await page.evaluate(() => ({
      fill: window.__mech?.frameFill() ?? 0,
      state: window.__mech?.cameraState() ?? null,
    }));

    expect(result.state, `${slug} camera diagnostics`).not.toBeNull();
    expect(result.fill, `${slug} frame fill`).toBeGreaterThanOrEqual(0.45);
    expect(result.fill, `${slug} frame fill`).toBeLessThanOrEqual(0.8);
    expect(
      result.state?.geometryReadyAt ?? Number.POSITIVE_INFINITY,
      `${slug} geometry readiness`,
    ).toBeLessThanOrEqual(
      result.state?.introStartedAt ?? Number.NEGATIVE_INFINITY,
    );
    expect(result.state?.introCompletedAt).toBeGreaterThan(
      result.state?.introStartedAt ?? Number.POSITIVE_INFINITY,
    );
    expect(result.state?.introStartDistance).toBeCloseTo(
      (result.state?.homeDistance ?? 0) * 1.35,
      4,
    );
    expect(result.state?.controlsEnabled).toBe(true);
  }
});

test("F0-T4: exploded state refits the retained model", async ({
  page,
}) => {
  await page.goto("/#/m/odometer");
  await waitForMechanica(page, "odometer");
  await waitForCamera(page);
  await openAdvancedControls(page);
  const before = await page.evaluate(() => window.__mech?.cameraState());
  expect(before?.introStartDistance).toBeGreaterThan(
    before?.sphereRadius ?? Number.POSITIVE_INFINITY,
  );

  for (const value of ["0.25", "0.65", "1"]) {
    await page.getByTestId("explode-slider").fill(value);
  }
  await expect
    .poll(() => page.evaluate(() => window.__mech?.cameraState()?.refitCount))
    .toBeGreaterThan(before?.refitCount ?? 0);
  await waitForCamera(page);
  const after = await page.evaluate(() => window.__mech?.cameraState());

  expect(after?.position).not.toEqual(before?.position);
  expect(await page.evaluate(() => window.__mech?.frameFill() ?? 0)).toBeLessThanOrEqual(0.8);
});

test("F0-T4: spotlight hands its target back before the first orbit", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/#/m/astroclock");
  await waitForMechanica(page, "astroclock");
  await waitForCamera(page);
  await page.getByTestId("spotlight-play").click();
  await expect(page.locator(".spotlight-done")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator(".viewer-canvas")).toHaveAttribute(
    "data-spotlight-active",
    "false",
  );
  await waitForCamera(page);
  const before = await page.evaluate(() => window.__mech?.cameraState());
  const canvas = page.locator(".viewer-canvas canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Viewer canvas is unavailable");
  const startX = box.x + box.width * 0.82;
  const startY = box.y + box.height * 0.28;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 2, startY + 2);
  await page.mouse.up();
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => window.__mech?.cameraState());
  const distance = before?.cameraDistance ?? 0;
  const targetDrift = Math.hypot(
    ...((after?.target ?? [0, 0, 0]).map(
      (value, axis) => value - (before?.target[axis] ?? 0),
    ) as [number, number, number]),
  );
  const distanceDrift = Math.abs(
    (after?.cameraDistance ?? 0) - (before?.cameraDistance ?? 0),
  );
  const cameraDisplacement = Math.hypot(
    ...((after?.position ?? [0, 0, 0]).map(
      (value, axis) => value - (before?.position[axis] ?? 0),
    ) as [number, number, number]),
  );

  expect(targetDrift).toBeLessThan((before?.sphereRadius ?? 1) * 1e-5);
  expect(distanceDrift).toBeLessThan(distance * 0.001);
  expect(cameraDisplacement).toBeLessThan(distance * 0.02);

  await page.goto("/#/m/seismoscope");
  await waitForMechanica(page, "seismoscope");
  await waitForCamera(page);
  const seismoscopeBefore = await page.evaluate(() =>
    window.__mech?.cameraState(),
  );
  await page.getByTestId("spotlight-play").click();
  await expect(page.locator(".spotlight-done")).toBeVisible({
    timeout: 10_000,
  });
  await waitForCamera(page);
  const seismoscopeAfter = await page.evaluate(() =>
    window.__mech?.cameraState(),
  );
  expect(seismoscopeAfter?.refitCount).toBe(seismoscopeBefore?.refitCount);

  await page.goto("/#/m/seismoscope");
  await waitForMechanica(page, "seismoscope");
  await waitForCamera(page);
  const manualBefore = await page.evaluate(() => window.__mech?.cameraState());
  await page.getByTestId("spotlight-play").click();
  const schemeSelect = page.getByRole("combobox", {
    name: "Reconstruction",
  });
  await expect(schemeSelect).toHaveValue("fengrui");
  await schemeSelect.selectOption("wangzhenduo");
  await expect(page.locator(".spotlight-done")).toBeVisible({
    timeout: 10_000,
  });
  await waitForCamera(page);
  const manualAfter = await page.evaluate(() => window.__mech?.cameraState());
  expect(manualAfter?.refitCount).toBe((manualBefore?.refitCount ?? 0) + 1);

  await page.goto("/#/m/loom");
  await waitForMechanica(page, "loom");
  await waitForCamera(page);
  const loomBefore = await page.evaluate(() =>
    window.__mech?.cameraState(),
  );
  await page.getByTestId("spotlight-play").click();
  await expect(page.locator(".spotlight-done")).toBeVisible({
    timeout: 10_000,
  });
  await waitForCamera(page);
  const loomAfter = await page.evaluate(() => window.__mech?.cameraState());
  expect(loomAfter?.refitCount).toBe(loomBefore?.refitCount);
});

test("U6: all four machine spotlights complete within ten seconds", async ({
  page,
}) => {
  test.setTimeout(120_000);
  for (const slug of machineSlugs) {
    await page.goto(`/#/m/${slug}`);
    await waitForMechanica(page, slug);
    await page.getByTestId("spotlight-play").click();
    await expect(page.getByTestId("event-captions")).toContainText(
      "The demonstration is complete",
      { timeout: 10_000 },
    );
    await expect(page.locator(".spotlight-done")).toBeVisible({
      timeout: 10_000,
    });
    if (
      ["seismoscope", "loom"].includes(slug)
    ) {
      await expect(
        page.getByTestId("spotlight-semantic-readout"),
      ).toBeVisible();
    }

    if (slug === "seismoscope") {
      await expect(
        page.locator(".viewer-sidebar .scheme-select").first(),
      ).toHaveValue("fengrui");
      expect(
        await page.evaluate(
          () => (window.__mech?.graph.state()["ball-6"] ?? 0) > 0,
        ),
      ).toBe(true);
    }
    if (slug === "loom") {
      await expect(page.getByTestId("loom-pattern-swatches")).toContainText(
        "▦▦▦ · ◆◇◆",
      );
    }
  }
});

test("U6 semantics: astroclock stages sourced captions", async ({
  page,
}) => {
  await page.goto("/#/m/astroclock");
  await waitForMechanica(page, "astroclock");
  await page.getByTestId("spotlight-play").click();
  await expect(page.locator(".spotlight-done")).toBeVisible({
    timeout: 10_000,
  });
  const stages = await page
    .getByTestId("spotlight-source-transcript")
    .innerText();
  for (const phrase of [
    "scoop fills",
    "fork yields",
    "iron tooth opens",
    "advances one cell",
    "locks catch",
  ]) {
    expect(stages.toLowerCase()).toContain(phrase);
  }
  expect(stages).toContain("新儀象法要");
});

test("gallery exposes four layers, attribution, lightbox, and offline fallback", async ({
  page,
}) => {
  test.setTimeout(90_000);
  for (const slug of machineSlugs) {
    await page.goto(`/#/m/${slug}`);
    await waitForMechanica(page, slug, false);
    const tabs = page.locator("[data-gallery-layer]");
    await expect(tabs).toHaveCount(4);
    const renderPanel = page.locator('[data-gallery-panel="reconstruction"]');
    await expect(renderPanel.getByTestId("image-credit")).toHaveCount(4);
    const renderImages = renderPanel.locator("img");
    await expect(renderImages).toHaveCount(4);
    await expect(
      renderPanel.locator('a[href="https://opensource.org/license/mit"]'),
    ).toHaveCount(4);
    await renderImages.first().scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        renderImages.evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
      )
      .toBe(true);
    if (!["astroclock", "seismoscope", "odometer"].includes(slug)) continue;
    for (const layer of [
      "reconstruction",
      "classical",
      "museum",
      "collection",
    ]) {
      await page.locator(`[data-gallery-layer="${layer}"]`).click();
      await expect(
        page.locator(`[data-gallery-panel="${layer}"]`),
      ).toBeVisible();
    }
    await page.context().setOffline(true);
    await page.getByTestId("tab-collection").click();
    await expect(page.locator(".gallery-link-fallback").first()).toBeVisible();
    await page.context().setOffline(false);
  }

  await page.goto("/#/m/astroclock");
  await waitForMechanica(page, "astroclock", false);
  await page.getByTestId("tab-museum").click();
  const credit = page
    .locator('[data-gallery-panel="museum"]:visible')
    .getByTestId("image-credit")
    .first();
  await expect(credit).toContainText(/CC|Public domain/);
  await expect(
    credit.locator(".gallery-attribution a").first(),
  ).toHaveAttribute("href", /.+/);
  await credit.locator(".gallery-image-button").click();
  await expect(page.getByTestId("gallery-lightbox")).toBeVisible();
  await page.getByTestId("gallery-lightbox-close").click();
  await expect(page.getByTestId("gallery-lightbox")).toHaveCount(0);
});

test("U5 mock: docent streams a grounded answer with a citation chip", async ({
  page,
}) => {
  await page.goto("/#/m/odometer");
  await waitForMechanica(page, "odometer");
  await page.getByRole("button", { name: "Ask the docent" }).click();
  await page.locator(".docent-suggestion").first().click();
  await expect(page.getByTestId("docent-citation")).toBeVisible();
  await expect(page.locator(".docent-message-assistant")).not.toHaveText("");
});

test("English UI has no Chinese leakage across three machines", async ({
  page,
}) => {
  for (const slug of ["astroclock", "loom", "odometer"] as const) {
    await page.goto(`/#/m/${slug}`);
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await waitForMechanica(page, slug);
    await page.evaluate(() => {
      const partId = window.__mech?.spec.parts[0]?.id;
      if (partId) window.__mechSelect?.(partId);
    });
    const mainText = await page.locator("main").evaluate((main) => {
      const copy = main.cloneNode(true) as HTMLElement;
      copy
        .querySelectorAll(
          '[data-source-id], [data-testid="machine-evidence-register"], [data-testid="part-inspector"], .gallery-attribution, .gallery-attribution-text',
        )
        .forEach((node) => node.remove());
      return copy.innerText;
    });
    expect(mainText).not.toMatch(/[\u3400-\u9fff]/u);
  }
});

test("G6.3: cold homepage largest-contentful paint stays under three seconds", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const target = window as Window & { __mechanicaLcp?: number };
    target.__mechanicaLcp = 0;
    new PerformanceObserver((list) => {
      const entry = list.getEntries().at(-1);
      if (entry) target.__mechanicaLcp = entry.startTime;
    }).observe({ buffered: true, type: "largest-contentful-paint" });
  });
  await page.goto("/");
  await expect(page.getByTestId("machine-card")).toHaveCount(4);
  await page.waitForTimeout(750);
  const lcp = await page.evaluate(
    () => (window as Window & { __mechanicaLcp?: number }).__mechanicaLcp ?? 0,
  );
  test.info().annotations.push({
    description: `${lcp.toFixed(1)} ms`,
    type: "homepage LCP",
  });
  expect(lcp).toBeGreaterThan(0);
  expect(lcp).toBeLessThan(3_000);
});

test("G6.3: every machine reconstruction stays under 150k triangles", async ({
  page,
}) => {
  test.setTimeout(90_000);
  for (const slug of machineSlugs) {
    await page.goto(`/#/m/${slug}`);
    await waitForMechanica(page, slug);
    const select = page.locator(".viewer-sidebar .scheme-select").first();
    const schemeIds = (await select.count())
      ? await select
          .locator("option")
          .evaluateAll((options) =>
            options
              .map((option) => (option as HTMLOptionElement).value)
              .filter(Boolean),
          )
      : [];
    const states = schemeIds.length > 0 ? schemeIds : ["default"];

    for (const schemeId of states) {
      if (schemeId !== "default" && (await select.inputValue()) !== schemeId) {
        await select.selectOption(schemeId);
        await expect(page.locator(".viewer-canvas")).toHaveAttribute(
          "data-scheme-transition",
          "false",
          { timeout: 2500 },
        );
      }
      await expect
        .poll(() => page.evaluate(() => window.__mech?.triangles() ?? 0))
        .toBeGreaterThan(0);
      const triangles = await page.evaluate(
        () => window.__mech?.triangles() ?? 0,
      );
      test.info().annotations.push({
        description: `${triangles}`,
        type: `${slug}/${schemeId} triangles`,
      });
      expect(triangles, `${slug}/${schemeId}`).toBeLessThan(150_000);
    }
  }
});

test("F0-T6: all machine scenes stay noninteractive, bounded, and optional", async ({
  page,
}) => {
  test.setTimeout(90_000);
  for (const slug of machineSlugs) {
    await page.goto(`/#/m/${slug}`);
    await waitForMechanica(page, slug);
    await waitForCamera(page);
    const canvas = page.locator(".viewer-canvas");
    await expect(canvas).toHaveAttribute("data-scene-enabled", "true");
    await expect(page.getByTestId("scene-toggle")).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.__mech?.sceneryTriangles() ?? 0))
      .toBeGreaterThan(0);
    const withScene = await page.evaluate(() => ({
      machine: window.__mech?.triangles() ?? 0,
      raycastViolations:
        window.__mech?.sceneryRaycastViolations() ?? Number.POSITIVE_INFINITY,
      scenery: window.__mech?.sceneryTriangles() ?? Number.POSITIVE_INFINITY,
    }));
    expect(withScene.raycastViolations, slug).toBe(0);
    expect(withScene.scenery, slug).toBeLessThanOrEqual(30_000);

    await page.getByTestId("scene-toggle").click();
    await expect(canvas).toHaveAttribute("data-scene-enabled", "false");
    await expect
      .poll(() => page.evaluate(() => window.__mech?.sceneryTriangles() ?? -1))
      .toBe(0);

    await page.getByTestId("scene-toggle").click();
    await expect(canvas).toHaveAttribute("data-scene-enabled", "true");
    await expect
      .poll(() => page.evaluate(() => window.__mech?.sceneryTriangles() ?? 0))
      .toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__mech?.triangles() ?? 0)).toBe(
      withScene.machine,
    );
  }
});

test("F0-T10: seismoscope comparison renders during interaction and sleeps while idle", async ({
  page,
}) => {
  await page.goto("/#/m/seismoscope");
  await waitForMechanica(page, "seismoscope");
  await page.getByTestId("compare-toggle").click();
  const canvases = page.locator(".compare-viewport canvas");
  await expect(canvases).toHaveCount(2);
  expect(await sampleCompareIdleFrames(page)).toEqual([0, 0]);
  const beforeDrive = await Promise.all([
    canvases.nth(0).screenshot(),
    canvases.nth(1).screenshot(),
  ]);
  await page.evaluate(() => window.__mechCompare?.resetFrameCounts());
  await page.getByTestId("compare-drive-forward").click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window.__mechCompare?.frameCounts ?? []).every((count) => count > 0),
      ),
    )
    .toBe(true);
  const afterDrive = await Promise.all([
    canvases.nth(0).screenshot(),
    canvases.nth(1).screenshot(),
  ]);
  expect(afterDrive[1]).not.toEqual(beforeDrive[1]);
  const schemeResponse = await page.evaluate(() =>
    (window.__mechCompare?.graphs ?? []).map((graph) => {
      const state = graph.state();
      return {
        duzhu: state.duzhu,
        releasedBalls: Object.entries(state).filter(
          ([partId, value]) => partId.startsWith("ball-") && value > 0,
        ).length,
      };
    }),
  );
  expect(schemeResponse).toEqual([
    { duzhu: 0.02, releasedBalls: 0 },
    { duzhu: 0.14, releasedBalls: 1 },
  ]);
  const frameRates = await sampleCompareInteractionFrameRates(page, 3);
  expect(frameRates).toHaveLength(2);
  test.info().annotations.push({
    description: frameRates.map((rate) => rate.toFixed(1)).join(" / "),
    type: "seismoscope compare fps left / right",
  });
  expect(Math.min(...frameRates)).toBeGreaterThanOrEqual(40);
  expect(await sampleCompareIdleFrames(page)).toEqual([0, 0]);
});

test("F0-T10: astroclock comparison is full resolution, interactive, and idle on demand", async ({
  page,
}) => {
  await page.goto("/#/m/astroclock");
  await waitForMechanica(page);
  await page.getByTestId("compare-toggle").click();
  const canvases = page.locator(".compare-viewport canvas");
  await expect(canvases).toHaveCount(2);
  await expect(page.locator(".compare-resolution-notice")).toHaveCount(0);
  const renderScales = await canvases.evaluateAll((elements) =>
    elements.map((element) => {
      const canvas = element as HTMLCanvasElement;
      return canvas.width / canvas.getBoundingClientRect().width;
    }),
  );
  expect(Math.min(...renderScales)).toBeGreaterThanOrEqual(1);
  const frameRates = await sampleCompareInteractionFrameRates(page, 3);
  expect(frameRates).toHaveLength(2);
  test.info().annotations.push({
    description: frameRates.map((rate) => rate.toFixed(1)).join(" / "),
    type: "astroclock compare fps left / right",
  });
  expect(Math.min(...frameRates)).toBeGreaterThanOrEqual(25);
  expect(await sampleCompareIdleFrames(page)).toEqual([0, 0]);
});

test("F0-T10: the main viewer idles on demand, resumes, and budgets shadows", async ({
  page,
}) => {
  await page.goto("/#/m/loom");
  await waitForMechanica(page, "loom");
  await waitForCamera(page);
  const refitCount = await page.evaluate(
    () => window.__mech?.cameraState()?.refitCount ?? 0,
  );
  await page.setViewportSize({ height: 900, width: 1_600 });
  await expect
    .poll(() => page.evaluate(() => window.__mech?.cameraState()?.refitCount))
    .toBeGreaterThan(refitCount);
  expect(
    await page.evaluate(() => window.__mech?.frameFill()),
  ).toBeLessThanOrEqual(0.8);
  await expect
    .poll(() => page.evaluate(() => window.__mech?.shadowState().configured))
    .toBe(true);
  expect(await page.evaluate(() => window.__mech?.shadowState())).toMatchObject(
    {
      castingLights: 1,
      configured: true,
      mapSize: 1024,
    },
  );
  expect(
    await page.evaluate(() => window.__mech?.shadowState().casters ?? 0),
  ).toBeGreaterThan(0);
  expect(
    await page.evaluate(() => window.__mech?.shadowState().suppressed ?? 0),
  ).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__mech?.idleState().timeoutMs)).toBe(
    30_000,
  );

  await page.evaluate(() => window.__mech?.forceIdle());
  await expect
    .poll(() => page.evaluate(() => window.__mech?.idleState()))
    .toMatchObject({ autoPaused: true, demand: true, paused: true });
  await expect(page.getByTestId("idle-chip")).toHaveText(
    "Auto-paused · move to resume",
  );
  await expect(page.locator(".viewer-canvas")).toHaveAttribute(
    "data-frameloop",
    "demand",
  );
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__mech?.resetFrameCount());
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__mech?.frameCount())).toBe(0);

  const viewer = await page.locator(".viewer-page").boundingBox();
  if (!viewer) throw new Error("Viewer interaction surface is unavailable");
  await page.mouse.move(viewer.x + 8, viewer.y + 8);
  await expect
    .poll(() => page.evaluate(() => window.__mech?.idleState()))
    .toMatchObject({ autoPaused: false, demand: false, paused: false });
  await expect(page.getByTestId("idle-chip")).toHaveCount(0);
  await expect(page.locator(".viewer-canvas")).toHaveAttribute(
    "data-frameloop",
    "always",
  );

  await page.evaluate(() => window.__mech?.forceIdle());
  await expect
    .poll(() => page.evaluate(() => window.__mech?.idleState().paused))
    .toBe(true);
  await page.goto("/");
  await page.goto("/#/m/loom");
  await waitForMechanica(page, "loom");
  expect(await page.evaluate(() => window.__mech?.idleState())).toMatchObject({
    autoPaused: false,
    demand: false,
    paused: false,
  });
  await expect(page.getByTestId("idle-chip")).toHaveCount(0);
});

test("F0-T10: astroclock and loom render-rate samples stay live", async ({
  page,
}) => {
  for (const slug of ["astroclock", "loom"] as const) {
    await page.goto(`/#/m/${slug}`);
    await waitForMechanica(page, slug);
    const frameRate = await sampleMachineRenderRate(page, 2);
    test.info().annotations.push({
      description: `${frameRate.toFixed(1)} fps`,
      type: `${slug} R3F render rate`,
    });
    expect(frameRate, slug).toBeGreaterThanOrEqual(25);
  }
});

test("demo animation sustains fifty frames per second for ten seconds", async ({
  page,
}) => {
  await page.goto("/#/m/demo");
  await waitForMechanica(page);
  expect(await sampleFrameRate(page, 10)).toBeGreaterThanOrEqual(50);
});
