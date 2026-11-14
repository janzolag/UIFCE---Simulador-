import { SimuladorDef } from '../core/tipos';

/** Simuladores de Micro 2 (equilibrio general y bienestar). Se cargan bajo demanda (un chunk por simulador). */
export const CARGADORES_MICRO2: Record<string, () => Promise<SimuladorDef>> = {
  slutsky: () => import('./simuladores/slutsky').then((m) => m.SIM),
  produccion: () => import('./simuladores/produccion').then((m) => m.SIM),
  edgeworth: () => import('./simuladores/edgeworth').then((m) => m.SIM),
  'equilibrio-produccion': () => import('./simuladores/equilibrio-produccion').then((m) => m.SIM),
  bienestar: () => import('./simuladores/bienestar').then((m) => m.SIM),
  externalidades: () => import('./simuladores/externalidades').then((m) => m.SIM),
};
