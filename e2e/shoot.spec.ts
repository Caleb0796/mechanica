import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __mechAid?: {
      activate: (index?: number) => Promise<void> | void;
      state: () => { active: boolean };
    };
  }
}

declare const process: {
  env: {
    MECH_SHOOT?: string;
    MECH_SHOOT_OUT?: string;
  };
};

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
const captureStates = [
  "hover",
  "cutaway",
  "assembly-mid",
  "aid",
  "plain",
  "compare",
] as const;

type MachineSlug = (typeof machineSlugs)[number];
type CaptureState = (typeof captureStates)[number];

function includes<T extends string>(
  values: readonly T[],
  value: string,
): value is T {
  return values.includes(value as T);
}

function parseCapture(value: string): {
  slug: MachineSlug;
  state: CaptureState;
} {
  const [slug, state, extra] = value.split(":");
  if (
    extra ||
    !includes(machineSlugs, slug) ||
    !includes(captureStates, state)
  ) {
    throw new Error(
      `MECH_SHOOT must be <slug>:<state>; received ${JSON.stringify(value)}`,
    );
  }
  return { slug, state };
}

async function waitForCamera(page: Page) {
  await expect
    .poll(() => page.evaluate(() => window.__mech?.cameraState()?.phase))
    .toBe("idle");
  await page.evaluate(() => document.fonts.ready);
}

async function enterCutaway(page: Page, slug: MachineSlug) {
  if (!(await page.getByTestId("story-launch").count())) {
    throw new Error(`${slug}:cutaway has no authored story cutaway`);
  }
  await page.getByTestId("story-launch").click();
  await expect(page.getByTestId("scroll-story")).toBeVisible();
  const stepIds = await page
    .locator("[data-story-step]")
    .evaluateAll((steps) =>
      steps
        .map((step) => step.getAttribute("data-story-step"))
        .filter((step): step is string => Boolean(step)),
    );
  for (const stepId of stepIds) {
    await page.evaluate((id) => window.__mechStory?.goToStep(id), stepId);
    if (
      await page
        .getByTestId("story-machine-stage")
        .getAttribute("data-cutaway")
        .then((value) => value === "true")
    ) {
      return;
    }
  }
  throw new Error(`${slug}:cutaway has no cutaway story state`);
}

async function enterCaptureState(
  page: Page,
  slug: MachineSlug,
  state: CaptureState,
) {
  switch (state) {
    case "plain":
      return;
    case "assembly-mid":
      await page.getByRole("slider", { name: "Assembly progress" }).fill("0.5");
      return;
    case "compare":
      if (!(await page.getByTestId("compare-toggle").count())) {
        throw new Error(`${slug}:compare has no second reconstruction`);
      }
      await page.getByTestId("compare-toggle").click();
      await expect(page.getByTestId("compare-view")).toBeVisible();
      await expect(
        page.locator(".compare-viewport[data-ready='true']"),
      ).toHaveCount(2);
      return;
    case "cutaway":
      await enterCutaway(page, slug);
      return;
    case "hover": {
      const driveControl = page.locator(".drive-buttons").first();
      await expect(driveControl, `${slug}:hover drive control`).toBeVisible();
      await driveControl.hover();
      await expect(driveControl).toHaveCSS("opacity", "1");
      return;
    }
    case "aid": {
      const activated = await page.evaluate(async () => {
        if (!window.__mechAid) return false;
        await window.__mechAid.activate(0);
        return true;
      });
      if (!activated) {
        throw new Error(
          `${slug}:aid has no declarative PrincipleAid capture hook`,
        );
      }
      await expect
        .poll(() => page.evaluate(() => window.__mechAid?.state().active))
        .toBe(true);
      await expect(page.getByTestId("aid-layer")).toBeVisible();
      return;
    }
  }
}

const capture = process.env.MECH_SHOOT;
const output = process.env.MECH_SHOOT_OUT;
test.skip(!capture && !output, "MECH_SHOOT capture was not requested");

test("F0-T4 state-capture runner", async ({ page }) => {
  if (!capture || !output) {
    throw new Error("MECH_SHOOT and MECH_SHOOT_OUT must be provided together");
  }
  const { slug, state } = parseCapture(capture);
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(`/#/m/${slug}`);
  await expect
    .poll(() => page.evaluate(() => window.__mech?.spec.slug))
    .toBe(slug);
  await waitForCamera(page);
  await enterCaptureState(page, slug, state);
  await page.screenshot({ path: output });
});
