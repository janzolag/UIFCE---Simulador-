import { Bloque, Figura, Params, Simulacion, SimuladorDef } from '../../core/tipos';
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
  aviso,
  figura,
  figuraVacia,
  lectura,
  punto,
  resultados,
  tabla,
  texto,
} from '../../core/tema';
import {
  ParamsDAOA,
  Trayectoria,
  demandaAgregada,
  ofertaAgregada,
  trayectoria,
} from '../modelos/daoa';
import { GRUPOS_BIENES, ref } from './_comun';

const SIM_ID = 'da-oa';
// DA: Y = (340 + 0.5·M/P)/0.55. Con M = 400 y Ȳₙ = 1,000 el precio de mediano plazo es 200/210 = 0.952.
const DEF = {
  c0: 100,
  c1: 0.6,
  T: 100,
  b0: 100,
  b1: 0.1,
  b2: 10,
  G: 200,
  M: 400,
  k: 0.5,
  h: 20,
  Yn: 1000,
  lam: 1,
  dM: 100,
  dG: 0,
  dYn: 0,
};
type P = typeof DEF;

export function escenarios(p: P): [ParamsDAOA, ParamsDAOA] {
  const base: ParamsDAOA = {
    c0: p.c0,
    c1: p.c1,
    T: p.T,
    b0: p.b0,
    b1: p.b1,
    b2: p.b2,
    G: p.G,
    M: p.M,
    k: p.k,
    h: p.h,
    Yn: p.Yn,
    lam: p.lam,
  };
  return [base, { ...base, M: p.M + p.dM, G: p.G + p.dG, Yn: p.Yn + p.dYn }];
}

function trazarDA(fig: Figura, q: ParamsDAOA, pmax: number, nombre: string, color: string): void {
  const ps = linspace(pmax * 0.04, pmax, 140);
  fig.data.push({
    type: 'scatter',
    x: ps.map((x) => demandaAgregada(q, x)),
    y: ps,
    mode: 'lines',
    name: nombre,
    line: { color, width: 3 },
  });
}

