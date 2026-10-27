import { defineConfig, devices } from '@playwright/test'

const PORT = 5199

// UI check at the end of a spec (docs/process.md → The loop). Screenshots land in e2e/screenshots/ (git-ignored).
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.output',
  reporter: [['list']],
  fullyParallel: true,
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: `pnpm exec vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
