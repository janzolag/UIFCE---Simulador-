import { Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import {
  AZUL, ROJO, VERDE, aviso, figuraVacia, layoutBase, lectura, punto, referencia, resultados, tabla, texto,
} from '../../core/tema';
import { Utilidad } from '../modelos/consumidor';
import { agregacionEngel, clasificarElasticidad, elasticidades, variaciones } from '../modelos/demanda';
import { FAMILIAS, crearUtilidad } from './_comun';

const SIM_ID = 'demanda';
const DEF = { familia: 'cd', a: 1, b: 1, p2: 2, M: 45, p1: 3, p1n: 4 };
type P = typeof DEF;

const TIPOS: Record<string, string> = {
  lujo: 'de lujo (ε_M > 1)', necesario: 'necesario (0 < ε_M < 1)', inferior: 'inferior (ε_M < 0)', giffen: 'Giffen',
  ingreso_unitario: 'normal con elasticidad-ingreso unitaria (ε_M = 1)', neutro_al_ingreso: 'neutro al ingreso (ε_M = 0)',
  indefinido: 'sin definir',
};
const REL: Record<string, string> = {
  sustitutos_brutos: 'sustitutos brutos', complementarios_brutos: 'complementarios brutos',
  independientes: 'independientes (∂x/∂p2 = 0)',
};

const SEGUNDO = { xaxis: 'x2', yaxis: 'y2' };

/** marshall(...).x o null si el modelo no está definido en ese punto. */
function xDe(u: Utilidad, p1: number, p2: number, M: number): number | null {
  try {
    return u.marshall(p1, p2, M).x;
  } catch (e) {
    if (e instanceof ErrorParametro) return null;
    throw e;
  }
}

export function calcular({ familia, a, b, p2, M, p1, p1n }: P): Simulacion {
  let u: Utilidad;
  let el;
  let vari;
  let x1: number;
  try {
    u = crearUtilidad(familia, a, b);
    el = elasticidades(u, p1, p2, M);
    vari = variaciones(u, p1, p2, M, p1n);
    x1 = u.marshall(p1n, p2, M).x;
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const data: any[] = [];
  const fig = { data, layout: {} as any };
  const pmax = Math.max(p1, p1n) * 2.2;
  const ps = linspace(Math.max(pmax / 400, 0.05), pmax, 300);
  const xs = ps.map((p) => xDe(u, p, p2, M));
  data.push({ type: 'scatter', x: xs, y: ps, mode: 'lines', name: 'x(p1)', line: { color: AZUL, width: 3 } });
  const [lo, hi] = p1 <= p1n ? [p1, p1n] : [p1n, p1];
  let band = ps.filter((p) => lo <= p && p <= hi);
  if (band.length === 0) band = [lo, hi];
  const bx = band.map((p) => u.marshall(p, p2, M).x);
  data.push({
    type: 'scatter', x: [0, ...bx, 0], y: [band[0], ...band, band[band.length - 1]], fill: 'toself',
    fillcolor: 'rgba(245,196,81,.22)', line: { width: 0 }, name: 'Cambio en el excedente', hoverinfo: 'skip',
  });
  punto(fig, el.x, p1, 'Punto inicial');
  punto(fig, x1, p1n, 'Punto con p1\'', ROJO);
  const Ms = linspace(0, M * 2, 200);
  const ex = Ms.map((m) => xDe(u, p1, p2, m));
  data.push({ type: 'scatter', x: ex, y: Ms, mode: 'lines', name: 'Engel x(M)', line: { color: VERDE, width: 3 }, ...SEGUNDO });
  punto(fig, el.x, M, 'Ingreso actual', undefined, undefined, undefined, { ...SEGUNDO, showlegend: false });

  const xref = Math.max(el.x, x1, 1e-9);
  const eje = (titulo: string, extra: any = {}) => ({ title: { text: titulo }, rangemode: 'tozero', ...extra });
  const base = layoutBase();
  fig.layout = layoutBase({
    uirevision: SIM_ID,
    legend: { orientation: 'h', y: -0.18, x: 0 },
    margin: { l: 56, r: 24, t: 56, b: 70 },
    xaxis: { ...eje('Cantidad de x', { range: [0, xref * 3] }), domain: [0, 0.44], anchor: 'y' }, // la cola no aplasta el gráfico
    yaxis: { ...eje('Precio p1'), domain: [0, 1], anchor: 'x' },
    xaxis2: { ...base.xaxis, ...eje('Cantidad de x'), domain: [0.56, 1], anchor: 'y2' },
    yaxis2: { ...base.yaxis, ...eje('Ingreso M'), domain: [0, 1], anchor: 'x2' },
    annotations: [
      { text: 'Curva de demanda de x', x: 0.22, y: 1, xref: 'paper', yref: 'paper', xanchor: 'center', yanchor: 'bottom', showarrow: false, font: { size: 16 } },
      { text: 'Curva de Engel de x', x: 0.78, y: 1, xref: 'paper', yref: 'paper', xanchor: 'center', yanchor: 'bottom', showarrow: false, font: { size: 16 } },
    ],
  });

  const panel = [
    resultados([
      lectura('Elasticidades en el punto inicial', tabla([
        ['Precio propia ε(x, p1)', el.e_x_p1], ['Cruzada ε(x, p2)', el.e_x_p2], ['Ingreso ε(x, M)', el.e_x_M],
        ['Clasificación', clasificarElasticidad(el.e_x_p1).replaceAll('_', ' ')],
      ])),
      lectura(
        'Tipo de bien',
        texto(`x es un bien ${TIPOS[el.tipo_x] ?? el.tipo_x}; x e y son ${REL[el.relacion_bruta_x_con_y]}.`, 'destacado'),
        texto(`Agregación de Engel s1·ε1 + s2·ε2 = ${fmt(agregacionEngel(el), 4)} (siempre 1).`),
      ),
      lectura(
        `Bienestar si p1 pasa de ${fmt(p1)} a ${fmt(p1n)}`,
        tabla([
          ['Variación compensada (VC)', vari.VC], ['Pérdida de excedente (ΔEC)', vari.perdida_EC], ['Variación equivalente (VE)', vari.VE],
        ]),
        texto('Con un bien normal y un alza de precio: VE ≤ ΔEC ≤ VC. Con cuasilineal las tres coinciden.', 'pequeno texto-suave'),
        referencia('semana 3 (elasticidades) y sección 4.8 (excedente).'),
      ),
    ]),
  ];
  return { fig, panel };
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 540,
  grupos: [
    { controles: [{ id: 'familia', etiqueta: 'Tipo de preferencias', tipo: 'selector', opciones: FAMILIAS }] },
    {
      titulo: 'Preferencias',
      controles: [
        { id: 'a', etiqueta: 'α (o a)', tipo: 'slider', min: 0.1, max: 3, paso: 0.1 },
        { id: 'b', etiqueta: 'β (o b)', tipo: 'slider', min: 0.1, max: 3, paso: 0.1 },
      ],
    },
    {
      titulo: 'Mercado',
      controles: [
        { id: 'p1', etiqueta: 'Precio de x (p1)', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'p1n', etiqueta: 'Nuevo p1 (bienestar)', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'p2', etiqueta: 'Precio de y (p2)', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'M', etiqueta: 'Ingreso (M)', tipo: 'slider', min: 1, max: 100, paso: 1 },
      ],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
