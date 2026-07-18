import { defineConfig } from '@playwright/test'

declare const process: { env: { CI?: string } }

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    command: 'pnpm preview --port 4173 --strictPort',
    reuseExistingServer: !process.env.CI,
    url: 'http://localhost:4173',
  },
})
