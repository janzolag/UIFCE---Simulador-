/**
 * Externalidades (Mankiw, cap. 10, fig. 1-4): port de modelos/externalidades.py.
 * Negativa en la producción: costo social = oferta + costo externo e por unidad.
 * Positiva en el consumo: valor social = demanda + beneficio externo e por unidad.
 * El impuesto pigouviano (o subsidio) igual a e lleva el mercado al óptimo social.
 */
import { ErrorParametro, TOL, finito, maxCero, noNegativo } from './_comun';
import { excedenteConsumidor, excedenteProductor } from './excedentes';
import { Demanda, Oferta, Resultado, equilibrio, resolver } from './mercado';

export interface ResultadoExternalidad {
  tipo: string;
  e: number;
  /** > 0 impuesto, < 0 subsidio. */
  intervencion: number;
  qMercado: number;
  pMercado: number;
  qOptimo: number;
  pOptimo: number;
  /** Cantidad con la intervención. */
  q: number;
  pc: number;
  pv: number;
  bienestarSocial: number;
  bienestarOptimo: number;
  bienestarMercado: number;
  demandaSocial: Demanda;
  ofertaSocial: Oferta;
  ppm: number;
  ppmMercado: number;
}

function bienestarSocial(
  D: Demanda,
  S: Oferta,
  r: Resultado,
  tipo: string,
  e: number,
  t: number,
): number {
  const ec = excedenteConsumidor(D, r.q, r.pc);
  const ep = excedenteProductor(S, r.q, r.pv);
  const externo = tipo === 'negativa' ? -e * r.q : e * r.q;
  return ec + ep + t * r.q + externo;
}

export function externalidad(
  D: Demanda,
  S: Oferta,
  tipo = 'negativa',
  e = 0,
  intervencion = 0,
): ResultadoExternalidad {
  if (tipo !== 'negativa' && tipo !== 'positiva')
    throw new ErrorParametro("La externalidad debe ser 'negativa' o 'positiva'.");
  e = noNegativo('La magnitud de la externalidad', e);
  const t = finito('La intervención', intervencion);
  const mercado = equilibrio(D, S);
  const dSoc = tipo === 'positiva' ? D.subir(e) : D;
  const sSoc = tipo === 'negativa' ? S.subir(e) : S;
  let qOpt: number;
  let pOpt: number;
  let wOpt: number;
  if (tipo === 'negativa') {
    const optimo = resolver(D, S, e); // impuesto pigouviano t = e
    qOpt = optimo.q;
    pOpt = optimo.pc; // cruce de la demanda con el costo social
    wOpt = bienestarSocial(D, S, optimo, tipo, e, e);
  } else {
    // Cruce del valor social con la oferta. Se calcula directamente (y no con un subsidio) porque con
    // un beneficio externo grande el precio para el comprador bajo el subsidio óptimo sería negativo.
    const optimo = equilibrio(dSoc, S);
    qOpt = optimo.q;
    pOpt = optimo.p;
    wOpt =
      excedenteConsumidor(dSoc, optimo.q, optimo.p) + excedenteProductor(S, optimo.q, optimo.p);
  }
  const con = resolver(D, S, t);
  const wMer = bienestarSocial(D, S, mercado, tipo, e, 0);
  const w = bienestarSocial(D, S, con, tipo, e, t);
  return {
    tipo,
    e,
    intervencion: t,
    qMercado: mercado.q,
    pMercado: mercado.p,
    qOptimo: qOpt,
    pOptimo: pOpt,
    q: con.q,
    pc: con.pc,
    pv: con.pv,
    bienestarSocial: w,
    bienestarOptimo: wOpt,
    bienestarMercado: wMer,
    demandaSocial: dSoc,
    ofertaSocial: sSoc,
    ppm: maxCero(wOpt - w),
    ppmMercado: maxCero(wOpt - wMer),
  };
}

/** Precio de equilibrio de los permisos negociables (oferta vertical = permisos emitidos). */
export function precioPermiso(demandaContaminacion: Demanda, permisos: number): number {
  permisos = noNegativo('La cantidad de permisos', permisos);
  if (demandaContaminacion.horizontalEn !== null) return demandaContaminacion.horizontalEn;
  if (demandaContaminacion.esVertical)
    throw new ErrorParametro(
      'Con demanda de contaminación vertical el precio del permiso no está determinado.',
    );
  if (permisos >= demandaContaminacion.a - TOL) return 0;
  return demandaContaminacion.precio(permisos);
}

/** Contaminación que eligen las empresas si cada unidad paga el impuesto. */
export function contaminacionConImpuesto(demandaContaminacion: Demanda, impuesto: number): number {
  return demandaContaminacion.cantidad(noNegativo('El impuesto', impuesto));
}
