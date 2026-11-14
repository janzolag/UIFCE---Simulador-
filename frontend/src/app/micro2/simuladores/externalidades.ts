import { Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import { AZUL, DORADO, MORADO, NARANJA, ROJO, SUAVE, VERDE, aviso, figuraVacia, lectura, resultados, tabla, texto } from '../../core/tema';
import { Panel, curvaP, ejeX, ejeY, equilibrioP, figuraPaneles } from '../../macro2/simuladores/_paneles';
import { muestras, refVarian } from './_comun';
import { Figura } from '../../core/tipos';

const SIM_ID = 'm2-externalidades';
// Externalidad: p = 100 − Q, CMg privado = 10 + Q, daño marginal CMgE = 0.5·Q ⇒ Qᵐ = 45, Q* = 36, t* = 18.
// Bien público: TMS₁ = 60 − G, TMS₂ = 40 − G, CMg = 40 ⇒ G* = 30; provisión privada G = 20.
const DEF = {
  enfoque: 'externalidad' as string,
  a: 100, b: 1, c: 10, d: 1, e: 0.5,
  a1: 60, b1: 1, a2: 40, b2: 1, cg: 40,
};
type P = typeof DEF;

export interface ResExternalidad {
  Qm: number;
  pm: number;
  Qs: number;
  ps: number;
  /** Impuesto pigouviano: daño marginal en el óptimo. */
  t: number;
  PIE: number;
  /** Coase: pago máximo de las víctimas (daño evitado) y mínimo que acepta el contaminador (beneficio perdido). */
  danoEvitado: number;
  beneficioPerdido: number;
}

export function externalidad(q: { a: number; b: number; c: number; d: number; e: number }): ResExternalidad {
  for (const [n, v] of [['a', q.a], ['b', q.b]] as const) if (!(Number.isFinite(v) && v > 0)) throw new ErrorParametro(`${n} debe ser positivo.`);
  for (const [n, v] of [['c', q.c], ['d', q.d], ['e', q.e]] as const)
    if (!(Number.isFinite(v) && v >= 0)) throw new ErrorParametro(`${n} no puede ser negativo.`);
  if (q.c >= q.a) throw new ErrorParametro('Con c ≥ a no se produce nada.');
  const Qm = (q.a - q.c) / (q.b + q.d);
  const Qs = (q.a - q.c) / (q.b + q.d + q.e);
  const t = q.e * Qs;
  // Pérdida irrecuperable: área entre CMg social y demanda de Qs a Qm.
  const PIE = 0.5 * (Qm - Qs) * (q.c + (q.d + q.e) * Qm - (q.a - q.b * Qm));
  const danoEvitado = 0.5 * q.e * (Qm * Qm - Qs * Qs);
  // Beneficio privado perdido: ∫ (p − CMg) de Qs a Qm.
  const margen = (Q: number) => q.a - q.c - (q.b + q.d) * Q;
  const beneficioPerdido = 0.5 * (margen(Qs) + margen(Qm)) * (Qm - Qs);
  return { Qm, pm: q.a - q.b * Qm, Qs, ps: q.a - q.b * Qs, t, PIE, danoEvitado, beneficioPerdido };
}

export interface ResPublico {
  G: number;
  Gprivado: number;
  sumaTMS: number;
}

/** Samuelson: Σ TMSᵢ(G) = CMg; provisión privada: solo aporta quien más valora (polizón el otro). */
export function bienPublico(q: { a1: number; b1: number; a2: number; b2: number; cg: number }): ResPublico {
  for (const [n, v] of [['a₁', q.a1], ['b₁', q.b1], ['a₂', q.a2], ['b₂', q.b2]] as const)
    if (!(Number.isFinite(v) && v > 0)) throw new ErrorParametro(`${n} debe ser positivo.`);
  if (!(Number.isFinite(q.cg) && q.cg > 0)) throw new ErrorParametro('El costo marginal del bien público debe ser positivo.');
  const tms = (G: number) => Math.max(0, q.a1 - q.b1 * G) + Math.max(0, q.a2 - q.b2 * G);
  if (tms(0) <= q.cg) return { G: 0, Gprivado: 0, sumaTMS: tms(0) };
  // Σ TMS es decreciente y lineal a tramos: bisección.
  let lo = 0;
  let hi = Math.max(q.a1 / q.b1, q.a2 / q.b2);
  for (let i = 0; i < 100; i++) {
    const m = (lo + hi) / 2;
    if (tms(m) > q.cg) lo = m;
    else hi = m;
  }
  const G = (lo + hi) / 2;
  const Gprivado = Math.max(0, (q.a1 - q.cg) / q.b1, (q.a2 - q.cg) / q.b2);
  return { G, Gprivado, sumaTMS: tms(G) };
}

function area(fig: Figura, P_: Panel, xs: number[], ys: number[], nombre: string, color: string): void {
  fig.data.push({
    type: 'scatter', x: [...xs, xs[0]], y: [...ys, ys[0]], xaxis: ejeX(P_), yaxis: ejeY(P_), mode: 'lines', fill: 'toself',
    fillcolor: color, line: { width: 0 }, name: nombre, hoverinfo: 'name',
  });
}

function vistaExternalidad(p: P): Simulacion {
  const r = externalidad(p);
  const qmax = (p.a / p.b) * 1.02;
  const pmax = p.a * 1.1;
  const G: Panel = {
    id: '',
    titulo: 'Externalidad negativa en la producción',
    tituloX: 'Cantidad Q',
    tituloY: 'Precio y costos',
    rangoX: [0, qmax],
    rangoY: [0, pmax],
    dominio: { x: [0, 1], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0, 0.93] },
  };
  const fig = figuraPaneles(SIM_ID + '-ext', [G], 560);
  const cmgS = (Q: number) => p.c + (p.d + p.e) * Q;
  const cmgP = (Q: number) => p.c + p.d * Q;
  const xs = linspace(r.Qs, r.Qm, 40);
  area(fig, G, [...xs, ...[...xs].reverse()], [...xs.map(cmgS), ...[...xs].reverse().map((Q) => p.a - p.b * Q)], `Pérdida irrecuperable = ${fmt(r.PIE, 2)}`, 'rgba(255,122,133,.4)');
  const qs = linspace(0, qmax, 160);
  curvaP(fig, G, qs, muestras(qs, (Q) => p.a - p.b * Q, pmax), 'Demanda (beneficio marginal)', AZUL, 'final', 'D');
  curvaP(fig, G, qs, muestras(qs, cmgP, pmax), 'CMg privado', NARANJA, 'final', 'CMgP');
  curvaP(fig, G, qs, muestras(qs, cmgS, pmax), 'CMg social = CMg privado + CMgE', ROJO, 'final', 'CMgS');
  curvaP(fig, G, qs, muestras(qs, (Q) => p.e * Q, pmax), 'Daño marginal externo CMgE', SUAVE, 'intermedio', 'CMgE');
  curvaP(fig, G, qs, muestras(qs, (Q) => cmgP(Q) + r.t, pmax), `CMg privado + impuesto t* = ${fmt(r.t, 2)}`, MORADO, 'intermedio', 'CMgP + t');
  equilibrioP(fig, G, r.Qm, r.pm, 'Equilibrio de mercado', 'M', NARANJA, { lecturas: false });
  equilibrioP(fig, G, r.Qs, r.ps, 'Óptimo social (y con impuesto pigouviano)', 'S*', DORADO, { simbolo: 'diamond' });
  const panel = [
    resultados([
      lectura(
        'Mercado frente a óptimo social',
        tabla(
          [
            ['Cantidad Q', r.Qm, r.Qs],
            ['Precio p', r.pm, r.ps],
          ],
          ['', 'Mercado', 'Óptimo social'],
        ),
        tabla([['Impuesto pigouviano t* = CMgE(Q*)', r.t], ['Pérdida irrecuperable sin corregir', r.PIE]]),
      ),
      lectura(
        'Teorema de Coase',
        tabla([
          ['Daño evitado al pasar de Qᵐ a Q*', r.danoEvitado],
          ['Beneficio que pierde el productor', r.beneficioPerdido],
        ]),
        texto(
          'Sin costos de transacción y con derechos de propiedad bien definidos, la negociación lleva a Q* sea quien sea el dueño del derecho: ' +
            'si es el productor, las víctimas le pagan entre el beneficio perdido y el daño evitado para que reduzca a Q*.',
          'pequeno texto-suave',
        ),
      ),
      lectura(
        'Lectura',
        texto(
          'El productor ignora el daño que causa: produce donde p = CMg privado, más de lo eficiente. Un impuesto igual al daño marginal en el óptimo ' +
            'internaliza la externalidad y el mercado llega solo a Q*.',
          'destacado',
        ),
        refVarian('«Las externalidades»: impuesto pigouviano, derechos de propiedad y teorema de Coase; Monsalve (2017).'),
      ),
    ]),
  ];
  return { fig, panel };
}

