/**
 * Macro 2 · Economía abierta pequeña a pleno empleo con cinco mercados enlazados.
 *
 *   Fondos prestables:  Sᴺ(i) = S₀ + s·i + (T − G)          (ahorro nacional)
 *                       I(i)  = I₀ − b·i                    (demanda de inversión, Dᴺ)
 *                       crédito nuevo ΔC (expansión monetaria sin ahorro detrás)
 *   Cuenta financiera:  KF = κ·(i − i* − ε),  ε = 100·(Eᵉ − E)/E  (depreciación esperada, %)
 *                       Movilidad perfecta (κ → ∞): i = i* + ε.  Economía cerrada: κ = 0.
 *   Comercio:           X(q) = X₀·q^x,  M(q) = M₀·q^(−m)  (elasticidades constantes),  XN = X − M
 *   Identidades:        Sᴺ + ΔC + KF = I   (mercado de fondos)  y  XN + KF = 0   (balanza de pagos)
 *                       ⇒ XN = Sᴺ + ΔC − I: el déficit comercial es la entrada neta de capital.
 *   E = tipo de cambio nominal (moneda nacional por divisa, sube = depreciación); q = E·P* / P es el real
 *   (P* = 1). Con tipo flotante P está dado y se mueve E; con tipo fijo E = Ē y el tipo real se ajusta
 *   vía precios (P = Ē/q). Con tipo fijo la oferta monetaria es endógena: el crédito nuevo se pierde en
 *   reservas internacionales y no llega al mercado de fondos (trilema).
 *   Ajuste de las expectativas: si `Ee` es null el equilibrio es estacionario (Eᵉ = E, ε = 0).
 */
import { ErrorParametro, noNegativo, positivo } from '../../core/errores';
import { finito } from '../../macro1/modelos/_comun';

export type RegimenAb = 'flotante' | 'fijo';
export type MovilidadAb = 'perfecta' | 'imperfecta' | 'cerrada';

export interface ParamsAbierta {
  regimen: RegimenAb;
  movilidad: MovilidadAb;
  S0: number;
  s: number;
  T: number;
  G: number;
  I0: number;
  b: number;
  X0: number;
  /** Elasticidad de las exportaciones al tipo de cambio real. */
  x: number;
  M0: number;
  /** Elasticidad de las importaciones al tipo de cambio real. */
  m: number;
  /** Tasa de interés mundial i* (%). */
  iStar: number;
  /** Intensidad de la cuenta financiera (movilidad imperfecta). */
  kappa: number;
  /** Crédito nuevo ΔC que entra al mercado de fondos (expansión monetaria). */
  credito: number;
  /** Tipo de cambio esperado (null = expectativas ya ajustadas, Eᵉ = E). */
  Ee: number | null;
  /** Nivel de precios nacional con tipo flotante. */
  P: number;
  /** Paridad fijada (tipo fijo). */
  Ebar: number;
  /** Radio de la FPP consumo–inversión. */
  Yf: number;
}

export interface ResAbierta {
  i: number;
  q: number;
  E: number;
  P: number;
  /** Depreciación esperada (%). */
  eps: number;
  /** Ahorro nacional Sᴺ(i). */
  S: number;
  /** Crédito que efectivamente llega al mercado de fondos. */
  credito: number;
  I: number;
  /** Entrada neta de capital privado (KF > 0: entra; KF < 0: sale). */
  KF: number;
  X: number;
  M: number;
  XN: number;
  /** Variación de reservas internacionales (tipo fijo). */
  reservas: number;
  /** Consumo (C + G) en la FPP: C = √(Yf² − Sᴺ²). */
  C: number;
  /** Tipo de cambio real de equilibrio comercial (X = M). */
  qBal: number;
}

const Q_MIN = 1e-6;
const Q_MAX = 1e6;

/** Raíz de una función creciente en q > 0 (bisección en escala logarítmica). */
function raizQ(g: (q: number) => number): number {
  let lo = Math.log(Q_MIN);
  let hi = Math.log(Q_MAX);
  if (g(Q_MIN) >= 0 || g(Q_MAX) <= 0)
    throw new ErrorParametro('No hay un tipo de cambio positivo que equilibre la balanza de pagos con estos parámetros.');
  for (let k = 0; k < 200 && hi - lo > 1e-15; k++) {
    const mid = 0.5 * (lo + hi);
    if (g(Math.exp(mid)) < 0) lo = mid;
    else hi = mid;
  }
  return Math.exp(0.5 * (lo + hi));
}

export function validarAbierta(p: ParamsAbierta): void {
  for (const [n, v] of [
    ['S₀', p.S0],
    ['T', p.T],
    ['ΔC', p.credito],
  ] as [string, number][])
    finito(n, v);
  noNegativo('s', p.s);
  noNegativo('b', p.b);
  noNegativo('G', p.G);
  noNegativo('I₀', p.I0);
  positivo('X₀', p.X0);
  positivo('M₀', p.M0);
  noNegativo('m', p.m);
  noNegativo('x', p.x);
  if (!(p.x + p.m > 0)) throw new ErrorParametro('Las elasticidades del comercio no pueden ser ambas cero: el tipo de cambio no movería la balanza comercial.');
  noNegativo('i*', p.iStar);
  positivo('Yf', p.Yf);
  positivo('P', p.P);
  if (p.regimen === 'fijo') positivo('Ē', p.Ebar);
  if (p.movilidad === 'imperfecta') positivo('κ', p.kappa);
  if (p.Ee !== null) positivo('Eᵉ', p.Ee);
  if (p.movilidad === 'cerrada' && !(p.s + p.b > 0))
    throw new ErrorParametro('Con economía cerrada s + b debe ser positivo: si no, ninguna tasa de interés iguala ahorro e inversión.');
}