export function calcular(p: P): Simulacion {
  const [b, n] = escenarios(p);
  let tr: Trayectoria;
  try {
    tr = trayectoria(b, n);
  } catch (e) {
    if (e instanceof ErrorParametro)
      return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const { inicial, impacto, final, camino } = tr;
  const pmax = Math.max(inicial.P, impacto.P, final.P) * 1.6;
  const ymax = Math.max(inicial.Y, impacto.Y, final.Y, b.Yn, n.Yn) * 1.4;
  const fig = figura('Producto Y', 'Nivel de precios P', SIM_ID, {
    xaxis: { range: [0, ymax] },
    yaxis: { range: [0, pmax] },
  });
  const ys = linspace(0, ymax, 120);
  const oa = (q: ParamsDAOA, Pe: number) =>
    ys.map((y) => {
      const v = ofertaAgregada(q, Pe, y);
      return v >= 0 && v <= pmax * 1.5 ? v : null;
    });
  const choqueDA = p.dM !== 0 || p.dG !== 0;
  const choqueOA = p.dYn !== 0;
  trazarDA(fig, b, pmax, 'DA inicial', AZUL);
  if (choqueDA) trazarDA(fig, n, pmax, 'DA después del choque', VERDE);
  fig.data.push({
    type: 'scatter',
    x: ys,
    y: oa(n, inicial.P),
    mode: 'lines',
    name: 'OA de corto plazo (Pᵉ inicial)',
    line: { color: ROJO, width: 3 },
  });
  if (Math.abs(final.P - inicial.P) > 1e-9)
    fig.data.push({
      type: 'scatter',
      x: ys,
      y: oa(n, final.P),
      mode: 'lines',
      name: 'OA cuando Pᵉ = P final',
      line: { color: MORADO, width: 2.5, dash: 'dash' },
    });
  fig.data.push({
    type: 'scatter',
    x: [b.Yn, b.Yn],
    y: [0, pmax],
    mode: 'lines',
    name: 'Ȳₙ (OA de largo plazo)',
    line: { color: SUAVE, width: 1.5, dash: 'dot' },
  });
  if (choqueOA)
    fig.data.push({
      type: 'scatter',
      x: [n.Yn, n.Yn],
      y: [0, pmax],
      mode: 'lines',
      name: 'Ȳₙ después del choque',
      line: { color: SUAVE, width: 1.5, dash: 'dashdot' },
    });
  if (choqueDA || choqueOA)
    fig.data.push({
      type: 'scatter',
      x: camino.map((e) => e.Y),
      y: camino.map((e) => e.P),
      mode: 'lines+markers',
      name: 'Ajuste período a período',
      line: { color: DORADO, width: 1, dash: 'dot' },
      marker: { size: 5, color: DORADO },
      hovertemplate: 'Y = %{x:.2f}<br>P = %{y:.4f}<extra></extra>',
    });
  punto(fig, inicial.Y, inicial.P, 'Mediano plazo inicial', undefined, undefined, 'E₀');
  if (choqueDA || choqueOA) {
    punto(fig, impacto.Y, impacto.P, 'Corto plazo (impacto)', VERDE, 'square', 'E₁');
    punto(fig, final.Y, final.P, 'Mediano plazo final', DORADO, 'diamond', 'E₂');
  }

  const lecturas: Bloque[] = [];
  if (p.lam === 0)
    lecturas.push(
      aviso(
        'Con λ = 0 los precios no responden a la brecha de producto: la economía se queda en el corto plazo (precios fijos).',
      ),
    );
  if (choqueDA || choqueOA) {
    lecturas.push(
      texto(
        `Al impacto el producto pasa de ${fmt(inicial.Y, 2)} a ${fmt(impacto.Y, 2)}; en el mediano plazo vuelve a Ȳₙ = ${fmt(final.Y, 2)} ` +
          `y el nivel de precios termina en ${fmt(final.P, 4)}.`,
        'destacado',
      ),
    );
    if (tr.periodos95 !== null && tr.periodos95 > 0)
      lecturas.push(
        texto(
          `La brecha de producto se cierra en un 95 % en ${tr.periodos95} períodos (Pᵉₜ₊₁ = Pₜ).`,
          'pequeno texto-suave',
        ),
      );
    if (p.dM !== 0 && p.dG === 0 && p.dYn === 0)
      lecturas.push(
        texto(
          `Neutralidad del dinero: M cambia un ${fmt((p.dM / p.M) * 100, 2)} % y P un ${fmt((final.P / inicial.P - 1) * 100, 2)} %; ` +
            'en el mediano plazo Y e i vuelven a sus valores iniciales.',
          'pequeno texto-suave',
        ),
      );
    if (p.dG !== 0 && p.dM === 0 && p.dYn === 0)
      lecturas.push(
        texto(
          `En el mediano plazo Y no cambia pero la tasa pasa de ${fmt(inicial.i, 3)} % a ${fmt(final.i, 3)} %: ` +
            'la composición del gasto cambia entre inversión y gasto público.',
          'pequeno texto-suave',
        ),
      );
  } else
    lecturas.push(
      texto(
        'Mueve ΔM, ΔG o ΔȲₙ para sacar a la economía de su mediano plazo.',
        'pequeno texto-suave',
      ),
    );

  const panel = [
    resultados([
      lectura(
        'Corto y mediano plazo',
        tabla(
          [
            ['Producto Y', inicial.Y, impacto.Y, final.Y],
            ['Nivel de precios P', inicial.P, impacto.P, final.P],
            ['Tasa de interés i (%)', inicial.i, impacto.i, final.i],
            ['Brecha Y − Ȳₙ', inicial.Y - b.Yn, impacto.Y - n.Yn, final.Y - n.Yn],
          ],
          ['', 'Inicial', 'Impacto', 'Mediano plazo'],
        ),
      ),
      lectura(
        'Cómo se ajusta',
        texto(
          'Al impacto Pᵉ todavía es el precio inicial: la economía se mueve sobre la OA de corto plazo.',
          'pequeno',
        ),
        texto(
          'Cada período los precios esperados se corrigen (Pᵉₜ₊₁ = Pₜ) y la OA se desplaza hasta que Y = Ȳₙ.',
          'pequeno',
        ),
      ),
      lectura(
        'Lectura',
        ...lecturas,
        ref('modelo OA–DA («Todos los mercados juntos»): efectos de corto y mediano plazo.'),
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
      titulo: 'Oferta agregada: P = Pᵉ·[1 + λ(Y − Ȳₙ)/Ȳₙ]',
      controles: [
        {
          id: 'Yn',
          etiqueta: 'Producto natural Ȳₙ',
          tipo: 'slider',
          min: 400,
          max: 2000,
          paso: 10,
        },
        {
          id: 'lam',
          etiqueta: 'Respuesta de precios λ',
          tipo: 'slider',
          min: 0,
          max: 3,
          paso: 0.05,
        },
      ],
    },
    {
      titulo: 'Dinero: M/P = k·Y − h·i',
      controles: [
        { id: 'M', etiqueta: 'Oferta de dinero M', tipo: 'slider', min: 50, max: 1000, paso: 10 },
        {
          id: 'k',
          etiqueta: 'Sensibilidad al ingreso k',
          tipo: 'slider',
          min: 0.1,
          max: 1,
          paso: 0.05,
        },
        {
          id: 'h',
          etiqueta: 'Sensibilidad a la tasa h',
          tipo: 'slider',
          min: 0,
          max: 100,
          paso: 1,
        },
      ],
    },
    ...GRUPOS_BIENES,
    {
      titulo: 'Choques',
      controles: [
        {
          id: 'dM',
          etiqueta: 'ΔM (política monetaria)',
          tipo: 'slider',
          min: -200,
          max: 300,
          paso: 10,
        },
        {
          id: 'dG',
          etiqueta: 'ΔG (política fiscal)',
          tipo: 'slider',
          min: -150,
          max: 150,
          paso: 5,
        },
        {
          id: 'dYn',
          etiqueta: 'ΔȲₙ (choque de oferta)',
          tipo: 'slider',
          min: -300,
          max: 300,
          paso: 10,
        },
      ],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
