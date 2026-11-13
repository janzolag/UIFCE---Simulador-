/**
 * Macro 2 · Modelo de crecimiento de Solow (notación estándar).
 *   y = A·k^α,   Δk = s·y − (δ + n)·k
 *   Estado estacionario: k* = (s·A/(δ + n))^{1/(1−α)}
 *   Regla de oro: f'(k) = δ + n ⇒ k_oro = (α·A/(δ + n))^{1/(1−α)}, s_oro = α.
 */
import { ErrorParametro, enIntervalo, noNegativo, positivo } from '../../core/errores';

export interface ParamsSolow {
  A: number;
  alpha: number;
  s: number;
  delta: number;
  n: number;
}

export interface ResSolow {
  k: number;
  y: number;
  c: number;
  i: number;
  kOro: number;
  yOro: number;
  cOro: number;
  sOro: number;
  /** Velocidad de convergencia aproximada λ = (1 − α)(δ + n). */
  lambda: number;
  /** Períodos para cerrar la mitad de la distancia a k*: ln 2 / λ. */
  vidaMedia: number;
}

export function validarSolow(p: ParamsSolow): void {
  positivo('A', p.A);
  enIntervalo('α', p.alpha, 0, 1);
  enIntervalo('s', p.s, 0, 1, false);
  noNegativo('δ', p.delta);
  if (p.n === null || p.n === undefined || !Number.isFinite(p.n))
    throw new ErrorParametro('n debe ser un número finito.');
  if (!(p.delta + p.n > 0))
    throw new ErrorParametro(
      `δ + n debe ser positivo (es ${p.delta + p.n}): sin depreciación ni crecimiento de la población el capital por trabajador crece sin límite.`,
    );
}

export const produccion = (p: ParamsSolow, k: number): number => p.A * Math.pow(k, p.alpha);

export function estadoEstacionario(p: ParamsSolow): ResSolow {
  validarSolow(p);
  const dn = p.delta + p.n;
  const e = 1 / (1 - p.alpha);
  const k = Math.pow((p.s * p.A) / dn, e);
  const y = produccion(p, k);
  const kOro = Math.pow((p.alpha * p.A) / dn, e);
  const yOro = produccion(p, kOro);
  const lambda = (1 - p.alpha) * dn;
  return {
    k,
    y,
    c: (1 - p.s) * y,
    i: p.s * y,
    kOro,
    yOro,
    cOro: yOro - dn * kOro,
    sOro: p.alpha,
    lambda,
    vidaMedia: Math.log(2) / lambda,
  };
}
