import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import { AZUL, DORADO, MORADO, ROJO, SUAVE, VERDE, aviso, figuraVacia, lectura, resultados, tabla, texto } from '../../core/tema';
import { CobbDouglas, Giffen, Utilidad } from '../../micro1/modelos/consumidor';
import { Descomposicion, Metodo, descomposicion } from '../../micro1/modelos/slutsky';
import { Panel, curvaP, equilibrioP, figuraPaneles, flecha } from '../../macro2/simuladores/_paneles';
import { muestras, refVarian } from './_comun';

const SIM_ID = 'm2-slutsky';
/** Casos con valores de partida dentro de la región válida de cada función de utilidad. */
export const CASOS: Record<string, { p1: number; p2: number; m: number; p1n: number }> = {
  normal: { p1: 2, p2: 1, m: 40, p1n: 3 },
  inferior: { p1: 1, p2: 2, m: 3.5, p1n: 1.2 },
  giffen: { p1: 2, p2: 1, m: 3.5, p1n: 2.2 },
};
const DEF = {
  enfoque: 'compensacion' as string,
  caso: 'normal' as string,
  metodo: 'slutsky' as string,
  a: 0.5,
  ...CASOS['normal'],
  // Dotación inicial (oferta de trabajo): tiempo T̄, renta no laboral m̄, salario w → w′, u = R^α·C^(1−α).
  alfa: 0.5,
  T: 24,
  mbar: 40,
  w0: 10,
  w1: 15,
};
type P = typeof DEF;

export const utilidadDe = (caso: string, a: number): Utilidad =>
  caso === 'normal' ? new CobbDouglas(a, 1 - a) : new Giffen();

const NOMBRE_CASO: Record<string, string> = {
  normal: 'Bien normal',
  inferior: 'Bien inferior (no Giffen)',
  giffen: 'Bien Giffen',
};

