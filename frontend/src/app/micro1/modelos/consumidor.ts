/**
 * Simuladores 2 y 3 — Preferencias y elección óptima (port de modelos/consumidor.py).
 * Monsalve (2017), Vol. I, semanas 1 y 2. Todas las familias exponen la misma interfaz.
 */
import { ErrorParametro, noNegativo, positivo } from '../../core/errores';

const NAN = Number.NaN;
const INF = Number.POSITIVE_INFINITY;

export interface Propiedades {
  monotona: boolean;
  convexa: boolean;
  homotetica: boolean;
  diferenciable: boolean;
  estrictamente_convexa?: boolean;
  efecto_ingreso_x_nulo?: boolean;
}

export interface Sol {
  x: number;
  y: number;
  tipo: string;
  x_min?: number;
  x_max?: number;
  nota?: string;
  ingreso_supernumerario?: number;
  es_giffen?: boolean;
}

export interface Eleccion extends Sol {
  utilidad: number;
  precio_relativo: number;
  tms: number | null;
  gasto: number;
}

function validarPrecios(p1: number, p2: number, M?: number): void {
  positivo('p1', p1);
  positivo('p2', p2);
  if (M !== undefined) noNegativo('M', M);
}

function sol(x: number, y: number, tipo = 'interior', extra: Partial<Sol> = {}): Sol {
  return { x, y, tipo, ...extra };
}

export abstract class Utilidad {
  abstract readonly nombre: string;
  abstract readonly propiedades: Propiedades;
  abstract U(x: number, y: number): number;
  abstract curvaIndiferencia(U0: number, x: number): number;
  abstract marshall(p1: number, p2: number, M: number): Sol;
  abstract indirecta(p1: number, p2: number, M: number): number;
  abstract gasto(p1: number, p2: number, U0: number): number;
  abstract hicks(p1: number, p2: number, U0: number): [number, number];

  umg(_x: number, _y: number): [number, number] | null {
    return null;
  }

  tms(x: number, y: number): number | null {
    const g = this.umg(x, y);
    if (g === null) return null;
    if (g[1] === 0) return INF;
    return g[0] / g[1];
  }

  /** Resumen para el simulador 3: canasta, utilidad y condición de Jevons. */
  eleccionOptima(p1: number, p2: number, M: number): Eleccion {
    const s = this.marshall(p1, p2, M);
    return {
      ...s,
      utilidad: this.U(s.x, s.y),
      precio_relativo: p1 / p2,
      tms: s.tipo === 'interior' ? this.tms(s.x, s.y) : null,
      gasto: p1 * s.x + p2 * s.y,
    };
  }
}

/** U = x^α · y^β. */
export class CobbDouglas extends Utilidad {
  readonly nombre = 'Cobb-Douglas';
  readonly propiedades: Propiedades = { monotona: true, convexa: true, homotetica: true, diferenciable: true };
  constructor(public alpha = 1, public beta = 1) {
    super();
    positivo('α', alpha);
    positivo('β', beta);
  }
  U(x: number, y: number): number {
    if (x <= 0 || y <= 0) return 0;
    return x ** this.alpha * y ** this.beta;
  }
  override umg(x: number, y: number): [number, number] | null {
    if (x <= 0 || y <= 0) return null; // en los ejes la TMS de Cobb-Douglas no está definida
    const u = this.U(x, y);
    return [(this.alpha * u) / x, (this.beta * u) / y];
  }
  curvaIndiferencia(U0: number, x: number): number {
    if (x <= 0 || U0 <= 0) return NAN;
    return (U0 / x ** this.alpha) ** (1 / this.beta);
  }
  marshall(p1: number, p2: number, M: number): Sol {
    validarPrecios(p1, p2, M);
    const s = this.alpha + this.beta;
    return sol((this.alpha * M) / (s * p1), (this.beta * M) / (s * p2));
  }
  indirecta(p1: number, p2: number, M: number): number {
    const d = this.marshall(p1, p2, M);
    return this.U(d.x, d.y);
  }
  gasto(p1: number, p2: number, U0: number): number {
    validarPrecios(p1, p2);
    noNegativo('U0', U0);
    const { alpha: a, beta: b } = this;
    return (a + b) * (U0 * (p1 / a) ** a * (p2 / b) ** b) ** (1 / (a + b));
  }
  hicks(p1: number, p2: number, U0: number): [number, number] {
    const e = this.gasto(p1, p2, U0);
    const s = this.alpha + this.beta;
    return [(this.alpha * e) / (s * p1), (this.beta * e) / (s * p2)];
  }
}

