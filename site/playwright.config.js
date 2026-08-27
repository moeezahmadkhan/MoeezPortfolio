import { defineConfig, devices } from '@playwright/test'

/**
 * Tests run against a production build, never the dev server — the things most
 * worth testing here (chunk splitting, the inlined stylesheet, the no-JS path)
 * only exist after `vite build`.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,        // one preview server, and the 3D tests are timing-sensitive
  workers: 1,
  reporter: [['list']],
  timeout: 30_000,
  expect: { timeout: 8_000 },

  webServer: {
    command: 'npm run build && npx vite preview --port 4199 --strictPort',
    url: 'http://localhost:4199/',
    reuseExistingServer: false,
    timeout: 120_000,
  },

  use: {
    baseURL: 'http://localhost:4199/',
    trace: 'retain-on-failure',

    // Headless Chromium rasterises WebGL through SwiftShader, which is a real
    // GL implementation and enough to prove the render path — but it is not a
    // driver. `GPU=1 npm test` runs the same suite on whatever hardware is
    // actually present, which is the only way to catch a driver-specific
    // failure before a visitor does.
    launchOptions: process.env.GPU === '1'
      ? {
          args: [
            '--use-angle=vulkan', '--use-gl=angle', '--enable-gpu',
            '--ignore-gpu-blocklist', '--enable-features=Vulkan,VulkanFromANGLE',
            '--disable-gpu-sandbox',
          ],
        }
      : {},
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
})
