/**
 * Controles de precios: precio máximo y precio mínimo (Mankiw, cap. 6, fig. 1-5): port de
 * modelos/controles.py. El salario mínimo es un precio mínimo en el mercado laboral: el excedente
 * de oferta es el desempleo.
 */
import { ErrorParametro, INF, TOL, maxCero, noNegativo } from './_comun';
import {
  Bienestar,
  bienestarEficiente,
  excedenteConsumidor,
  excedenteProductor,
} from './excedentes';
import { Demanda, Oferta, equilibrio } from './mercado';

export interface ResultadoControl {
  tipo: string; // "máximo" o "mínimo"
  precioControl: number;
  /** True si el control cambia el resultado del mercado. */
  obligatorio: boolean;
  pEquilibrio: number;
  qEquilibrio: number;
  /** Precio vigente. */
  precio: number;
  qd: number;
  qs: number;
  /** Cantidad transada. */
  q: number;
  /** Escasez (máximo) o excedente de oferta (mínimo). */
  faltante: number;
  bienestar: Bienestar;
  eficiente: Bienestar;
  ppm: number;
}

function resultado(r: Omit<ResultadoControl, 'ppm'>): ResultadoControl {
  return { ...r, ppm: maxCero(r.eficiente.total - r.bienestar.total) };
}

function control(D: Demanda, S: Oferta, precio: number, tipo: string): ResultadoControl {
  precio = noNegativo('El precio controlado', precio);
  const eq = equilibrio(D, S);
  const efi = bienestarEficiente(D, S);
  if (!eq.intercambio)
    throw new ErrorParametro('Sin intercambio en equilibrio no hay mercado que controlar.');
  const obligatorio = tipo === 'máximo' ? precio < eq.p - TOL : precio > eq.p + TOL;
  if (!obligatorio)
    return resultado({
      tipo,
      precioControl: precio,
      obligatorio: false,
      pEquilibrio: eq.p,
      qEquilibrio: eq.q,
      precio: eq.p,
      qd: eq.q,
      qs: eq.q,
      q: eq.q,
      faltante: 0,
      bienestar: efi,
      eficiente: efi,
    });
  const qd = D.cantidad(precio);
  const qs = S.cantidad(precio);
  let q: number;
  let faltante: number;
  if (tipo === 'máximo') {
    q = qs;
    faltante = qd - qs;
  } else {
    q = qd;
    faltante = qs - qd;
  }
  if (q === INF) throw new ErrorParametro('La cantidad transada sería ilimitada con estas curvas.');
  const b = new Bienestar(excedenteConsumidor(D, q, precio), excedenteProductor(S, q, precio));
  return resultado({
    tipo,
    precioControl: precio,
    obligatorio: true,
    pEquilibrio: eq.p,
    qEquilibrio: eq.q,
    precio,
    qd,
    qs,
    q,
    faltante,
    bienestar: b,
    eficiente: efi,
  });
}

export function precioMaximo(D: Demanda, S: Oferta, pmax: number): ResultadoControl {
  return control(D, S, pmax, 'máximo');
}

export function precioMinimo(D: Demanda, S: Oferta, pmin: number): ResultadoControl {
  return control(D, S, pmin, 'mínimo');
}
