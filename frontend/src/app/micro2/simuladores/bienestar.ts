import { Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import { AZUL, COLORES, DORADO, MORADO, ROJO, SUAVE, VERDE, aviso, figura, figuraVacia, lectura, punto, referencia, resultados, tabla, texto } from '../../core/tema';
import { Panel, curvaP, equilibrioP, figuraPaneles } from '../../macro2/simuladores/_paneles';
import { muestras } from './_comun';

const SIM_ID = 'm2-bienestar';
export const AUTOR_BIENESTAR = 'Varian, Microeconomía intermedia; Sen, Elección colectiva y bienestar social';
// FPU: W = 100 unidades de un bien; u_A = a·√x_A, u_B = b·√x_B. Arrow: tres votantes en ciclo de Condorcet.
const DEF = { enfoque: 'fpu' as string, ua: 2, ub: 1, W: 100, v1: 'xyz' as string, v2: 'yzx' as string, v3: 'zxy' as string };
type P = typeof DEF;

/* ------------------------------------------------------------------ frontera de posibilidades de utilidad */

export interface Criterio {
  xA: number;
  uA: number;
  uB: number;
  W: number;
}

export interface ResFPU {
  bentham: Criterio;
  rawls: Criterio;
  nash: Criterio;
}

/** u_A = a·√x_A, u_B = b·√(W − x_A): FPU (u_A/a)² + (u_B/b)² = W. */
export function fpu(a: number, b: number, W: number): ResFPU {
  for (const [n, v] of [['a', a], ['b', b], ['W', W]] as const)
    if (!(Number.isFinite(v) && v > 0)) throw new ErrorParametro(`${n} debe ser positivo.`);
  const crit = (xA: number, W_: (uA: number, uB: number) => number): Criterio => {
    const uA = a * Math.sqrt(xA);
    const uB = b * Math.sqrt(W - xA);
    return { xA, uA, uB, W: W_(uA, uB) };
  };
  return {
    // Utilitarismo: max u_A + u_B ⇒ x_A = W·a²/(a² + b²).
    bentham: crit((W * a * a) / (a * a + b * b), (x, y) => x + y),
    // Rawls: max min{u_A, u_B} ⇒ u_A = u_B ⇒ x_A = W·b²/(a² + b²).
    rawls: crit((W * b * b) / (a * a + b * b), (x, y) => Math.min(x, y)),
    // Nash (punto de desacuerdo 0): max u_A·u_B ⇒ x_A = W/2.
    nash: crit(W / 2, (x, y) => x * y),
  };
}

function vistaFPU(p: P): Simulacion {
  const r = fpu(p.ua, p.ub, p.W);
  const maxA = p.ua * Math.sqrt(p.W);
  const maxB = p.ub * Math.sqrt(p.W);
  const lim = Math.max(maxA, maxB) * 1.1;
  const G: Panel = {
    id: '',
    titulo: 'Frontera de posibilidades de utilidad y funciones de bienestar social',
    tituloX: 'Utilidad de A, u_A',
    tituloY: 'Utilidad de B, u_B',
    rangoX: [0, lim],
    rangoY: [0, lim],
    dominio: { x: [0, 1], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0, 0.93] },
  };
  const fig = figuraPaneles(SIM_ID + '-fpu', [G], 560);
  const us = linspace(0, maxA, 200);
  const frontera = (uA: number) => p.ub * Math.sqrt(Math.max(0, p.W - (uA / p.ua) ** 2));
  fig.data.push({
    type: 'scatter', x: [...us, 0], y: [...us.map(frontera), 0], xaxis: 'x', yaxis: 'y', mode: 'lines', fill: 'toself',
    fillcolor: 'rgba(91,155,255,.08)', line: { width: 0 }, name: 'Utilidades factibles', hoverinfo: 'name',
  });
  curvaP(fig, G, us, us.map(frontera), 'Frontera de posibilidades de utilidad', AZUL, 'final', 'FPU');
  const xs = linspace(lim / 400, lim, 200);
  // Curvas de indiferencia social que pasan por cada óptimo.
  curvaP(fig, G, xs, muestras(xs, (x) => r.bentham.W - x, lim), 'Bentham: u_A + u_B = constante', VERDE, 'intermedio', 'Bentham');
  const m = r.rawls.W;
  curvaP(fig, G, [m, m, lim], [lim, m, m], 'Rawls: min{u_A, u_B} = constante', ROJO, 'intermedio', 'Rawls');
  curvaP(fig, G, xs, muestras(xs, (x) => r.nash.W / x, lim), 'Nash: u_A·u_B = constante', MORADO, 'intermedio', 'Nash');
  equilibrioP(fig, G, r.bentham.uA, r.bentham.uB, 'Óptimo utilitarista (Bentham)', 'B', VERDE, { simbolo: 'diamond' });
  equilibrioP(fig, G, r.rawls.uA, r.rawls.uB, 'Óptimo de Rawls', 'R', ROJO, { simbolo: 'square', lecturas: false });
  equilibrioP(fig, G, r.nash.uA, r.nash.uB, 'Solución de Nash', 'N', MORADO, { lecturas: false });
  const fila = (n: string, c: Criterio): (string | number)[] => [n, c.xA, p.W - c.xA, c.uA, c.uB];
  const panel = [
    resultados([
      lectura(
        'Tres criterios de bienestar social',
        tabla(
          [fila('Bentham: max u_A + u_B', r.bentham), fila('Rawls: max min{u_A, u_B}', r.rawls), fila('Nash: max u_A·u_B', r.nash)],
          ['Criterio', 'x_A', 'x_B', 'u_A', 'u_B'],
        ),
      ),
      lectura(
        'Lectura',
        texto(
          'Todos los puntos de la FPU son eficientes en el sentido de Pareto; elegir entre ellos exige un juicio distributivo. ' +
            'Bentham da más a quien convierte mejor el bien en utilidad; Rawls iguala utilidades (maximiza la del peor); Nash reparte el bien por igual aquí.',
          'destacado',
        ),
        texto('Sube a: el óptimo de Bentham se aleja del de Rawls, porque el utilitarismo ignora la desigualdad.', 'pequeno texto-suave'),
        referencia('«El bienestar»: funciones de bienestar social y maximización del bienestar; Sen sobre utilitarismo y el criterio de Rawls.', AUTOR_BIENESTAR),
      ),
    ]),
  ];
  return { fig, panel };
}

