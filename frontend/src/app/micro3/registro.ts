import { SimuladorDef } from '../core/tipos';

/** Simuladores de Micro 3 (juegos y fallas de mercado). Se cargan bajo demanda (un chunk por simulador). */
export const CARGADORES_MICRO3: Record<string, () => Promise<SimuladorDef>> = {
  juegos: () => import('./simuladores/juegos').then((m) => m.SIM),
  monopolio: () => import('./simuladores/monopolio').then((m) => m.SIM),
  oligopolio: () => import('./simuladores/oligopolio').then((m) => m.SIM),
  informacion: () => import('./simuladores/informacion').then((m) => m.SIM),
};
