/**
 * Macro 2 · Demanda agregada, oferta agregada de corto plazo y de largo plazo (notación estándar).
 *   DA:   Y = D₀ − d·P
 *   OACP: P = W + (Y − Yₚ)/σ   (W: costos nominales = precio esperado; sube con un choque de oferta)
 *   OALP: Y = Yₚ  (vertical en el producto potencial)
 *   Autocorrección: los costos nominales se ajustan a los precios observados, Wₜ₊₁ = Wₜ + θ·(Pₜ − Wₜ),
 *   hasta que la brecha Y − Yₚ se cierra.
 */
import { ErrorParametro, enIntervalo, positivo } from '../../core/errores';
import { finito } from '../../macro1/modelos/_comun';

export interface ParamsDAOA2 {
  D0: number;
  d: number;
  W: number;
  sigma: number;
  Yp: number;
}

export interface PuntoDAOA {
  Y: number;
  P: number;
}

export function validarDAOA2(p: ParamsDAOA2): void {
  finito('D₀', p.D0);
  positivo('d', p.d);
  positivo('W', p.W);
  positivo('σ', p.sigma);
  positivo('Yₚ', p.Yp);
}

/** Equilibrio de corto plazo: DA ∩ OACP. */
export function cortoPlazo(p: ParamsDAOA2): PuntoDAOA {
  validarDAOA2(p);
  // D₀ − d·P = Yₚ + σ·(P − W)  ⇒  P = (D₀ − Yₚ + σ·W)/(d + σ)
  const P = (p.D0 - p.Yp + p.sigma * p.W) / (p.d + p.sigma);
  const Y = p.D0 - p.d * P;
  if (!(P > 0) || !(Y > 0))
    throw new ErrorParametro(
      `El equilibrio de corto plazo no tiene producto y precios positivos (Y = ${Y.toFixed(2)}, P = ${P.toFixed(2)}).`,
    );
  return { Y, P };
}

/** Equilibrio de largo plazo: DA ∩ OALP. */
export function largoPlazo(p: ParamsDAOA2): PuntoDAOA {
  validarDAOA2(p);
  const P = (p.D0 - p.Yp) / p.d;
  if (!(P > 0))
    throw new ErrorParametro(
      `La demanda no alcanza el producto potencial con precios positivos (D₀ = ${p.D0} ≤ Yₚ = ${p.Yp}).`,
    );
  return { Y: p.Yp, P };
}

/** Trayectoria de autocorrección desde el equilibrio de corto plazo (máximo `periodos` pasos). */
export function ajuste(p: ParamsDAOA2, theta: number, periodos = 40): PuntoDAOA[] {
  enIntervalo('θ', theta, 0, 1, false);
  const camino: PuntoDAOA[] = [];
  let W = p.W;
  for (let t = 0; t <= periodos; t++) {
    const e = cortoPlazo({ ...p, W });
    camino.push(e);
    if (Math.abs(e.Y - p.Yp) < 1e-4 * p.Yp || theta === 0) break;
    W = W + theta * (e.P - W);
  }
  return camino;
}

export const curvaDA = (p: ParamsDAOA2, P: number): number => p.D0 - p.d * P;
export const curvaOACP = (p: ParamsDAOA2, Y: number): number => p.W + (Y - p.Yp) / p.sigma;
