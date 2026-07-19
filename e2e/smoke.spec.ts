import { expect, test, type Page } from "@playwright/test";

const dualSchemeSlugs = [
  "astroclock",
  "seismoscope",
  "chariot",
  "wooden-ox",
  "loom",
] as const;
const machineSlugs = [
  "astroclock",
  "seismoscope",
  "chariot",
  "odometer",
  "wooden-ox",
  "loom",
  "typecase",
  "chainpump",
  "bellows",
  "gimbal",
] as const;

async function waitForMechanica(page: Page, slug?: string) {
  await expect
    .poll(() =>
      page.evaluate(
        (expectedSlug) =>
          Boolean(window.__mech) &&
          (!expectedSlug || window.__mech?.spec.slug === expectedSlug),
        slug,
      ),
    )
    .toBe(true);
}

async function waitForCamera(page: Page) {
  await expect
    .poll(() => page.evaluate(() => window.__mech?.cameraState()?.phase))
    .toBe("idle");
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

async function sampleCompareFrameRates(page: Page, seconds: number) {
  await page.evaluate(() => window.__mechCompare?.resetFrameCounts());
  await page.waitForTimeout(seconds * 1000);
  return page.evaluate(
    (sampleSeconds) =>
      window.__mechCompare?.frameCounts.map((count) => count / sampleSeconds) ??
      [],
    seconds,
  );
}

test("smoke: homepage presents the ten-machine collection", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("machine-card")).toHaveCount(10);
  await expect(page.locator(".machine-era")).toHaveCount(10);
  await expect(page.locator(".machine-principle")).toHaveCount(10);
  await expect(page.locator(".machine-thumbnail")).toHaveCount(10);
  const thumbnails = page.getByTestId("machine-thumbnail-image");
  await expect(thumbnails).toHaveCount(10);
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

test("smoke: all ten machine routes render without console errors", async ({
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
  const dragPad = page.locator(
    '[data-drive-part-id="small-gear"] .drive-drag-pad',
  );
  await expect(dragPad).toBeInViewport();
  await dragPad.hover();
  const box = await dragPad.boundingBox();
  if (!box) throw new Error("Demo gear drag handle is unavailable");
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
  const after = await page.evaluate(() => window.__mech?.graph.state());
  const smallDelta =
    (after?.["small-gear"] ?? 0) - (before?.["small-gear"] ?? 0);
  const largeDelta =
    (after?.["large-gear"] ?? 0) - (before?.["large-gear"] ?? 0);
  expect(Math.abs(smallDelta)).toBeGreaterThan(0.01);
  expect(largeDelta).toBeCloseTo(-smallDelta / 2, 8);
});

test("U2 pointer control: gimbal drive changes shell attitude", async ({
  page,
}) => {
  await page.goto("/#/m/gimbal");
  await waitForMechanica(page, "gimbal");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const before = await page.evaluate(
    () => window.__mech?.graph.state()["@attitude:outer-shell:y"] ?? 0,
  );
  await page
    .getByRole("button", { name: "Drive Openwork outer shell forward" })
    .click();
  const after = await page.evaluate(
    () => window.__mech?.graph.state()["@attitude:outer-shell:y"] ?? 0,
  );
  expect(after).not.toBeCloseTo(before, 8);
});

test("U2 pointer control: astroclock reverse lock cannot be bypassed", async ({
  page,
}) => {
  await page.goto("/#/m/astroclock");
  await waitForMechanica(page, "astroclock");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const before = await page.evaluate(
    () => window.__mech?.graph.state().shulun ?? 0,
  );
  const reverse = page.getByRole("button", {
    name: "Drive Celestial column in reverse",
  });
  await expect(reverse).toBeVisible();
  await reverse.click();

  await expect(page.getByTestId("event-captions")).toContainText(
    "blocked · tiansuo-r",
  );
  expect(
    await page.evaluate(() => window.__mech?.graph.state().shulun ?? 0),
  ).toBeCloseTo(before, 10);
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

test("seismoscope quake is inert in Wang and releases a ball in Feng", async ({
  page,
}) => {
  await page.goto("/#/m/seismoscope");
  await waitForMechanica(page, "seismoscope");

  await page.getByTestId("mech-trigger-quake").click();
  await expect(page.getByTestId("event-captions")).toContainText("inert");
  expect(
    await page.evaluate(() =>
      Object.entries(window.__mech?.graph.state() ?? {}).some(
        ([partId, value]) => partId.startsWith("ball-") && value > 0,
      ),
    ),
  ).toBe(false);

  const select = page.locator(".viewer-sidebar .scheme-select").first();
  await select.selectOption("fengrui");
  await expect(page.locator(".viewer-canvas")).toHaveAttribute(
    "data-scheme-transition",
    "false",
    { timeout: 2500 },
  );
  const drive = await page
    .locator('[data-drive-part-id="duzhu"] .drive-drag-pad')
    .boundingBox();
  if (!drive) throw new Error("Seismoscope duzhu drive handle is unavailable");
  await page.mouse.move(drive.x + drive.width / 2, drive.y + drive.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    drive.x + drive.width / 2 + 60,
    drive.y + drive.height / 2,
    { steps: 6 },
  );
  await page.mouse.up();
  await expect(page.getByTestId("event-captions")).toContainText("locked");
  expect(
    await page.evaluate(() =>
      Object.entries(window.__mech?.graph.state() ?? {})
        .filter(([partId, value]) => partId.startsWith("ball-") && value > 0)
        .map(([partId]) => partId),
    ),
  ).toEqual(["ball-6"]);
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
  await page.goto("/#/m/chariot");
  await waitForMechanica(page, "chariot");
  await page.getByTestId("compare-toggle").click();
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__mechCompare)))
    .toBe(true);
  const before = await page.evaluate(() =>
    window.__mechCompare?.graphs.map((graph) => JSON.stringify(graph.state())),
  );
  const box = await page
    .locator(".compare-viewport-left .drive-buttons")
    .first()
    .boundingBox();
  if (!box) throw new Error("Compare drive marker is unavailable");
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 100, startY, {
    steps: 10,
  });
  await page.mouse.up();
  const after = await page.evaluate(() =>
    window.__mechCompare?.graphs.map((graph) => JSON.stringify(graph.state())),
  );
  expect(after?.[0]).not.toBe(before?.[0]);
  expect(after?.[1]).not.toBe(before?.[1]);
});

