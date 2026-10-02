import { Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { linspace } from '../../core/numerico';
import {
  AZUL, DORADO, ROJO, VERDE, aviso, figura, figuraVacia, lectura, punto, referencia, resultados, tabla, texto,
} from '../../core/tema';
import { Giffen, Utilidad } from '../modelos/consumidor';
import { Metodo, descomposicion } from '../modelos/slutsky';
import { crearUtilidad, curva } from './_comun';

const SIM_ID = 'slutsky';
const DEF = { familia: 'cd', metodo: 'hicks', a: 2, b: 1, p1: 3, p2: 2, M: 45, p1n: 3.6 };
const DEF_GIFFEN = { p1: 2, p2: 1, M: 3.5, p1n: 2.2 };
type P = typeof DEF;

const METODOS: Record<string, string> = { hicks: 'Hicks (misma utilidad)', slutsky: 'Slutsky (mismo poder de compra)' };
const CLASIF: Record<string, string> = {
  normal: 'Bien normal: ingreso y sustitución van en la misma dirección.',
  inferior: 'Bien inferior: el efecto ingreso compensa en parte al de sustitución.',
  giffen: 'Bien Giffen: el efecto ingreso supera al de sustitución y la demanda sube con su precio.',
  efecto_ingreso_nulo: 'Sin efecto ingreso sobre x (cuasilineal): todo el cambio es sustitución.',
  sin_cambio: 'El precio no cambió.',
};

const utilidad = (familia: string, a: number, b: number): Utilidad => (familia === 'giffen' ? new Giffen() : crearUtilidad(familia, a, b));

export function calcular({ familia, metodo, a, b, p1, p2, M, p1n }: P): Simulacion {
  let u: Utilidad;
  let d;
  try {
    u = utilidad(familia, a, b);
    d = descomposicion(u, p1, p2, M, p1n, metodo as Metodo);
  } catch (e) {
    if (!(e instanceof ErrorParametro)) throw e;
    let msg = e.message;
    if (familia === 'giffen') msg += " Pruebe p1 = 2, p2 = 1, M = 3.5 y p1' = 2.2.";
    return { fig: figuraVacia(msg), panel: [aviso(msg, 'error')] };
  }
  const { A, B, C } = d;
  const lx = Math.max(M / Math.min(p1, p1n), d.M_compensado / p1n, A.x, B.x, C.x) * 1.1;
  const ly = Math.max(M / p2, d.M_compensado / p2, A.y, B.y, C.y) * 1.1;
  const x0 = familia === 'giffen' ? 1 : 0;
  const fig = figura('Bien x', 'Bien y', SIM_ID, { xaxis: { range: [x0, lx] }, yaxis: { range: [0, ly] } });
  const rectas: [number, number, string, string, string][] = [
    [p1, M, 'Recta inicial', 'solid', AZUL],
    [p1n, M, 'Recta con el nuevo p1', 'dash', ROJO],
    [p1n, d.M_compensado, `Recta compensada (${METODOS[metodo].split(' ')[0]})`, 'dot', VERDE],
  ];
  for (const [pp, mm, nom, estilo, col] of rectas)
    fig.data.push({ type: 'scatter', x: [0, mm / pp], y: [mm / p2, 0], mode: 'lines', name: nom, line: { color: col, dash: estilo, width: 2.5 } });
  const xs = linspace(Math.max(x0, 1e-3) + 1e-6, lx, 500);
  const niveles: [number, string, number][] = [[d.U0, 'U inicial', 1], [u.U(C.x, C.y), 'U final', 0.55]];
  for (const [UU, nom, op] of niveles) {
    if (Number.isFinite(UU)) {
      const [cx, cy0] = curva(u, UU, xs);
      const cy = cy0.map((c) => (c === null || c <= ly * 1.3 ? c : null));
      fig.data.push({ type: 'scatter', x: cx, y: cy, mode: 'lines', name: nom, opacity: op, line: { color: DORADO, width: 2 }, hoverinfo: 'skip' });
    }
  }
  punto(fig, A.x, A.y, 'A inicial', AZUL, undefined, 'A');
  punto(fig, B.x, B.y, 'B compensada', VERDE, undefined, 'B');
  punto(fig, C.x, C.y, 'C final', ROJO, undefined, 'C');

  const { efecto_sustitucion: es, efecto_ingreso: ei, efecto_total: et } = d;
  const panel = [
    resultados([
      lectura('Descomposición', tabla(
        [['Sustitución (A → B)', es[0], es[1]], ['Ingreso (B → C)', ei[0], ei[1]], ['Total (A → C)', et[0], et[1]]],
        ['Efecto', 'Δx', 'Δy'],
      )),
      lectura('Compensación', tabla([
        ['Ingreso original M', M], ['Ingreso compensado', d.M_compensado],
        ['Compensación necesaria', d.compensacion], ['Utilidad inicial U0', d.U0],
      ])),
      lectura(
        'Lectura económica',
        texto(CLASIF[d.clasificacion_x] ?? '', 'destacado'),
        texto('Hicks mantiene la utilidad inicial; Slutsky devuelve el ingreso necesario para comprar la canasta A, por lo que el consumidor queda un poco mejor.'),
        referencia('ejemplo 1 de la semana 4 (x²y, 3x + 2y = 45, p1 sube 20 %); ejemplo 5 de la semana 3 (Giffen).'),
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
      controles: [
        {
          id: 'familia', etiqueta: 'Tipo de preferencias', tipo: 'selector',
          opciones: [
            { valor: 'cd', etiqueta: 'Cobb-Douglas' }, { valor: 'separable', etiqueta: 'Separable' },
            { valor: 'leontief', etiqueta: 'Complementarios (Leontief)' }, { valor: 'cuasi', etiqueta: 'Cuasilineal' },
            { valor: 'stone', etiqueta: 'Stone-Geary' }, { valor: 'giffen', etiqueta: 'Bien Giffen (ej. 3.5)' },
          ],
        },
        {
          id: 'metodo', etiqueta: 'Compensación', tipo: 'selector',
          opciones: [
            { valor: 'hicks', etiqueta: METODOS['hicks'] }, { valor: 'slutsky', etiqueta: METODOS['slutsky'] },
          ],
        },
      ],
    },
    {
      titulo: 'Preferencias',
      controles: [
        { id: 'a', etiqueta: 'α (o a)', tipo: 'slider', min: 0.1, max: 3, paso: 0.1 },
        { id: 'b', etiqueta: 'β (o b)', tipo: 'slider', min: 0.1, max: 3, paso: 0.1 },
      ],
    },
    {
      titulo: 'Precios e ingreso',
      controles: [
        { id: 'p1', etiqueta: 'p1 inicial', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'p1n', etiqueta: "p1 nuevo (p1')", tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'p2', etiqueta: 'p2', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'M', etiqueta: 'Ingreso (M)', tipo: 'slider', min: 0, max: 100, paso: 0.5 },
      ],
    },
  ],
  /** Al elegir el bien Giffen (o salir de él) los deslizadores saltan a su región válida. */
  alCambiar: (anterior, nuevo) => {
    if (anterior['familia'] === nuevo['familia']) return null;
    const fuente = nuevo['familia'] === 'giffen' ? DEF_GIFFEN : { p1: DEF.p1, p2: DEF.p2, M: DEF.M, p1n: DEF.p1n };
    return { ...fuente };
  },
  calcular: (p: Params) => calcular(p as unknown as P),
};
