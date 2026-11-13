/**
 * Micro 2 · Modelos de poder de mercado con la notación de Varian (Microeconomía intermedia, 8.ª ed.):
 * producción y, precio p(y), ingreso marginal IMg, costo marginal CMg y elasticidad ε.
 * Demanda inversa lineal p(y) = a − b·y; costo C(y) = F + c·y + (d/2)·y² ⇒ CMg = c + d·y.
 */
import { ErrorParametro, noNegativo, positivo } from '../../core/errores';

/* ================================================================ monopolio */

export interface ParamsMonopolio {
  a: number;
  b: number;
  c: number;
  d: number;
  F: number;
}

export interface ResMonopolio {
  /** Monopolio: IMg = CMg. */
  y: number;
  p: number;
  cmg: number;
  cme: number;
  beneficio: number;
  /** Competencia (o discriminación de primer grado): p = CMg. */
  yc: number;
  pc: number;
  EC: number;
  EP: number;
  ECc: number;
  EPc: number;
  /** Pérdida irrecuperable de eficiencia (excedente total perdido frente a p = CMg). */
  PIE: number;
  /** Elasticidad de la demanda en el óptimo (valor absoluto) y margen de Lerner. */
  elasticidad: number;
  lerner: number;
}

export function validarMonopolio(q: ParamsMonopolio): void {
  positivo('a', q.a);
  positivo('b', q.b);
  noNegativo('c', q.c);
  noNegativo('d', q.d);
  noNegativo('F', q.F);
  if (q.c >= q.a) throw new ErrorParametro('Con c ≥ a el costo marginal supera al precio máximo: no se produce nada.');
}

export const demanda = (q: ParamsMonopolio, y: number): number => q.a - q.b * y;
export const ingresoMarginal = (q: ParamsMonopolio, y: number): number => q.a - 2 * q.b * y;
export const costoMarginal = (q: ParamsMonopolio, y: number): number => q.c + q.d * y;
export const costoMedio = (q: ParamsMonopolio, y: number): number => q.F / y + q.c + (q.d / 2) * y;
export const costoTotal = (q: ParamsMonopolio, y: number): number => q.F + q.c * y + (q.d / 2) * y * y;

export function monopolio(q: ParamsMonopolio): ResMonopolio {
  validarMonopolio(q);
  // IMg = CMg: a − 2b·y = c + d·y.
  const y = (q.a - q.c) / (2 * q.b + q.d);
  const p = demanda(q, y);
  // p = CMg: a − b·y = c + d·y.
  const yc = (q.a - q.c) / (q.b + q.d);
  const pc = demanda(q, yc);
  const cmg = costoMarginal(q, y);
  const EC = 0.5 * (q.a - p) * y;
  const EP = (p - q.c) * y - (q.d / 2) * y * y; // ingreso − costo variable
  const ECc = 0.5 * (q.a - pc) * yc;
  const EPc = (pc - q.c) * yc - (q.d / 2) * yc * yc;
  const elasticidad = p / (q.b * y);
  return {
    y,
    p,
    cmg,
    cme: costoMedio(q, y),
    beneficio: p * y - costoTotal(q, y),
    yc,
    pc,
    EC,
    EP,
    ECc,
    EPc,
    PIE: ECc + EPc - (EC + EP),
    elasticidad,
    lerner: (p - cmg) / p,
  };
}

/* ======================================================= discriminación de tercer grado */

export interface ParamsTercer {
  a1: number;
  b1: number;
  a2: number;
  b2: number;
  c: number;
  F: number;
}

export interface MercadoRes {
  y: number;
  p: number;
  elasticidad: number;
  /** Competencia en ese mercado: p = c. */
  yc: number;
  PIE: number;
  EC: number;
}

export interface ResTercer {
  m1: MercadoRes;
  m2: MercadoRes;
  beneficio: number;
  /** Precio único (sin discriminar) y su beneficio, para comparar. */
  pUnico: number;
  y1Unico: number;
  y2Unico: number;
  beneficioUnico: number;
}

export function validarTercer(q: ParamsTercer): void {
  positivo('a₁', q.a1);
  positivo('b₁', q.b1);
  positivo('a₂', q.a2);
  positivo('b₂', q.b2);
  noNegativo('c', q.c);
  noNegativo('F', q.F);
  if (q.c >= Math.max(q.a1, q.a2))
    throw new ErrorParametro('Con c mayor o igual que el precio máximo de ambos mercados no se produce nada.');
}

/**
 * Con costo marginal constante c cada mercado se trata por separado: IMgᵢ = c, es decir,
 * pᵢ·(1 − 1/|εᵢ|) = c. Un mercado con aᵢ ≤ c no se atiende.
 */
