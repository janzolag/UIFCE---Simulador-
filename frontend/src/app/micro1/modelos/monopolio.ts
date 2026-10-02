/**
 * Simulador 9 — Monopolio (port de modelos/monopolio.py).
 * Demanda inversa lineal p = a − b·y; costo C(y) = CF + c·y + d·y² (d ≥ 0).
 */
import { ErrorParametro, noNegativo, positivo } from '../../core/errores';

function validar(a: number, b: number, c: number, d: number, CF: number): void {
  positivo('a', a);
  positivo('b', b);
  noNegativo('c', c);
  noNegativo('d', d);
  noNegativo('CF', CF);
  if (c >= a) throw new ErrorParametro('El costo marginal inicial c ≥ a: no hay mercado rentable (y* = 0).');
}

export interface ResMonopolio {
  y_m: number; p_m: number; beneficio_m: number; opera: boolean;
  y_c: number; p_c: number; beneficio_c: number;
  EC_m: number; EP_m: number; EC_c: number; EP_c: number;
  perdida_eficiencia: number;
  elasticidad_m: number; tramo: 'elastico' | 'unitario' | 'inelastico';
  lerner: number; inverso_elasticidad: number;
  CMg_m: number; IMg_m: number;
}

/** IMg = CMg ⇒ a − 2b·y = c + 2d·y. */
export function monopolioLineal(a: number, b: number, c = 0, d = 0, CF = 0): ResMonopolio {
  validar(a, b, c, d, CF);
  const ym = (a - c) / (2 * b + 2 * d);
  const pm = a - b * ym;
  const Pi = pm * ym - (CF + c * ym + d * ym * ym);
  // Competencia: p = CMg ⇒ a − b·y = c + 2d·y
  const yc = (a - c) / (b + 2 * d);
  const pc = a - b * yc;
  const Pc = pc * yc - (CF + c * yc + d * yc * yc);
  const ecM = 0.5 * b * ym * ym;
  const epM = Pi + CF; // excedente del productor = IT − CV
  const ecC = 0.5 * b * yc * yc;
  const epC = Pc + CF;
  const pei = ecC + epC - (ecM + epM);
  const e = -pm / (b * ym);
  const cmg = c + 2 * d * ym;
  return {
    y_m: ym, p_m: pm, beneficio_m: Pi, opera: Pi >= -1e-12,
    y_c: yc, p_c: pc, beneficio_c: Pc,
    EC_m: ecM, EP_m: epM, EC_c: ecC, EP_c: epC,
    perdida_eficiencia: pei,
    elasticidad_m: e, tramo: e < -1 ? 'elastico' : e === -1 ? 'unitario' : 'inelastico',
    lerner: (pm - cmg) / pm, inverso_elasticidad: -1 / e,
    CMg_m: cmg, IMg_m: a - 2 * b * ym,
  };
}

export type Ramsey = { existe: false; motivo: string } | { existe: true; y: number; p: number };

/** Precio regulado p = CMe (beneficio cero) — raíz de mayor producción. */
export function precioRamsey(a: number, b: number, c = 0, d = 0, CF = 0): Ramsey {
  validar(a, b, c, d, CF);
  // a − b y = CF/y + c + d y  ⇔ (b + d) y² − (a − c) y + CF = 0
  const A = b + d;
  const B = -(a - c);
  const disc = B * B - 4 * A * CF;
  if (disc < 0) return { existe: false, motivo: 'La demanda nunca alcanza al costo medio.' };
  const y = (-B + Math.sqrt(disc)) / (2 * A);
  return { existe: true, y, p: a - b * y };
}

/** y = p^(−α), CMg = c: p = c/(1 − 1/α) si α > 1 (sección 10.5). */
export function elasticidadConstante(alpha: number, c: number) {
  positivo('c', c);
  positivo('α', alpha);
  if (alpha <= 1)
    return {
      existe: false as const,
      motivo: 'Con demanda inelástica (α ≤ 1) el IMg ≤ 0: el monopolista querría subir el precio sin límite.',
    };
  const p = c / (1 - 1 / alpha);
  return { existe: true as const, p, y: p ** -alpha, markup: p / c - 1, lerner: (p - c) / p };
}

/** Ej. 4: p = a − b·y + t ⇒ p* = (a+c)/2 + t/2. */
export function impuestoEspecifico(a: number, b: number, c: number, t: number) {
  positivo('a', a); positivo('b', b); noNegativo('c', c); noNegativo('t', t);
  const y = (a - c + t) / (2 * b);
  return { y, p: a - b * y + t, traslado: 0.5 };
}

