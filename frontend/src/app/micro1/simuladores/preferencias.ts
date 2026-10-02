import { Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import { AZUL, DORADO, VERDE, aviso, figura, figuraVacia, lectura, punto, referencia, resultados, tabla, texto } from '../../core/tema';
import { Utilidad } from '../modelos/consumidor';
import { FAMILIAS, LIM, crearUtilidad, curva } from './_comun';

const SIM_ID = 'preferencias';
const DEF = { familia: 'cd', a: 1, b: 1, x0: 4, y0: 5 };
type P = typeof DEF;

const TEXTOS: Record<string, string> = {
  cd: 'Curvas hiperbólicas: la TMS cae a medida que se tiene más x (convexidad). α y β son las elasticidades de la utilidad.',
  leontief: 'Escuadras: los bienes se consumen en proporción fija (by = ax). Más de un solo bien no aumenta la utilidad; la TMS no existe en el vértice.',
  lineal: 'Rectas: la TMS es constante (a/b). El consumidor cambia un bien por el otro siempre en la misma proporción.',
  cuasi: 'Curvas desplazadas verticalmente: la TMS sólo depende de x, por eso la demanda de x no depende del ingreso.',
  separable: 'Como Cobb-Douglas, pero las curvas tocan los ejes: es posible no consumir uno de los bienes.',
  stone: 'Cobb-Douglas desplazada: exige un consumo mínimo de 1 unidad de cada bien (niveles de subsistencia).',
};

export function calcular({ familia, a, b, x0, y0 }: P): Simulacion {
  let u: Utilidad;
  try {
    u = crearUtilidad(familia, a, b);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const fig = figura('Bien x', 'Bien y', SIM_ID, { xaxis: { range: [0, LIM] }, yaxis: { range: [0, LIM] } });
  const xs = linspace(1e-3, LIM, 400);
  const base = familia !== 'stone' ? [2, 4, 6, 8] : [2.5, 4, 6, 8];
  const U0p = u.U(x0, y0);
  base.forEach((k, i) => {
    const U0 = u.U(k, k);
    const [cx, cy] = curva(u, U0, xs);
    fig.data.push({
      type: 'scatter', x: cx, y: cy, mode: 'lines', name: `U = ${fmt(U0, 2)}`,
      line: { width: 2, color: AZUL }, opacity: 0.35 + 0.15 * i, connectgaps: false, hoverinfo: 'skip',
      showlegend: i === 0 || i === 3,
    });
  });
  const [cx, cy] = curva(u, U0p, xs);
  fig.data.push({ type: 'scatter', x: cx, y: cy, mode: 'lines', name: 'Curva que pasa por la canasta', line: { width: 3, color: DORADO } });
  const tms = u.tms(x0, y0);
  if (tms !== null && Number.isFinite(tms) && tms < 1e3) {
    const dx = 1.2;
    fig.data.push({
      type: 'scatter', x: [x0 - dx, x0 + dx], y: [y0 + tms * dx, y0 - tms * dx], mode: 'lines',
      name: 'Pendiente = −TMS', line: { color: VERDE, dash: 'dot', width: 2 },
    });
  }
  punto(fig, x0, y0, 'Canasta (x0, y0)');

  const prop = u.propiedades;
  const si = (v: boolean | undefined) => (v ? 'Sí' : 'No');
  const panel = [
    resultados([
      lectura('En la canasta elegida', tabla([
        ['Utilidad U(x0, y0)', U0p],
        ['TMS = UMg_x / UMg_y', tms !== null ? tms : 'no definida (vértice)'],
        ['Interpretación', tms && Number.isFinite(tms) ? `cede ${fmt(tms)} de y por 1 de x` : '—'],
      ])),
      lectura('Propiedades de estas preferencias', tabla([
        ['Monótona estricta', si(prop.monotona)], ['Convexa (dieta balanceada)', si(prop.convexa)],
        ['Homotética', si(prop.homotetica)], ['Diferenciable', si(prop.diferenciable)],
      ])),
      lectura('Lectura económica', texto(TEXTOS[familia]), referencia('ejemplos 1 y 2 de la semana 1; sección 3.6 (homotéticas).')),
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
      titulo: 'Parámetros',
      controles: [
        { id: 'a', etiqueta: 'α (o a)', tipo: 'slider', min: 0.1, max: 3, paso: 0.1 },
        { id: 'b', etiqueta: 'β (o b)', tipo: 'slider', min: 0.1, max: 3, paso: 0.1 },
      ],
    },
    {
      titulo: 'Canasta para medir la TMS',
      controles: [
        { id: 'x0', etiqueta: 'x0', tipo: 'slider', min: 0.2, max: 9.5, paso: 0.1 },
        { id: 'y0', etiqueta: 'y0', tipo: 'slider', min: 0.2, max: 9.5, paso: 0.1 },
      ],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
