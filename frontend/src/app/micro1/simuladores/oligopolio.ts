import { Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { linspace } from '../../core/numerico';
import {
  AZUL, MORADO, NARANJA, ROJO, VERDE, aviso, figura, figuraVacia, lectura, punto, referencia, resultados, tabla, texto,
} from '../../core/tema';
import { cartel, competitivo, cournot, reaccion, stackelberg } from '../modelos/oligopolio';

const SIM_ID = 'oligopolio';
const DEF = { a: 20, c: 2, n: 3 };
type P = typeof DEF;

export function calcular({ a, c, n }: P): Simulacion {
  let co, st, ka, cn, comp;
  n = Math.trunc(n);
  try {
    co = cournot(a, c, 2);
    st = stackelberg(a, c);
    ka = cartel(a, c, 2);
    cn = cournot(a, c, n);
    comp = competitivo(a, c);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const m = a - c;
  const fig = figura('Producción de la empresa 1 (y1)', 'Producción de la empresa 2 (y2)', SIM_ID, {
    xaxis: { range: [0, m * 1.05] }, yaxis: { range: [0, m * 1.05] },
  });
  const ys = linspace(0, m, 100);
  fig.data.push({ type: 'scatter', x: ys.map((v) => reaccion(a, c, v)), y: ys, mode: 'lines', name: 'Reacción de la empresa 1', line: { color: AZUL, width: 3 } });
  fig.data.push({ type: 'scatter', x: ys, y: ys.map((v) => reaccion(a, c, v)), mode: 'lines', name: 'Reacción de la empresa 2', line: { color: ROJO, width: 3 } });
  fig.data.push({ type: 'scatter', x: [0, m], y: [m, 0], mode: 'lines', name: 'Producción competitiva (p = c)', line: { color: VERDE, dash: 'dot', width: 2 } });
  fig.data.push({ type: 'scatter', x: [0, m / 2], y: [m / 2, 0], mode: 'lines', name: 'Producción de cartel', line: { color: MORADO, dash: 'dash', width: 2 } });
  punto(fig, co.y_i, co.y_i, 'Cournot', undefined, undefined, 'Cournot');
  punto(fig, st.y1, st.y2, 'Stackelberg (1 líder)', NARANJA, undefined, 'Stackelberg');
  punto(fig, ka.y_i, ka.y_i, 'Cartel', MORADO, undefined, 'cartel');
  punto(fig, m / 2, m / 2, 'Bertrand (p = c)', VERDE, undefined, 'Bertrand');

  const filas = [
    ['Cartel (monopolio)', ka.p, ka.Y, ka.beneficio_i, ka.beneficio_i],
    ['Cournot, 2 empresas', co.p, co.Y, co.beneficio_i, co.beneficio_i],
    ['Stackelberg', st.p, st.Y, st.beneficio1, st.beneficio2],
    ['Bertrand / competencia', comp.p, comp.Y, 0, 0],
  ];
  const panel = [
    resultados([
      lectura(
        'Comparación de duopolios (p = a − Y, costo marginal c)',
        tabla(filas, ['Estructura', 'Precio', 'Cantidad total', 'Π empresa 1', 'Π empresa 2']),
      ),
      lectura(
        `Cournot con n = ${n} empresas`,
        tabla([
          ['Precio (a + nc)/(n + 1)', cn.p], ['Producción por empresa', cn.y_i], ['Producción total', cn.Y],
          ['Beneficio por empresa', cn.beneficio_i], ['HHI (escala 0–10 000)', cn.hhi * 10000], ['Índice de Lerner', cn.lerner],
        ]),
        texto('Al aumentar n el precio converge al costo marginal: Cournot se acerca a la competencia perfecta.', 'pequeno texto-suave'),
      ),
      lectura(
        'Lectura económica',
        texto(
          'Cartel > Cournot > Stackelberg > Bertrand en precio. El cartel no es estable: ' +
            'dada la producción de la otra, cada empresa querría moverse a su curva de reacción.',
        ),
        referencia('tabla 11.3 y figuras 11.4–11.5; paradoja de Bertrand (sección 11.3.3).'),
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
      titulo: 'Mercado: p = a − Y',
      controles: [
        { id: 'a', etiqueta: 'Precio máximo a', tipo: 'slider', min: 5, max: 100, paso: 1 },
        { id: 'c', etiqueta: 'Costo marginal c', tipo: 'slider', min: 0, max: 50, paso: 0.5 },
      ],
    },
    {
      titulo: 'Oligopolio de Cournot',
      controles: [{ id: 'n', etiqueta: 'Número de empresas n', tipo: 'slider', min: 1, max: 50, paso: 1 }],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
