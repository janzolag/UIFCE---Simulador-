/** Impuestos: incidencia, pérdida de peso muerto y curva de Laffer (Mankiw, cap. 6 y 8). Port de impuestos.py. */
import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { aviso } from '../../core/tema';
import { ErrorParametro } from '../modelos/_comun';
import {
  aplicarImpuesto,
  curvaLaffer,
  impuestoProhibitivo,
  impuestoRecaudoMaximo,
} from '../modelos/impuestos';
import {
  COLOR,
  area,
  controlesCurvas,
  curvas,
  figuraDoble,
  fijoPy,
  limite,
  lineaCurva,
  panel,
  punto,
  seguro,
} from './_ui';

const SIM_ID = 'impuestos';

export const DEF = {
  t: 5,
  sobre: 'vendedores' as string,
  a: 100,
  b: 2,
  c: 10,
  d: 3,
  elastica: 'ninguna' as string,
  p_horizontal: 20,
};
type P = typeof DEF;

function calcularSim(p: P): Simulacion {
  const { sobre } = p;
  let { t } = p;
  const [D, S] = curvas(p.a, p.b, p.c, p.d, p.elastica, p.p_horizontal);
  let avisoT: string | null = null;
  let r;
  try {
    r = aplicarImpuesto(D, S, t, sobre);
  } catch (err) {
    if (!(err instanceof ErrorParametro)) throw err;
    aplicarImpuesto(D, S, 0, sobre); // si el mercado mismo es inválido, que falle aquí con su mensaje
    avisoT = `${err.message} Se muestra el mercado sin impuesto.`;
    t = 0;
    r = aplicarImpuesto(D, S, t, sobre);
  }
  const xMax = limite([r.qEquilibrio, r.q, D.a], 10);
  const yMax = Math.min(
    limite([r.pc, r.pv, r.pEquilibrio, D.precioMaximo], 10),
    limite([r.pc, r.pv, r.pEquilibrio], 10) * 2.5,
  );
  const tTope = impuestoProhibitivo(D, S);
  // eje de la curva de Laffer: hasta el impuesto que elimina el mercado (o el doble de t si no existe)
  const tLim =
    tTope !== Infinity ? Math.max(tTope * 1.05, t * 1.1, 1) : Math.max(Math.abs(t) * 2, 10);
  const laffer = curvaLaffer(D, S, Math.max(tLim, 1), 80);
  const recMax = Math.max(
    ...laffer.map((q) => q[1]),
    ...laffer.map((q) => q[2]),
    Math.abs(r.recaudo),
    r.ppm,
    1,
  );
  const fig = figuraDoble(
    ['Mercado con impuesto', 'Recaudo y pérdida según t'],
    [
      ['Cantidad (Q)', 'Precio (P)'],
      ['Impuesto t', 'Valor'],
    ],
    [
      [xMax, yMax],
      [Math.max(tLim, 1), recMax * 1.15],
    ],
    SIM_ID,
  );
  const q = r.q;
  if (q > 0) {
    area(
      fig,
      0,
      q,
      (x) => D.precio(x),
      () => r.pc,
      COLOR.ec,
      'Excedente del consumidor',
      yMax,
    );
    area(
      fig,
      0,
      q,
      () => r.pv,
      (x) => S.precio(x),
      COLOR.ep,
      'Excedente del productor',
      yMax,
    );
    if (t > 0)
      area(
        fig,
        0,
        q,
        () => r.pc,
        () => r.pv,
        COLOR.recaudo,
        'Recaudo',
        yMax,
      );
  }
  if (Math.abs(t) > 1e-12 && Math.abs(r.qEquilibrio - q) > 1e-12) {
    const [q0, q1] = [q, r.qEquilibrio].sort((x, y) => x - y);
    area(
      fig,
      q0,
      q1,
      (x) => D.precio(x),
      (x) => S.precio(x),
      COLOR.ppm,
      'Pérdida de peso muerto',
      yMax,
    );
  }
  lineaCurva(fig, D, xMax, yMax, 'Demanda', COLOR.demanda, sobre === 'compradores' && t !== 0);
  lineaCurva(fig, S, xMax, yMax, 'Oferta', COLOR.oferta, sobre === 'vendedores' && t !== 0);
  if (t !== 0) {
    if (sobre === 'vendedores')
      lineaCurva(fig, r.ofertaVista, xMax, yMax, 'Oferta con impuesto', COLOR.social);
    else lineaCurva(fig, r.demandaVista, xMax, yMax, 'Demanda con impuesto', COLOR.social);
  }
  punto(fig, r.qEquilibrio, r.pEquilibrio, 'Sin impuesto', undefined, undefined, 1, 'E');
  if (q > 0 && t !== 0) {
    punto(fig, q, r.pc, 'Precio comprador Pc', COLOR.nuevo, 'diamond');
    punto(fig, q, r.pv, 'Precio vendedor Pv', COLOR.nuevo, 'diamond');
  }

  fig.data.push({
    type: 'scatter',
    x: laffer.map((q) => q[0]),
    y: laffer.map((q) => q[1]),
    mode: 'lines',
    name: 'Recaudo (Laffer)',
    line: { color: COLOR.laffer, width: 3 },
    xaxis: 'x2',
    yaxis: 'y2',
  });
  fig.data.push({
    type: 'scatter',
    x: laffer.map((q) => q[0]),
    y: laffer.map((q) => q[2]),
    mode: 'lines',
    name: 'PPM',
    line: { color: COLOR.social, width: 3, dash: 'dash' },
    xaxis: 'x2',
    yaxis: 'y2',
  });
  if (t >= 0) punto(fig, t, r.recaudo, 't actual', undefined, undefined, 2);

  const tStar = impuestoRecaudoMaximo(D, S);
  const cc = r.cargaCompradores;
  const filas = [
    ['Precio que paga el comprador Pc', r.pc],
    ['Precio que recibe el vendedor Pv', r.pv],
    ['Cantidad', q],
    [t >= 0 ? 'Recaudo' : 'Gasto en subsidio', Math.abs(r.recaudo)],
    ['Carga de los compradores', cc === null ? null : `${fijoPy(100 * cc, 1)} %`],
    ['Carga de los vendedores', cc === null ? null : `${fijoPy(100 * (1 - cc), 1)} %`],
    ['Pérdida de peso muerto', r.ppm],
    ['t que maximiza el recaudo', tStar],
    ['t que elimina el mercado', tTope],
  ];
  const bloques: Bloque[] = avisoT ? [aviso(avisoT, 'error')] : [];
  if (q <= 0)
    bloques.push(
      aviso(
        'El impuesto es tan alto que el mercado desaparece: no hay recaudo y toda la ganancia del comercio se pierde.',
        'info',
      ),
    );
  if (tStar === null)
    bloques.push(
      aviso(
        'Con una curva perfectamente inelástica la cantidad no cambia: no hay pérdida de peso muerto y el recaudo crece sin máximo interior.',
        'info',
      ),
    );
  return {
    fig,
    panel: panel(
      filas,
      bloques,
      'caps. 6 y 8, «La oferta, la demanda y las políticas del gobierno» y «Aplicación: los costos de los impuestos».',
    ),
  };
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 600,
  grupos: [
    {
      titulo: 'Impuesto',
      controles: [
        {
          id: 't',
          etiqueta: 'Impuesto por unidad t (negativo = subsidio)',
          tipo: 'slider',
          min: -20,
          max: 60,
          paso: 0.5,
        },
        {
          id: 'sobre',
          etiqueta: 'Se cobra a',
          tipo: 'selector',
          opciones: [
            { valor: 'vendedores', etiqueta: 'Vendedores' },
            { valor: 'compradores', etiqueta: 'Compradores' },
          ],
        },
      ],
    },
    ...controlesCurvas(),
  ],
  calcular: (p: Params) => seguro<P>(p, calcularSim),
};
