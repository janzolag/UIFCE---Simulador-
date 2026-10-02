/**
 * Simulador 6 — Tecnología y maximización del beneficio (port de modelos/produccion.py).
 * Monsalve (2017), semana 5 y semana 7 ej. 3.
 */
import { ErrorParametro, noNegativo, positivo } from '../../core/errores';

export type MaxBeneficio =
  | { existe: false; motivo: string }
  | { existe: true; x: number; y: number; z: number; beneficio: number };

export function clasificarRendimientos(grado: number, tol = 1e-12): 'constantes' | 'crecientes' | 'decrecientes' {
  if (Math.abs(grado - 1) <= tol) return 'constantes';
  return grado > 1 ? 'crecientes' : 'decrecientes';
}

export abstract class Tecnologia {
  abstract readonly nombre: string;
  abstract F(x: number, y: number): number;
  abstract pmg(x: number, y: number): [number, number] | null;
  abstract isocuanta(q0: number, x: number): number;
  abstract elasticidadSustitucion(x?: number, y?: number): number;
  abstract readonly gradoHomogeneidad: number;
  maxBeneficio?(p: number, w1: number, w2: number): MaxBeneficio;

  /** Productos medios (PMe_x, PMe_y). */
  pme(x: number, y: number): [number, number] {
    const q = this.F(x, y);
    return [x > 0 ? q / x : Number.NaN, y > 0 ? q / y : Number.NaN];
  }

  tmst(x: number, y: number): number | null {
    const g = this.pmg(x, y);
    if (g === null) return null;
    return g[1] === 0 ? Number.POSITIVE_INFINITY : g[0] / g[1];
  }

  /** Clasificación numérica comparando F(tx, ty) con t·F(x, y). */
  rendimientos(x = 1, y = 1, t = 2): { grado_local: number; tipo: ReturnType<typeof clasificarRendimientos> } {
    const base = this.F(x, y);
    const g = Math.log(this.F(t * x, t * y) / base) / Math.log(t);
    return { grado_local: g, tipo: clasificarRendimientos(Math.round(g * 1e10) / 1e10) };
  }
}

/** F = A·x^α·y^β (ej. 2f). */
export class CobbDouglasP extends Tecnologia {
  readonly nombre = 'Cobb-Douglas';
  constructor(public A = 1, public alpha = 0.5, public beta = 0.25) {
    super();
    positivo('A', A); positivo('α', alpha); positivo('β', beta);
  }
  F(x: number, y: number): number {
    if (x <= 0 || y <= 0) return 0;
    return this.A * x ** this.alpha * y ** this.beta;
  }
  pmg(x: number, y: number): [number, number] {
    const q = this.F(x, y);
    return [(this.alpha * q) / x, (this.beta * q) / y];
  }
  isocuanta(q0: number, x: number): number {
    return x > 0 ? (q0 / (this.A * x ** this.alpha)) ** (1 / this.beta) : Number.NaN;
  }
  get gradoHomogeneidad(): number {
    return this.alpha + this.beta;
  }
  elasticidadSustitucion(): number {
    return 1;
  }
  /** Ej. 5, semana 5. Sólo existe máximo interior si α + β < 1. */
  override maxBeneficio(p: number, w1: number, w2: number): MaxBeneficio {
    positivo('p', p); positivo('w1', w1); positivo('w2', w2);
    const { alpha: a, beta: b, A } = this;
    const s = a + b;
    if (s >= 1)
      return {
        existe: false,
        motivo: 'Con rendimientos constantes o crecientes a escala el beneficio no tiene máximo interior (se hace cero o infinito).',
      };
    const k = 1 / (1 - s);
    const pA = p * A;
    const x = pA ** k / ((w1 / a) ** ((1 - b) * k) * (w2 / b) ** (b * k));
    const y = pA ** k / ((w1 / a) ** (a * k) * (w2 / b) ** ((1 - a) * k));
    const z = this.F(x, y);
    return { existe: true, x, y, z, beneficio: p * z - w1 * x - w2 * y };
  }
}

/** F = Mín{x/a, y/b} (ej. 2d). */
export class LeontiefP extends Tecnologia {
  readonly nombre = 'Leontief (proporciones fijas)';
  readonly gradoHomogeneidad = 1;
  constructor(public a = 1, public b = 1) {
    super();
    positivo('a', a); positivo('b', b);
  }
  F(x: number, y: number): number {
    return Math.min(x / this.a, y / this.b);
  }
  pmg(): null {
    return null;
  }
  isocuanta(q0: number, x: number): number {
    return x >= q0 * this.a ? q0 * this.b : Number.NaN;
  }
  elasticidadSustitucion(): number {
    return 0;
  }
}

/** F = a·x + b·y (insumos sustitutos perfectos). */
export class LinealP extends Tecnologia {
  readonly nombre = 'Lineal (sustitutos perfectos)';
  readonly gradoHomogeneidad = 1;
  constructor(public a = 1, public b = 1) {
    super();
    positivo('a', a); positivo('b', b);
  }
  F(x: number, y: number): number {
    return this.a * x + this.b * y;
  }
  pmg(): [number, number] {
    return [this.a, this.b];
  }
  isocuanta(q0: number, x: number): number {
    const y = (q0 - this.a * x) / this.b;
    return y >= 0 ? y : Number.NaN;
  }
  elasticidadSustitucion(): number {
    return Number.POSITIVE_INFINITY;
  }
}

