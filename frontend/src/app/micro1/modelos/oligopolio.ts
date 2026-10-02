/**
 * Simulador 10 — Oligopolio (port de modelos/oligopolio.py).
 * Monsalve (2017), semana 11. Demanda inversa p = a − b·Y con Y = Σ y_i.
 */
import { ErrorParametro, noNegativo, positivo } from '../../core/errores';

function val(a: number, b: number, c: number): void {
  positivo('a', a); positivo('b', b); noNegativo('c', c);
  if (c >= a) throw new ErrorParametro('Con c ≥ a ninguna empresa produce.');
}

function nEntero(n: number): void {
  if (n < 1 || Math.trunc(n) !== n) throw new ErrorParametro('n debe ser un entero ≥ 1.');
}

/** n empresas simétricas: y_i = (a − c)/((n+1)·b). */
export function cournot(a: number, c: number, n = 2, b = 1) {
  val(a, b, c);
  nEntero(n);
  const yi = (a - c) / ((n + 1) * b);
  const Y = n * yi;
  const p = a - b * Y;
  return { y_i: yi, Y, p, beneficio_i: (p - c) * yi, EC: 0.5 * b * Y * Y, lerner: (p - c) / p, hhi: 1 / n };
}

/** Duopolio con costos distintos; incluye la esquina en que una sale. */
export function cournotAsimetrico(a: number, c1: number, c2: number, b = 1) {
  positivo('a', a); positivo('b', b); noNegativo('c1', c1); noNegativo('c2', c2);
  let y1 = (a - 2 * c1 + c2) / (3 * b);
  let y2 = (a - 2 * c2 + c1) / (3 * b);
  if (y1 < 0) {
    y1 = 0;
    y2 = Math.max((a - c2) / (2 * b), 0);
  } else if (y2 < 0) {
    y1 = Math.max((a - c1) / (2 * b), 0);
    y2 = 0;
  }
  const p = a - b * (y1 + y2);
  return { y1, y2, p, beneficio1: (p - c1) * y1, beneficio2: (p - c2) * y2 };
}

/** Curva de reacción de Cournot: y_i = (a − c − b·y_j)/(2b), truncada en 0. */
export function reaccion(a: number, c: number, yOtro: number, b = 1): number {
  return Math.max((a - c - b * yOtro) / (2 * b), 0);
}

export function cartel(a: number, c: number, n = 2, b = 1) {
  val(a, b, c);
  const Y = (a - c) / (2 * b);
  const p = a - b * Y;
  return { Y, y_i: Y / n, p, beneficio_i: ((p - c) * Y) / n };
}

export function stackelberg(a: number, c: number, b = 1) {
  val(a, b, c);
  const y1 = (a - c) / (2 * b);
  const y2 = (a - c) / (4 * b);
  const p = a - b * (y1 + y2);
  return { y1, y2, Y: y1 + y2, p, beneficio1: (p - c) * y1, beneficio2: (p - c) * y2 };
}

export function competitivo(a: number, c: number, b = 1) {
  val(a, b, c);
  return { Y: (a - c) / b, p: c, beneficio: 0 };
}

/** Paradoja de Bertrand: con c1 = c2 = c, p = c; si c1 < c2 la empresa de menor costo se queda con el mercado. */
export function bertrandHomogeneo(a: number, c1: number, c2: number, b = 1, paso = 0.01) {
  positivo('a', a); positivo('b', b); noNegativo('c1', c1); noNegativo('c2', c2);
  if (Math.abs(c1 - c2) < 1e-15) {
    const p = c1;
    const Y = Math.max((a - p) / b, 0);
    return { p, y1: Y / 2, y2: Y / 2, beneficio1: 0, beneficio2: 0 };
  }
  const [lider, cl, ch] = c1 < c2 ? [1, c1, c2] : [2, c2, c1];
  const pMono = (a + cl) / 2;
  const p = Math.min(ch - paso, pMono);
  const Y = Math.max((a - p) / b, 0);
  const out = { p, y1: 0, y2: 0, beneficio1: 0, beneficio2: 0 };
  if (lider === 1) {
    out.y1 = Y;
    out.beneficio1 = (p - cl) * Y;
  } else {
    out.y2 = Y;
    out.beneficio2 = (p - cl) * Y;
  }
  return out;
}