function vistaPublico(p: P): Simulacion {
  const r = bienPublico(p);
  const gmax = Math.max(p.a1 / p.b1, p.a2 / p.b2) * 1.05;
  const ymax = (p.a1 + p.a2) * 1.05;
  const G: Panel = {
    id: '',
    titulo: 'Bien público: suma vertical de las disposiciones a pagar',
    tituloX: 'Cantidad del bien público G',
    tituloY: 'TMS (disposición marginal a pagar) y costo',
    rangoX: [0, gmax],
    rangoY: [0, Math.max(ymax, p.cg * 1.2)],
    dominio: { x: [0, 1], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0, 0.93] },
  };
  const fig = figuraPaneles(SIM_ID + '-publico', [G], 560);
  const gs = linspace(0, gmax, 160);
  const t1 = (g: number) => Math.max(0, p.a1 - p.b1 * g);
  const t2 = (g: number) => Math.max(0, p.a2 - p.b2 * g);
  curvaP(fig, G, gs, gs.map(t1), 'TMS del consumidor 1', AZUL, 'intermedio', 'TMS₁');
  curvaP(fig, G, gs, gs.map(t2), 'TMS del consumidor 2', VERDE, 'intermedio', 'TMS₂');
  curvaP(fig, G, gs, gs.map((g) => t1(g) + t2(g)), 'Suma vertical TMS₁ + TMS₂', MORADO, 'final', 'Σ TMS');
  curvaP(fig, G, [0, gmax], [p.cg, p.cg], 'Costo marginal CMg', ROJO, 'final', 'CMg');
  equilibrioP(fig, G, r.G, p.cg, 'Óptimo de Samuelson: Σ TMS = CMg', 'G*', DORADO, { simbolo: 'diamond' });
  if (r.Gprivado > 0) equilibrioP(fig, G, r.Gprivado, p.cg, 'Provisión privada voluntaria', 'Gᵖ', ROJO, { lecturas: false });
  const panel = [
    resultados([
      lectura(
        'Provisión del bien público',
        tabla([
          ['Óptimo de Samuelson G*', r.G], ['Σ TMS en G*', r.sumaTMS], ['Costo marginal', p.cg],
          ['Provisión privada voluntaria', r.Gprivado], ['Faltante por polizón', r.G - r.Gprivado],
        ]),
      ),
      lectura(
        'Lectura',
        texto(
          'Un bien público es no rival y no excluible: todos consumen la misma cantidad G, así que su valor social es la suma vertical de las TMS. ' +
            'Cada consumidor compara solo su propia TMS con el costo y espera que el otro pague (polizón): la provisión privada queda corta.',
          'destacado',
        ),
        refVarian('«Los bienes públicos»: condición de Samuelson y el problema del polizón; Monsalve (2017).'),
      ),
    ]),
  ];
  return { fig, panel };
}

