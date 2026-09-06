import { expect, test, type Page } from "@playwright/test";

type Offsets = Record<string, number[]>;

test.setTimeout(90_000);

async function openPrototype(page: Page) {
  await page.goto("/#/prototype/seismoscope");
  await expect(page.getByTestId("free-explore")).toHaveAttribute(
    "data-ready",
    "true",
    {
      timeout: 15_000,
    },
  );
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-part-screens",
    /"lid"/,
  );
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-controls-enabled",
    "true",
  );
  await expect(page.getByTestId("free-explore")).toHaveAttribute(
    "data-tremor-count",
    "0",
  );
}

async function offsets(page: Page): Promise<Offsets> {
  return JSON.parse(
    (await page.getByTestId("free-explore").getAttribute("data-offsets"))!,
  );
}

async function cameraPosition(page: Page) {
  return (await page.locator("canvas").getAttribute("data-camera-position"))!
    .split(",")
    .map((value) => Number(value).toFixed(6))
    .join(",");
}

async function idle(page: Page) {
  const root = page.getByTestId("free-explore");
  await expect(root).toHaveAttribute("data-dragging", "false");
  await expect(root).toHaveAttribute("data-running", "false", {
    timeout: 30_000,
  });
  await expect(root).toHaveAttribute("data-settling", "false");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-ground-displacement",
    "0,0,0",
  );
}

async function choosePart(page: Page, partId: string) {
  if (
    (await page.locator(".free-explore-keyboard").getAttribute("open")) === null
  ) {
    await page.getByText("Keyboard controls", { exact: true }).click();
  }
  await page
    .getByRole("combobox", { name: "Part", exact: true })
    .selectOption(partId);
}

async function partPoint(page: Page, partId: string): Promise<number[]> {
  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  // Projections use viewport coordinates, so let them follow any scrolling.
  await page.evaluate(() => new Promise(requestAnimationFrame));
  return JSON.parse((await canvas.getAttribute("data-part-screens"))!)[partId];
}

async function groundPoint(page: Page) {
  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  return [box.x + box.width * 0.12, box.y + box.height * 0.82];
}

function expectSameOffsets(actual: Offsets, expected: Offsets) {
  for (const [id, placement] of Object.entries(expected))
    placement.forEach((value, axis) =>
      expect(actual[id][axis]).toBeCloseTo(value, 7),
    );
}

function onlyBallMoved(before: Offsets, after: Offsets, channel: number) {
  for (const [id, placement] of Object.entries(before)) {
    if (id === `ball-${channel}`) {
      expect(
        Math.hypot(...after[id].map((value, axis) => value - placement[axis])),
      ).toBeGreaterThan(0.1);
    } else {
      placement.forEach((value, axis) =>
        expect(after[id][axis]).toBeCloseTo(value, 7),
      );
    }
  }
}

test("mouse jitter leaves a part seated and a double-click creates exactly one quake", async ({
  page,
}) => {
  await openPrototype(page);
  const root = page.getByTestId("free-explore");
  const initial = await offsets(page);
  const camera = await cameraPosition(page);
  await expect(page.getByTestId("free-shake-ground")).toHaveCount(0);
  await expect(page.getByTestId("free-quake-surface")).toHaveCount(0);
  const [x, y] = await partPoint(page, "lid");

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 3, y + 2);
  await page.mouse.up();
  expectSameOffsets(await offsets(page), initial);
  await expect(root).toHaveAttribute("data-tremor-count", "0");
  // Separate commands can turn a press into a long hold under software WebGL.
  // The native double-click batches its own two taps at a realistic cadence.
  await page.waitForTimeout(400);
  await page.mouse.dblclick(x + 3, y + 2);

  await expect(root).toHaveAttribute("data-tremor-count", "1");
  await expect(root).toHaveAttribute("data-running", "true");
  await expect(page.locator("canvas")).not.toHaveAttribute(
    "data-ground-displacement",
    "0,0,0",
  );
  await idle(page);
  await expect(root).toHaveAttribute("data-result", "caught");
  await expect(root).toHaveAttribute("data-tremor-count", "1");
  await expect(
    page.getByRole("button", { name: "Explore", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const channel = Number(await root.getAttribute("data-tremor-channel"));
  onlyBallMoved(initial, await offsets(page), channel);
  expect(await cameraPosition(page)).toBe(camera);
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-controls-enabled",
    "true",
  );
});

test("dragging takes off the lid, then a ground double-click and Undo preserve that arrangement", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPrototype(page);
  const root = page.getByTestId("free-explore");
  const camera = await cameraPosition(page);
  const [x, y] = await partPoint(page, "lid");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 120, y - 35, { steps: 6 });
  await expect(root).toHaveAttribute("data-dragging-part", "lid");
  await page.mouse.up();
  await idle(page);
  await expect(root).toHaveAttribute("data-tremor-count", "0");
  const arrangement = await offsets(page);
  expect(Math.hypot(...arrangement.lid)).toBeGreaterThan(0.2);
  expect(await cameraPosition(page)).toBe(camera);

  const [groundX, groundY] = await groundPoint(page);
  await page.mouse.dblclick(groundX, groundY);
  await expect(root).toHaveAttribute("data-tremor-count", "1");
  await expect(root).toHaveAttribute("data-result", "caught");
  await idle(page);
  const channel = Number(await root.getAttribute("data-tremor-channel"));
  onlyBallMoved(arrangement, await offsets(page), channel);
  expect(await cameraPosition(page)).toBe(camera);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(await offsets(page)).toEqual(arrangement);
});

