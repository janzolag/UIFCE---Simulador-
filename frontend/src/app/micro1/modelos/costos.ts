/**
 * Simulador 7 — Costos de largo y corto plazo (port de modelos/costos.py).
 * Monsalve (2017), semana 6 y semana 7.
 */
import { ErrorParametro, noNegativo, positivo } from '../../core/errores';
import { CobbDouglasP, LeontiefP, LinealP, SeparableP, Tecnologia } from './produccion';

// ================================================================ LARGO PLAZO
export interface Condicionadas {
  x: number;
  y: number;
  costo: number;
  tipo: 'interior' | 'vertice' | 'indeterminado' | 'esquina_x' | 'esquina_y';
}

/** Minimiza w1·x + w2·y  s.a. F(x, y) = z. */
export function demandasCondicionadas(tec: Tecnologia, w1: number, w2: number, z: number): Condicionadas {
  positivo('w1', w1); positivo('w2', w2); noNegativo('z', z);
  let x: number;
  let y: number;
  let tipo: Condicionadas['tipo'];
  if (tec instanceof CobbDouglasP) {
    const { alpha: a, beta: b, A } = tec;
    const s = a + b;
    const zz = z / A; // ej. 11: z → z/A
    x = ((a * w2) / (b * w1)) ** (b / s) * zz ** (1 / s);
    y = ((b * w1) / (a * w2)) ** (a / s) * zz ** (1 / s);
    tipo = 'interior';
  } else if (tec instanceof SeparableP) {
    x = ((w2 * z) / (w1 + w2)) ** 2;
    y = ((w1 * z) / (w1 + w2)) ** 2;
    tipo = 'interior';
  } else if (tec instanceof LeontiefP) {
    x = tec.a * z;
    y = tec.b * z;
    tipo = 'vertice';
  } else if (tec instanceof LinealP) {
    const c1 = w1 / tec.a;
    const c2 = w2 / tec.b;
    if (Math.abs(c1 - c2) <= 1e-12 * Math.max(c1, c2)) {
      x = z / (2 * tec.a); y = z / (2 * tec.b); tipo = 'indeterminado';
    } else if (c1 < c2) {
      x = z / tec.a; y = 0; tipo = 'esquina_x';
    } else {
      x = 0; y = z / tec.b; tipo = 'esquina_y';
    }
  } else throw new ErrorParametro(`Tecnología no soportada: ${tec.constructor.name}`);
  return { x, y, costo: w1 * x + w2 * y, tipo };
}

export function costoLp(tec: Tecnologia, w1: number, w2: number, z: number): number {
  return demandasCondicionadas(tec, w1, w2, z).costo;
}

/** B de C(z) = B·z^{1/(α+β)} (ej. 1, semana 6). */
export function constanteBCd(alpha: number, beta: number, w1: number, w2: number): number {
  const s = alpha + beta;
  return w1 * ((alpha * w2) / (beta * w1)) ** (beta / s) + w2 * ((beta * w1) / (alpha * w2)) ** (alpha / s);
}

export function curvasLp(tec: Tecnologia, w1: number, w2: number, z: number, h = 1e-6) {
  const C = costoLp(tec, w1, w2, z);
  const zl = Math.max(z - h, 0);
  const cmg = (costoLp(tec, w1, w2, z + h) - costoLp(tec, w1, w2, zl)) / (z + h - zl);
  return { CT: C, CMe: z > 0 ? C / z : Number.NaN, CMg: cmg };
}

export type OfertaLP = { existe: false; motivo: string } | { existe: true; z: number; beneficio: number };

/** p = C'(z) (sección 6.4). Sólo tiene solución con costo estrictamente convexo. */
export function ofertaLp(tec: Tecnologia, p: number, w1: number, w2: number): OfertaLP {
  positivo('p', p);
  let z: number;
  if (tec instanceof CobbDouglasP) {
    const s = tec.alpha + tec.beta;
    if (s >= 1) return { existe: false, motivo: 'C(z) no es estrictamente convexa (α+β ≥ 1).' };
    const B = constanteBCd(tec.alpha, tec.beta, w1, w2);
    z = tec.A * ((s * tec.A * p) / B) ** (s / (1 - s));
  } else if (tec instanceof SeparableP) {
    const B = (w1 * w2) / (w1 + w2);
    z = p / (2 * B); // ej. 8
  } else return { existe: false, motivo: 'Costo lineal: oferta 0, indeterminada o infinita.' };
  return { existe: true, z, beneficio: p * z - costoLp(tec, w1, w2, z) };
}

/** F = y·e^x (ej. 4, semana 6): x* = ln(w2 z / w1), y* = w1/w2, si z > w1/w2. */
export function costoRendimientosCrecientes(w1: number, w2: number, z: number) {
  positivo('w1', w1); positivo('w2', w2); positivo('z', z);
  if (z <= w1 / w2) throw new ErrorParametro('La solución interior exige z > w1/w2.');
  const x = Math.log((w2 * z) / w1);
  const y = w1 / w2;
  return { x, y, costo: w1 * x + w2 * y };
}