export function calcular(p: P): Simulacion {
  try {
    return p.enfoque === 'publico' ? vistaPublico(p) : vistaExternalidad(p);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 560,
  grupos: [
    {
      titulo: 'Demanda p = a − b·Q y CMg privado = c + d·Q',
      visibleSi: (p) => p['enfoque'] !== 'publico',
      controles: [
        { id: 'a', etiqueta: 'Precio máximo a', tipo: 'slider', min: 20, max: 200, paso: 5 },
        { id: 'b', etiqueta: 'Pendiente de la demanda b', tipo: 'slider', min: 0.25, max: 4, paso: 0.25 },
        { id: 'c', etiqueta: 'Costo marginal inicial c', tipo: 'slider', min: 0, max: 60, paso: 1 },
        { id: 'd', etiqueta: 'Pendiente del CMg privado d', tipo: 'slider', min: 0, max: 4, paso: 0.25 },
        { id: 'e', etiqueta: 'Daño marginal externo CMgE = e·Q', tipo: 'slider', min: 0, max: 4, paso: 0.25 },
      ],
    },
    {
      titulo: 'Disposiciones a pagar TMSᵢ = aᵢ − bᵢ·G y costo',
      visibleSi: (p) => p['enfoque'] === 'publico',
      controles: [
        { id: 'a1', etiqueta: 'a₁', tipo: 'slider', min: 5, max: 120, paso: 5 },
        { id: 'b1', etiqueta: 'b₁', tipo: 'slider', min: 0.25, max: 4, paso: 0.25 },
        { id: 'a2', etiqueta: 'a₂', tipo: 'slider', min: 5, max: 120, paso: 5 },
        { id: 'b2', etiqueta: 'b₂', tipo: 'slider', min: 0.25, max: 4, paso: 0.25 },
        { id: 'cg', etiqueta: 'Costo marginal del bien público', tipo: 'slider', min: 5, max: 150, paso: 5 },
      ],
    },
  ],
  planteamientos: {
    param: 'enfoque',
    opciones: [
      { valor: 'externalidad', titulo: 'Externalidades (impuesto pigouviano y Coase)', resumen: 'El mercado ignora el daño externo; un impuesto igual al daño marginal o la negociación de Coase llevan al óptimo social.' },
      { valor: 'publico', titulo: 'Bienes públicos (condición de Samuelson)', resumen: 'Bien no rival: la suma vertical de las TMS iguala al costo marginal; la provisión privada se queda corta.' },
    ],
  },
  calcular: (p: Params) => calcular(p as unknown as P),
};
