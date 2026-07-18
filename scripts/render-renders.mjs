import { spawn } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const slugs = [
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
];
const angles = ["overall", "cutaway", "mechanism-close-up", "exploded"];
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const renderRoot = join(root, "public", "assets", "renders");
const baseUrl = "http://127.0.0.1:4173";
const maxImageBytes = 300 * 1024;
const maxTotalBytes = 25 * 1024 * 1024;

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function serverIsReady() {
  try {
    const response = await fetch(baseUrl);
    return response.ok && (await response.text()).includes("<title>Mechanica");
  } catch {
    return false;
  }
}

async function runCommand(command, args) {
  const child = spawn(command, args, { cwd: root, stdio: "inherit" });
  const code = await new Promise((resolveExit) => {
    child.once("exit", resolveExit);
    child.once("error", () => resolveExit(-1));
  });
  if (code !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
}

async function ensurePreview() {
  if (await serverIsReady()) {
    throw new Error(`${baseUrl} is already serving Mechanica`);
  }

  await runCommand("pnpm", ["build"]);

  const url = new URL(baseUrl);
  const preview = spawn(
    "pnpm",
    [
      "preview",
      "--host",
      url.hostname,
      "--port",
      url.port || "4173",
      "--strictPort",
    ],
    { cwd: root, stdio: "ignore" },
  );

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (preview.exitCode !== null) {
      throw new Error(`Preview exited with code ${preview.exitCode}`);
    }
    if (await serverIsReady()) return preview;
    await delay(250);
  }

  preview.kill("SIGTERM");
  throw new Error(`Preview did not become ready at ${baseUrl}`);
}

async function waitForModel(page, slug, view) {
  await page.goto(`${baseUrl}/?render=${slug}-${view}#/m/${slug}`, {
    waitUntil: "networkidle",
  });
  const canvas = page.locator(".viewer-canvas");
  await canvas.locator("canvas").waitFor({ state: "visible" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  return canvas;
}

async function hideCaptureChrome(page) {
  await page.addStyleTag({
    content: `
      .drive-buttons,
      .story-launch-button,
      .viewer-title,
      .viewer-toolbar { visibility: hidden !important; }
    `,
  });
}

async function panCanvas(page, canvas, horizontal, vertical) {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas bounds unavailable");
  const centerX = box.x + box.width * 0.5;
  const centerY = box.y + box.height * 0.5;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(
    centerX + box.width * horizontal,
    centerY + box.height * vertical,
    { steps: 12 },
  );
  await page.mouse.up({ button: "right" });
}

async function zoomCanvas(page, canvas, steps) {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas bounds unavailable");
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  for (let step = 0; step < steps; step += 1) {
    await page.mouse.wheel(0, -180);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(350);
}

async function capture(canvas, outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  for (const quality of [82, 72, 62, 52]) {
    await canvas.screenshot({ path: outputPath, quality, type: "jpeg" });
    if (statSync(outputPath).size <= maxImageBytes) return;
  }
  throw new Error(`${outputPath} exceeds ${maxImageBytes} bytes`);
}

async function captureMachine(page, slug) {
  const outputDirectory = join(renderRoot, slug);
  let canvas = await waitForModel(page, slug, "overall");
  if (slug === "bellows") await zoomCanvas(page, canvas, 4);
  await hideCaptureChrome(page);
  await capture(canvas, join(outputDirectory, "overall.jpg"));

  canvas = await waitForModel(page, slug, "cutaway");
  const box = await canvas.boundingBox();
  if (!box) throw new Error(`Canvas bounds unavailable for ${slug}`);
  await page.mouse.move(box.x + box.width * 0.82, box.y + box.height * 0.46);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.66, box.y + box.height * 0.46, {
    steps: 12,
  });
  await page.mouse.up();
  await page.waitForTimeout(500);
  if (slug === "bellows") await zoomCanvas(page, canvas, 4);
  await hideCaptureChrome(page);
  await capture(canvas, join(outputDirectory, "cutaway.jpg"));

  canvas = await waitForModel(page, slug, "mechanism-close-up");
  if (slug === "seismoscope") {
    const closeupBox = await canvas.boundingBox();
    if (!closeupBox) throw new Error(`Canvas bounds unavailable for ${slug}`);
    await page.mouse.move(
      closeupBox.x + closeupBox.width * 0.82,
      closeupBox.y + closeupBox.height * 0.46,
    );
    await page.mouse.down();
    await page.mouse.move(
      closeupBox.x + closeupBox.width * 0.66,
      closeupBox.y + closeupBox.height * 0.46,
      { steps: 12 },
    );
    await page.mouse.up();
    await zoomCanvas(page, canvas, 4);
  } else if (slug === "chariot") {
    await panCanvas(page, canvas, 0, -0.13);
    await zoomCanvas(page, canvas, 4);
  } else if (slug === "odometer") {
    await panCanvas(page, canvas, 0, -0.24);
    await zoomCanvas(page, canvas, 5);
  } else if (slug === "chainpump") {
    await panCanvas(page, canvas, -0.25, 0);
    await zoomCanvas(page, canvas, 5);
  } else {
    await page.getByTestId("spotlight-play").click();
    await page.waitForTimeout(1950);
  }
  await hideCaptureChrome(page);
  await capture(canvas, join(outputDirectory, "mechanism-close-up.jpg"));

  canvas = await waitForModel(page, slug, "exploded");
  await page.getByTestId("explode-slider").fill("1");
  await page.waitForTimeout(1300);
  if (slug === "bellows") await zoomCanvas(page, canvas, 4);
  if (slug === "gimbal") await zoomCanvas(page, canvas, 3);
  await hideCaptureChrome(page);
  await capture(canvas, join(outputDirectory, "exploded.jpg"));
}

const preview = await ensurePreview();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  deviceScaleFactor: 1,
  viewport: { height: 1000, width: 1440 },
});
const browserErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(message.text());
});
page.on("pageerror", (error) => browserErrors.push(error.message));

try {
  for (const slug of slugs) {
    await captureMachine(page, slug);
    console.log(`${slug}: ${angles.length} renders`);
  }
} finally {
  await browser.close();
  preview?.kill("SIGTERM");
}

if (browserErrors.length > 0) {
  throw new Error(`Browser errors:\n${browserErrors.join("\n")}`);
}

let totalBytes = 0;
for (const slug of slugs) {
  for (const angle of angles) {
    const size = statSync(join(renderRoot, slug, `${angle}.jpg`)).size;
    if (size > maxImageBytes)
      throw new Error(`${slug}/${angle}.jpg is too large`);
    totalBytes += size;
  }
}
if (totalBytes > maxTotalBytes) {
  throw new Error(`Render total ${totalBytes} exceeds ${maxTotalBytes} bytes`);
}
console.log(`40 renders complete: ${totalBytes} bytes`);