export function tercerGrado(q: ParamsTercer): ResTercer {
  validarTercer(q);
  const mercado = (a: number, b: number): MercadoRes => {
    if (a <= q.c) return { y: 0, p: a, elasticidad: Infinity, yc: 0, PIE: 0, EC: 0 };
    const y = (a - q.c) / (2 * b);
    const p = (a + q.c) / 2;
    const yc = (a - q.c) / b;
    return { y, p, elasticidad: p / (b * y), yc, PIE: 0.5 * (p - q.c) * (yc - y), EC: 0.5 * (a - p) * y };
  };
  const m1 = mercado(q.a1, q.b1);
  const m2 = mercado(q.a2, q.b2);
  const beneficio = (m1.p - q.c) * m1.y + (m2.p - q.c) * m2.y - q.F;
  // Precio único: maximiza (p − c)·[D₁(p) + D₂(p)], con Dᵢ(p) = max(0, (aᵢ − p)/bᵢ).
  const D = (p: number, a: number, b: number) => Math.max(0, (a - p) / b);
  const pi = (p: number) => (p - q.c) * (D(p, q.a1, q.b1) + D(p, q.a2, q.b2));
  const candidatos: number[] = [];
  const s = 1 / q.b1 + 1 / q.b2;
  const pAmbos = (q.a1 / q.b1 + q.a2 / q.b2 + q.c * s) / (2 * s);
  if (pAmbos <= Math.min(q.a1, q.a2)) candidatos.push(pAmbos);
  for (const a of [q.a1, q.a2]) if (a > q.c) candidatos.push((a + q.c) / 2);
  candidatos.push(Math.min(q.a1, q.a2));
  let pUnico = candidatos[0];
  for (const p of candidatos) if (pi(p) > pi(pUnico) + 1e-12) pUnico = p;
  return {
    m1,
    m2,
    beneficio,
    pUnico,
    y1Unico: D(pUnico, q.a1, q.b1),
    y2Unico: D(pUnico, q.a2, q.b2),
    beneficioUnico: pi(pUnico) - q.F,
  };
}

/* ================================================================ oligopolio */

export interface ParamsDuopolio {
  a: number;
  b: number;
  c1: number;
  c2: number;
}

export interface PuntoDuopolio {
  y1: number;
  y2: number;
  Y: number;
  p: number;
  pi1: number;
  pi2: number;
}

export function validarDuopolio(q: ParamsDuopolio): void {
  positivo('a', q.a);
  positivo('b', q.b);
  noNegativo('c₁', q.c1);
  noNegativo('c₂', q.c2);
  if (Math.min(q.c1, q.c2) >= q.a) throw new ErrorParametro('Con costos marginales mayores o iguales que a ninguna empresa produce.');
}

const punto = (q: ParamsDuopolio, y1: number, y2: number): PuntoDuopolio => {
  const Y = y1 + y2;
  const p = Math.max(0, q.a - q.b * Y);
  return { y1, y2, Y, p, pi1: (p - q.c1) * y1, pi2: (p - q.c2) * y2 };
};

/** Función de reacción f₁(y₂) = max(0, (a − c₁ − b·y₂)/(2b)). */
export const reaccion1 = (q: ParamsDuopolio, y2: number): number => Math.max(0, (q.a - q.c1 - q.b * y2) / (2 * q.b));
/** Función de reacción f₂(y₁) = max(0, (a − c₂ − b·y₁)/(2b)). */
export const reaccion2 = (q: ParamsDuopolio, y1: number): number => Math.max(0, (q.a - q.c2 - q.b * y1) / (2 * q.b));

/** Equilibrio de Cournot-Nash: y₁ = f₁(y₂), y₂ = f₂(y₁) (con soluciones de esquina). */
export function cournotNash(q: ParamsDuopolio): PuntoDuopolio {
  validarDuopolio(q);
  let y1 = (q.a - 2 * q.c1 + q.c2) / (3 * q.b);
  let y2 = (q.a - 2 * q.c2 + q.c1) / (3 * q.b);
  if (y1 < 0) {
    y1 = 0;
    y2 = reaccion2(q, 0);
  } else if (y2 < 0) {
    y2 = 0;
    y1 = reaccion1(q, 0);
  }
  return punto(q, y1, y2);
}

/** Stackelberg con la empresa 1 como líder: maximiza π₁(y₁, f₂(y₁)). */
export function stackelbergLider(q: ParamsDuopolio): PuntoDuopolio {
  validarDuopolio(q);
  const pi1 = (y1: number) => punto(q, y1, reaccion2(q, y1)).pi1;
  const umbral = Math.max(0, (q.a - q.c2) / q.b); // desde aquí el seguidor produce 0
  const interior = Math.min(Math.max(0, (q.a - 2 * q.c1 + q.c2) / (2 * q.b)), umbral);
  const monop = Math.max(Math.max(0, (q.a - q.c1) / (2 * q.b)), umbral);
  const y1 = pi1(monop) > pi1(interior) + 1e-12 ? monop : interior;
  return punto(q, y1, reaccion2(q, y1));
}

/** Colusión (cartel): maximiza el beneficio conjunto; produce la empresa de menor costo (reparto igual si c₁ = c₂). */
export function colusion(q: ParamsDuopolio): PuntoDuopolio {
  validarDuopolio(q);
  const cmin = Math.min(q.c1, q.c2);
  const Y = (q.a - cmin) / (2 * q.b);
  if (q.c1 === q.c2) return punto(q, Y / 2, Y / 2);
  return q.c1 < q.c2 ? punto(q, Y, 0) : punto(q, 0, Y);
}