/** U = Mín{a·x, b·y}. */
export class Leontief extends Utilidad {
  readonly nombre = 'Leontief (complementarios perfectos)';
  readonly propiedades: Propiedades = { monotona: false, convexa: true, homotetica: true, diferenciable: false };
  constructor(public a = 1, public b = 1) {
    super();
    positivo('a', a);
    positivo('b', b);
  }
  U(x: number, y: number): number {
    return Math.min(this.a * x, this.b * y);
  }
  curvaIndiferencia(U0: number, x: number): number {
    if (x < U0 / this.a - 1e-12) return NAN;
    if (Math.abs(x - U0 / this.a) <= 1e-12) return INF; // tramo vertical
    return U0 / this.b;
  }
  marshall(p1: number, p2: number, M: number): Sol {
    validarPrecios(p1, p2, M);
    const den = this.b * p1 + this.a * p2;
    return sol((this.b * M) / den, (this.a * M) / den, 'vertice');
  }
  indirecta(p1: number, p2: number, M: number): number {
    validarPrecios(p1, p2, M);
    return (this.a * this.b * M) / (this.b * p1 + this.a * p2);
  }
  gasto(p1: number, p2: number, U0: number): number {
    validarPrecios(p1, p2);
    noNegativo('U0', U0);
    return U0 * (p1 / this.a + p2 / this.b);
  }
  hicks(p1: number, p2: number, U0: number): [number, number] {
    validarPrecios(p1, p2);
    return [U0 / this.a, U0 / this.b];
  }
}

/** U = a·x + b·y — sustitutos perfectos. */
export class Lineal extends Utilidad {
  readonly nombre = 'Lineal (sustitutos perfectos)';
  readonly propiedades: Propiedades = {
    monotona: true, convexa: true, homotetica: true, diferenciable: true, estrictamente_convexa: false,
  };
  constructor(public a = 1, public b = 1) {
    super();
    positivo('a', a);
    positivo('b', b);
  }
  U(x: number, y: number): number {
    return this.a * x + this.b * y;
  }
  override umg(): [number, number] {
    return [this.a, this.b];
  }
  curvaIndiferencia(U0: number, x: number): number {
    const y = (U0 - this.a * x) / this.b;
    return y >= -1e-12 ? y : NAN;
  }
  marshall(p1: number, p2: number, M: number): Sol {
    validarPrecios(p1, p2, M);
    const r1 = this.a / p1; // utilidad por peso
    const r2 = this.b / p2;
    if (Math.abs(r1 - r2) <= 1e-12 * Math.max(r1, r2))
      return sol(M / (2 * p1), M / (2 * p2), 'indeterminado', { x_min: 0, x_max: M / p1 });
    if (r1 > r2) return sol(M / p1, 0, 'esquina_x');
    return sol(0, M / p2, 'esquina_y');
  }
  indirecta(p1: number, p2: number, M: number): number {
    validarPrecios(p1, p2, M);
    return M * Math.max(this.a / p1, this.b / p2);
  }
  gasto(p1: number, p2: number, U0: number): number {
    validarPrecios(p1, p2);
    noNegativo('U0', U0);
    return U0 * Math.min(p1 / this.a, p2 / this.b);
  }
  hicks(p1: number, p2: number, U0: number): [number, number] {
    validarPrecios(p1, p2);
    const r1 = p1 / this.a;
    const r2 = p2 / this.b;
    if (Math.abs(r1 - r2) <= 1e-12 * Math.max(r1, r2)) return [U0 / (2 * this.a), U0 / (2 * this.b)];
    return r1 < r2 ? [U0 / this.a, 0] : [0, U0 / this.b];
  }
}

/** U = v(x) + y. La y es "dinero" (sección 1.7). */
export abstract class Cuasilineal extends Utilidad {
  readonly propiedades: Propiedades = {
    monotona: true, convexa: true, homotetica: false, diferenciable: true, efecto_ingreso_x_nulo: true,
  };
  abstract v(x: number): number;
  abstract vp(x: number): number;
  abstract vpInv(r: number): number;
  abstract vInv(u: number): number;

