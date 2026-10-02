import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import { ACENTO, AZUL, DORADO, aviso, figura, figuraVacia, lectura, punto, referencia, resultados, tabla, texto } from '../../core/tema';
import { Cuasilineal, Eleccion, Utilidad } from '../modelos/consumidor';
import { FAMILIAS, crearUtilidad, curva } from './_comun';

const SIM_ID = 'eleccion-optima';
const DEF = { familia: 'cd', a: 1, b: 1, p1: 3, p2: 2, M: 45 };
type P = typeof DEF;

const TIPOS: Record<string, string> = {
  interior: 'Solución interior (tangencia)',
  vertice: 'Vértice de la escuadra (Leontief)',
  esquina_x: 'Esquina: sólo compra x',
  esquina_y: 'Esquina: sólo compra y',
  indeterminado: 'Indeterminada: cualquier punto de la recta es óptimo',
};

export function calcular({ familia, a, b, p1, p2, M }: P): Simulacion {
  let u: Utilidad;
  let r: Eleccion;
  try {
    u = crearUtilidad(familia, a, b);
    r = u.eleccionOptima(p1, p2, M);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const X = M / p1;
  const Y = M / p2;
  const limX = Math.max(X, r.x) * 1.15 || 1;
  const limY = Math.max(Y, r.y) * 1.15 || 1;
  const fig = figura('Bien x', 'Bien y', SIM_ID, { xaxis: { range: [0, limX] }, yaxis: { range: [0, limY] } });
  fig.data.push({
    type: 'scatter', x: [0, X, 0], y: [0, 0, Y], fill: 'toself', fillcolor: 'rgba(91,155,255,.12)',
    line: { width: 0 }, hoverinfo: 'skip', showlegend: false,
  });
  fig.data.push({ type: 'scatter', x: [0, X], y: [Y, 0], mode: 'lines', name: 'Recta presupuestal', line: { width: 3, color: AZUL } });
  if (r.tipo === 'indeterminado') {
    fig.data.push({
      type: 'scatter', x: [0, X], y: [Y, 0], mode: 'lines', name: 'Todas las canastas son óptimas',
      line: { width: 8, color: ACENTO }, opacity: 0.6,
    });
  }
  const U = r.utilidad;
  if (U && Number.isFinite(U) && U > 0) {
    const [cx, cy0] = curva(u, U, linspace(1e-3, limX, 500));
    const cy = cy0.map((c) => (c === null || c <= limY * 1.3 ? c : null));
    fig.data.push({ type: 'scatter', x: cx, y: cy, mode: 'lines', name: 'Curva de indiferencia óptima', line: { width: 3, color: DORADO } });
  }
  punto(fig, r.x, r.y, 'Canasta óptima', undefined, undefined, `(${fmt(r.x, 2)}, ${fmt(r.y, 2)})`);

  const filas: (string | number | null)[][] = [
    ['x*', r.x], ['y*', r.y], ['Utilidad máxima', U], ['Gasto p1·x* + p2·y*', r.gasto], ['Precio relativo p1/p2', r.precio_relativo],
  ];
  if (r.tms !== null) filas.push(['TMS en el óptimo', r.tms]);
  const extra: Bloque[] = [];
  if (r.nota) extra.push(aviso(r.nota));
  if (u instanceof Cuasilineal) extra.push(texto(`Con estos precios, la solución es interior si M ≥ ${fmt(u.ingresoMinimoInterior(p1, p2))}.`));
  const panel = [
    resultados([
      lectura('Canasta óptima', tabla(filas)),
      lectura(
        'Tipo de solución',
        texto(TIPOS[r.tipo] ?? r.tipo, 'destacado'),
        texto('En una solución interior se cumple la ecuación de Jevons: TMS = p1/p2 (valor subjetivo = valor de mercado).'),
        ...extra,
      ),
      lectura(
        'Para probar en clase',
        texto(
          'Multiplique p1, p2 y M por el mismo número: la canasta no cambia (no hay ilusión monetaria). ' +
            'Con sustitutos perfectos, iguale p1/a y p2/b.',
        ),
        referencia('ejemplos 3–7 de la semana 1; ejemplos 4–6 de la semana 2.'),
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
        { id: 'p2', etiqueta: 'Precio de y (p2)', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'M', etiqueta: 'Ingreso (M)', tipo: 'slider', min: 0, max: 100, paso: 1 },
      ],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
