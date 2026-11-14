import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
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
} from '../../micro2/modelos/mercados';
import { Panel, curvaP, equilibrioP, figuraPaneles, flecha } from '../../macro2/simuladores/_paneles';
import { muestras } from '../../micro2/simuladores/_comun';
import { ResBertrand, bertrand, cournotN, respuestaPrecio } from '../modelos/estrategia';
import { refMonsalve } from './_comun';

const SIM_ID = 'm3-oligopolio';
// p = 120 − Y, c₁ = c₂ = 0: Cournot (40, 40), p = 40; Stackelberg (60, 30), p = 30; colusión Y = 60, p = 60; Bertrand p = 0.
const DEF = { enfoque: 'cournot' as string, a: 120, b: 1, c1: 0, c2: 0, n: 2, isobeneficios: 'si' as string };
type P = typeof DEF;

export const parametros = (p: P): ParamsDuopolio => ({ a: p.a, b: p.b, c1: p.c1, c2: p.c2 });

export interface Soluciones {
  cournot: PuntoDuopolio;
  stackelberg: PuntoDuopolio;
  colusion: PuntoDuopolio;
  competencia: PuntoDuopolio;
  bertrand: ResBertrand;
}
export function soluciones(q: ParamsDuopolio): Soluciones {
  return {
    cournot: cournotNash(q),
    stackelberg: stackelbergLider(q),
    colusion: colusion(q),
    competencia: competencia(q),
    bertrand: bertrand(q),
  };
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
  const enfoque = p.enfoque === 'stackelberg' || p.enfoque === 'bertrand' ? p.enfoque : 'cournot';
  const lim = Math.max((q.a - Math.min(q.c1, q.c2)) / q.b, 1e-6) * 1.02;
  const precios = enfoque === 'bertrand';
  const R: Panel = precios
    ? {
        id: '',
        titulo: 'A · Mejores respuestas en precios',
        tituloX: 'Precio de la empresa 1, p₁',
        tituloY: 'Precio de la empresa 2, p₂',
        rangoX: [0, q.a],
        rangoY: [0, q.a],
        dominio: { x: [0, 0.55], y: [0, 0.93] },
        movil: { x: [0, 1], y: [0.5, 0.97] },
      }
    : {
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

  if (precios) {
    // Bien homogéneo: cada empresa baja apenas el precio rival, sin ir bajo su costo ni sobre su precio de monopolio.
    const ps = linspace(0, q.a, 200);
    curvaP(fig, R, ps.map((p2) => respuestaPrecio(q, q.c1, p2)), ps, 'Mejor respuesta de la empresa 1, p₁(p₂)', AZUL, 'final', 'p₁(p₂)');
    curvaP(fig, R, ps, ps.map((p1) => respuestaPrecio(q, q.c2, p1)), 'Mejor respuesta de la empresa 2, p₂(p₁)', ROJO, 'final', 'p₂(p₁)');
    const b = s.bertrand;
    const pB1 = b.gana === 2 ? Math.max(q.c1, b.p) : b.p;
    const pB2 = b.gana === 1 ? Math.max(q.c2, b.p) : b.p;
    equilibrioP(fig, R, pB1, pB2, 'Equilibrio de Bertrand', 'Bertrand', VERDE, { simbolo: 'diamond' });
    equilibrioP(fig, R, s.colusion.p, s.colusion.p, 'Precio de cártel (colusión)', 'cártel', MORADO, { lecturas: false });
    flecha(fig, R, [s.colusion.p, s.colusion.p], [pB1, pB2], MORADO);
  } else {
    const vs = linspace(0, lim, 160);
    curvaP(fig, R, vs.map((y2) => reaccion1(q, y2)), vs, 'Reacción de la empresa 1, f₁(y₂)', AZUL, 'final', 'f₁(y₂)');
    curvaP(fig, R, vs, vs.map((y1) => reaccion2(q, y1)), 'Reacción de la empresa 2, f₂(y₁)', ROJO, 'final', 'f₂(y₁)');
    if (p.isobeneficios !== 'no') {
      const ys = linspace(lim / 300, lim, 220);
      const curvas: [PuntoDuopolio, string][] =
        enfoque === 'stackelberg'
          ? [[s.cournot, 'Isobeneficio de 1 en Cournot'], [s.stackelberg, 'Isobeneficio de 1 en Stackelberg']]
          : [[s.cournot, 'Isobeneficio de 1 en Cournot']];
      for (const [pt, nombre] of curvas)
        if (pt.pi1 > 0)
          curvaP(fig, R, ys, muestras(ys, (y1) => isobeneficio1(q, pt.pi1, y1), lim), nombre, SUAVE, 'intermedio', `π₁ = ${fmt(pt.pi1, 0)}`);
    }
    equilibrioP(fig, R, s.cournot.y1, s.cournot.y2, 'Equilibrio de Cournot-Nash', 'Cournot', DORADO, { simbolo: 'diamond' });
    if (enfoque === 'stackelberg') {
      equilibrioP(fig, R, s.stackelberg.y1, s.stackelberg.y2, 'Stackelberg (líder: empresa 1)', 'Stackelberg', NARANJA, { simbolo: 'square' });
      flecha(fig, R, [s.cournot.y1, s.cournot.y2], [s.stackelberg.y1, s.stackelberg.y2], NARANJA);
    }
  }

  const Ys = linspace(0, lim, 100);
  curvaP(fig, M, Ys, Ys.map((Y) => Math.max(0, q.a - q.b * Y)), 'Demanda inversa', AZUL, 'final', 'p(Y)');
  const bY = s.bertrand.y1 + s.bertrand.y2;
  const pts: [number, number, string, string, string][] = [
    [s.colusion.Y, s.colusion.p, 'Colusión', 'cártel', MORADO],
    [s.cournot.Y, s.cournot.p, 'Cournot', 'Cournot', DORADO],
    [s.stackelberg.Y, s.stackelberg.p, 'Stackelberg', 'Stackelberg', NARANJA],
    [bY, s.bertrand.p, 'Bertrand', 'Bertrand', VERDE],
  ];
  for (const [Y, pr, nombre, et, color] of pts) equilibrioP(fig, M, Y, pr, nombre, et, color, { lecturas: false });

  const comparacion = lectura(
    'Comparación de estructuras (p = a − b·Y)',
    tabla(
      [
        ['Colusión (cártel)', s.colusion.y1, s.colusion.y2, s.colusion.p, s.colusion.pi1, s.colusion.pi2],
        ['Cournot-Nash', s.cournot.y1, s.cournot.y2, s.cournot.p, s.cournot.pi1, s.cournot.pi2],
        ['Stackelberg (1 líder)', s.stackelberg.y1, s.stackelberg.y2, s.stackelberg.p, s.stackelberg.pi1, s.stackelberg.pi2],
        ['Bertrand', s.bertrand.y1, s.bertrand.y2, s.bertrand.p, s.bertrand.pi1, s.bertrand.pi2],
      ],
      ['', 'y₁', 'y₂', 'p', 'π₁', 'π₂'],
    ),
  );
  const especifica: Bloque[] = [];
  if (enfoque === 'cournot') {
    const n = Math.min(1000, Math.max(1, Math.trunc(Number(p.n) || 1)));
    especifica.push(
      q.c1 < q.a
        ? (() => {
            const cn = cournotN({ ...q, c2: q.c1 }, n);
            return lectura(
              `Cournot con n = ${n} empresas iguales (costo c₁)`,
              tabla([
                ['Producción por empresa', cn.yi], ['Producción total', cn.Y], ['Precio (a + n·c)/(n + 1)', cn.p],
                ['Beneficio por empresa', cn.pii], ['HHI (0–10 000)', cn.hhi], ['Índice de Lerner', cn.lerner],
              ]),
              texto('Al crecer n el precio converge al costo marginal: Cournot se acerca a la competencia perfecta.', 'pequeno texto-suave'),
            );
          })()
        : aviso('Con c₁ ≥ a ninguna empresa con ese costo produciría: baja c₁ para ver Cournot con n empresas.'),
      lectura(
        'Lectura',
        texto(
          'Cada empresa elige su producción como mejor respuesta a la de la otra; el cruce de f₁ y f₂ es el equilibrio de Nash, donde la isobeneficio de 1 es horizontal.',
          'destacado',
        ),
        refMonsalve('oligopolio de Cournot: curvas de reacción y equilibrio de Nash en cantidades.'),
      ),
    );
  } else if (enfoque === 'stackelberg') {
    especifica.push(
      lectura(
        'Lectura',
        texto(
          'El líder elige primero sabiendo que la seguidora responde con f₂(y₁): escoge el punto de f₂ que toca su isobeneficio más bajo (más beneficio).',
          'destacado',
        ),
        texto(`Ventaja del líder: π₁ pasa de ${fmt(s.cournot.pi1, 2)} (Cournot) a ${fmt(s.stackelberg.pi1, 2)} (Stackelberg).`, 'pequeno texto-suave'),
        refMonsalve('liderazgo en cantidades (Stackelberg): juego secuencial resuelto por inducción hacia atrás.'),
      ),
    );
  } else {
    const b = s.bertrand;
    especifica.push(
      lectura(
        'Lectura',
        texto(
          b.gana === 0
            ? `Paradoja de Bertrand: con bien homogéneo y costos iguales, dos empresas bastan para que p = CMg = ${fmt(b.p, 2)} y el beneficio sea cero.`
            : `La empresa ${b.gana} es más eficiente: fija p = ${fmt(b.p, 2)} (apenas el costo de la rival o su precio de monopolio) y atiende todo el mercado.`,
          'destacado',
        ),
        texto(
          `El cártel maximiza el beneficio conjunto con p = ${fmt(s.colusion.p, 2)}, pero no es estable: cada empresa gana bajando un poco su precio (flecha morada).`,
          'pequeno texto-suave',
        ),
        refMonsalve('competencia en precios (Bertrand), colusión y cártel.'),
      ),
    );
  }
  return { fig, panel: [resultados([comparacion, ...especifica])] };
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
      ],
    },
    {
      visibleSi: (p) => p['enfoque'] !== 'bertrand',
      controles: [
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
    {
      titulo: 'Cournot con n empresas',
      visibleSi: (p) => p['enfoque'] === 'cournot',
      controles: [{ id: 'n', etiqueta: 'Número de empresas n', tipo: 'slider', min: 1, max: 50, paso: 1 }],
    },
  ],
  planteamientos: {
    param: 'enfoque',
    opciones: [
      { valor: 'cournot', titulo: 'Cournot (curvas de reacción)', resumen: 'Competencia simultánea en cantidades: el equilibrio de Nash es el cruce de las funciones de reacción.' },
      { valor: 'stackelberg', titulo: 'Stackelberg (líder-seguidor)', resumen: 'El líder elige primero sobre la reacción de la seguidora y gana más que en Cournot.' },
      { valor: 'bertrand', titulo: 'Bertrand y colusión/cártel', resumen: 'Competencia en precios con bien homogéneo (p = CMg) frente al cártel que maximiza el beneficio conjunto.' },
    ],
  },
  calcular: (p: Params) => calcular(p as unknown as P),
};
