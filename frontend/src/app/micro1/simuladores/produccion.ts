import { Bloque, Figura, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import { AZUL, DORADO, ROJO, VERDE, aviso, figura, figuraVacia, lectura, punto, referencia, resultados, tabla, texto } from '../../core/tema';
import { CES, CobbDouglasP, LeontiefP, LinealP, MaxBeneficio, SeparableP, Tecnologia } from '../modelos/produccion';

const SIM_ID = 'produccion';
const DEF = { tec: 'cd', A: 1, alpha: 0.5, beta: 0.25, rho: 0.5, x0: 4, y0: 4, p: 3, w1: 2, w2: 3, problema: 'maxq' as string, C0: 20, q0: 3, nu: 1 };
/** `problema`, `C0`, `q0` y `nu` son opcionales: sin ellos la gráfica es la original (pruebas de paridad). */
type P = Omit<typeof DEF, 'problema' | 'C0' | 'q0' | 'nu'> & { problema?: string; C0?: number; q0?: number; nu?: number };

/** Máxima producción con el presupuesto C: recorre la recta de isocosto (malla + sección áurea). */
export function maxProducto(t: Tecnologia, w1: number, w2: number, C: number): { x: number; y: number; q: number } {
  const xmax = C / w1;
  const g = (x: number) => {
    const v = t.F(x, Math.max(0, (C - w1 * x) / w2));
    return Number.isFinite(v) ? v : -Infinity;
  };
  const N = 400;
  let mejor = 0;
  for (let i = 1; i <= N; i++) if (g((xmax * i) / N) > g((xmax * mejor) / N)) mejor = i;
  let lo = (xmax * Math.max(0, mejor - 1)) / N;
  let hi = (xmax * Math.min(N, mejor + 1)) / N;
  const r = (Math.sqrt(5) - 1) / 2;
  for (let k = 0; k < 80; k++) {
    const m1 = hi - r * (hi - lo);
    const m2 = lo + r * (hi - lo);
    if (g(m1) < g(m2)) lo = m1;
    else hi = m2;
  }
  let x = (lo + hi) / 2;
  for (const borde of [0, xmax]) if (g(borde) > g(x)) x = borde;
  const y = Math.max(0, (C - w1 * x) / w2);
  return { x, y, q: t.F(x, y) };
}

/** Mínimo costo de producir q₀: el presupuesto C con el que el máximo producto es justo q₀. */
export function minCosto(t: Tecnologia, w1: number, w2: number, q0: number): { x: number; y: number; C: number } {
  let hi = 1;
  for (let i = 0; i < 80 && maxProducto(t, w1, w2, hi).q < q0; i++) hi *= 2;
  if (maxProducto(t, w1, w2, hi).q < q0) throw new ErrorParametro('No se alcanza esa producción con costos finitos.');
  let lo = 0;
  for (let i = 0; i < 100; i++) {
    const m = (lo + hi) / 2;
    if (maxProducto(t, w1, w2, m).q < q0) lo = m;
    else hi = m;
  }
  const s = maxProducto(t, w1, w2, hi);
  return { x: s.x, y: s.y, C: hi };
}

/** Isocuanta de nivel q (maneja la escuadra de Leontief). */
function isocuantaXY(t: Tecnologia, q: number, xs: number[], lim = LIM): [number[], (number | null)[]] {
  if (t instanceof LeontiefP) return [[q * t.a, q * t.a, lim * 1.2], [lim * 1.2, q * t.b, q * t.b]];
  return [xs, xs.map((x) => {
    const c = t.isocuanta(q, x);
    return Number.isFinite(c) && c >= 0 && c <= lim * 1.5 ? c : null;
  })];
}

type SolProductor = { x: number; y: number; q: number; C: number };

/** Resuelve el planteamiento elegido (o devuelve el motivo por el que no se puede). */
function resolverProductor(t: Tecnologia, problema: string, w1: number, w2: number, C0: number, q0: number): SolProductor | { error: string } {
  if (![w1, w2, C0, q0].every((v) => Number.isFinite(v) && v > 0)) return { error: 'Precios, presupuesto y producción deben ser positivos.' };
  try {
    return problema === 'maxq' ? { ...maxProducto(t, w1, w2, C0), C: C0 } : { ...minCosto(t, w1, w2, q0), q: q0 };
  } catch (e) {
    if (e instanceof ErrorParametro) return { error: e.message };
    throw e;
  }
}

/** Recuadro que contiene el óptimo con holgura (nunca menor que el 0–10 original). */
const recuadroProductor = (sol: SolProductor | { error: string } | null): number =>
  sol && !('error' in sol) ? Math.min(Math.max(LIM, sol.x * 1.3, sol.y * 1.3), 200) : LIM;

/** Superpone el problema elegido (dual del productor) a la figura base. */
function problemaProductor(fig: Figura, t: Tecnologia, problema: string, w1: number, w2: number, C0: number, q0: number, sol: SolProductor | { error: string }, lim: number): Bloque {
  if ('error' in sol) return aviso(sol.error);
  const xs = linspace(1e-3, lim, 400);
  const maxq = problema === 'maxq';
  const { x, y, q, C } = sol;
  fig.data.push({
    type: 'scatter', x: [0, C / w1], y: [C / w2, 0], mode: 'lines', name: `Isocosto w₁x + w₂y = ${fmt(C, 2)}`,
    line: { color: ROJO, width: 2.5 },
  });
  const [cx, cy] = isocuantaXY(t, q, xs, lim);
  fig.data.push({ type: 'scatter', x: cx, y: cy, mode: 'lines', name: `Isocuanta q = ${fmt(q, 2)}`, line: { color: DORADO, width: 3 } });
  punto(fig, x, y, maxq ? 'Máximo producto' : 'Mínimo costo', DORADO, 'diamond', maxq ? 'q*' : 'c*');
  const tmst = t.tmst(x, y);
  return lectura(
    maxq ? `Máximo producto con C₀ = ${fmt(C0)}` : `Mínimo costo de producir q₀ = ${fmt(q0)}`,
    tabla([
      ['x*', x], ['y*', y], [maxq ? 'Producción máxima q*' : 'Costo mínimo c(w, q₀)', maxq ? q : C],
      ['TMST en el óptimo', tmst !== null && Number.isFinite(tmst) ? tmst : 'no definida'], ['w₁/w₂', w1 / w2],
    ]),
    texto(
      maxq
        ? 'La isocuanta más alta que toca la recta de isocosto: en una solución interior TMST = w₁/w₂.'
        : 'El isocosto más bajo que toca la isocuanta q₀: mismo punto de tangencia, problema dual del anterior.',
      'pequeno texto-suave',
    ),
  );
}
const LIM = 10;

/**
 * Con `tec = 'ces'`, α y β son los pesos a y b de F = A·[a·x^ρ + b·y^ρ]^(ν/ρ) (Monsalve: a = b = ν = 1).
 * En ρ = 0 la CES no está definida; se usa su límite de forma, Cobb-Douglas con exponentes ν·a/(a+b) y ν·b/(a+b).
 */
export function crearTecnologia(tec: string, A: number, alpha: number, beta: number, rho: number, nu = 1): Tecnologia {
  switch (tec) {
    case 'cd':
      return new CobbDouglasP(A, alpha, beta);
    case 'ces':
      return Math.abs(rho) < 1e-9
        ? new CobbDouglasP(A, (nu * alpha) / (alpha + beta), (nu * beta) / (alpha + beta))
        : new CES(A, rho, alpha, beta, nu);
    case 'leontief':
      return new LeontiefP(alpha, beta);
    case 'lineal':
      return new LinealP(alpha, beta);
    default:
      return new SeparableP();
  }
}

export function calcular({ tec, A, alpha, beta, rho, x0, y0, p, w1, w2, problema, C0, q0, nu }: P): Simulacion {
  let t: Tecnologia;
  try {
    t = crearTecnologia(tec, A, alpha, beta, rho, nu === undefined ? 1 : Number(nu));
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  // Con un planteamiento activo el recuadro crece hasta contener el óptimo y las curvas llegan a sus bordes.
  const conProblema = problema === 'maxq' || problema === 'minc';
  const sol = conProblema ? resolverProductor(t, problema, w1, w2, Number(C0), Number(q0)) : null;
  const lim = recuadroProductor(sol);
  const fig = figura('Insumo x (p. ej. trabajo)', 'Insumo y (p. ej. capital)', SIM_ID, {
    xaxis: { range: [0, lim] }, yaxis: { range: [0, lim] },
  });
  const xs = linspace(1e-3, lim, 400);
  [2, 4, 6, 8].forEach((k, i) => {
    const q = t.F(k, k);
    let cx: number[];
    let cy: (number | null)[];
    if (t instanceof LeontiefP) {
      cx = [q * t.a, q * t.a, lim * 1.2];
      cy = [lim * 1.2, q * t.b, q * t.b];
    } else {
      cx = xs;
      cy = xs.map((x) => {
        const c = t.isocuanta(q, x);
        return Number.isFinite(c) && c >= 0 && c <= lim * 1.5 ? c : null;
      });
    }
    fig.data.push({
      type: 'scatter', x: cx, y: cy, mode: 'lines', name: `q = ${fmt(q, 2)}`,
      line: { color: AZUL, width: 2 }, opacity: 0.4 + 0.15 * i,
    });
  });
  punto(fig, x0, y0, 'Combinación (x0, y0)');

  const rend = t.rendimientos(1.3, 2.1);
  const pmg = t.pmg(x0, y0);
  const tmst = t.tmst(x0, y0);
  const sigma = t.elasticidadSustitucion();
  const filas = [
    ['Producción F(x0, y0)', t.F(x0, y0)],
    ['PMg de x', pmg ? pmg[0] : 'no definido'],
    ['PMg de y', pmg ? pmg[1] : 'no definido'],
    ['TMST = PMg_x / PMg_y', tmst !== null ? tmst : 'no definida'],
  ];
  const tecTab = [
    ['Rendimientos a escala', rend.tipo], ['Grado de homogeneidad', rend.grado_local], ['Elasticidad de sustitución σ', sigma],
  ];
  let benef: Bloque;
  if (t.maxBeneficio) {
    let b: MaxBeneficio;
    try {
      b = t.maxBeneficio(p, w1, w2);
    } catch (e) {
      if (!(e instanceof ErrorParametro)) throw e;
      b = { existe: false, motivo: e.message };
    }
    if (b.existe) {
      benef = tabla([['x*', b.x], ['y*', b.y], ['Oferta z*', b.z], ['Beneficio Π*', b.beneficio]]);
      punto(fig, b.x, b.y, 'Óptimo de beneficio', VERDE, 'diamond');
    } else benef = aviso(b.motivo);
  } else {
    benef = aviso(
      'El máximo de beneficio se calcula para Cobb-Douglas (α + β < 1) y separable. ' +
        'Leontief y sustitutos perfectos tienen rendimientos constantes: el beneficio es cero o ilimitado.',
    );
  }
  const extra: Bloque[] =
    conProblema && sol ? [problemaProductor(fig, t, String(problema), w1, w2, Number(C0), Number(q0), sol, lim)] : [];
  const panel = [
    resultados([
      ...extra,
      lectura('En la combinación elegida', tabla(filas)),
      lectura(
        'Tecnología',
        tabla(tecTab),
        texto('σ mide qué tan fácil es sustituir un insumo por otro: 0 en Leontief, 1 en Cobb-Douglas, ∞ en sustitutos perfectos.', 'pequeno texto-suave'),
      ),
      lectura(
        `Máximo beneficio (p = ${fmt(p)}, w1 = ${fmt(w1)}, w2 = ${fmt(w2)})`,
        benef,
        referencia('ejemplo 2 (rendimientos a escala) y ejemplos 4–6 de la semana 5.'),
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
          id: 'tec', etiqueta: 'Tecnología', tipo: 'selector',
          opciones: [
            { valor: 'cd', etiqueta: 'Cobb-Douglas' }, { valor: 'ces', etiqueta: 'CES' },
            { valor: 'leontief', etiqueta: 'Proporciones fijas (Leontief)' },
            { valor: 'lineal', etiqueta: 'Sustitutos perfectos' }, { valor: 'separable', etiqueta: 'Separable √x + √y' },
          ],
        },
      ],
    },
    {
      titulo: 'Parámetros',
      controles: [
        { id: 'A', etiqueta: 'Productividad total A', tipo: 'slider', min: 0.5, max: 3, paso: 0.1 },
        { id: 'alpha', etiqueta: 'α (o a: peso de x en la CES)', tipo: 'slider', min: 0.05, max: 1.5, paso: 0.05 },
        { id: 'beta', etiqueta: 'β (o b: peso de y en la CES)', tipo: 'slider', min: 0.05, max: 1.5, paso: 0.05 },
      ],
    },
    {
      titulo: 'Sustitución y escala (CES)',
      visibleSi: (p) => p['tec'] === 'ces',
      controles: [
        { id: 'rho', etiqueta: 'ρ (σ = 1/(1−ρ))', tipo: 'slider', min: -3, max: 0.95, paso: 0.05 },
        { id: 'nu', etiqueta: 'ν (grado de homogeneidad)', tipo: 'slider', min: 0.2, max: 2, paso: 0.05 },
      ],
    },
    {
      titulo: 'Combinación de insumos',
      controles: [
        { id: 'x0', etiqueta: 'x0', tipo: 'slider', min: 0.2, max: 9.5, paso: 0.1 },
        { id: 'y0', etiqueta: 'y0', tipo: 'slider', min: 0.2, max: 9.5, paso: 0.1 },
      ],
    },
    {
      titulo: 'Precios del producto y de los factores',
      controles: [
        { id: 'p', etiqueta: 'Precio del producto p', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'w1', etiqueta: 'Precio de x (w1)', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'w2', etiqueta: 'Precio de y (w2)', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
      ],
    },
    {
      titulo: 'Presupuesto del productor',
      visibleSi: (p) => p['problema'] !== 'minc',
      controles: [{ id: 'C0', etiqueta: 'Costo disponible C₀', tipo: 'slider', min: 1, max: 60, paso: 1 }],
    },
    {
      titulo: 'Producción requerida',
      visibleSi: (p) => p['problema'] === 'minc',
      controles: [{ id: 'q0', etiqueta: 'Producción q₀', tipo: 'slider', min: 0.5, max: 8, paso: 0.1 }],
    },
  ],
  planteamientos: {
    param: 'problema',
    opciones: [
      { valor: 'maxq', titulo: 'Maximización de producto (dado C₀)', resumen: 'Máxima producción F(x, y) con el gasto w₁x + w₂y = C₀.' },
      { valor: 'minc', titulo: 'Minimización de costos (dado q₀)', resumen: 'Mínimo gasto w₁x + w₂y para producir F(x, y) = q₀: demandas condicionadas de factores.' },
    ],
  },
  calcular: (p: Params) => calcular(p as unknown as P),
  /** Al elegir CES se carga la forma de Monsalve (a = b = ν = 1); al salir de ella vuelven α y β por defecto. */
  alCambiar: (anterior: Params, nuevo: Params) => {
    if (anterior['tec'] === nuevo['tec']) return null;
    if (nuevo['tec'] === 'ces') return { ...nuevo, alpha: 1, beta: 1, nu: 1 };
    if (anterior['tec'] === 'ces') return { ...nuevo, alpha: DEF.alpha, beta: DEF.beta };
    return null;
  },
};
