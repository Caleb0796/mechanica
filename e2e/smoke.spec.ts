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

test("U2 real pointer: dragging the gimbal shell changes graph state", async ({
  page,
}) => {
  await page.goto("/#/m/gimbal");
  await waitForMechanica(page, "gimbal");
  const before = await page.evaluate(() =>
    JSON.stringify(window.__mech?.graph.state()),
  );
  const box = await page.locator(".viewer-canvas canvas").boundingBox();
  if (!box) throw new Error("Gimbal canvas is unavailable");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
  const after = await page.evaluate(() =>
    JSON.stringify(window.__mech?.graph.state()),
  );
  expect(after).not.toBe(before);
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

test("gallery exposes four layers, attribution, lightbox, and offline fallback", async ({
  page,
}) => {
  for (const slug of ["chariot", "gimbal", "chainpump"]) {
    await page.goto(`/#/m/${slug}`);
    await waitForMechanica(page, slug);
    const tabs = page.locator("[data-gallery-layer]");
    await expect(tabs).toHaveCount(4);
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
        .querySelectorAll("[data-source-id], .gallery-attribution-text")
        .forEach((node) => node.remove());
      return copy.innerText;
    });
    expect(mainText).not.toMatch(/[\u3400-\u9fff]/u);
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
