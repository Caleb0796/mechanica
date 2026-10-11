// Explanation: Execute the browser test setup or assertion below.
// Reason: Run focused translation browser checks in the installed Chrome browser.
import { defineConfig } from "@playwright/test";
// Explanation: Execute the browser test setup or assertion below.
// Reason: Run focused translation browser checks in the installed Chrome browser.
export default defineConfig({
// Explanation: Execute the browser test setup or assertion below.
// Reason: Run focused translation browser checks in the installed Chrome browser.
  testDir: ".",
// Explanation: Execute the browser test setup or assertion below.
// Reason: Run focused translation browser checks in the installed Chrome browser.
  testMatch: ["requestedTranslation.spec.ts", "smoke.spec.ts"],
// Explanation: Limit the default browser run to translation and the nine selected original smoke cases.
// Reason: The requested test budget must remain below one hundred without repeating the full regression suite.
  grep: /translation:|smoke: homepage|smoke: removed|smoke: all four|U2: demo exposes|U3 compare: linked|gallery exposes|U5 mock:|English UI has no|U1: odometer rejects/,
// Explanation: Execute the browser test setup or assertion below.
// Reason: Run focused translation browser checks in the installed Chrome browser.
  workers: 1,
// Explanation: Execute the browser test setup or assertion below.
// Reason: Run focused translation browser checks in the installed Chrome browser.
  timeout: 45_000,
// Explanation: Execute the browser test setup or assertion below.
// Reason: Run focused translation browser checks in the installed Chrome browser.
  use: { baseURL: "http://localhost:4173", channel: "chrome", launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } },
// Explanation: Execute the browser test setup or assertion below.
// Reason: Run focused translation browser checks in the installed Chrome browser.
  webServer: { command: "pnpm preview --port 4173 --strictPort", url: "http://localhost:4173", reuseExistingServer: false },
// Explanation: Execute the browser test setup or assertion below.
// Reason: Run focused translation browser checks in the installed Chrome browser.
});
