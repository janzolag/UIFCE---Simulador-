import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import {
  AZUL,
  DORADO,
  MORADO,
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
import { Movilidad, ParamsDDAA, Regimen, ResDDAA, curvaAA, curvaDD, equilibrioDDAA } from '../modelos/ddaa';
import { refKO } from './_comun';
import {
  Choque,
  Estado,
  Panel,
  alCambiarChoques,
  cadena,
  cambio,
  curvaP,
  ejeY,
  equilibrioP,
  figuraPaneles,
  grupoChoques,
  recorrido,
} from './_paneles';

const SIM_ID = 'm2-dd-aa';
// DD: Y = (250 + 100·E)/0.35; AA: M/P = 0.5·Y − 10·R con R = R* + 100·(Eᵉ − E)/E.
// Con M/P = 460, R* = 4 % y Eᵉ = 1: Y* = 1,000, E* = 1, R = 4 %.
const DEF = {
  regimen: 'flotante' as string,
  movilidad: 'perfecta' as string,
  C0: 100,
  c: 0.75,
  T: 200,
  I: 150,
  G: 200,
  n0: -50,
  x: 100,
  m: 0.1,
  Mp: 460,
  k: 0.5,
  h: 10,
  Rstar: 4,
  Ee: 1,
  E0: 1,
  mu: 50,
  choque: 'ninguno' as string,
  dG: 0,
  dMp: 0,
  dRstar: 0,
  dn0: 0,
  dEe: 0,
  dE0: 0,
};
type P = typeof DEF;

export const CHOQUES: Choque[] = [
  { valor: 'ninguno', etiqueta: 'Sin choque', cambios: {} },
  { valor: 'fiscal', etiqueta: '+ Expansión fiscal (ΔG = +70)', cambios: { dG: 70 } },
  { valor: 'monetaria', etiqueta: '+ Expansión monetaria (ΔM/P = +20)', cambios: { dMp: 20 } },
  { valor: 'externa', etiqueta: '+ Tasa externa (ΔR* = +2)', cambios: { dRstar: 2 } },
  { valor: 'devaluacion', etiqueta: '+ Devaluación (fijo) o depreciación esperada (flotante)', cambios: { dE0: 0.1, dEe: 0.1 } },
];
const DELTAS = ['dG', 'dMp', 'dRstar', 'dn0', 'dEe', 'dE0'];

export function escenarios(p: P): [ParamsDDAA, ParamsDDAA] {
  const base: ParamsDDAA = {
    regimen: (p.regimen === 'fijo' ? 'fijo' : 'flotante') as Regimen,
    movilidad: (p.movilidad === 'imperfecta' ? 'imperfecta' : 'perfecta') as Movilidad,
    C0: p.C0,
    c: p.c,
    T: p.T,
    I: p.I,
    G: p.G,
    n0: p.n0,
    x: p.x,
    m: p.m,
    Mp: p.Mp,
    k: p.k,
    h: p.h,
    Rstar: p.Rstar,
    Ee: p.Ee,
    E0: p.E0,
    mu: p.mu,
  };
  const fijo = base.regimen === 'fijo';
  return [
    base,
    {
      ...base,
      G: p.G + p.dG,
      n0: p.n0 + p.dn0,
      Rstar: p.Rstar + p.dRstar,
      Mp: fijo ? p.Mp : p.Mp + p.dMp,
      Ee: fijo ? p.Ee : p.Ee + p.dEe,
      E0: fijo ? p.E0 + p.dE0 : p.E0,
    },
  ];
}

export type TipoChoqueMF = 'ninguno' | 'bienes' | 'monetario' | 'devaluacion' | 'externa' | 'expectativas';

export interface PasosMF {
  tipo: TipoChoqueMF;
  q0: ParamsDDAA;
  q1: ParamsDDAA;
  e0: ResDDAA;
  /** Corto plazo: choque transitorio (Eᵉ y P fijos). */
  e1: ResDDAA;
  /** Largo plazo / choque permanente (cuando el modelo lo define). */
  q2: ParamsDDAA | null;
  e2: ResDDAA | null;
  /** Factor del nivel de precios de largo plazo P₂/P₀ (1 si no cambia). */
  lambda: number;
}

/**
 * Estática comparativa de Krugman y Obstfeld:
 *  · Flotante, choque de demanda permanente: Eᵉ se ajusta hasta que Y vuelve a Y₀ (la CA absorbe todo).
 *  · Flotante, expansión monetaria permanente: a largo plazo P y E suben en la misma proporción (neutralidad).
 *  · Fijo, choque de demanda o devaluación: a largo plazo P sube hasta que Y vuelve a Y₀ (apreciación real).
 * El nivel de precios entra en la DD como tipo de cambio real E/P: P₂ = λ·P₀ equivale a usar x/λ.
 */
export function pasos(p: P): PasosMF {
  const [q0, q1] = escenarios(p);
  const fijo = q0.regimen === 'fijo';
  const e0 = equilibrioDDAA(q0);
  const e1 = equilibrioDDAA(q1);
  let tipo: TipoChoqueMF = 'ninguno';
  if (p.dG !== 0 || p.dn0 !== 0) tipo = 'bienes';
  else if (p.dMp !== 0) tipo = 'monetario';
  else if (fijo && p.dE0 !== 0) tipo = 'devaluacion';
  else if (p.dRstar !== 0) tipo = 'externa';
  else if (!fijo && p.dEe !== 0) tipo = 'expectativas';
  let q2: ParamsDDAA | null = null;
  let lambda = 1;
  const soloEste = p.dRstar === 0 && (fijo || p.dEe === 0);
  if (tipo === 'bienes' && soloEste) {
    if (!fijo) {
      // E₂ tal que DD(E₂) = Y₀ con la demanda nueva; R vuelve a R₀ porque M/P y Y no cambian.
      const E2 = (e1.s * e0.Y - e1.A) / q1.x;
      if (E2 > 0) {
        const CA2 = q1.n0 + q1.x * E2 - q1.m * e0.Y;
        const prima = q1.movilidad === 'imperfecta' ? CA2 / q1.mu : 0;
        q2 = { ...q1, Ee: E2 * (1 + (e0.R - q1.Rstar + prima) / 100) };
      }
    } else {
      const den = e1.s * e0.Y - e1.A;
      if (den > 0) {
        lambda = (q1.x * q1.E0) / den;
        q2 = { ...q1, x: q1.x / lambda };
      }
    }
  } else if (tipo === 'monetario' && !fijo && q1.Mp > 0) {
    lambda = q1.Mp / q0.Mp;
    q2 = { ...q0, x: q0.x / lambda, Ee: q0.Ee * lambda };
  } else if (tipo === 'devaluacion') {
    lambda = q1.E0 / q0.E0;
    q2 = { ...q1, x: q1.x / lambda };
  }
  let e2: ResDDAA | null = null;
  if (q2) {
    try {
      e2 = equilibrioDDAA(q2);
    } catch (e) {
      if (!(e instanceof ErrorParametro)) throw e;
      q2 = null;
      lambda = 1;
    }
  }
  return { tipo, q0, q1, e0, e1, q2, e2, lambda };
}

const mismoDD = (a: ParamsDDAA, b: ParamsDDAA) =>
  a.C0 === b.C0 && a.c === b.c && a.T === b.T && a.I === b.I && a.G === b.G && a.n0 === b.n0 && a.x === b.x && a.m === b.m;

export function calcular(p: P): Simulacion {
  let s: PasosMF;
  try {
    s = pasos(p);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const { q0: b, q1: n, e0: r0, e1: r1, q2, e2 } = s;
  const fijo = b.regimen === 'fijo';
  const choque = DELTAS.some((d) => (p as unknown as Record<string, number>)[d] !== 0);
  const estados: { q: ParamsDDAA; r: ResDDAA }[] = [{ q: b, r: r0 }, { q: n, r: r1 }];
  if (q2 && e2) estados.push({ q: q2, r: e2 });
  const Ys = estados.map((e) => e.r.Y);
  const Es = estados.map((e) => e.r.E);
  // Vista acercada alrededor de los equilibrios, como en los diagramas DD-AA del libro.
  const ymin = Math.min(...Ys) * 0.75;
  const ymax = Math.max(...Ys) * 1.25;
  const emin = Math.min(...Es) * 0.8;
  const emax = Math.max(...Es) * 1.2;
  const Rs = estados.flatMap((e) => [e.r.R, e.q.Rstar]);
  const rmax = Math.max(...Rs) * 2 + 2;

  const A: Panel = {
    id: '',
    titulo: 'A · Modelo DD–AA (producción y tipo de cambio)',
    tituloX: 'Producto Y',
    tituloY: 'Tipo de cambio E (moneda nacional por divisa)',
    rangoX: [ymin, ymax],
    rangoY: [emin, emax],
    dominio: { x: [0, 0.6], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0.53, 0.97] },
  };
  const B: Panel = {
    id: '2',
    titulo: 'B · Mercado de divisas',
    tituloX: 'Tasa de rendimiento (%)',
    tituloY: 'Tipo de cambio E',
    rangoX: [0, rmax],
    rangoY: [emin, emax],
    dominio: { x: [0.7, 1], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0, 0.42] },
    enlaceY: ejeY(A),
  };
  const fig = figuraPaneles(SIM_ID, [A, B], 980);

  const es = linspace(emin, emax, 80);
  const ys = linspace(ymin, ymax, 200);
  const esDesc = [...es].reverse();
  const Eesp = (q: ParamsDDAA) => (q.regimen === 'fijo' ? q.E0 : q.Ee);
  const trazarDD = (q: ParamsDDAA, et: string, color: string, estado: Estado) =>
    curvaP(fig, A, es.map((e) => curvaDD(q, e)), es, 'DD', color, estado, et);
  // Con tipo fijo la AA pasa por el equilibrio porque M/P es la que sostiene la paridad.
  const trazarAA = (q: ParamsDDAA, r: ResDDAA, et: string, color: string, estado: Estado) =>
    curvaP(
      fig,
      A,
      ys,
      ys.map((y) => {
        const e = curvaAA(q, y, r.Mp, Eesp(q));
        return e >= emin * 0.5 && e <= emax * 1.5 ? e : null;
      }),
      fijo ? 'AA (M/P endógena)' : 'AA',
      color,
      estado,
      et,
    );
  // Rendimiento esperado de los depósitos en divisas: R* + 100·(Eᵉ − E)/E.
  const trazarExt = (q: ParamsDDAA, et: string, color: string, estado: Estado) =>
    curvaP(
      fig,
      B,
      // De E alto a E bajo: la etiqueta queda en el borde derecho del panel, no sobre el eje.
      esDesc.map((e) => {
        const v = q.Rstar + (100 * (Eesp(q) - e)) / e;
        return v >= -rmax && v <= rmax * 1.5 ? v : null;
      }),
      esDesc,
      'Rendimiento esperado de los depósitos en divisas',
      color,
      estado,
      et,
    );
  const trazarR = (R: number, et: string, color: string, estado: Estado) =>
    // De arriba hacia abajo: la etiqueta queda al pie y no tapa el título del panel.
    curvaP(fig, B, [R, R], [emax, emin], 'Rendimiento de los depósitos nacionales R', color, estado, et);

  const CDD = [AZUL, VERDE, DORADO];
  const CAA = [ROJO, MORADO, DORADO];
  const sub = ['₀', '₁', '₂'];
  if (!choque) {
    trazarDD(b, 'DD', AZUL, 'final');
    trazarAA(b, r0, 'AA', ROJO, 'final');
    trazarExt(b, 'Rend. externo', NARANJA, 'final');
    trazarR(r0.R, 'R', ROJO, 'final');
  } else {
    // Para cada curva: estados en los que cambia. El primero queda fantasma, el último sólido y los
    // intermedios en raya-punto; si la curva no cambia, se dibuja una sola vez en sólido.
    const trazarSerie = (
      igual: (a: (typeof estados)[number], b: (typeof estados)[number]) => boolean,
      dibujar: (i: number, estado: Estado) => void,
    ) => {
      const idx = estados.map((_, i) => i).filter((i) => i === 0 || !igual(estados[i - 1], estados[i]));
      idx.forEach((i, j) =>
        dibujar(i, idx.length === 1 ? 'final' : j === 0 ? 'inicial' : j === idx.length - 1 ? 'final' : 'intermedio'),
      );
    };
    trazarSerie(
      (a, c) => mismoDD(a.q, c.q),
      (i, e) => trazarDD(estados[i].q, `DD${sub[i]}`, CDD[i], e),
    );
    trazarSerie(
      (a, c) => Math.abs(a.r.Mp - c.r.Mp) < 1e-9 && Eesp(a.q) === Eesp(c.q) && a.q.Rstar === c.q.Rstar,
      (i, e) => trazarAA(estados[i].q, estados[i].r, `AA${sub[i]}`, CAA[i], e),
    );
    trazarSerie(
      (a, c) => Eesp(a.q) === Eesp(c.q) && a.q.Rstar === c.q.Rstar,
      (i, e) => trazarExt(estados[i].q, `Rend. ext.${sub[i]}`, i === 0 ? NARANJA : CDD[i], e),
    );
    trazarSerie(
      (a, c) => Math.abs(a.r.R - c.r.R) < 1e-9,
      (i, e) => trazarR(estados[i].r.R, `R${sub[i]}`, CAA[i], e),
    );
  }
  if (fijo)
    fig.data.push({
      type: 'scatter',
      x: [ymin, ymax],
      y: [n.E0, n.E0],
      mode: 'lines',
      name: `Paridad fija E₀ = ${fmt(n.E0, 3)}`,
      line: { color: DORADO, width: 1.5, dash: 'dashdot' },
      hovertemplate: `Paridad fija E₀ = ${fmt(n.E0, 3)}<extra></extra>`,
    });
  // Tramo plano de la AA: con Y < (M/P)/k la tasa R llega a su piso 0 (trampa de liquidez) y E ya no
  // responde a Y. Se rotula para que no parezca un error de la gráfica.
  const ultimo = estados[estados.length - 1];
  const yTrampa = ultimo.r.Mp / ultimo.q.k;
  const hayTrampa = !fijo && yTrampa > ymin;
  if (hayTrampa) {
    const yt = Math.min(yTrampa, ymax);
    const et = curvaAA(ultimo.q, yt, ultimo.r.Mp, Eesp(ultimo.q));
    if (et >= emin && et <= emax)
      fig.layout.annotations.push({
        x: ymin,
        y: et,
        xref: 'x',
        yref: 'y',
        xanchor: 'left',
        xshift: 4,
        yanchor: 'bottom',
        yshift: 4,
        text: 'R = 0: trampa de liquidez',
        showarrow: false,
        font: { size: 10, color: SUAVE },
      });
  }

  const nombres = ['Equilibrio inicial', 'Corto plazo (choque transitorio)', 'Largo plazo (choque permanente)'];
  const simbolos = ['circle', 'square', 'diamond'];
  estados.forEach((e, i) => {
    const color = !choque ? DORADO : i === 0 ? SUAVE : i === estados.length - 1 ? DORADO : VERDE;
    const nombre = !choque ? 'Equilibrio (Y*, E*)' : nombres[i];
    const prev = estados[i - 1];
    if (prev && Math.abs(e.r.Y - prev.r.Y) + Math.abs(e.r.E - prev.r.E) < 1e-9) return; // no se movió (p. ej. M/P con tipo fijo)
    equilibrioP(fig, A, e.r.Y, e.r.E, nombre, `E${sub[i]}`, color, { decY: 3, simbolo: simbolos[i], lecturas: i !== 1 || estados.length === 2 });
    equilibrioP(fig, B, e.r.R, e.r.E, nombre, `E${sub[i]}`, color, { decY: 3, simbolo: simbolos[i], lecturas: false });
  });
  if (!choque || estados.length === 1) {
    /* sin recorrido */
  } else {
    recorrido(fig, A, estados.map((e) => [e.r.Y, e.r.E] as [number, number]), DORADO);
    recorrido(fig, B, estados.map((e) => [e.r.R, e.r.E] as [number, number]), DORADO);
  }

  const lecturas: Bloque[] = [];
  if (hayTrampa)
    lecturas.push(
      texto(
        `Tramo plano de la AA: con Y < ${fmt(yTrampa, 0)} (= (M/P)/k) la demanda de dinero no alcanza a subir la tasa por encima de 0 %, así que E deja de responder al producto (trampa de liquidez).`,
        'pequeno texto-suave',
      ),
    );
  if (fijo && p.dMp !== 0)
    lecturas.push(
      aviso(
        'Con tipo de cambio fijo la política monetaria es ineficaz: para sostener E₀ el banco central compra o vende divisas hasta que M/P vuelve al nivel que exige la paridad.',
      ),
    );
  if (b.movilidad === 'imperfecta')
    lecturas.push(
      texto(
        'Movilidad imperfecta: en el panel B la tasa nacional y el rendimiento externo no se igualan; la brecha es la que equilibra la balanza de pagos (CA + KA = 0).',
        'pequeno texto-suave',
      ),
    );
  if (!choque)
    lecturas.push(
      texto(
        'Pulsa un botón de choque: E₀ queda gris punteado, E₁ (corto plazo, choque transitorio) en raya-punto y E₂ (largo plazo o choque permanente) en sólido.',
        'pequeno texto-suave',
      ),
    );

  const filas: (string | number | null)[][] = [
    ['Producto Y*', r0.Y, r1.Y, e2?.Y ?? null],
    ['Tipo de cambio E*', r0.E, r1.E, e2?.E ?? null],
    ['Tasa de interés R (%)', r0.R, r1.R, e2?.R ?? null],
    ['Cuenta corriente CA', r0.CA, r1.CA, e2 ? e2.CA : null],
    [fijo ? 'M/P (endógena)' : 'M/P', r0.Mp, r1.Mp, e2?.Mp ?? null],
    ['Nivel de precios P₂/P₀', 1, 1, e2 ? s.lambda : null],
  ];
  const bloques: Bloque[] = [];
  if (choque) bloques.push(cadenaMF(p, s));
  bloques.push(
    lectura('Equilibrios (Y*, E*)', tabla(filas, ['', 'E₀ inicial', 'E₁ corto plazo', 'E₂ largo plazo'])),
    lectura(
      'Lectura',
      ...lecturas,
      refKO(
        'cap. 16, «La producción nacional y el tipo de cambio a corto plazo» (DD-AA, choques transitorios y permanentes), cap. 14 (mercado de divisas y paridad de intereses) y cap. 17, «Los tipos de cambio fijos y la intervención en los mercados de divisas» (numeración de la 7.ª ed.).',
      ),
    ),
  );
  return { fig, panel: [resultados(bloques)] };
}