/** Minimiza c1·y1^k + c2·y2^k  s.a. y1 + y2 = Y (ej. 6, semana 6). */
export function dosPlantas(c1: number, c2: number, Y: number, exponente: number) {
  positivo('c1', c1); positivo('c2', c2); noNegativo('Y', Y);
  const k = positivo('exponente', exponente);
  let y1: number;
  let y2: number;
  if (k > 1) {
    const r = (c1 / c2) ** (1 / (k - 1)); // y2 / y1
    y1 = Y / (1 + r);
    y2 = Y - y1;
  } else if (k < 1) {
    [y1, y2] = c1 < c2 ? [Y, 0] : [0, Y];
  } else {
    [y1, y2] = c1 < c2 ? [Y, 0] : c2 < c1 ? [0, Y] : [Y / 2, Y / 2];
  }
  return { y1, y2, costo: c1 * y1 ** k + c2 * y2 ** k };
}

// ================================================================ CORTO PLAZO
function curvas(CV: number, CF: number, CMg: number, y: number) {
  return {
    CT: CV + CF, CV, CF, CMg,
    CMe: y > 0 ? (CV + CF) / y : Number.POSITIVE_INFINITY,
    CVMe: y > 0 ? CV / y : Number.NaN,
    CFMe: y > 0 ? CF / y : Number.POSITIVE_INFINITY,
  };
}

/** F = x^α·k^β con k fijo (ej. 1, semana 7). */
export function costoCpCobbDouglas(alpha: number, beta: number, w1: number, w2: number, k: number, y: number) {
  positivo('α', alpha); positivo('β', beta); positivo('w1', w1);
  noNegativo('w2', w2); positivo('k', k); noNegativo('y', y);
  const x = y ** (1 / alpha) / k ** (beta / alpha);
  const CV = w1 * x;
  const CF = w2 * k;
  const cmg = (w1 / (alpha * k ** (beta / alpha))) * y ** ((1 - alpha) / alpha);
  return { ...curvas(CV, CF, cmg, y), x };
}

/** F = √x + √k (ej. 2, semana 7): sólo definido para y ≥ √k. */
export function costoCpSeparable(w1: number, w2: number, k: number, y: number) {
  positivo('w1', w1); noNegativo('w2', w2); positivo('k', k);
  if (y < Math.sqrt(k)) throw new ErrorParametro(`Con k=${k} la producción mínima es √k = ${Math.sqrt(k).toPrecision(4)}.`);
  const x = (y - Math.sqrt(k)) ** 2;
  return { ...curvas(w1 * x, w2 * k, 2 * w1 * (y - Math.sqrt(k)), y), x };
}

/** f(x) = (x−1)³ + 1 (ej. 3, semana 7): C = w1·(y−1)^{1/3} + w1 + w2·k. */
export function costoCpCubica(w1: number, w2: number, k: number, y: number) {
  positivo('w1', w1); noNegativo('w2', w2); noNegativo('k', k); noNegativo('y', y);
  const x = Math.sign(y - 1) * Math.abs(y - 1) ** (1 / 3) + 1;
  const cmg = y === 1 ? Number.POSITIVE_INFINITY : (w1 / 3) * Math.abs(y - 1) ** (-2 / 3);
  return { ...curvas(w1 * x, w2 * k, cmg, y), x };
}

/**
 * C(q) = CF + a·q − b·q² + c·q³ — forma "de libro de texto" con CMg en U.
 * Se exige a > 0, b ≥ 0, c > 0 y b² < 3ac para que el CMg sea siempre positivo.
 */
export class CostoCubico {
  readonly CF: number;
  readonly a: number;
  readonly b: number;
  readonly c: number;

  constructor(CF: number, a: number, b: number, c: number) {
    this.CF = noNegativo('CF', CF);
    this.a = positivo('a', a);
    this.b = noNegativo('b', b);
    this.c = positivo('c', c);
    if (b * b >= 3 * a * c) throw new ErrorParametro('Se requiere b² < 3ac para que el costo marginal sea positivo.');
  }

  CV = (q: number): number => this.a * q - this.b * q ** 2 + this.c * q ** 3;
  CT = (q: number): number => this.CF + this.CV(q);
  CMg = (q: number): number => this.a - 2 * this.b * q + 3 * this.c * q ** 2;
  CVMe = (q: number): number => this.a - this.b * q + this.c * q ** 2;
  CMe = (q: number): number => this.CVMe(q) + (q > 0 ? this.CF / q : Number.POSITIVE_INFINITY);

  q_min_cvme(): number {
    return this.b / (2 * this.c);
  }

  q_min_cmg(): number {
    return this.b / (3 * this.c);
  }

  /** Resuelve CMg = CMe  ⇔  2c·q³ − b·q² − CF = 0 (raíz positiva única). */
  q_min_cme(): number {
    if (this.CF === 0) return this.q_min_cvme();
    let lo = 0;
    let hi = Math.max(1, this.q_min_cvme());
    const g = (q: number) => 2 * this.c * q ** 3 - this.b * q ** 2 - this.CF;
    while (g(hi) < 0) hi *= 2;
    for (let i = 0; i < 200; i++) {
      const m = (lo + hi) / 2;
      if (g(m) < 0) lo = m;
      else hi = m;
    }
    return (lo + hi) / 2;
  }

  precio_cierre(): number {
    return this.CVMe(this.q_min_cvme());
  }

  precio_nivelacion(): number {
    return this.CMe(this.q_min_cme());
  }
}
