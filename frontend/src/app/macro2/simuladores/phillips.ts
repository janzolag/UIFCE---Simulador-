import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import {
  AZUL,
  DORADO,
  NARANJA,
  SUAVE,
  VERDE,
  ROJO,
  aviso,
  figura,
  figuraVacia,
  lectura,
  punto,
  resultados,
  tabla,
  texto,
} from '../../core/tema';
import { ParamsPhillips, desempleoParaMeta, inflacion, razonSacrificio } from '../modelos/phillips';
import { curva, equilibrio, refEstandar } from './_comun';
import { Choque, Panel, alCambiarChoques, cadena, cambio, grupoChoques, recorrido } from './_paneles';

const SIM_ID = 'm2-phillips';
// CPCP: π = 6 − 0.5·(u − 5). Con u = 7 la inflación es 5 %; bajarla a 2 % en un año exige u = 13 %.
const DEF = {
  pie: 6,
  beta: 0.5,
  ustar: 5,
  v: 0,
  uobj: 7,
  piobj: 2,
  choque: 'ninguno' as string,
  dpie: 0,
  dv: 0,
};
type P = typeof DEF;

export const CHOQUES: Choque[] = [
  { valor: 'ninguno', etiqueta: 'Sin choque', cambios: {} },
  { valor: 'expectativas', etiqueta: '+ Expectativas de inflación (Δπᵉ = +2)', cambios: { dpie: 2 } },
  { valor: 'petroleo', etiqueta: '+ Choque de oferta adverso (Δv = +2)', cambios: { dv: 2 } },
  { valor: 'favorable', etiqueta: '− Choque de oferta favorable (Δv = −2)', cambios: { dv: -2 } },
  { valor: 'anclaje', etiqueta: '− Anclaje de expectativas (Δπᵉ = −3)', cambios: { dpie: -3 } },
];
const DELTAS = ['dpie', 'dv'];

export function escenarios(p: P): [ParamsPhillips, ParamsPhillips] {
  const base: ParamsPhillips = { pie: p.pie, beta: p.beta, ustar: p.ustar, v: p.v };
  return [base, { ...base, pie: p.pie + p.dpie, v: p.v + p.dv }];
}