export type BertrandDif = { existe: false; motivo: string } | { existe: true; p: number; y_i: number; beneficio_i: number };

/** y_i = a − p_i + ε·Σ_{j≠i} p_j (sección 11.3.3). */
export function bertrandDiferenciado(a: number, c: number, eps: number, n: number): BertrandDif {
  positivo('a', a); noNegativo('c', c); positivo('ε', eps);
  const den = 2 + eps * (1 - n);
  if (den <= 0) return { existe: false, motivo: '2 + ε(1 − n) ≤ 0: el precio de equilibrio no es positivo.' };
  const p = (a + c) / den;
  const y = a + (eps * (n - 1) - 1) * p;
  return { existe: true, p, y_i: y, beneficio_i: (p - c) * y };
}

/** Ej. 1 (Friedman, 1983): c_i = a + 5q + q², p = 100 − 0.1Q. */
export function cournotFriedman(n: number, aFijo: number) {
  nEntero(n);
  noNegativo('a', aFijo);
  const q = 950 / (21 + n);
  const Q = n * q;
  const p = 100 - 0.1 * Q;
  const Pi = p * q - aFijo - 5 * q - q * q;
  const nMax = aFijo > 0 ? 950 * Math.sqrt(1.1 / aFijo) - 21 : Number.POSITIVE_INFINITY;
  return {
    q_i: q, Q, p, beneficio_i: Pi, beneficio_libro: 11 * (95 / (21 + n)) ** 2 - aFijo,
    n_max_beneficio_no_negativo: nMax,
  };
}

/** Ej. 2 sem. 11: demanda Q = A − P, CT = c2·Q² + c1·Q + c0. */
export function competenciaMonopolisticaCp(A: number, cT: [number, number, number]) {
  positivo('A', A);
  const [c2, c1, c0] = cT;
  const Q = (A - c1) / (2 + 2 * c2);
  const P = A - Q;
  const cme = c2 * Q + c1 + c0 / Q;
  return { Q, P, CMe: cme, beneficio: Q * (P - cme) };
}

// ---------------------------------------------------------------- concentración
export function hhi(cuotas: number[], escala: 'unitaria' | '10000' = 'unitaria'): number {
  let s = cuotas.map(Number);
  if (s.some((v) => v < 0)) throw new ErrorParametro('Las cuotas no pueden ser negativas.');
  const tot = s.reduce((x, y) => x + y, 0);
  if (tot <= 0) throw new ErrorParametro('Las cuotas deben sumar más que cero.');
  if (Math.abs(tot - 1) > 1e-6 && Math.abs(tot - 100) > 1e-4)
    throw new ErrorParametro(`Las cuotas deben sumar 1 (o 100 %). Suman ${tot.toPrecision(4)}.`);
  s = s.map((v) => v / tot);
  const h = s.reduce((x, v) => x + v * v, 0);
  return escala === '10000' ? h * 10000 : h;
}

/** Razón de concentración: suma de las r cuotas MÁS GRANDES. */
export function cr(cuotas: number[], r: number): number {
  if (r < 1) throw new ErrorParametro('r debe ser ≥ 1.');
  return [...cuotas].sort((x, y) => y - x).slice(0, r).reduce((x, y) => x + y, 0);
}

export function clasificarHhi(h10000: number): string {
  if (h10000 < 1500) return 'no_concentrado';
  if (h10000 <= 2500) return 'moderadamente_concentrado';
  return 'altamente_concentrado';
}