/* ------------------------------------------------------------------ Arrow y la paradoja de Condorcet */

export const ORDENES = ['xyz', 'xzy', 'yxz', 'yzx', 'zxy', 'zyx'];
const ALT = ['x', 'y', 'z'];

export interface ResVotacion {
  /** gana[i][j] = votantes que prefieren la alternativa i a la j. */
  gana: number[][];
  /** Ganador de Condorcet (índice) o null si hay ciclo. */
  condorcet: number | null;
  ciclo: boolean;
  borda: number[];
}

export function votacion(ordenes: string[]): ResVotacion {
  if (!ordenes.every((o) => ORDENES.includes(o))) throw new ErrorParametro('Cada votante debe ordenar x, y y z sin empates.');
  const gana = ALT.map(() => ALT.map(() => 0));
  const borda = ALT.map(() => 0);
  for (const o of ordenes) {
    for (let i = 0; i < 3; i++) {
      borda[ALT.indexOf(o[i])] += 2 - i;
      for (let j = i + 1; j < 3; j++) gana[ALT.indexOf(o[i])][ALT.indexOf(o[j])]++;
    }
  }
  const mayoria = ordenes.length / 2;
  let condorcet: number | null = null;
  for (let i = 0; i < 3; i++) if ([0, 1, 2].every((j) => j === i || gana[i][j] > mayoria)) condorcet = i;
  return { gana, condorcet, ciclo: condorcet === null, borda };
}