/** Ahorro nacional Sᴺ(i). */
export const ahorro = (p: ParamsAbierta, i: number): number => p.S0 + p.s * i + p.T - p.G;
/** Inversión deseada I(i) (curva Dᴺ). */
export const inversion = (p: ParamsAbierta, i: number): number => p.I0 - p.b * i;
export const exportaciones = (p: ParamsAbierta, q: number): number => p.X0 * Math.pow(q, p.x);
export const importaciones = (p: ParamsAbierta, q: number): number => p.M0 * Math.pow(q, -p.m);
/** Tipo de cambio real con comercio equilibrado (X = M). */
export const qEquilibrioComercial = (p: ParamsAbierta): number => Math.pow(p.M0 / p.X0, 1 / (p.x + p.m));
/** Rendimiento esperado de los depósitos en divisas, en moneda nacional: i* + 100·(Eᵉ − E)/E. */
export const rendimientoExterno = (iStar: number, Ee: number, E: number): number => iStar + (100 * (Ee - E)) / E;
/** FPP consumo–inversión (cuarto de círculo de radio Yf). */
export const fpp = (Yf: number, inv: number): number => Math.sqrt(Math.max(0, Yf * Yf - inv * inv));

export function equilibrioAbierta(p: ParamsAbierta): ResAbierta {
  validarAbierta(p);
  const fijo = p.regimen === 'fijo';
  const credito = fijo ? 0 : p.credito;
  const a0 = p.S0 + p.T - p.G + credito - p.I0;
  const sb = p.s + p.b;
  const A = (i: number) => a0 + sb * i; // Sᴺ + ΔC − I
  const nx = (q: number) => exportaciones(p, q) - importaciones(p, q);
  const qDe = (i: number) => raizQ((q) => nx(q) - A(i));
  // Tasa interna dada la depreciación esperada ε (cierra fondos + cuenta financiera).
  const tasa = (eps: number) =>
    p.movilidad === 'perfecta' ? p.iStar + eps : (p.kappa * (p.iStar + eps) - a0) / (sb + p.kappa);

  let i: number;
  let q: number;
  let E: number;
  let P: number;
  let eps: number;
  if (p.movilidad === 'cerrada') {
    i = -a0 / sb;
    q = qEquilibrioComercial(p);
    if (fijo) {
      E = p.Ebar;
      P = E / q;
    } else {
      P = p.P;
      E = q * P;
    }
    eps = p.Ee === null ? 0 : (100 * (p.Ee - E)) / E;
  } else if (fijo || p.Ee === null) {
    // ε exógena: con tipo fijo creíble depende solo de Ē; con expectativas ajustadas es 0.
    eps = p.Ee === null ? 0 : (100 * (p.Ee - p.Ebar)) / p.Ebar;
    i = tasa(eps);
    q = qDe(i);
    if (fijo) {
      E = p.Ebar;
      P = q > 0 ? E / q : NaN;
    } else {
      P = p.P;
      E = q * P;
    }
  } else {
    // Flotante con Eᵉ dado: g(q) = XN(q) − A(i(q)) es creciente en q (ε baja al subir q).
    const Ee = p.Ee;
    const epsDe = (qq: number) => (100 * (Ee - qq * p.P)) / (qq * p.P);
    q = raizQ((qq) => nx(qq) - A(tasa(epsDe(qq))));
    eps = epsDe(q);
    i = tasa(eps);
    P = p.P;
    E = q * P;
  }
  if (!(q > 0) || !Number.isFinite(q))
    throw new ErrorParametro(
      `El tipo de cambio real de equilibrio no es positivo (q = ${q.toFixed(3)}): la brecha entre ahorro e inversión es mayor que lo que el comercio puede cubrir.`,
    );
  const S = ahorro(p, i);
  const I = inversion(p, i);
  if (I < 0) throw new ErrorParametro(`La inversión de equilibrio sería negativa (I = ${I.toFixed(2)}) con i = ${i.toFixed(2)} %.`);
  if (S < 0 || S > p.Yf)
    throw new ErrorParametro(
      `El ahorro nacional de equilibrio (Sᴺ = ${S.toFixed(2)}) queda fuera de la frontera de posibilidades de producción (0 a ${p.Yf}).`,
    );
  const X = exportaciones(p, q);
  const M = importaciones(p, q);
  const XN = X - M;
  return {
    i,
    q,
    E,
    P,
    eps,
    S,
    credito,
    I,
    KF: -XN,
    X,
    M,
    XN,
    reservas: fijo ? -p.credito : 0,
    C: fpp(p.Yf, S),
    qBal: qEquilibrioComercial(p),
  };
}

/** Etapas de la estructura de producción (triángulo de Hayek): L = 20·I/C. */
export const etapas = (I: number, C: number): number => (C > 0 ? (20 * I) / C : 0);
