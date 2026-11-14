/**
 * Micro 3 · Modelos de poder de mercado e interacción estratégica que completan los de Micro 2
 * (micro2/modelos/mercados.ts): discriminación de segundo grado, Bertrand y Cournot con n empresas.
 * Notación estándar de manual: tipos de consumidor con demanda inversa pᵢ(q) = aᵢ − bᵢ·q y costo marginal c.
 */
import { ErrorParametro, noNegativo, positivo } from '../../core/errores';
import { ParamsDuopolio, validarDuopolio } from '../../micro2/modelos/mercados';

/* ======================================================= discriminación de segundo grado */

export interface ParamsSegundo {
  /** Tipo alto (valora más cada unidad): p₁(q) = a₁ − b₁·q. */
  a1: number;
  b1: number;
  /** Tipo bajo: p₂(q) = a₂ − b₂·q. */
  a2: number;
  b2: number;
  c: number;
}

export interface ResSegundo {
  /** Cantidad del paquete para el tipo bajo (reducida para que el alto no lo imite). */
  qL: number;
  /** Cantidad del paquete del tipo alto: eficiente (p₁ = c). */
  qH: number;
  /** Cantidad eficiente del tipo bajo (p₂ = c). */
  qLef: number;
  /** Pago total de cada paquete. */
  TL: number;
  TH: number;
  /** Renta informativa del tipo alto: lo que se le deja para que no elija el paquete bajo. */
  renta: number;
  beneficio: number;
  /** Beneficio con primer grado (información completa), para comparar. */
  beneficioPrimer: number;
  /** Pérdida irrecuperable en el tipo bajo. */
  PIE: number;
}

export function validarSegundo(q: ParamsSegundo): void {
  positivo('a₁', q.a1);
  positivo('b₁', q.b1);
  positivo('a₂', q.a2);
  positivo('b₂', q.b2);
  noNegativo('c', q.c);
  if (!(q.a1 > q.a2 && q.b1 <= q.b2))
    throw new ErrorParametro('En segundo grado el tipo 1 debe valorar más cada unidad: a₁ > a₂ y b₁ ≤ b₂.');
  if (q.c >= q.a2) throw new ErrorParametro('Con c ≥ a₂ el tipo bajo no compra: sube a₂ o baja c.');
}

/** Área bajo la demanda inversa a − b·q entre 0 y q. */
const area = (a: number, b: number, q: number) => a * q - (b / 2) * q * q;

/**
 * Menú de dos paquetes (cantidad, pago) con la misma cantidad de consumidores de cada tipo.
 * El tipo bajo paga todo su excedente bruto; el alto recibe su cantidad eficiente y una renta
 * informativa igual al área entre las dos demandas hasta q_L. Óptimo: 2·p₂(q_L) − p₁(q_L) = c.
 */
export function segundoGrado(q: ParamsSegundo): ResSegundo {
  validarSegundo(q);
  const qH = (q.a1 - q.c) / q.b1;
  const qLef = (q.a2 - q.c) / q.b2;
  const den = 2 * q.b2 - q.b1;
  let qL = den > 0 ? (2 * q.a2 - q.a1 - q.c) / den : 0;
  qL = Math.min(Math.max(qL, 0), qLef);
  const renta = area(q.a1, q.b1, qL) - area(q.a2, q.b2, qL);
  const TL = area(q.a2, q.b2, qL);
  const TH = area(q.a1, q.b1, qH) - renta;
  const beneficio = TL - q.c * qL + TH - q.c * qH;
  const beneficioPrimer = area(q.a1, q.b1, qH) - q.c * qH + area(q.a2, q.b2, qLef) - q.c * qLef;
  const PIE = area(q.a2, q.b2, qLef) - q.c * qLef - (area(q.a2, q.b2, qL) - q.c * qL);
  return { qL, qH, qLef, TL, TH, renta, beneficio, beneficioPrimer, PIE };
}

/* ================================================================ Bertrand */

export interface ResBertrand {
  /** Precio de equilibrio (Nash en precios con bien homogéneo). */
  p: number;
  y1: number;
  y2: number;
  pi1: number;
  pi2: number;
  /** Empresa que atiende el mercado (0 = lo comparten). */
  gana: 0 | 1 | 2;
}

/**
 * Bertrand con bien homogéneo y costos marginales constantes: si c₁ = c₂ el precio es el costo marginal
 * (paradoja de Bertrand); si difieren, la empresa eficiente fija p = min(c_alto, su precio de monopolio)
 * y se queda con todo el mercado.
 */
export function bertrand(q: ParamsDuopolio): ResBertrand {
  validarDuopolio(q);
  const Y = (p: number) => Math.max(0, (q.a - p) / q.b);
  if (Math.abs(q.c1 - q.c2) < 1e-12) {
    const y = Y(q.c1) / 2;
    return { p: q.c1, y1: y, y2: y, pi1: 0, pi2: 0, gana: 0 };
  }
  const gana: 1 | 2 = q.c1 < q.c2 ? 1 : 2;
  const cb = Math.min(q.c1, q.c2);
  const ca = Math.max(q.c1, q.c2);
  const p = Math.min(ca, (q.a + cb) / 2);
  const y = Y(p);
  const pi = (p - cb) * y;
  return gana === 1 ? { p, y1: y, y2: 0, pi1: pi, pi2: 0, gana } : { p, y1: 0, y2: y, pi1: 0, pi2: pi, gana };
}

/** Mejor respuesta en precios (bien homogéneo): bajar levemente el precio rival, sin ir bajo el costo ni sobre el de monopolio. */
export const respuestaPrecio = (q: ParamsDuopolio, c: number, pRival: number): number =>
  Math.min((q.a + c) / 2, Math.max(c, pRival));

/* ================================================================ Cournot con n empresas */

export interface ResCournotN {
  yi: number;
  Y: number;
  p: number;
  pii: number;
  /** Índice de Herfindahl (0–10 000) e índice de Lerner. */
  hhi: number;
  lerner: number;
}

/** n empresas simétricas con costo c₁: yᵢ = (a − c)/(b(n + 1)), p = (a + n·c)/(n + 1). */
export function cournotN(q: ParamsDuopolio, n: number): ResCournotN {
  validarDuopolio(q);
  if (!Number.isInteger(n) || n < 1) throw new ErrorParametro('El número de empresas debe ser un entero positivo.');
  const c = q.c1;
  const yi = Math.max(0, (q.a - c) / (q.b * (n + 1)));
  const Y = n * yi;
  const p = q.a - q.b * Y;
  return { yi, Y, p, pii: (p - c) * yi, hhi: 10000 / n, lerner: p > 0 ? (p - c) / p : 0 };
}
