// Ponto único de acesso à API: google.script.run dentro do Apps Script,
// simulada em `npm run dev` e nos testes.

import { apiAppsScript, estaNoAppsScript } from './appsScript';
import { ApiSimulada } from './simulada';
import type { Api } from './tipos';

export const api: Api = estaNoAppsScript() ? apiAppsScript : new ApiSimulada();

export type * from './tipos';
