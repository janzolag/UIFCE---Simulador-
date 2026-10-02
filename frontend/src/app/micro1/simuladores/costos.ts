import { Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import {
  AZUL, DORADO, MORADO, ROJO, VERDE, aviso, figura, figuraVacia, lectura, punto, referencia, resultados, tabla, texto,
} from '../../core/tema';
import { CostoCubico, constanteBCd, costoCpCobbDouglas, costoLp, curvasLp, demandasCondicionadas } from '../modelos/costos';
import { CobbDouglasP } from '../modelos/produccion';

const SIM_ID = 'costos';
const DEF = { modo: 'corto', CF: 20, a: 10, b: 2, c: 0.5, alpha: 0.3, beta: 0.4, w1: 2, w2: 3 };
type P = typeof DEF;

function corto(CF: number, a: number, b: number, c: number): Simulacion {
  const k = new CostoCubico(CF, a, b, c);
  const qmax = Math.max(3 * k.q_min_cme(), 3 * k.q_min_cvme(), 5);
  const q = linspace(qmax / 300, qmax, 300);
  const fig = figura('Cantidad q', 'Pesos por unidad', SIM_ID + '-corto');
  const curvas: [string, (v: number) => number, string, string][] = [
    ['CMg', k.CMg, ROJO, 'solid'], ['CMe', k.CMe, AZUL, 'solid'],
    ['CVMe', k.CVMe, VERDE, 'dash'], ['CFMe', (v) => k.CF / v, MORADO, 'dot'],
  ];
  for (const [nom, f, col, dash] of curvas) {
    fig.data.push({
      type: 'scatter', x: q, y: q.map(f), mode: 'lines', name: nom,
      line: { color: col, width: dash === 'solid' ? 3 : 2, dash },
    });
  }
  fig.layout.yaxis.range = [0, k.CMe(k.q_min_cme()) * 2.2];
  punto(fig, k.q_min_cvme(), k.precio_cierre(), 'Punto de cierre (mín CVMe)', VERDE, undefined, 'cierre');
  punto(fig, k.q_min_cme(), k.precio_nivelacion(), 'Punto de nivelación (mín CMe)', undefined, undefined, 'nivelación');
  const panel = [
    resultados([
      lectura('Puntos clave', tabla([
        ['Mínimo del CMg en q', k.q_min_cmg()],
        ['Mínimo del CVMe en q', k.q_min_cvme()], ['Precio de cierre', k.precio_cierre()],
        ['Mínimo del CMe en q', k.q_min_cme()], ['Precio de nivelación', k.precio_nivelacion()],
      ])),
      lectura(
        'Lectura económica',
        texto(
          'El CMg corta al CVMe y al CMe en sus mínimos. Entre el precio de cierre y el de ' +
            'nivelación la empresa produce con pérdidas porque cubre al menos su costo variable.',
        ),
        texto(`C(q) = ${fmt(CF)} + ${fmt(a)}q − ${fmt(b)}q² + ${fmt(c)}q³`, 'pequeno texto-suave'),
        referencia('semana 7 (curvas de costo de corto plazo en forma de U).'),
      ),
    ]),
  ];
  return { fig, panel };
}

function largo(alpha: number, beta: number, w1: number, w2: number): Simulacion {
  const tec = new CobbDouglasP(1, alpha, beta);
  const z = linspace(0.05, 10, 300);
  const cme = z.map((v) => costoLp(tec, w1, w2, v) / v);
  const cmg = z.map((v) => curvasLp(tec, w1, w2, v).CMg);
  const fig = figura('Producción z', 'Pesos por unidad', SIM_ID + '-largo');
  fig.data.push({ type: 'scatter', x: z, y: cme, mode: 'lines', name: 'CMe de largo plazo', line: { color: AZUL, width: 4 } });
  fig.data.push({ type: 'scatter', x: z, y: cmg, mode: 'lines', name: 'CMg de largo plazo', line: { color: ROJO, width: 3 } });
  [2, 5, 8].forEach((zk, i) => {
    const k = demandasCondicionadas(tec, w1, w2, zk).y; // planta óptima para zk
    const zs = linspace(zk * 0.3, Math.min(zk * 2.2, 10), 120);
    fig.data.push({
      type: 'scatter', x: zs, y: zs.map((v) => costoCpCobbDouglas(alpha, beta, w1, w2, k, v).CMe), mode: 'lines',
      name: i === 0 ? 'CMe de corto plazo (k fijo)' : undefined, showlegend: i === 0,
      line: { color: DORADO, width: 1.8, dash: 'dash' },
    });
    punto(fig, zk, costoLp(tec, w1, w2, zk) / zk, `Tangencia z = ${zk}`, DORADO, undefined, undefined, { showlegend: false });
  });
  fig.layout.yaxis.range = [0, (2.5 * costoLp(tec, w1, w2, 5)) / 5];
  const s = alpha + beta;
  const tipo = s < 1 ? 'decrecientes' : Math.abs(s - 1) < 1e-9 ? 'constantes' : 'crecientes';
  const forma = {
    decrecientes: 'convexa: el CMe y el CMg crecen',
    constantes: 'lineal: CMe = CMg constantes',
    crecientes: 'cóncava: el CMe y el CMg decrecen (monopolio natural)',
  }[tipo];
  const B = constanteBCd(alpha, beta, w1, w2);
  const panel = [
    resultados([
      lectura('Función de costo', tabla([
        ['α + β', s], ['Rendimientos a escala', tipo], ['B en C(z) = B·z^{1/(α+β)}', B],
        ['Costo de producir z = 5', costoLp(tec, w1, w2, 5)],
      ])),
      lectura(
        'Lectura económica',
        texto(`La curva de costo total es ${forma}.`),
        texto(
          'Cada curva punteada es el CMe de corto plazo con la planta (k) óptima para una ' +
            'producción; el CMe de largo plazo es su envolvente y la toca en ese punto.',
        ),
        referencia('figura 6.3 y ejemplo 1 de la semana 6; sección 7.4.'),
      ),
    ]),
  ];
  return { fig, panel };
}

export function calcular({ modo, CF, a, b, c, alpha, beta, w1, w2 }: P): Simulacion {
  try {
    return modo === 'corto' ? corto(CF, a, b, c) : largo(alpha, beta, w1, w2);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 540,
  grupos: [
    {
      controles: [
        {
          id: 'modo', etiqueta: 'Horizonte', tipo: 'selector',
          opciones: [
            { valor: 'corto', etiqueta: 'Corto plazo (costo cúbico)' },
            { valor: 'largo', etiqueta: 'Largo plazo y envolvente (Cobb-Douglas)' },
          ],
        },
      ],
    },
    {
      titulo: 'C(q) = CF + aq − bq² + cq³',
      visibleSi: (p) => p['modo'] !== 'largo',
      controles: [
        { id: 'CF', etiqueta: 'Costo fijo CF', tipo: 'slider', min: 0, max: 100, paso: 1 },
        { id: 'a', etiqueta: 'a', tipo: 'slider', min: 1, max: 30, paso: 0.5 },
        { id: 'b', etiqueta: 'b', tipo: 'slider', min: 0, max: 5, paso: 0.1 },
        { id: 'c', etiqueta: 'c', tipo: 'slider', min: 0.05, max: 2, paso: 0.05 },
      ],
    },
    {
      titulo: 'Tecnología F = x^α y^β',
      visibleSi: (p) => p['modo'] === 'largo',
      controles: [
        { id: 'alpha', etiqueta: 'α', tipo: 'slider', min: 0.05, max: 1.2, paso: 0.05 },
        { id: 'beta', etiqueta: 'β', tipo: 'slider', min: 0.05, max: 1.2, paso: 0.05 },
        { id: 'w1', etiqueta: 'Precio de x (w1)', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
        { id: 'w2', etiqueta: 'Precio de y (w2)', tipo: 'slider', min: 0.5, max: 10, paso: 0.1 },
      ],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
