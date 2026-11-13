/**
 * Macro 2 · Mundell–Fleming como sistema de cinco paneles enlazados (economía abierta pequeña):
 *   ① fondos prestables (Sᴺ, Dᴺ, Sᴺ⁺ᴱ / Dᴺ⁺ᴱ, i*) → ② paridad de intereses (i frente a i* + ε)
 *   → ③ exportaciones e importaciones frente al tipo de cambio real → ④ FPP consumo–inversión
 *   → ⑤ estructura intertemporal de la producción (triángulo de Hayek).
 * El DD–AA de Krugman y Obstfeld (producto variable a corto plazo) sigue en su propio simulador (dd-aa).
 */
import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import {
  AZUL,
  DORADO,
  MORADO,
  NARANJA,
  ROJO,
  SUAVE,
  VERDE,
  aviso,
  figuraVacia,
  lectura,
  resultados,
  tabla,
  texto,
} from '../../core/tema';
import { finito } from '../../macro1/modelos/_comun';
import {
  MovilidadAb,
  ParamsAbierta,
  RegimenAb,
  ResAbierta,
  ahorro,
  equilibrioAbierta,
  etapas,
  exportaciones,
  fpp,
  importaciones,
  inversion,
  rendimientoExterno,
} from '../modelos/abierta';
import { refEstandar } from './_comun';
import {
  Choque,
  Estado,
  Panel,
  alCambiarChoques,
  cadena,
  cambio,
  curvaP,
  ejeX,
  ejeY,
  equilibrioP,
  figuraPaneles,
  flecha,
  grupoChoques,
  recorrido,
} from './_paneles';

const SIM_ID = 'm2-mundell-fleming-sistema';
/** Crédito nuevo que entra al mercado de fondos por cada punto porcentual de ΔM. */
export const CREDITO_POR_PUNTO = 4;

// Sᴺ = 150 + 10·i, I = 350 − 15·i ⇒ economía cerrada: i = 8 %, S = I = 230, q = 1 (X = M = 200).
// Abierta con κ = 25 e i* = 4 %: i = 6 %, entrada de capital 50 = déficit comercial (200·q − 200/q = −50, q ≈ 0.883).
const DEF = {
  regimen: 'flotante' as string,
  movilidad: 'imperfecta' as string,
  kappa: 25,
  S0: 150,
  s: 10,
  T: 200,
  G: 200,
  I0: 350,
  b: 15,
  X0: 200,
  x: 1,
  M0: 200,
  m: 1,
  iStar: 4,
  Yf: 600,
  choque: 'apertura' as string,
  dAp: 1,
  dG: 0,
  dM: 0,
  dIs: 0,
  dX: 0,
  dEe: 0,
};
type P = typeof DEF;

export const CHOQUES: Choque[] = [
  { valor: 'ninguno', etiqueta: 'Sin choque', cambios: {} },
  { valor: 'apertura', etiqueta: 'Abrir la cuenta de capital (economía cerrada → abierta)', cambios: { dAp: 1 } },
  { valor: 'fiscal', etiqueta: '+ Expansión fiscal (ΔG = +50)', cambios: { dG: 50 } },
  { valor: 'monetaria', etiqueta: '+ Expansión monetaria (ΔM = +10 %)', cambios: { dM: 10 } },
  { valor: 'externa', etiqueta: '+ Sube la tasa mundial (Δi* = +2)', cambios: { dIs: 2 } },
  { valor: 'exportaciones', etiqueta: '+ Auge exportador (ΔX₀ = +40)', cambios: { dX: 40 } },
  { valor: 'expectativas', etiqueta: '+ Se espera una depreciación (+10 %)', cambios: { dEe: 10 } },
];
const DELTAS = ['dAp', 'dG', 'dM', 'dIs', 'dX', 'dEe'];

export type TipoChoqueAb = 'ninguno' | 'apertura' | 'fiscal' | 'monetaria' | 'externa' | 'exportaciones' | 'expectativas';

export interface EstadoAb {
  q: ParamsAbierta;
  r: ResAbierta;
}

export interface PasosAb {
  tipo: TipoChoqueAb;
  e0: EstadoAb;
  /** Corto plazo: fundamentos nuevos con Eᵉ todavía en su valor inicial. */
  e1: EstadoAb;
  /** Largo plazo: expectativas ajustadas (Eᵉ = E) y el dinero ya neutral. */
  e2: EstadoAb;
}

export function parametrosBase(p: P): ParamsAbierta {
  return {
    regimen: (p.regimen === 'fijo' ? 'fijo' : 'flotante') as RegimenAb,
    movilidad: (p.movilidad === 'perfecta' ? 'perfecta' : 'imperfecta') as MovilidadAb,
    S0: p.S0,
    s: p.s,
    T: p.T,
    G: p.G,
    I0: p.I0,
    b: p.b,
    X0: p.X0,
    x: p.x,
    M0: p.M0,
    m: p.m,
    iStar: p.iStar,
    kappa: p.kappa,
    credito: 0,
    Ee: null,
    P: 1,
    Ebar: 1,
    Yf: p.Yf,
  };
}