  U(x: number, y: number): number {
    return this.v(x) + y;
  }
  override umg(x: number, _y: number): [number, number] {
    return [this.vp(x), 1];
  }
  curvaIndiferencia(U0: number, x: number): number {
    return U0 - this.v(x);
  }
  xInterior(p1: number, p2: number): number {
    return this.vpInv(p1 / p2);
  }
  marshall(p1: number, p2: number, M: number): Sol {
    validarPrecios(p1, p2, M);
    const xh = this.xInterior(p1, p2);
    if (p1 * xh <= M) return sol(xh, (M - p1 * xh) / p2, xh > 0 ? 'interior' : 'esquina_y');
    return sol(M / p1, 0, 'esquina_x', { nota: 'Presupuesto bajo: todo se gasta en x (nota 16, Monsalve).' });
  }
  indirecta(p1: number, p2: number, M: number): number {
    const d = this.marshall(p1, p2, M);
    return this.U(d.x, d.y);
  }
  hicks(p1: number, p2: number, U0: number): [number, number] {
    validarPrecios(p1, p2);
    const xh = this.xInterior(p1, p2);
    if (U0 >= this.v(xh)) return [xh, U0 - this.v(xh)];
    return [this.vInv(U0), 0];
  }
  gasto(p1: number, p2: number, U0: number): number {
    const [h1, h2] = this.hicks(p1, p2, U0);
    return p1 * h1 + p2 * h2;
  }
  ingresoMinimoInterior(p1: number, p2: number): number {
    return p1 * this.xInterior(p1, p2);
  }
}

/** U = a·√x + y. */
export class CuasilinealRaiz extends Cuasilineal {
  readonly nombre = 'Cuasilineal a√x + y';
  constructor(public a = 1) {
    super();
    positivo('a', a);
  }
  v(x: number): number {
    return this.a * Math.sqrt(Math.max(x, 0));
  }
  vp(x: number): number {
    return x <= 0 ? INF : this.a / (2 * Math.sqrt(x));
  }
  vpInv(r: number): number {
    return (this.a / (2 * r)) ** 2;
  }
  vInv(u: number): number {
    return (Math.max(u, 0) / this.a) ** 2;
  }
}

/** U = a·x − (b/2)·x² + y, válida para x ≤ a/b. */
export class CuasilinealCuadratica extends Cuasilineal {
  readonly nombre = 'Cuasilineal cuadrática';
  constructor(public a = 10, public b = 1) {
    super();
    positivo('a', a);
    positivo('b', b);
  }
  v(x: number): number {
    x = Math.min(Math.max(x, 0), this.a / this.b); // saciedad en a/b
    return this.a * x - (this.b / 2) * x * x;
  }
  vp(x: number): number {
    return Math.max(this.a - this.b * x, 0);
  }
  vpInv(r: number): number {
    return Math.max((this.a - r) / this.b, 0); // p ≥ a ⇒ no compra x
  }
  vInv(u: number): number {
    const vmax = this.a ** 2 / (2 * this.b);
    if (u > vmax) throw new ErrorParametro('U0 supera la utilidad máxima alcanzable sólo con x.');
    return (this.a - Math.sqrt(this.a ** 2 - 2 * this.b * u)) / this.b;
  }
}

/** U = a·√x + b·√y. */
export class SeparableRaiz extends Utilidad {
  readonly nombre = 'Separable a√x + b√y';
  readonly propiedades: Propiedades = { monotona: true, convexa: true, homotetica: true, diferenciable: true };
  constructor(public a = 1, public b = 1) {
    super();
    positivo('a', a);
    positivo('b', b);
  }
  U(x: number, y: number): number {
    return this.a * Math.sqrt(Math.max(x, 0)) + this.b * Math.sqrt(Math.max(y, 0));
  }
  override umg(x: number, y: number): [number, number] {
    return [x <= 0 ? INF : this.a / (2 * Math.sqrt(x)), y <= 0 ? INF : this.b / (2 * Math.sqrt(y))];
  }
  curvaIndiferencia(U0: number, x: number): number {
    const r = U0 - this.a * Math.sqrt(Math.max(x, 0));
    return r >= 0 ? (r / this.b) ** 2 : NAN;
  }
  marshall(p1: number, p2: number, M: number): Sol {
    validarPrecios(p1, p2, M);
    const a2 = this.a ** 2;
    const b2 = this.b ** 2;
    const x = (a2 * p2 * M) / (a2 * p1 * p2 + b2 * p1 ** 2);
    const y = (b2 * p1 * M) / (b2 * p1 * p2 + a2 * p2 ** 2);
    return sol(x, y);
  }
  indirecta(p1: number, p2: number, M: number): number {
    validarPrecios(p1, p2, M);
    return Math.sqrt(M * (this.a ** 2 / p1 + this.b ** 2 / p2));
  }
  gasto(p1: number, p2: number, U0: number): number {
    validarPrecios(p1, p2);
    noNegativo('U0', U0);
    return U0 ** 2 / (this.a ** 2 / p1 + this.b ** 2 / p2);
  }
  hicks(p1: number, p2: number, U0: number): [number, number] {
    const k = this.a ** 2 / p1 + this.b ** 2 / p2;
    return [(U0 ** 2 * this.a ** 2) / (p1 ** 2 * k ** 2), (U0 ** 2 * this.b ** 2) / (p2 ** 2 * k ** 2)];
  }
}

