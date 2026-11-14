import { Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import { AZUL, DORADO, MORADO, ROJO, SUAVE, VERDE, aviso, figuraVacia, lectura, resultados, tabla, texto } from '../../core/tema';
import { Panel, curvaP, equilibrioP, figuraPaneles, flecha } from '../../macro2/simuladores/_paneles';
import { muestras, refVarian } from './_comun';

/**
 * Economía 2×2 con producción: dos bienes, dos factores (trabajo L y capital K) con dotaciones fijas y
 * tecnologías Cobb-Douglas y₁ = L₁^α·K₁^(1−α), y₂ = L₂^β·K₂^(1−β). Si α > β el bien 1 es intensivo en trabajo.
 */
const SIM_ID = 'm2-eg-produccion';
const DEF = { enfoque: 'fpp' as string, L: 100, K: 100, alfa: 0.7, beta: 0.3, gamma: 0.5, p: 1, pn: 1.3, dL: 20 };
type P = typeof DEF;

export interface Economia2x2 {
  L: number;
  K: number;
  alfa: number;
  beta: number;
}

export interface PuntoFPP {
  L1: number;
  K1: number;
  y1: number;
  y2: number;
  /** Tasa marginal de transformación −dy₂/dy₁ (= p₁/p₂ en un equilibrio competitivo). */
  tmt: number;
  /** Salario y renta del capital medidos en el bien 2 (p₂ = 1). */
  w: number;
  r: number;
}

export function validar(e: Economia2x2): void {
  if (!(Number.isFinite(e.L) && e.L > 0 && Number.isFinite(e.K) && e.K > 0)) throw new ErrorParametro('Las dotaciones de L y K deben ser positivas.');
  for (const [n, v] of [['α', e.alfa], ['β', e.beta]] as const)
    if (!(Number.isFinite(v) && v > 0 && v < 1)) throw new ErrorParametro(`${n} debe estar entre 0 y 1.`);
  if (Math.abs(e.alfa - e.beta) < 0.05) throw new ErrorParametro('Con α ≈ β ambos bienes usan los factores en la misma proporción y la FPP es casi una recta: separa α y β.');
}

/** Curva de contrato de la caja de producción (TMST₁ = TMST₂): K₁ en función de L₁. */
const k1De = (e: Economia2x2, L1: number): number => {
  const A = e.alfa / (1 - e.alfa);
  const B = e.beta / (1 - e.beta);
  const den = A * (e.L - L1) + B * L1;
  return den > 0 ? (B * e.K * L1) / den : 0;
};

/** Punto eficiente de la FPP asociado a L₁ ∈ [0, L]. */
export function puntoFPP(e: Economia2x2, L1: number): PuntoFPP {
  // Se recorta a [0, dotación] para que el redondeo en los extremos no deje cantidades negativas.
  const K1 = Math.min(e.K, Math.max(0, k1De(e, L1)));
  const L2 = Math.max(0, e.L - L1);
  const K2 = Math.max(0, e.K - K1);
  const y1 = Math.pow(L1, e.alfa) * Math.pow(K1, 1 - e.alfa);
  const y2 = Math.pow(L2, e.beta) * Math.pow(K2, 1 - e.beta);
  // Salario y renta del sector 2 (p₂ = 1); el precio p₁ = TMT iguala los del sector 1.
  const w = L2 > 0 ? (e.beta * y2) / L2 : NaN;
  const r = K2 > 0 ? ((1 - e.beta) * y2) / K2 : NaN;
  const pmgL1 = L1 > 0 ? (e.alfa * y1) / L1 : NaN;
  return { L1, K1, y1, y2, tmt: w / pmgL1, w, r };
}

/** Maximiza g sobre L₁ ∈ (0, L) (malla + sección áurea). */
function maximizar(e: Economia2x2, g: (q: PuntoFPP) => number): PuntoFPP {
  const N = 400;
  const val = (L1: number) => {
    const v = g(puntoFPP(e, L1));
    return Number.isFinite(v) ? v : -Infinity;
  };
  let mejor = 1;
  for (let i = 1; i < N; i++) if (val((e.L * i) / N) > val((e.L * mejor) / N)) mejor = i;
  let lo = (e.L * (mejor - 1)) / N;
  let hi = (e.L * (mejor + 1)) / N;
  const t = (Math.sqrt(5) - 1) / 2;
  for (let k = 0; k < 90; k++) {
    const m1 = hi - t * (hi - lo);
    const m2 = lo + t * (hi - lo);
    if (val(m1) < val(m2)) lo = m1;
    else hi = m2;
  }
  return puntoFPP(e, (lo + hi) / 2);
}

/** Equilibrio con un consumidor representativo u = y₁^γ·y₂^(1−γ): TMS = TMT. */
export function equilibrioAutarquia(e: Economia2x2, gamma: number): PuntoFPP & { tms: number } {
  validar(e);
  if (!(gamma > 0 && gamma < 1)) throw new ErrorParametro('γ debe estar entre 0 y 1.');
  const q = maximizar(e, (z) => gamma * Math.log(z.y1) + (1 - gamma) * Math.log(z.y2));
  return { ...q, tms: (gamma / (1 - gamma)) * (q.y2 / q.y1) };
}

/** Producción que maximiza el valor p·y₁ + y₂ a precio relativo dado (economía pequeña y abierta). */
export function produccionAPrecio(e: Economia2x2, p: number): PuntoFPP {
  validar(e);
  if (!(Number.isFinite(p) && p > 0)) throw new ErrorParametro('El precio relativo debe ser positivo.');
  return maximizar(e, (z) => p * z.y1 + z.y2);
}

function fpp(e: Economia2x2): { y1: number[]; y2: number[] } {
  const ls = linspace(0, e.L, 160);
  const pts = ls.map((l) => puntoFPP(e, l));
  return { y1: pts.map((q) => q.y1), y2: pts.map((q) => q.y2) };
}

function vistaFPP(p: P): Simulacion {
  const e = { L: p.L, K: p.K, alfa: p.alfa, beta: p.beta };
  const q = equilibrioAutarquia(e, p.gamma);
  const f = fpp(e);
  const lim1 = Math.max(...f.y1) * 1.08;
  const lim2 = Math.max(...f.y2) * 1.08;
  const G: Panel = {
    id: '',
    titulo: 'Frontera de posibilidades de producción y elección social',
    tituloX: 'Bien 1, y₁',
    tituloY: 'Bien 2, y₂',
    rangoX: [0, lim1],
    rangoY: [0, lim2],
    dominio: { x: [0, 1], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0, 0.93] },
  };
  const fig = figuraPaneles(SIM_ID + '-fpp', [G], 560);
  curvaP(fig, G, f.y1, f.y2, 'Frontera de posibilidades de producción', AZUL, 'final', 'FPP');
  const xs = linspace(lim1 / 300, lim1, 240);
  const U = Math.pow(q.y1, p.gamma) * Math.pow(q.y2, 1 - p.gamma);
  curvaP(fig, G, xs, muestras(xs, (x) => Math.pow(U / Math.pow(x, p.gamma), 1 / (1 - p.gamma)), lim2), 'Curva de indiferencia social', DORADO, 'final', 'u*');
  const recta = (x: number) => q.y2 - q.tmt * (x - q.y1);
  curvaP(fig, G, xs, muestras(xs, recta, lim2), `Recta de precios (p₁/p₂ = ${fmt(q.tmt, 3)})`, ROJO, 'intermedio', 'p₁/p₂');
  equilibrioP(fig, G, q.y1, q.y2, 'Equilibrio: TMS = TMT = p₁/p₂', 'E', DORADO, { simbolo: 'diamond' });
  const panel = [
    resultados([
      lectura(
        'Equilibrio general con producción',
        tabla([
          ['Producción (y₁, y₂)', `(${fmt(q.y1, 3)}, ${fmt(q.y2, 3)})`],
          ['TMT = −dy₂/dy₁', q.tmt],
          ['TMS del consumidor', q.tms],
          ['Precio relativo p₁/p₂', q.tmt],
          ['Asignación de factores al bien 1 (L₁, K₁)', `(${fmt(q.L1, 2)}, ${fmt(q.K1, 2)})`],
          ['Salario w y renta r (en bien 2)', `${fmt(q.w, 3)} y ${fmt(q.r, 3)}`],
        ]),
      ),
      lectura(
        'Lectura',
        texto(
          'La FPP reúne las producciones eficientes (TMST igual en los dos sectores). La economía es eficiente en el sentido de Pareto cuando, además, ' +
            'la tasa a la que se transforma un bien en otro (TMT) iguala la tasa a la que se desea cambiarlos (TMS): ambas igualan el precio relativo.',
          'destacado',
        ),
        texto('La FPP es cóncava porque los bienes usan los factores en proporciones distintas (α ≠ β).', 'pequeno texto-suave'),
        refVarian('«La producción»: frontera de posibilidades de producción, ventaja comparativa y teoremas del bienestar con producción; Monsalve (2017), equilibrio general.'),
      ),
    ]),
  ];
  return { fig, panel };
}

