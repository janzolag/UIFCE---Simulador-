import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { linspace } from '../../core/numerico';
import {
  ACENTO, AZUL, NARANJA, ROJO, VERDE, aviso, figuraVacia, layoutBase, lectura, punto, referencia, resultados, tabla, texto,
} from '../../core/tema';
import { CostoCubico } from '../modelos/costos';
import { equilibrioNEmpresasCubicas, nLibreEntrada, ofertaEmpresaCubica } from '../modelos/competencia';

const SIM_ID = 'competencia-perfecta';
const DEF = { CF: 20, a: 10, b: 2, c: 0.5, n: 20, Ad: 400, Bd: 10 };
type P = typeof DEF;

const ZONAS: Record<string, [string, 'info' | 'error']> = {
  cierra: ['La empresa cierra: el precio no cubre ni el costo variable medio.', 'error'],
  opera_con_perdidas: ['Opera con pérdidas: cubre el costo variable y parte del fijo. Cerrar le costaría todo el costo fijo.', 'info'],
  beneficio_cero: ['Beneficio económico cero: situación de largo plazo.', 'info'],
  beneficio_positivo: ['Beneficio positivo: en el largo plazo entrarían más empresas.', 'info'],
};

const SEGUNDO = { xaxis: 'x2', yaxis: 'y2', showlegend: false };

