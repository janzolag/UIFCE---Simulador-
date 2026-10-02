/**
 * Simulador 4 — Efecto sustitución y efecto ingreso (port de modelos/slutsky.py).
 * Monsalve (2017), semana 4 (ecuaciones 4.1–4.4, ejemplo 1).
 */
import { positivo } from '../../core/errores';
import { Sol, Utilidad } from './consumidor';

export type Metodo = 'hicks' | 'slutsky';
export type ClasificacionBien = 'sin_cambio' | 'efecto_ingreso_nulo' | 'normal' | 'giffen' | 'inferior';

export interface Descomposicion {
  metodo: Metodo;
  A: Sol;
  B: Sol;
  C: Sol;
  U0: number;
  M_compensado: number;
  compensacion: number;
  efecto_total: [number, number];
  efecto_sustitucion: [number, number];
  efecto_ingreso: [number, number];
  clasificacion_x: ClasificacionBien;
}

/** Clasifica el bien x según los signos de los efectos ante Δp1. */
export function clasificar(esX: number, eiX: number, dp: number, tol = 1e-12): ClasificacionBien {
  if (Math.abs(dp) < tol) return 'sin_cambio';
  if (Math.abs(eiX) < tol) return 'efecto_ingreso_nulo';
  if (eiX * esX > 0) return 'normal';
  if (Math.abs(eiX) > Math.abs(esX)) return 'giffen';
  return 'inferior';
}

export function descomposicion(u: Utilidad, p1: number, p2: number, M: number, p1n: number, metodo: Metodo = 'hicks'): Descomposicion {
  positivo("p1'", p1n);
  const A = u.marshall(p1, p2, M); // canasta inicial
  const C = u.marshall(p1n, p2, M); // canasta final
  const U0 = u.U(A.x, A.y);
  let Mcomp: number;
  if (metodo === 'hicks') Mcomp = u.gasto(p1n, p2, U0);
  else if (metodo === 'slutsky') Mcomp = M + A.x * (p1n - p1);
  else throw new Error("metodo debe ser 'hicks' o 'slutsky'.");
  const B = u.marshall(p1n, p2, Mcomp); // canasta compensada
  const et: [number, number] = [C.x - A.x, C.y - A.y];
  const es: [number, number] = [B.x - A.x, B.y - A.y];
  const ei: [number, number] = [C.x - B.x, C.y - B.y];
  return {
    metodo, A, B, C, U0, M_compensado: Mcomp, compensacion: Mcomp - M,
    efecto_total: et, efecto_sustitucion: es, efecto_ingreso: ei,
    clasificacion_x: clasificar(es[0], ei[0], p1n - p1),
  };
}

/** Versión diferencial (4.1): ∂x/∂p1 = ∂h1/∂p1 − x·∂x/∂M (derivadas numéricas). */
export function ecuacionSlutsky(u: Utilidad, p1: number, p2: number, M: number, h = 1e-5) {
  const x = u.marshall(p1, p2, M).x;
  const U0 = u.indirecta(p1, p2, M);
  const dxDp1 = (u.marshall(p1 + h, p2, M).x - u.marshall(p1 - h, p2, M).x) / (2 * h);
  const dhDp1 = (u.hicks(p1 + h, p2, U0)[0] - u.hicks(p1 - h, p2, U0)[0]) / (2 * h);
  const dxDM = (u.marshall(p1, p2, M + h).x - u.marshall(p1, p2, M - h).x) / (2 * h);
  return {
    efecto_precio: dxDp1, efecto_sustitucion: dhDp1, efecto_ingreso: -x * dxDM,
    residuo: dxDp1 - (dhDp1 - x * dxDM),
  };
}

/** S_ij = ∂h_i/∂p_j (sección 4.7). Debe ser simétrica y semidefinida negativa. */
export function matrizSustitucion(u: Utilidad, p1: number, p2: number, U0: number, h = 1e-5): number[][] {
  const dh = (i: number, j: number) => {
    const up: [number, number] = [p1, p2];
    const dn: [number, number] = [p1, p2];
    up[j] += h;
    dn[j] -= h;
    return (u.hicks(up[0], up[1], U0)[i] - u.hicks(dn[0], dn[1], U0)[i]) / (2 * h);
  };
  return [[dh(0, 0), dh(0, 1)], [dh(1, 0), dh(1, 1)]];
}
