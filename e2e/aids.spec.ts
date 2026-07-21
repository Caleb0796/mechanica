import { expect, test, type Page } from "@playwright/test";

type AidKind =
  "powerPath" | "callouts" | "flowParticles" | "cutaway" | "subDemo";

type AidState = {
  active: boolean;
  index: number | null;
  kind: AidKind | null;
  averageFrameMs: number;
  flowMode: "custom" | "points" | null;
  flowParticleCount: number;
  highlightedPartIds: string[];
  sampledFrames: number;
};

type AidHook = {
  activate: (index?: number) => Promise<void> | void;
  deactivate: () => void;
  state: () => AidState;
  projectPart: (partId: string) => { x: number; y: number } | null;
};

type BrowserAid = {
  kind: AidKind;
  anchors?: Array<{
    partId: string;
    label: { zh: string; en: string };
  }>;
  caption?: { zh: string; en: string };
  flavor?: "water" | "grain" | "thread" | "smoke" | "sparks" | "custom";
  sequence?: string[];
};

async function waitForAstroclock(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const hook = (
          window as unknown as {
            __mechAid?: AidHook;
          }
        ).__mechAid;
        return (
          window.__mech?.spec.slug === "astroclock" &&
          typeof window.__mech.machineReady === "number" &&
          Boolean(hook)
        );
      }),
    )
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.__mech?.cameraState()?.phase))
    .toBe("idle");
}

async function activateAid(page: Page, index: number, kind: AidKind) {
  await page.evaluate(async (aidIndex) => {
    const hook = (
      window as unknown as {
        __mechAid?: AidHook;
      }
    ).__mechAid;
    if (!hook) throw new Error("Principle-aid hook is unavailable");
    await hook.activate(aidIndex);
  }, index);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const hook = (
          window as unknown as {
            __mechAid?: AidHook;
          }
        ).__mechAid;
        return hook?.state();
      }),
    )
    .toMatchObject({ active: true, index, kind });
  await expect(page.getByTestId("aid-layer")).toBeVisible();
}

async function aidDefinitions(page: Page): Promise<BrowserAid[]> {
  return page.evaluate(
    () =>
      (window.__mech?.module as { aids?: BrowserAid[] } | undefined)?.aids ??
      [],
  );
}

async function calloutLabels(page: Page, language: "en" | "zh") {
  return page.evaluate((selectedLanguage) => {
    const aids =
      (window.__mech?.module as { aids?: BrowserAid[] } | undefined)?.aids ??
      [];
    const callouts = aids.find((aid) => aid.kind === "callouts");
    return Object.fromEntries(
      (callouts?.anchors ?? []).map((anchor) => [
        anchor.partId,
        anchor.label[selectedLanguage],
      ]),
    );
  }, language);
}

async function renderedCalloutLabels(page: Page) {
  return page
    .getByTestId("aid-callout")
    .evaluateAll((elements) =>
      Object.fromEntries(
        elements.map((element) => [
          element.getAttribute("data-part-id") ?? "",
          element.textContent?.trim() ?? "",
        ]),
      ),
    );
}

async function expectCalloutsAligned(page: Page) {
  const samples = await page
    .getByTestId("aid-callout-anchor")
    .evaluateAll((elements) => {
      const hook = (
        window as unknown as {
          __mechAid?: AidHook;
        }
      ).__mechAid;
      return elements.map((element) => {
        const partId = element.getAttribute("data-part-id") ?? "";
        const projected = hook?.projectPart(partId) ?? null;
        const bounds = element.getBoundingClientRect();
        return {
          distance: projected
            ? Math.hypot(
                bounds.left + bounds.width / 2 - projected.x,
                bounds.top + bounds.height / 2 - projected.y,
              )
            : null,
          partId,
        };
      });
    });

  expect(samples.length).toBeGreaterThan(0);
  for (const sample of samples) {
    expect(sample.distance, `${sample.partId} projection`).not.toBeNull();
    expect(sample.distance, `${sample.partId} projection`).toBeLessThanOrEqual(
      8,
    );
  }
}

async function expectCalloutLabelsSeparated(page: Page) {
  const labels = await page.getByTestId("aid-callout").evaluateAll((elements) =>
    elements.map((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        left: bounds.left,
        partId: element.getAttribute("data-part-id") ?? "",
        right: bounds.right,
        top: bounds.top,
      };
    }),
  );
  for (let first = 0; first < labels.length; first += 1) {
    for (let second = first + 1; second < labels.length; second += 1) {
      const a = labels[first];
      const b = labels[second];
      const overlap =
        Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 &&
        Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0;
      expect(overlap, `${a.partId} overlaps ${b.partId}`).toBe(false);
    }
  }
}

async function dragAcrossCalloutCheckpoints(
  page: Page,
  startX: number,
  startY: number,
  checkpoints: Array<{ x: number; y: number; delay: number }>,
) {
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  try {
    for (const checkpoint of checkpoints) {
      await page.mouse.move(checkpoint.x, checkpoint.y, { steps: 6 });
      await page.waitForTimeout(checkpoint.delay);
      await expectCalloutsAligned(page);
      await expectCalloutLabelsSeparated(page);
    }
  } finally {
    if (!page.isClosed()) {
      try {
        await page.mouse.up();
      } catch (error) {
        if (!page.isClosed()) throw error;
      }
    }
  }
}