/** Cadena causal del choque en la economía abierta. */
export function cadenaMF(p: P, s: PasosMF): Bloque {
  const fijo = s.q0.regimen === 'fijo';
  const { e0, e1, e2 } = s;
  const corto = `Corto plazo (transitorio): Y ${cambio(e0.Y, e1.Y)}; E ${cambio(e0.E, e1.E, 4)}; CA ${cambio(e0.CA, e1.CA)}.`;
  switch (s.tipo) {
    case 'bienes': {
      const sig = p.dG + p.dn0 > 0;
      const choque = p.dG !== 0 ? `ΔG = ${fmt(p.dG, 0)}` : `Δn₀ = ${fmt(p.dn0, 0)} (demanda externa)`;
      if (fijo)
        return cadena(
          `Choque: ${choque}; tipo de cambio fijo en E₀ = ${fmt(s.q0.E0, 3)}.`,
          `Demanda ${sig ? '↑' : '↓'} → Y ${sig ? '↑' : '↓'} → Mᵈ ${sig ? '↑' : '↓'} → presión sobre R y E → el banco central ${sig ? 'compra' : 'vende'} divisas → M/P ${sig ? '↑' : '↓'} (endógena) → R = R*: sin expulsión.`,
          corto + ` M/P ${cambio(e0.Mp, e1.Mp)}.`,
          e2
            ? `Largo plazo: P sube a ${fmt(s.lambda, 4)}·P₀ (apreciación real) y Y vuelve a ${fmt(e2.Y, 2)}: autocorrección vía precios.`
            : undefined,
        );
      return cadena(
        `Choque: ${choque}; tipo de cambio flotante.`,
        `Demanda ${sig ? '↑' : '↓'} → Y ${sig ? '↑' : '↓'} → Mᵈ ${sig ? '↑' : '↓'} → R ${sig ? '↑' : '↓'} → depósitos nacionales ${sig ? 'más' : 'menos'} atractivos → E ${sig ? '↓ (apreciación)' : '↑ (depreciación)'} → CA ${sig ? '↓' : '↑'}.`,
        corto,
        e2
          ? `Choque permanente: Eᵉ también cae y E llega a ${fmt(e2.E, 4)}; Y = ${fmt(e2.Y, 2)} (sin cambio) y la CA cae ${fmt(e0.CA - e2.CA, 2)}: expulsión total vía cuenta corriente.`
          : undefined,
      );
    }
    case 'monetario':
      if (fijo)
        return cadena(
          `Choque: Δ(M/P) = ${fmt(p.dMp, 0)} con tipo de cambio fijo.`,
          'Más dinero → R tendería a caer → presión de depreciación → el banco central vende divisas → M/P vuelve al nivel que exige la paridad.',
          'Y, E y R no cambian: con tipo fijo y movilidad de capital la política monetaria es ineficaz.',
        );
      return cadena(
        `Choque: Δ(M/P) = ${fmt(p.dMp, 0)} ${p.dMp > 0 ? '> 0' : '< 0'}; tipo de cambio flotante.`,
        `M/P ${p.dMp > 0 ? '↑' : '↓'} → R ${p.dMp > 0 ? '↓' : '↑'} → salida de capital hacia ${p.dMp > 0 ? 'depósitos externos' : 'depósitos nacionales'} → E ${p.dMp > 0 ? '↑ (depreciación)' : '↓ (apreciación)'} → CA ${p.dMp > 0 ? '↑' : '↓'} → Y ${p.dMp > 0 ? '↑' : '↓'}.`,
        corto,
        e2
          ? `Largo plazo (permanente): P y E suben en la misma proporción (×${fmt(s.lambda, 4)}); Y vuelve a ${fmt(e2.Y, 2)}: neutralidad del dinero.`
          : undefined,
      );
    case 'devaluacion':
      return cadena(
        `Choque: devaluación ΔE₀ = ${fmt(p.dE0, 3)}.`,
        'E ↑ → bienes nacionales más baratos → CA ↑ → Y ↑ → Mᵈ ↑ → el banco central compra divisas → M/P ↑ (reservas ↑).',
        corto + ` M/P ${cambio(e0.Mp, e1.Mp)}.`,
        e2 ? `Largo plazo: P sube en la proporción de la devaluación (×${fmt(s.lambda, 4)}) y Y vuelve a ${fmt(e2.Y, 2)}.` : undefined,
      );
    case 'externa':
      return cadena(
        `Choque: ΔR* = ${fmt(p.dRstar, 2)} puntos.`,
        fijo
          ? 'R* ↑ → depósitos externos más rentables → para sostener E₀ el banco central vende divisas → M/P ↓ → R sube hasta R*. Con la inversión exógena de la DD, Y no cambia.'
          : 'R* ↑ → depósitos externos más rentables → E ↑ (depreciación) → CA ↑ → Y ↑ (la AA se desplaza hacia arriba).',
        corto + (fijo ? ` M/P ${cambio(e0.Mp, e1.Mp)}.` : ''),
      );
    case 'expectativas':
      return cadena(
        `Choque: ΔEᵉ = ${fmt(p.dEe, 3)} (depreciación esperada).`,
        'Eᵉ ↑ → rendimiento esperado de los depósitos en divisas ↑ → E ↑ hoy (profecía autocumplida) → CA ↑ → Y ↑.',
        corto,
      );
    default:
      return cadena('Sin choque.', '—', corto);
  }
}