test("U1: gimbal and odometer reject dependency violations then restore", async ({
  page,
}) => {
  for (const slug of ["gimbal", "odometer"]) {
    await page.goto(`/#/m/${slug}`);
    await waitForMechanica(page, slug);
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
  expect(events).toContain("spotlight:highlight · large-gear");
  expect(events?.indexOf("spotlight:highlight · large-gear")).toBeLessThan(
    events?.indexOf("spotlight:done · large-gear") ?? -1,
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

test("F0-T3: procedural textures stay bounded on instanced and openwork paths", async ({
  page,
}) => {
  await page.goto("/#/m/typecase");
  await waitForMechanica(page, "typecase");
  const typecase = await page.evaluate(() => ({
    renderer: window.__mech?.memory(),
    textures: window.__mech?.warmTextures(),
  }));

  expect(typecase.textures?.entries).toBe(10);
  expect(typecase.textures?.generationMs).toBeGreaterThan(0);
  expect(typecase.textures?.generationMs).toBeLessThanOrEqual(200);
  expect(typecase.textures?.textures).toBe(31);
  expect(typecase.renderer?.textures).toBeLessThanOrEqual(40);

  await page.goto("/#/m/gimbal");
  await waitForMechanica(page, "gimbal");
  await expect
    .poll(() => page.evaluate(() => window.__mech?.memory().textures ?? 0))
    .toBeGreaterThan(0);
  expect(
    await page.evaluate(() => window.__mech?.memory().textures ?? 0),
  ).toBeLessThanOrEqual(40);
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

test("F0-T4: chariot starts outside its bounds and explode never refits", async ({
  page,
}) => {
  await page.goto("/#/m/chariot");
  await waitForMechanica(page, "chariot");
  await waitForCamera(page);
  const before = await page.evaluate(() => window.__mech?.cameraState());
  expect(before?.introStartDistance).toBeGreaterThan(
    before?.sphereRadius ?? Number.POSITIVE_INFINITY,
  );

  for (const value of ["0.25", "0.65", "1"]) {
    await page.getByTestId("explode-slider").fill(value);
  }
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => window.__mech?.cameraState());

  expect(after?.refitCount).toBe(before?.refitCount);
  expect(after?.position).toEqual(before?.position);
  expect(after?.target).toEqual(before?.target);
});

test("F0-T4: spotlight hands its target back before the first orbit", async ({
  page,
}) => {
  await page.goto("/#/m/gimbal");
  await waitForMechanica(page, "gimbal");
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

  await page.goto("/#/m/wooden-ox");
  await waitForMechanica(page, "wooden-ox");
  await waitForCamera(page);
  const woodenOxBefore = await page.evaluate(() =>
    window.__mech?.cameraState(),
  );
  await page.getByTestId("spotlight-play").click();
  await expect(page.locator(".spotlight-done")).toBeVisible({
    timeout: 10_000,
  });
  await waitForCamera(page);
  const woodenOxAfter = await page.evaluate(() => window.__mech?.cameraState());
  expect(woodenOxAfter?.refitCount).toBe(woodenOxBefore?.refitCount);
});

test("U6: all ten machine spotlights complete within ten seconds", async ({
  page,
}) => {
  test.setTimeout(120_000);
  for (const slug of machineSlugs) {
    await page.goto(`/#/m/${slug}`);
    await waitForMechanica(page, slug);
    await page.getByTestId("spotlight-play").click();
    await expect(page.locator(".spotlight-done")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("event-captions")).toContainText(
      "spotlight:done",
    );
    if (
      [
        "seismoscope",
        "chariot",
        "wooden-ox",
        "loom",
        "typecase",
        "chainpump",
        "bellows",
        "gimbal",
      ].includes(slug)
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
    if (slug === "chariot") {
      await expect(
        page.getByTestId("spotlight-semantic-readout"),
      ).toContainText("0.0°");
    }
    if (slug === "loom") {
      await expect(page.getByTestId("loom-pattern-swatches")).toContainText(
        "▦▦▦ · ◆◇◆",
      );
    }
    if (slug === "typecase") {
      const progress = page
        .getByTestId("typecase-retrieval-race")
        .locator("progress");
      await expect(progress).toHaveCount(2);
      expect(await progress.nth(0).getAttribute("value")).toBe("100");
      expect(Number(await progress.nth(1).getAttribute("value"))).toBeLessThan(
        50,
      );
    }
    if (slug === "gimbal") {
      await expect(
        page.getByTestId("spotlight-semantic-readout"),
      ).toContainText("(<0.5°)");
    }
  }
});

test("U6 semantics: astroclock stages sourced captions and wooden ox shows force arrows", async ({
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

  await page.goto("/#/m/wooden-ox");
  await waitForMechanica(page, "wooden-ox");
  await page.getByTestId("spotlight-play").click();
  await expect(
    page.getByTestId("wooden-ox-force-marker").first(),
  ).toBeVisible();
  await expect(page.locator(".spotlight-done")).toBeVisible({
    timeout: 10_000,
  });
});

test("gallery exposes four layers, attribution, lightbox, and offline fallback", async ({
  page,
}) => {
  for (const slug of machineSlugs) {
    await page.goto(`/#/m/${slug}`);
    await waitForMechanica(page, slug);
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
    if (!["chariot", "gimbal", "chainpump"].includes(slug)) continue;
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
  await waitForMechanica(page, "astroclock");
  await page.getByTestId("tab-museum").click();
  const credit = page.getByTestId("image-credit").first();
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
  await page.goto("/#/m/gimbal");
  await waitForMechanica(page);
  await page.getByRole("button", { name: "Ask the docent" }).click();
  await page.locator(".docent-suggestion").first().click();
  await expect(page.getByTestId("docent-citation")).toBeVisible();
  await expect(page.locator(".docent-message-assistant")).not.toHaveText("");
});

test("English UI has no Chinese leakage across three machines", async ({
  page,
}) => {
  for (const slug of ["chariot", "gimbal", "odometer"]) {
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
          '[data-source-id], [data-testid="machine-evidence-register"], .gallery-attribution-text',
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
  await expect(page.getByTestId("machine-card")).toHaveCount(10);
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

test("chariot comparison sustains forty frames per second", async ({
  page,
}) => {
  await page.goto("/#/m/chariot");
  await waitForMechanica(page);
  await page.getByTestId("compare-toggle").click();
  await expect(page.locator(".compare-viewport canvas")).toHaveCount(2);
  const frameRates = await sampleCompareFrameRates(page, 3);
  expect(frameRates).toHaveLength(2);
  expect(Math.min(...frameRates)).toBeGreaterThanOrEqual(40);
});

test("astroclock comparison uses half resolution and sustains twenty-five fps", async ({
  page,
}) => {
  await page.goto("/#/m/astroclock");
  await waitForMechanica(page);
  await page.getByTestId("compare-toggle").click();
  await expect(page.locator(".compare-resolution-notice")).toContainText(
    "half-resolution",
  );
  const frameRates = await sampleCompareFrameRates(page, 3);
  expect(frameRates).toHaveLength(2);
  expect(Math.min(...frameRates)).toBeGreaterThanOrEqual(25);
});

test("demo animation sustains fifty frames per second for ten seconds", async ({
  page,
}) => {
  await page.goto("/#/m/demo");
  await waitForMechanica(page);
  expect(await sampleFrameRate(page, 10)).toBeGreaterThanOrEqual(50);
});
