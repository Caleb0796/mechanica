// Explanation: Execute the browser test setup or assertion below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
import { expect, test, type Page } from "@playwright/test";
// Explanation: Verify the browser credit diagnostic and retained source-language controls.
// Reason: Exhausted provider credit must have a useful status while the original interface remains usable.
// Explanation: Preserve the earlier test title.
// Reason: The latest requirement uses source-only fallback with a temporary notice.
// test("translation: exhausted API credit shows an actionable status while keeping both originals", async ({ page }) => {
// Explanation: Name the current fallback behavior accurately.
// Reason: Reviewers should see what the test actually verifies.
test("translation: exhausted API credit shows a temporary popup and retains selected originals", async ({
  page,
}) => {
  // Explanation: Verify the browser credit diagnostic and retained source-language controls.
  // Reason: Exhausted provider credit must have a useful status while the original interface remains usable.
  await prepare(page);
  // Explanation: Verify the browser credit diagnostic and retained source-language controls.
  // Reason: Exhausted provider credit must have a useful status while the original interface remains usable.
  await page.route("**/api/translate", async (route) => {
    // Explanation: Verify the browser credit diagnostic and retained source-language controls.
    // Reason: Exhausted provider credit must have a useful status while the original interface remains usable.
    const body = route.request().postDataJSON();
    // Explanation: Verify the browser credit diagnostic and retained source-language controls.
    // Reason: Exhausted provider credit must have a useful status while the original interface remains usable.
    await route.fulfill({
      json: {
        results: body.items.map((item: { id: string }) => ({
          id: item.id,
          status: "uncertain",
          reason: "provider_billing_required",
        })),
      },
    });
    // Explanation: Verify the browser credit diagnostic and retained source-language controls.
    // Reason: Exhausted provider credit must have a useful status while the original interface remains usable.
  });
  // Explanation: Verify the browser credit diagnostic and retained source-language controls.
  // Reason: Exhausted provider credit must have a useful status while the original interface remains usable.
  await apply(page);
  // Explanation: Verify the browser credit diagnostic and retained source-language controls.
  // Reason: Exhausted provider credit must have a useful status while the original interface remains usable.
  await expect(page.locator(".translation-status")).toContainText("API credit");
  // Explanation: Verify the browser credit diagnostic and retained source-language controls.
  // Reason: Exhausted provider credit must have a useful status while the original interface remains usable.
  await expect(page.locator(".translation-status")).not.toContainText(
    "Translation unavailable;",
  );
  // Explanation: Verify the browser credit diagnostic and retained source-language controls.
  // Reason: Exhausted provider credit must have a useful status while the original interface remains usable.
  // Explanation: Preserve the former bilingual heading expectation.
  // Reason: Heading fallback must show only the selected English original.
  // // Explanation: Preserve the former bilingual heading expectation.
  // Reason: Heading fallback must show only the selected English original.
  // // Explanation: Preserve the former bilingual heading expectation.
  // Reason: Heading fallback must show only the selected English original.
  //   await expect(page.locator("h1")).toContainText(unknown);
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Uncertain translation must not replace the original heading.
  await expect(page.locator("h1")).toHaveText("Set ancient machines in motion");
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Uncertain translation must not replace the original heading.
  await expect(page.locator("h1")).toHaveText("Set ancient machines in motion");
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Uncertain translation must not replace the original heading.
  await expect(page.locator("h1")).toHaveText("Set ancient machines in motion");
  // Explanation: Verify the browser credit diagnostic and retained source-language controls.
  // Reason: Exhausted provider credit must have a useful status while the original interface remains usable.
  // Explanation: Preserve the former bilingual heading expectation.
  // Reason: Heading fallback must show only the selected English original.
  //   await expect(page.locator("h1")).toContainText("English:");
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Uncertain translation must not replace the original heading.
  await expect(page.locator("h1")).toHaveText("Set ancient machines in motion");
  // Explanation: Verify the browser credit diagnostic and retained source-language controls.
  // Reason: Exhausted provider credit must have a useful status while the original interface remains usable.
  await page.getByRole("button", { name: "EN", exact: true }).click();
  // Explanation: Verify the browser credit diagnostic and retained source-language controls.
  // Reason: Exhausted provider credit must have a useful status while the original interface remains usable.
  await expect(page.locator("h1")).toHaveText("Set ancient machines in motion");
  // Explanation: Verify the browser credit diagnostic and retained source-language controls.
  // Reason: Exhausted provider credit must have a useful status while the original interface remains usable.
});
// Explanation: Execute the translated docent browser action or assertion below.
// Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
test("translation: translated docent sends the selected target and source override clears its answer", async ({
  page,
}) => {
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  const requests: Array<{ lang: string; targetLanguage?: string }> = [];
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  await prepare(page);
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  await page.route("**/api/docent", async (route) => {
    // Explanation: Execute the translated docent browser action or assertion below.
    // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
    const body = route.request().postDataJSON();
    // Explanation: Execute the translated docent browser action or assertion below.
    // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
    requests.push(body);
    // Explanation: Execute the translated docent browser action or assertion below.
    // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
    if (route.request().headers()["x-docent-probe"] === "1") {
      // Explanation: Execute the translated docent browser action or assertion below.
      // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
      await route.fulfill({ status: 204 });
      // Explanation: Execute the translated docent browser action or assertion below.
      // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
      return;
      // Explanation: Execute the translated docent browser action or assertion below.
      // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
    }
    // Explanation: Execute the translated docent browser action or assertion below.
    // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
    const delta = "Réponse vérifiée. [来源:songshi-waiguan]";
    // Explanation: Execute the translated docent browser action or assertion below.
    // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
    await route.fulfill({
      contentType: "text/event-stream",
      body:
        "event: response.output_text.delta\ndata: " +
        JSON.stringify({ type: "response.output_text.delta", delta }) +
        "\n\nevent: done\ndata: {}\n\n",
    });
    // Explanation: Execute the translated docent browser action or assertion below.
    // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  });
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  await page.evaluate(() => {
    window.location.hash = "/m/odometer";
  });
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  await expect(page.locator(".viewer-page")).toBeVisible();
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  await apply(page);
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  await expect(page.locator(".docent-entry")).toContainText("fr:");
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  await page.locator(".docent-entry").click();
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  await expect(page.getByTestId("docent-input")).toBeVisible();
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  await page
    .getByTestId("docent-input")
    .fill("Comment fonctionne cette machine ?");
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  await page.getByTestId("docent-send").click();
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  // Explanation: Preserve the broad assistant paragraph selector.
  // Reason: The existing thinking indicator shares this class while an answer is arriving.
  //   await expect(page.locator(".docent-message-assistant")).toContainText("Réponse vérifiée.");
  // Explanation: Wait for the live answer paragraph to contain the reviewed response.
  // Reason: The browser assertion must distinguish answer content from the existing thinking indicator.
  await expect(
    page.locator(".docent-message-assistant[aria-live]"),
  ).toContainText("Réponse vérifiée.");
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  await expect(page.getByTestId("docent-citation")).toBeVisible();
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  expect(requests).toHaveLength(2);
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  expect(
    requests.every(
      (request) => request.lang === "en" && request.targetLanguage === "fr",
    ),
  ).toBe(true);
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  await page.getByRole("button", { name: "中文", exact: true }).click();
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  await expect(page.getByTestId("translation-language")).toHaveValue("");
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
  await expect(page.locator(".docent-message-assistant")).toHaveCount(0);
  // Explanation: Execute the translated docent browser action or assertion below.
  // Reason: Verify that the selected target reaches the API and that source-language priority clears temporary answers.
});
// Explanation: Execute the browser test setup or assertion below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
type Item = { id: string; en: string; zh: string };
// Explanation: Execute the browser test setup or assertion below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
type Call = { language: string; items: Item[] };
// Explanation: Execute the browser test setup or assertion below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
const unknown =
  "Unknown about the correct translation, keeping the English and the Chinese version";
// Explanation: Execute the browser test setup or assertion below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
async function prepare(
  page: Page,
  outcome: "accepted" | "uncertain" | "failure" | "delayed" = "accepted",
) {
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  const calls: Call[] = [];
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  const errors: string[] = [];
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  page.on("pageerror", (error) => errors.push(error.message));
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.route("**/api/translate", async (route) => {
    // Explanation: Execute the browser test setup or assertion below.
    // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
    const body = route.request().postDataJSON() as Call;
    // Explanation: Execute the browser test setup or assertion below.
    // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
    calls.push(body);
    // Explanation: Execute the browser test setup or assertion below.
    // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
    if (outcome === "delayed" && body.language === "fr")
      await new Promise((resolve) => setTimeout(resolve, 700));
    // Explanation: Execute the browser test setup or assertion below.
    // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
    if (outcome === "failure") {
      await route.fulfill({
        status: 503,
        json: { error: "translation_not_configured" },
      });
      return;
    }
    // Explanation: Execute the browser test setup or assertion below.
    // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
    await route.fulfill({
      json: {
        results: body.items.map((item) => ({
          id: item.id,
          status: outcome === "uncertain" ? "uncertain" : "accepted",
          text: body.language + ": " + item.en,
        })),
      },
    });
    // Explanation: Execute the browser test setup or assertion below.
    // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  });
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.goto("/#/museum");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.getByRole("button", { name: "EN", exact: true }).click();
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator("h1")).toHaveText("Set ancient machines in motion");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  return { calls, errors };
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
}
// Explanation: Execute the browser test setup or assertion below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
async function apply(page: Page, language = "fr") {
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.getByTestId("translation-language").selectOption(language);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.getByTestId("translate-button").click();
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
}
// Explanation: Execute the browser test setup or assertion below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
async function translated(page: Page, language = "fr") {
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator("h1")).toHaveText(
    language + ": Set ancient machines in motion",
  );
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator(".translation-status")).toHaveText("");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
}
// Explanation: Check the translation behavior named below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
test("translation: initial selector is empty and choosing a language sends no request", async ({
  page,
}) => {
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  const { calls, errors } = await prepare(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.getByTestId("translation-language")).toHaveValue("");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.getByTestId("translate-button")).toHaveText("translate");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.getByTestId("translation-language").selectOption("fr");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.waitForTimeout(200);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  expect(calls).toHaveLength(0);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator("h1")).toHaveText("Set ancient machines in motion");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  expect(errors).toEqual([]);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
});
// Explanation: Check the translation behavior named below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
test("translation: explicit action applies only the selected target", async ({
  page,
}) => {
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  const { calls, errors } = await prepare(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await apply(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await translated(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  expect(calls.length).toBeGreaterThan(0);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  expect(calls.every((call) => call.language === "fr")).toBe(true);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(
    page.getByRole("button", { name: "中文", exact: true }),
  ).toBeVisible();
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(
    page.getByRole("button", { name: "EN", exact: true }),
  ).toBeVisible();
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  expect(errors).toEqual([]);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
});
// Explanation: Check the translation behavior named below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
test("translation: duplicate action gives a temporary message without new requests", async ({
  page,
}) => {
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  const { calls } = await prepare(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await apply(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await translated(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  const count = calls.length;
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.getByTestId("translate-button").click();
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator(".translation-status")).toHaveText(
    "Already translated",
  );
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator(".translation-status")).toHaveText("", {
    timeout: 4000,
  });
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  expect(calls).toHaveLength(count);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
});
// Explanation: Check the translation behavior named below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
test("translation: replacing the target clears its predecessor and requests only the replacement", async ({
  page,
}) => {
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  const { calls } = await prepare(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await apply(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await translated(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  const count = calls.length;
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.getByTestId("translation-language").selectOption("de");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator("h1")).toHaveText(
    "fr: Set ancient machines in motion",
  );
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  expect(calls).toHaveLength(count);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.getByTestId("translate-button").click();
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await translated(page, "de");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  expect(calls.slice(count).every((call) => call.language === "de")).toBe(true);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
});
// Explanation: Check the translation behavior named below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
test("translation: empty selection clears only after translate is pressed", async ({
  page,
}) => {
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  const { calls } = await prepare(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await apply(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await translated(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  const count = calls.length;
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.getByTestId("translation-language").selectOption("");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator("h1")).toHaveText(
    "fr: Set ancient machines in motion",
  );
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.getByTestId("translate-button").click();
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator("h1")).toHaveText("Set ancient machines in motion");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  expect(calls).toHaveLength(count);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
});
// Explanation: Execute the browser test setup or assertion below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
for (const base of ["EN", "中文"]) {
  // Explanation: Check the translation behavior named below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  test(
    "translation: " +
      base +
      " overrides an active target including a same-base click",
    async ({ page }) => {
      // Explanation: Execute the browser test setup or assertion below.
      // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
      const { calls } = await prepare(page);
      // Explanation: Execute the browser test setup or assertion below.
      // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
      await apply(page);
      // Explanation: Execute the browser test setup or assertion below.
      // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
      await translated(page);
      // Explanation: Execute the browser test setup or assertion below.
      // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
      const count = calls.length;
      // Explanation: Execute the browser test setup or assertion below.
      // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
      await page.getByRole("button", { name: base, exact: true }).click();
      // Explanation: Execute the browser test setup or assertion below.
      // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
      await expect(page.getByTestId("translation-language")).toHaveValue("");
      // Explanation: Execute the browser test setup or assertion below.
      // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
      await expect(page.locator("html")).toHaveAttribute(
        "lang",
        base === "EN" ? "en" : "zh-CN",
      );
      // Explanation: Execute the browser test setup or assertion below.
      // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
      await expect(page.locator("h1")).not.toContainText("fr:");
      // Explanation: Execute the browser test setup or assertion below.
      // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
      expect(calls).toHaveLength(count);
      // Explanation: Execute the browser test setup or assertion below.
      // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
    },
  );
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
}
// Explanation: Check the translation behavior named below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
test("translation: source override cancels delayed work and rejects stale results", async ({
  page,
}) => {
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  const { calls } = await prepare(page, "delayed");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await apply(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect.poll(() => calls.length).toBeGreaterThan(0);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.getByRole("button", { name: "中文", exact: true }).click();
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.waitForTimeout(900);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.getByTestId("translation-language")).toHaveValue("");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator("h1")).not.toContainText("fr:");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
});
// Explanation: Check the translation behavior named below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
test("translation: delayed old target cannot overwrite a newer target", async ({
  page,
}) => {
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  const { calls } = await prepare(page, "delayed");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await apply(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect.poll(() => calls.length).toBeGreaterThan(0);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await apply(page, "de");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await translated(page, "de");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.waitForTimeout(900);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await translated(page, "de");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
});
// Explanation: Check the translation behavior named below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
// Explanation: Preserve the previous expectation for review.
// Reason: Match source-only fallback and bounded API correction requirements.
// test("translation: uncertainty displays the exact warning and both originals",
// Explanation: Check the revised translation recovery behavior.
// Reason: Match source-only fallback and bounded API correction requirements.
test("translation: uncertainty retains selected originals and shows only a temporary popup", async ({
  page,
}) => {
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await prepare(page, "uncertain");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await apply(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  // Explanation: Retain the old heading assertion for review.
  // Reason: Fallback must keep the selected original text.
  //   await expect(page.locator("h1")).toContainText(unknown);
  // Explanation: Verify the original heading remains readable.
  // Reason: Translation notices belong outside paragraph text.
  await expect(page.locator("h1")).toHaveText("Set ancient machines in motion");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  // Explanation: Preserve the previous expectation for review.
  // Reason: Match source-only fallback and bounded API correction requirements.
  // await expect(page.locator("h1")).toContainText("English: Set ancient machines in motion");
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Match source-only fallback and bounded API correction requirements.
  await expect(page.locator(".translation-notice")).toContainText(
    "unavailable",
  );
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  // Explanation: Preserve the previous expectation for review.
  // Reason: Match source-only fallback and bounded API correction requirements.
  // await expect(page.locator("h1")).toContainText("中文:");
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Match source-only fallback and bounded API correction requirements.
  await expect(page.locator(".translation-status")).toHaveText("", {
    timeout: 6500,
  });
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Match source-only fallback and bounded API correction requirements.
  await page.getByRole("button", { name: "中文", exact: true }).click();
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Match source-only fallback and bounded API correction requirements.
  const originalChinese = await page.locator("h1").innerText();
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Match source-only fallback and bounded API correction requirements.
  await apply(page);
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Match source-only fallback and bounded API correction requirements.
  await expect(page.locator("h1")).toHaveText(originalChinese);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator("h1")).toContainText(/[\u4e00-\u9fff]/);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
});
// Explanation: Check the translation behavior named below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
test("translation: unavailable provider falls back and leaves navigation usable", async ({
  page,
}) => {
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await prepare(page, "failure");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await apply(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  // Explanation: Retain the old heading assertion for review.
  // Reason: Fallback must keep the selected original text.
  //   await expect(page.locator("h1")).toContainText(unknown);
  // Explanation: Verify the original heading remains readable.
  // Reason: Translation notices belong outside paragraph text.
  await expect(page.locator("h1")).toHaveText("Set ancient machines in motion");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  // Explanation: Preserve the old generic service-error assertion.
  // Reason: Missing credentials now have a specific actionable message.
  //   await expect(page.locator(".translation-status")).toContainText("unavailable");
  // Explanation: Check that the browser identifies the missing server key.
  // Reason: Setup failures must be distinguished from bilingual validation outcomes.
  await expect(page.locator(".translation-status")).toContainText(
    "API key is not configured",
  );
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.getByRole("button", { name: "EN", exact: true }).click();
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator("h1")).toHaveText("Set ancient machines in motion");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.getByTestId("home-active-machine")).toBeVisible();
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
});
// Explanation: Check the translation behavior named below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
test("translation: route navigation translates newly rendered exhibit content", async ({
  page,
}) => {
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  const { calls, errors } = await prepare(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await apply(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await translated(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  const count = calls.length;
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.getByTestId("home-active-machine").click();
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator(".viewer-page")).toBeVisible();
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect.poll(() => calls.length).toBeGreaterThan(count);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator(".viewer-title-row h1")).toContainText("fr:");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  expect(calls.every((call) => call.language === "fr")).toBe(true);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.getByRole("button", { name: "EN", exact: true }).click();
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator(".viewer-title-row h1")).not.toContainText("fr:");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  expect(errors).toEqual([]);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
});
// Explanation: Check the translation behavior named below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
test("translation: refresh discards translations and does not automatically request them", async ({
  page,
}) => {
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  const { calls } = await prepare(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await apply(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await translated(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  const count = calls.length;
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.reload();
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.getByTestId("translation-language")).toHaveValue("");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator("h1")).toHaveText("Set ancient machines in motion");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  expect(calls).toHaveLength(count);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  const persistent = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
  }));
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  expect(JSON.stringify(persistent)).not.toMatch(/fr:|item-\d|targetLanguage/);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
});
// Explanation: Check the translation behavior named below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
test("translation: RTL direction resets and mobile controls remain reachable", async ({
  page,
}) => {
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.setViewportSize({ width: 390, height: 844 });
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await prepare(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.getByTestId("translate-button")).toBeInViewport();
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await apply(page, "ar");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await translated(page, "ar");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.getByRole("button", { name: "EN", exact: true }).click();
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.getByTestId("translation-language")).toBeInViewport();
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
});
// Explanation: Check the translation behavior named below.
// Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
test("translation: English-only cover uses honest fallback and keeps the original entry action", async ({
  page,
}) => {
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  const { calls } = await prepare(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.goto("/");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await apply(page);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  // Explanation: Preserve the previous expectation for review.
  // Reason: Match source-only fallback and bounded API correction requirements.
  // await expect(page.locator(".cover-title")).toContainText(unknown);
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Match source-only fallback and bounded API correction requirements.
  await expect(page.locator(".cover-title")).not.toContainText(unknown);
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  // Explanation: Preserve the previous expectation for review.
  // Reason: Match source-only fallback and bounded API correction requirements.
  // await expect(page.locator(".cover-title")).toContainText("[Original Chinese unavailable]");
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Match source-only fallback and bounded API correction requirements.
  await expect(page.locator(".cover-title")).not.toContainText("unavailable");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.getByTestId("cover-enter")).toHaveAttribute(
    "href",
    "#/museum",
  );
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  // Explanation: Preserve the original immediate-empty status expectation.
  // Reason: The source-only cover now briefly reports translation unavailability.
  // await expect(page.locator(".translation-status")).toHaveText("");
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Allow the temporary popup to expire.
  // Explanation: Verify the source-only fallback briefly shows a popup.
  // Reason: Unavailable status must be visible temporarily outside paragraph text.
  await expect(page.locator(".translation-notice")).toContainText(
    "unavailable",
  );
  // Explanation: Verify the popup disappears automatically.
  // Reason: The notice must not persist beside the language selector.
  await expect(page.locator(".translation-status")).toHaveText("", {
    timeout: 6500,
  });
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await page.getByRole("button", { name: "EN", exact: true }).click();
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  await expect(page.getByTestId("cover-enter")).toHaveText("Enter the museum");
  // Explanation: Execute the browser test setup or assertion below.
  // Reason: Verify explicit translation controls, temporary state and original navigation with deterministic endpoint responses.
  // Explanation: Preserve the original assertion that the cover makes no requests.
  // Reason: The cover's catalog-backed page title and description legitimately need translation.
  //   expect(calls).toHaveLength(0);
  // Explanation: Restrict cover requests to the bilingual document metadata.
  // Reason: English-only cover prose must use uncertainty without inventing a Chinese source.
  expect(
    calls
      .flatMap((call) => call.items)
      .every(
        (item) =>
          "context" in item &&
          ["app.pageTitle", "app.metaDescription"].includes(
            String(item.context),
          ),
      ),
  ).toBe(true);
  // Explanation: Finish the cover translation browser check.
  // Reason: Original entry navigation must remain usable after the source override.
});
