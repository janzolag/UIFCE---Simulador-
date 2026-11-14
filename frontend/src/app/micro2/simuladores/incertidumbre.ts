import { Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import { AZUL, DORADO, MORADO, ROJO, SUAVE, VERDE, aviso, figuraVacia, lectura, resultados, tabla, texto } from '../../core/tema';
import { Panel, curvaP, equilibrioP, figuraPaneles, flecha } from '../../macro2/simuladores/_paneles';
import { muestras, refVarian } from './_comun';

/**
 * Elección bajo incertidumbre con utilidad esperada de von Neumann-Morgenstern y u(w) = w^r
 * (r < 1 aversión, r = 1 neutralidad, r > 1 amor al riesgo).
 *  - Actitudes frente al riesgo: lotería (w₁ con prob. π, w₂ con 1 − π), equivalente cierto y prima de riesgo.
 *  - Mercado de seguros (Varian): riqueza W, pérdida L con prob. π, prima γ por peso de cobertura K;
 *    consumo contingente c_b = W − L + (1 − γ)K (mal estado) y c_g = W − γK (buen estado).
 */
const SIM_ID = 'm2-incertidumbre';
// Riesgo: w = 25 o 100 con π = 0.5 y u = √w ⇒ VE = 62.5, UE = 7.5, EC = 56.25, prima = 6.25.
// Seguro: W = 100, L = 50, π = 0.2, γ = 0.2 (actuarialmente justo) ⇒ seguro completo K = 50.
const DEF = { enfoque: 'riesgo' as string, r: 0.5, w1: 25, w2: 100, pi: 0.5, W: 100, L: 50, pl: 0.2, gamma: 0.2 };
type P = typeof DEF;

export const utilidad = (r: number, w: number): number => Math.pow(Math.max(w, 0), r);
export const inversa = (r: number, u: number): number => Math.pow(Math.max(u, 0), 1 / r);

function validarR(r: number): void {
  if (!(Number.isFinite(r) && r > 0 && r <= 3)) throw new ErrorParametro('El parámetro r de u(w) = w^r debe estar entre 0 y 3.');
}

export interface ResLoteria {
  VE: number;
  UE: number;
  EC: number;
  prima: number;
  actitud: 'aversión' | 'neutralidad' | 'amor';
}

export function loteria(r: number, w1: number, w2: number, pi: number): ResLoteria {
  validarR(r);
  if (!(Number.isFinite(w1) && Number.isFinite(w2) && w1 >= 0 && w2 > w1)) throw new ErrorParametro('Se requiere 0 ≤ w₁ < w₂.');
  if (!(Number.isFinite(pi) && pi > 0 && pi < 1)) throw new ErrorParametro('La probabilidad π debe estar entre 0 y 1.');
  const VE = pi * w1 + (1 - pi) * w2;
  const UE = pi * utilidad(r, w1) + (1 - pi) * utilidad(r, w2);
  const EC = inversa(r, UE);
  const actitud = Math.abs(r - 1) < 1e-9 ? 'neutralidad' : r < 1 ? 'aversión' : 'amor';
  return { VE, UE, EC, prima: VE - EC, actitud };
}

export interface ResSeguro {
  K: number;
  cb: number;
  cg: number;
  UE: number;
  UEsin: number;
  /** Prima actuarialmente justa: γ = π. */
  justo: boolean;
}

export function seguro(r: number, W: number, L: number, pi: number, gamma: number): ResSeguro {
  validarR(r);
  if (!(Number.isFinite(W) && W > 0 && Number.isFinite(L) && L > 0 && L < W)) throw new ErrorParametro('Se requiere 0 < L < W.');
  if (!(Number.isFinite(pi) && pi > 0 && pi < 1)) throw new ErrorParametro('La probabilidad de pérdida debe estar entre 0 y 1.');
  if (!(Number.isFinite(gamma) && gamma > 0 && gamma < 1)) throw new ErrorParametro('La prima γ debe estar entre 0 y 1.');
  const cons = (K: number) => ({ cb: W - L + (1 - gamma) * K, cg: W - gamma * K });
  const ue = (K: number) => {
    const c = cons(K);
    return pi * utilidad(r, c.cb) + (1 - pi) * utilidad(r, c.cg);
  };
  // Cobertura entre 0 y L (malla + sección áurea; con r ≥ 1 el óptimo queda en un extremo).
  const N = 400;
  let mejor = 0;
  for (let i = 1; i <= N; i++) if (ue((L * i) / N) > ue((L * mejor) / N)) mejor = i;
  let lo = (L * Math.max(0, mejor - 1)) / N;
  let hi = (L * Math.min(N, mejor + 1)) / N;
  const t = (Math.sqrt(5) - 1) / 2;
  for (let k = 0; k < 80; k++) {
    const m1 = hi - t * (hi - lo);
    const m2 = lo + t * (hi - lo);
    if (ue(m1) < ue(m2)) lo = m1;
    else hi = m2;
  }
  let K = (lo + hi) / 2;
  for (const borde of [0, L]) if (ue(borde) > ue(K) + 1e-12) K = borde;
  const c = cons(K);
  return { K, cb: c.cb, cg: c.cg, UE: ue(K), UEsin: ue(0), justo: Math.abs(gamma - pi) < 1e-9 };
}

function vistaRiesgo(p: P): Simulacion {
  const r = loteria(p.r, p.w1, p.w2, p.pi);
  const wmax = p.w2 * 1.1;
  const umax = utilidad(p.r, wmax) * 1.08;
  const G: Panel = {
    id: '',
    titulo: 'Utilidad de von Neumann-Morgenstern u(w) = w^r',
    tituloX: 'Riqueza w',
    tituloY: 'Utilidad u(w)',
    rangoX: [0, wmax],
    rangoY: [0, umax],
    dominio: { x: [0, 1], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0, 0.93] },
  };
  const fig = figuraPaneles(SIM_ID + '-riesgo', [G], 560);
  const ws = linspace(0, wmax, 200);
  curvaP(fig, G, ws, muestras(ws, (w) => utilidad(p.r, w), umax), 'Función de utilidad u(w)', AZUL, 'final', 'u(w)');
  curvaP(fig, G, [p.w1, p.w2], [utilidad(p.r, p.w1), utilidad(p.r, p.w2)], 'Cuerda: utilidad esperada de la lotería', SUAVE, 'intermedio', 'UE');
  equilibrioP(fig, G, p.w1, utilidad(p.r, p.w1), 'Resultado malo w₁', 'w₁', SUAVE, { lecturas: false });
  equilibrioP(fig, G, p.w2, utilidad(p.r, p.w2), 'Resultado bueno w₂', 'w₂', SUAVE, { lecturas: false });
  equilibrioP(fig, G, r.VE, r.UE, 'Lotería: (valor esperado, utilidad esperada)', 'VE', MORADO, { simbolo: 'diamond' });
  equilibrioP(fig, G, r.EC, r.UE, 'Equivalente cierto', 'EC', DORADO, { simbolo: 'square' });
  flecha(fig, G, [r.VE, r.UE], [r.EC, r.UE], ROJO);
  const panel = [
    resultados([
      lectura(
        'Lotería y actitud frente al riesgo',
        tabla([
          ['Valor esperado VE = πw₁ + (1 − π)w₂', r.VE],
          ['Utilidad esperada UE', r.UE],
          ['Utilidad del valor esperado u(VE)', utilidad(p.r, r.VE)],
          ['Equivalente cierto EC = u⁻¹(UE)', r.EC],
          ['Prima de riesgo VE − EC', r.prima],
        ]),
      ),
      lectura(
        'Lectura',
        texto(
          r.actitud === 'aversión'
            ? `u es cóncava (r < 1): u(VE) > UE, así que el consumidor prefiere ${fmt(r.EC, 2)} seguros a la lotería y pagaría hasta ${fmt(r.prima, 2)} por eliminar el riesgo.`
            : r.actitud === 'neutralidad'
              ? 'u es lineal (r = 1): solo importa el valor esperado; el equivalente cierto es VE y la prima de riesgo es cero.'
              : `u es convexa (r > 1): el consumidor ama el riesgo y exige ${fmt(-r.prima, 2)} más que el valor esperado para renunciar a la lotería.`,
          'destacado',
        ),
        refVarian('«La incertidumbre»: utilidad esperada, aversión al riesgo, equivalente cierto; Monsalve (2017), elección bajo incertidumbre.'),
      ),
    ]),
  ];
  return { fig, panel };
}

