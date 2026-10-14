import { SimuladorDef } from '../core/tipos';

/** Simuladores de Macro 1. Se cargan bajo demanda (un chunk por simulador). */
export const CARGADORES_MACRO1: Record<string, () => Promise<SimuladorDef>> = {
  keynesiano: () => import('./simuladores/keynesiano').then((m) => m.SIM),
  'is-lm': () => import('./simuladores/is-lm').then((m) => m.SIM),
  'da-oa': () => import('./simuladores/da-oa').then((m) => m.SIM),
  'mundell-fleming': () => import('./simuladores/mundell-fleming').then((m) => m.SIM),
};
