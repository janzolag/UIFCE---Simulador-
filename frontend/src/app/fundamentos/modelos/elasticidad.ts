/**
 * Elasticidad e ingreso total (Mankiw, cap. 5): port de modelos/elasticidad.py.
 * Las elasticidades precio se reportan en valor absoluto, como en Mankiw.
 */
import { ErrorParametro, INF, TOL, casiIgual, finito, noNegativo } from './_comun';
import { Demanda, Oferta } from './mercado';

/** Elasticidad por el método del punto medio: |ΔQ/Q̄| / |ΔP/P̄|. */
export function puntoMedio(q1: number, p1: number, q2: number, p2: number): number {
  q1 = noNegativo('Q1', q1);
  q2 = noNegativo('Q2', q2);
  p1 = noNegativo('P1', p1);
  p2 = noNegativo('P2', p2);
  if (casiIgual(p1, p2))
    throw new ErrorParametro(
      'Los dos precios son iguales: la elasticidad por punto medio no está definida.',
    );
  if (q1 + q2 <= TOL)
    throw new ErrorParametro(
      'Las dos cantidades son cero: la elasticidad por punto medio no está definida.',
    );
  const dq = (q2 - q1) / ((q1 + q2) / 2);
  const dp = (p2 - p1) / ((p1 + p2) / 2);
  return Math.abs(dq / dp);
}

export function cambioPorcentualPuntoMedio(x1: number, x2: number): number {
  x1 = finito('x1', x1);
  x2 = finito('x2', x2);
  if (Math.abs(x1 + x2) <= TOL) throw new ErrorParametro('El promedio de los dos valores es cero.');
  return (100 * (x2 - x1)) / ((x1 + x2) / 2);
}

/** Elasticidad puntual |dQ/dP · P/Q|. */
export function elasticidadDemanda(D: Demanda, p: number): number {
  p = noNegativo('El precio', p);
  if (D.esHorizontal) return INF;
  if (D.esVertical) return 0;
  const q = D.cantidad(p);
  if (q <= TOL) return INF;
  return (D.b * p) / q;
}

export function elasticidadOferta(S: Oferta, p: number): number {
  p = noNegativo('El precio', p);
  if (S.esHorizontal) return INF;
  if (S.esVertical) return 0;
  const q = S.cantidad(p);
  if (q <= TOL) return INF;
  return (S.d * p) / q;
}

/** Nombre del tramo de elasticidad (Mankiw cap. 5, fig. 1). */
export function clasificar(e: number | null): string {
  if (e === null) throw new ErrorParametro('Elasticidad no definida.');
  if (e === INF) return 'perfectamente elástica';
  if (e < -TOL) throw new ErrorParametro('Use el valor absoluto de la elasticidad precio.');
  if (e <= TOL) return 'perfectamente inelástica';
  if (casiIgual(e, 1, 1e-6)) return 'elasticidad unitaria';
  return e < 1 ? 'inelástica' : 'elástica';
}

export function ingresoTotal(D: Demanda, p: number): number {
  p = noNegativo('El precio', p);
  const q = D.cantidad(p);
  if (q === INF) return INF;
  return p * q;
}

/** Precio que maximiza P·Q: el punto de elasticidad unitaria (a / 2b). */
export function precioIngresoMaximo(D: Demanda): number | null {
  if (D.esHorizontal || D.esVertical) return null; // no existe un máximo interior
  return D.a / (2 * D.b);
}

export interface FilaPuntoMedio {
  precio: number;
  cantidad: number;
  ingreso: number;
  cambioPrecio?: number;
  cambioCantidad?: number;
  elasticidad?: number;
  tramo?: string;
}

/** Tabla como la de Mankiw cap. 5, fig. 4: precio, cantidad, ingreso y elasticidad entre filas. */
export function tablaPuntoMedio(D: Demanda, precios: number[]): FilaPuntoMedio[] {
  const ps = precios.map((p) => noNegativo('Precio', p));
  return ps.map((p, i) => {
    const fila: FilaPuntoMedio = {
      precio: p,
      cantidad: D.cantidad(p),
      ingreso: ingresoTotal(D, p),
    };
    if (i + 1 < ps.length) {
      const p2 = ps[i + 1];
      const q1 = fila.cantidad;
      const q2 = D.cantidad(p2);
      fila.cambioPrecio = Math.abs(cambioPorcentualPuntoMedio(p, p2));
      fila.cambioCantidad = Math.abs(cambioPorcentualPuntoMedio(q1, q2));
      fila.elasticidad = puntoMedio(q1, p, q2, p2);
      fila.tramo = clasificar(fila.elasticidad);
    }
    return fila;
  });
}

/** Elasticidad ingreso por punto medio (con signo). */
export function elasticidadIngreso(q1: number, m1: number, q2: number, m2: number): number {
  q1 = noNegativo('Q1', q1);
  q2 = noNegativo('Q2', q2);
  m1 = noNegativo('Ingreso 1', m1);
  m2 = noNegativo('Ingreso 2', m2);
  if (casiIgual(m1, m2)) throw new ErrorParametro('Los dos ingresos son iguales.');
  return cambioPorcentualPuntoMedio(q1, q2) / cambioPorcentualPuntoMedio(m1, m2);
}

/** Bien inferior, necesario o de lujo. ε = 1 es la frontera y se informa como tal. */
export function clasificarIngreso(e: number): string {
  e = finito('La elasticidad ingreso', e);
  if (e < -TOL) return 'inferior';
  if (Math.abs(e) <= TOL) return 'neutro (ε = 0)';
  if (casiIgual(e, 1, 1e-6)) return 'elasticidad unitaria (frontera entre necesario y de lujo)';
  return e < 1 ? 'normal necesario' : 'normal de lujo';
}

/** Con signo: > 0 sustitutos, < 0 complementos. */
export function elasticidadCruzada(q1: number, py1: number, q2: number, py2: number): number {
  q1 = noNegativo('Q1', q1);
  q2 = noNegativo('Q2', q2);
  if (casiIgual(py1, py2)) throw new ErrorParametro('Los dos precios del otro bien son iguales.');
  return cambioPorcentualPuntoMedio(q1, q2) / cambioPorcentualPuntoMedio(py1, py2);
}