export function calcular(p: P): Simulacion {
  const [b, n] = escenarios(p);
  let pi0: number;
  let pi1: number;
  let uMeta: number;
  let sacrificio: number;
  try {
    pi0 = inflacion(b, p.uobj);
    pi1 = inflacion(n, p.uobj);
    uMeta = desempleoParaMeta(n, p.piobj);
    sacrificio = razonSacrificio(n);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const choque = p.dpie !== 0 || p.dv !== 0;
  const metaVisible = uMeta >= 0 && uMeta <= 30;
  const umax = Math.min(30, Math.max(15, p.uobj * 1.3, metaVisible ? uMeta * 1.2 : 0, n.ustar * 2));
  const us = linspace(0, umax, 80);
  const valores = [b, n].flatMap((q) => [inflacion(q, 0), inflacion(q, umax)]);
  const pmin = Math.min(-2, ...valores);
  const pmax = Math.max(2, ...valores);
  const margen = (pmax - pmin) * 0.06;
  const ylo = pmin - margen;
  const fig = figura('Tasa de desempleo u (%)', 'Inflación π (%)', SIM_ID, {
    xaxis: { range: [0, umax] },
    yaxis: { range: [ylo, pmax + margen], zeroline: true },
  });

  if (choque) curva(fig, us, us.map((u) => inflacion(b, u)), 'CPCP', AZUL, true);
  curva(fig, us, us.map((u) => inflacion(n, u)), `CPCP (πᵉ = ${fmt(n.pie, 2)} %)`, choque ? VERDE : AZUL);
  curva(fig, [n.ustar, n.ustar], [ylo, pmax + margen], `CPLP (u* = ${fmt(n.ustar, 2)} %)`, NARANJA);

  const ejes = { x0: 0, y0: ylo };
  // Sin sorpresas: u = u*, π = πᵉ + v (cruce de CPCP y CPLP).
  punto(fig, n.ustar, n.pie + n.v, 'Sin sorpresas (u*, πᵉ + v)', NARANJA, 'circle-open');
  if (choque) equilibrio(fig, p.uobj, pi0, 'Antes del choque', 'A₀', SUAVE, ejes);
  equilibrio(fig, p.uobj, pi1, 'Punto de corto plazo (u, π)', 'A', DORADO, { ...ejes, simbolo: 'diamond' });
  if (choque) {
    // E₂: largo plazo sin sorpresas sobre la CPLP (u = u*, π = πᵉ + v de la curva nueva).
    equilibrio(fig, n.ustar, n.pie + n.v, 'Largo plazo sin sorpresas (CPLP)', 'E₂', NARANJA, { ...ejes, simbolo: 'diamond' });
    const panelP: Panel = {
      id: '', titulo: '', tituloX: '', tituloY: '',
      rangoX: [0, umax], rangoY: [ylo, pmax + margen],
      dominio: { x: [0, 1], y: [0, 1] }, movil: { x: [0, 1], y: [0, 1] },
    };
    recorrido(fig, panelP, [[p.uobj, pi0], [p.uobj, pi1], [n.ustar, n.pie + n.v]], DORADO);
  }
  if (metaVisible)
    punto(fig, uMeta, p.piobj, `Meta π = ${fmt(p.piobj, 2)} % en un año`, ROJO, 'x', undefined, {
      hovertemplate: `Para π = ${fmt(p.piobj, 2)} %: u = %{x:.2f} %<extra></extra>`,
    });

  const aceleracion = pi1 - n.pie;
  const lecturas: Bloque[] = [
    texto(
      `Con u = ${fmt(p.uobj, 2)} % la inflación es ${fmt(pi1, 2)} %. ` +
        (Math.abs(p.uobj - n.ustar) < 1e-9
          ? 'Es la NAIRU: no hay sorpresas y la inflación se mantiene.'
          : p.uobj < n.ustar
            ? `Mantener u bajo la NAIRU sube la inflación ${fmt(aceleracion, 2)} p. p. cada año (πᵉ se ajusta hacia arriba).`
            : `Mantener u sobre la NAIRU baja la inflación ${fmt(-aceleracion, 2)} p. p. cada año.`),
      'destacado',
    ),
    texto(
      `Desinflación: llevar π a ${fmt(p.piobj, 2)} % en un año exige u = ${fmt(uMeta, 2)} %. ` +
        `Razón de sacrificio: ${fmt(sacrificio, 2)} puntos-año de desempleo por cada punto de inflación.`,
      'pequeno texto-suave',
    ),
  ];
  if (!metaVisible)
    lecturas.push(aviso('La meta de inflación exige un desempleo fuera de [0 %, 30 %]: no es alcanzable en un año.'));
  if (p.dv > 0)
    lecturas.push(texto('Choque de oferta adverso (v > 0): la CPCP sube y aparece estanflación.', 'pequeno texto-suave'));
  if (!choque)
    lecturas.push(texto('Mueve Δπᵉ o Δv: la curva inicial queda como fantasma punteada.', 'pequeno texto-suave'));

  const panel = [
    resultados([
      ...(choque
        ? [
            cadena(
              `Choque: ${p.dpie !== 0 ? `Δπᵉ = ${fmt(p.dpie, 2)} p. p.` : ''}${p.dpie !== 0 && p.dv !== 0 ? ', ' : ''}${p.dv !== 0 ? `Δv = ${fmt(p.dv, 2)} p. p. (oferta)` : ''}.`,
              `${p.dpie !== 0 ? `πᵉ ${p.dpie > 0 ? '↑' : '↓'} → salarios y precios fijados con más ${p.dpie > 0 ? 'inflación' : 'calma'}` : `costos ${p.dv > 0 ? '↑' : '↓'}`} → la CPCP se desplaza ${pi1 > pi0 ? 'hacia arriba' : 'hacia abajo'} → con u = ${fmt(p.uobj, 2)} % la inflación pasa de E₀ a E₁.`,
              `Corto plazo: π ${cambio(pi0, pi1)} % con u fijo en ${fmt(p.uobj, 2)} %.`,
              `Largo plazo: sin sorpresas la economía vuelve a la CPLP en u* = ${fmt(n.ustar, 2)} % con π = πᵉ + v = ${fmt(n.pie + n.v, 2)} % (E₂): no hay intercambio permanente entre inflación y desempleo.`,
            ),
          ]
        : []),
      lectura(
        'Punto de corto plazo',
        tabla(
          [
            ['Desempleo u (%)', p.uobj, p.uobj],
            ['Inflación π (%)', pi0, pi1],
            ['Inflación esperada πᵉ (%)', b.pie, n.pie],
          ],
          ['', 'Inicial', 'Después del choque'],
        ),
      ),
      lectura(
        'Costo de la desinflación',
        tabla([
          ['u necesario para la meta (%)', uMeta],
          ['Razón de sacrificio 1/β', sacrificio],
          ['Cambio de π por año (π − πᵉ)', aceleracion],
        ]),
      ),
      lectura('Lectura', ...lecturas, refEstandar('curva de Phillips aumentada con expectativas (Friedman–Phelps).')),
    ]),
  ];
  return { fig, panel };
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 540,
  grupos: [
    grupoChoques(CHOQUES),
    {
      titulo: 'CPCP: π = πᵉ − β·(u − u*) + v',
      controles: [
        { id: 'pie', etiqueta: 'Inflación esperada πᵉ (%)', tipo: 'slider', min: -2, max: 15, paso: 0.25 },
        { id: 'beta', etiqueta: 'Pendiente β', tipo: 'slider', min: 0.1, max: 2, paso: 0.05 },
        { id: 'ustar', etiqueta: 'NAIRU u* (%)', tipo: 'slider', min: 2, max: 12, paso: 0.25 },
        { id: 'v', etiqueta: 'Choque de oferta v (puntos)', tipo: 'slider', min: -4, max: 6, paso: 0.25 },
      ],
    },
    {
      titulo: 'Política',
      controles: [
        { id: 'uobj', etiqueta: 'Desempleo objetivo u (%)', tipo: 'slider', min: 0.5, max: 20, paso: 0.25 },
        { id: 'piobj', etiqueta: 'Meta de inflación πₒ (%)', tipo: 'slider', min: -1, max: 10, paso: 0.25 },
      ],
    },
    {
      titulo: 'Tamaño del choque',
      controles: [
        { id: 'dpie', etiqueta: 'Δπᵉ (expectativas)', tipo: 'slider', min: -6, max: 6, paso: 0.25 },
        { id: 'dv', etiqueta: 'Δv (choque de oferta)', tipo: 'slider', min: -4, max: 6, paso: 0.25 },
      ],
    },
  ],
  alCambiar: alCambiarChoques(CHOQUES, DELTAS),
  calcular: (p: Params) => calcular(p as unknown as P),
};
