/**
 * Macro 2 · Modelo de crecimiento de Solow con progreso técnico (notación estándar).
 *   k y y por trabajador efectivo; y = A·k^α,   Δk = s·y − (n + g + δ)·k
 *   Estado estacionario: k* = (s·A/(n + g + δ))^{1/(1−α)}
 *   Regla de oro: f'(k) = n + g + δ ⇒ k_oro = (α·A/(n + g + δ))^{1/(1−α)}, s_oro = α.
 *   Con g = 0 se recupera el modelo sin progreso técnico.
 */
import { ErrorParametro, enIntervalo, noNegativo, positivo } from '../../core/errores';

export interface ParamsSolow {
  A: number;
  alpha: number;
  s: number;
  delta: number;
  n: number;
  /** Crecimiento del progreso técnico que aumenta el trabajo (opcional; 0 si falta). */
  g?: number;
}

/** Tasa de reposición n + g + δ. */
export const reposicion = (p: ParamsSolow): number => p.delta + p.n + (p.g ?? 0);

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
  if (p.g !== undefined && (p.g === null || !Number.isFinite(p.g)))
    throw new ErrorParametro('g debe ser un número finito.');
  if (!(reposicion(p) > 0))
    throw new ErrorParametro(
      `n + g + δ debe ser positivo (es ${reposicion(p)}): sin reposición el capital por trabajador crece sin límite.`,
    );
}

export const produccion = (p: ParamsSolow, k: number): number => p.A * Math.pow(k, p.alpha);

export function estadoEstacionario(p: ParamsSolow): ResSolow {
  validarSolow(p);
  const dn = reposicion(p);
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