function vistaSeguro(p: P): Simulacion {
  const s = seguro(p.r, p.W, p.L, p.pl, p.gamma);
  const lim = p.W * 1.1;
  const G: Panel = {
    id: '',
    titulo: 'Consumo contingente y demanda de seguro',
    tituloX: 'Consumo si no hay pérdida, c_g',
    tituloY: 'Consumo si hay pérdida, c_b',
    rangoX: [0, lim],
    rangoY: [0, lim],
    dominio: { x: [0, 1], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0, 0.93] },
  };
  const fig = figuraPaneles(SIM_ID + '-seguro', [G], 560);
  curvaP(fig, G, [0, lim], [0, lim], 'Recta de certeza (c_b = c_g)', SUAVE, 'intermedio', 'certeza');
  // Restricción: al comprar K, c_g baja γK y c_b sube (1 − γ)K: pendiente −(1 − γ)/γ.
  const Kmax = p.W / p.gamma;
  const Ks = linspace(0, Math.min(Kmax, p.W * 4), 120);
  const xs = Ks.map((K) => p.W - p.gamma * K);
  const ys = Ks.map((K) => p.W - p.L + (1 - p.gamma) * K);
  curvaP(fig, G, xs, ys.map((y) => (y <= lim ? y : null)), `Restricción presupuestaria (pendiente −(1 − γ)/γ = −${fmt((1 - p.gamma) / p.gamma, 2)})`, ROJO, 'final', 'presupuesto');
  const cs = linspace(lim / 300, lim, 240);
  const curva = (c: number) => {
    const resto = (s.UE - (1 - p.pl) * utilidad(p.r, c)) / p.pl;
    return resto >= 0 ? inversa(p.r, resto) : NaN;
  };
  curvaP(fig, G, cs, muestras(cs, curva, lim), 'Curva de indiferencia (utilidad esperada)', DORADO, 'final', 'UE*');
  equilibrioP(fig, G, p.W, p.W - p.L, 'Dotación: sin seguro', 'ω', AZUL, { lecturas: false });
  equilibrioP(fig, G, s.cg, s.cb, 'Elección óptima con seguro', 'E', DORADO, { simbolo: 'diamond' });
  flecha(fig, G, [p.W, p.W - p.L], [s.cg, s.cb], DORADO);
  const panel = [
    resultados([
      lectura(
        'Demanda de seguro',
        tabla([
          ['Cobertura óptima K*', s.K], ['Pago de la prima γK*', p.gamma * s.K],
          ['Consumo si hay pérdida c_b', s.cb], ['Consumo si no hay pérdida c_g', s.cg],
          ['Utilidad esperada sin seguro', s.UEsin], ['Utilidad esperada con seguro', s.UE],
        ]),
      ),
      lectura(
        'Lectura',
        texto(
          s.justo && p.r < 1
            ? 'Con prima actuarialmente justa (γ = π) el consumidor averso al riesgo se asegura por completo: c_b = c_g, sobre la recta de certeza.'
            : p.gamma > p.pl
              ? 'La prima es mayor que la probabilidad de pérdida (γ > π): conviene asegurarse solo en parte, o nada si la aversión es baja.'
              : 'Con γ ≤ π el seguro es barato y la cobertura es completa (o mayor si se permitiera).',
          'destacado',
        ),
        texto('En el óptimo interior: π·u′(c_b) / ((1 − π)·u′(c_g)) = γ / (1 − γ).', 'pequeno texto-suave'),
        refVarian('«La incertidumbre»: consumo contingente y seguros; Monsalve (2017).'),
      ),
    ]),
  ];
  return { fig, panel };
}

