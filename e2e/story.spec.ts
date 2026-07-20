import { expect, test, type Page } from "@playwright/test";

const stories = [
  { expectedSteps: 9, ingenuityStep: "feedback", slug: "astroclock" },
  {
    expectedSteps: 8,
    ingenuityStep: "west-dragon-interlock",
    slug: "seismoscope",
  },
] as const;

async function storyProgress(page: Page) {
  return Number(
    await page.getByTestId("scroll-story").getAttribute("data-story-progress"),
  );
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

async function sampleScrollFrameRate(page: Page, seconds: number) {
  const frameRate = sampleFrameRate(page, seconds);
  const deadline = Date.now() + seconds * 1_000;
  while (Date.now() < deadline) {
    await page.mouse.wheel(0, 36);
    await page.waitForTimeout(32);
  }
  return frameRate;
}

async function swipeUp(page: Page) {
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    touchPoints: [{ x: 195, y: 680 }],
    type: "touchStart",
  });
  for (const y of [630, 560, 480, 400, 320, 240]) {
    await session.send("Input.dispatchTouchEvent", {
      touchPoints: [{ x: 195, y }],
      type: "touchMove",
    });
  }
  await session.send("Input.dispatchTouchEvent", {
    touchPoints: [],
    type: "touchEnd",
  });
  await session.detach();
}

for (const story of stories) {
  test(`${story.slug} story scrolls, cites sources, and reuses spotlight`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(`/#/story/${story.slug}`);
    await expect(page.getByTestId("scroll-story")).toBeVisible();
    await expect(page.getByTestId("story-machine-stage")).toBeVisible();
    await expect(page.getByTestId("story-machine-stage")).toHaveAttribute(
      "data-machine-ready",
      "true",
      { timeout: 5_000 },
    );
    await expect(page.locator("[data-story-step]")).toHaveCount(
      story.expectedSteps,
    );

    const before = await storyProgress(page);
    await page.mouse.wheel(0, 900);
    await expect.poll(() => storyProgress(page)).toBeGreaterThan(before);

    const sourceButtons = page.locator('[data-testid^="story-source-"]');
    expect(await sourceButtons.count()).toBeGreaterThanOrEqual(3);
    for (let index = 0; index < 3; index += 1) {
      const button = sourceButtons.nth(index);
      await button.scrollIntoViewIfNeeded();
      const sourceId = await button.getAttribute("data-source-id");
      await button.click();
      await expect(page.getByTestId("story-source-panel")).toHaveAttribute(
        "data-source-id",
        sourceId ?? "",
      );
      await page.getByTestId("story-source-panel").getByRole("button").click();
      await expect(page.getByTestId("story-source-panel")).toHaveCount(0);
    }

    await page.evaluate(
      (stepId) => window.__mechStory?.goToStep(stepId),
      story.ingenuityStep,
    );
    await expect(page.getByTestId("scroll-story")).toHaveAttribute(
      "data-active-step",
      story.ingenuityStep,
      { timeout: 5_000 },
    );
    await expect(page.getByTestId("story-machine-stage")).toHaveAttribute(
      "data-machine-ready",
      "true",
      { timeout: 5_000 },
    );
    await expect
      .poll(() =>
        page
          .getByTestId("story-machine-stage")
          .getAttribute("data-spotlight-runs")
          .then(Number),
      )
      .toBeGreaterThan(0);
    await expect(page.getByTestId("story-machine-stage")).toHaveAttribute(
      "data-spotlight-active",
      "false",
      { timeout: 10_000 },
    );
    expect(await sampleScrollFrameRate(page, 1.25)).toBeGreaterThanOrEqual(45);
    expect(errors).toEqual([]);
  });
}

