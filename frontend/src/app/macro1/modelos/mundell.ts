/**
 * Simulador 4 — Mundell–Fleming: IS–LM en economía abierta con movilidad perfecta de capitales
 * (Blanchard, 2017, caps. 19–20).
 *   IS: Y = C(Y − T) + I(Y, i) + G + XN(Y, e),  XN = x₀ + φ·e − q·Y
 *   LM: M/P = k·Y − h·i  (P = P* = 1)
 *   Paridad de intereses: (1 + i) = (1 + i*)·eᵉ/e   ⇒   e = eᵉ·(1 + i*)/(1 + i)
 * e = pesos por unidad de moneda extranjera (convención colombiana: e sube = depreciación).
 * Blanchard usa la inversa (E sube = apreciación); las conclusiones son las mismas.
 *   · Cambio flexible: M es exógena; i, e e Y son endógenas.
 *   · Cambio fijo creíble (eᵉ = ē): i = i*; la cantidad de dinero se vuelve endógena.
 */
import { ErrorParametro, positivo } from '../../core/errores';
import { biseccion } from '../../core/numerico';
import { Bienes, finito, propension, validarBienes } from './_comun';

export type Regimen = 'flexible' | 'fijo';

export interface ParamsMF extends Bienes {
  regimen: Regimen;
  x0: number;
  phi: number;
  q: number;
  k: number;
  h: number;
  M: number;
  /** Tasa externa en puntos porcentuales. */
  istar: number;
  /** Tipo de cambio esperado (régimen flexible). */
  ee: number;
  /** Tipo de cambio fijado (régimen fijo). */
  ebar: number;
}

export interface ResMF {
  Y: number;
  i: number;
  e: number;
  M: number;
  XN: number;
  C: number;
  I: number;
  /** Gasto autónomo interno + x₀ y pendiente s' = 1 − c₁ − b₁ + q. */
  A: number;
  s: number;
}

export function validarMF(p: ParamsMF): { A: number; s: number } {
  const { A } = validarBienes(p);
  if (p.x0 === null || p.x0 === undefined || !(p.x0 >= 0))
    throw new ErrorParametro(`x₀ no puede ser negativo (recibido: ${p.x0}).`);
  finito('φ', p.phi);
  if (p.phi < 0)
    throw new ErrorParametro(
      `φ no puede ser negativo (recibido: ${p.phi}): una depreciación abarata las exportaciones.`,
    );
  propension('q', p.q);
  positivo('k', p.k);
  positivo('h', p.h);
  finito('i*', p.istar);
  if (p.istar < 0)
    throw new ErrorParametro(`La tasa externa no puede ser negativa (i* = ${p.istar}).`);
  if (p.regimen === 'flexible') {
    positivo('M', p.M);
    positivo('eᵉ', p.ee);
  } else positivo('ē', p.ebar);
  return { A: A + p.x0, s: 1 - p.c1 - p.b1 + p.q };
}

/** Paridad descubierta de intereses: tipo de cambio de hoy para una tasa interna dada. */
export function paridad(ee: number, istar: number, i: number): number {
  return (ee * (1 + istar / 100)) / (1 + i / 100);
}

/** IS abierta: producto para una tasa y un tipo de cambio dados. */
export function curvaISAbierta(p: ParamsMF, A: number, s: number, i: number, e: number): number {
  return (A + p.phi * e - p.b2 * i) / s;
}

function cerrar(
  p: ParamsMF,
  A: number,
  s: number,
  Y: number,
  i: number,
  e: number,
  M: number,
): ResMF {
  if (!(Y > 0))
    throw new ErrorParametro(
      `El producto de equilibrio no es positivo (Y = ${Y.toFixed(2)}): revisa el gasto autónomo.`,
    );
  return {
    Y,
    i,
    e,
    M,
    A,
    s,
    XN: p.x0 + p.phi * e - p.q * Y,
    C: p.c0 + p.c1 * (Y - p.T),
    I: p.b0 + p.b1 * Y - p.b2 * i,
  };
}

export function equilibrioMF(p: ParamsMF): ResMF {
  const { A, s } = validarMF(p);
  if (p.regimen === 'fijo') {
    // Paridad creíble: si eᵉ = ē, la tasa interna tiene que igualar a la externa.
    const i = p.istar;
    const Y = curvaISAbierta(p, A, s, i, p.ebar);
    const M = p.k * Y - p.h * i;
    if (Y > 0 && M <= 0)
      throw new ErrorParametro(
        `Para sostener ē con i = i* el banco central tendría que dejar una cantidad de dinero negativa (M = ${M.toFixed(2)}): sube k o baja h.`,
      );
    return cerrar(p, A, s, Y, i, p.ebar, M);
  }
  // Flexible: buscar Y tal que la IS con (i, e) de la LM y la paridad devuelva el mismo Y.
  const iLM = (Y: number) => (p.k * Y - p.M) / p.h;
  const residuo = (Y: number) => {
    const i = iLM(Y);
    return Y - curvaISAbierta(p, A, s, i, paridad(p.ee, p.istar, i));
  };
  // i > −100 % para que la paridad tenga sentido.
  const lo = Math.max(1e-9, (p.M - 99.9 * p.h) / p.k);
  if (residuo(lo) > 0)
    throw new ErrorParametro(
      'No existe un equilibrio con producto positivo: el gasto autónomo es demasiado bajo.',
    );
  let hi = Math.max(2 * lo, 1);
  while (residuo(hi) < 0) {
    hi *= 2;
    if (hi > 1e12)
      throw new ErrorParametro(
        'El modelo no converge: la demanda crece sin límite con el producto.',
      );
  }
  const Y = biseccion(residuo, lo, hi, 1e-14, 400);
  const i = iLM(Y);
  return cerrar(p, A, s, Y, i, paridad(p.ee, p.istar, i), p.M);
}
