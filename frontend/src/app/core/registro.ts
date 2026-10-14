import { CARGADORES_MACRO1 } from '../macro1/registro';
import { CARGADORES_MICRO1 } from '../micro1/registro';
import { Params, SimuladorDef, Teoria } from './tipos';

/** Simuladores listos de cada materia (materia → simulador → cargador perezoso). */
export const CARGADORES: Record<string, Record<string, () => Promise<SimuladorDef>>> = {
  micro1: CARGADORES_MICRO1,
  macro1: CARGADORES_MACRO1,
};

type FuncionTeoria = (sim: string, p: Params) => Teoria | null;

/** Fichas de teoría de cada materia; se descargan solo al pulsar «Teoría». */
export const TEORIAS: Record<string, () => Promise<FuncionTeoria>> = {
  micro1: () => import('../micro1/teoria').then((m) => m.teoria),
  macro1: () => import('../macro1/teoria').then((m) => m.teoria),
};