/** F = √x + √y (ej. 2e, 6). */
export class SeparableP extends Tecnologia {
  readonly nombre = 'Separable √x + √y';
  readonly gradoHomogeneidad = 0.5;
  F(x: number, y: number): number {
    return Math.sqrt(Math.max(x, 0)) + Math.sqrt(Math.max(y, 0));
  }
  pmg(x: number, y: number): [number, number] {
    return [x > 0 ? 0.5 / Math.sqrt(x) : Number.POSITIVE_INFINITY, y > 0 ? 0.5 / Math.sqrt(y) : Number.POSITIVE_INFINITY];
  }
  isocuanta(q0: number, x: number): number {
    const r = q0 - Math.sqrt(x);
    return r >= 0 ? r * r : Number.NaN;
  }
  elasticidadSustitucion(): number {
    return 2; // σ = −d ln(y/x) / d ln(TMST); con TMST = √(y/x) ⇒ σ = 2.
  }
  override maxBeneficio(p: number, w1: number, w2: number): MaxBeneficio {
    positivo('p', p); positivo('w1', w1); positivo('w2', w2);
    const x = (p * p) / (2 * w1) ** 2;
    const y = (p * p) / (2 * w2) ** 2;
    const z = this.F(x, y);
    return { existe: true, x, y, z, beneficio: p * z - w1 * x - w2 * y };
  }
}

/** F = A·[δ·x^ρ + (1−δ)·y^ρ]^(ν/ρ), ρ < 1, ρ ≠ 0. σ = 1/(1 − ρ). */
export class CES extends Tecnologia {
  readonly nombre = 'CES';
  constructor(public A = 1, public rho = 0.5, public delta = 0.5, public nu = 1) {
    super();
    positivo('A', A); positivo('ν', nu);
    if (!(delta > 0 && delta < 1)) throw new ErrorParametro('δ debe estar en (0, 1).');
    if (rho >= 1 || rho === 0) throw new ErrorParametro('ρ debe ser < 1 y distinto de 0 (ρ→0 es Cobb-Douglas).');
  }
  F(x: number, y: number): number {
    if ((x <= 0 || y <= 0) && this.rho < 0) return 0;
    x = Math.max(x, 0);
    y = Math.max(y, 0);
    const s = this.delta * x ** this.rho + (1 - this.delta) * y ** this.rho;
    return this.A * s ** (this.nu / this.rho);
  }
  pmg(x: number, y: number): [number, number] {
    const q = this.F(x, y);
    const s = this.delta * x ** this.rho + (1 - this.delta) * y ** this.rho;
    const c = (this.nu * q) / s;
    return [c * this.delta * x ** (this.rho - 1), c * (1 - this.delta) * y ** (this.rho - 1)];
  }
  isocuanta(q0: number, x: number): number {
    const r = ((q0 / this.A) ** (this.rho / this.nu) - this.delta * x ** this.rho) / (1 - this.delta);
    return r > 0 ? r ** (1 / this.rho) : Number.NaN;
  }
  get gradoHomogeneidad(): number {
    return this.nu;
  }
  elasticidadSustitucion(): number {
    return 1 / (1 - this.rho);
  }
}

/** f(L) = L^α, 0<α<1 (ej. 4 semana 5): L* = (pα/w)^{1/(1−α)}. */
export function maxBeneficioUnInsumo(alpha: number, p: number, w: number) {
  if (!(alpha > 0 && alpha < 1)) throw new ErrorParametro('Se requiere 0 < α < 1 (rendimientos decrecientes).');
  positivo('p', p); positivo('w', w);
  const L = ((p * alpha) / w) ** (1 / (1 - alpha));
  const y = L ** alpha;
  return { L, y, beneficio: p * y - w * L, salario_real: w / p, pmg_optimo: alpha * L ** (alpha - 1) };
}

/** Ubica el máximo del PMe (fin de etapa I) y PMg = 0 (fin de etapa II). */
export function etapasProduccion(f: (L: number) => number, Lmax: number, n = 4000) {
  positivo('L_max', Lmax);
  const hs = Lmax / n;
  const Ls = Array.from({ length: n }, (_, i) => hs * (i + 1));
  const pme = Ls.map((L) => f(L) / L);
  let iPme = 0;
  for (let i = 1; i < n; i++) if (pme[i] > pme[iPme]) iPme = i;
  const pmg = Ls.map((L) => (f(L + hs / 2) - f(L - hs / 2)) / hs);
  let finII: number | null = null;
  for (let i = 1; i < n; i++) {
    if (pmg[i - 1] > 0 && 0 >= pmg[i]) { finII = Ls[i]; break; }
  }
  return { L_pme_max: Ls[iPme], pme_max: pme[iPme], L_pmg_cero: finII };
}

/** f(x) = x³ − 3x² + 3x = (x − 1)³ + 1 (ej. 3, semana 7). */
export function cubicaMonsalve(x: number): number {
  noNegativo('x', x);
  return (x - 1) ** 3 + 1;
}
