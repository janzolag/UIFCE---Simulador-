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
import { ParamsDAOA2, PuntoDAOA, ajuste, cortoPlazo, curvaDA, curvaOACP, largoPlazo } from '../modelos/daoa';
import { delta, refEstandar } from './_comun';
import {
  Choque,
  Estado,
  Panel,
  alCambiarChoques,
  cadena,
  cambio,
  curvaP,
  equilibrioP,
  figuraPaneles,
  grupoChoques,
  recorrido,
} from './_paneles';

const SIM_ID = 'm2-da-oa';
// DA: Y = 2,000 − 10·P; OACP: P = W + (Y − 1,000)/10; OALP: Y = 1,000. Con W = 100 el equilibrio es (1,000, 100).
// Ley de Okun: u − u* = −ω·100·(Y − Yₚ)/Yₚ, con u* = 5 % y ω = 0.3.
const DEF = {
  D0: 2000,
  d: 10,
  W: 100,
  sigma: 10,
  Yp: 1000,
  ustar: 5,
  okun: 0.3,
  autoajuste: 'si' as string,
  theta: 1,
  choque: 'demanda' as string,
  dD0: 200,
  dW: 0,
  dYp: 0,
};
type P = typeof DEF;

export const CHOQUES: Choque[] = [
  { valor: 'ninguno', etiqueta: 'Sin choque', cambios: {} },
  { valor: 'demanda', etiqueta: '+ Expansión de la demanda (ΔD₀ = +200)', cambios: { dD0: 200 } },
  { valor: 'contraccion', etiqueta: '− Contracción de la demanda (ΔD₀ = −200)', cambios: { dD0: -200 } },
  { valor: 'petroleo', etiqueta: '+ Choque petrolero (ΔW = +20)', cambios: { dW: 20 } },
  { valor: 'productividad', etiqueta: '+ Productividad (ΔYₚ = +100)', cambios: { dYp: 100 } },
];
const DELTAS = ['dD0', 'dW', 'dYp'];

export function escenarios(p: P): [ParamsDAOA2, ParamsDAOA2] {
  const base: ParamsDAOA2 = { D0: p.D0, d: p.d, W: p.W, sigma: p.sigma, Yp: p.Yp };
  return [base, { ...base, D0: p.D0 + p.dD0, W: p.W + p.dW, Yp: p.Yp + p.dYp }];
}

/**
 * Enlace DA-OA → Phillips. Con P₋₁ = P de E₀ (precio antes del choque):
 *   π = 100·(P − P₋₁)/P₋₁  y  ley de Okun u = u* − ω·100·(Y − Yₚ)/Yₚ.
 * Como la OACP es lineal, cada OACP se convierte exactamente en una CPCP
 *   π = πᵉ − β·(u − u*),  con  πᵉ = 100·(W − P₋₁)/P₋₁  y  β = Yₚ/(σ·P₋₁·ω).
 */
export interface Enlace {
  P0: number;
  ustar: number;
  okun: number;
}
export const desempleo = (e: Enlace, q: ParamsDAOA2, Y: number): number =>
  e.ustar - (e.okun * 100 * (Y - q.Yp)) / q.Yp;
export const inflacionDe = (e: Enlace, P: number): number => (100 * (P - e.P0)) / e.P0;
export const piEsperada = (e: Enlace, q: ParamsDAOA2): number => (100 * (q.W - e.P0)) / e.P0;
export const pendientePhillips = (e: Enlace, q: ParamsDAOA2): number => q.Yp / (q.sigma * e.P0 * e.okun);
export const cpcp = (e: Enlace, q: ParamsDAOA2, u: number): number =>
  piEsperada(e, q) - pendientePhillips(e, q) * (u - e.ustar);

export interface PasosDAOA {
  e0: PuntoDAOA;
  e1: PuntoDAOA;
  e2: PuntoDAOA | null;
  camino: PuntoDAOA[];
  enlace: Enlace;
}

export function pasos(p: P): PasosDAOA {
  const [b, n] = escenarios(p);
  if (!(p.okun > 0) || !Number.isFinite(p.okun)) throw new ErrorParametro('El coeficiente de Okun ω debe ser positivo.');
  if (!(p.ustar >= 0 && p.ustar < 100)) throw new ErrorParametro('La NAIRU u* debe estar en [0, 100) %.');
  const e0 = cortoPlazo(b);
  const e1 = cortoPlazo(n);
  const auto = p.autoajuste !== 'no';
  const e2 = auto ? largoPlazo(n) : null;
  const camino = auto ? ajuste(n, p.theta) : [];
  return { e0, e1, e2, camino, enlace: { P0: e0.P, ustar: p.ustar, okun: p.okun } };
}