function vistaTeoremas(p: P): Simulacion {
  const e = { L: p.L, K: p.K, alfa: p.alfa, beta: p.beta };
  const e2 = { ...e, L: p.L + p.dL };
  const a = produccionAPrecio(e, p.p);
  const ss = produccionAPrecio(e, p.pn);
  const ry = produccionAPrecio(e2, p.p);
  const f = fpp(e);
  const f2 = fpp(e2);
  const lim1 = Math.max(...f.y1, ...f2.y1) * 1.08;
  const lim2 = Math.max(...f.y2, ...f2.y2) * 1.08;
  const G: Panel = {
    id: '',
    titulo: 'Rybczynski (más L, mismo precio) y Stolper-Samuelson (otro precio)',
    tituloX: 'Bien 1, y₁',
    tituloY: 'Bien 2, y₂',
    rangoX: [0, lim1],
    rangoY: [0, lim2],
    dominio: { x: [0, 1], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0, 0.93] },
  };
  const fig = figuraPaneles(SIM_ID + '-teoremas', [G], 560);
  curvaP(fig, G, f.y1, f.y2, 'FPP inicial', SUAVE, 'inicial', 'FPP');
  curvaP(fig, G, f2.y1, f2.y2, 'FPP con más trabajo (L + ΔL)', AZUL, 'final', 'FPP′');
  const xs = linspace(0, lim1, 60);
  curvaP(fig, G, xs, muestras(xs, (x) => a.y2 - p.p * (x - a.y1), lim2), `Precio p₁/p₂ = ${fmt(p.p, 2)}`, ROJO, 'intermedio', 'p');
  equilibrioP(fig, G, a.y1, a.y2, 'Producción inicial', 'A', SUAVE, { lecturas: false });
  equilibrioP(fig, G, ry.y1, ry.y2, 'Rybczynski: más L al mismo precio', 'R', AZUL, { simbolo: 'diamond' });
  equilibrioP(fig, G, ss.y1, ss.y2, `Stolper-Samuelson: precio ${fmt(p.pn, 2)}`, 'S', MORADO, { simbolo: 'square', lecturas: false });
  flecha(fig, G, [a.y1, a.y2], [ry.y1, ry.y2], AZUL);
  flecha(fig, G, [a.y1, a.y2], [ss.y1, ss.y2], MORADO);
  const intensivo = p.alfa > p.beta ? 'trabajo' : 'capital';
  const cambio = (x: number, y: number) => `${fmt(x, 3)} → ${fmt(y, 3)} (${y >= x ? '+' : ''}${fmt(((y - x) / x) * 100, 1)} %)`;
  // Pagos reales en términos de cada bien (p₂ = 1, p₁ = p): w/p₁ y w/p₂.
  const real = (q: PuntoFPP, pr: number) => ({ wB1: q.w / pr, wB2: q.w, rB1: q.r / pr, rB2: q.r });
  const r0 = real(a, p.p);
  const r1 = real(ss, p.pn);
  const panel = [
    resultados([
      lectura(
        'Rybczynski (precio fijo, ΔL)',
        tabla([
          ['y₁', cambio(a.y1, ry.y1)],
          ['y₂', cambio(a.y2, ry.y2)],
        ]),
        texto(`El bien 1 es intensivo en ${intensivo}. Con más trabajo y precios fijos se expande el bien intensivo en trabajo y el otro se contrae.`, 'pequeno texto-suave'),
      ),
      lectura(
        'Stolper-Samuelson (p₁/p₂ cambia)',
        tabla(
          [
            ['Salario real w/p₁', r0.wB1, r1.wB1],
            ['Salario real w/p₂', r0.wB2, r1.wB2],
            ['Renta real r/p₁', r0.rB1, r1.rB1],
            ['Renta real r/p₂', r0.rB2, r1.rB2],
          ],
          ['', `p₁/p₂ = ${fmt(p.p, 2)}`, `p₁/p₂ = ${fmt(p.pn, 2)}`],
        ),
        texto(
          'Si sube el precio de un bien, el factor que usa intensivamente gana en términos de ambos bienes y el otro pierde en ambos.',
          'destacado',
        ),
        refVarian('«La producción» (economía 2×2); los teoremas de Stolper-Samuelson y Rybczynski en su notación estándar de comercio internacional.'),
      ),
    ]),
  ];
  return { fig, panel };
}

