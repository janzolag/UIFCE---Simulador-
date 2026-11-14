import { SimuladorDef } from '../core/tipos';

/** Simuladores de Micro 2 (Varian). Se cargan bajo demanda (un chunk por simulador). */
export const CARGADORES_MICRO2: Record<string, () => Promise<SimuladorDef>> = {
  slutsky: () => import('./simuladores/slutsky').then((m) => m.SIM),
  produccion: () => import('./simuladores/produccion').then((m) => m.SIM),
  monopolio: () => import('./simuladores/monopolio').then((m) => m.SIM),
  oligopolio: () => import('./simuladores/oligopolio').then((m) => m.SIM),
  edgeworth: () => import('./simuladores/edgeworth').then((m) => m.SIM),
};