function vistaArrow(p: P): Simulacion {
  const ordenes = [p.v1, p.v2, p.v3];
  const r = votacion(ordenes);
  const fig = figura('Votación por mayoría entre pares', 'Alternativas sociales', SIM_ID + '-arrow', {
    xaxis: { range: [0, 1], showticklabels: false, showgrid: false, zeroline: false },
    yaxis: { range: [0, 1], showticklabels: false, showgrid: false, zeroline: false },
    showlegend: false,
    annotations: [],
  });
  const pos: [number, number][] = [[0.5, 0.86], [0.18, 0.18], [0.82, 0.18]];
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++) {
      const [g, q] = r.gana[i][j] > r.gana[j][i] ? [i, j] : [j, i];
      fig.layout.annotations.push({
        x: pos[q][0], y: pos[q][1], ax: pos[g][0], ay: pos[g][1], xref: 'x', yref: 'y', axref: 'x', ayref: 'y',
        showarrow: true, arrowhead: 2, arrowsize: 1.3, arrowwidth: 2.2, arrowcolor: r.ciclo ? ROJO : VERDE, standoff: 26, startstandoff: 26, text: '',
      });
      fig.layout.annotations.push({
        x: (pos[i][0] + pos[j][0]) / 2, y: (pos[i][1] + pos[j][1]) / 2, text: `${ALT[g]} vence ${r.gana[g][q]}–${r.gana[q][g]}`,
        showarrow: false, font: { size: 12, color: COLORES.texto }, bgcolor: COLORES.panel,
      });
    }
  fig.data.push({
    type: 'scatter', x: pos.map((q) => q[0]), y: pos.map((q) => q[1]), mode: 'markers+text', text: ALT, textposition: 'middle center',
    textfont: { size: 18, color: COLORES.fondo }, name: 'Alternativas',
    marker: { size: 44, color: ALT.map((_, i) => (r.condorcet === i ? DORADO : SUAVE)) }, hovertemplate: 'Alternativa %{text}<extra></extra>',
  });
  if (r.condorcet !== null) punto(fig, pos[r.condorcet][0], pos[r.condorcet][1] + 0.1, 'Ganador de Condorcet', DORADO, 'star', 'ganador');
  const ordenTexto = (o: string) => o.split('').join(' ≻ ');
  const bordaGana = r.borda.indexOf(Math.max(...r.borda));
  const panel = [
    resultados([
      lectura(
        'Preferencias individuales',
        tabla(ordenes.map((o, i) => [`Votante ${i + 1}`, ordenTexto(o)])),
      ),
      lectura(
        'Resultado social',
        tabla([
          ['Mayoría entre pares', r.ciclo ? 'Ciclo: la preferencia social no es transitiva' : `Ganador de Condorcet: ${ALT[r.condorcet!]}`],
          ['Puntaje de Borda (x, y, z)', r.borda.join(', ')],
          ['Ganador por Borda', r.borda.filter((b) => b === r.borda[bordaGana]).length > 1 ? 'empate' : ALT[bordaGana]],
        ]),
      ),
      lectura(
        'Teorema de imposibilidad de Arrow',
        texto(
          'Ninguna regla de agregación de preferencias con tres o más alternativas cumple a la vez dominio universal, eficiencia de Pareto, independencia ' +
            'de alternativas irrelevantes y transitividad, salvo la dictadura. La mayoría entre pares falla en transitividad (ciclo de Condorcet); Borda falla en independencia.',
          'destacado',
        ),
        referencia('«El bienestar»: agregación de preferencias y teorema de Arrow; Sen, elección colectiva.', AUTOR_BIENESTAR),
      ),
    ]),
  ];
  return { fig, panel };
}

export function calcular(p: P): Simulacion {
  try {
    return p.enfoque === 'arrow' ? vistaArrow(p) : vistaFPU(p);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
}

const opcionesOrden = ORDENES.map((o) => ({ valor: o, etiqueta: o.split('').join(' ≻ ') }));

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 560,
  grupos: [
    {
      titulo: 'Economía: u_A = a·√x_A, u_B = b·√x_B, x_A + x_B = W',
      visibleSi: (p) => p['enfoque'] !== 'arrow',
      controles: [
        { id: 'ua', etiqueta: 'Eficiencia de A, a', tipo: 'slider', min: 0.5, max: 3, paso: 0.1 },
        { id: 'ub', etiqueta: 'Eficiencia de B, b', tipo: 'slider', min: 0.5, max: 3, paso: 0.1 },
        { id: 'W', etiqueta: 'Bien disponible W', tipo: 'slider', min: 10, max: 200, paso: 5 },
      ],
    },
    {
      titulo: 'Preferencias de los votantes',
      visibleSi: (p) => p['enfoque'] === 'arrow',
      controles: [
        { id: 'v1', etiqueta: 'Votante 1', tipo: 'selector', opciones: opcionesOrden },
        { id: 'v2', etiqueta: 'Votante 2', tipo: 'selector', opciones: opcionesOrden },
        { id: 'v3', etiqueta: 'Votante 3', tipo: 'selector', opciones: opcionesOrden },
      ],
    },
  ],
  planteamientos: {
    param: 'enfoque',
    opciones: [
      { valor: 'fpu', titulo: 'Frontera de posibilidades de utilidad (Bentham, Rawls, Nash)', resumen: 'Todos los puntos de la FPU son eficientes; cada función de bienestar social elige uno distinto.' },
      { valor: 'arrow', titulo: 'Teorema de imposibilidad de Arrow', resumen: 'Con tres votantes y tres alternativas, la mayoría entre pares puede ciclar: no hay regla perfecta salvo la dictadura.' },
    ],
  },
  calcular: (p: Params) => calcular(p as unknown as P),
};
