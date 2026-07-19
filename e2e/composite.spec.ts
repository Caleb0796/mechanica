import { expect, test } from "@playwright/test";

test("demo composite renders two meshes under one part transform", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/#/m/demo");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__mech?.spec.slug === "demo" &&
          typeof window.__mech.machineReady === "number",
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__mech?.partMeshCount("composite-fixture-shell") ?? 0,
      ),
    )
    .toBe(2);
  expect(
    await page.evaluate(() =>
      (window.__mech?.partMaterials("composite-fixture-shell") ?? [])
        .map((material) => material.alphaTest)
        .sort(),
    ),
  ).toEqual([0.61, 0.73]);
  expect(errors).toEqual([]);
});
