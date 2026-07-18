import { expect, test, type Page } from "@playwright/test";

const stories = [
  { expectedSteps: 9, ingenuityStep: "feedback", slug: "astroclock" },
  {
    expectedSteps: 7,
    ingenuityStep: "mechanical-subtraction",
    slug: "chariot",
  },
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

test("story copy follows the language switch", async ({ page }) => {
  await page.goto("/#/story/chariot");
  await expect(page.getByTestId("scroll-story")).toBeVisible();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('[data-story-step="ma-jun-trial"]')).toContainText(
    "Ma Jun",
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
