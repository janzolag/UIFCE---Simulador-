/** Frontera de posibilidades de producción (Mankiw, cap. 2). Port de fpp.py. */
import { Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { FPP } from '../modelos/fpp';
import { COLOR, figuraBase, limite, panel, punto, seguro } from './_ui';

const SIM_ID = 'fpp';

export const DEF = {
  X: 1000,
  Y: 3000,
  k: 2,
  x: 600,
  y: 2200,
  recursos: 1,
  tecnologia_1: 1,
  tecnologia_2: 1,
};
type P = typeof DEF;

function calcularSim(p: P): Simulacion {
  const { X, Y, k, x, y, recursos, tecnologia_1: t1, tecnologia_2: t2 } = p;
  const f0 = new FPP(X, Y, k);
  const f1 = f0.desplazar(recursos, t1, t2);
  const cambio = !f1.igual(f0);
  const xMax = limite([f0.X, f1.X, x], 10);
  const yMax = limite([f0.Y, f1.Y, y], 10);
  const fig = figuraBase('Bien 1 (computadoras)', 'Bien 2 (automóviles)', xMax, yMax, SIM_ID);
  const [xs, ys] = f0.puntos();
  fig.data.push({
    type: 'scatter',
    x: [...xs, 0],
    y: [...ys, 0],
    fill: 'toself',
    fillcolor: 'rgba(91,155,255,0.12)',
    mode: 'lines',
    line: { width: 0 },
    name: 'Producción posible',
    hoverinfo: 'skip',
  });
  fig.data.push({
    type: 'scatter',
    x: xs,
    y: ys,
    mode: 'lines',
    name: cambio ? 'FPP inicial' : 'FPP',
    line: { color: COLOR.demanda, width: 3, dash: cambio ? 'dash' : 'solid' },
  });
  const actual = cambio ? f1 : f0;
  if (cambio) {
    const [xs1, ys1] = f1.puntos();
    fig.data.push({
      type: 'scatter',
      x: xs1,
      y: ys1,
      mode: 'lines',
      name: 'FPP nueva',
      line: { color: COLOR.nuevo, width: 3 },
    });
  }
  const estado = actual.clasificar(x, y);
  const color = (
    { eficiente: COLOR.nuevo, ineficiente: COLOR.oferta, inalcanzable: COLOR.social } as Record<
      string,
      string
    >
  )[estado];
  punto(fig, x, y, `Punto elegido (${estado})`, color, 'circle', 1, estado);
  const filas: (string | number | null)[][] = [['El punto es', estado]];
  if (x <= actual.X) {
    const yF = actual.yDeX(x);
    punto(fig, x, yF, 'Punto eficiente con ese bien 1', COLOR.equilibrio, 'diamond');
    filas.push(
      ['Bien 2 máximo con ese bien 1', yF],
      ['Costo de oportunidad del bien 1 (en bien 2)', actual.costoOportunidad(x)],
    );
  } else filas.push(['Bien 2 máximo con ese bien 1', 'imposible: supera el máximo del bien 1']);
  filas.push(['Máximo del bien 1', actual.X], ['Máximo del bien 2', actual.Y]);
  return {
    fig,
    panel: panel(
      filas,
      [],
      'cap. 2, «Pensar como un economista»: la frontera de posibilidades de producción.',
    ),
  };
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 540,
  grupos: [
    {
      titulo: 'Frontera: (x/X)^k + (y/Y)^k = 1',
      controles: [
        {
          id: 'X',
          etiqueta: 'Máximo del bien 1 (computadoras)',
          tipo: 'slider',
          min: 100,
          max: 3000,
          paso: 50,
        },
        {
          id: 'Y',
          etiqueta: 'Máximo del bien 2 (automóviles)',
          tipo: 'slider',
          min: 100,
          max: 5000,
          paso: 50,
        },
        { id: 'k', etiqueta: 'Curvatura k (1 = recta)', tipo: 'slider', min: 1, max: 6, paso: 0.1 },
      ],
    },
    {
      titulo: 'Punto elegido',
      controles: [
        { id: 'x', etiqueta: 'Bien 1', tipo: 'slider', min: 0, max: 4000, paso: 10 },
        { id: 'y', etiqueta: 'Bien 2', tipo: 'slider', min: 0, max: 7000, paso: 10 },
      ],
    },
    {
      titulo: 'Crecimiento: recursos y tecnología',
      controles: [
        {
          id: 'recursos',
          etiqueta: 'Recursos (1 = sin cambio)',
          tipo: 'slider',
          min: 0.5,
          max: 1.5,
          paso: 0.05,
        },
        {
          id: 'tecnologia_1',
          etiqueta: 'Tecnología del bien 1',
          tipo: 'slider',
          min: 0.5,
          max: 2,
          paso: 0.05,
        },
        {
          id: 'tecnologia_2',
          etiqueta: 'Tecnología del bien 2',
          tipo: 'slider',
          min: 0.5,
          max: 2,
          paso: 0.05,
        },
      ],
    },
  ],
  calcular: (p: Params) => seguro<P>(p, calcularSim),
};
