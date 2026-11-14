/**
 * Micro 3 · Juegos 2×2 (notación estándar de manual): el jugador A elige A₁ o A₂ (filas), B elige B₁ o B₂
 * (columnas). aᵢⱼ y bᵢⱼ son los pagos de A y de B cuando A juega Aᵢ y B juega Bⱼ.
 */
import { ErrorParametro } from '../../core/errores';

export interface Juego2x2 {
  a11: number;
  a12: number;
  a21: number;
  a22: number;
  b11: number;
  b12: number;
  b21: number;
  b22: number;
}

export const JUEGOS: Record<string, { nombre: string; pagos: Juego2x2; acciones: [string, string] }> = {
  dilema: {
    nombre: 'Dilema del prisionero',
    pagos: { a11: 3, a12: 0, a21: 5, a22: 1, b11: 3, b12: 5, b21: 0, b22: 1 },
    acciones: ['Cooperar', 'Delatar'],
  },
  coordinacion: {
    nombre: 'Batalla de los sexos',
    pagos: { a11: 2, a12: 0, a21: 0, a22: 1, b11: 1, b12: 0, b21: 0, b22: 2 },
    acciones: ['Fútbol', 'Teatro'],
  },
  monedas: {
    nombre: 'Pares y nones',
    pagos: { a11: 2, a12: 0, a21: 0, a22: 2, b11: 0, b12: 2, b21: 2, b22: 0 },
    acciones: ['Cara', 'Sello'],
  },
};

export function validarJuego(g: Juego2x2): void {
  for (const [k, v] of Object.entries(g))
    if (!Number.isFinite(v) || v < 0 || v > 100) throw new ErrorParametro(`El pago ${k} debe estar entre 0 y 100.`);
}

const pagoA = (g: Juego2x2, i: number, j: number): number => [[g.a11, g.a12], [g.a21, g.a22]][i][j];
const pagoB = (g: Juego2x2, i: number, j: number): number => [[g.b11, g.b12], [g.b21, g.b22]][i][j];

/** Equilibrios de Nash en estrategias puras: (fila, columna), con índices 0 o 1. */
export function nashPuros(g: Juego2x2): [number, number][] {
  const out: [number, number][] = [];
  for (const i of [0, 1])
    for (const j of [0, 1])
      if (pagoA(g, i, j) >= pagoA(g, 1 - i, j) && pagoB(g, i, j) >= pagoB(g, i, 1 - j)) out.push([i, j]);
  return out;
}

/**
 * Equilibrio en estrategias mixtas: p = Pr(A juega A₁) deja indiferente a B; q = Pr(B juega B₁) deja
 * indiferente a A. Devuelve null si no hay un equilibrio estrictamente mixto.
 */
export function nashMixto(g: Juego2x2): { p: number; q: number; uA: number; uB: number } | null {
  const dA = g.a11 - g.a21 - (g.a12 - g.a22);
  const dB = g.b11 - g.b12 - (g.b21 - g.b22);
  if (Math.abs(dA) < 1e-12 || Math.abs(dB) < 1e-12) return null;
  const q = (g.a22 - g.a12) / dA;
  const p = (g.b22 - g.b21) / dB;
  if (!(q > 1e-9 && q < 1 - 1e-9 && p > 1e-9 && p < 1 - 1e-9)) return null;
  const uA = q * g.a11 + (1 - q) * g.a12;
  const uB = p * g.b11 + (1 - p) * g.b21;
  return { p, q, uA, uB };
}

/**
 * Mejor respuesta de A como función de q: polilínea (q, p) en el cuadrado unitario.
 * A prefiere A₁ cuando q·(a₁₁ − a₂₁) + (1 − q)·(a₁₂ − a₂₂) > 0.
 */
export function respuestaA(g: Juego2x2): { q: number[]; p: number[] } {
  return escalon((q) => q * (g.a11 - g.a21) + (1 - q) * (g.a12 - g.a22));
}

/** Mejor respuesta de B como función de p: polilínea (q, p). */
export function respuestaB(g: Juego2x2): { q: number[]; p: number[] } {
  const r = escalon((p) => p * (g.b11 - g.b12) + (1 - p) * (g.b21 - g.b22));
  return { q: r.p, p: r.q };
}

/** Correspondencia escalón: para t en [0, 1], valor 1 si ventaja(t) > 0, 0 si < 0 (vertical en el cruce). */
function escalon(ventaja: (t: number) => number): { q: number[]; p: number[] } {
  const v0 = ventaja(0);
  const v1 = ventaja(1);
  const nivel = (v: number) => (v > 0 ? 1 : v < 0 ? 0 : 0.5);
  if (v0 * v1 < 0) {
    const t = v0 / (v0 - v1);
    return { q: [0, t, t, 1], p: [nivel(v0), nivel(v0), nivel(v1), nivel(v1)] };
  }
  const v = Math.abs(v0) > 1e-12 ? v0 : v1;
  return { q: [0, 1], p: [nivel(v), nivel(v)] };
}

/** Juego secuencial: A elige primero, B observa y responde. Inducción hacia atrás (desempates a favor de la primera acción). */
export function induccion(g: Juego2x2): { respuestaB: [number, number]; jugadaA: number; resultado: [number, number] } {
  const rB: [number, number] = [pagoB(g, 0, 0) >= pagoB(g, 0, 1) ? 0 : 1, pagoB(g, 1, 0) >= pagoB(g, 1, 1) ? 0 : 1];
  const jugadaA = pagoA(g, 0, rB[0]) >= pagoA(g, 1, rB[1]) ? 0 : 1;
  return { respuestaB: rB, jugadaA, resultado: [jugadaA, rB[jugadaA]] };
}

/**
 * Dilema repetido infinitamente con estrategias gatillo (A₁ = cooperar). T tentación, R recompensa,
 * P castigo: cooperar es sostenible si δ ≥ (T − R)/(T − P).
 */
export function gatillo(g: Juego2x2): { T: number; R: number; P: number; S: number; delta: number | null; esDilema: boolean } {
  const R = g.a11;
  const S = g.a12;
  const T = g.a21;
  const P = g.a22;
  const esDilema = T > R && R > P && P >= S;
  return { T, R, P, S, delta: T > P && T > R ? (T - R) / (T - P) : null, esDilema };
}

export const pago = { A: pagoA, B: pagoB };