/** Competencia (p = costo marginal mínimo). */
export function competencia(q: ParamsDuopolio): PuntoDuopolio {
  validarDuopolio(q);
  const cmin = Math.min(q.c1, q.c2);
  const Y = (q.a - cmin) / q.b;
  if (q.c1 === q.c2) return punto(q, Y / 2, Y / 2);
  return q.c1 < q.c2 ? punto(q, Y, 0) : punto(q, 0, Y);
}

/** Curva de isobeneficio de la empresa 1: y₂ = (a − c₁ − b·y₁ − π/y₁)/b. */
export const isobeneficio1 = (q: ParamsDuopolio, pi: number, y1: number): number =>
  (q.a - q.c1 - q.b * y1 - pi / y1) / q.b;

/* ================================================================ intercambio (Edgeworth) */

export interface ParamsEdgeworth {
  /** Exponente de A sobre el bien 1: u_A = x₁ᵃ·x₂^{1−a}. */
  a: number;
  /** Exponente de B sobre el bien 1: u_B = x₁ᵇ·x₂^{1−b}. */
  b: number;
  wA1: number;
  wA2: number;
  wB1: number;
  wB2: number;
}

export interface ResEdgeworth {
  w1: number;
  w2: number;
  /** Precio relativo walrasiano p₁/p₂ (bien 2 numerario). */
  p: number;
  xA1: number;
  xA2: number;
  xB1: number;
  xB2: number;
  uA0: number;
  uB0: number;
  uA: number;
  uB: number;
}

export function validarEdgeworth(q: ParamsEdgeworth): void {
  for (const [n, v] of [['a', q.a], ['b', q.b]] as const)
    if (!(v > 0 && v < 1)) throw new ErrorParametro(`${n} debe estar entre 0 y 1 (recibido: ${v}).`);
  for (const [n, v] of [['ω₁ᴬ', q.wA1], ['ω₂ᴬ', q.wA2], ['ω₁ᴮ', q.wB1], ['ω₂ᴮ', q.wB2]] as const) noNegativo(n, v);
  if (!(q.wA1 + q.wB1 > 0) || !(q.wA2 + q.wB2 > 0))
    throw new ErrorParametro('La economía necesita una dotación total positiva de ambos bienes.');
}

export const utilidad = (alfa: number, x1: number, x2: number): number =>
  x1 > 0 && x2 > 0 ? Math.pow(x1, alfa) * Math.pow(x2, 1 - alfa) : 0;

/** Curva de indiferencia x₂(x₁) de nivel u para u = x₁^α·x₂^{1−α}. */
export const indiferencia = (alfa: number, u: number, x1: number): number =>
  x1 > 0 ? Math.pow(u / Math.pow(x1, alfa), 1 / (1 - alfa)) : Infinity;

/** Curva de contrato (TMSᴬ = TMSᴮ) en coordenadas de A: x₂ᴬ en función de x₁ᴬ. */
export function contrato(q: ParamsEdgeworth, xA1: number): number {
  const w1 = q.wA1 + q.wB1;
  const w2 = q.wA2 + q.wB2;
  const al = q.a / (1 - q.a);
  const be = q.b / (1 - q.b);
  const den = al * (w1 - xA1) + be * xA1;
  return den > 0 ? (be * w2 * xA1) / den : w2;
}

/** Equilibrio walrasiano con p₂ = 1: exceso de demanda del bien 1 igual a cero. */
export function walras(q: ParamsEdgeworth): ResEdgeworth {
  validarEdgeworth(q);
  const w1 = q.wA1 + q.wB1;
  const w2 = q.wA2 + q.wB2;
  const p = (q.a * q.wA2 + q.b * q.wB2) / ((1 - q.a) * q.wA1 + (1 - q.b) * q.wB1);
  const mA = p * q.wA1 + q.wA2;
  const mB = p * q.wB1 + q.wB2;
  const xA1 = (q.a * mA) / p;
  const xA2 = (1 - q.a) * mA;
  const xB1 = (q.b * mB) / p;
  const xB2 = (1 - q.b) * mB;
  return {
    w1,
    w2,
    p,
    xA1,
    xA2,
    xB1,
    xB2,
    uA0: utilidad(q.a, q.wA1, q.wA2),
    uB0: utilidad(q.b, q.wB1, q.wB2),
    uA: utilidad(q.a, xA1, xA2),
    uB: utilidad(q.b, xB1, xB2),
  };
}

/** Exceso de demanda agregado (z₁, z₂) a precios (p, 1): la ley de Walras exige p·z₁ + z₂ = 0. */
export function excesoDemanda(q: ParamsEdgeworth, p: number): [number, number] {
  const mA = p * q.wA1 + q.wA2;
  const mB = p * q.wB1 + q.wB2;
  return [
    (q.a * mA) / p + (q.b * mB) / p - (q.wA1 + q.wB1),
    (1 - q.a) * mA + (1 - q.b) * mB - (q.wA2 + q.wB2),
  ];
}
