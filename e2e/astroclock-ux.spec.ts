import { expect, test } from "@playwright/test";

const ASTRO = "/#/m/astroclock";
const E2E_DEMO_SPEED = 8;

test("demo timeline paces captions and restores run state", async ({ page }) => {
  await page.goto(ASTRO);
  await page.getByTestId("event-captions").waitFor({ state: "attached" });
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="event-captions"]')!;
    (window as any).__capIntervals = [];
    let last = el.textContent ?? "";
    let lastAt = performance.now();
    new MutationObserver(() => {
      const text = el.textContent ?? "";
      if (text === last) return;
      const now = performance.now();
      if (last !== "") (window as any).__capIntervals.push(now - lastAt);
      last = text;
      lastAt = now;
    }).observe(el, { childList: true, characterData: true, subtree: true });
  });
  await page.getByTestId("mech-trigger-spotlight").click();
  const progress = page.getByRole("progressbar");
  await expect(progress).toBeVisible();
  await expect(progress).toBeHidden({
    timeout: 60_000,
  });
  const intervals: number[] = await page.evaluate(
    () => (window as any).__capIntervals,
  );
  expect(intervals.length).toBeGreaterThan(3);
  expect(Math.min(...intervals)).toBeGreaterThanOrEqual(
    1600 / E2E_DEMO_SPEED - 20,
  );
  expect(Math.max(...intervals.slice(0, 3))).toBeLessThanOrEqual(
    (3000 + 420) / E2E_DEMO_SPEED + 75,
  );
});

test("camera focuses during the beat demo", async ({ page }) => {
  await page.goto(ASTRO);
  await page.getByTestId("mech-trigger-spotlight").click();
  await page.waitForFunction(
    () => typeof (window as any).__mechDemoFocus?.focusPartId === "string",
    undefined,
    { timeout: 15_000 },
  );
});

test("five-tier demo always reports", async ({ page }) => {
  await page.goto(ASTRO);
  await page.getByTestId("mech-trigger-chime-placards").click();
  await expect(page.getByTestId("event-captions")).toContainText(
    /placard|举牌|司辰/,
    { timeout: 30_000 },
  );
});

test("all four demo buttons exist after a story round-trip (F-24)", async ({
  page,
}) => {
  await page.goto(ASTRO);
  await page.getByRole("link", { name: /story|叙事/i }).click();
  await page.getByTestId("story-back-link").click();
  for (const id of [
    "mech-trigger-spotlight",
    "mech-trigger-escapement-captions",
    "mech-trigger-drag-shulun",
    "mech-trigger-chime-placards",
  ]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
});

test("scheme selection survives story round-trip", async ({ page }) => {
  await page.goto(ASTRO);
  await page.locator("select").first().selectOption("combridge-hinged");
  await page.getByRole("link", { name: /story|叙事/i }).click();
  await page.getByTestId("story-back-link").click();
  await expect(page.locator("select").first()).toHaveValue("combridge-hinged");
});

test("power path aid runs a visible route", async ({ page }) => {
  await page.goto(ASTRO);
  await page.locator('[data-aid-kind="powerPath"]').click();
  await page.waitForFunction(() => {
    const state = (window as any).__mechAid?.state();
    return state?.kind === "powerPath" && state.highlightedPartIds.length === 1;
  });
});

test("flow particles actually resolve", async ({ page }) => {
  await page.goto(ASTRO);
  await page.getByRole("button", { name: /flow path|流动路径/i }).click();
  await page.waitForFunction(() => {
    const state = (window as any).__mechAid?.state();
    return state?.kind === "flowParticles" && state.flowParticleCount > 0;
  });
});

test("no chrome collisions at 1024x640 and 375x812", async ({ page }) => {
  for (const viewport of [
    { width: 1024, height: 640 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(ASTRO);
    const docent = page.getByRole("button", { name: /docent|馆员/i });
    const demo = page.getByTestId("mech-trigger-spotlight");
    await expect(docent).toBeVisible();
    await expect(demo).toBeVisible();
    const a = await docent.boundingBox();
    const b = await demo.boundingBox();
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    const overlap =
      a!.x < b!.x + b!.width &&
      b!.x < a!.x + a!.width &&
      a!.y < b!.y + b!.height &&
      b!.y < a!.y + a!.height;
    expect(overlap).toBe(false);
  }
});
