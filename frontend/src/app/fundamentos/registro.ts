import { SimuladorDef } from '../core/tipos';

/** Simuladores de Fundamentos (Mankiw, cap. 2-10). Se cargan bajo demanda (un chunk por simulador). */
export const CARGADORES_FUNDAMENTOS: Record<string, () => Promise<SimuladorDef>> = {
  fpp: () => import('./simuladores/fpp').then((m) => m.SIM),
  'ventaja-comparativa': () => import('./simuladores/ventaja-comparativa').then((m) => m.SIM),
  'oferta-demanda': () => import('./simuladores/oferta-demanda').then((m) => m.SIM),
  elasticidades: () => import('./simuladores/elasticidades').then((m) => m.SIM),
  excedentes: () => import('./simuladores/excedentes').then((m) => m.SIM),
  'controles-precios': () => import('./simuladores/controles-precios').then((m) => m.SIM),
  impuestos: () => import('./simuladores/impuestos').then((m) => m.SIM),
  'comercio-internacional': () => import('./simuladores/comercio-internacional').then((m) => m.SIM),
  externalidades: () => import('./simuladores/externalidades').then((m) => m.SIM),
};
