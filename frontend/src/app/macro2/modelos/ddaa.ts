/**
 * Macro 2 · Modelo DD–AA de Krugman y Obstfeld (2006): producción y tipo de cambio a corto plazo
 * (la versión del libro del enfoque Mundell–Fleming).
 *   DD (mercado de bienes):  Y = C₀ + c·(Y − T) + I + G + CA,   CA = n₀ + x·E − m·Y
 *        ⇒ Y = (A + x·E) / (1 − c + m),   A = C₀ − c·T + I + G + n₀.
 *   AA (mercados de activos): M/P = k·Y − h·R   y   paridad de intereses R = R* + 100·(Eᵉ − E)/E.
 *   Movilidad imperfecta: la cuenta financiera responde con intensidad μ al diferencial de rentabilidad,
 *   KA = μ·[R − R* − 100·(Eᵉ − E)/E], y la balanza de pagos exige CA + KA = 0.
 *   Con μ → ∞ se recupera la paridad exacta (la AA del libro).
 *   Tipo fijo: el banco central fija E = E₀ (creíble, Eᵉ = E₀) y la oferta monetaria se vuelve endógena.
 * E = unidades de moneda nacional por unidad de divisa (sube = depreciación). R y R* en %.
 */
import { ErrorParametro, noNegativo, positivo } from '../../core/errores';
import { biseccion } from '../../core/numerico';
import { finito, propension } from '../../macro1/modelos/_comun';

export type Regimen = 'flotante' | 'fijo';
export type Movilidad = 'perfecta' | 'imperfecta';

export interface ParamsDDAA {
  regimen: Regimen;
  movilidad: Movilidad;
  C0: number;
  c: number;
  T: number;
  I: number;
  G: number;
  /** Componente autónomo de la cuenta corriente. */
  n0: number;
  /** Respuesta de la cuenta corriente a E (depreciación real). */
  x: number;
  /** Propensión a importar. */
  m: number;
  /** Saldos reales M/P (solo cuentan en régimen flotante). */
  Mp: number;
  k: number;
  h: number;
  Rstar: number;
  /** Tipo de cambio esperado (régimen flotante). */
  Ee: number;
  /** Paridad fijada (régimen fijo). */
  E0: number;
  /** Intensidad de la cuenta financiera (movilidad imperfecta). */
  mu: number;
}

export interface ResDDAA {
  Y: number;
  E: number;
  R: number;
  CA: number;
  /** Oferta real de dinero en equilibrio (endógena con tipo fijo). */
  Mp: number;
  A: number;
  s: number;
}

const E_MIN = 1e-6;
const E_MAX = 1e6;

export function validarDDAA(p: ParamsDDAA): { A: number; s: number } {
  noNegativo('C₀', p.C0);
  propension('c', p.c);
  finito('T', p.T);
  noNegativo('I', p.I);
  noNegativo('G', p.G);
  finito('n₀', p.n0);
  positivo('x', p.x);
  noNegativo('m', p.m);
  positivo('k', p.k);
  positivo('h', p.h);
  noNegativo('R*', p.Rstar);
  if (p.regimen === 'fijo') positivo('E₀', p.E0);
  else {
    positivo('M/P', p.Mp);
    positivo('Eᵉ', p.Ee);
  }
  if (p.movilidad === 'imperfecta') positivo('μ', p.mu);
  return { A: p.C0 - p.c * p.T + p.I + p.G + p.n0, s: 1 - p.c + p.m };
}

/** Curva DD: producto que vacía el mercado de bienes al tipo de cambio E. */
export function curvaDD(p: ParamsDDAA, E: number): number {
  const { A, s } = validarDDAA(p);
  return (A + p.x * E) / s;
}

/** Tasa de interés que vacía el mercado de dinero (piso cero: trampa de liquidez). */
export const tasaDinero = (Mp: number, k: number, h: number, Y: number): number =>
  Math.max(0, (k * Y - Mp) / h);

/**
 * Curva AA: tipo de cambio que equilibra los mercados de activos (y, con movilidad imperfecta,
 * la balanza de pagos) para un producto Y, dada la oferta real de dinero.
 */
export function curvaAA(p: ParamsDDAA, Y: number, Mp = p.Mp, Ee = p.Ee): number {
  const R = tasaDinero(Mp, p.k, p.h, Y);
  if (p.movilidad === 'perfecta') {
    const den = 1 + (R - p.Rstar) / 100;
    return den > 0 ? Ee / den : E_MAX;
  }
  // Balanza de pagos con movilidad imperfecta: g(E) es creciente en E.
  const g = (E: number) =>
    p.n0 + p.x * E - p.m * Y + p.mu * (R - p.Rstar - (100 * (Ee - E)) / E);
  if (g(E_MIN) >= 0) return E_MIN;
  if (g(E_MAX) <= 0) return E_MAX;
  return biseccion(g, E_MIN, E_MAX, 1e-14);
}

export function equilibrioDDAA(p: ParamsDDAA): ResDDAA {
  const { A, s } = validarDDAA(p);
  let Y: number;
  let E: number;
  let R: number;
  let Mp: number;
  if (p.regimen === 'fijo') {
    E = p.E0;
    Y = (A + p.x * E) / s;
    const CA0 = p.n0 + p.x * E - p.m * Y;
    // Paridad creíble: Eᵉ = E₀. Con movilidad imperfecta la tasa se ajusta hasta cerrar la balanza.
    R = p.movilidad === 'perfecta' ? p.Rstar : p.Rstar - CA0 / p.mu;
    if (R < 0)
      throw new ErrorParametro(
        `Sostener E₀ = ${p.E0} exigiría una tasa de interés negativa (${R.toFixed(2)} %): con este superávit externo la paridad no es sostenible.`,
      );
    Mp = p.k * Y - p.h * R;
    if (!(Mp > 0))
      throw new ErrorParametro(
        'Para sostener la paridad el banco central tendría que llevar la oferta monetaria a cero o menos: la paridad no es sostenible.',
      );
  } else {
    // Cruce de DD y AA: se busca un cambio de signo de Y − DD(AA(Y)) y se refina por bisección.
    const f = (y: number) => y - curvaDD(p, curvaAA(p, y));
    if (f(0) >= 0)
      throw new ErrorParametro('Las curvas DD y AA no se cortan con producto positivo para estos parámetros.');
    let hi = Math.max(1, Math.abs(A) / s);
    for (let n = 0; n < 80 && f(hi) < 0; n++) hi *= 1.5;
    if (f(hi) < 0)
      throw new ErrorParametro('Las curvas DD y AA no se cortan con producto positivo para estos parámetros.');
    Y = biseccion(f, 0, hi, 1e-14);
    E = curvaAA(p, Y);
    R = tasaDinero(p.Mp, p.k, p.h, Y);
    Mp = p.Mp;
    if (E <= E_MIN * 1.0001 || E >= E_MAX * 0.9999)
      throw new ErrorParametro('El tipo de cambio de equilibrio se sale de cualquier valor razonable con estos parámetros.');
  }
  if (!(Y > 0)) throw new ErrorParametro(`El producto de equilibrio no es positivo (Y = ${Y.toFixed(2)}).`);
  return { Y, E, R, CA: p.n0 + p.x * E - p.m * Y, Mp, A, s };
}
