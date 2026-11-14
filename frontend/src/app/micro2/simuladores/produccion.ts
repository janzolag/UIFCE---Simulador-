import { Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import {
  ACENTO, AZUL, MORADO, ROJO, VERDE, aviso, figura, figuraVacia, lectura, punto, resultados, tabla, texto,
} from '../../core/tema';
import { CostoCubico, demandasCondicionadas } from '../../micro1/modelos/costos';
import { CobbDouglasP } from '../../micro1/modelos/produccion';
import { refVarian } from './_comun';

const SIM_ID = 'm2-produccion';
// Largo plazo: f(x₁, x₂) = x₁^a·x₂^b con a = b = 0.5, w₁ = 4, w₂ = 1, y = 10 → x* = (5, 20), c(w, y) = 40.
// Corto plazo: C(y) = CF + a·y − b·y² + c·y³ (Varian: CMg en U) con CF = 20, a = 10, b = 2, c = 0.5.
const DEF = { modo: 'largo' as string, a: 0.5, b: 0.5, w1: 4, w2: 1, y: 10, CF: 20, ac: 10, bc: 2, cc: 0.5 };
export type ParamsProduccion = typeof DEF;
type P = ParamsProduccion;

export const tecnologia = (p: P): CobbDouglasP => new CobbDouglasP(1, p.a, p.b);
export const costoMinimo = (p: P) => demandasCondicionadas(tecnologia(p), p.w1, p.w2, p.y);
export const costoCorto = (p: P): CostoCubico => new CostoCubico(p.CF, p.ac, p.bc, p.cc);

function largo(p: P): Simulacion {
  const tec = tecnologia(p);
  const s = costoMinimo(p);
  const lx = Math.max(s.x * 2.2, 1);
  const ly = Math.max(s.y * 2.2, 1);
  const x1 = linspace(lx / 200, lx, 200);
  const fig = figura('Factor 1, x₁', 'Factor 2, x₂', SIM_ID + '-largo');
  fig.data.push({
    type: 'scatter', x: x1, y: x1.map((v) => (tec.isocuanta(p.y, v) <= ly ? tec.isocuanta(p.y, v) : null)),
    mode: 'lines', name: `Isocuanta f(x₁, x₂) = ${fmt(p.y, 1)}`, line: { color: AZUL, width: 3 },
  });
  const xs = [0, s.costo / p.w1];
  fig.data.push({
    type: 'scatter', x: xs, y: xs.map((v) => (s.costo - p.w1 * v) / p.w2), mode: 'lines',
    name: `Isocosto w₁x₁ + w₂x₂ = ${fmt(s.costo, 1)}`, line: { color: ROJO, width: 3 },
  });
  fig.layout.xaxis.range = [0, lx];
  fig.layout.yaxis.range = [0, ly];
  punto(fig, s.x, s.y, 'Mezcla óptima x*', ACENTO, undefined, 'x*');
  const panel = [
    resultados([
      lectura('Minimización de costos', tabla([
        ['x₁* (demanda condicionada)', s.x], ['x₂* (demanda condicionada)', s.y], ['Costo mínimo c(w, y)', s.costo],
        ['TMST = w₁/w₂', p.w1 / p.w2], ['Rendimientos a escala (a + b)', p.a + p.b],
      ])),
      lectura(
        'Lectura económica',
        texto('En el óptimo la isocuanta es tangente al isocosto: la TMST iguala el cociente de precios de los factores.'),
        texto('Si w₁ sube, la empresa sustituye x₁ por x₂ y el costo mínimo aumenta menos que proporcionalmente.', 'pequeno texto-suave'),
        refVarian('«Minimización de costos» y «Funciones de costos».'),
      ),
    ]),
  ];
  return { fig, panel };
}

function corto(p: P): Simulacion {
  const k = costoCorto(p);
  const qmax = Math.max(3 * k.q_min_cme(), 3 * k.q_min_cvme(), 5);
  const q = linspace(qmax / 300, qmax, 300);
  const fig = figura('Producción y', 'Pesos por unidad', SIM_ID + '-corto');
  const curvas: [string, (v: number) => number, string, string][] = [
    ['CMg', k.CMg, ROJO, 'solid'], ['CMe', k.CMe, AZUL, 'solid'],
    ['CVMe', k.CVMe, VERDE, 'dash'], ['CFMe', (v) => k.CF / v, MORADO, 'dot'],
  ];
  for (const [nom, f, col, dash] of curvas)
    fig.data.push({
      type: 'scatter', x: q, y: q.map(f), mode: 'lines', name: nom,
      line: { color: col, width: dash === 'solid' ? 3 : 2, dash },
    });
  fig.layout.xaxis.range = [0, qmax];
  fig.layout.yaxis.range = [0, k.CMe(k.q_min_cme()) * 2.2];
  punto(fig, k.q_min_cvme(), k.precio_cierre(), 'Precio de cierre (mín CVMe)', VERDE, undefined, 'cierre');
  punto(fig, k.q_min_cme(), k.precio_nivelacion(), 'Precio de equilibrio (mín CMe)', ACENTO, undefined, 'equilibrio');
  const panel = [
    resultados([
      lectura('Puntos clave', tabla([
        ['Mínimo del CVMe en y', k.q_min_cvme()], ['Precio de cierre', k.precio_cierre()],
        ['Mínimo del CMe en y', k.q_min_cme()], ['Precio de equilibrio (break-even)', k.precio_nivelacion()],
      ])),
      lectura(
        'Lectura económica',
        texto('El CMg corta al CVMe y al CMe en sus mínimos. Entre el precio de cierre y el de equilibrio la empresa produce con pérdidas, pero cubre su costo variable.'),
        texto(`C(y) = ${fmt(p.CF)} + ${fmt(p.ac)}y − ${fmt(p.bc)}y² + ${fmt(p.cc)}y³`, 'pequeno texto-suave'),
        refVarian('«Costos» y «Oferta de la empresa».'),
      ),
    ]),
  ];
  return { fig, panel };
}

export function calcular(p: P): Simulacion {
  try {
    return p.modo === 'corto' ? corto(p) : largo(p);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 540,
  grupos: [
    {
      controles: [
        {
          id: 'modo', etiqueta: 'Horizonte', tipo: 'selector',
          opciones: [
            { valor: 'largo', etiqueta: 'Largo plazo: minimizar costos' },
            { valor: 'corto', etiqueta: 'Corto plazo: curvas de costo' },
          ],
        },
      ],
    },
    {
      titulo: 'Tecnología f(x₁, x₂) = x₁ᵃ·x₂ᵇ y precios',
      visibleSi: (p) => p['modo'] !== 'corto',
      controles: [
        { id: 'a', etiqueta: 'a', tipo: 'slider', min: 0.1, max: 0.9, paso: 0.05 },
        { id: 'b', etiqueta: 'b', tipo: 'slider', min: 0.1, max: 0.9, paso: 0.05 },
        { id: 'w1', etiqueta: 'Precio del factor 1, w₁', tipo: 'slider', min: 0.5, max: 10, paso: 0.25 },
        { id: 'w2', etiqueta: 'Precio del factor 2, w₂', tipo: 'slider', min: 0.5, max: 10, paso: 0.25 },
        { id: 'y', etiqueta: 'Producción objetivo y', tipo: 'slider', min: 1, max: 40, paso: 1 },
      ],
    },
    {
      titulo: 'C(y) = CF + a·y − b·y² + c·y³',
      visibleSi: (p) => p['modo'] === 'corto',
      controles: [
        { id: 'CF', etiqueta: 'Costo fijo CF', tipo: 'slider', min: 0, max: 100, paso: 1 },
        { id: 'ac', etiqueta: 'a', tipo: 'slider', min: 1, max: 30, paso: 0.5 },
        { id: 'bc', etiqueta: 'b', tipo: 'slider', min: 0, max: 5, paso: 0.1 },
        { id: 'cc', etiqueta: 'c', tipo: 'slider', min: 0.05, max: 2, paso: 0.05 },
      ],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
