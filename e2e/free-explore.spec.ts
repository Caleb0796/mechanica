import { expect, test, type Page } from "@playwright/test";

const ROUTE = "/#/prototype/seismoscope";
type Offsets = Record<string, number[]>;

test.setTimeout(90_000);

async function openPrototype(page: Page) {
  await page.goto(ROUTE);
  await expect(page.getByTestId("free-explore")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 15_000 },
  );
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-controls-enabled",
    "true",
  );
  await expect(page.locator("canvas")).toHaveAttribute("data-floor-y", /-?\d/);
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-part-screens",
    /"toad-1"/,
  );
}

async function offsets(page: Page): Promise<Offsets> {
  return JSON.parse(
    (await page.getByTestId("free-explore").getAttribute("data-offsets"))!,
  );
}

async function offset(page: Page, partId = "lid") {
  return (await offsets(page))[partId];
}

async function cameraPosition(page: Page) {
  return (await page.locator("canvas").getAttribute("data-camera-position"))!
    .split(",")
    .map(Number);
}

async function waitUntilIdle(page: Page) {
  const prototype = page.getByTestId("free-explore");
  await expect(prototype).toHaveAttribute("data-dragging", "false");
  // Software WebGL can stretch the animation while the machine is rendering.
  await expect(prototype).toHaveAttribute("data-running", "false", {
    timeout: 30_000,
  });
  await expect(prototype).toHaveAttribute("data-settling", "false");
}