export function calcular(p: P): Simulacion {
  try {
    return p.enfoque === 'seguro' ? vistaSeguro(p) : vistaRiesgo(p);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 560,
  grupos: [
    {
      titulo: 'Utilidad u(w) = w^r',
      controles: [{ id: 'r', etiqueta: 'r (< 1 averso, = 1 neutral, > 1 amante)', tipo: 'slider', min: 0.2, max: 2, paso: 0.05 }],
    },
    {
      titulo: 'Lotería',
      visibleSi: (p) => p['enfoque'] !== 'seguro',
      controles: [
        { id: 'w1', etiqueta: 'Resultado malo w₁', tipo: 'slider', min: 0, max: 100, paso: 1 },
        { id: 'w2', etiqueta: 'Resultado bueno w₂', tipo: 'slider', min: 10, max: 200, paso: 1 },
        { id: 'pi', etiqueta: 'Probabilidad de w₁, π', tipo: 'slider', min: 0.05, max: 0.95, paso: 0.05 },
      ],
    },
    {
      titulo: 'Seguro',
      visibleSi: (p) => p['enfoque'] === 'seguro',
      controles: [
        { id: 'W', etiqueta: 'Riqueza W', tipo: 'slider', min: 20, max: 200, paso: 5 },
        { id: 'L', etiqueta: 'Pérdida L', tipo: 'slider', min: 5, max: 150, paso: 5 },
        { id: 'pl', etiqueta: 'Probabilidad de pérdida π', tipo: 'slider', min: 0.05, max: 0.9, paso: 0.05 },
        { id: 'gamma', etiqueta: 'Prima por peso asegurado γ', tipo: 'slider', min: 0.05, max: 0.9, paso: 0.01 },
      ],
    },
  ],
  planteamientos: {
    param: 'enfoque',
    opciones: [
      { valor: 'riesgo', titulo: 'Actitudes frente al riesgo (equivalente cierto y prima de riesgo)', resumen: 'Utilidad esperada de una lotería: con u cóncava el equivalente cierto es menor que el valor esperado.' },
      { valor: 'seguro', titulo: 'Mercado de seguros', resumen: 'Consumo contingente: el consumidor elige la cobertura K; con prima justa (γ = π) se asegura por completo.' },
    ],
  },
  calcular: (p: Params) => calcular(p as unknown as P),
};
