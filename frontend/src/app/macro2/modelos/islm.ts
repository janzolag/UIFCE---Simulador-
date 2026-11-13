/**
 * Macro 2 · IS–LM en economía cerrada con oferta monetaria fija (notación estándar de manual).
 *   Consumo C = C₀ + c·(Y − T),  inversión I = I₀ − b·r,  gasto público G.
 *   IS: Y = (C₀ − c·T + I₀ + G − b·r) / (1 − c)
 *   LM: M/P = k·Y − h·r   (r en puntos porcentuales; con precios fijos r = i)
 * Reutiliza el motor de Macro 1 (modo «oferta», b₁ = 0), así que la trampa de liquidez
 * (piso r = 0, LM plana) y los casos h = 0 o b = 0 se resuelven igual que allí.
 */
import { curvaIS, equilibrioISLM } from '../../macro1/modelos/islm';

export interface ParamsISLM2 {
  C0: number;
  c: number;
  I0: number;
  b: number;
  G: number;
  T: number;
  /** Saldos reales M/P (P = 1). */
  m: number;
  k: number;
  h: number;
}

export interface ResISLM2 {
  Y: number;
  r: number;
  C: number;
  I: number;
  A: number;
  trampa: boolean;
  multFiscal: number;
  multKeynes: number;
  multMonetario: number;
}

const motor = (p: ParamsISLM2) => ({
  c0: p.C0,
  c1: p.c,
  T: p.T,
  b0: p.I0,
  b1: 0,
  b2: p.b,
  G: p.G,
  modo: 'oferta' as const,
  ibar: 0,
  M: p.m,
  P: 1,
  k: p.k,
  h: p.h,
});

export function equilibrioISLM2(p: ParamsISLM2): ResISLM2 {
  const r = equilibrioISLM(motor(p));
  return {
    Y: r.Y,
    r: r.i,
    C: r.C,
    I: r.I,
    A: r.A,
    trampa: r.trampa,
    multFiscal: r.multFiscal,
    multKeynes: r.multKeynes,
    multMonetario: r.multMonetario,
  };
}

/** Producto sobre la IS a la tasa r. */
export const isY = (p: ParamsISLM2, r: number): number =>
  curvaIS(p.C0 - p.c * p.T + p.I0 + p.G, 1 - p.c, p.b, r);

/** Tasa sobre la LM con piso cero (el tramo plano es la trampa de liquidez). Requiere h > 0. */
export const lmR = (p: ParamsISLM2, Y: number): number => Math.max(0, (p.k * Y - p.m) / p.h);

/** Producto hasta el que la LM es plana en r = 0 (zona de trampa de liquidez). */
export const finTrampa = (p: ParamsISLM2): number => p.m / p.k;
