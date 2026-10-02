/**
 * Simulador 1 — Restricción presupuestaria (port de modelos/presupuesto.py).
 * Monsalve (2017), Vol. I, sección 1.4:  p1·x + p2·y = M  ⇔  y = M/p2 − (p1/p2)·x
 */
import { ErrorParametro, noNegativo, positivo } from '../../core/errores';

export interface Recta {
  intercepto_x: number;
  intercepto_y: number;
  pendiente: number;
  precio_relativo: number;
  area_conjunto: number;
}

export function recta(p1: number, p2: number, M: number): Recta {
  positivo('p1', p1);
  positivo('p2', p2);
  noNegativo('M', M);
  return {
    intercepto_x: M / p1,
    intercepto_y: M / p2,
    pendiente: -p1 / p2, // costo de oportunidad de x en unidades de y
    precio_relativo: p1 / p2,
    area_conjunto: (M * M) / (2 * p1 * p2),
  };
}

export function ySobreRecta(x: number, p1: number, p2: number, M: number): number {
  positivo('p1', p1); positivo('p2', p2); noNegativo('M', M);
  return (M - p1 * x) / p2;
}

export function clasificarCanasta(x: number, y: number, p1: number, p2: number, M: number, tol = 1e-9): string {
  noNegativo('x', x); noNegativo('y', y); positivo('p1', p1); positivo('p2', p2); noNegativo('M', M);
  const gasto = p1 * x + p2 * y;
  if (Math.abs(gasto - M) <= tol * Math.max(1, M)) return 'sobre_la_recta';
  return gasto < M ? 'asequible_interior' : 'inasequible';
}

export type TipoCambio =
  | 'sin_cambio'
  | 'desplazamiento_paralelo'
  | 'rotacion_sobre_eje_y'
  | 'rotacion_sobre_eje_x'
  | 'cambio_combinado';

export interface CambioPresupuesto {
  tipo: TipoCambio;
  antes: Recta;
  despues: Recta;
  area_ganada: number;
  area_perdida: number;
  cambio_area_neto: number;
}

/** Estática comparativa de la recta (figuras 1.11–1.14). */
export function cambio(p1: number, p2: number, M: number, p1n?: number, p2n?: number, Mn?: number): CambioPresupuesto {
  p1n = p1n ?? p1;
  p2n = p2n ?? p2;
  Mn = Mn ?? M;
  const r0 = recta(p1, p2, M);
  const r1 = recta(p1n, p2n, Mn);

  let tipo: TipoCambio;
  if (Math.abs(p1n / p2n - p1 / p2) < 1e-12) {
    tipo = Math.abs(Mn / p1n - M / p1) < 1e-12 ? 'sin_cambio' : 'desplazamiento_paralelo';
  } else if (Math.abs(Mn / p2n - M / p2) < 1e-12) tipo = 'rotacion_sobre_eje_y'; // cambió p1
  else if (Math.abs(Mn / p1n - M / p1) < 1e-12) tipo = 'rotacion_sobre_eje_x'; // cambió p2
  else tipo = 'cambio_combinado';

  const [ganada, perdida] = areasEntreRectas(r0, r1);
  return {
    tipo, antes: r0, despues: r1, area_ganada: ganada, area_perdida: perdida,
    cambio_area_neto: r1.area_conjunto - r0.area_conjunto,
  };
}

/** Área de canastas que se vuelven asequibles / inasequibles. */
export function areasEntreRectas(r0: Recta, r1: Recta): [number, number] {
  const f = (r: Recta, x: number) => Math.max(0, r.intercepto_y + r.pendiente * x);
  const xmax = Math.max(r0.intercepto_x, r1.intercepto_x);
  if (xmax === 0) return [0, 0];
  const puntos = new Set<number>([0, r0.intercepto_x, r1.intercepto_x, xmax]);
  const dp = r1.pendiente - r0.pendiente;
  if (Math.abs(dp) > 1e-15) {
    const xc = (r0.intercepto_y - r1.intercepto_y) / dp;
    if (xc > 0 && xc < xmax) puntos.add(xc);
  }
  const xs = [...puntos].sort((a, b) => a - b);
  let gan = 0;
  let per = 0;
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i];
    const b = xs[i + 1];
    const m = (a + b) / 2;
    const dA = f(r1, a) - f(r0, a);
    const dB = f(r1, b) - f(r0, b);
    const dM = f(r1, m) - f(r0, m);
    const area = ((b - a) * (dA + 4 * dM + dB)) / 6; // Simpson (exacto)
    if (dM >= 0) gan += area;
    else per -= area;
  }
  return [gan, per];
}

export function validarIngresoMinimo(M: number, gastoMinimo: number): void {
  if (M < gastoMinimo)
    throw new ErrorParametro(`El presupuesto M=${M} no alcanza el gasto mínimo requerido (${gastoMinimo.toPrecision(4)}).`);
}
