/**
 * Macro 2 · Curva de Phillips aumentada con expectativas (notación estándar).
 *   CPCP: π = πᵉ − β·(u − u*) + v
 *   CPLP: u = u*  (vertical en la NAIRU: sin sorpresas, π = πᵉ + v)
 *   Razón de sacrificio: puntos-año de desempleo por punto de desinflación = 1/β.
 */
import { ErrorParametro, noNegativo, positivo } from '../../core/errores';
import { finito } from '../../macro1/modelos/_comun';

export interface ParamsPhillips {
  pie: number;
  beta: number;
  ustar: number;
  v: number;
}

export function validarPhillips(p: ParamsPhillips): void {
  finito('πᵉ', p.pie);
  positivo('β', p.beta);
  noNegativo('u*', p.ustar);
  if (p.ustar >= 100) throw new ErrorParametro('u* debe ser menor que 100 %.');
  finito('v', p.v);
}

/** Inflación sobre la curva de Phillips de corto plazo a la tasa de desempleo u. */
export function inflacion(p: ParamsPhillips, u: number): number {
  validarPhillips(p);
  if (!(u >= 0 && u < 100))
    throw new ErrorParametro(`La tasa de desempleo debe estar en [0, 100) (recibido: ${u}).`);
  return p.pie - p.beta * (u - p.ustar) + p.v;
}

/** Desempleo que exige llevar la inflación a πₒ en un período, con πᵉ dado. */
export function desempleoParaMeta(p: ParamsPhillips, piObj: number): number {
  validarPhillips(p);
  finito('πₒ', piObj);
  return p.ustar + (p.pie + p.v - piObj) / p.beta;
}

/** Puntos-año de desempleo por encima de u* por cada punto de desinflación. */
export function razonSacrificio(p: ParamsPhillips): number {
  validarPhillips(p);
  return 1 / p.beta;
}
