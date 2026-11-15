import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import {
  AZUL,
  DORADO,
  NARANJA,
  ROJO,
  SUAVE,
  VERDE,
  aviso,
  figuraVacia,
  lectura,
  resultados,
  tabla,
  texto,
} from '../../core/tema';
import { ParamsSolow, ResSolow, estadoEstacionario, produccion, reposicion } from '../modelos/solow';
import { refEstandar } from './_comun';
import {
  Choque,
  Panel,
  alCambiarChoques,
  cadena,
  cambio,
  curvaP,
  ejeX,
  equilibrioP,
  figuraPaneles,
  grupoChoques,
  recorrido,
} from './_paneles';

const SIM_ID = 'm2-solow';
// y = k^0.5, s = 0.3, n + g + δ = 0.05 + 0.02 + 0.08 = 0.15 ⇒ k* = (0.3/0.15)² = 4, y* = 2. Regla de oro: s = 0.5, k = 11.11.
const DEF = {
  A: 1,
  alpha: 0.5,
  s: 0.3,
  delta: 0.08,
  n: 0.05,
  g: 0.02,
  choque: 'ninguno' as string,
  ds: 0,
  dn: 0,
  dA: 0,
};
type P = typeof DEF;

export const CHOQUES: Choque[] = [
  { valor: 'ninguno', etiqueta: 'Sin choque', cambios: {} },
  { valor: 'ahorro', etiqueta: '+ Tasa de ahorro (Δs = +0.15)', cambios: { ds: 0.15 } },
  { valor: 'poblacion', etiqueta: '+ Crecimiento de la población (Δn = +0.02)', cambios: { dn: 0.02 } },
  { valor: 'tecnologia', etiqueta: '+ Productividad (ΔA = +0.3)', cambios: { dA: 0.3 } },
  { valor: 'desahorro', etiqueta: '− Tasa de ahorro (Δs = −0.1)', cambios: { ds: -0.1 } },
];
const DELTAS = ['ds', 'dn', 'dA'];

export function escenarios(p: P): [ParamsSolow, ParamsSolow] {
  const base: ParamsSolow = { A: p.A, alpha: p.alpha, s: p.s, delta: p.delta, n: p.n, g: p.g };
  return [base, { ...base, s: p.s + p.ds, n: p.n + p.dn, A: p.A + p.dA }];
}