export function calcular(p: P): Simulacion {
  if (p.enfoque === 'dotacion') {
    try {
      return dotacion(p);
    } catch (e) {
      if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
      throw e;
    }
  }
  let u: Utilidad;
  let d: Descomposicion;
  try {
    if (p.caso === 'normal' && !(p.a > 0 && p.a < 1)) throw new ErrorParametro('a debe estar entre 0 y 1.');
    u = utilidadDe(p.caso, p.a);
    d = descomposicion(u, p.p1, p.p2, p.m, p.p1n, p.metodo as Metodo);
  } catch (e) {
    if (!(e instanceof ErrorParametro)) throw e;
    const msg = e.message + (p.caso !== 'normal' ? ' Pulsa de nuevo el caso para volver a sus valores de partida.' : '');
    return { fig: figuraVacia(msg), panel: [aviso(msg, 'error')] };
  }
  const { A, B, C } = d;
  const x0 = p.caso === 'normal' ? 0 : 1;
  const lx = Math.max(p.m / Math.min(p.p1, p.p1n), d.M_compensado / p.p1n, A.x, B.x, C.x) * 1.08;
  const ly = Math.max(p.m / p.p2, d.M_compensado / p.p2, A.y, B.y, C.y) * 1.08;

  const G: Panel = {
    id: '',
    titulo: 'A · Pivote (sustitución) y desplazamiento (ingreso)',
    tituloX: 'Bien 1, x₁',
    tituloY: 'Bien 2, x₂',
    rangoX: [x0, lx],
    rangoY: [0, ly],
    dominio: { x: [0, 0.6], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0.48, 0.97] },
  };
  // Demanda ordinaria x₁(p₁, m) y demanda compensada de Slutsky x₁(p₁, m + x₁ᴬ·(p₁ − p₁ᴬ)).
  const pmin = Math.min(p.p1, p.p1n) * 0.6;
  const pmax = Math.max(p.p1, p.p1n) * 1.5;
  const D: Panel = {
    id: '2',
    titulo: 'B · Demanda ordinaria y compensada',
    tituloX: 'x₁',
    tituloY: 'Precio p₁',
    rangoX: [x0, lx],
    rangoY: [0, pmax],
    dominio: { x: [0.7, 1], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0, 0.38] },
    enlaceX: 'x',
  };
  const fig = figuraPaneles(SIM_ID, [G, D], 900);

  // ---------- Panel A
  const recta = (pp: number, mm: number, nombre: string, color: string, estado: 'inicial' | 'intermedio' | 'final', et: string) =>
    curvaP(fig, G, [0, mm / pp], [mm / p.p2, 0], nombre, color, estado, et);
  recta(p.p1, p.m, 'Recta presupuestaria', AZUL, 'inicial', 'm / p₁');
  recta(p.p1n, d.M_compensado, p.metodo === 'hicks' ? 'Recta compensada (Hicks)' : 'Recta pivotada (Slutsky)', VERDE, 'intermedio', "m′ / p₁′");
  recta(p.p1n, p.m, 'Recta final', ROJO, 'final', "m / p₁′");
  const xs = linspace(Math.max(x0, 1e-3) + 1e-6, lx, 400);
  const ic = (U: number, nombre: string, color: string, et: string, estado: 'inicial' | 'intermedio' | 'final') =>
    curvaP(fig, G, xs, muestras(xs, (x) => u.curvaIndiferencia(U, x), ly * 1.2), nombre, color, estado, et);
  ic(d.U0, 'Curva de indiferencia de A', SUAVE, 'u(A)', 'inicial');
  if (p.metodo === 'slutsky') ic(u.U(B.x, B.y), 'Curva de indiferencia de B', VERDE, 'u(B)', 'intermedio');
  ic(u.U(C.x, C.y), 'Curva de indiferencia de C', DORADO, 'u(C)', 'final');
  equilibrioP(fig, G, A.x, A.y, 'A · cesta inicial', 'A', AZUL, { decX: 3, decY: 3 });
  equilibrioP(fig, G, B.x, B.y, 'B · cesta compensada', 'B', VERDE, { decX: 3, decY: 3, simbolo: 'square' });
  equilibrioP(fig, G, C.x, C.y, 'C · cesta final', 'C', ROJO, { decX: 3, decY: 3, simbolo: 'diamond' });
  // Flechas de los efectos sobre x₁, cerca del eje: sustitución A → B, ingreso B → C.
  const yS = ly * 0.1;
  const yI = ly * 0.17;
  flecha(fig, G, [A.x, yS], [B.x, yS], VERDE);
  flecha(fig, G, [B.x, yI], [C.x, yI], ROJO);
  fig.layout.annotations.push(
    { x: (A.x + B.x) / 2, y: yS, xref: 'x', yref: 'y', text: 'ES', showarrow: false, yshift: -10, font: { size: 11, color: VERDE } },
    { x: (B.x + C.x) / 2, y: yI, xref: 'x', yref: 'y', text: 'EI', showarrow: false, yshift: 10, font: { size: 11, color: ROJO } },
  );

  // ---------- Panel B
  const ps = linspace(pmin, pmax, 120);
  const x1 = (pp: number, mm: number): number | null => {
    try {
      const v = u.marshall(pp, p.p2, mm).x;
      return Number.isFinite(v) ? v : null;
    } catch {
      return null;
    }
  };
  curvaP(fig, D, ps.map((pp) => x1(pp, p.m)), ps, 'Demanda ordinaria x₁(p₁, m)', ROJO, 'final', 'ordinaria');
  curvaP(fig, D, ps.map((pp) => x1(pp, p.m + A.x * (pp - p.p1))), ps, 'Demanda compensada (Slutsky)', VERDE, 'intermedio', 'compensada');
  equilibrioP(fig, D, A.x, p.p1, 'A', 'A', AZUL, { decX: 3, decY: 2, lecturas: false });
  equilibrioP(fig, D, C.x, p.p1n, 'C', 'C', ROJO, { decX: 3, decY: 2, simbolo: 'diamond', lecturas: false });
  if (p.metodo === 'slutsky') equilibrioP(fig, D, B.x, p.p1n, 'B', 'B', VERDE, { decX: 3, decY: 2, simbolo: 'square', lecturas: false });

  const { efecto_sustitucion: es, efecto_ingreso: ei, efecto_total: et } = d;
  const clasif: Record<string, string> = {
    normal: 'Bien normal: el efecto ingreso refuerza al de sustitución (la demanda cae cuando sube su precio).',
    inferior: 'Bien inferior: el efecto ingreso va en contra del de sustitución, pero es más pequeño; la demanda sigue teniendo pendiente negativa.',
    giffen: 'Bien Giffen: el efecto ingreso va en contra y supera al de sustitución; la demanda sube con su propio precio.',
    efecto_ingreso_nulo: 'Sin efecto ingreso: todo el cambio es sustitución.',
    sin_cambio: 'El precio no cambió.',
  };
  const dp = p.p1n - p.p1;
  const lecturas: Bloque[] = [
    texto(clasif[d.clasificacion_x] ?? '', 'destacado'),
    texto(
      `Identidad de Slutsky: Δx₁ = Δx₁ˢ + Δx₁ⁿ ⇒ ${fmt(et[0], 4)} = ${fmt(es[0], 4)} + ${fmt(ei[0], 4)}. ` +
        (p.metodo === 'slutsky'
          ? `La compensación es Δm = x₁·Δp₁ = ${fmt(A.x, 3)} × ${fmt(dp, 3)} = ${fmt(d.compensacion, 4)}: con m′ el consumidor aún puede comprar A.`
          : `Hicks: la compensación ${fmt(d.compensacion, 4)} devuelve al consumidor a la curva de indiferencia inicial.`),
      'pequeno texto-suave',
    ),
  ];
  if (p.caso !== 'normal' && NOMBRE_CASO[p.caso] !== undefined && d.clasificacion_x !== p.caso && d.clasificacion_x !== 'sin_cambio')
    lecturas.push(aviso(`Con estos valores el bien ya no se comporta como «${NOMBRE_CASO[p.caso]}»: es ${d.clasificacion_x}.`));
  const panel = [
    resultados([
      lectura(
        'Descomposición de Δx₁',
        tabla(
          [
            ['Sustitución Δx₁ˢ (A → B)', es[0], es[1]],
            ['Ingreso Δx₁ⁿ (B → C)', ei[0], ei[1]],
            ['Total Δx₁ (A → C)', et[0], et[1]],
          ],
          ['Efecto', 'Δx₁', 'Δx₂'],
        ),
      ),
      lectura(
        'Cestas y compensación',
        tabla(
          [
            ['A (p₁, m)', A.x, A.y],
            [p.metodo === 'hicks' ? 'B (p₁′, misma utilidad)' : 'B (p₁′, m′)', B.x, B.y],
            ['C (p₁′, m)', C.x, C.y],
            ["Renta compensada m′", d.M_compensado, null],
          ],
          ['', 'x₁', 'x₂'],
        ),
      ),
      lectura(
        'Lectura',
        ...lecturas,
        refVarian(
          '«La ecuación de Slutsky»: pivote de la recta presupuestaria alrededor de la cesta inicial (efecto sustitución) y desplazamiento paralelo (efecto renta). La utilidad de los casos inferior y Giffen es la del ejemplo 3.5 de Monsalve (2017) que ya usa Micro 1.',
        ),
      ),
    ]),
  ];
  return { fig, panel };
}

