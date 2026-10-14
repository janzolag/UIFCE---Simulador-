/**
 * Excedente del consumidor y del productor (Mankiw, cap. 7): port de modelos/excedentes.py.
 *
 * Versión continua (curvas lineales) y versión escalonada (precios de reserva de compradores y
 * vendedores, tablas 1 y 2 del capítulo 7). Cuando la cantidad transada es menor que la demandada
 * se supone racionamiento eficiente: compran quienes más valoran el bien.
 */
import { ErrorParametro, INF, TOL, finito, noNegativo } from './_comun';
import { Demanda, Oferta, Resultado, equilibrio } from './mercado';

/** ∫₀^q [Pd(x) − p] dx. */
export function excedenteConsumidor(D: Demanda, q: number, p: number): number {
  q = noNegativo('La cantidad', q);
  p = noNegativo('El precio', p);
  if (q <= TOL) return 0;
  if (D.horizontalEn !== null) return q * (D.horizontalEn - p);
  if (D.esVertical) return INF;
  q = Math.min(q, D.a);
  return q * (D.a / D.b - p) - (q * q) / (2 * D.b);
}

/** ∫₀^q [p − Ps(x)] dx, con Ps(x) = max(0, (x − c)/d). */
export function excedenteProductor(S: Oferta, q: number, p: number): number {
  q = noNegativo('La cantidad', q);
  p = noNegativo('El precio', p);
  if (q <= TOL) return 0;
  if (S.horizontalEn !== null) return q * (p - S.horizontalEn);
  if (S.esVertical) return p * q;
  const x1 = Math.min(q, Math.max(S.c, 0)); // tramo con costo cero
  const tramoLineal = q - x1;
  const areaCosto = tramoLineal > 0 ? ((q - S.c) ** 2 - (x1 - S.c) ** 2) / (2 * S.d) : 0;
  return p * q - areaCosto;
}

export class Bienestar {
  constructor(
    readonly ec: number,
    readonly ep: number,
    /** Recaudo, rentas de cuota, costo externo, etc. (con signo). */
    readonly otros: number = 0,
  ) {}

  get total(): number {
    return this.ec + this.ep + this.otros;
  }
}

export function bienestar(D: Demanda, S: Oferta, r: Resultado, otros = 0): Bienestar {
  return new Bienestar(excedenteConsumidor(D, r.q, r.pc), excedenteProductor(S, r.q, r.pv), otros);
}

export function bienestarEficiente(D: Demanda, S: Oferta): Bienestar {
  return bienestar(D, S, equilibrio(D, S));
}

// --- Versión escalonada ---

export type Escalonado = [string, number][];

function valores(nombre: string, lista: Escalonado): [string, number][] {
  if (!lista || lista.length === 0) throw new ErrorParametro(`La lista de ${nombre} está vacía.`);
  return lista.map(([n, v]) => [String(n), noNegativo(`El valor de ${n}`, v)]);
}

/** Σ (disposición − p) de quienes compran (disposición ≥ p). */
export function excedenteCompradores(disposiciones: Escalonado, p: number): number {
  p = noNegativo('El precio', p);
  return valores('compradores', disposiciones)
    .filter(([, v]) => v >= p - TOL)
    .reduce((s, [, v]) => s + (v - p), 0);
}

/** Σ (p − costo) de quienes venden (costo ≤ p). */
export function excedenteVendedores(costos: Escalonado, p: number): number {
  p = noNegativo('El precio', p);
  return valores('vendedores', costos)
    .filter(([, c]) => c <= p + TOL)
    .reduce((s, [, c]) => s + (p - c), 0);
}

export function cantidadEscalonada(vals: Escalonado, p: number, lado: string): number {
  p = finito('El precio', p);
  if (lado === 'demanda')
    return valores('compradores', vals).filter(([, v]) => v >= p - TOL).length;
  if (lado === 'oferta') return valores('vendedores', vals).filter(([, c]) => c <= p + TOL).length;
  throw new ErrorParametro("El lado debe ser 'demanda' u 'oferta'.");
}
