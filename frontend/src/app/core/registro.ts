import { CARGADORES_FUNDAMENTOS } from '../fundamentos/registro';
import { CARGADORES_MACRO1 } from '../macro1/registro';
import { CARGADORES_MACRO2 } from '../macro2/registro';
import { CARGADORES_MICRO1 } from '../micro1/registro';
import { CARGADORES_MICRO2 } from '../micro2/registro';
import { CARGADORES_MICRO3 } from '../micro3/registro';
import { Params, SimuladorDef, Teoria } from './tipos';

/** Simuladores listos de cada materia (materia → simulador → cargador perezoso). */
export const CARGADORES: Record<string, Record<string, () => Promise<SimuladorDef>>> = {
  fundamentos: CARGADORES_FUNDAMENTOS,
  micro1: CARGADORES_MICRO1,
  micro2: CARGADORES_MICRO2,
  micro3: CARGADORES_MICRO3,
  macro1: CARGADORES_MACRO1,
  macro2: CARGADORES_MACRO2,
};

type FuncionTeoria = (sim: string, p: Params) => Teoria | null;

/** Fichas de teoría de cada materia; se descargan solo al pulsar «Teoría». */
export const TEORIAS: Record<string, () => Promise<FuncionTeoria>> = {
  fundamentos: () => import('../fundamentos/teoria').then((m) => m.teoria),
  micro1: () => import('../micro1/teoria').then((m) => m.teoria),
  micro2: () => import('../micro2/teoria').then((m) => m.teoria),
  micro3: () => import('../micro3/teoria').then((m) => m.teoria),
  macro1: () => import('../macro1/teoria').then((m) => m.teoria),
  macro2: () => import('../macro2/teoria').then((m) => m.teoria),
};
