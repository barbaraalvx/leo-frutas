import { defineConfig, devices } from '@playwright/test';

// Portas próprias, para não disputar com um `npm run dev` aberto.
const PORTA_DEV = 5174;
const PORTA_PRODUCAO = 5175;

const navegador = { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } };

export default defineConfig({
  testDir: 'tests',
  outputDir: 'test-results/playwright',
  fullyParallel: true,
  // Mais workers estouram a memória nesta máquina (cada um abre um Chromium).
  workers: 2,
  // A API simulada demora 800 ms por chamada, de propósito; com dois navegadores
  // em paralelo, 5 s (o padrão) às vezes não basta para a primeira carga.
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    locale: 'pt-BR',
    timezoneId: 'America/Fortaleza',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      // App em dev com a API simulada.
      name: 'dev',
      testIgnore: /producao\.spec\.ts/,
      use: { ...navegador, baseURL: `http://localhost:${PORTA_DEV}` },
    },
    {
      // Build de produção com o Code.js de verdade (scripts/servidor-local.ts).
      name: 'producao',
      testMatch: /producao\.spec\.ts/,
      use: { ...navegador, baseURL: `http://localhost:${PORTA_PRODUCAO}` },
    },
  ],
  webServer: [
    {
      command: `npx vite --config web/vite.config.ts --port ${PORTA_DEV} --strictPort`,
      url: `http://localhost:${PORTA_DEV}`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run build:web && npm run build:servidor && npx vite-node scripts/servidor-local.ts`,
      url: `http://localhost:${PORTA_PRODUCAO}`,
      // Sempre do zero: precisa do build atual e de uma planilha vazia.
      reuseExistingServer: false,
      timeout: 120_000,
      env: { PORTA: String(PORTA_PRODUCAO) },
    },
  ],
});