export function calcular({ CF, a, b, c, n, Ad, Bd }: P): Simulacion {
  let k: CostoCubico;
  let eq;
  n = Math.trunc(n);
  try {
    k = new CostoCubico(CF, a, b, c);
    eq = equilibrioNEmpresasCubicas(Ad, Bd, k, n);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const { p, q_empresa: q } = eq;
  const of = ofertaEmpresaCubica(k, p);
  const qmax = Math.max(2.2 * k.q_min_cme(), q * 1.4, 1);
  const qs = linspace(qmax / 300, qmax, 300);
  const ytop = Math.max(k.CMe(k.q_min_cme()) * 2.2, p * 1.4);

  const data: any[] = [];
  const fig = { data, layout: {} as any };
  const curvas: [string, (v: number) => number, string, string][] = [
    ['CMg', k.CMg, ROJO, 'solid'], ['CMe', k.CMe, AZUL, 'solid'], ['CVMe', k.CVMe, VERDE, 'dash'],
  ];
  for (const [nom, f, col, dash] of curvas)
    data.push({ type: 'scatter', x: qs, y: qs.map(f), mode: 'lines', name: nom, line: { color: col, width: 2.5, dash } });
  if (q > 0) {
    const cme = k.CMe(q);
    data.push({
      type: 'scatter', x: [0, q, q, 0, 0], y: [cme, cme, p, p, cme], fill: 'toself',
      fillcolor: p >= cme ? 'rgba(61,214,181,.25)' : 'rgba(255,122,133,.25)', line: { width: 0 },
      name: p >= cme ? 'Beneficio' : 'Pérdida', hoverinfo: 'skip',
    });
  }
  data.push({
    type: 'scatter', x: [0, qmax], y: [p, p], mode: 'lines', name: 'Precio de mercado = IMg',
    line: { color: ACENTO, dash: 'dot', width: 2 },
  });
  punto(fig, q, p, 'Producción de la empresa', undefined, undefined, undefined, { showlegend: false });

  const ps = linspace(0, Ad / Bd, 300);
  data.push({
    type: 'scatter', x: ps.map((v) => Math.max(Ad - Bd * v, 0)), y: ps, mode: 'lines', name: 'Demanda de mercado',
    line: { color: NARANJA, width: 3 }, xaxis: 'x2', yaxis: 'y2',
  });
  data.push({
    type: 'scatter', x: ps.map((v) => n * ofertaEmpresaCubica(k, v).q), y: ps, mode: 'lines', name: 'Oferta de mercado (n·CMg)',
    line: { color: ROJO, width: 3 }, xaxis: 'x2', yaxis: 'y2',
  });
  punto(fig, eq.Q, p, 'Equilibrio', undefined, undefined, undefined, SEGUNDO);

  const eje = (titulo: string) => ({ title: { text: titulo }, rangemode: 'tozero' });
  fig.layout = layoutBase({
    uirevision: SIM_ID,
    legend: { orientation: 'h', y: -0.2, x: 0 },
    margin: { l: 56, r: 24, t: 56, b: 76 },
    xaxis: { ...eje('q (empresa)'), domain: [0, 0.44], anchor: 'y' },
    yaxis: { title: { text: 'Precio' }, range: [0, ytop], domain: [0, 1], anchor: 'x' },
    xaxis2: { ...layoutBase().xaxis, ...eje('Q (mercado)'), domain: [0.56, 1], anchor: 'y2' },
    yaxis2: { ...layoutBase().yaxis, range: [0, (Ad / Bd) * 1.02], domain: [0, 1], anchor: 'x2' },
    annotations: [
      { text: 'Una empresa', x: 0.22, y: 1, xref: 'paper', yref: 'paper', xanchor: 'center', yanchor: 'bottom', showarrow: false, font: { size: 16 } },
      { text: `Mercado (${n} empresas)`, x: 0.78, y: 1, xref: 'paper', yref: 'paper', xanchor: 'center', yanchor: 'bottom', showarrow: false, font: { size: 16 } },
    ],
  });

  const [textoZona, tipo] = ZONAS[of.zona];
  let largoB: Bloque;
  try {
    const le = nLibreEntrada(Ad, Bd, k);
    largoB = tabla([['Precio = mín CMe', le.p], ['q por empresa', le.q_empresa], ['Número de empresas', le.n]]);
  } catch (e) {
    if (!(e instanceof ErrorParametro)) throw e;
    largoB = aviso(e.message);
  }
  const panel = [
    resultados([
      lectura('Equilibrio de corto plazo', tabla([
        ['Precio p*', p], ['Cantidad de mercado Q*', eq.Q], ['q por empresa', q],
        ['Beneficio por empresa', eq.beneficio_empresa],
        ['Precio de cierre (mín CVMe)', k.precio_cierre()], ['Precio de nivelación (mín CMe)', k.precio_nivelacion()],
      ])),
      lectura(
        'Situación de la empresa',
        aviso(textoZona, tipo),
        texto('La empresa es precio-aceptante: produce donde p = CMg, en el tramo creciente del CMg por encima del mínimo del CVMe.'),
      ),
      lectura(
        'Largo plazo con libre entrada',
        largoB,
        texto('El número de empresas casi nunca es entero (el “problema del número entero” que discute Monsalve).', 'pequeno texto-suave'),
        referencia('secciones 7.6–7.7 y semana 8.'),
      ),
    ]),
  ];
  return { fig, panel };
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 540,
  grupos: [
    {
      titulo: 'Costos de cada empresa: CF + aq − bq² + cq³',
      controles: [
        { id: 'CF', etiqueta: 'Costo fijo CF', tipo: 'slider', min: 0, max: 100, paso: 1 },
        { id: 'a', etiqueta: 'a', tipo: 'slider', min: 1, max: 30, paso: 0.5 },
        { id: 'b', etiqueta: 'b', tipo: 'slider', min: 0, max: 5, paso: 0.1 },
        { id: 'c', etiqueta: 'c', tipo: 'slider', min: 0.05, max: 2, paso: 0.05 },
      ],
    },
    {
      titulo: 'Mercado',
      controles: [
        { id: 'n', etiqueta: 'Número de empresas n', tipo: 'slider', min: 1, max: 100, paso: 1 },
        { id: 'Ad', etiqueta: 'Demanda: intercepto (Q = A − B·p)', tipo: 'slider', min: 50, max: 1000, paso: 10 },
        { id: 'Bd', etiqueta: 'Demanda: pendiente B', tipo: 'slider', min: 1, max: 50, paso: 1 },
      ],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