/** U = (x − x0)^α (y − y0)^β, consumos mínimos x0, y0. */
export class StoneGeary extends Utilidad {
  readonly nombre = 'Stone-Geary';
  readonly propiedades: Propiedades = { monotona: true, convexa: true, homotetica: false, diferenciable: true };
  private readonly cd: CobbDouglas;
  constructor(public alpha = 2, public beta = 4, public x0 = 1, public y0 = 3) {
    super();
    positivo('α', alpha); positivo('β', beta);
    noNegativo('x0', x0); noNegativo('y0', y0);
    this.cd = new CobbDouglas(alpha, beta);
  }
  U(x: number, y: number): number {
    return this.cd.U(x - this.x0, y - this.y0);
  }
  override umg(x: number, y: number): [number, number] | null {
    return this.cd.umg(x - this.x0, y - this.y0);
  }
  curvaIndiferencia(U0: number, x: number): number {
    return this.y0 + this.cd.curvaIndiferencia(U0, x - this.x0);
  }
  gastoSubsistencia(p1: number, p2: number): number {
    return p1 * this.x0 + p2 * this.y0;
  }
  marshall(p1: number, p2: number, M: number): Sol {
    validarPrecios(p1, p2, M);
    const m = M - this.gastoSubsistencia(p1, p2);
    if (m <= 0) throw new ErrorParametro('El presupuesto no cubre el consumo mínimo (M ≤ p1·x0 + p2·y0).');
    const d = this.cd.marshall(p1, p2, m);
    return sol(this.x0 + d.x, this.y0 + d.y, 'interior', { ingreso_supernumerario: m });
  }
  indirecta(p1: number, p2: number, M: number): number {
    const d = this.marshall(p1, p2, M);
    return this.U(d.x, d.y);
  }
  gasto(p1: number, p2: number, U0: number): number {
    return this.gastoSubsistencia(p1, p2) + this.cd.gasto(p1, p2, U0);
  }
  hicks(p1: number, p2: number, U0: number): [number, number] {
    const [h1, h2] = this.cd.hicks(p1, p2, U0);
    return [this.x0 + h1, this.y0 + h2];
  }
}

/** U = ln(x − 1) − 2·ln(2 − y)   (semana 3, ej. 5 — bien Giffen). */
export class Giffen extends Utilidad {
  readonly nombre = 'Bien Giffen (Monsalve, ej. 3.5)';
  readonly propiedades: Propiedades = { monotona: true, convexa: true, homotetica: false, diferenciable: true };
  U(x: number, y: number): number {
    if (x <= 1 || y >= 2) return -INF;
    return Math.log(x - 1) - 2 * Math.log(2 - y);
  }
  override umg(x: number, y: number): [number, number] {
    return [1 / (x - 1), 2 / (2 - y)];
  }
  curvaIndiferencia(U0: number, x: number): number {
    if (x <= 1) return NAN;
    return 2 - Math.sqrt((x - 1) / Math.exp(U0));
  }
  region(p1: number, p2: number): [number, number] {
    return [p1 + p2, p1 + 2 * p2];
  }
  marshall(p1: number, p2: number, M: number): Sol {
    validarPrecios(p1, p2, M);
    const [lo, hi] = this.region(p1, p2);
    if (!(lo < M && M < hi))
      throw new ErrorParametro(`Fuera de la región del modelo: se requiere ${lo.toPrecision(4)} < M < ${hi.toPrecision(4)}.`);
    return sol(2 + (2 * p2 - M) / p1, (2 * (M - p1)) / p2 - 2, 'interior', { es_giffen: M > 2 * p2 });
  }
  indirecta(p1: number, p2: number, M: number): number {
    const d = this.marshall(p1, p2, M);
    return this.U(d.x, d.y);
  }
  hicks(p1: number, p2: number, U0: number): [number, number] {
    validarPrecios(p1, p2);
    const k = Math.exp(-U0);
    return [1 + (k * p2 ** 2) / (4 * p1 ** 2), 2 - (k * p2) / (2 * p1)];
  }
  gasto(p1: number, p2: number, U0: number): number {
    validarPrecios(p1, p2);
    return p1 + 2 * p2 - (Math.exp(-U0) * p2 ** 2) / (4 * p1);
  }
}

export const CATALOGO = {
  cobb_douglas: CobbDouglas,
  leontief: Leontief,
  lineal: Lineal,
  cuasilineal_raiz: CuasilinealRaiz,
  cuasilineal_cuadratica: CuasilinealCuadratica,
  separable_raiz: SeparableRaiz,
  stone_geary: StoneGeary,
  giffen: Giffen,
};
