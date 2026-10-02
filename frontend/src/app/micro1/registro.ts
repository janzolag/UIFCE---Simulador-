import { SimuladorDef } from '../core/tipos';

/** Simuladores de Micro 1. Se cargan bajo demanda (un chunk por simulador). */
export const CARGADORES_MICRO1: Record<string, () => Promise<SimuladorDef>> = {
  'restriccion-presupuestal': () => import('./simuladores/restriccion-presupuestal').then((m) => m.SIM),
  preferencias: () => import('./simuladores/preferencias').then((m) => m.SIM),
  'eleccion-optima': () => import('./simuladores/eleccion-optima').then((m) => m.SIM),
  slutsky: () => import('./simuladores/slutsky').then((m) => m.SIM),
  demanda: () => import('./simuladores/demanda').then((m) => m.SIM),
  produccion: () => import('./simuladores/produccion').then((m) => m.SIM),
  costos: () => import('./simuladores/costos').then((m) => m.SIM),
  'competencia-perfecta': () => import('./simuladores/competencia-perfecta').then((m) => m.SIM),
  monopolio: () => import('./simuladores/monopolio').then((m) => m.SIM),
  oligopolio: () => import('./simuladores/oligopolio').then((m) => m.SIM),
};

export const CARGADORES: Record<string, Record<string, () => Promise<SimuladorDef>>> = {
  micro1: CARGADORES_MICRO1,
};
