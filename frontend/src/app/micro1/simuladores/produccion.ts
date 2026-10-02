import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import { AZUL, VERDE, aviso, figura, figuraVacia, lectura, punto, referencia, resultados, tabla, texto } from '../../core/tema';
import { CES, CobbDouglasP, LeontiefP, LinealP, MaxBeneficio, SeparableP, Tecnologia } from '../modelos/produccion';

const SIM_ID = 'produccion';
const DEF = { tec: 'cd', A: 1, alpha: 0.5, beta: 0.25, rho: 0.5, x0: 4, y0: 4, p: 3, w1: 2, w2: 3 };
type P = typeof DEF;
const LIM = 10;

export function crearTecnologia(tec: string, A: number, alpha: number, beta: number, rho: number): Tecnologia {
  switch (tec) {
    case 'cd':
      return new CobbDouglasP(A, alpha, beta);
    case 'ces':
      return Math.abs(rho) < 1e-9 ? new CobbDouglasP(A, alpha, beta) : new CES(A, rho, alpha / (alpha + beta), alpha + beta);
    case 'leontief':
      return new LeontiefP(alpha, beta);
    case 'lineal':
      return new LinealP(alpha, beta);
    default:
      return new SeparableP();
  }
}

export function calcular({ tec, A, alpha, beta, rho, x0, y0, p, w1, w2 }: P): Simulacion {
  let t: Tecnologia;
  try {
    t = crearTecnologia(tec, A, alpha, beta, rho);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const fig = figura('Insumo x (p. ej. trabajo)', 'Insumo y (p. ej. capital)', SIM_ID, {
    xaxis: { range: [0, LIM] }, yaxis: { range: [0, LIM] },
  });
  const xs = linspace(1e-3, LIM, 400);
  [2, 4, 6, 8].forEach((k, i) => {
    const q = t.F(k, k);
    let cx: number[];
    let cy: (number | null)[];
    if (t instanceof LeontiefP) {
      cx = [q * t.a, q * t.a, LIM * 1.2];
      cy = [LIM * 1.2, q * t.b, q * t.b];
    } else {
      cx = xs;
      cy = xs.map((x) => {
        const c = t.isocuanta(q, x);
        return Number.isFinite(c) && c >= 0 && c <= LIM * 1.5 ? c : null;
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
  const panel = [
    resultados([
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
        { id: 'alpha', etiqueta: 'α (o a)', tipo: 'slider', min: 0.05, max: 1.5, paso: 0.05 },
        { id: 'beta', etiqueta: 'β (o b)', tipo: 'slider', min: 0.05, max: 1.5, paso: 0.05 },
        { id: 'rho', etiqueta: 'ρ (sólo CES; σ = 1/(1−ρ))', tipo: 'slider', min: -3, max: 0.95, paso: 0.05 },
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
      titulo: 'Precios (maximización del beneficio)',
      controles: [
        { id: 'p', etiqueta: 'Precio del producto p', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'w1', etiqueta: 'Precio de x (w1)', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'w2', etiqueta: 'Precio de y (w2)', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
      ],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