test("a drag returning to its start and an orbit cannot become the first tap of an earthquake", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPrototype(page);
  const root = page.getByTestId("free-explore");
  const initial = await offsets(page);
  const [x, y] = await groundPoint(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y - 20, { steps: 4 });
  await page.mouse.move(x, y, { steps: 4 });
  await page.mouse.up();
  await page.mouse.click(x, y);
  await expect(root).toHaveAttribute("data-tremor-count", "0");

  const camera = await cameraPosition(page);
  await page.mouse.down();
  await page.mouse.move(x + 85, y - 25, { steps: 6 });
  await page.mouse.up();
  await page.mouse.click(x + 85, y - 25);
  await expect(root).toHaveAttribute("data-tremor-count", "0");
  await expect.poll(() => cameraPosition(page)).not.toBe(camera);
  await idle(page);
  expectSameOffsets(await offsets(page), initial);
});

test("the keyboard earthquake respects a removed sensor and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPrototype(page);
  const root = page.getByTestId("free-explore");
  await choosePart(page, "lid");
  await page.getByTestId("free-keyboard-move").press("ArrowRight");
  await idle(page);
  await choosePart(page, "duzhu");
  await page.getByTestId("free-keyboard-move").press("ArrowLeft");
  await idle(page);
  const arrangement = await offsets(page);
  expect(Math.hypot(...arrangement.duzhu)).toBeGreaterThan(0.2);
  await page.getByTestId("free-keyboard-tremor").press("Enter");
  await expect(root).toHaveAttribute("data-tremor-count", "1");
  await expect(root).toHaveAttribute("data-result", "no-trigger");
  await idle(page);
  expect(await offsets(page)).toEqual(arrangement);

  await page.getByTestId("free-put-back").click();
  expect((await offsets(page)).duzhu).toEqual([0, 0, 0]);
  const restored = await offsets(page);
  await page.getByTestId("free-keyboard-tremor").press("Space");
  await expect(root).toHaveAttribute("data-tremor-count", "2");
  await expect(root).toHaveAttribute("data-result", "caught");
  await idle(page);
  const channel = Number(await root.getAttribute("data-tremor-channel"));
  onlyBallMoved(restored, await offsets(page), channel);
  await expect(
    page.getByRole("button", { name: "Explore", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("phone touch accepts a double tap with jitter but rejects a single tap and a returning drag", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Native touch injection uses Chromium's input protocol",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPrototype(page);
  const root = page.getByTestId("free-explore");
  const initial = await offsets(page);
  const camera = await cameraPosition(page);
  const [x, y] = await partPoint(page, "lid");
  const session = await page.context().newCDPSession(page);
  // Model the physical sample times independently of slow renderer round trips.
  let touchTime = Date.now() / 1000;
  const touch = async (
    type: "touchStart" | "touchMove" | "touchEnd",
    dx = 0,
    dy = 0,
  ) => {
    await session.send("Input.dispatchTouchEvent", {
      type,
      timestamp: (touchTime += 0.04),
      touchPoints: type === "touchEnd" ? [] : [{ x: x + dx, y: y + dy, id: 1 }],
    });
  };
  try {
    await session.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 1,
    });
    await touch("touchStart");
    await touch("touchMove", 2, 1);
    await touch("touchEnd");
    await expect(root).toHaveAttribute("data-tremor-count", "0");
    expectSameOffsets(await offsets(page), initial);

    await touch("touchStart");
    await touch("touchMove", 44, -18);
    await touch("touchMove");
    await touch("touchEnd");
    await touch("touchStart");
    await touch("touchEnd");
    await idle(page);
    await expect(root).toHaveAttribute("data-tremor-count", "0");
    expectSameOffsets(await offsets(page), initial);

    // The preceding single tap must expire before starting a new pair.
    await page.waitForTimeout(650);
    touchTime = Date.now() / 1000;
    await touch("touchStart");
    await touch("touchMove", 2, 1);
    await touch("touchEnd");
    await touch("touchStart", 2, 1);
    await touch("touchEnd");
    await expect(root).toHaveAttribute("data-tremor-count", "1");
    await expect(root).toHaveAttribute("data-result", "caught");
    await idle(page);
    const channel = Number(await root.getAttribute("data-tremor-channel"));
    onlyBallMoved(initial, await offsets(page), channel);
    expect(await cameraPosition(page)).toBe(camera);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  } finally {
    await session.detach();
  }
});
