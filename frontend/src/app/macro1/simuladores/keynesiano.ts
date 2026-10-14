import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import {
  AZUL,
  DORADO,
  SUAVE,
  VERDE,
  aviso,
  figura,
  figuraVacia,
  lectura,
  punto,
  resultados,
  tabla,
  texto,
} from '../../core/tema';
import { ParamsKeynes, ResKeynes, demandaKeynes, equilibrioKeynes } from '../modelos/keynesiano';
import { delta, ref } from './_comun';

const SIM_ID = 'keynesiano';
// Multiplicador 1/(1 − 0.6·0.75) = 1.818; ΔG = 50 sube el producto en 90.9.
const DEF = { c0: 100, c1: 0.6, t: 0.25, T0: 0, I: 150, G: 200, dG: 50, dT: 0, dc0: 0, dI: 0 };
type P = typeof DEF;

export function escenarios(p: P): [ParamsKeynes, ParamsKeynes] {
  const base: ParamsKeynes = { c0: p.c0, c1: p.c1, t: p.t, T0: p.T0, I: p.I, G: p.G };
  return [base, { ...base, c0: p.c0 + p.dc0, T0: p.T0 + p.dT, I: p.I + p.dI, G: p.G + p.dG }];
}

export function calcular(p: P): Simulacion {
  const [b, n] = escenarios(p);
  let r0: ResKeynes;
  let r1: ResKeynes;
  try {
    r0 = equilibrioKeynes(b);
    r1 = equilibrioKeynes(n);
  } catch (e) {
    if (e instanceof ErrorParametro)
      return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const hayChoque = Math.abs(r1.Y - r0.Y) > 1e-9 || Math.abs(r1.A - r0.A) > 1e-9;
  const ymax = Math.max(r0.Y, r1.Y, 1) * 1.5;
  const ys = linspace(0, ymax, 120);
  const fig = figura('Producto Y', 'Demanda agregada Z', SIM_ID, {
    xaxis: { range: [0, ymax] },
    yaxis: { range: [0, ymax] },
  });
  fig.data.push({
    type: 'scatter',
    x: [0, ymax],
    y: [0, ymax],
    mode: 'lines',
    name: 'Y = Z (45°)',
    line: { color: SUAVE, width: 1.5, dash: 'dash' },
  });
  fig.data.push({
    type: 'scatter',
    x: ys,
    y: ys.map((y) => demandaKeynes(b, y)),
    mode: 'lines',
    name: 'Z inicial',
    line: { color: AZUL, width: 3 },
  });
  if (hayChoque)
    fig.data.push({
      type: 'scatter',
      x: ys,
      y: ys.map((y) => demandaKeynes(n, y)),
      mode: 'lines',
      name: 'Z después del choque',
      line: { color: VERDE, width: 3 },
    });
  for (const r of hayChoque ? [r0, r1] : [r0])
    fig.data.push({
      type: 'scatter',
      x: [r.Y, r.Y],
      y: [0, r.Y],
      mode: 'lines',
      showlegend: false,
      line: { color: SUAVE, dash: 'dot', width: 1.2 },
      hoverinfo: 'skip',
    });
  punto(fig, r0.Y, r0.Y, 'Equilibrio inicial', undefined, undefined, 'E₀');
  if (hayChoque) punto(fig, r1.Y, r1.Y, 'Equilibrio final', DORADO, 'diamond', 'E₁');

  const dY = r1.Y - r0.Y;
  const dA = r1.A - r0.A;
  const interpretacion: Bloque[] = [];
  if (hayChoque) {
    interpretacion.push(
      texto(
        `El gasto autónomo cambió en ${fmt(delta(dA), 2)} y el producto en ${fmt(delta(dY), 2)}: ` +
          `cada peso de gasto autónomo se multiplica por ${fmt(r0.multiplicador)} a través de rondas sucesivas de consumo.`,
        'destacado',
      ),
    );
    if (p.dc0 < 0 && p.dG === 0 && p.dT === 0 && p.dI === 0)
      interpretacion.push(
        texto(
          'Paradoja del ahorro: los hogares quieren ahorrar más, el producto cae y el ahorro nacional (privado + público) termina igual a la inversión, que no cambió.',
          'pequeno texto-suave',
        ),
      );
  } else
    interpretacion.push(
      texto(
        'Mueve los choques (ΔG, ΔT₀, Δc₀, ΔĪ) para ver el efecto multiplicador.',
        'pequeno texto-suave',
      ),
    );

  const panel = [
    resultados([
      lectura(
        'Equilibrio Y = Z',
        tabla(
          [
            ['Producto Y', r0.Y, r1.Y],
            ['Gasto autónomo A', r0.A, r1.A],
            ['Consumo C', r0.C, r1.C],
            ['Impuestos T = T₀ + tY', r0.T, r1.T],
            ['Ingreso disponible Y − T', r0.YD, r1.YD],
            ['Ahorro privado', r0.ahorroPrivado, r1.ahorroPrivado],
            ['Ahorro público T − G', r0.ahorroPublico, r1.ahorroPublico],
          ],
          ['', 'Inicial', 'Después del choque'],
        ),
      ),
      lectura(
        'Multiplicadores',
        tabla([
          ['Gasto: 1 / (1 − c₁(1 − t))', r0.multiplicador],
          ['Impuesto fijo: −c₁ / (1 − c₁(1 − t))', r0.multImpuesto],
          ['Presupuesto equilibrado (ΔG = ΔT₀)', r0.multEquilibrado],
          ['Pendiente de Z: c₁(1 − t)', r0.pendiente],
        ]),
        texto(
          'El impuesto proporcional t aplana Z y reduce el multiplicador: actúa como estabilizador automático.',
          'pequeno texto-suave',
        ),
      ),
      lectura(
        'Lectura',
        ...interpretacion,
        ref('cap. 3, «El mercado de bienes»: el multiplicador y la paradoja del ahorro.'),
      ),
    ]),
  ];
  return { fig, panel };
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 540,
  grupos: [
    {
      titulo: 'Consumo e impuestos',
      controles: [
        { id: 'c0', etiqueta: 'Consumo autónomo c₀', tipo: 'slider', min: 0, max: 300, paso: 5 },
        {
          id: 'c1',
          etiqueta: 'Propensión a consumir c₁',
          tipo: 'slider',
          min: 0,
          max: 0.95,
          paso: 0.01,
        },
        { id: 't', etiqueta: 'Tasa de impuesto t', tipo: 'slider', min: 0, max: 0.6, paso: 0.01 },
        {
          id: 'T0',
          etiqueta: 'Impuesto fijo T₀ (negativo = transferencia)',
          tipo: 'slider',
          min: -100,
          max: 300,
          paso: 5,
        },
      ],
    },
    {
      titulo: 'Gasto autónomo',
      controles: [
        { id: 'I', etiqueta: 'Inversión Ī', tipo: 'slider', min: 0, max: 400, paso: 5 },
        { id: 'G', etiqueta: 'Gasto público G', tipo: 'slider', min: 0, max: 500, paso: 5 },
      ],
    },
    {
      titulo: 'Choques',
      controles: [
        { id: 'dG', etiqueta: 'ΔG', tipo: 'slider', min: -150, max: 150, paso: 5 },
        { id: 'dT', etiqueta: 'ΔT₀', tipo: 'slider', min: -150, max: 150, paso: 5 },
        {
          id: 'dc0',
          etiqueta: 'Δc₀ (confianza del consumidor)',
          tipo: 'slider',
          min: -100,
          max: 100,
          paso: 5,
        },
        {
          id: 'dI',
          etiqueta: 'ΔĪ (expectativas de las empresas)',
          tipo: 'slider',
          min: -150,
          max: 150,
          paso: 5,
        },
      ],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