export function calcular(p: P): Simulacion {
  try {
    return p.enfoque === 'teoremas' ? vistaTeoremas(p) : vistaFPP(p);
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
      titulo: 'Dotaciones de factores',
      controles: [
        { id: 'L', etiqueta: 'Trabajo L', tipo: 'slider', min: 20, max: 200, paso: 5 },
        { id: 'K', etiqueta: 'Capital K', tipo: 'slider', min: 20, max: 200, paso: 5 },
      ],
    },
    {
      titulo: 'Tecnologías: y₁ = L₁^α·K₁^(1−α), y₂ = L₂^β·K₂^(1−β)',
      controles: [
        { id: 'alfa', etiqueta: 'α (bien 1)', tipo: 'slider', min: 0.1, max: 0.9, paso: 0.05 },
        { id: 'beta', etiqueta: 'β (bien 2)', tipo: 'slider', min: 0.1, max: 0.9, paso: 0.05 },
      ],
    },
    {
      titulo: 'Preferencias: u = y₁^γ·y₂^(1−γ)',
      visibleSi: (p) => p['enfoque'] !== 'teoremas',
      controles: [{ id: 'gamma', etiqueta: 'γ', tipo: 'slider', min: 0.1, max: 0.9, paso: 0.05 }],
    },
    {
      titulo: 'Precios y choque de dotación',
      visibleSi: (p) => p['enfoque'] === 'teoremas',
      controles: [
        { id: 'p', etiqueta: 'Precio relativo p₁/p₂', tipo: 'slider', min: 0.3, max: 3, paso: 0.05 },
        { id: 'pn', etiqueta: 'Nuevo precio p₁/p₂ (Stolper-Samuelson)', tipo: 'slider', min: 0.3, max: 3, paso: 0.05 },
        { id: 'dL', etiqueta: 'Aumento del trabajo ΔL (Rybczynski)', tipo: 'slider', min: 0, max: 100, paso: 5 },
      ],
    },
  ],
  planteamientos: {
    param: 'enfoque',
    opciones: [
      { valor: 'fpp', titulo: 'Frontera de posibilidades de producción (TMS = TMT)', resumen: 'Producción eficiente en los dos sectores y elección social donde la indiferencia toca la FPP.' },
      { valor: 'teoremas', titulo: 'Teoremas de Stolper-Samuelson y Rybczynski', resumen: 'Con precios dados: cómo cambian las producciones si crece un factor y los pagos reales si cambia un precio.' },
    ],
  },
  calcular: (p: Params) => calcular(p as unknown as P),
};
