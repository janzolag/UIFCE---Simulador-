/**
 * Impuestos y subsidios por unidad (Mankiw, cap. 6 fig. 6-9 y cap. 8 fig. 1-6): port de
 * modelos/impuestos.py.
 *
 * No importa a quién se cobre el impuesto: la carga se reparte según las elasticidades (recae más
 * sobre el lado más inelástico). PPM = ½·t·(Q* − Qt) y crece con el cuadrado del impuesto
 * (curva de Laffer para el recaudo).
 */
import { ErrorParametro, INF, TOL, finito, maxCero, noNegativo } from './_comun';
import {
  Bienestar,
  bienestarEficiente,
  excedenteConsumidor,
  excedenteProductor,
} from './excedentes';
import { Demanda, Oferta, equilibrio, resolver } from './mercado';

export interface ResultadoImpuesto {
  t: number;
  sobre: string;
  pEquilibrio: number;
  qEquilibrio: number;
  pc: number;
  pv: number;
  q: number;
  /** Negativo si es subsidio (gasto público). */
  recaudo: number;
  bienestar: Bienestar;
  eficiente: Bienestar;
  /** Curvas desplazadas que se dibujan. */
  demandaVista: Demanda;
  ofertaVista: Oferta;
  ppm: number;
  /** Fracción del impuesto que pagan los compradores (null si t = 0 o el mercado desaparece). */
  cargaCompradores: number | null;
  cargaVendedores: number | null;
}

export function aplicarImpuesto(
  D: Demanda,
  S: Oferta,
  t: number,
  sobre = 'vendedores',
): ResultadoImpuesto {
  t = finito('El impuesto', t);
  if (sobre !== 'vendedores' && sobre !== 'compradores')
    throw new ErrorParametro("El impuesto se cobra a 'vendedores' o a 'compradores'.");
  const eq = equilibrio(D, S);
  const efi = bienestarEficiente(D, S);
  const r = resolver(D, S, t);
  const recaudo = t * r.q;
  const b = new Bienestar(
    excedenteConsumidor(D, r.q, r.pc),
    excedenteProductor(S, r.q, r.pv),
    recaudo,
  );
  const [dv, sv] = sobre === 'vendedores' ? [D, S.subir(t)] : [D.subir(-t), S];
  const carga = Math.abs(t) <= TOL || r.q <= TOL ? null : (r.pc - eq.p) / t;
  return {
    t,
    sobre,
    pEquilibrio: eq.p,
    qEquilibrio: eq.q,
    pc: r.pc,
    pv: r.pv,
    q: r.q,
    recaudo,
    bienestar: b,
    eficiente: efi,
    demandaVista: dv,
    ofertaVista: sv,
    ppm: maxCero(efi.total - b.total),
    cargaCompradores: carga,
    cargaVendedores: carga === null ? null : 1 - carga,
  };
}

/** k tal que Q(t) = Q* − k·t mientras haya intercambio. */
export function pendienteCantidad(D: Demanda, S: Oferta): number {
  if (D.esHorizontal && S.esHorizontal)
    throw new ErrorParametro('Con ambas curvas horizontales la cantidad no está determinada.');
  if (D.esHorizontal) return !S.esVertical ? S.d : 0;
  if (S.esHorizontal) return D.b;
  if (D.b + S.d <= TOL)
    throw new ErrorParametro('Con ambas curvas verticales el precio no está determinado.');
  return (D.b * S.d) / (D.b + S.d);
}

/** t que maximiza el recaudo (cima de la curva de Laffer): t* = Q* / (2k). null si no hay máximo. */
export function impuestoRecaudoMaximo(D: Demanda, S: Oferta): number | null {
  const k = pendienteCantidad(D, S);
  const eq = equilibrio(D, S);
  if (k <= TOL || !eq.intercambio) return null;
  return eq.q / (2 * k);
}

/** Impuesto a partir del cual el mercado desaparece (Q = 0). */
export function impuestoProhibitivo(D: Demanda, S: Oferta): number {
  const k = pendienteCantidad(D, S);
  const eq = equilibrio(D, S);
  if (k <= TOL) return INF;
  return eq.q / k;
}

/** Lista de (t, recaudo, PPM) para t en [0, t_max]. Valores que harían negativo un precio se omiten. */
export function curvaLaffer(
  D: Demanda,
  S: Oferta,
  tMax: number,
  n = 60,
): [number, number, number][] {
  tMax = noNegativo('El impuesto máximo', tMax);
  if (n < 2) throw new ErrorParametro('Se necesitan al menos 2 puntos.');
  const puntos: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = (tMax * i) / (n - 1);
    try {
      const r = aplicarImpuesto(D, S, t);
      puntos.push([t, r.recaudo, r.ppm]);
    } catch (e) {
      if (!(e instanceof ErrorParametro)) throw e;
    }
  }
  return puntos;
}
