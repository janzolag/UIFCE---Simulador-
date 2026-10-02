/**
 * Simulador 5 — Demanda: elasticidades, tipos de bienes y bienestar (port de modelos/demanda.py).
 * Monsalve (2017), semana 3, semana 4 (sección 4.8) y semana 2.
 */
import { ErrorParametro, noNegativo, positivo } from '../../core/errores';
import { Cuasilineal, Utilidad } from './consumidor';

const NAN = Number.NaN;

export type TipoBien =
  | 'indefinido' | 'giffen' | 'neutro_al_ingreso' | 'inferior' | 'ingreso_unitario' | 'lujo' | 'necesario';
export type RelacionBruta = 'sustitutos_brutos' | 'complementarios_brutos' | 'independientes';

export interface Elasticidades {
  x: number; y: number;
  e_x_p1: number; e_x_p2: number; e_x_M: number;
  e_y_p2: number; e_y_p1: number; e_y_M: number;
  s1: number; s2: number;
  tipo_x: TipoBien;
  relacion_bruta_x_con_y: RelacionBruta;
}

export function tipoBien(eIngreso: number, dxDp: number, tol = 1e-7): TipoBien {
  if (Number.isNaN(eIngreso)) return 'indefinido';
  if (dxDp > tol) return 'giffen';
  if (Math.abs(eIngreso) <= tol) return 'neutro_al_ingreso';
  if (eIngreso < 0) return 'inferior';
  if (Math.abs(eIngreso - 1) <= 1e-6) return 'ingreso_unitario'; // p. ej. Cobb-Douglas
  return eIngreso > 1 + tol ? 'lujo' : 'necesario';
}

export function relacionBruta(dxDp2: number, tol = 1e-7): RelacionBruta {
  if (dxDp2 > tol) return 'sustitutos_brutos';
  if (dxDp2 < -tol) return 'complementarios_brutos';
  return 'independientes';
}

/** Elasticidades precio propia, cruzada e ingreso de x e y (derivadas centradas). */
export function elasticidades(u: Utilidad, p1: number, p2: number, M: number, h = 1e-6): Elasticidades {
  const base = u.marshall(p1, p2, M);
  const { x, y } = base;

  const d = (variable: 'p1' | 'p2' | 'M', bien: 'x' | 'y'): number => {
    const k = { p1, p2, M };
    const paso = h * Math.max(1, k[variable]);
    const up = { ...k };
    const dn = { ...k };
    up[variable] += paso;
    dn[variable] -= paso;
    return (u.marshall(up.p1, up.p2, up.M)[bien] - u.marshall(dn.p1, dn.p2, dn.M)[bien]) / (2 * paso);
  };
  const el = (der: number, varVal: number, q: number) => (q > 0 ? (der * varVal) / q : NAN);

  const eXM = el(d('M', 'x'), M, x);
  return {
    x, y,
    e_x_p1: el(d('p1', 'x'), p1, x), e_x_p2: el(d('p2', 'x'), p2, x), e_x_M: eXM,
    e_y_p2: el(d('p2', 'y'), p2, y), e_y_p1: el(d('p1', 'y'), p1, y), e_y_M: el(d('M', 'y'), M, y),
    s1: M > 0 ? (p1 * x) / M : NAN, s2: M > 0 ? (p2 * y) / M : NAN,
    tipo_x: tipoBien(eXM, d('p1', 'x')),
    relacion_bruta_x_con_y: relacionBruta(d('p2', 'x')),
  };
}

export type ClasifElasticidad = 'perfectamente_elastica' | 'perfectamente_inelastica' | 'unitaria' | 'elastica' | 'inelastica';

/** Clasificación de la sección 3.3.1. */
export function clasificarElasticidad(e: number, tol = 1e-9): ClasifElasticidad {
  if (!Number.isFinite(e) && !Number.isNaN(e)) return 'perfectamente_elastica';
  const a = Math.abs(e);
  if (a <= tol) return 'perfectamente_inelastica';
  if (Math.abs(a - 1) <= 1e-6) return 'unitaria';
  return a > 1 ? 'elastica' : 'inelastica';
}

/** s1·η1 + s2·η2 (debe ser 1). */
export function agregacionEngel(el: Elasticidades): number {
  return el.s1 * el.e_x_M + el.s2 * el.e_y_M;
}

/** s1·ε11 + s2·ε21 + s1 (debe ser 0). */
export function agregacionCournot(el: Elasticidades): number {
  return el.s1 * el.e_x_p1 + el.s2 * el.e_y_p1 + el.s1;
}

/** x = a − b·p  (Monsalve, ej. 7, figura 3.9). */
export function demandaLineal(a: number, b: number, p: number) {
  positivo('a', a); positivo('b', b); noNegativo('p', p);
  const x = Math.max(a - b * p, 0);
  const e = x === 0 ? Number.NEGATIVE_INFINITY : (-b * p) / x;
  return {
    x, elasticidad: e, clasificacion: clasificarElasticidad(e), p_unitaria: a / (2 * b), x_unitaria: a / 2,
    p_max: a / b, gasto: p * x, gasto_max: (a * a) / (4 * b),
  };
}

/** Recta x = a − b·p que pasa por (p, x) con elasticidad e (Monsalve, ej. 9). */
export function estimarLineal(p: number, x: number, e: number) {
  positivo('p', p); positivo('x', x);
  if (e >= 0) throw new ErrorParametro('La elasticidad-precio de una demanda lineal debe ser negativa.');
  const b = (-e * x) / p;
  return { a: x + b * p, b };
}

/** X = A·p^(−α) tiene elasticidad −α en toda la curva (Monsalve, ej. 8). */
export function elasticidadConstante(A: number, alpha: number, p: number) {
  positivo('A', A); positivo('α', alpha); positivo('p', p);
  return { x: A * p ** -alpha, elasticidad: -alpha, clasificacion: clasificarElasticidad(-alpha) };
}

/** Área bajo x = a − b·p y sobre el precio p (Monsalve, ej. 5 sem. 4). */
export function excedenteConsumidorLineal(a: number, b: number, p: number): number {
  positivo('a', a); positivo('b', b); noNegativo('p', p);
  const x = Math.max(a - b * p, 0);
  return x > 0 ? 0.5 * x * (a / b - p) : 0;
}

/** EC = v(x0) − v(0) − p·x0 con x0 = (v')^{-1}(p) (sección 4.8). */
export function excedenteConsumidorCuasilineal(u: Cuasilineal, p: number) {
  const x0 = u.vpInv(p);
  return { x: x0, excedente: u.v(x0) - u.v(0) - p * x0 };
}

/** Simpson compuesto (n par). */
export function integral(f: (x: number) => number, a: number, b: number, n = 2000): number {
  if (a === b) return 0;
  const hh = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * hh);
  return (s * hh) / 3;
}

/** Variación compensada (VC), equivalente (VE) y cambio del excedente (ΔEC). Positivo = pérdida. */
export function variaciones(u: Utilidad, p1: number, p2: number, M: number, p1n: number) {
  positivo("p1'", p1n);
  const U0 = u.indirecta(p1, p2, M);
  const U1 = u.indirecta(p1n, p2, M);
  const vc = u.gasto(p1n, p2, U0) - M;
  const ve = M - u.gasto(p1, p2, U1);
  const dec = integral((q) => u.marshall(q, p2, M).x, p1, p1n);
  return { U0, U1, VC: vc, VE: ve, perdida_EC: dec };
}