const flotante = (p: Params) => p['regimen'] !== 'fijo';

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 600,
  grupos: [
    {
      titulo: 'Régimen',
      controles: [
        {
          id: 'regimen',
          etiqueta: 'Tipo de cambio',
          tipo: 'selector',
          opciones: [
            { valor: 'flotante', etiqueta: 'Flotante' },
            { valor: 'fijo', etiqueta: 'Fijo' },
          ],
        },
        {
          id: 'movilidad',
          etiqueta: 'Movilidad del capital',
          tipo: 'selector',
          opciones: [
            { valor: 'perfecta', etiqueta: 'Perfecta (paridad de intereses)' },
            { valor: 'imperfecta', etiqueta: 'Imperfecta (μ finito)' },
          ],
        },
      ],
    },
    {
      visibleSi: (p) => p['movilidad'] === 'imperfecta',
      controles: [
        { id: 'mu', etiqueta: 'Movilidad del capital μ', tipo: 'slider', min: 1, max: 200, paso: 1 },
      ],
    },
    grupoChoques(CHOQUES),
    {
      titulo: 'Mercado de bienes (DD)',
      controles: [
        { id: 'C0', etiqueta: 'Consumo autónomo C₀', tipo: 'slider', min: 0, max: 300, paso: 10 },
        { id: 'c', etiqueta: 'Propensión a consumir c', tipo: 'slider', min: 0, max: 0.9, paso: 0.01 },
        { id: 'I', etiqueta: 'Inversión I', tipo: 'slider', min: 0, max: 400, paso: 10 },
        { id: 'G', etiqueta: 'Gasto público G', tipo: 'slider', min: 0, max: 500, paso: 10 },
        { id: 'T', etiqueta: 'Impuestos T', tipo: 'slider', min: 0, max: 400, paso: 10 },
        { id: 'n0', etiqueta: 'Exportaciones netas autónomas n₀', tipo: 'slider', min: -200, max: 200, paso: 10 },
        { id: 'x', etiqueta: 'Respuesta de CA a E, x', tipo: 'slider', min: 10, max: 300, paso: 10 },
        { id: 'm', etiqueta: 'Propensión a importar m', tipo: 'slider', min: 0, max: 0.5, paso: 0.01 },
      ],
    },
    {
      titulo: 'Mercados de activos (AA)',
      controles: [
        { id: 'Rstar', etiqueta: 'Tasa de interés externa R* (%)', tipo: 'slider', min: 0, max: 15, paso: 0.25 },
        { id: 'k', etiqueta: 'Demanda de dinero: sensibilidad a Y, k', tipo: 'slider', min: 0.1, max: 1, paso: 0.05 },
        { id: 'h', etiqueta: 'Demanda de dinero: sensibilidad a R, h', tipo: 'slider', min: 1, max: 60, paso: 1 },
      ],
    },
    {
      visibleSi: flotante,
      controles: [
        { id: 'Mp', etiqueta: 'Oferta real de dinero M/P', tipo: 'slider', min: 50, max: 1000, paso: 10 },
        { id: 'Ee', etiqueta: 'Tipo de cambio esperado Eᵉ', tipo: 'slider', min: 0.5, max: 2, paso: 0.01 },
      ],
    },
    {
      visibleSi: (p) => !flotante(p),
      controles: [
        { id: 'E0', etiqueta: 'Paridad fijada E₀', tipo: 'slider', min: 0.5, max: 2, paso: 0.01 },
      ],
    },
    {
      titulo: 'Tamaño del choque',
      controles: [
        { id: 'dG', etiqueta: 'ΔG (política fiscal)', tipo: 'slider', min: -150, max: 150, paso: 10 },
        { id: 'dn0', etiqueta: 'Δn₀ (demanda externa)', tipo: 'slider', min: -150, max: 150, paso: 10 },
        { id: 'dRstar', etiqueta: 'ΔR* (puntos)', tipo: 'slider', min: -4, max: 6, paso: 0.25 },
        { id: 'dMp', etiqueta: 'Δ(M/P) (política monetaria)', tipo: 'slider', min: -200, max: 300, paso: 10 },
      ],
    },
    {
      visibleSi: flotante,
      controles: [
        { id: 'dEe', etiqueta: 'ΔEᵉ (choque permanente esperado)', tipo: 'slider', min: -0.4, max: 0.6, paso: 0.01 },
      ],
    },
    {
      visibleSi: (p) => !flotante(p),
      controles: [
        { id: 'dE0', etiqueta: 'ΔE₀ (devaluación > 0)', tipo: 'slider', min: -0.3, max: 0.5, paso: 0.01 },
      ],
    },
  ],
  alCambiar: alCambiarChoques(CHOQUES, DELTAS),
  calcular: (p: Params) => calcular(p as unknown as P),
};
