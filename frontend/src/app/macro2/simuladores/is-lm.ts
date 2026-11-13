import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import {
  ACENTO,
  AZUL,
  DORADO,
  MORADO,
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
import { ParamsISLM2, ResISLM2, equilibrioISLM2, finTrampa, isY, lmR } from '../modelos/islm';
import { delta, refEstandar } from './_comun';
import {
  Choque,
  Panel,
  alCambiarChoques,
  cadena,
  cambio,
  curvaP,
  ejeX,
  ejeY,
  equilibrioP,
  figuraPaneles,
  grupoChoques,
  recorrido,
  sube,
} from './_paneles';

const SIM_ID = 'm2-is-lm';
// IS: Y = (350 + G − 0.75·T − 25·r)/0.25; LM: r = (0.5·Y − M/P)/25. Con G = 200, M/P = 500: Y* = 1200, r* = 4 %.
const DEF = {
  C0: 150,
  c: 0.75,
  I0: 200,
  b: 25,
  G: 200,
  T: 200,
  m: 500,
  k: 0.5,
  h: 25,
  choque: 'ninguno' as string,
  dG: 0,
  dT: 0,
  dm: 0,
};
type P = typeof DEF;

export const CHOQUES: Choque[] = [
  { valor: 'ninguno', etiqueta: 'Sin choque', cambios: {} },
  { valor: 'fiscal', etiqueta: '+ Expansión fiscal (ΔG = +100)', cambios: { dG: 100 } },
  { valor: 'impuestos', etiqueta: '− Impuestos (ΔT = −100)', cambios: { dT: -100 } },
  { valor: 'contraccion', etiqueta: '− Contracción monetaria (ΔM/P = −100)', cambios: { dm: -100 } },
  { valor: 'expansion', etiqueta: '+ Expansión monetaria (ΔM/P = +200)', cambios: { dm: 200 } },
];
const DELTAS = ['dG', 'dT', 'dm'];

export function escenarios(p: P): [ParamsISLM2, ParamsISLM2] {
  const base: ParamsISLM2 = {
    C0: p.C0,
    c: p.c,
    I0: p.I0,
    b: p.b,
    G: p.G,
    T: p.T,
    m: p.m,
    k: p.k,
    h: p.h,
  };
  return [base, { ...base, G: p.G + p.dG, T: p.T + p.dT, m: p.m + p.dm }];
}

/** Gasto agregado planeado AE = C₀ + c·(Y − T) + I₀ − b·r + G (cruz keynesiana a la tasa r). */
export const gastoAE = (q: ParamsISLM2, Y: number, r: number): number =>
  q.C0 + q.c * (Y - q.T) + q.I0 - q.b * r + q.G;

/** Tasa que vacía el mercado de dinero dados Y y la oferta real M (piso 0 = trampa de liquidez). */
export const demandaDineroR = (q: ParamsISLM2, Y: number, M: number): number => Math.max(0, (q.k * Y - M) / q.h);

export interface PasosISLM {
  r0: ResISLM2;
  r2: ResISLM2;
  /** Ajuste parcial: fiscal a r constante (cruz keynesiana) o monetario a Y constante (efecto liquidez). */
  e1: { Y: number; r: number; tipo: 'fiscal' | 'monetario' } | null;
}

/** Equilibrios E₀, E₁ (intermedio) y E₂ (final). */
export function pasos(p: P): PasosISLM {
  const [b, n] = escenarios(p);
  if (!(b.m > 0) || !(n.m > 0)) throw new ErrorParametro('La oferta real de dinero M/P debe ser positiva.');
  const r0 = equilibrioISLM2(b);
  const r2 = equilibrioISLM2(n);
  const fiscal = p.dG !== 0 || p.dT !== 0;
  const monetario = p.dm !== 0;
  let e1: PasosISLM['e1'] = null;
  if (fiscal) e1 = { Y: isY(n, r0.r), r: r0.r, tipo: 'fiscal' };
  else if (monetario && n.h > 0) e1 = { Y: r0.Y, r: lmR(n, r0.Y), tipo: 'monetario' };
  return { r0, r2, e1 };
}

export function calcular(p: P): Simulacion {
  const [b, n] = escenarios(p);
  let s: PasosISLM;
  try {
    s = pasos(p);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const { r0, r2: r1, e1 } = s;
  const fiscal = p.dG !== 0 || p.dT !== 0;
  const monetario = p.dm !== 0;
  const choque = fiscal || monetario;
  const ymax = Math.max(r0.Y, r1.Y, e1?.Y ?? 0, 1) * 1.5;
  const rmax = Math.max(r0.r, r1.r, e1?.r ?? 0, 4) * 2;
  const rlo = -rmax * 0.03;
  const mmax = Math.max(b.k * ymax * 0.75, b.m, n.m) * 1.25;

  const C: Panel = {
    id: '',
    titulo: 'C · Equilibrio IS–LM',
    tituloX: 'Producto Y',
    tituloY: 'Tasa de interés r (%)',
    rangoX: [0, ymax],
    rangoY: [rlo, rmax],
    dominio: { x: [0, 0.6], y: [0, 0.44] },
    movil: { x: [0, 1], y: [0.355, 0.63] },
  };
  const A: Panel = {
    id: '2',
    titulo: 'A · Cruz keynesiana (deriva la IS)',
    tituloX: 'Producto Y',
    tituloY: 'Gasto planeado AE',
    rangoX: [0, ymax],
    rangoY: [0, ymax],
    dominio: { x: [0, 0.6], y: [0.58, 1] },
    movil: { x: [0, 1], y: [0.725, 1] },
    enlaceX: ejeX(C),
  };
  const B: Panel = {
    id: '3',
    titulo: 'B · Mercado de dinero (deriva la LM)',
    tituloX: 'Saldos reales M/P',
    tituloY: 'r (%)',
    rangoX: [0, mmax],
    rangoY: [rlo, rmax],
    dominio: { x: [0.7, 1], y: [0, 0.44] },
    movil: { x: [0, 1], y: [0, 0.265] },
    enlaceY: ejeY(C),
  };
  const fig = figuraPaneles(SIM_ID, [C, A, B], 1080);

  // ---------- Panel C: IS–LM
  const rs = linspace(0, rmax, 90);
  const ys = linspace(0, ymax, 200);
  const trazarIS = (q: typeof b, et: string, color: string, estado: 'inicial' | 'final') =>
    curvaP(fig, C, rs.map((r) => isY(q, r)), rs, 'IS', color, estado, et);
  const trazarLM = (q: typeof b, et: string, color: string, estado: 'inicial' | 'final') => {
    if (q.h === 0) {
      const yv = q.m / q.k;
      curvaP(fig, C, [yv, yv], [0, rmax], 'LM', color, estado, et);
    } else curvaP(fig, C, ys, ys.map((y) => lmR(q, y)), 'LM', color, estado, et);
  };
  if (fiscal) trazarIS(b, 'IS₀', AZUL, 'inicial');
  trazarIS(n, fiscal ? 'IS₁' : 'IS', fiscal ? VERDE : AZUL, 'final');
  if (monetario) trazarLM(b, 'LM₀', ROJO, 'inicial');
  trazarLM(n, monetario ? 'LM₁' : 'LM', monetario ? MORADO : ROJO, 'final');
  // Trampa de liquidez: tramo plano de la LM en r = 0.
  const yTrampa = n.h > 0 ? Math.min(finTrampa(n), ymax) : 0;
  if (yTrampa > 0)
    fig.data.push({
      type: 'scatter',
      x: [0, yTrampa],
      y: [0, 0],
      xaxis: ejeX(C),
      yaxis: ejeY(C),
      mode: 'lines',
      name: 'Trampa de liquidez (LM plana en r = 0)',
      line: { color: ACENTO, width: 9 },
      opacity: 0.35,
      hovertemplate: 'Trampa de liquidez: r = 0 hasta Y = %{x:.0f}<extra></extra>',
    });

  // ---------- Panel A: cruz keynesiana
  curvaP(fig, A, [0, ymax], [0, ymax], 'AE = Y (45°)', SUAVE, 'final', '45°');
  const trazarAE = (q: typeof b, r: number, et: string, color: string, estado: 'inicial' | 'intermedio' | 'final') =>
    curvaP(fig, A, ys, ys.map((y) => gastoAE(q, y, r)), `AE (r = ${fmt(r, 2)} %)`, color, estado, et);
  if (choque) trazarAE(b, r0.r, 'AE₀', AZUL, 'inicial');
  if (e1?.tipo === 'fiscal') trazarAE(n, r0.r, 'AE₁', VERDE, 'intermedio');
  trazarAE(n, r1.r, choque ? 'AE₂' : 'AE', choque ? DORADO : AZUL, 'final');

  // ---------- Panel B: mercado de dinero (preferencia por la liquidez)
  const ms = linspace(0, mmax, 160);
  const trazarMd = (q: typeof b, Y: number, et: string, color: string, estado: 'inicial' | 'intermedio' | 'final') => {
    if (q.h === 0) curvaP(fig, B, [q.k * Y, q.k * Y], [0, rmax], `Mᵈ (Y = ${fmt(Y, 0)})`, color, estado, et);
    else curvaP(fig, B, ms, ms.map((M) => demandaDineroR(q, Y, M)), `L(Y, r) con Y = ${fmt(Y, 0)}`, color, estado, et);
  };
  const trazarMs = (m: number, et: string, color: string, estado: 'inicial' | 'final') =>
    curvaP(fig, B, [m, m], [rlo, rmax], 'Oferta M/P', color, estado, et);
  const yCambio = Math.abs(r1.Y - r0.Y) > 1e-9;
  if (yCambio) trazarMd(b, r0.Y, 'L₀', AZUL, 'inicial');
  if (e1?.tipo === 'fiscal') trazarMd(n, e1.Y, 'L₁', VERDE, 'intermedio');
  trazarMd(n, r1.Y, yCambio ? 'L₂' : 'L', yCambio ? DORADO : AZUL, 'final');
  if (monetario) trazarMs(b.m, '(M/P)₀', ROJO, 'inicial');
  trazarMs(n.m, monetario ? '(M/P)₁' : 'M/P', monetario ? MORADO : ROJO, 'final');

  // ---------- Equilibrios y recorrido E₀ → E₁ → E₂
  const nombre0 = choque ? 'Equilibrio inicial' : 'Equilibrio (Y*, r*)';
  const color0 = choque ? SUAVE : DORADO;
  equilibrioP(fig, C, r0.Y, r0.r, nombre0, 'E₀', color0);
  equilibrioP(fig, A, r0.Y, r0.Y, nombre0, 'E₀', color0, { lecturas: false });
  equilibrioP(fig, B, b.m, r0.r, nombre0, 'E₀', color0, { lecturas: false });
  if (choque) {
    if (e1) {
      const n1 = e1.tipo === 'fiscal' ? 'Intermedio: r constante (sin expulsión)' : 'Intermedio: efecto liquidez (Y constante)';
      equilibrioP(fig, C, e1.Y, e1.r, n1, 'E₁', VERDE, { simbolo: 'square', lecturas: false });
      if (e1.tipo === 'fiscal') equilibrioP(fig, A, e1.Y, e1.Y, n1, 'E₁', VERDE, { simbolo: 'square', lecturas: false });
      else equilibrioP(fig, B, n.m, e1.r, n1, 'E₁', VERDE, { simbolo: 'square', lecturas: false });
    }
    equilibrioP(fig, C, r1.Y, r1.r, 'Equilibrio final', 'E₂', DORADO, { simbolo: 'diamond' });
    equilibrioP(fig, A, r1.Y, r1.Y, 'Equilibrio final', 'E₂', DORADO, { simbolo: 'diamond', lecturas: false });
    equilibrioP(fig, B, n.m, r1.r, 'Equilibrio final', 'E₂', DORADO, { simbolo: 'diamond', lecturas: false });
    const p1: [number, number] | null = e1 ? [e1.Y, e1.r] : null;
    recorrido(fig, C, [[r0.Y, r0.r], p1, [r1.Y, r1.r]], DORADO);
    recorrido(fig, A, [[r0.Y, r0.Y], e1?.tipo === 'fiscal' ? [e1.Y, e1.Y] : null, [r1.Y, r1.Y]], DORADO);
    recorrido(fig, B, [[b.m, r0.r], e1?.tipo === 'monetario' ? [n.m, e1.r] : null, [n.m, r1.r]], DORADO);
  }

  // ---------- Panel de resultados
  const lecturas: Bloque[] = [];
  if (r1.trampa || r0.trampa)
    lecturas.push(
      aviso(
        'Trampa de liquidez: la tasa está en 0 % y la LM es plana. Más dinero ya no baja r ni mueve el producto; la política fiscal recupera el multiplicador completo 1/(1 − c).',
      ),
    );
  const ySinExpulsion = isY(n, r0.r);
  const hayExpulsion = fiscal && Math.abs(ySinExpulsion - r1.Y) > 1e-6;
  if (hayExpulsion)
    lecturas.push(
      texto(
        `Efecto expulsión: con r fija el producto llegaría a ${fmt(ySinExpulsion, 2)} (E₁). La subida de r recorta la inversión privada en ` +
          `${fmt(Math.abs(delta(r1.I - r0.I)), 2)} (de ${fmt(r0.I, 2)} a ${fmt(r1.I, 2)}).`,
        'pequeno texto-suave',
      ),
    );
  if (!choque)
    lecturas.push(
      texto(
        'Pulsa un botón de choque: E₀ queda en gris punteado, E₁ (ajuste parcial) en raya-punto y E₂ (final) en sólido, en los tres paneles.',
        'pequeno texto-suave',
      ),
    );
  if (r1.I < 0)
    lecturas.push(aviso('Con esta tasa la inversión calculada es negativa: la calibración sale del rango económico.'));

  const bloques: Bloque[] = [];
  if (choque) bloques.push(cadenaISLM(p, s));
  bloques.push(
    lectura(
      'Equilibrio (Y*, r*)',
      tabla(
        [
          ['Producto Y*', r0.Y, r1.Y],
          ['Tasa de interés r* (%)', r0.r, r1.r],
          ['Consumo C', r0.C, r1.C],
          ['Inversión I = I₀ − b·r', r0.I, r1.I],
        ],
        ['', 'E₀ inicial', 'E₂ final'],
      ),
    ),
    lectura(
      'Multiplicadores',
      tabla([
        ['Fiscal dY/dG (con LM)', r1.multFiscal],
        ['Keynesiano 1/(1 − c)', r1.multKeynes],
        ['Monetario dY/d(M/P)', r1.multMonetario],
      ]),
    ),
    lectura(
      'Lectura',
      ...lecturas,
      refEstandar(
        'IS-LM de economía cerrada (Hicks) derivado de la cruz keynesiana y de la preferencia por la liquidez; en Krugman y Obstfeld el análisis equivalente es el modelo DD-AA de economía abierta.',
      ),
    ),
  );
  return { fig, panel: [resultados(bloques)] };
}

/** Cadena causal del choque (fiscal o monetario) con los números del simulador. */
export function cadenaISLM(p: P, s: PasosISLM): Bloque {
  const { r0, r2, e1 } = s;
  const fiscal = p.dG !== 0 || p.dT !== 0;
  const partes: string[] = [];
  if (p.dG !== 0) partes.push(`ΔG = ${fmt(p.dG, 0)} ${p.dG > 0 ? '> 0' : '< 0'}`);
  if (p.dT !== 0) partes.push(`ΔT = ${fmt(p.dT, 0)} ${p.dT > 0 ? '> 0' : '< 0'}`);
  if (p.dm !== 0) partes.push(`Δ(M/P) = ${fmt(p.dm, 0)} ${p.dm > 0 ? '> 0' : '< 0'}`);
  const dY = r2.Y - r0.Y;
  const dr = r2.r - r0.r;
  const dI = r2.I - r0.I;
  let trans: string;
  if (fiscal) {
    const ae = (p.dG > 0 || p.dT < 0) && !(p.dG < 0) ? '↑' : '↓';
    trans =
      `AE ${ae} → Y ${sube(dY)} (E₁: ${fmt(e1?.Y ?? r0.Y, 2)} a r constante) → Mᵈ ${sube(dY)} → r ${sube(dr)} → I ${sube(dI)}` +
      (r2.trampa ? ' (en la trampa de liquidez r no se mueve: no hay expulsión).' : '.');
  } else {
    trans =
      `M/P ${sube(p.dm)} → exceso de ${p.dm > 0 ? 'oferta' : 'demanda'} de dinero → r ${sube(dr)} (E₁: ${fmt(e1?.r ?? r0.r, 2)} % a Y constante) → I ${sube(dI)} → AE ${sube(dI)} → Y ${sube(dY)}.`;
    if (r0.trampa && r2.trampa) trans = 'M/P cambia, pero con r = 0 la demanda de dinero absorbe todo: r y la inversión no se mueven (trampa de liquidez).';
  }
  let neto = `Corto plazo: Y ${cambio(r0.Y, r2.Y)}; r ${cambio(r0.r, r2.r)} %.`;
  if (fiscal && e1 && Math.abs(e1.Y - r2.Y) > 1e-6)
    neto += ` Expulsión parcial: la inversión cae ${fmt(Math.abs(dI), 2)} y Y sube ${fmt(dY, 2)} en vez de ${fmt(e1.Y - r0.Y, 2)}.`;
  return cadena(
    `Choque: ${partes.join(', ')}.`,
    trans,
    neto,
    'Largo plazo: con precios fijos el IS–LM no tiene ajuste de precios; el regreso a Yₚ (autocorrección) se ve en el simulador DA-OA.',
  );
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 720,
  grupos: [
    grupoChoques(CHOQUES),
    {
      titulo: 'Mercado de bienes (IS)',
      controles: [
        { id: 'C0', etiqueta: 'Consumo autónomo C₀', tipo: 'slider', min: 0, max: 400, paso: 10 },
        { id: 'c', etiqueta: 'Propensión a consumir c', tipo: 'slider', min: 0, max: 0.9, paso: 0.01 },
        { id: 'I0', etiqueta: 'Inversión autónoma I₀', tipo: 'slider', min: 0, max: 400, paso: 10 },
        { id: 'b', etiqueta: 'Sensibilidad de la inversión a r, b', tipo: 'slider', min: 0, max: 60, paso: 1 },
        { id: 'G', etiqueta: 'Gasto público G', tipo: 'slider', min: 0, max: 500, paso: 10 },
        { id: 'T', etiqueta: 'Impuestos T', tipo: 'slider', min: 0, max: 500, paso: 10 },
      ],
    },
    {
      titulo: 'Mercado de dinero (LM): M/P = k·Y − h·r',
      controles: [
        { id: 'm', etiqueta: 'Oferta real de dinero M/P', tipo: 'slider', min: 50, max: 1200, paso: 10 },
        { id: 'k', etiqueta: 'Sensibilidad al ingreso k', tipo: 'slider', min: 0.1, max: 1, paso: 0.05 },
        { id: 'h', etiqueta: 'Sensibilidad a la tasa h', tipo: 'slider', min: 0, max: 100, paso: 1 },
      ],
    },
    {
      titulo: 'Tamaño del choque',
      controles: [
        { id: 'dG', etiqueta: 'ΔG', tipo: 'slider', min: -200, max: 200, paso: 10 },
        { id: 'dT', etiqueta: 'ΔT', tipo: 'slider', min: -200, max: 200, paso: 10 },
        { id: 'dm', etiqueta: 'Δ(M/P)', tipo: 'slider', min: -400, max: 600, paso: 10 },
      ],
    },
  ],
  alCambiar: alCambiarChoques(CHOQUES, DELTAS),
  calcular: (p: Params) => calcular(p as unknown as P),
};
