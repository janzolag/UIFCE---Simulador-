/**
 * Simulador 1 — Modelo Keynesiano de gasto–ingreso (Blanchard, 2017, cap. 3).
 * Z = C + I + G,  C = c₀ + c₁·(Y − T),  T = T₀ + t·Y,  I = Ī.   Equilibrio: Y = Z.
 */
import { ErrorParametro, noNegativo } from '../../core/errores';
import { finito, propension } from './_comun';

export interface ParamsKeynes {
  c0: number;
  c1: number;
  t: number;
  T0: number;
  I: number;
  G: number;
}

export interface ResKeynes {
  Y: number;
  /** Gasto autónomo c₀ − c₁T₀ + Ī + G. */
  A: number;
  /** Multiplicador del gasto 1 / (1 − c₁(1 − t)). */
  multiplicador: number;
  /** Pendiente de la demanda agregada Z(Y). */
  pendiente: number;
  T: number;
  YD: number;
  C: number;
  ahorroPrivado: number;
  ahorroPublico: number;
  /** dY/dT₀ = −c₁·multiplicador. */
  multImpuesto: number;
  /** Presupuesto equilibrado (ΔG = ΔT₀): (1 − c₁)·multiplicador. */
  multEquilibrado: number;
}

export function validarKeynes(p: ParamsKeynes): void {
  noNegativo('c₀', p.c0);
  propension('c₁', p.c1);
  propension('t', p.t);
  finito('T₀', p.T0);
  noNegativo('Ī', p.I);
  noNegativo('G', p.G);
}

export function equilibrioKeynes(p: ParamsKeynes): ResKeynes {
  validarKeynes(p);
  const pendiente = p.c1 * (1 - p.t);
  const multiplicador = 1 / (1 - pendiente);
  const A = p.c0 - p.c1 * p.T0 + p.I + p.G;
  const Y = multiplicador * A;
  if (Y < 0)
    throw new ErrorParametro(
      `El gasto autónomo es negativo (A = ${A.toFixed(2)}): con estos impuestos fijos el producto de equilibrio sería negativo.`,
    );
  const T = p.T0 + p.t * Y;
  const YD = Y - T;
  const C = p.c0 + p.c1 * YD;
  return {
    Y,
    A,
    multiplicador,
    pendiente,
    T,
    YD,
    C,
    ahorroPrivado: YD - C,
    ahorroPublico: T - p.G,
    multImpuesto: -p.c1 * multiplicador,
    multEquilibrado: (1 - p.c1) * multiplicador,
  };
}

/** Demanda agregada Z para un nivel de producto Y dado. */
export function demandaKeynes(p: ParamsKeynes, Y: number): number {
  return p.c0 + p.c1 * (Y - p.T0 - p.t * Y) + p.I + p.G;
}
