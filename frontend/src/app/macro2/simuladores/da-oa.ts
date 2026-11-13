import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import {
  AZUL,
  DORADO,
  MORADO,
  ROJO,
  SUAVE,
  VERDE,
  NARANJA,
  aviso,
  figura,
  figuraVacia,
  lectura,
  resultados,
  tabla,
  texto,
} from '../../core/tema';
import { ParamsDAOA2, PuntoDAOA, ajuste, cortoPlazo, curvaDA, curvaOACP, largoPlazo } from '../modelos/daoa';
import { curva, delta, equilibrio, refEstandar } from './_comun';

const SIM_ID = 'm2-da-oa';
// DA: Y = 2,000 − 10·P; OACP: P = W + (Y − 1,000)/10; OALP: Y = 1,000. Con W = 100 el equilibrio es (1,000, 100).
const DEF = {
  D0: 2000,
  d: 10,
  W: 100,
  sigma: 10,
  Yp: 1000,
  autoajuste: 'si' as string,
  theta: 1,
  dD0: 200,
  dW: 0,
  dYp: 0,
};
type P = typeof DEF;

export function escenarios(p: P): [ParamsDAOA2, ParamsDAOA2] {
  const base: ParamsDAOA2 = { D0: p.D0, d: p.d, W: p.W, sigma: p.sigma, Yp: p.Yp };
  return [base, { ...base, D0: p.D0 + p.dD0, W: p.W + p.dW, Yp: p.Yp + p.dYp }];
}