export interface ResDotacion {
  A: { R: number; C: number };
  B: { R: number; C: number };
  C: { R: number; C: number };
  /** Ingreso monetario de la dotación con w y con w′, y el compensado de Slutsky. */
  M0: number;
  M1: number;
  Mc: number;
  sustitucion: number;
  ingresoOrdinario: number;
  ingresoDotacion: number;
  total: number;
  /** Horas trabajadas L = T̄ − R. */
  L0: number;
  L1: number;
}

/**
 * Slutsky con dotación (oferta de trabajo): ocio R y consumo C (precio 1); restricción C + w·R = w·T̄ + m̄.
 * ΔR = sustitución (A → B, pivote por A) + ingreso ordinario (B → D, renta monetaria fija) + efecto dotación (D → C).
 */
export function slutskyDotacion(alfa: number, T: number, mbar: number, w0: number, w1: number): ResDotacion {
  if (!(alfa > 0 && alfa < 1)) throw new ErrorParametro('α debe estar entre 0 y 1.');
  for (const [n, v] of [['T̄', T], ['w', w0], ["w′", w1]] as const)
    if (!(Number.isFinite(v) && v > 0)) throw new ErrorParametro(`${n} debe ser positivo.`);
  if (!(Number.isFinite(mbar) && mbar >= 0)) throw new ErrorParametro('La renta no laboral no puede ser negativa.');
  // Demanda de ocio Cobb-Douglas con tope en T̄ (no se puede tener más ocio que el tiempo disponible).
  const ocio = (w: number, M: number) => Math.min(T, (alfa * M) / w);
  const cesta = (w: number, M: number) => {
    const R = ocio(w, M);
    return { R, C: M - w * R };
  };
  const M0 = w0 * T + mbar;
  const M1 = w1 * T + mbar;
  const A = cesta(w0, M0);
  const Mc = w1 * A.R + A.C;
  const B = cesta(w1, Mc);
  const D = cesta(w1, M0);
  const C = cesta(w1, M1);
  return {
    A, B, C, M0, M1, Mc,
    sustitucion: B.R - A.R,
    ingresoOrdinario: D.R - B.R,
    ingresoDotacion: C.R - D.R,
    total: C.R - A.R,
    L0: T - A.R,
    L1: T - C.R,
  };
}