export function calcular(p: P): Simulacion {
  const [b, n] = escenarios(p);
  let s: PasosDAOA;
  try {
    s = pasos(p);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const { e0, e1, e2, camino, enlace } = s;
  const auto = p.autoajuste !== 'no';
  const choqueDA = p.dD0 !== 0;
  const choqueOA = p.dW !== 0 || p.dYp !== 0;
  const choque = choqueDA || choqueOA;
  const brecha = e1.Y - n.Yp;
  const pts = [e0, e1, ...(e2 ? [e2] : [])];
  const pmax = Math.max(...pts.map((e) => e.P)) * 1.6;
  const ymax = Math.max(...pts.map((e) => e.Y), b.Yp, n.Yp) * 1.5;

  // Estados para el panel de Phillips: (u, π) de cada equilibrio, con su OACP (W) correspondiente.
  const q2: ParamsDAOA2 | null = e2 ? { ...n, W: e2.P } : null;
  const u0 = desempleo(enlace, b, e0.Y);
  const u1 = desempleo(enlace, n, e1.Y);
  const u2 = q2 && e2 ? desempleo(enlace, q2, e2.Y) : null;
  const pi0 = inflacionDe(enlace, e0.P);
  const pi1 = inflacionDe(enlace, e1.P);
  const pi2 = e2 ? inflacionDe(enlace, e2.P) : null;
  const us = [u0, u1, ...(u2 !== null ? [u2] : [])];
  const pis = [pi0, pi1, ...(pi2 !== null ? [pi2] : [])];
  const umax = Math.min(60, Math.max(p.ustar * 2.2, ...us.map((u) => u * 1.25), 10));
  const pimin = Math.min(-5, ...pis) - 4;
  const pimax = Math.max(5, ...pis) + 4;

  const A: Panel = {
    id: '',
    titulo: 'A · DA–OACP–OALP',
    tituloX: 'PIB real Y',
    tituloY: 'Nivel de precios P',
    rangoX: [0, ymax],
    rangoY: [0, pmax],
    dominio: { x: [0, 0.47], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0.55, 0.97] },
  };
  const B: Panel = {
    id: '2',
    titulo: 'B · Curva de Phillips (vía ley de Okun)',
    tituloX: 'Desempleo u (%)',
    tituloY: 'Inflación π desde E₀ (%)',
    rangoX: [0, umax],
    rangoY: [pimin, pimax],
    dominio: { x: [0.56, 1], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0, 0.42] },
  };
  const fig = figuraPaneles(SIM_ID, [A, B], 960);

  // ---------- Panel A
  const ps = linspace(0, pmax, 60);
  const ys = linspace(0, ymax, 160);
  const trazarDA = (q: ParamsDAOA2, et: string, color: string, estado: Estado) =>
    curvaP(fig, A, ps.map((P) => Math.max(0, curvaDA(q, P))), ps, 'DA', color, estado, et);
  const trazarOA = (q: ParamsDAOA2, et: string, color: string, estado: Estado) =>
    curvaP(
      fig,
      A,
      ys,
      ys.map((y) => {
        const v = curvaOACP(q, y);
        return v >= 0 && v <= pmax * 1.5 ? v : null;
      }),
      'OACP',
      color,
      estado,
      et,
    );
  if (choqueDA) trazarDA(b, 'DA₀', AZUL, 'inicial');
  trazarDA(n, choqueDA ? 'DA₁' : 'DA', choqueDA ? VERDE : AZUL, 'final');
  const oaFinal = q2 && Math.abs(q2.W - n.W) > 1e-9;
  if (choqueOA) trazarOA(b, 'OACP₀', ROJO, 'inicial');
  trazarOA(n, choqueOA ? 'OACP₁' : 'OACP', choqueOA ? MORADO : ROJO, oaFinal ? 'intermedio' : 'final');
  if (oaFinal && q2) trazarOA(q2, 'OACP₂', DORADO, 'final');
  if (p.dYp !== 0) curvaP(fig, A, [b.Yp, b.Yp], [0, pmax], 'OALP', NARANJA, 'inicial', 'OALP₀');
  curvaP(fig, A, [n.Yp, n.Yp], [0, pmax], 'OALP (Yₚ)', NARANJA, 'final', p.dYp !== 0 ? 'OALP₁' : 'OALP');
  if (Math.abs(brecha) > 1e-6)
    fig.data.push({
      type: 'scatter',
      x: [n.Yp, e1.Y],
      y: [e1.P, e1.P],
      mode: 'lines',
      name: brecha > 0 ? 'Brecha inflacionaria' : 'Brecha recesiva',
      line: { color: brecha > 0 ? ROJO : AZUL, width: 7 },
      opacity: 0.45,
      hovertemplate: `Brecha: ${fmt(brecha, 2)}<extra></extra>`,
    });
  if (auto && camino.length > 1)
    fig.data.push({
      type: 'scatter',
      x: camino.map((e) => e.Y),
      y: camino.map((e) => e.P),
      mode: 'lines+markers',
      name: 'Autocorrección período a período',
      line: { color: DORADO, width: 1, dash: 'dot' },
      marker: { size: 5, color: DORADO },
      hovertemplate: 'Y = %{x:.2f}<br>P = %{y:.2f}<extra></extra>',
    });

  // ---------- Panel B: Phillips de corto plazo (una por cada OACP) y CPLP vertical en u*
  const uu = linspace(0, umax, 80);
  const clip = (v: number) => (v >= pimin - 50 && v <= pimax + 50 ? v : null);
  const trazarCP = (q: ParamsDAOA2, et: string, color: string, estado: Estado) =>
    curvaP(fig, B, uu, uu.map((u) => clip(cpcp(enlace, q, u))), `CPCP (πᵉ = ${fmt(piEsperada(enlace, q), 2)} %)`, color, estado, et);
  const cpCambia = choqueOA;
  if (cpCambia) trazarCP(b, 'CPCP₀', AZUL, 'inicial');
  trazarCP(n, cpCambia ? 'CPCP₁' : 'CPCP', cpCambia ? MORADO : AZUL, oaFinal ? 'intermedio' : 'final');
  if (oaFinal && q2) trazarCP(q2, 'CPCP₂', DORADO, 'final');
  curvaP(fig, B, [p.ustar, p.ustar], [pimin, pimax], 'CPLP (NAIRU u*)', NARANJA, 'final', 'CPLP');
  if (auto && camino.length > 1)
    fig.data.push({
      type: 'scatter',
      x: camino.map((e) => Math.max(0, desempleo(enlace, n, e.Y))),
      y: camino.map((e) => inflacionDe(enlace, e.P)),
      xaxis: 'x2',
      yaxis: 'y2',
      mode: 'lines+markers',
      name: 'Autocorrección en (u, π)',
      line: { color: DORADO, width: 1, dash: 'dot' },
      marker: { size: 5, color: DORADO },
      hovertemplate: 'u = %{x:.2f} %<br>π = %{y:.2f} %<extra></extra>',
    });

  // ---------- Equilibrios
  const c0 = choque ? SUAVE : DORADO;
  const n0 = choque ? 'Equilibrio inicial' : 'Equilibrio (Y*, P*)';
  equilibrioP(fig, A, e0.Y, e0.P, n0, 'E₀', c0);
  equilibrioP(fig, B, Math.max(0, u0), pi0, n0, 'E₀', c0, { lecturas: !choque });
  if (choque) {
    equilibrioP(fig, A, e1.Y, e1.P, 'Corto plazo tras el choque', 'E₁', VERDE, { simbolo: 'square' });
    equilibrioP(fig, B, Math.max(0, u1), pi1, 'Corto plazo tras el choque', 'E₁', VERDE, { simbolo: 'square' });
    const e2Distinto = e2 && Math.abs(e2.Y - e1.Y) + Math.abs(e2.P - e1.P) > 1e-6;
    if (e2 && e2Distinto && u2 !== null && pi2 !== null) {
      equilibrioP(fig, A, e2.Y, e2.P, 'Largo plazo', 'E₂', DORADO, { simbolo: 'diamond' });
      equilibrioP(fig, B, Math.max(0, u2), pi2, 'Largo plazo', 'E₂', DORADO, { simbolo: 'diamond' });
    }
    recorrido(fig, A, [[e0.Y, e0.P], [e1.Y, e1.P], e2 && e2Distinto ? [e2.Y, e2.P] : null], DORADO);
    recorrido(
      fig,
      B,
      [[u0, pi0], [u1, pi1], e2Distinto && u2 !== null && pi2 !== null ? [u2, pi2] : null],
      DORADO,
    );
  }

  // ---------- Resultados
  const lecturas: Bloque[] = [];
  if (Math.abs(brecha) > 1e-6)
    lecturas.push(
      texto(
        brecha > 0
          ? `Brecha inflacionaria de ${fmt(brecha, 2)}: Y supera a Yₚ, el desempleo cae bajo la NAIRU y los salarios nominales suben.`
          : `Brecha recesiva de ${fmt(-brecha, 2)}: Y está bajo Yₚ, el desempleo supera la NAIRU y los salarios nominales bajan.`,
        'destacado',
      ),
    );
  if (Math.min(...us) < 0)
    lecturas.push(
      aviso('Con este choque la ley de Okun da un desempleo negativo: se dibuja en u = 0. Reduce ω o el tamaño del choque.'),
    );
  if (!auto && Math.abs(brecha) > 1e-6)
    lecturas.push(texto('Activa la autocorrección para ver cómo se cierra la brecha en el largo plazo.', 'pequeno texto-suave'));
  if (!choque)
    lecturas.push(
      texto('Pulsa un botón de choque: E₀ queda gris punteado, E₁ (corto plazo) y E₂ (largo plazo) aparecen en ambos paneles.', 'pequeno texto-suave'),
    );
  lecturas.push(
    texto(
      `Enlace entre paneles: π se mide respecto a P de E₀ y u sale de la ley de Okun (ω = ${fmt(p.okun, 2)}). ` +
        `Así la OACP vigente se traduce en una CPCP con pendiente β = Yₚ/(σ·P₀·ω) = ${fmt(pendientePhillips(enlace, n), 3)}.`,
      'pequeno texto-suave',
    ),
  );

  const filas: (string | number | null)[][] = [
    ['PIB real Y', e0.Y, e1.Y, e2?.Y ?? null],
    ['Nivel de precios P', e0.P, e1.P, e2?.P ?? null],
    ['Brecha Y − Yₚ', delta(e0.Y - b.Yp), delta(brecha), e2 ? 0 : null],
    ['Desempleo u (%)', u0, u1, u2],
    ['Inflación π desde E₀ (%)', pi0, pi1, pi2],
  ];
  const bloques: Bloque[] = [];
  if (choque) bloques.push(cadenaDAOA(p, s));
  bloques.push(
    lectura('Equilibrios', tabla(filas, ['', 'E₀ inicial', 'E₁ corto plazo', 'E₂ largo plazo'])),
    lectura(
      'Lectura',
      ...lecturas,
      refEstandar('modelo DA-OA con OACP y OALP, ley de Okun y curva de Phillips aumentada con expectativas; Krugman y Obstfeld (2006) no los desarrolla en economía cerrada.'),
    ),
  );
  return { fig, panel: [resultados(bloques)] };
}

