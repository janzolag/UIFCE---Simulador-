import { Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import { AZUL, DORADO, MORADO, NARANJA, ROJO, SUAVE, VERDE, aviso, figuraVacia, lectura, resultados, tabla, texto } from '../../core/tema';
import {
  ParamsDuopolio,
  PuntoDuopolio,
  colusion,
  competencia,
  cournotNash,
  isobeneficio1,
  reaccion1,
  reaccion2,
  stackelbergLider,
} from '../modelos/mercados';
import { Panel, curvaP, equilibrioP, figuraPaneles, flecha } from '../../macro2/simuladores/_paneles';
import { muestras, refVarian } from './_comun';

const SIM_ID = 'm2-oligopolio';
// p = 120 − Y, c₁ = c₂ = 0: Cournot (40, 40), p = 40; Stackelberg (60, 30), p = 30; colusión Y = 60, p = 60.
const DEF = { a: 120, b: 1, c1: 0, c2: 0, isobeneficios: 'si' as string };
type P = typeof DEF;

export const parametros = (p: P): ParamsDuopolio => ({ a: p.a, b: p.b, c1: p.c1, c2: p.c2 });

export interface Soluciones {
  cournot: PuntoDuopolio;
  stackelberg: PuntoDuopolio;
  colusion: PuntoDuopolio;
  competencia: PuntoDuopolio;
}
export function soluciones(q: ParamsDuopolio): Soluciones {
  return { cournot: cournotNash(q), stackelberg: stackelbergLider(q), colusion: colusion(q), competencia: competencia(q) };
}

export function calcular(p: P): Simulacion {
  const q = parametros(p);
  let s: Soluciones;
  try {
    s = soluciones(q);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const lim = Math.max((q.a - Math.min(q.c1, q.c2)) / q.b, 1e-6) * 1.02;
  const R: Panel = {
    id: '',
    titulo: 'A · Funciones de reacción',
    tituloX: 'Producción de la empresa 1, y₁',
    tituloY: 'Producción de la empresa 2, y₂',
    rangoX: [0, lim],
    rangoY: [0, lim],
    dominio: { x: [0, 0.55], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0.5, 0.97] },
  };
  const M: Panel = {
    id: '2',
    titulo: 'B · Mercado: p = a − b·(y₁ + y₂)',
    tituloX: 'Producción total Y',
    tituloY: 'Precio p',
    rangoX: [0, lim],
    rangoY: [0, q.a * 1.05],
    dominio: { x: [0.66, 1], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0, 0.4] },
  };
  const fig = figuraPaneles(SIM_ID, [R, M], 920);
  const vs = linspace(0, lim, 160);
  curvaP(fig, R, vs.map((y2) => reaccion1(q, y2)), vs, 'Reacción de la empresa 1, f₁(y₂)', AZUL, 'final', 'f₁(y₂)');
  curvaP(fig, R, vs, vs.map((y1) => reaccion2(q, y1)), 'Reacción de la empresa 2, f₂(y₁)', ROJO, 'final', 'f₂(y₁)');
  // Línea de colusión: combinaciones con la producción total de cartel.
  const Yc = s.colusion.Y;
  curvaP(fig, R, [0, Yc], [Yc, 0], 'Producciones de colusión (y₁ + y₂ = Yᶜ)', MORADO, 'intermedio', 'colusión');
  if (p.isobeneficios !== 'no') {
    const ys = linspace(lim / 300, lim, 220);
    for (const [pt, nombre] of [
      [s.cournot, 'Isobeneficio de 1 en Cournot'],
      [s.stackelberg, 'Isobeneficio de 1 en Stackelberg'],
    ] as const)
      if (pt.pi1 > 0)
        curvaP(fig, R, ys, muestras(ys, (y1) => isobeneficio1(q, pt.pi1, y1), lim), nombre, SUAVE, 'intermedio', `π₁ = ${fmt(pt.pi1, 0)}`);
  }
  equilibrioP(fig, R, s.cournot.y1, s.cournot.y2, 'Equilibrio de Cournot-Nash', 'Cournot', DORADO, { simbolo: 'diamond' });
  equilibrioP(fig, R, s.stackelberg.y1, s.stackelberg.y2, 'Stackelberg (líder: empresa 1)', 'Stackelberg', NARANJA, { simbolo: 'square', lecturas: false });
  equilibrioP(fig, R, s.colusion.y1, s.colusion.y2, 'Colusión (cartel)', 'cartel', MORADO, { lecturas: false });
  flecha(fig, R, [s.cournot.y1, s.cournot.y2], [s.stackelberg.y1, s.stackelberg.y2], NARANJA);

  const Ys = linspace(0, lim, 100);
  curvaP(fig, M, Ys, Ys.map((Y) => Math.max(0, q.a - q.b * Y)), 'Demanda inversa', AZUL, 'final', 'p(Y)');
  const pts: [PuntoDuopolio, string, string, string][] = [
    [s.colusion, 'Colusión', 'cartel', MORADO],
    [s.cournot, 'Cournot', 'Cournot', DORADO],
    [s.stackelberg, 'Stackelberg', 'Stackelberg', NARANJA],
    [s.competencia, 'Competencia (p = CMg)', 'p = CMg', VERDE],
  ];
  for (const [pt, nombre, et, color] of pts) equilibrioP(fig, M, pt.Y, pt.p, nombre, et, color, { lecturas: false });

  const panel = [
    resultados([
      lectura(
        'Comparación (Varian: colusión < Cournot < Stackelberg < competencia en Y)',
        tabla(
          [
            ['Colusión', s.colusion.y1, s.colusion.y2, s.colusion.p, s.colusion.pi1, s.colusion.pi2],
            ['Cournot-Nash', s.cournot.y1, s.cournot.y2, s.cournot.p, s.cournot.pi1, s.cournot.pi2],
            ['Stackelberg (1 líder)', s.stackelberg.y1, s.stackelberg.y2, s.stackelberg.p, s.stackelberg.pi1, s.stackelberg.pi2],
            ['Competencia', s.competencia.y1, s.competencia.y2, s.competencia.p, s.competencia.pi1, s.competencia.pi2],
          ],
          ['', 'y₁', 'y₂', 'p', 'π₁', 'π₂'],
        ),
      ),
      lectura(
        'Lectura',
        texto(
          'Cournot: cada empresa elige su mejor respuesta a la producción de la otra; el cruce de f₁ y f₂ es el equilibrio de Nash. ' +
            'Stackelberg: el líder elige el punto de la reacción del seguidor que toca su isobeneficio más bajo (más beneficio). ' +
            'Colusión: maximiza el beneficio conjunto, pero cada empresa tiene incentivo a desviarse hacia su curva de reacción.',
          'destacado',
        ),
        texto(
          `Ventaja del líder: π₁ pasa de ${fmt(s.cournot.pi1, 2)} (Cournot) a ${fmt(s.stackelberg.pi1, 2)} (Stackelberg).`,
          'pequeno texto-suave',
        ),
        refVarian('«El oligopolio»: funciones de reacción, equilibrio de Cournot, liderazgo en la elección de la cantidad (Stackelberg) y colusión.'),
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
      titulo: 'Demanda inversa: p = a − b·Y',
      controles: [
        { id: 'a', etiqueta: 'Precio máximo a', tipo: 'slider', min: 10, max: 200, paso: 5 },
        { id: 'b', etiqueta: 'Pendiente b', tipo: 'slider', min: 0.25, max: 4, paso: 0.25 },
      ],
    },
    {
      titulo: 'Costos marginales constantes',
      controles: [
        { id: 'c1', etiqueta: 'Empresa 1 (líder), c₁', tipo: 'slider', min: 0, max: 100, paso: 1 },
        { id: 'c2', etiqueta: 'Empresa 2 (seguidora), c₂', tipo: 'slider', min: 0, max: 100, paso: 1 },
        {
          id: 'isobeneficios',
          etiqueta: 'Curvas de isobeneficio de la empresa 1',
          tipo: 'selector',
          opciones: [
            { valor: 'si', etiqueta: 'Mostrar' },
            { valor: 'no', etiqueta: 'Ocultar' },
          ],
        },
      ],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