function dotacion(p: P): Simulacion {
  const r = slutskyDotacion(p.alfa, p.T, p.mbar, p.w0, p.w1);
  const top = Math.max(r.M0, r.M1, r.Mc) * 1.08;
  const G: Panel = {
    id: '',
    titulo: 'A · Ocio y consumo: la recta gira alrededor de la dotación ω',
    tituloX: 'Ocio R (horas)',
    tituloY: 'Consumo C',
    rangoX: [0, p.T * 1.08],
    rangoY: [0, top],
    dominio: { x: [0, 0.6], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0.48, 0.97] },
  };
  const wmax = Math.max(p.w0, p.w1) * 1.6;
  const S: Panel = {
    id: '2',
    titulo: 'B · Oferta de trabajo L(w) = T̄ − R(w)',
    tituloX: 'Horas trabajadas L',
    tituloY: 'Salario w',
    rangoX: [0, p.T * 1.08],
    rangoY: [0, wmax],
    dominio: { x: [0.7, 1], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0, 0.38] },
  };
  const fig = figuraPaneles(SIM_ID + '-dotacion', [G, S], 900);
  const recta = (w: number, M: number, nombre: string, color: string, estado: 'inicial' | 'intermedio' | 'final', et: string) =>
    curvaP(fig, G, [0, Math.min(p.T, M / w)], [M, M - w * Math.min(p.T, M / w)], nombre, color, estado, et);
  recta(p.w0, r.M0, 'Recta con w', AZUL, 'inicial', 'w');
  recta(p.w1, r.Mc, 'Recta compensada de Slutsky (pasa por A)', VERDE, 'intermedio', 'compensada');
  recta(p.w1, r.M1, "Recta con w′", ROJO, 'final', "w′");
  const u = new CobbDouglas(p.alfa, 1 - p.alfa);
  const xs = linspace(p.T / 400, p.T, 300);
  const ic = (c: { R: number; C: number }, nombre: string, color: string, estado: 'inicial' | 'final', et: string) =>
    curvaP(fig, G, xs, muestras(xs, (x) => u.curvaIndiferencia(u.U(c.R, c.C), x), top), nombre, color, estado, et);
  ic(r.A, 'Curva de indiferencia de A', SUAVE, 'inicial', 'u(A)');
  ic(r.C, 'Curva de indiferencia de C', DORADO, 'final', 'u(C)');
  equilibrioP(fig, G, p.T, p.mbar, 'Dotación ω = (T̄, m̄)', 'ω', SUAVE, { lecturas: false, simbolo: 'square' });
  equilibrioP(fig, G, r.A.R, r.A.C, 'A · elección con w', 'A', AZUL, { decX: 2 });
  equilibrioP(fig, G, r.B.R, r.B.C, 'B · compensada', 'B', VERDE, { simbolo: 'square', lecturas: false });
  equilibrioP(fig, G, r.C.R, r.C.C, "C · elección con w′", 'C', ROJO, { simbolo: 'diamond', decX: 2 });
  // Oferta de trabajo.
  const ws = linspace(wmax / 200, wmax, 160);
  const oferta = ws.map((w) => p.T - Math.min(p.T, (p.alfa * (w * p.T + p.mbar)) / w));
  curvaP(fig, S, oferta, ws, 'Oferta de trabajo L(w)', MORADO, 'final', 'L(w)');
  equilibrioP(fig, S, r.L0, p.w0, 'Con w', 'w', AZUL, { lecturas: false });
  equilibrioP(fig, S, r.L1, p.w1, "Con w′", "w′", ROJO, { lecturas: false, simbolo: 'diamond' });
  const panel = [
    resultados([
      lectura(
        'Descomposición de ΔR (ocio)',
        tabla([
          ['Sustitución (A → B)', r.sustitucion],
          ['Ingreso ordinario (renta monetaria fija)', r.ingresoOrdinario],
          ['Efecto dotación (sube el valor de T̄)', r.ingresoDotacion],
          ['Total ΔR', r.total],
          ['Horas trabajadas: L con w → L con w′', `${fmt(r.L0, 2)} → ${fmt(r.L1, 2)}`],
        ]),
      ),
      lectura(
        'Lectura',
        texto(
          'Con dotación, subir el salario encarece el ocio (sustitución: menos ocio) pero también enriquece al trabajador, que vende su tiempo: ' +
            'el efecto dotación va en sentido contrario al ingreso ordinario. Si domina, la oferta de trabajo se curva hacia atrás.',
          'destacado',
        ),
        texto(`Ecuación de Slutsky con dotación: ΔR/Δw = ΔRˢ/Δw + (T̄ − R)·ΔR/Δm.`, 'pequeno texto-suave'),
        refVarian('«La ecuación de Slutsky»: el efecto renta-dotación y la oferta de trabajo.'),
      ),
    ]),
  ];
  return { fig, panel };
}

