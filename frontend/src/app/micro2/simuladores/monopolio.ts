/* eslint-disable @typescript-eslint/no-explicit-any */
import { Bloque, Figura, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import { AZUL, DORADO, MORADO, NARANJA, ROJO, VERDE, aviso, figuraVacia, lectura, resultados, tabla, texto } from '../../core/tema';
import {
  ParamsMonopolio,
  ParamsTercer,
  ResMonopolio,
  ResTercer,
  costoMarginal,
  costoMedio,
  demanda,
  ingresoMarginal,
  monopolio,
  tercerGrado,
} from '../modelos/mercados';
import { Panel, curvaP, ejeX, ejeY, equilibrioP, figuraPaneles } from '../../macro2/simuladores/_paneles';
import { muestras, refVarian } from './_comun';

const SIM_ID = 'm2-monopolio';
// p(y) = 100 − 2y, CMg = 10 + y (C = 50 + 10y + y²/2): IMg = CMg ⇒ y* = 18, p* = 64; competencia y = 30, p = 40.
const DEF = {
  modo: 'simple' as string,
  a: 100,
  b: 2,
  c: 10,
  d: 1,
  F: 50,
  a1: 100,
  b1: 2,
  a2: 60,
  b2: 1,
};
type P = typeof DEF;

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/** Polígono sombreado en un panel. */
function area(fig: Figura, p: Panel, xs: number[], ys: number[], nombre: string, color: string, op = 0.28): void {
  fig.data.push({
    type: 'scatter',
    x: [...xs, xs[0]],
    y: [...ys, ys[0]],
    xaxis: ejeX(p),
    yaxis: ejeY(p),
    mode: 'lines',
    fill: 'toself',
    fillcolor: rgba(color, op),
    line: { width: 0, color },
    name: nombre,
    hoverinfo: 'name',
  });
}

export function parametrosMonopolio(p: P): ParamsMonopolio {
  return { a: p.a, b: p.b, c: p.c, d: p.d, F: p.F };
}
export function parametrosTercer(p: P): ParamsTercer {
  return { a1: p.a1, b1: p.b1, a2: p.a2, b2: p.b2, c: p.c, F: p.F };
}

export function calcular(p: P): Simulacion {
  try {
    return p.modo === 'tercer' ? tercer(p) : simpleOPrimer(p);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
}

function simpleOPrimer(p: P): Simulacion {
  const q = parametrosMonopolio(p);
  const r: ResMonopolio = monopolio(q);
  const primer = p.modo === 'primer';
  const ymax = Math.min(q.a / q.b, r.yc * 1.5) * 1.05;
  const pmax = q.a * 1.05;
  const M: Panel = {
    id: '',
    titulo: primer ? 'Discriminación de primer grado (perfecta)' : 'Monopolio: IMg = CMg',
    tituloX: 'Producción y',
    tituloY: 'Precio p y costos',
    rangoX: [0, ymax],
    rangoY: [0, pmax],
    dominio: { x: [0, 1], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0, 0.93] },
  };
  const fig = figuraPaneles(SIM_ID, [M], 560);
  const ys = linspace(0, ymax, 200);
  const ysPos = linspace(ymax / 400, ymax, 200);

  if (primer) {
    // El monopolista cobra a cada unidad su precio de reserva: se queda con todo el excedente.
    area(fig, M, [0, r.yc, 0], [q.a, r.pc, q.c], 'Excedente capturado por el monopolista', DORADO, 0.3);
  } else {
    area(fig, M, [0, r.y, 0], [q.a, r.p, r.p], `Excedente del consumidor = ${fmt(r.EC, 2)}`, AZUL, 0.22);
    area(fig, M, [0, r.y, r.y, 0], [r.p, r.p, r.cmg, q.c], `Excedente del productor = ${fmt(r.EP, 2)}`, VERDE, 0.2);
    area(fig, M, [r.y, r.yc, r.y], [r.p, r.pc, r.cmg], `Pérdida irrecuperable de eficiencia = ${fmt(r.PIE, 2)}`, ROJO, 0.45);
    if (r.cme < r.p)
      area(fig, M, [0, r.y, r.y, 0], [r.p, r.p, r.cme, r.cme], `Beneficio = ${fmt(r.beneficio, 2)}`, DORADO, 0.18);
  }
  curvaP(fig, M, ys, ys.map((y) => Math.max(0, demanda(q, y))), 'Demanda p(y)', AZUL, 'final', 'D');
  if (!primer) curvaP(fig, M, ys, muestras(ys, (y) => ingresoMarginal(q, y), pmax), 'Ingreso marginal IMg', MORADO, 'final', 'IMg');
  curvaP(fig, M, ys, muestras(ys, (y) => costoMarginal(q, y), pmax), 'Costo marginal CMg', ROJO, 'final', 'CMg');
  curvaP(fig, M, ysPos, muestras(ysPos, (y) => costoMedio(q, y), pmax), 'Costo medio CMe', NARANJA, 'intermedio', 'CMe');

  if (primer) {
    equilibrioP(fig, M, r.yc, r.pc, 'Última unidad: p = CMg', 'y₁ᵍ', DORADO, { simbolo: 'diamond' });
  } else {
    equilibrioP(fig, M, r.y, r.p, 'Monopolio (y*, p*)', 'E', DORADO, { simbolo: 'diamond' });
    equilibrioP(fig, M, r.y, r.cmg, 'IMg = CMg', '', MORADO, { lecturas: false });
    equilibrioP(fig, M, r.yc, r.pc, 'Competencia p = CMg', 'C', VERDE, { lecturas: false });
  }

  const ECprimer = 0;
  const benefPrimer = r.ECc + r.EPc - q.F;
  const lecturas: Bloque[] = [
    texto(
      primer
        ? `Con discriminación perfecta el monopolista vende y = ${fmt(r.yc, 2)} (donde p = CMg), cobra a cada unidad su precio de reserva y se queda con todo el excedente: no hay pérdida irrecuperable, pero el consumidor queda con excedente ${ECprimer}.`
        : `Regla de Varian: p(y)·[1 − 1/|ε|] = CMg ⇒ ${fmt(r.p, 2)} × (1 − 1/${fmt(r.elasticidad, 3)}) = ${fmt(r.cmg, 2)}. El monopolista opera en el tramo elástico (|ε| = ${fmt(r.elasticidad, 3)} > 1).`,
      'destacado',
    ),
  ];
  if (!primer && r.beneficio < 0)
    lecturas.push(aviso('Con este costo fijo el beneficio es negativo: a largo plazo el monopolista cerraría (p* < CMe).'));
  const panel = [
    resultados([
      lectura(
        primer ? 'Primer grado frente a monopolio simple' : 'Monopolio frente a competencia',
        tabla(
          primer
            ? [
                ['Producción y', r.y, r.yc],
                ['Excedente del consumidor', r.EC, ECprimer],
                ['Beneficio', r.beneficio, benefPrimer],
                ['Pérdida irrecuperable', r.PIE, 0],
              ]
            : [
                ['Producción y', r.y, r.yc],
                ['Precio p', r.p, r.pc],
                ['Excedente del consumidor', r.EC, r.ECc],
                ['Excedente del productor', r.EP, r.EPc],
                ['Pérdida irrecuperable', r.PIE, 0],
              ],
          primer ? ['', 'Precio único', 'Primer grado'] : ['', 'Monopolio', 'Competencia'],
        ),
      ),
      lectura(
        'Poder de mercado',
        tabla([
          ['Elasticidad |ε| en y*', r.elasticidad],
          ['Índice de Lerner (p − CMg)/p', r.lerner],
          ['Margen p/CMg', r.p / r.cmg],
          ['Beneficio monopolio simple', r.beneficio],
        ]),
      ),
      lectura(
        'Lectura',
        ...lecturas,
        refVarian('«El monopolio» (IMg = CMg, margen sobre el costo marginal y pérdida irrecuperable) y «La conducta monopolística» (discriminación de precios de primer y tercer grado).'),
      ),
    ]),
  ];
  return { fig, panel };
}

function tercer(p: P): Simulacion {
  const q = parametrosTercer(p);
  const r: ResTercer = tercerGrado(q);
  const mk = (id: '' | '2', titulo: string, a: number, b: number, dom: [number, number], mov: [number, number]): Panel => ({
    id,
    titulo,
    tituloX: id === '' ? 'Producción y₁' : 'Producción y₂',
    tituloY: id === '' ? 'Precio p₁' : 'Precio p₂',
    rangoX: [0, (a / b) * 1.05],
    rangoY: [0, Math.max(q.a1, q.a2) * 1.05],
    dominio: { x: dom, y: [0, 0.93] },
    movil: { x: [0, 1], y: mov },
    ...(id === '2' ? { enlaceY: 'y' } : {}),
  });
  const P1 = mk('', 'Mercado 1', q.a1, q.b1, [0, 0.46], [0.55, 0.97]);
  const P2 = mk('2', 'Mercado 2', q.a2, q.b2, [0.56, 1], [0, 0.42]);
  const fig = figuraPaneles(SIM_ID, [P1, P2], 900);
  const dibujar = (Pn: Panel, a: number, b: number, m: ResTercer['m1'], yU: number, i: number) => {
    const ys = linspace(0, a / b, 120);
    if (m.y > 0) {
      area(fig, Pn, [0, m.y, 0], [a, m.p, m.p], `EC mercado ${i} = ${fmt(m.EC, 2)}`, AZUL, 0.2);
      area(fig, Pn, [m.y, m.yc, m.y], [m.p, q.c, q.c], `Pérdida irrecuperable ${i} = ${fmt(m.PIE, 2)}`, ROJO, 0.4);
    }
    curvaP(fig, Pn, ys, ys.map((y) => a - b * y), `Demanda p${i}(y${i})`, AZUL, 'final', `D${i}`);
    curvaP(fig, Pn, ys, muestras(ys, (y) => a - 2 * b * y, Pn.rangoY[1]), `IMg${i}`, MORADO, 'final', `IMg${i}`);
    curvaP(fig, Pn, [0, a / b], [q.c, q.c], 'CMg = c', ROJO, 'final', 'CMg');
    curvaP(fig, Pn, [0, a / b], [r.pUnico, r.pUnico], 'Precio único (sin discriminar)', NARANJA, 'intermedio', 'p único');
    if (m.y > 0) equilibrioP(fig, Pn, m.y, m.p, `Mercado ${i}: IMg${i} = CMg`, `p${i}`, DORADO, { simbolo: 'diamond' });
    if (yU > 0) equilibrioP(fig, Pn, yU, r.pUnico, 'Con precio único', '', NARANJA, { lecturas: false, simbolo: 'circle-open' });
  };
  dibujar(P1, q.a1, q.b1, r.m1, r.y1Unico, 1);
  dibujar(P2, q.a2, q.b2, r.m2, r.y2Unico, 2);
  const e = (m: ResTercer['m1']) => (Number.isFinite(m.elasticidad) ? m.elasticidad : null);
  const panel = [
    resultados([
      lectura(
        'Discriminación de tercer grado',
        tabla(
          [
            ['Producción yᵢ', r.m1.y, r.m2.y],
            ['Precio pᵢ', r.m1.p, r.m2.p],
            ['Elasticidad |εᵢ|', e(r.m1), e(r.m2)],
            ['Pérdida irrecuperable', r.m1.PIE, r.m2.PIE],
          ],
          ['', 'Mercado 1', 'Mercado 2'],
        ),
      ),
      lectura(
        'Frente a un precio único',
        tabla([
          ['Precio único', r.pUnico],
          ['Beneficio con precio único', r.beneficioUnico],
          ['Beneficio discriminando', r.beneficio],
        ]),
      ),
      lectura(
        'Lectura',
        texto(
          `IMg₁ = IMg₂ = CMg: pᵢ·(1 − 1/|εᵢ|) = c. El mercado con demanda menos elástica paga más ` +
            `(p₁ = ${fmt(r.m1.p, 2)}, p₂ = ${fmt(r.m2.p, 2)}). Discriminar nunca reduce el beneficio frente al precio único.`,
          'destacado',
        ),
        refVarian('«La conducta monopolística», discriminación de precios de tercer grado: el monopolista iguala el ingreso marginal de cada mercado al costo marginal.'),
      ),
    ]),
  ];
  return { fig, panel };
}

const tercerVisible = (p: Params) => p['modo'] === 'tercer';

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 560,
  grupos: [
    {
      controles: [
        {
          id: 'modo',
          etiqueta: 'Fijación de precios',
          tipo: 'selector',
          opciones: [
            { valor: 'simple', etiqueta: 'Monopolio (precio único)' },
            { valor: 'primer', etiqueta: 'Primer grado (perfecta)' },
            { valor: 'tercer', etiqueta: 'Tercer grado (dos mercados)' },
          ],
        },
      ],
    },
    {
      visibleSi: (p) => !tercerVisible(p),
      titulo: 'Demanda inversa: p(y) = a − b·y',
      controles: [
        { id: 'a', etiqueta: 'Precio máximo a', tipo: 'slider', min: 20, max: 200, paso: 5 },
        { id: 'b', etiqueta: 'Pendiente b', tipo: 'slider', min: 0.25, max: 6, paso: 0.25 },
      ],
    },
    {
      visibleSi: tercerVisible,
      titulo: 'Mercados: pᵢ = aᵢ − bᵢ·yᵢ',
      controles: [
        { id: 'a1', etiqueta: 'a₁', tipo: 'slider', min: 20, max: 200, paso: 5 },
        { id: 'b1', etiqueta: 'b₁', tipo: 'slider', min: 0.25, max: 6, paso: 0.25 },
        { id: 'a2', etiqueta: 'a₂', tipo: 'slider', min: 20, max: 200, paso: 5 },
        { id: 'b2', etiqueta: 'b₂', tipo: 'slider', min: 0.25, max: 6, paso: 0.25 },
      ],
    },
    {
      titulo: 'Costos: C(y) = F + c·y + (d/2)·y²',
      controles: [
        { id: 'c', etiqueta: 'Costo marginal inicial c', tipo: 'slider', min: 0, max: 80, paso: 1 },
        { id: 'F', etiqueta: 'Costo fijo F', tipo: 'slider', min: 0, max: 1000, paso: 10 },
      ],
    },
    {
      visibleSi: (p) => !tercerVisible(p),
      controles: [{ id: 'd', etiqueta: 'Pendiente del CMg, d', tipo: 'slider', min: 0, max: 5, paso: 0.1 }],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