test("F0-T11: astroclock principle aids remain aligned, bilingual, and responsive", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/m/astroclock");
  await waitForAstroclock(page);

  const aids = await aidDefinitions(page);
  const kinds = [...new Set(aids.map((aid) => aid.kind))];
  expect(kinds.length).toBe(5);
  expect(kinds).toEqual(
    expect.arrayContaining([
      "callouts",
      "cutaway",
      "flowParticles",
      "powerPath",
      "subDemo",
    ]),
  );

  const calloutIndex = aids.findIndex((aid) => aid.kind === "callouts");
  const cutawayIndex = aids.findIndex((aid) => aid.kind === "cutaway");
  const standardFlowIndex = aids.findIndex(
    (aid) => aid.kind === "flowParticles" && aid.flavor !== "custom",
  );
  const powerPathIndex = aids.findIndex((aid) => aid.kind === "powerPath");
  const subDemoIndex = aids.findIndex((aid) => aid.kind === "subDemo");
  expect(calloutIndex).toBeGreaterThanOrEqual(0);
  expect(cutawayIndex).toBeGreaterThanOrEqual(0);
  expect(standardFlowIndex).toBeGreaterThanOrEqual(0);
  expect(powerPathIndex).toBeGreaterThanOrEqual(0);
  expect(subDemoIndex).toBeGreaterThanOrEqual(0);

  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await activateAid(page, calloutIndex, "callouts");
  await expect(page.getByTestId("aid-callout")).toHaveCount(
    aids[calloutIndex]?.anchors?.length ?? 0,
  );
  expect(await renderedCalloutLabels(page)).toEqual(
    await calloutLabels(page, "en"),
  );

  const canvas = page.locator(".viewer-canvas canvas").first();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Astroclock canvas is unavailable");
  const startX = bounds.x + bounds.width * 0.78;
  const startY = bounds.y + bounds.height * 0.72;
  const checkpoints = [
    { x: startX - 35, y: startY - 8, delay: 167 },
    { x: startX - 70, y: startY - 12, delay: 166 },
    { x: startX - 105, y: startY - 16, delay: 167 },
  ];
  await dragAcrossCalloutCheckpoints(
    page,
    startX,
    startY,
    checkpoints,
  );

  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await waitForAstroclock(page);
  await activateAid(page, calloutIndex, "callouts");
  await expect
    .poll(() => renderedCalloutLabels(page))
    .toEqual(await calloutLabels(page, "zh"));

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const hook = (
            window as unknown as {
              __mechAid?: AidHook;
            }
          ).__mechAid;
          return hook?.state().sampledFrames ?? 0;
        }),
      { timeout: 10_000 },
    )
    .toBeGreaterThanOrEqual(60);
  const performance = await page.evaluate(() => {
    const hook = (
      window as unknown as {
        __mechAid?: AidHook;
      }
    ).__mechAid;
    return hook?.state();
  });
  expect(performance?.averageFrameMs).toBeLessThanOrEqual(2);

  await activateAid(page, powerPathIndex, "powerPath");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const hook = (
          window as unknown as {
            __mechAid?: AidHook;
          }
        ).__mechAid;
        return hook?.state().highlightedPartIds ?? [];
      }),
    )
    .toHaveLength(1);
  const highlightedPartIds = await page.evaluate(() => {
    const hook = (
      window as unknown as {
        __mechAid?: AidHook;
      }
    ).__mechAid;
    return hook?.state().highlightedPartIds ?? [];
  });
  expect(aids[powerPathIndex]?.sequence).toContain(highlightedPartIds[0]);

  await activateAid(page, standardFlowIndex, "flowParticles");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const hook = (
          window as unknown as {
            __mechAid?: AidHook;
          }
        ).__mechAid;
        return hook?.state();
      }),
    )
    .toMatchObject({ flowMode: "points", flowParticleCount: 64 });
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const hook = (
            window as unknown as {
              __mechAid?: AidHook;
            }
          ).__mechAid;
          return hook?.state().sampledFrames ?? 0;
        }),
      { timeout: 10_000 },
    )
    .toBeGreaterThanOrEqual(60);
  expect(
    await page.evaluate(() => {
      const hook = (
        window as unknown as {
          __mechAid?: AidHook;
        }
      ).__mechAid;
      return hook?.state().averageFrameMs ?? Number.POSITIVE_INFINITY;
    }),
  ).toBeLessThanOrEqual(2);

  await page.evaluate(() => {
    const hook = (
      window as unknown as {
        __mechAid?: AidHook;
      }
    ).__mechAid;
    hook?.deactivate();
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const hook = (
          window as unknown as {
            __mechAid?: AidHook;
          }
        ).__mechAid;
        return hook?.state().active ?? true;
      }),
    )
    .toBe(false);

  await activateAid(page, cutawayIndex, "cutaway");
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__mech?.partMaterials("tower-shell")[0]?.opacity ?? 1,
      ),
    )
    .toBeLessThanOrEqual(0.22);

  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await waitForAstroclock(page);
  await activateAid(page, subDemoIndex, "subDemo");
  const subDemo = page.getByTestId("aid-sub-demo");
  await expect(subDemo).toHaveText(aids[subDemoIndex]?.caption?.en ?? "");
  const driveBefore = await page.evaluate(
    () => window.__mech?.graph.state().shulun ?? 0,
  );
  await subDemo.click();
  await expect(page.locator(".viewer-canvas")).toHaveAttribute(
    "data-spotlight-active",
    "true",
  );
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__mech?.graph.state().shulun ?? 0,
        ),
      { timeout: 5_000 },
    )
    .not.toBeCloseTo(driveBefore, 8);

  expect(errors).toEqual([]);
});
