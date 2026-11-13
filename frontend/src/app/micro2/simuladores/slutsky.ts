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
const DEF = { caso: 'normal' as string, metodo: 'slutsky' as string, a: 0.5, ...CASOS['normal'] };
type P = typeof DEF;

export const utilidadDe = (caso: string, a: number): Utilidad =>
  caso === 'normal' ? new CobbDouglas(a, 1 - a) : new Giffen();

const NOMBRE_CASO: Record<string, string> = {
  normal: 'Bien normal',
  inferior: 'Bien inferior (no Giffen)',
  giffen: 'Bien Giffen',
};

export function calcular(p: P): Simulacion {
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

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 560,
  grupos: [
    {
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
      visibleSi: (p) => p['caso'] === 'normal',
      titulo: 'Preferencias: u = x₁ᵃ·x₂¹⁻ᵃ',
      controles: [{ id: 'a', etiqueta: 'Peso del bien 1, a', tipo: 'slider', min: 0.1, max: 0.9, paso: 0.05 }],
    },
    {
      titulo: 'Precios y renta',
      controles: [
        { id: 'p1', etiqueta: 'p₁ inicial', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'p1n', etiqueta: 'p₁′ nuevo', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'p2', etiqueta: 'p₂', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'm', etiqueta: 'Renta m', tipo: 'slider', min: 1, max: 100, paso: 0.5 },
      ],
    },
  ],
  /** Al cambiar de caso los deslizadores saltan a valores donde el caso se cumple. */
  alCambiar: (anterior, nuevo) =>
    anterior['caso'] === nuevo['caso'] ? null : { ...(CASOS[nuevo['caso'] as string] ?? CASOS['normal']) },
  calcular: (p: Params) => calcular(p as unknown as P),
};
