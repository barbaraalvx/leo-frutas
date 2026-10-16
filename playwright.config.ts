import { defineConfig, devices } from '@playwright/test';

// Porta própria, para não disputar com um `npm run dev` aberto.
const PORTA = 5174;

export default defineConfig({
  testDir: 'tests',
  outputDir: 'test-results/playwright',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: 'pt-BR',
    timezoneId: 'America/Fortaleza',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } }],
  webServer: {
    command: `npx vite --config web/vite.config.ts --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !process.env.CI,
  },
});