export function calcular(p: P): Simulacion {
  const [b, n] = escenarios(p);
  const auto = p.autoajuste !== 'no';
  let e0: PuntoDAOA;
  let e1: PuntoDAOA;
  let e2: PuntoDAOA | null = null;
  let camino: PuntoDAOA[] = [];
  try {
    e0 = cortoPlazo(b);
    e1 = cortoPlazo(n);
    if (auto) {
      e2 = largoPlazo(n);
      camino = ajuste(n, p.theta);
    }
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const choqueDA = p.dD0 !== 0;
  const choqueOA = p.dW !== 0 || p.dYp !== 0;
  const choque = choqueDA || choqueOA;
  const brecha = e1.Y - n.Yp;
  const pts = [e0, e1, ...(e2 ? [e2] : [])];
  const pmax = Math.max(...pts.map((e) => e.P)) * 1.6;
  const ymax = Math.max(...pts.map((e) => e.Y), b.Yp, n.Yp) * 1.5;
  const fig = figura('PIB real Y', 'Nivel de precios P', SIM_ID, {
    xaxis: { range: [0, ymax] },
    yaxis: { range: [0, pmax] },
  });

  const ps = linspace(0, pmax, 60);
  const ys = linspace(0, ymax, 160);
  const trazarDA = (q: ParamsDAOA2, nombre: string, color: string, fantasma = false) =>
    curva(fig, ps.map((P) => Math.max(0, curvaDA(q, P))), ps, nombre, color, fantasma);
  const trazarOA = (q: ParamsDAOA2, nombre: string, color: string, fantasma = false, extra = {}) =>
    curva(
      fig,
      ys,
      ys.map((y) => {
        const v = curvaOACP(q, y);
        return v >= 0 && v <= pmax * 1.5 ? v : null;
      }),
      nombre,
      color,
      fantasma,
      extra,
    );
  const trazarOALP = (Yp: number, nombre: string, fantasma = false) =>
    curva(fig, [Yp, Yp], [0, pmax], nombre, NARANJA, fantasma);

  if (choqueDA) trazarDA(b, 'DA', AZUL, true);
  trazarDA(n, 'DA', choqueDA ? VERDE : AZUL);
  if (choqueOA) trazarOA(b, 'OACP', ROJO, true);
  trazarOA(n, 'OACP', choqueOA ? MORADO : ROJO);
  if (p.dYp !== 0) trazarOALP(b.Yp, 'OALP', true);
  trazarOALP(n.Yp, 'OALP (Yₚ)');
  if (auto && e2 && Math.abs(e2.P - e1.P) > 1e-9)
    trazarOA({ ...n, W: e2.P }, 'OACP tras el ajuste', MORADO, false, {
      line: { color: MORADO, width: 2, dash: 'dash' },
    });

  // Brecha de producto: segmento entre Yₚ y Y de corto plazo.
  if (Math.abs(brecha) > 1e-6)
    fig.data.push({
      type: 'scatter',
      x: [n.Yp, e1.Y],
      y: [e1.P, e1.P],
      mode: 'lines',
      name: brecha > 0 ? 'Brecha inflacionaria' : 'Brecha recesiva',
      line: { color: brecha > 0 ? ROJO : AZUL, width: 7 },
      opacity: 0.45,
      hovertemplate: `Brecha: ${fmt(brecha, 2)}<extra></extra>`,
    });
  if (auto && camino.length > 1)
    fig.data.push({
      type: 'scatter',
      x: camino.map((e) => e.Y),
      y: camino.map((e) => e.P),
      mode: 'lines+markers',
      name: 'Autocorrección período a período',
      line: { color: DORADO, width: 1, dash: 'dot' },
      marker: { size: 5, color: DORADO },
      hovertemplate: 'Y = %{x:.2f}<br>P = %{y:.2f}<extra></extra>',
    });

  const ejes = { x0: 0, y0: 0 };
  equilibrio(fig, e0.Y, e0.P, choque ? 'Equilibrio inicial' : 'Equilibrio (Y*, P*)', 'E₀', choque ? SUAVE : DORADO, ejes);
  if (choque) {
    equilibrio(fig, e1.Y, e1.P, 'Corto plazo tras el choque', 'E₁', VERDE, { ...ejes, simbolo: 'square' });
    if (e2 && Math.abs(e2.Y - e1.Y) + Math.abs(e2.P - e1.P) > 1e-6)
      equilibrio(fig, e2.Y, e2.P, 'Largo plazo', 'E₂', DORADO, { ...ejes, simbolo: 'diamond' });
  }

  const lecturas: Bloque[] = [];
  if (Math.abs(brecha) > 1e-6)
    lecturas.push(
      texto(
        brecha > 0
          ? `Brecha inflacionaria de ${fmt(brecha, 2)}: Y supera a Yₚ, el desempleo cae bajo su tasa natural y los salarios nominales suben.`
          : `Brecha recesiva de ${fmt(-brecha, 2)}: Y está bajo Yₚ, hay desempleo alto y los salarios nominales bajan.`,
        'destacado',
      ),
    );
  if (auto && e2 && Math.abs(brecha) > 1e-6)
    lecturas.push(
      texto(
        `Autocorrección: la OACP se desplaza hasta que Y = Yₚ = ${fmt(e2.Y, 2)} con P = ${fmt(e2.P, 2)}` +
          `${camino.length > 1 ? ` (${camino.length - 1} períodos con θ = ${fmt(p.theta, 2)})` : ''}.`,
        'pequeno texto-suave',
      ),
    );
  if (p.dW > 0 && p.dD0 === 0)
    lecturas.push(
      texto('Choque de oferta negativo: el producto cae y los precios suben a la vez (estanflación).', 'pequeno texto-suave'),
    );
  if (!auto && Math.abs(brecha) > 1e-6)
    lecturas.push(texto('Activa la autocorrección para ver cómo se cierra la brecha en el largo plazo.', 'pequeno texto-suave'));
  if (!choque)
    lecturas.push(texto('Aplica un choque de demanda o de oferta: la posición inicial queda como curva fantasma.', 'pequeno texto-suave'));

  const filas: (string | number | null)[][] = [
    ['PIB real Y', e0.Y, e1.Y, e2?.Y ?? null],
    ['Nivel de precios P', e0.P, e1.P, e2?.P ?? null],
    ['Brecha Y − Yₚ', delta(e0.Y - b.Yp), delta(brecha), e2 ? 0 : null],
  ];
  const panel = [
    resultados([
      lectura('Equilibrios', tabla(filas, ['', 'Inicial', 'Corto plazo', 'Largo plazo'])),
      lectura(
        'Lectura',
        ...lecturas,
        refEstandar('modelo DA-OA con OACP y OALP; Krugman y Obstfeld (2006) no lo desarrolla en economía cerrada.'),
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
      titulo: 'Demanda agregada: Y = D₀ − d·P',
      controles: [
        { id: 'D0', etiqueta: 'Demanda autónoma D₀', tipo: 'slider', min: 1200, max: 3000, paso: 50 },
        { id: 'd', etiqueta: 'Sensibilidad a los precios d', tipo: 'slider', min: 2, max: 30, paso: 1 },
      ],
    },
    {
      titulo: 'Oferta: P = W + (Y − Yₚ)/σ',
      controles: [
        { id: 'W', etiqueta: 'Costos nominales W (precio esperado)', tipo: 'slider', min: 40, max: 200, paso: 5 },
        { id: 'sigma', etiqueta: 'Pendiente de la OACP σ', tipo: 'slider', min: 2, max: 40, paso: 1 },
        { id: 'Yp', etiqueta: 'Producto potencial Yₚ (OALP)', tipo: 'slider', min: 500, max: 1500, paso: 50 },
      ],
    },
    {
      titulo: 'Largo plazo',
      controles: [
        {
          id: 'autoajuste',
          etiqueta: 'Autocorrección de largo plazo',
          tipo: 'selector',
          opciones: [
            { valor: 'si', etiqueta: 'Activada' },
            { valor: 'no', etiqueta: 'Solo corto plazo' },
          ],
        },
      ],
    },
    {
      visibleSi: (p) => p['autoajuste'] !== 'no',
      controles: [
        { id: 'theta', etiqueta: 'Velocidad de ajuste de salarios θ', tipo: 'slider', min: 0.1, max: 1, paso: 0.05 },
      ],
    },
    {
      titulo: 'Choques (estática comparativa)',
      controles: [
        { id: 'dD0', etiqueta: 'Choque de demanda ΔD₀', tipo: 'slider', min: -400, max: 400, paso: 25 },
        { id: 'dW', etiqueta: 'Choque de oferta ΔW (precio de insumos)', tipo: 'slider', min: -40, max: 40, paso: 5 },
        { id: 'dYp', etiqueta: 'Choque de productividad ΔYₚ', tipo: 'slider', min: -300, max: 300, paso: 25 },
      ],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
