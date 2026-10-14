/**
 * Comercio internacional en un país pequeño (Mankiw, cap. 9, fig. 1-4): port de modelos/comercio.py.
 * El país toma el precio mundial como dado. Si el precio mundial es menor que el de autarquía el
 * país importa; si es mayor, exporta. El arancel y la cuota solo se aplican cuando importa.
 */
import { ErrorParametro, TOL, maxCero, noNegativo } from './_comun';
import { Bienestar, excedenteConsumidor, excedenteProductor } from './excedentes';
import { Demanda, Oferta, equilibrio } from './mercado';

export interface ResultadoComercio {
  /** "importador", "exportador" o "sin comercio". */
  rol: string;
  pAutarquia: number;
  qAutarquia: number;
  precioMundial: number;
  precioInterno: number;
  qd: number;
  qs: number;
  /** Negativo = exportaciones. */
  importaciones: number;
  /** Arancel × importaciones. */
  recaudo: number;
  /** (precio interno − mundial) × cuota. */
  rentasCuota: number;
  /** El arancel o la cuota eliminan el comercio. */
  prohibitivo: boolean;
  bienestar: Bienestar;
  autarquia: Bienestar;
  /** Libre comercio al precio mundial. */
  libre: Bienestar;
  gananciaVsAutarquia: number;
  /** Pérdida frente al libre comercio (arancel o cuota). */
  ppm: number;
}

function validar(D: Demanda, S: Oferta): void {
  if (D.esHorizontal || S.esHorizontal)
    throw new ErrorParametro(
      'Este simulador requiere curvas con pendiente finita (no perfectamente elásticas).',
    );
}

function bienestarA(D: Demanda, S: Oferta, p: number): [number, number, number, number] {
  const qd = D.cantidad(p);
  const qs = S.cantidad(p);
  return [qd, qs, excedenteConsumidor(D, qd, p), excedenteProductor(S, qs, p)];
}

export function comercio(
  D: Demanda,
  S: Oferta,
  precioMundial: number,
  arancel = 0,
  cuota: number | null = null,
): ResultadoComercio {
  validar(D, S);
  const pw = noNegativo('El precio mundial', precioMundial);
  arancel = noNegativo('El arancel', arancel);
  if (cuota !== null) cuota = noNegativo('La cuota', cuota);
  if (arancel > TOL && cuota !== null)
    throw new ErrorParametro('Use arancel o cuota, no ambos a la vez.');

  const eq = equilibrio(D, S);
  const [, , ecA, epA] = bienestarA(D, S, eq.p);
  const autarquia = new Bienestar(ecA, epA);
  const [, , ecL, epL] = bienestarA(D, S, pw);
  const libre = new Bienestar(ecL, epL);

  let rol: string;
  if (Math.abs(pw - eq.p) <= TOL) rol = 'sin comercio';
  else rol = pw < eq.p ? 'importador' : 'exportador';

  let pInt = pw;
  let recaudo = 0;
  let rentas = 0;
  let prohibitivo = false;
  if (rol === 'importador') {
    if (arancel > TOL) {
      pInt = pw + arancel;
      if (pInt >= eq.p - TOL) {
        pInt = eq.p;
        prohibitivo = true;
      }
    } else if (cuota !== null) {
      const pendiente = D.b + S.d;
      if (pendiente <= TOL)
        throw new ErrorParametro(
          'Con oferta y demanda verticales la cuota no determina el precio.',
        );
      const pCuota = (D.a - S.c - cuota) / pendiente;
      if (pCuota > pw + TOL) {
        pInt = pCuota;
        prohibitivo = cuota <= TOL;
      }
    }
  }

  const [qd, qs, ec, ep] = bienestarA(D, S, pInt);
  const importaciones = qd - qs;
  if (rol === 'importador') {
    if (arancel > TOL && !prohibitivo) recaudo = arancel * importaciones;
    if (cuota !== null && pInt > pw + TOL) rentas = (pInt - pw) * importaciones;
  }
  const b = new Bienestar(ec, ep, recaudo + rentas);
  return {
    rol,
    pAutarquia: eq.p,
    qAutarquia: eq.q,
    precioMundial: pw,
    precioInterno: pInt,
    qd,
    qs,
    importaciones,
    recaudo,
    rentasCuota: rentas,
    prohibitivo,
    bienestar: b,
    autarquia,
    libre,
    gananciaVsAutarquia: b.total - autarquia.total,
    ppm: maxCero(libre.total - b.total),
  };
}