export function calcular(p: P): Simulacion {
  const [b, n] = escenarios(p);
  let r0: ResSolow;
  let r1: ResSolow;
  try {
    r0 = estadoEstacionario(b);
    r1 = estadoEstacionario(n);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const choque = p.ds !== 0 || p.dn !== 0 || p.dA !== 0;
  const kmax = Math.max(r0.k, r1.k, Math.min(r1.kOro, Math.max(r0.k, r1.k) * 4), 1e-6) * 1.6;
  const ks = linspace(0, kmax, 200);
  const ytop = Math.max(produccion(n, kmax), produccion(b, kmax)) * 1.08;
  const ibot = Math.max(b.s * produccion(b, kmax), n.s * produccion(n, kmax), reposicion(b) * kmax, reposicion(n) * kmax) * 1.08;
  // E₁: el choque llega con k todavía en k₀*.
  const k0 = r0.k;
  const y1 = produccion(n, k0);
  const i1 = n.s * y1;

  const ARR: Panel = {
    id: '2',
    titulo: 'A · Función de producción y = A·f(k)',
    tituloX: '',
    tituloY: 'Producto por trabajador efectivo y',
    rangoX: [0, kmax],
    rangoY: [0, ytop],
    dominio: { x: [0, 1], y: [0.56, 1] },
    movil: { x: [0, 1], y: [0.56, 1] },
  };
  const ABA: Panel = {
    id: '',
    titulo: 'B · Inversión s·A·f(k) frente a reposición (n + g + δ)·k',
    tituloX: 'Capital por trabajador efectivo k',
    tituloY: 'Inversión y reposición',
    rangoX: [0, kmax],
    rangoY: [0, ibot],
    dominio: { x: [0, 1], y: [0, 0.44] },
    movil: { x: [0, 1], y: [0, 0.44] },
  };
  ARR.enlaceX = ejeX(ABA);
  const fig = figuraPaneles(SIM_ID, [ABA, ARR], 820);
  fig.layout.xaxis2.showticklabels = false;

  const tope = (v: number, m: number) => (v <= m * 1.5 ? v : null);
  // ---------- Panel A (arriba)
  if (p.dA !== 0) curvaP(fig, ARR, ks, ks.map((k) => tope(produccion(b, k), ytop)), 'y = A·kᵅ', AZUL, 'inicial', 'f₀');
  curvaP(fig, ARR, ks, ks.map((k) => tope(produccion(n, k), ytop)), 'y = A·kᵅ', AZUL, 'final', p.dA !== 0 ? 'f₁' : 'y = A·kᵅ');
  // Reposición también arriba (fina): la regla de oro maximiza la distancia f(k) − (n + g + δ)·k.
  curvaP(fig, ARR, [0, kmax], [0, Math.min(reposicion(n) * kmax, ytop * 1.5)], '(n + g + δ)·k', ROJO, 'intermedio');
  // ---------- Panel B (abajo)
  const invCambia = p.ds !== 0 || p.dA !== 0;
  if (invCambia) curvaP(fig, ABA, ks, ks.map((k) => tope(b.s * produccion(b, k), ibot)), 's·A·f(k)', VERDE, 'inicial', 'sf₀');
  curvaP(fig, ABA, ks, ks.map((k) => tope(n.s * produccion(n, k), ibot)), 's·A·f(k)', VERDE, 'final', invCambia ? 'sf₁' : 's·f(k)');
  if (p.dn !== 0) curvaP(fig, ABA, [0, kmax], [0, reposicion(b) * kmax], '(n + g + δ)·k', ROJO, 'inicial', 'rep₀');
  curvaP(fig, ABA, [0, kmax], [0, reposicion(n) * kmax], '(n + g + δ)·k', ROJO, 'final', p.dn !== 0 ? 'rep₁' : '(n+g+δ)k');

  // Regla de oro en ambos paneles.
  if (r1.kOro <= kmax) {
    fig.data.push({
      type: 'scatter',
      x: [r1.kOro, r1.kOro],
      y: [reposicion(n) * r1.kOro, r1.yOro],
      xaxis: 'x2',
      yaxis: 'y2',
      mode: 'lines',
      name: `Consumo de la regla de oro (s = ${fmt(r1.sOro, 2)})`,
      line: { color: NARANJA, width: 3 },
      hovertemplate: `c oro = ${fmt(r1.cOro, 3)}<extra></extra>`,
    });
    equilibrioP(fig, ARR, r1.kOro, r1.yOro, 'Regla de oro: f′(k) = n + g + δ', 'k oro', NARANJA, { simbolo: 'star', decX: 3, decY: 3, lecturas: false });
    // En k oro el estado estacionario exige s_oro·f(k) = (n + g + δ)·k: la estrella va sobre la recta de
    // reposición (donde la cortaría la curva de inversión con s = α), no sobre s·f(k) con el s actual.
    equilibrioP(fig, ABA, r1.kOro, reposicion(n) * r1.kOro, 'k de la regla de oro: s_oro·f(k) = (n + g + δ)·k', 'k oro', NARANJA, {
      simbolo: 'star',
      decX: 3,
      decY: 3,
      lecturas: false,
    });
  }
  // Consumo de estado estacionario: distancia entre f(k*) y s·f(k*) (arriba).
  fig.data.push({
    type: 'scatter',
    x: [r1.k, r1.k],
    y: [r1.i, r1.y],
    xaxis: 'x2',
    yaxis: 'y2',
    mode: 'lines',
    name: 'Consumo c* = (1 − s)·y*',
    line: { color: DORADO, width: 2 },
    hovertemplate: `c* = ${fmt(r1.c, 3)}<extra></extra>`,
  });

  const op = { decX: 3, decY: 3 };
  if (choque) {
    equilibrioP(fig, ABA, r0.k, r0.i, 'Estado estacionario inicial', 'E₀', SUAVE, op);
    equilibrioP(fig, ARR, r0.k, r0.y, 'Estado estacionario inicial', 'E₀', SUAVE, { ...op, lecturas: false });
    if (Math.abs(i1 - r0.i) > 1e-9) {
      equilibrioP(fig, ABA, k0, i1, 'Impacto: el choque llega con k = k₀*', 'E₁', VERDE, { ...op, simbolo: 'square', lecturas: false });
      equilibrioP(fig, ARR, k0, y1, 'Impacto: el choque llega con k = k₀*', 'E₁', VERDE, { ...op, simbolo: 'square', lecturas: false });
    }
    recorrido(fig, ABA, [[r0.k, r0.i], Math.abs(i1 - r0.i) > 1e-9 ? [k0, i1] : null, [r1.k, r1.i]], DORADO);
    recorrido(fig, ARR, [[r0.k, r0.y], Math.abs(y1 - r0.y) > 1e-9 ? [k0, y1] : null, [r1.k, r1.y]], DORADO);
  }
  equilibrioP(fig, ABA, r1.k, r1.i, choque ? 'Nuevo estado estacionario' : 'Estado estacionario s·f(k*) = (n + g + δ)·k*', choque ? 'E₂' : 'k*', DORADO, {
    ...op,
    simbolo: 'diamond',
  });
  equilibrioP(fig, ARR, r1.k, r1.y, choque ? 'Nuevo estado estacionario' : 'Producción y*', choque ? 'E₂' : 'y*', DORADO, {
    ...op,
    simbolo: 'diamond',
  });

  const lecturas: Bloque[] = [];
  const dif = n.s - r1.sOro;
  lecturas.push(
    texto(
      Math.abs(dif) < 1e-9
        ? 'La tasa de ahorro es la de la regla de oro: el consumo de estado estacionario es el máximo posible.'
        : dif < 0
          ? `s = ${fmt(n.s, 2)} < s oro = ${fmt(r1.sOro, 2)}: ahorrar más elevaría el consumo de largo plazo.`
          : `s = ${fmt(n.s, 2)} > s oro = ${fmt(r1.sOro, 2)}: hay exceso de capital (ineficiencia dinámica); ahorrar menos elevaría el consumo hoy y mañana.`,
      'pequeno texto-suave',
    ),
    texto(
      `Convergencia: λ = (1 − α)(n + g + δ) = ${fmt(r1.lambda, 4)}; la mitad de la distancia a k* se cierra en unos ${fmt(r1.vidaMedia, 1)} períodos.`,
      'pequeno texto-suave',
    ),
  );
  if (!choque)
    lecturas.push(
      texto('Pulsa un botón de choque: E₀ queda gris, E₁ marca el impacto con k = k₀* y E₂ el nuevo estado estacionario.', 'pequeno texto-suave'),
    );

  const bloques: Bloque[] = [];
  if (choque) bloques.push(cadenaSolow(p, r0, r1, i1));
  bloques.push(
    lectura(
      'Estado estacionario',
      tabla(
        [
          ['Capital por trabajador efectivo k*', r0.k, r1.k],
          ['Producción y*', r0.y, r1.y],
          ['Inversión s·y*', r0.i, r1.i],
          ['Consumo c*', r0.c, r1.c],
        ],
        ['', 'E₀ inicial', 'E₂ final'],
      ),
    ),
    lectura(
      'Regla de oro',
      tabla([
        ['Ahorro de la regla de oro s = α', r1.sOro],
        ['k de la regla de oro', r1.kOro],
        ['Consumo máximo c oro', r1.cOro],
      ]),
    ),
    lectura('Lectura', ...lecturas, refEstandar('modelo de Solow-Swan con Cobb-Douglas y progreso técnico que aumenta el trabajo; Krugman y Obstfeld (2006) no lo cubre.')),
  );
  return { fig, panel: [resultados(bloques)] };
}

export function cadenaSolow(p: P, r0: ResSolow, r1: ResSolow, i1: number): Bloque {
  const partes: string[] = [];
  if (p.ds !== 0) partes.push(`Δs = ${fmt(p.ds, 2)}`);
  if (p.dn !== 0) partes.push(`Δn = ${fmt(p.dn, 3)}`);
  if (p.dA !== 0) partes.push(`ΔA = ${fmt(p.dA, 2)}`);
  const rep0 = (p.delta + p.n + p.g) * r0.k;
  const sube = r1.k > r0.k;
  const trans =
    p.dn !== 0 && p.ds === 0 && p.dA === 0
      ? `La reposición (n + g + δ)·k ${p.dn > 0 ? 'sube' : 'baja'}: en k₀* la inversión ya ${p.dn > 0 ? 'no alcanza' : 'supera'} a la reposición → k ${sube ? '↑' : '↓'} → y ${sube ? '↑' : '↓'} hasta el nuevo k*.`
      : `En k₀* = ${fmt(r0.k, 3)} la inversión pasa a ${fmt(i1, 3)} frente a una reposición de ${fmt(rep0, 3)} → ` +
        `${i1 > rep0 ? 'Δk > 0 → k ↑ → y ↑' : 'Δk < 0 → k ↓ → y ↓'} hasta que s·f(k) = (n + g + δ)·k.`;
  return cadena(
    `Choque: ${partes.join(', ')}.`,
    trans,
    `Estado estacionario: k* ${cambio(r0.k, r1.k, 3)}; y* ${cambio(r0.y, r1.y, 3)}; c* ${cambio(r0.c, r1.c, 3)}.`,
    `Largo plazo: es un efecto de nivel. En el nuevo estado estacionario y por trabajador efectivo vuelve a crecer a 0 y el producto por trabajador a g = ${fmt(p.g, 3)}; solo el progreso técnico sostiene el crecimiento.`,
  );
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 700,
  grupos: [
    grupoChoques(CHOQUES),
    {
      titulo: 'Tecnología: y = A·kᵅ',
      controles: [
        { id: 'A', etiqueta: 'Productividad total de los factores A', tipo: 'slider', min: 0.5, max: 3, paso: 0.05 },
        { id: 'alpha', etiqueta: 'Participación del capital α', tipo: 'slider', min: 0.1, max: 0.8, paso: 0.05 },
      ],
    },
    {
      titulo: 'Acumulación: Δk = s·f(k) − (n + g + δ)·k',
      controles: [
        { id: 's', etiqueta: 'Tasa de ahorro s', tipo: 'slider', min: 0.05, max: 0.9, paso: 0.01 },
        { id: 'delta', etiqueta: 'Depreciación δ', tipo: 'slider', min: 0, max: 0.2, paso: 0.01 },
        { id: 'n', etiqueta: 'Crecimiento de la población n', tipo: 'slider', min: 0, max: 0.1, paso: 0.005 },
        { id: 'g', etiqueta: 'Progreso técnico g', tipo: 'slider', min: 0, max: 0.06, paso: 0.005 },
      ],
    },
    {
      titulo: 'Tamaño del choque',
      controles: [
        { id: 'ds', etiqueta: 'Δs', tipo: 'slider', min: -0.2, max: 0.4, paso: 0.01 },
        { id: 'dn', etiqueta: 'Δn', tipo: 'slider', min: -0.04, max: 0.05, paso: 0.005 },
        { id: 'dA', etiqueta: 'ΔA', tipo: 'slider', min: -0.4, max: 1, paso: 0.05 },
      ],
    },
  ],
  alCambiar: alCambiarChoques(CHOQUES, DELTAS),
  calcular: (p: Params) => calcular(p as unknown as P),
};