test("F0-T5c story scheme handoff latches prepared scenes across jumps", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  const setProgress = (progress: number) =>
    page.evaluate((targetProgress) => {
      const steps = [
        ...document.querySelectorAll<HTMLElement>("[data-story-step]"),
      ];
      const first = steps.at(0);
      const last = steps.at(-1);
      if (!first || !last) throw new Error("Story steps are unavailable");
      const firstCenter =
        first.getBoundingClientRect().top +
        window.scrollY +
        first.offsetHeight / 2;
      const lastCenter =
        last.getBoundingClientRect().top +
        window.scrollY +
        last.offsetHeight / 2;
      window.scrollTo({
        behavior: "auto",
        top:
          firstCenter +
          targetProgress * (lastCenter - firstCenter) -
          window.innerHeight / 2,
      });
    }, progress);

  await page.goto("/#/story/seismoscope");
  const stage = page.getByTestId("story-machine-stage");
  await expect(stage).toHaveAttribute("data-machine-ready", "true", {
    timeout: 5_000,
  });
  await stage.evaluate((element) => {
    element.dataset.transitionReadyDrop = "false";
    element.dataset.unpreparedRender = "false";
    const recordInvariant = () => {
      if (element.dataset.machineReady !== "true") {
        element.dataset.transitionReadyDrop = "true";
      }
      if (
        element.dataset.renderedGeometryKey ===
          element.dataset.requestedGeometryKey &&
        element.dataset.requestedGeometryPrepared !== "true"
      ) {
        element.dataset.unpreparedRender = "true";
      }
    };
    recordInvariant();
    new MutationObserver(recordInvariant).observe(element, {
      attributeFilter: [
        "data-machine-ready",
        "data-rendered-geometry-key",
        "data-requested-geometry-key",
        "data-requested-geometry-prepared",
      ],
      attributes: true,
    });
  });
  const expectPreparedRequestRendered = () =>
    expect
      .poll(async () => {
        const [prepared, renderedKey, requestedKey] = await Promise.all([
          stage.getAttribute("data-requested-geometry-prepared"),
          stage.getAttribute("data-rendered-geometry-key"),
          stage.getAttribute("data-requested-geometry-key"),
        ]);
        return prepared === "true" && renderedKey === requestedKey;
      })
      .toBe(true);

  await setProgress(3.25 / 7);
  await expect(stage).toHaveAttribute("data-scheme-transition", "true");
  await expect(stage).toHaveAttribute(
    "data-requested-geometry-key",
    "seismoscope:wangzhenduo:from-active",
  );
  await expect(stage).toHaveAttribute("data-machine-ready", "true");
  await setProgress(3.75 / 7);
  await expect
    .poll(() =>
      page.evaluate(() => window.__mechStory?.state().segmentProgress),
    )
    .toBeGreaterThan(0.5);
  await expect(stage).toHaveAttribute(
    "data-requested-geometry-key",
    "seismoscope:fengrui:to-active",
  );
  await page.evaluate(() => {
    document.body.style.paddingBottom = `${window.innerHeight}px`;
  });
  await setProgress(1);
  await expect(stage).toHaveAttribute("data-scheme-transition", "false");
  await expectPreparedRequestRendered();

  await setProgress(3.75 / 7);
  await expect(stage).toHaveAttribute("data-scheme-transition", "true");
  await expect(stage).toHaveAttribute(
    "data-requested-geometry-key",
    "seismoscope:fengrui:to-active",
  );
  await expectPreparedRequestRendered();

  await setProgress(1);
  await expect(stage).toHaveAttribute("data-scheme-transition", "false");
  await expectPreparedRequestRendered();
  await setProgress(0);
  await expect.poll(() => storyProgress(page)).toBeLessThan(0.01);
  await expect(stage).toHaveAttribute("data-scheme-transition", "false");
  await expect(stage).toHaveAttribute(
    "data-requested-geometry-key",
    "seismoscope:wangzhenduo:from-active",
  );
  await expectPreparedRequestRendered();

  await expect(stage).toHaveAttribute("data-machine-ready", "true");
  await expect(stage).toHaveAttribute("data-transition-ready-drop", "false");
  await expect(stage).toHaveAttribute("data-unprepared-render", "false");
  expect(errors).toEqual([]);
});

test("story copy follows the language switch", async ({ page }) => {
  await page.goto("/#/story/seismoscope");
  await expect(page.getByTestId("scroll-story")).toBeVisible();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('[data-story-step="bronze-vessel"]')).toContainText(
    "Zhang Heng",
  );
});

test.describe("touch story navigation", () => {
  test.use({
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    viewport: { height: 844, width: 390 },
  });

  test("native touch scroll advances a story without console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/#/story/seismoscope");
    await expect(page.getByTestId("scroll-story")).toBeVisible();
    const before = await storyProgress(page);
    await swipeUp(page);
    await expect.poll(() => storyProgress(page)).toBeGreaterThan(before);
    expect(errors).toEqual([]);
  });
});
