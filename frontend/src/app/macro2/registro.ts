import { SimuladorDef } from '../core/tipos';

/** Simuladores de Macro 2. Se cargan bajo demanda (un chunk por simulador). */
export const CARGADORES_MACRO2: Record<string, () => Promise<SimuladorDef>> = {
  'is-lm': () => import('./simuladores/is-lm').then((m) => m.SIM),
  'mundell-fleming': () => import('./simuladores/mundell-fleming').then((m) => m.SIM),
  'dd-aa': () => import('./simuladores/dd-aa').then((m) => m.SIM),
  'da-oa': () => import('./simuladores/da-oa').then((m) => m.SIM),
  phillips: () => import('./simuladores/phillips').then((m) => m.SIM),
  solow: () => import('./simuladores/solow').then((m) => m.SIM),
};
