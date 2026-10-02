import { Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { g } from '../../core/formato';
import { AZUL, DORADO, aviso, figura, figuraVacia, lectura, referencia, resultados, tabla, texto } from '../../core/tema';
import { TipoCambio, cambio } from '../modelos/presupuesto';

const SIM_ID = 'restriccion-presupuestal';
const DEF = { p1: 3, p2: 2, M: 45, p1n: 3.6, p2n: 2, Mn: 45 };
type P = typeof DEF;

const NOMBRES: Record<TipoCambio, string> = {
  sin_cambio: 'Sin cambio',
  desplazamiento_paralelo: 'Desplazamiento paralelo (cambió M o todos los precios en igual proporción)',
  rotacion_sobre_eje_y: 'Rotación sobre el intercepto en y (cambió p1)',
  rotacion_sobre_eje_x: 'Rotación sobre el intercepto en x (cambió p2)',
  cambio_combinado: 'Cambio combinado (las rectas se cruzan)',
};

export function calcular({ p1, p2, M, p1n, p2n, Mn }: P): Simulacion {
  let c;
  try {
    c = cambio(p1, p2, M, p1n, p2n, Mn);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const { antes: a, despues: d } = c;
  const xmax = Math.max(a.intercepto_x, d.intercepto_x) * 1.1 || 1;
  const ymax = Math.max(a.intercepto_y, d.intercepto_y) * 1.1 || 1;
  const fig = figura('Bien x', 'Bien y', SIM_ID, { xaxis: { range: [0, xmax] }, yaxis: { range: [0, ymax] } });
  fig.data.push({
    type: 'scatter', x: [0, a.intercepto_x, 0], y: [0, 0, a.intercepto_y], fill: 'toself',
    fillcolor: 'rgba(91,155,255,.18)', line: { width: 0 }, name: 'Conjunto presupuestal', hoverinfo: 'skip',
  });
  fig.data.push({
    type: 'scatter', x: [0, a.intercepto_x], y: [a.intercepto_y, 0], mode: 'lines',
    name: `Inicial: ${g(p1)}x + ${g(p2)}y = ${g(M)}`, line: { width: 3, color: AZUL },
  });
  if (c.tipo !== 'sin_cambio') {
    fig.data.push({
      type: 'scatter', x: [0, d.intercepto_x], y: [d.intercepto_y, 0], mode: 'lines',
      name: `Nueva: ${g(p1n)}x + ${g(p2n)}y = ${g(Mn)}`, line: { width: 3, color: DORADO, dash: 'dash' },
    });
  }
  const panel = [
    resultados([
      lectura('Recta inicial', tabla([
        ['Intercepto en x (M/p1)', a.intercepto_x], ['Intercepto en y (M/p2)', a.intercepto_y],
        ['Pendiente (−p1/p2)', a.pendiente], ['Área del conjunto', a.area_conjunto],
      ])),
      lectura('Después del cambio', tabla([
        ['Intercepto en x', d.intercepto_x], ['Intercepto en y', d.intercepto_y],
        ['Pendiente', d.pendiente], ['Canastas ganadas (área)', c.area_ganada], ['Canastas perdidas (área)', c.area_perdida],
      ])),
      lectura(
        'Lectura económica',
        texto(NOMBRES[c.tipo]),
        texto(
          'La pendiente es el costo de oportunidad de x medido en unidades de y. ' +
            'Multiplicar precios e ingreso por el mismo número no mueve la recta (no hay ilusión monetaria).',
        ),
        referencia('sección 1.4, figuras 1.10–1.14.'),
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
      titulo: 'Situación inicial',
      controles: [
        { id: 'p1', etiqueta: 'Precio de x (p1)', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'p2', etiqueta: 'Precio de y (p2)', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'M', etiqueta: 'Ingreso (M)', tipo: 'slider', min: 0, max: 100, paso: 1 },
      ],
    },
    {
      titulo: 'Cambio a comparar',
      controles: [
        { id: 'p1n', etiqueta: 'Nuevo p1', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'p2n', etiqueta: 'Nuevo p2', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'Mn', etiqueta: 'Nuevo M', tipo: 'slider', min: 0, max: 100, paso: 1 },
      ],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
