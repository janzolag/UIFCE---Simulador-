/* eslint-disable @typescript-eslint/no-explicit-any */
import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { linspace } from '../../core/numerico';
import {
  AZUL, MORADO, ROJO, SUAVE, VERDE, aviso, figura, figuraVacia, lectura, punto, referencia, resultados, tabla, texto,
} from '../../core/tema';
import { monopolioLineal, precioRamsey } from '../modelos/monopolio';

const SIM_ID = 'monopolio';
const DEF = { a: 12, b: 1, c: 0, d: 1, CF: 0 }; // ejemplo 1 de la semana 10
type P = typeof DEF;

export function calcular({ a, b, c, d, CF }: P): Simulacion {
  let r;
  try {
    r = monopolioLineal(a, b, c, d, CF);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const ymax = a / b;
  const y = linspace(ymax / 400, ymax, 400);
  const fig = figura('Cantidad y', 'Precio p', SIM_ID, { xaxis: { range: [0, ymax] }, yaxis: { range: [0, a * 1.05] } });
  const { y_m: ym, p_m: pm, y_c: yc, p_c: pc } = r;
  const cm = (v: number) => c + 2 * d * v;

  // Áreas de bienestar
  fig.data.push({
    type: 'scatter', x: [0, ym, 0], y: [a, pm, pm], fill: 'toself', fillcolor: 'rgba(91,155,255,.22)',
    line: { width: 0 }, name: 'Excedente del consumidor', hoverinfo: 'skip',
  });
  const xsPei = linspace(ym, yc, 60);
  fig.data.push({
    type: 'scatter',
    x: [...xsPei, ...[...xsPei].reverse()],
    y: [...xsPei.map((v) => a - b * v), ...[...xsPei].reverse().map(cm)],
    fill: 'toself', fillcolor: 'rgba(255,122,133,.35)', line: { width: 0 }, name: 'Pérdida irrecuperable', hoverinfo: 'skip',
  });
  fig.data.push({ type: 'scatter', x: y, y: y.map((v) => a - b * v), mode: 'lines', name: 'Demanda (ingreso medio)', line: { color: AZUL, width: 3 } });
  const yImg = y.filter((v) => v <= a / (2 * b));
  fig.data.push({ type: 'scatter', x: yImg, y: yImg.map((v) => a - 2 * b * v), mode: 'lines', name: 'Ingreso marginal', line: { color: MORADO, width: 2.5, dash: 'dash' } });
  fig.data.push({ type: 'scatter', x: y, y: y.map(cm), mode: 'lines', name: 'Costo marginal', line: { color: ROJO, width: 3 } });
  if (CF > 0 || d > 0) {
    const cme = y.map((v) => CF / v + c + d * v);
    fig.data.push({
      type: 'scatter', x: y, y: cme.map((v) => (v <= a * 1.5 ? v : null)), mode: 'lines', name: 'Costo medio',
      line: { color: VERDE, width: 2, dash: 'dot' },
    });
  }
  fig.data.push({
    type: 'scatter', x: [ym, ym, 0], y: [r.IMg_m, pm, pm], mode: 'lines', showlegend: false,
    line: { color: SUAVE, dash: 'dot', width: 1.2 }, hoverinfo: 'skip',
  });
  punto(fig, ym, pm, 'Monopolio', undefined, undefined, 'monopolio');
  punto(fig, yc, pc, 'Competencia (p = CMg)', VERDE, undefined, 'competencia');

  const ram = precioRamsey(a, b, c, d, CF);
  let reg: Bloque[];
  if (ram.existe && c + 2 * d * ram.y < ram.p) {
    // Monopolio natural (CMe > CMg): el precio competitivo daría pérdidas; se regula con p = CMe.
    reg = [
      tabla([['Precio regulado (p = CMe)', ram.p], ['Cantidad regulada', ram.y]]),
      texto('Hay economías de escala (CMe > CMg): con p = CMg la empresa tendría pérdidas, por eso se regula con el costo medio.', 'pequeno texto-suave'),
    ];
  } else if (ram.existe) {
    reg = [
      tabla([['Precio regulado (p = CMg)', pc], ['Cantidad regulada', yc]]),
      texto('Sin economías de escala el regulador puede fijar el precio competitivo p = CMg y la empresa no tiene pérdidas.', 'pequeno texto-suave'),
    ];
  } else {
    reg = [aviso(ram.motivo + ' Un precio de beneficio cero exigiría subsidio.')];
  }

  const panel = [
    resultados([
      lectura(
        'Monopolio frente a competencia',
        tabla(
          [
            ['Cantidad', ym, yc], ['Precio', pm, pc], ['Beneficio', r.beneficio_m, r.beneficio_c],
            ['Excedente del consumidor', r.EC_m, r.EC_c], ['Excedente del productor', r.EP_m, r.EP_c],
          ],
          ['', 'Monopolio', 'Competencia'],
        ),
      ),
      lectura(
        'Poder de mercado',
        tabla([
          ['Pérdida irrecuperable', r.perdida_eficiencia], ['Elasticidad en el óptimo', r.elasticidad_m],
          ['Índice de Lerner (p − CMg)/p', r.lerner], ['−1/ε (debe coincidir)', r.inverso_elasticidad],
        ]),
        texto(
          r.beneficio_m >= 0
            ? 'El monopolista siempre opera en el tramo elástico de la demanda (|ε| ≥ 1).'
            : 'Con estos costos fijos el monopolista tiene pérdidas: no operaría en el largo plazo.',
          'destacado',
        ),
      ),
      lectura('Regulación', ...reg, referencia('ejemplos 1 y 2 de la semana 10 (C = y², y = 12 − p); secciones 10.4–10.5.')),
    ]),
  ];
  return { fig, panel };
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 540,
  grupos: [
    {
      titulo: 'Demanda: p = a − b·y',
      controles: [
        { id: 'a', etiqueta: 'Precio máximo a', tipo: 'slider', min: 2, max: 50, paso: 0.5 },
        { id: 'b', etiqueta: 'Pendiente b', tipo: 'slider', min: 0.1, max: 5, paso: 0.1 },
      ],
    },
    {
      titulo: 'Costos: C = CF + c·y + d·y²',
      controles: [
        { id: 'c', etiqueta: 'c', tipo: 'slider', min: 0, max: 20, paso: 0.5 },
        { id: 'd', etiqueta: 'd', tipo: 'slider', min: 0, max: 3, paso: 0.1 },
        { id: 'CF', etiqueta: 'Costo fijo CF', tipo: 'slider', min: 0, max: 60, paso: 1 },
      ],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