const compensacion = (p: Params) => p['enfoque'] !== 'dotacion';

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 560,
  grupos: [
    {
      visibleSi: compensacion,
      controles: [
        {
          id: 'caso',
          etiqueta: 'Tipo de bien',
          tipo: 'selector',
          opciones: [
            { valor: 'normal', etiqueta: 'Normal (Cobb-Douglas)' },
            { valor: 'inferior', etiqueta: 'Inferior' },
            { valor: 'giffen', etiqueta: 'Giffen' },
          ],
        },
        {
          id: 'metodo',
          etiqueta: 'Compensación',
          tipo: 'selector',
          opciones: [
            { valor: 'slutsky', etiqueta: 'Slutsky (mismo poder de compra)' },
            { valor: 'hicks', etiqueta: 'Hicks (misma utilidad)' },
          ],
        },
      ],
    },
    {
      visibleSi: (p) => compensacion(p) && p['caso'] === 'normal',
      titulo: 'Preferencias: u = x₁ᵃ·x₂¹⁻ᵃ',
      controles: [{ id: 'a', etiqueta: 'Peso del bien 1, a', tipo: 'slider', min: 0.1, max: 0.9, paso: 0.05 }],
    },
    {
      visibleSi: compensacion,
      titulo: 'Precios y renta',
      controles: [
        { id: 'p1', etiqueta: 'p₁ inicial', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'p1n', etiqueta: 'p₁′ nuevo', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'p2', etiqueta: 'p₂', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'm', etiqueta: 'Renta m', tipo: 'slider', min: 1, max: 100, paso: 0.5 },
      ],
    },
    {
      visibleSi: (p) => p['enfoque'] === 'dotacion',
      titulo: 'Oferta de trabajo: u = R^α·C^(1−α)',
      controles: [
        { id: 'alfa', etiqueta: 'Peso del ocio α', tipo: 'slider', min: 0.1, max: 0.9, paso: 0.05 },
        { id: 'T', etiqueta: 'Tiempo disponible T̄', tipo: 'slider', min: 8, max: 24, paso: 1 },
        { id: 'mbar', etiqueta: 'Renta no laboral m̄', tipo: 'slider', min: 0, max: 200, paso: 5 },
        { id: 'w0', etiqueta: 'Salario inicial w', tipo: 'slider', min: 1, max: 40, paso: 0.5 },
        { id: 'w1', etiqueta: 'Salario nuevo w′', tipo: 'slider', min: 1, max: 40, paso: 0.5 },
      ],
    },
  ],
  planteamientos: {
    param: 'enfoque',
    opciones: [
      { valor: 'compensacion', titulo: 'Slutsky vs. Hicks', resumen: 'Renta monetaria fija: el cambio de p₁ se separa en sustitución (pivote) y renta; la compensación se elige en el panel.' },
      { valor: 'dotacion', titulo: 'Dotación inicial (oferta laboral)', resumen: 'El consumidor vende su tiempo: un salario mayor añade el efecto renta-dotación y puede curvar hacia atrás la oferta de trabajo.' },
    ],
  },
  /** Al cambiar de caso los deslizadores saltan a valores donde el caso se cumple. */
  alCambiar: (anterior, nuevo) =>
    anterior['caso'] === nuevo['caso'] ? null : { ...(CASOS[nuevo['caso'] as string] ?? CASOS['normal']) },
  calcular: (p: Params) => calcular(p as unknown as P),
};