async function dragPart(
  page: Page,
  partId: string,
  dx: number,
  dy: number,
) {
  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  // Diagnostics are read-only projections of the visible parts. Let their
  // viewport coordinates follow scrolling before using real pointer input.
  await page.evaluate(() => new Promise(requestAnimationFrame));
  const [x, y] = JSON.parse(
    (await canvas.getAttribute("data-part-screens"))!,
  )[partId] as number[];
  const camera = await cameraPosition(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(page.getByTestId("free-explore")).toHaveAttribute(
    "data-dragging-part",
    partId,
  );
  await expect(canvas).toHaveAttribute("data-controls-enabled", "false");
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
  await waitUntilIdle(page);
  await expect(canvas).toHaveAttribute("data-controls-enabled", "true");
  expectSamePosition(await cameraPosition(page), camera);
}

async function expectFloorContact(page: Page, partId = "lid") {
  await expect
    .poll(async () => {
      const canvas = page.locator("canvas");
      const bottoms = JSON.parse(
        (await canvas.getAttribute("data-part-bottoms"))!,
      ) as Record<string, number>;
      return bottoms[partId] - Number(await canvas.getAttribute("data-floor-y"));
    })
    .toBeCloseTo(0, 6);
}

function expectSamePosition(actual: number[], expected: number[]) {
  actual.forEach((value, index) =>
    expect(value).toBeCloseTo(expected[index], 5),
  );
}

function expectSameOffsets(actual: Offsets, expected: Offsets) {
  for (const id of Object.keys(expected))
    expectSamePosition(actual[id], expected[id]);
}

async function choosePart(page: Page, partId: string) {
  const details = page.locator(".free-explore-keyboard");
  if ((await details.getAttribute("open")) === null)
    await page.getByText("Keyboard controls", { exact: true }).click();
  await page.getByRole("combobox", { name: "Part", exact: true }).selectOption(partId);
}

async function setMode(page: Page, mode: "Explore" | "In action") {
  const button = page.getByRole("button", { name: mode, exact: true });
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
}

async function sendTremor(
  page: Page,
  result: "caught" | "missed" | "empty" | "no-trigger",
) {
  await page.getByTestId("free-send-tremor").click();
  await expect(page.getByTestId("free-explore")).toHaveAttribute(
    "data-result",
    result,
  );
  await waitUntilIdle(page);
}

test("lid settles on the floor, can be picked up again, and does not move the camera", async ({
  page,
}) => {
  await openPrototype(page);
  await expect(page.getByText("Drag the lid", { exact: true })).toHaveCount(0);
  await dragPart(page, "lid", 125, -45);
  const first = await offset(page);
  await expectFloorContact(page);
  expect(Math.hypot(...first)).toBeGreaterThan(0.2);
  // Resting contact must stay stable after the settling animation finishes.
  await page.waitForTimeout(300);
  expectSamePosition(await offset(page), first);
  await dragPart(page, "lid", -40, 55);
  await expectFloorContact(page);
  expect(await offset(page)).not.toEqual(first);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expectSamePosition(await offset(page), first);
  await page.getByTestId("free-put-back").click();
  expectSamePosition(await offset(page), [0, 0, 0]);
  await expect(page.getByTestId("free-put-back")).toBeDisabled();
});

test("orbit, zoom, and reset preserve a displaced lid; normal exhibit remains available", async ({
  page,
}) => {
  await openPrototype(page);
  await dragPart(page, "lid", 110, -25);
  const placement = await offset(page);
  const camera = await cameraPosition(page);
  const canvas = (await page.locator("canvas").boundingBox())!;
  await page.mouse.move(
    canvas.x + canvas.width * 0.85,
    canvas.y + canvas.height * 0.8,
  );
  await page.mouse.down();
  await page.mouse.move(
    canvas.x + canvas.width * 0.75,
    canvas.y + canvas.height * 0.85,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect.poll(() => cameraPosition(page)).not.toEqual(camera);
  expectSamePosition(await offset(page), placement);
  const orbited = await cameraPosition(page);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect.poll(() => cameraPosition(page)).not.toEqual(orbited);
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  expectSamePosition(await offset(page), placement);
  await page.getByRole("link", { name: "Back to exhibit", exact: true }).click();
  await expect(page).toHaveURL(/#\/m\/seismoscope$/);
  await expect(page.getByTestId("spotlight-play")).toBeVisible();
  await expect(page.getByTestId("free-explore")).toHaveCount(0);
});

test("moving a catcher makes the ball miss, while resetting restores a catch without automatic reloading", async ({
  page,
}) => {
  await openPrototype(page);
  await dragPart(page, "toad-1", 120, -35);
  const movedCatcher = await offset(page, "toad-1");
  await expectFloorContact(page, "toad-1");
  expect(Math.hypot(...movedCatcher)).toBeGreaterThan(0.2);
  expectSamePosition(await offset(page, "ball-1"), [0, 0, 0]);
  await setMode(page, "In action");
  await expect(page.getByRole("combobox", { name: "Direction" })).toHaveValue("1");
  await page.getByTestId("free-send-tremor").click();
  await expect(page.getByTestId("free-explore")).toHaveAttribute(
    "data-running",
    "true",
  );
  await expect(page.getByTestId("free-send-tremor")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Explore", exact: true })).toBeDisabled();
  await expect(page.getByTestId("free-explore")).toHaveAttribute(
    "data-result",
    "missed",
  );
  await waitUntilIdle(page);
  await expectFloorContact(page, "ball-1");
  expectSamePosition(await offset(page, "toad-1"), movedCatcher);
  await expect(page.getByText("The ball missed its catcher and landed on the ground.")).toBeVisible();

  await page.getByRole("button", { name: "Reset all", exact: true }).click();
  for (const placement of Object.values(await offsets(page)))
    expectSamePosition(placement, [0, 0, 0]);
  await sendTremor(page, "caught");
  const caught = await offsets(page);
  expect(Math.hypot(...caught["ball-1"])).toBeGreaterThan(0.1);
  await sendTremor(page, "empty");
  expectSameOffsets(await offsets(page), caught);
});

test("a loose ball can be reloaded and a caught ball travels with its toad, including undo", async ({
  page,
}) => {
  await openPrototype(page);
  await dragPart(page, "ball-1", 135, -65);
  await expectFloorContact(page, "ball-1");
  const looseBall = await offset(page, "ball-1");
  expect(Math.hypot(...looseBall)).toBeGreaterThan(0.2);
  await setMode(page, "In action");
  await sendTremor(page, "empty");
  expectSamePosition(await offset(page, "ball-1"), looseBall);

  await setMode(page, "Explore");
  await choosePart(page, "ball-1");
  await page.getByTestId("free-put-back").click();
  expectSamePosition(await offset(page, "ball-1"), [0, 0, 0]);
  await setMode(page, "In action");
  await sendTremor(page, "caught");
  const beforeMove = await offsets(page);
  await setMode(page, "Explore");
  await dragPart(page, "toad-1", 100, -40);
  const afterMove = await offsets(page);
  const catcherDelta = afterMove["toad-1"].map(
    (value, axis) => value - beforeMove["toad-1"][axis],
  );
  const ballDelta = afterMove["ball-1"].map(
    (value, axis) => value - beforeMove["ball-1"][axis],
  );
  expect(Math.hypot(...catcherDelta)).toBeGreaterThan(0.2);
  expectSamePosition(ballDelta, catcherDelta);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expectSameOffsets(await offsets(page), beforeMove);
});

test("a ball can be picked up from the ground and dragged directly back into its dragon", async ({
  page,
}) => {
  await openPrototype(page);
  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise(requestAnimationFrame));
  const home = JSON.parse(
    (await canvas.getAttribute("data-part-screens"))!,
  )["ball-1"] as number[];
  await dragPart(page, "ball-1", 135, -65);
  await expectFloorContact(page, "ball-1");
  expect(Math.hypot(...(await offset(page, "ball-1")))).toBeGreaterThan(0.2);

  const resting = JSON.parse(
    (await canvas.getAttribute("data-part-screens"))!,
  )["ball-1"] as number[];
  await dragPart(page, "ball-1", home[0] - resting[0], home[1] - resting[1]);
  expectSamePosition(await offset(page, "ball-1"), [0, 0, 0]);
  await expect(page.getByTestId("free-explore")).toHaveAttribute(
    "data-result",
    "loaded",
  );
});

test("opening the lid exposes the sensor; removing it prevents a tremor until it is returned", async ({
  page,
}) => {
  await openPrototype(page);
  await choosePart(page, "duzhu");
  await expect(page.getByTestId("free-keyboard-move")).toBeDisabled();
  await expect(page.getByText("Lift the lid first to reach the central sensor.")).toBeVisible();
  await dragPart(page, "lid", 135, -45);
  const lid = await offset(page);
  await dragPart(page, "duzhu", -135, -50);
  await expectFloorContact(page, "duzhu");
  await setMode(page, "In action");
  const arrangement = await offsets(page);
  await sendTremor(page, "no-trigger");
  expectSameOffsets(await offsets(page), arrangement);
  await setMode(page, "Explore");
  await choosePart(page, "duzhu");
  await page.getByTestId("free-put-back").click();
  expectSamePosition(await offset(page, "duzhu"), [0, 0, 0]);
  expectSamePosition(await offset(page), lid);
  await setMode(page, "In action");
  await sendTremor(page, "caught");
});

test("a removed sensor remains movable after the lid is put back", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPrototype(page);
  await dragPart(page, "lid", 135, -45);
  await dragPart(page, "duzhu", -135, -50);
  await expectFloorContact(page, "duzhu");
  await choosePart(page, "lid");
  await page.getByTestId("free-put-back").click();
  expectSamePosition(await offset(page, "lid"), [0, 0, 0]);

  await choosePart(page, "duzhu");
  const keyboard = page.getByTestId("free-keyboard-move");
  await expect(keyboard).toBeEnabled();
  const beforeKeyboard = await offset(page, "duzhu");
  await keyboard.press("ArrowLeft");
  await waitUntilIdle(page);
  expect(await offset(page, "duzhu")).not.toEqual(beforeKeyboard);
  await expectFloorContact(page, "duzhu");

  const beforeDrag = await offset(page, "duzhu");
  await dragPart(page, "duzhu", -45, -25);
  expect(await offset(page, "duzhu")).not.toEqual(beforeDrag);
  await expectFloorContact(page, "duzhu");
  expectSamePosition(await offset(page, "lid"), [0, 0, 0]);

  await page.getByTestId("free-put-back").click();
  expectSamePosition(await offset(page, "duzhu"), [0, 0, 0]);
  await expect(keyboard).toBeDisabled();
});

test("phone layout supports part selection, dragging, and keyboard movement without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPrototype(page);
  await dragPart(page, "lid", 70, -35);
  await page.getByTestId("free-put-back").click();
  await choosePart(page, "toad-1");
  const keyboard = page.getByTestId("free-keyboard-move");
  await keyboard.press("ArrowRight");
  await waitUntilIdle(page);
  await keyboard.press("ArrowUp");
  await waitUntilIdle(page);
  await expectFloorContact(page, "toad-1");
  expect(Math.hypot(...(await offset(page, "toad-1")))).toBeGreaterThan(0.1);
  await page.getByTestId("free-put-back").click();
  expectSamePosition(await offset(page, "toad-1"), [0, 0, 0]);
  await setMode(page, "In action");
  await sendTremor(page, "caught");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "拆开看看，再试试运转。",
  );
});

test("a release near the opening reseats the lid and reduced motion skips falling", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPrototype(page);
  await dragPart(page, "lid", 5, -3);
  expectSamePosition(await offset(page), [0, 0, 0]);
  await dragPart(page, "lid", 120, -40);
  await expectFloorContact(page);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expectSamePosition(await offset(page), [0, 0, 0]);
  await setMode(page, "In action");
  await sendTremor(page, "caught");
});

test("unavailable 3D graphics shows a useful message instead of endless loading", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "WebGL2RenderingContext", {
      value: undefined,
    });
  });
  await page.goto(ROUTE);
  await expect(
    page.getByText("This prototype needs a browser with 3D graphics enabled.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Back to exhibit", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom in", exact: true })).toBeDisabled();
  await setMode(page, "In action");
  await expect(page.getByTestId("free-send-tremor")).toBeDisabled();
});