/** Formulación estándar: el vendedor paga t por unidad ⇒ CMg = c + t. */
export function impuestoAlVendedor(a: number, b: number, c: number, t: number) {
  positivo('a', a); positivo('b', b); noNegativo('c', c); noNegativo('t', t);
  if (c + t >= a) return { y: 0, p: a, traslado: Number.NaN, recaudo: 0 };
  const y = (a - c - t) / (2 * b);
  const p = a - b * y;
  const p0 = (a + c) / 2;
  return { y, p, traslado: t > 0 ? (p - p0) / t : Number.NaN, recaudo: t * y };
}

interface Discrimina {
  y1: number; y2: number; p1: number; p2: number; beneficio: number; elasticidad1: number; elasticidad2: number;
}

function discrimina(a1: number, b1: number, a2: number, b2: number, k: number, c: number, activos: [number, number]): Discrimina | null {
  let y1: number;
  let y2: number;
  if (activos[0] === 1 && activos[1] === 1) {
    const [A11, A12, B1] = [2 * b1 + 2 * k, 2 * k, a1 - c];
    const [A21, A22, B2] = [2 * k, 2 * b2 + 2 * k, a2 - c];
    const det = A11 * A22 - A12 * A21;
    y1 = (B1 * A22 - A12 * B2) / det;
    y2 = (A11 * B2 - B1 * A21) / det;
    if (y1 < 0 || y2 < 0) return null;
  } else if (activos[0] === 1) {
    y1 = Math.max((a1 - c) / (2 * b1 + 2 * k), 0);
    y2 = 0;
  } else {
    y1 = 0;
    y2 = Math.max((a2 - c) / (2 * b2 + 2 * k), 0);
  }
  const p1 = a1 - b1 * y1;
  const p2 = a2 - b2 * y2;
  const y = y1 + y2;
  const beneficio = p1 * y1 + p2 * y2 - c * y - k * y * y;
  return {
    y1, y2, p1, p2, beneficio,
    elasticidad1: y1 > 0 ? -p1 / (b1 * y1) : Number.NaN,
    elasticidad2: y2 > 0 ? -p2 / (b2 * y2) : Number.NaN,
  };
}

/** Dos mercados p_i = a_i − b_i·y_i; C(y) = c·y + k·y², y = y1 + y2. */
export function discriminacionTercerGrado(a1: number, b1: number, a2: number, b2: number, costoCuadratico = 1, cLineal = 0) {
  positivo('a1', a1); positivo('b1', b1); positivo('a2', a2); positivo('b2', b2);
  const k = noNegativo('k', costoCuadratico);
  const c = noNegativo('c', cLineal);

  let mejor: Discrimina | null = null;
  for (const activos of [[1, 1], [1, 0], [0, 1]] as [number, number][]) {
    const sol = discrimina(a1, b1, a2, b2, k, c, activos);
    if (sol && (mejor === null || sol.beneficio > mejor.beneficio + 1e-15)) mejor = sol;
  }
  const disc = mejor as Discrimina;

  const Q = (p: number) => Math.max(0, (a1 - p) / b1) + Math.max(0, (a2 - p) / b2);
  const Pi = (p: number) => p * Q(p) - c * Q(p) - k * Q(p) ** 2;
  const cortes = [...new Set([0, Math.min(a1, a2), Math.max(a1, a2)])].sort((x, y) => x - y);
  const candidatos = [...cortes];
  for (let i = 0; i < cortes.length - 1; i++) {
    const lo = cortes[i];
    const hi = cortes[i + 1];
    const m = (lo + hi) / 2;
    const al = (a1 > m ? a1 / b1 : 0) + (a2 > m ? a2 / b2 : 0);
    const be = (a1 > m ? 1 / b1 : 0) + (a2 > m ? 1 / b2 : 0);
    const den = 2 * be + 2 * k * be * be;
    if (den > 0) {
      const pOpt = (al + be * c + 2 * k * be * al) / den;
      if (lo <= pOpt && pOpt <= hi) candidatos.push(pOpt);
    }
  }
  const pu = candidatos.reduce((best, p) => (Pi(p) > Pi(best) ? p : best), candidatos[0]);
  const uniforme = { p: pu, y: Q(pu), beneficio: Pi(pu), compran_ambos: Q(pu) > 0 && a1 > pu && a2 > pu };
  return { discriminacion: disc, uniforme, conviene_discriminar: disc.beneficio > uniforme.beneficio + 1e-12 };
}
