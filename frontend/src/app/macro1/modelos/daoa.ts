/**
 * Simulador 3 — Demanda y oferta agregadas (Blanchard, modelo OA–DA).
 *   DA: el producto de equilibrio IS–LM (modo «oferta») con saldos reales M/P; baja cuando P sube.
 *   OA de corto plazo: P = Pᵉ·[1 + λ·(Y − Ȳₙ)/Ȳₙ]  (una brecha de producto de 1 % sube P un λ % sobre Pᵉ).
 *   Mediano plazo: Pᵉ = P ⇒ Y = Ȳₙ.
 *   Expectativas adaptativas: Pᵉₜ₊₁ = Pₜ, así que la economía se mueve período a período hacia Ȳₙ.
 */
import { ErrorParametro, noNegativo, positivo } from '../../core/errores';
import { biseccion } from '../../core/numerico';
import { Bienes } from './_comun';
import { equilibrioISLM, resolverISLM, validarISLM } from './islm';

export interface ParamsDAOA extends Bienes {
  M: number;
  k: number;
  h: number;
  /** Producto natural (potencial). */
  Yn: number;
  /** Sensibilidad de los precios a la brecha de producto (OA de corto plazo). */
  lam: number;
}

const P_MIN = 1e-9;
const P_MAX = 1e9;

/** Producto demandado al nivel de precios P (curva DA). */
export function demandaAgregada(p: ParamsDAOA, P: number): number {
  return resolverISLM({ ...p, modo: 'oferta', ibar: 0, P }).Y;
}

export function validarDAOA(p: ParamsDAOA): void {
  positivo('Ȳₙ', p.Yn);
  noNegativo('λ', p.lam);
  // El resto (bienes, M, k, h) lo valida IS–LM; se evalúa en P = 1 solo para validar.
  validarISLM({ ...p, modo: 'oferta', ibar: 0, P: 1 });
}

/** Nivel de precios de mediano plazo: DA(P) = Ȳₙ. */
export function precioMedianoPlazo(p: ParamsDAOA): number {
  validarDAOA(p);
  const exceso = (P: number) => demandaAgregada(p, P) - p.Yn;
  const bajo = exceso(P_MIN);
  const alto = exceso(P_MAX);
  if (bajo < 0)
    throw new ErrorParametro(
      'Trampa de deflación: aun con precios muy bajos la demanda no llega a Ȳₙ (la tasa ya está en cero). ' +
        'Bajar precios no reactiva el gasto; hace falta política fiscal.',
    );
  if (alto > 0)
    throw new ErrorParametro(
      p.b2 === 0
        ? 'Con b₂ = 0 la DA es vertical: el nivel de precios no cambia la demanda y la economía no puede volver a Ȳₙ por sí sola.'
        : 'La demanda supera a Ȳₙ incluso con saldos reales casi nulos: no existe un nivel de precios de mediano plazo.',
    );
  // DA no crece con P: el exceso cambia de signo una sola vez.
  return biseccion(exceso, P_MIN, P_MAX, 1e-14, 400);
}

export interface PuntoCP {
  Y: number;
  P: number;
  i: number;
}

/** Oferta agregada de corto plazo. */
export function ofertaAgregada(p: ParamsDAOA, Pe: number, Y: number): number {
  return Pe * (1 + (p.lam * (Y - p.Yn)) / p.Yn);
}

/** Equilibrio de corto plazo con expectativas Pᵉ dadas: DA(P) = Y y P = OA(Y; Pᵉ). */
export function equilibrioCortoPlazo(p: ParamsDAOA, Pe: number): PuntoCP {
  validarDAOA(p);
  positivo('Pᵉ', Pe);
  let P: number;
  if (p.lam === 0) P = Pe;
  else {
    const g = (x: number) => x - ofertaAgregada(p, Pe, demandaAgregada(p, x));
    if (g(P_MIN) > 0)
      throw new ErrorParametro(
        'La oferta agregada corta a la demanda con un nivel de precios negativo: reduce λ o acerca Ȳₙ al producto demandado.',
      );
    let hi = Math.max(2 * Pe, 1);
    while (g(hi) < 0 && hi < P_MAX) hi *= 2;
    P = biseccion(g, P_MIN, hi, 1e-14, 400);
  }
  const r = equilibrioISLM({ ...p, modo: 'oferta', ibar: 0, P });
  return { Y: r.Y, P, i: r.i };
}

export interface Trayectoria {
  /** Equilibrio de mediano plazo antes del choque (punto de partida). */
  inicial: PuntoCP;
  /** Equilibrio de corto plazo justo después del choque (Pᵉ todavía es el precio inicial). */
  impacto: PuntoCP;
  /** Equilibrio de mediano plazo después del choque. */
  final: PuntoCP;
  /** Períodos t = 0, 1, 2… con Pᵉₜ₊₁ = Pₜ. */
  camino: PuntoCP[];
  /** Períodos hasta cerrar el 95 % de la brecha de producto (null si no se cierra). */
  periodos95: number | null;
}

/** Choque sobre una economía que estaba en su mediano plazo. */
export function trayectoria(base: ParamsDAOA, nuevo: ParamsDAOA, n = 40): Trayectoria {
  const P0 = precioMedianoPlazo(base);
  const inicial = { ...equilibrioCortoPlazo(base, P0), Y: base.Yn };
  const P1 = precioMedianoPlazo(nuevo);
  const final = { ...equilibrioCortoPlazo(nuevo, P1), Y: nuevo.Yn };
  const camino: PuntoCP[] = [];
  let Pe = P0;
  for (let t = 0; t < n; t++) {
    const e = equilibrioCortoPlazo(nuevo, Pe);
    camino.push(e);
    Pe = e.P;
  }
  const brecha0 = camino[0].Y - nuevo.Yn;
  let periodos95: number | null = null;
  if (Math.abs(brecha0) < 1e-9 * Math.max(1, nuevo.Yn)) periodos95 = 0;
  else {
    const k = camino.findIndex((e) => Math.abs(e.Y - nuevo.Yn) <= 0.05 * Math.abs(brecha0));
    periodos95 = k >= 0 ? k : null;
  }
  return { inicial, impacto: camino[0], final, camino, periodos95 };
}