export function tipoDe(p: P): TipoChoqueAb {
  if (p.dAp > 0) return 'apertura';
  if (p.dG !== 0) return 'fiscal';
  if (p.dM !== 0) return 'monetaria';
  if (p.dIs !== 0) return 'externa';
  if (p.dX !== 0) return 'exportaciones';
  if (p.dEe !== 0) return 'expectativas';
  return 'ninguno';
}

/**
 * Los tres equilibrios de la estática comparativa:
 *  E₀ inicial estacionario (si el choque es la apertura, economía cerrada), con P₀ = 1; con tipo fijo la
 *  paridad Ē se fija en el nivel de E₀.
 *  E₁ corto plazo: fundamentos nuevos y Eᵉ = E₀·(1 + ΔEᵉ/100) (las expectativas aún no se ajustan).
 *  E₂ largo plazo: Eᵉ = E (ε = 0) y la expansión monetaria ya solo sube precios: P₂ = 1 + ΔM/100.
 */
export function pasos(p: P): PasosAb {
  for (const d of DELTAS) finito(d, (p as unknown as Record<string, number>)[d]);
  const b = parametrosBase(p);
  const abre = p.dAp > 0;
  const q0flot: ParamsAbierta = { ...b, regimen: 'flotante', movilidad: abre ? 'cerrada' : b.movilidad };
  const Ebar = equilibrioAbierta(q0flot).E;
  const q0: ParamsAbierta = { ...q0flot, regimen: b.regimen, Ebar };
  const r0 = equilibrioAbierta(q0);
  const nuevo: ParamsAbierta = {
    ...b,
    Ebar,
    G: p.G + p.dG,
    iStar: p.iStar + p.dIs,
    X0: p.X0 + p.dX,
    credito: CREDITO_POR_PUNTO * p.dM,
  };
  const q1: ParamsAbierta = { ...nuevo, Ee: r0.E * (1 + p.dEe / 100) };
  // Con tipo fijo las reservas perdidas no vuelven: E₂ conserva la variación de reservas.
  const q2: ParamsAbierta = { ...nuevo, credito: b.regimen === 'fijo' ? nuevo.credito : 0, Ee: null, P: b.regimen === 'fijo' ? 1 : 1 + p.dM / 100 };
  return {
    tipo: tipoDe(p),
    e0: { q: q0, r: r0 },
    e1: { q: q1, r: equilibrioAbierta(q1) },
    e2: { q: q2, r: equilibrioAbierta(q2) },
  };
}

const igualRes = (a: ResAbierta, b: ResAbierta): boolean =>
  (['i', 'q', 'E', 'P', 'S', 'I', 'KF', 'reservas', 'credito'] as (keyof ResAbierta)[]).every(
    (k) => Math.abs(a[k] - b[k]) < 1e-9,
  );
/** Tipo de cambio esperado del estado (si las expectativas ya se ajustaron, Eᵉ = E). */
const eeDe = (e: EstadoAb): number => e.q.Ee ?? e.r.E;

/** Estados que se dibujan: E₀, E₁ y E₂ (se omite E₂ si coincide con E₁). */
export function estadosAb(p: P, s: PasosAb): EstadoAb[] {
  if (tipoDe(p) === 'ninguno' && igualRes(s.e0.r, s.e1.r) && igualRes(s.e0.r, s.e2.r)) return [s.e0];
  return igualRes(s.e1.r, s.e2.r) ? [s.e0, s.e1] : [s.e0, s.e1, s.e2];
}

const SUB = ['₀', '₁', '₂'];
const C_ESTADO = [AZUL, VERDE, DORADO];