export function cadenaDAOA(p: P, s: PasosDAOA): Bloque {
  const { e0, e1, e2, enlace } = s;
  const [b, n] = escenarios(p);
  const u0 = desempleo(enlace, b, e0.Y);
  const u1 = desempleo(enlace, n, e1.Y);
  const pi1 = inflacionDe(enlace, e1.P);
  const corto = `Corto plazo: Y ${cambio(e0.Y, e1.Y)}; P ${cambio(e0.P, e1.P)}; u ${cambio(u0, u1)} %; π = ${fmt(pi1, 2)} %.`;
  const largo = e2
    ? Math.abs(e2.P - e0.P) < 1e-6 && Math.abs(e2.Y - e0.Y) < 1e-6
      ? `Largo plazo: la brecha mueve los salarios (W), la OACP regresa y la economía vuelve a E₀ = (${fmt(e2.Y, 2)}, ${fmt(e2.P, 2)}); u = u*. Autocorrección completa.`
      : `Largo plazo: los salarios y la inflación esperada se ajustan (OACP y CPCP se desplazan) hasta Y = Yₚ = ${fmt(e2.Y, 2)} con P = ${fmt(e2.P, 2)}; u vuelve a u* = ${fmt(p.ustar, 2)} %. Autocorrección: el choque ${p.dD0 !== 0 && p.dW === 0 && p.dYp === 0 ? 'de demanda solo deja precios más ' + (p.dD0 > 0 ? 'altos' : 'bajos') : 'deja un nuevo nivel de precios'}.`
    : 'Largo plazo: autocorrección desactivada (solo corto plazo).';
  const partes: string[] = [];
  if (p.dD0 !== 0) partes.push(`ΔD₀ = ${fmt(p.dD0, 0)} (demanda)`);
  if (p.dW !== 0) partes.push(`ΔW = ${fmt(p.dW, 0)} (costos / oferta)`);
  if (p.dYp !== 0) partes.push(`ΔYₚ = ${fmt(p.dYp, 0)} (productividad)`);
  let trans: string;
  if (p.dD0 !== 0 && p.dW === 0 && p.dYp === 0) {
    const s1 = p.dD0 > 0;
    trans = `DA ${s1 ? '→ (derecha)' : '← (izquierda)'} → Y ${s1 ? '↑' : '↓'} y P ${s1 ? '↑' : '↓'} (E₁) → u ${s1 ? '↓' : '↑'} por la ley de Okun → π ${s1 ? '↑' : '↓'}: movimiento a lo largo de la CPCP.`;
  } else if (p.dW !== 0 && p.dD0 === 0 && p.dYp === 0) {
    const s1 = p.dW > 0;
    trans = `Costos ${s1 ? '↑' : '↓'} → OACP ${s1 ? '↑' : '↓'} → P ${s1 ? '↑' : '↓'} y Y ${s1 ? '↓' : '↑'} → u ${s1 ? '↑' : '↓'} y π ${s1 ? '↑' : '↓'}: la CPCP se desplaza (${s1 ? 'estanflación' : 'desinflación con auge'}).`;
  } else if (p.dYp !== 0 && p.dD0 === 0 && p.dW === 0) {
    trans = `Yₚ ${p.dYp > 0 ? '↑' : '↓'} → OALP y OACP se desplazan ${p.dYp > 0 ? 'a la derecha' : 'a la izquierda'} → P ${p.dYp > 0 ? '↓' : '↑'} con Y ${p.dYp > 0 ? '↑' : '↓'}.`;
  } else trans = 'Choques combinados: cada curva se desplaza según su choque; el resultado neto se lee en la tabla.';
  return cadena(`Choque: ${partes.join(', ')}.`, trans, corto, largo);
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 600,
  grupos: [
    grupoChoques(CHOQUES),
    {
      titulo: 'Demanda agregada: Y = D₀ − d·P',
      controles: [
        { id: 'D0', etiqueta: 'Demanda autónoma D₀', tipo: 'slider', min: 1200, max: 3000, paso: 50 },
        { id: 'd', etiqueta: 'Sensibilidad a los precios d', tipo: 'slider', min: 2, max: 30, paso: 1 },
      ],
    },
    {
      titulo: 'Oferta: P = W + (Y − Yₚ)/σ',
      controles: [
        { id: 'W', etiqueta: 'Costos nominales W (precio esperado)', tipo: 'slider', min: 40, max: 200, paso: 5 },
        { id: 'sigma', etiqueta: 'Pendiente de la OACP σ', tipo: 'slider', min: 2, max: 40, paso: 1 },
        { id: 'Yp', etiqueta: 'Producto potencial Yₚ (OALP)', tipo: 'slider', min: 500, max: 1500, paso: 50 },
      ],
    },
    {
      titulo: 'Mercado laboral (enlace con Phillips)',
      controles: [
        { id: 'ustar', etiqueta: 'NAIRU u* (%)', tipo: 'slider', min: 2, max: 12, paso: 0.25 },
        { id: 'okun', etiqueta: 'Coeficiente de Okun ω', tipo: 'slider', min: 0.1, max: 1, paso: 0.05 },
      ],
    },
    {
      titulo: 'Largo plazo',
      controles: [
        {
          id: 'autoajuste',
          etiqueta: 'Autocorrección de largo plazo',
          tipo: 'selector',
          opciones: [
            { valor: 'si', etiqueta: 'Activada' },
            { valor: 'no', etiqueta: 'Solo corto plazo' },
          ],
        },
      ],
    },
    {
      visibleSi: (p) => p['autoajuste'] !== 'no',
      controles: [
        { id: 'theta', etiqueta: 'Velocidad de ajuste de salarios θ', tipo: 'slider', min: 0.1, max: 1, paso: 0.05 },
      ],
    },
    {
      titulo: 'Tamaño del choque',
      controles: [
        { id: 'dD0', etiqueta: 'Choque de demanda ΔD₀', tipo: 'slider', min: -400, max: 400, paso: 25 },
        { id: 'dW', etiqueta: 'Choque de oferta ΔW (precio de insumos)', tipo: 'slider', min: -40, max: 40, paso: 5 },
        { id: 'dYp', etiqueta: 'Choque de productividad ΔYₚ', tipo: 'slider', min: -300, max: 300, paso: 25 },
      ],
    },
  ],
  alCambiar: alCambiarChoques(CHOQUES, DELTAS),
  calcular: (p: Params) => calcular(p as unknown as P),
};
