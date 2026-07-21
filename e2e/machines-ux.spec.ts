import { expect, test } from "@playwright/test";

const MACHINES = ["astroclock", "seismoscope", "odometer", "loom"];

for (const slug of MACHINES) {
  test(`${slug}: loads with camera OUTSIDE the model (never black)`, async ({
    page,
  }) => {
    await page.goto(`/#/m/${slug}`);
    await page.waitForFunction(
      () => (window as any).__mechCamera?.boundingRadius > 0,
      undefined,
      { timeout: 30_000 },
    );
    const ok = await page.evaluate(() => {
      const cam = (window as any).__mechCamera;
      return cam.distance > cam.boundingRadius * 1.05;
    });
    expect(ok).toBe(true);
  });

  test(`${slug}: aid chips are unique and every aid activates`, async ({
    page,
  }) => {
    await page.goto(`/#/m/${slug}`);
    const chips = page.locator("[data-aid-kind]");
    await expect(chips.first()).toBeVisible({ timeout: 30_000 });
    const labels = await chips.allTextContents();
    expect(new Set(labels).size).toBe(labels.length);
    const count = await chips.count();
    for (let i = 0; i < count; i += 1) {
      await chips.nth(i).click();
      await page.waitForFunction(
        (index) => (window as any).__mechAid?.state().index === index,
        i,
      );
    }
  });
}

test("seismoscope: matched bearing fires the dragon", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/#/m/seismoscope");
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await page
    .getByTestId("bearing-picker")
    .getByRole("button", { name: "东 E", exact: true })
    .click();
  const progress = page.getByTestId("demo-progress");
  await expect(progress).toBeVisible();
  await expect(progress).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId("armed-bearing")).toContainText("东 E");
  const scheme = page.locator(".viewer-sidebar .scheme-select").first();
  await expect(scheme).toHaveValue("wangzhenduo");
  await page.getByTestId("mech-trigger-quake").click();
  await expect(page.getByTestId("event-captions")).toContainText(/ball|铜丸/, {
    timeout: 60_000,
  });
  await expect(progress).toBeHidden({ timeout: 60_000 });
  await expect(scheme).toHaveValue("wangzhenduo");
  await expect(page.getByTestId("armed-bearing")).toContainText("东 E");
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.entries(window.__mech?.graph.state() ?? {})
        .filter(([partId, value]) => partId.startsWith("ball-") && value > 0)
        .map(([partId]) => partId),
    ),
  ).toEqual(["ball-2"]);
});

test("odometer: readout counts during the decimal-distance demo", async ({
  page,
}) => {
  await page.goto("/#/m/odometer");
  await page.getByTestId("mech-trigger-spotlight").click();
  await expect(page.getByTestId("odometer-readout")).not.toHaveText(/^0\.00/, {
    timeout: 30_000,
  });
});