export function calcular(p: P): Simulacion {
  let s: PasosAb;
  try {
    s = pasos(p);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const estados = estadosAb(p, s);
  const choque = estados.length > 1;
  const fijo = s.e0.q.regimen === 'fijo';
  const n = estados.length;
  const R = estados.map((e) => e.r);

  /* ---------------------------------------------------------------- rangos (fijos entre estados) */
  const tasas = estados.flatMap((e) => [e.r.i, e.q.iStar, e.q.iStar + e.r.eps]);
  const iLo = Math.min(0, ...tasas.map((t) => t - 1));
  const iHi = Math.max(...tasas) * 1.45 + 1;
  const fondos = R.flatMap((r) => [r.I, r.S, r.S + r.credito]);
  const xF = Math.max(...fondos) * 1.4;
  const Es = R.flatMap((r) => [r.E, r.q, r.qBal]);
  const eHi = Math.max(...Es) * 1.4;
  const eLo = Math.min(...Es) * 0.6;
  const comercio = R.flatMap((r) => [r.X, r.M]);
  const xC = Math.max(...comercio, 1) * 1.35;
  const Ls = R.map((r) => etapas(r.I, r.C));
  const xL = Math.max(...Ls, 1) * 1.3;
  const yC = s.e0.q.Yf * 1.08;
  // ④ se acerca a la zona de la FPP donde viven los puntos (su curvatura se ve mejor).
  const cLo = Math.min(fpp(s.e0.q.Yf, Math.min(xF, s.e0.q.Yf)), ...R.map((r) => r.C)) * 0.97;

  const F: Panel = {
    id: '',
    titulo: '① Fondos prestables',
    tituloX: 'Fondos: ahorro S e inversión I',
    tituloY: 'Tasa de interés real i (%)',
    rangoX: [0, xF],
    rangoY: [iLo, iHi],
    dominio: { x: [0, 0.29], y: [0.6, 0.95] },
    movil: { x: [0, 1], y: [0.835, 0.985] },
  };
  const Pa: Panel = {
    id: '2',
    titulo: '② Paridad de intereses',
    tituloX: 'Rendimiento esperado (%)',
    tituloY: 'Tipo de cambio nominal E',
    rangoX: [iLo, iHi],
    rangoY: [eLo, eHi],
    dominio: { x: [0.36, 0.64], y: [0.6, 0.95] },
    movil: { x: [0, 1], y: [0.635, 0.785] },
  };
  const Co: Panel = {
    id: '3',
    titulo: '③ Exportaciones e importaciones',
    tituloX: 'Exportaciones X e importaciones M',
    tituloY: 'Tipo de cambio real q',
    rangoX: [0, xC],
    rangoY: [eLo, eHi],
    dominio: { x: [0.72, 1], y: [0.6, 0.95] },
    movil: { x: [0, 1], y: [0.435, 0.585] },
    enlaceY: 'y2',
  };
  const Fp: Panel = {
    id: '4',
    titulo: '④ FPP: consumo frente a inversión',
    tituloX: 'Inversión I',
    tituloY: 'Consumo C + G',
    rangoX: [0, xF],
    rangoY: [cLo, s.e0.q.Yf * 1.02],
    dominio: { x: [0, 0.46], y: [0, 0.4] },
    movil: { x: [0, 1], y: [0.235, 0.385] },
    enlaceX: 'x',
  };
  const Es5: Panel = {
    id: '5',
    titulo: '⑤ Estructura intertemporal de la producción',
    tituloX: 'Etapas de producción (tiempo)',
    tituloY: 'Consumo C + G',
    rangoX: [0, xL],
    rangoY: [0, yC],
    dominio: { x: [0.54, 1], y: [0, 0.4] },
    movil: { x: [0, 1], y: [0.035, 0.185] },
  };
  const fig = figuraPaneles(SIM_ID, [F, Pa, Co, Fp, Es5], 1900);

  /* ---------------------------------------------------------------- series con curvas fantasma */
  /** Dibuja una curva por cada estado en que su clave cambia: la primera fantasma, la última sólida. */
  const serie = (clave: (e: EstadoAb) => string | null, dibujar: (e: EstadoAb, i: number, estado: Estado) => void) => {
    const idx: number[] = [];
    estados.forEach((e, i) => {
      const k = clave(e);
      if (k === null) return;
      const prev = idx.length ? clave(estados[idx[idx.length - 1]]) : undefined;
      if (prev !== k) idx.push(i);
    });
    idx.forEach((i, j) =>
      dibujar(estados[i], i, idx.length === 1 ? 'final' : j === idx.length - 1 ? 'final' : i === 0 ? 'inicial' : 'intermedio'),
    );
  };
  const color = (i: number, base: string) => (i === 0 ? base : C_ESTADO[i]);
  const conVertices = (lo: number, hi: number, nPts: number, extra: number[]) =>
    [...linspace(lo, hi, nPts), ...extra.filter((v) => v > lo && v < hi)].sort((a, b) => a - b);

  // ① Fondos prestables.
  const gi = conVertices(iLo, iHi, 40, R.map((r) => r.i));
  serie(
    (e) => `${e.q.S0}|${e.q.s}|${e.q.T}|${e.q.G}|${e.r.credito}`,
    (e, i, est) =>
      curvaP(fig, F, gi.map((t) => ahorro(e.q, t) + e.r.credito), gi, 'Sᴺ (ahorro nacional)', color(i, AZUL), est, (e.r.credito > 0 ? 'Sᴺ+ΔC' : 'Sᴺ') + SUB[i]),
  );
  curvaP(fig, F, gi.map((t) => inversion(s.e0.q, t)), gi, 'Dᴺ (inversión)', ROJO, 'final', 'Dᴺ');
  serie(
    (e) => `${e.q.iStar}`,
    (e, i, est) => curvaP(fig, F, [0, xF], [e.q.iStar, e.q.iStar], 'i* (tasa mundial)', color(i, SUAVE), est, `i*${SUB[i]}`),
  );
  const externa = (e: EstadoAb) => e.q.movilidad !== 'cerrada';
  serie(
    (e) => (externa(e) ? `${e.r.KF >= 0}|${e.q.iStar}|${e.r.eps}|${e.q.kappa}|${e.q.movilidad}|${e.q.G}|${e.r.credito}` : null),
    (e, i, est) => {
      const entra = e.r.KF >= 0;
      const nom = entra ? 'Sᴺ⁺ᴱ (ahorro nacional + externo)' : 'Dᴺ⁺ᴱ (inversión + salida de capital)';
      const et = (entra ? 'Sᴺ⁺ᴱ' : 'Dᴺ⁺ᴱ') + SUB[i];
      const piso = e.q.iStar + e.r.eps;
      if (e.q.movilidad === 'perfecta') curvaP(fig, F, [0, xF], [piso, piso], nom, color(i, VERDE), est, et);
      else {
        const k = (t: number) => e.q.kappa * (t - piso);
        curvaP(
          fig,
          F,
          gi.map((t) => (entra ? ahorro(e.q, t) + e.r.credito + k(t) : inversion(e.q, t) - k(t))),
          gi,
          nom,
          color(i, VERDE),
          est,
          et,
        );
      }
    },
  );

  // ② Paridad de intereses.
  const ge = conVertices(eLo, eHi, 70, R.map((r) => r.E));
  serie(
    (e) => `${e.q.iStar}|${eeDe(e)}`,
    (e, i, est) =>
      curvaP(
        fig,
        Pa,
        ge.map((E) => {
          const v = rendimientoExterno(e.q.iStar, eeDe(e), E);
          return v >= iLo - 50 && v <= iHi + 50 ? v : null;
        }),
        ge,
        'i* + (Eᵉ − E)/E (depósitos en divisas)',
        color(i, NARANJA),
        est,
        `i*+ε${SUB[i]}`,
      ),
  );
  serie(
    (e) => fmt(e.r.i, 10),
    (e, i, est) => curvaP(fig, Pa, [e.r.i, e.r.i], [eLo, eHi], 'i (depósitos nacionales)', color(i, AZUL), est, `i${SUB[i]}`),
  );
  if (fijo)
    curvaP(fig, Pa, [iLo, iHi], [s.e0.q.Ebar, s.e0.q.Ebar], 'Paridad fija Ē', DORADO, 'final', 'Ē');

  // ③ Exportaciones e importaciones.
  const gq = conVertices(eLo, eHi, 60, R.flatMap((r) => [r.q, r.qBal]));
  const recorte = (v: number) => (v <= xC * 1.5 ? v : null);
  serie(
    (e) => `${e.q.X0}|${e.q.x}`,
    (e, i, est) => curvaP(fig, Co, gq.map((q) => recorte(exportaciones(e.q, q))), gq, 'X (exportaciones)', color(i, VERDE), est, `X${SUB[i]}`),
  );
  curvaP(fig, Co, gq.map((q) => recorte(importaciones(s.e0.q, q))), gq, 'M (importaciones)', ROJO, 'final', 'M');

  // ④ FPP.
  const gk = conVertices(0, Math.min(s.e0.q.Yf, xF), 60, R.map((r) => r.S));
  curvaP(fig, Fp, gk, gk.map((k) => fpp(s.e0.q.Yf, k)), 'FPP', MORADO, 'final', 'FPP');

  // ⑤ Estructura de producción (triángulo de Hayek).
  serie(
    (e) => `${fmt(etapas(e.r.I, e.r.C), 10)}|${fmt(e.r.C, 10)}`,
    (e, i, est) => {
      const L = etapas(e.r.I, e.r.C);
      curvaP(fig, Es5, [0, L, L, 0], [0, 0, e.r.C, 0], 'Estructura de producción', color(i, VERDE), est, `L${SUB[i]}`);
    },
  );

  /* ---------------------------------------------------------------- equilibrios y recorridos */
  const nombres =
    n === 3
      ? ['Equilibrio inicial', 'Corto plazo (Eᵉ sin ajustar)', 'Largo plazo (Eᵉ = E)']
      : ['Equilibrio inicial', 'Nuevo equilibrio'];
  const simbolos = ['circle', 'square', 'diamond'];
  estados.forEach((e, i) => {
    const prev = estados[i - 1];
    if (prev && igualRes(prev.r, e.r)) return;
    const r = e.r;
    const col = !choque ? DORADO : i === 0 ? SUAVE : i === n - 1 ? DORADO : VERDE;
    const nom = !choque ? 'Equilibrio' : nombres[i];
    const et = `E${SUB[i]}`;
    const op = { simbolo: simbolos[i], lecturas: i === 0 || i === n - 1 };
    equilibrioP(fig, F, r.KF >= 0 ? r.I : r.S + r.credito, r.i, nom, et, col, op);
    equilibrioP(fig, Pa, r.i, r.E, nom, et, col, { ...op, decY: 3 });
    equilibrioP(fig, Co, r.X, r.q, nom, et, col, { ...op, decY: 3 });
    equilibrioP(fig, Fp, r.I, r.C, nom, et, col, op);
    equilibrioP(fig, Es5, etapas(r.I, r.C), r.C, nom, et, col, { ...op, decX: 2 });
  });
  if (choque) {
    recorrido(fig, F, R.map((r) => [r.KF >= 0 ? r.I : r.S + r.credito, r.i] as [number, number]), DORADO);
    recorrido(fig, Pa, R.map((r) => [r.i, r.E] as [number, number]), DORADO);
    recorrido(fig, Co, R.map((r) => [r.X, r.q] as [number, number]), DORADO);
    recorrido(fig, Fp, R.map((r) => [r.I, r.C] as [number, number]), DORADO);
    recorrido(fig, Es5, R.map((r) => [etapas(r.I, r.C), r.C] as [number, number]), DORADO);
  }

  // Brechas del equilibrio final: entrada de capital = déficit comercial = absorción fuera de la FPP.
  const fin = R[n - 1];
  const brecha = (pn: Panel, x0: number, x1: number, y: number, nombre: string, col: string) => {
    if (Math.abs(x1 - x0) < 1e-6) return;
    fig.data.push({
      type: 'scatter',
      x: [x0, x1],
      y: [y, y],
      xaxis: ejeX(pn),
      yaxis: ejeY(pn),
      mode: 'lines',
      name: nombre,
      line: { color: col, width: 7 },
      opacity: 0.35,
      hovertemplate: `${nombre}: ${fmt(Math.abs(x1 - x0), 2)}<extra></extra>`,
    });
    fig.layout.annotations.push({
      x: (x0 + x1) / 2,
      y,
      xref: ejeX(pn),
      yref: ejeY(pn),
      yanchor: 'top',
      yshift: -6,
      text: `${nombre.split(' (')[0]}: ${fmt(Math.abs(x1 - x0), 1)}`,
      showarrow: false,
      font: { size: 10, color: col },
    });
  };
  const entra = fin.KF >= 0;
  if (fin.q > 0 && Math.abs(fin.KF) > 1e-6) {
    brecha(F, fin.S + fin.credito, fin.I, fin.i, entra ? 'Entrada de capital (KF)' : 'Salida de capital (KF)', entra ? VERDE : NARANJA);
    brecha(Co, fin.X, fin.M, fin.q, fin.XN < 0 ? 'Déficit comercial (M − X)' : 'Superávit comercial (X − M)', fin.XN < 0 ? ROJO : VERDE);
  }
  // Producción sobre la FPP (Sᴺ, C) frente a absorción (I, C): invertir más de lo que se ahorra.
  fig.data.push({
    type: 'scatter',
    x: [fin.S],
    y: [fin.C],
    xaxis: ejeX(Fp),
    yaxis: ejeY(Fp),
    mode: 'markers',
    name: 'Producción (sobre la FPP)',
    marker: { size: 9, color: MORADO, symbol: 'circle-open', line: { width: 2, color: MORADO } },
    hovertemplate: 'Producción sobre la FPP<br>(Sᴺ = %{x:.2f}, C + G = %{y:.2f})<extra></extra>',
  });
  flecha(fig, Fp, [fin.S, fin.C], [fin.I, fin.C], entra ? VERDE : NARANJA);
  // Equilibrio comercial X = M (referencia).
  fig.data.push({
    type: 'scatter',
    x: [exportaciones(estados[n - 1].q, fin.qBal)],
    y: [fin.qBal],
    xaxis: ejeX(Co),
    yaxis: ejeY(Co),
    mode: 'markers+text',
    name: 'Equilibrio comercial (X = M)',
    text: ['X = M'],
    textposition: 'middle right',
    textfont: { size: 10, color: SUAVE },
    marker: { size: 8, color: SUAVE, symbol: 'diamond-open' },
    hovertemplate: 'Equilibrio comercial X = M<br>q = %{y:.3f}<extra></extra>',
  });

  /* ---------------------------------------------------------------- panel de resultados */
  const col = (k: (r: ResAbierta) => number) => [k(s.e0.r), k(s.e1.r), n === 3 ? k(s.e2.r) : null];
  const filas: (string | number | null)[][] = [
    ['Tasa de interés i (%)', ...col((r) => r.i)],
    ['Tipo de cambio nominal E', ...col((r) => r.E)],
    ['Tipo de cambio real q', ...col((r) => r.q)],
    ['Nivel de precios P', ...col((r) => r.P)],
    ['Ahorro nacional Sᴺ', ...col((r) => r.S)],
    ['Inversión I', ...col((r) => r.I)],
    ['Entrada de capital KF (= −XN)', ...col((r) => r.KF)],
    ['Exportaciones netas XN', ...col((r) => r.XN)],
    ['Δ reservas internacionales', ...col((r) => r.reservas)],
    ['Consumo C + G (FPP)', ...col((r) => r.C)],
    ['Etapas de producción L', ...col((r) => etapas(r.I, r.C))],
  ];
  const encabezado = n === 3 ? ['', 'E₀ inicial', 'E₁ corto plazo', 'E₂ largo plazo'] : ['', 'E₀ inicial', 'E₁ nuevo equilibrio', ''];
  if (n < 3) filas.forEach((f) => f.pop());
  if (n < 3) encabezado.pop();
  if (!choque) {
    filas.forEach((f) => f.splice(2));
    encabezado.splice(2);
    encabezado[1] = 'Equilibrio';
  }

  const lecturas: Bloque[] = [
    texto(
      'Cómo leerlo: ① fija la tasa i y la brecha entre ahorro e inversión → ② el tipo de cambio que hace que i compita con i* + depreciación esperada → ③ esa brecha es el déficit (o superávit) comercial → ④ invertir más de lo que se ahorra pone la absorción fuera de la FPP → ⑤ más inversión con tasas bajas alarga la estructura de producción.',
      'pequeno',
    ),
  ];
  if (choque)
    lecturas.push(
      texto(
        'Convención: E₀ y sus curvas en gris punteado, E₁ (corto plazo, expectativas sin ajustar) en raya-punto, E₂ (largo plazo) en sólido; las flechas doradas siguen el recorrido.',
        'pequeno texto-suave',
      ),
    );
  if (fijo)
    lecturas.push(
      texto(
        'Tipo fijo: E queda en Ē y el tipo de cambio real q se ajusta vía precios (P = Ē/q). La oferta monetaria es endógena: el crédito nuevo se pierde en reservas y no mueve la tasa (trilema).',
        'pequeno texto-suave',
      ),
    );
  if (s.e0.q.movilidad === 'imperfecta' || s.e1.q.movilidad === 'imperfecta')
    lecturas.push(
      texto(
        `Movilidad imperfecta (κ = ${fmt(p.kappa, 0)}): la tasa interna se separa de i* + ε lo necesario para que entre (o salga) justo el capital que cubre la brecha: KF = κ·(i − i* − ε). Con κ grande se acerca a la movilidad perfecta.`,
        'pequeno texto-suave',
      ),
    );

  const bloques: Bloque[] = [];
  if (choque) bloques.push(cadenaAb(p, s, estados));
  bloques.push(
    lectura('Equilibrios del sistema', tabla(filas, encabezado)),
    lectura(
      'Lectura',
      ...lecturas,
      refEstandar(
        'fondos prestables en economía abierta pequeña (notación estándar de manual); paridad de intereses según Krugman y Obstfeld (2006), cap. 14, «Los tipos de cambio y el mercado de divisas: un enfoque de activos»; FPP consumo–inversión y estructura intertemporal de la producción según Garrison (2001), Time and Money.',
      ),
    ),
  );
  return { fig, panel: [resultados(bloques)] };
}

/** Caja de estática comparativa: choque → transmisión → resultado (y largo plazo si aplica). */
export function cadenaAb(p: P, s: PasosAb, estados: EstadoAb[]): Bloque {
  const fijo = s.e0.q.regimen === 'fijo';
  const a = s.e0.r;
  const c = s.e1.r;
  const z = estados.length === 3 ? s.e2.r : null;
  const res = (r: ResAbierta, que: string) =>
    `${que}: i ${cambio(a.i, r.i)} %; E ${cambio(a.E, r.E, 3)}; I ${cambio(a.I, r.I)}; XN ${cambio(a.XN, r.XN)}.`;
  const corto = res(c, z ? 'Corto plazo' : 'Resultado');
  const largo = z ? res(z, 'Largo plazo (Eᵉ = E)') : undefined;
  switch (s.tipo) {
    case 'apertura':
      return cadena(
        `Choque: se abre la cuenta de capital. En la economía cerrada i = ${fmt(a.i, 2)} %, por ${a.i > s.e1.q.iStar ? 'encima' : 'debajo'} de la tasa mundial i* = ${fmt(s.e1.q.iStar, 2)} %.`,
        a.i > s.e1.q.iStar
          ? 'i > i* → el ahorro externo entra (Sᴺ⁺ᴱ a la derecha de Sᴺ) → i baja → la inversión sube → la entrada de capital compra moneda nacional → E ↓ (apreciación) → X ↓, M ↑ → déficit comercial = entrada de capital → la absorción sale de la FPP y la estructura de producción se alarga.'
          : 'i < i* → el ahorro nacional sale a buscar i* (Dᴺ⁺ᴱ) → i sube → la inversión cae → la salida de capital vende moneda nacional → E ↑ (depreciación) → superávit comercial = salida de capital → la estructura de producción se acorta.',
        corto,
        largo,
      );
    case 'fiscal': {
      const sube = p.dG > 0;
      return cadena(
        `Choque: ΔG = ${fmt(p.dG, 0)} → el ahorro público (T − G) ${sube ? 'cae' : 'sube'} y Sᴺ se desplaza a la ${sube ? 'izquierda' : 'derecha'}.`,
        sube
          ? 'Menos ahorro → i ↑ → la inversión cae (expulsión) y entra capital → E ↓ (apreciación) → XN ↓: déficits gemelos (fiscal y comercial). La estructura de producción se acorta.'
          : 'Más ahorro → i ↓ → la inversión sube y sale capital → E ↑ (depreciación) → XN ↑. La estructura de producción se alarga.',
        corto,
        largo,
      );
    }
    case 'monetaria':
      if (fijo)
        return cadena(
          `Choque: ΔM = ${fmt(p.dM, 0)} % con tipo de cambio fijo.`,
          'Más dinero → presión para que i baje y E suba → para sostener Ē el banco central vende divisas y recoge la moneda → el crédito no llega al mercado de fondos.',
          `Nada real cambia: i, E, I y XN siguen en E₀; las reservas varían en ${fmt(c.reservas, 2)}. Con tipo fijo y capital móvil la política monetaria es ineficaz (trilema).`,
        );
      return cadena(
        `Choque: ΔM = ${fmt(p.dM, 0)} % → entra crédito nuevo ΔC = ${fmt(s.e1.r.credito, 0)} sin ahorro detrás (Sᴺ + ΔC).`,
        p.dM > 0
          ? 'Más fondos → i ↓ → la inversión sube y el capital sale → E ↑ (depreciación) → XN ↑. La absorción se va más allá de la FPP: más inversión sin menos consumo (sobreinversión) y la estructura se alarga sin ahorro que la sostenga.'
          : 'Menos fondos → i ↑ → la inversión cae y entra capital → E ↓ (apreciación) → XN ↓.',
        corto,
        z
          ? `Largo plazo: el dinero es neutral. Los precios suben ${fmt(p.dM, 0)} % (P = ${fmt(z.P, 2)}), E nominal sube en la misma proporción (${fmt(z.E, 3)}) y todas las variables reales (i, q, I, XN) vuelven a E₀: la expansión de la estructura no era sostenible.`
          : undefined,
      );
    case 'externa':
      return cadena(
        `Choque: Δi* = ${fmt(p.dIs, 2)} puntos (la tasa mundial ${p.dIs > 0 ? 'sube' : 'baja'}).`,
        p.dIs > 0
          ? 'Los depósitos externos rinden más → entra menos capital (o sale) → i ↑ → la inversión cae → E ↑ (depreciación) → XN ↑. La estructura de producción se acorta.'
          : 'Los depósitos externos rinden menos → entra capital → i ↓ → la inversión sube → E ↓ (apreciación) → XN ↓.',
        corto,
        largo,
      );
    case 'exportaciones':
      return cadena(
        `Choque: ΔX₀ = ${fmt(p.dX, 0)} (la curva X se desplaza a la ${p.dX > 0 ? 'derecha' : 'izquierda'}).`,
        fijo
          ? `Más demanda externa → para mantener la brecha Sᴺ − I el tipo de cambio real debe ${p.dX > 0 ? 'apreciarse' : 'depreciarse'}; con Ē fijo eso ocurre vía precios: P ${p.dX > 0 ? 'sube' : 'baja'}.`
          : `Más demanda de moneda nacional → E ${p.dX > 0 ? '↓ (apreciación)' : '↑ (depreciación)'} hasta que X − M vuelve a igualar Sᴺ − I: el saldo comercial lo fijan el ahorro y la inversión, no las exportaciones.`,
        corto,
        largo,
      );
    case 'expectativas':
      return cadena(
        `Choque: el mercado espera una depreciación de ${fmt(p.dEe, 0)} % (Eᵉ ${p.dEe > 0 ? 'sube' : 'baja'}).`,
        fijo
          ? 'Los depósitos en divisas rinden i* + ε → sale capital → para defender Ē la tasa interna debe subir con la prima ε → la inversión cae y la estructura se acorta.'
          : 'Los depósitos en divisas rinden más (la curva i* + ε sube) → sale capital → E ↑ hoy (profecía autocumplida) y la tasa interna sube → la inversión cae.',
        corto,
        z
          ? 'Largo plazo: si los fundamentos no cambian, las expectativas se corrigen (Eᵉ = E) y todo vuelve a E₀.'
          : undefined,
      );
    default:
      return cadena('Sin choque.', '—', corto);
  }
}

const imperfecta = (p: Params) => p['movilidad'] === 'imperfecta';

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 780,
  grupos: [
    {
      titulo: 'Régimen',
      controles: [
        {
          id: 'regimen',
          etiqueta: 'Tipo de cambio',
          tipo: 'selector',
          opciones: [
            { valor: 'flotante', etiqueta: 'Flotante' },
            { valor: 'fijo', etiqueta: 'Fijo' },
          ],
        },
        {
          id: 'movilidad',
          etiqueta: 'Movilidad del capital',
          tipo: 'selector',
          opciones: [
            { valor: 'imperfecta', etiqueta: 'Imperfecta (κ finito)' },
            { valor: 'perfecta', etiqueta: 'Perfecta (i = i* + ε)' },
          ],
        },
      ],
    },
    {
      visibleSi: imperfecta,
      controles: [{ id: 'kappa', etiqueta: 'Movilidad del capital κ', tipo: 'slider', min: 5, max: 200, paso: 5 }],
    },
    grupoChoques(CHOQUES),
    {
      titulo: 'Tamaño del choque',
      controles: [
        { id: 'dAp', etiqueta: 'Apertura: partir de economía cerrada (1 = sí)', tipo: 'slider', min: 0, max: 1, paso: 1 },
        { id: 'dG', etiqueta: 'ΔG (política fiscal)', tipo: 'slider', min: -100, max: 150, paso: 10 },
        { id: 'dM', etiqueta: 'ΔM % (política monetaria; ΔC = 4 por punto)', tipo: 'slider', min: -15, max: 30, paso: 1 },
        { id: 'dIs', etiqueta: 'Δi* (puntos)', tipo: 'slider', min: -3, max: 4, paso: 0.25 },
        { id: 'dX', etiqueta: 'ΔX₀ (demanda de exportaciones)', tipo: 'slider', min: -100, max: 150, paso: 10 },
        { id: 'dEe', etiqueta: 'Depreciación esperada ΔEᵉ (%)', tipo: 'slider', min: -10, max: 15, paso: 1 },
      ],
    },
    {
      titulo: 'Ahorro e inversión',
      controles: [
        { id: 'S0', etiqueta: 'Ahorro privado autónomo S₀', tipo: 'slider', min: 0, max: 300, paso: 10 },
        { id: 's', etiqueta: 'Respuesta del ahorro a i, s', tipo: 'slider', min: 0, max: 40, paso: 1 },
        { id: 'T', etiqueta: 'Impuestos T', tipo: 'slider', min: 0, max: 400, paso: 10 },
        { id: 'G', etiqueta: 'Gasto público G', tipo: 'slider', min: 0, max: 400, paso: 10 },
        { id: 'I0', etiqueta: 'Inversión autónoma I₀', tipo: 'slider', min: 100, max: 500, paso: 10 },
        { id: 'b', etiqueta: 'Respuesta de la inversión a i, b', tipo: 'slider', min: 0, max: 40, paso: 1 },
      ],
    },
    {
      titulo: 'Comercio y resto del mundo',
      controles: [
        { id: 'iStar', etiqueta: 'Tasa de interés mundial i* (%)', tipo: 'slider', min: 0, max: 12, paso: 0.25 },
        { id: 'X0', etiqueta: 'Exportaciones con q = 1, X₀', tipo: 'slider', min: 20, max: 400, paso: 10 },
        { id: 'x', etiqueta: 'Elasticidad de X al tipo real, x', tipo: 'slider', min: 0, max: 3, paso: 0.1 },
        { id: 'M0', etiqueta: 'Importaciones con q = 1, M₀', tipo: 'slider', min: 20, max: 400, paso: 10 },
        { id: 'm', etiqueta: 'Elasticidad de M al tipo real, m', tipo: 'slider', min: 0, max: 3, paso: 0.1 },
        { id: 'Yf', etiqueta: 'Tamaño de la FPP (producto potencial)', tipo: 'slider', min: 400, max: 1200, paso: 50 },
      ],
    },
  ],
  alCambiar: alCambiarChoques(CHOQUES, DELTAS),
  calcular: (p: Params) => calcular(p as unknown as P),
};

