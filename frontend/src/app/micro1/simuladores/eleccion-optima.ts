import { Bloque, Figura, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import { ACENTO, AZUL, DORADO, VERDE, aviso, figura, figuraVacia, lectura, punto, referencia, resultados, tabla, texto } from '../../core/tema';
import { Cuasilineal, Eleccion, Utilidad } from '../modelos/consumidor';
import { FAMILIAS, crearUtilidad, curva } from './_comun';

const SIM_ID = 'eleccion-optima';
const DEF = { familia: 'cd', a: 1, b: 1, p1: 3, p2: 2, M: 45, problema: 'primal' as string, k: 1.5 };
/** `problema` y `k` son opcionales: sin ellos la gráfica es la original (pruebas de paridad). */
type P = Omit<typeof DEF, 'problema' | 'k'> & { problema?: string; k?: number };

const TIPOS: Record<string, string> = {
  interior: 'Solución interior (tangencia)',
  vertice: 'Vértice de la escuadra (Leontief)',
  esquina_x: 'Esquina: sólo compra x',
  esquina_y: 'Esquina: sólo compra y',
  indeterminado: 'Indeterminada: cualquier punto de la recta es óptimo',
};

export function calcular({ familia, a, b, p1, p2, M, problema, k }: P): Simulacion {
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
  const extraPanel: Bloque[] = [];
  if (problema === 'dual') extraPanel.push(dual(fig, u, r, p1, p2, M, Number(k)));
  else if (problema === 'primal')
    extraPanel.push(
      lectura(
        'Problema primal: max U s.a. p₁x + p₂y = M',
        texto(`La demanda marshalliana x(p, M) da la canasta (${fmt(r.x, 2)}, ${fmt(r.y, 2)}); la utilidad indirecta es v(p, M) = ${fmt(U, 3)}.`),
      ),
    );
  const panel = [
    resultados([
      ...extraPanel,
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

/**
 * Problema dual: minimizar el gasto para alcanzar Ū = k·v(p, M). Dibuja la curva Ū, la recta de gasto
 * mínimo e(p, Ū) y la demanda hicksiana h(p, Ū); por dualidad h(p, Ū) = x(p, e(p, Ū)).
 */
function dual(fig: Figura, u: Utilidad, r: Eleccion, p1: number, p2: number, M: number, k: number): Bloque {
  if (!Number.isFinite(k) || k <= 0) return aviso('La utilidad objetivo debe ser positiva.');
  const v = r.utilidad;
  if (!(Number.isFinite(v) && v > 0)) return aviso('Con este ingreso la utilidad del primal es cero: sube M para plantear el dual.');
  const Ubar = k * v;
  let e: number;
  let h: [number, number];
  try {
    e = u.gasto(p1, p2, Ubar);
    h = u.hicks(p1, p2, Ubar);
  } catch (err) {
    if (err instanceof ErrorParametro) return aviso(err.message);
    throw err;
  }
  if (![e, h[0], h[1]].every(Number.isFinite)) return aviso('El problema dual no tiene solución finita con estos valores.');
  const xr = fig.layout.xaxis.range as number[];
  const yr = fig.layout.yaxis.range as number[];
  const limX = Math.max(xr[1], (e / p1) * 1.1, h[0] * 1.15);
  const limY = Math.max(yr[1], (e / p2) * 1.1, h[1] * 1.15);
  fig.layout.xaxis.range = [0, limX];
  fig.layout.yaxis.range = [0, limY];
  const [cx, cy0] = curva(u, Ubar, linspace(1e-3, limX, 500));
  fig.data.push({
    type: 'scatter', x: cx, y: cy0.map((c) => (c === null || c <= limY * 1.3 ? c : null)), mode: 'lines',
    name: `Utilidad objetivo Ū = ${fmt(Ubar, 2)}`, line: { width: 2.5, color: VERDE, dash: 'dash' },
  });
  fig.data.push({
    type: 'scatter', x: [0, e / p1], y: [e / p2, 0], mode: 'lines', name: `Gasto mínimo e(p, Ū) = ${fmt(e, 2)}`,
    line: { width: 2.5, color: VERDE, dash: 'dot' },
  });
  punto(fig, h[0], h[1], 'Demanda hicksiana h(p, Ū)', VERDE, 'diamond', 'h');
  return lectura(
    'Problema dual: min p₁x + p₂y s.a. U(x, y) ≥ Ū',
    tabla([
      ['Utilidad objetivo Ū', Ubar], ['Gasto mínimo e(p, Ū)', e], ['h₁(p, Ū)', h[0]], ['h₂(p, Ū)', h[1]],
      ['Ingreso disponible M', M],
    ]),
    texto(
      Math.abs(k - 1) < 1e-9
        ? 'Con Ū = v(p, M) el gasto mínimo es M y la hicksiana coincide con la marshalliana: h(p, v(p, M)) = x(p, M).'
        : `Por dualidad, h(p, Ū) = x(p, e(p, Ū)): con un ingreso de ${fmt(e, 2)} la marshalliana elegiría la misma canasta.`,
      'pequeno texto-suave',
    ),
  );
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
    {
      titulo: 'Problema dual',
      visibleSi: (p) => p['problema'] === 'dual',
      controles: [{ id: 'k', etiqueta: 'Utilidad objetivo Ū (veces v(p, M))', tipo: 'slider', min: 0.25, max: 3, paso: 0.05 }],
    },
  ],
  planteamientos: {
    param: 'problema',
    opciones: [
      { valor: 'primal', titulo: 'Problema primal (max U)', resumen: 'Maximiza U(x, y) sujeto a p₁x + p₂y = M: demanda marshalliana x(p, M) y utilidad indirecta v(p, M).' },
      { valor: 'dual', titulo: 'Problema dual (min gasto): hicksiana vs. marshalliana', resumen: 'Minimiza p₁x + p₂y sujeto a U(x, y) ≥ Ū: demanda hicksiana h(p, Ū) y función de gasto e(p, Ū).' },
    ],
  },
  calcular: (p: Params) => calcular(p as unknown as P),
};
