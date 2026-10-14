/** Elasticidad precio e ingreso total (Mankiw, cap. 5). Port de elasticidad.py. */
import { fmt } from '../../core/formato';
import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { aviso } from '../../core/tema';
import { ErrorParametro, finito } from '../modelos/_comun';
import {
  clasificar,
  elasticidadDemanda,
  ingresoTotal,
  precioIngresoMaximo,
  puntoMedio,
} from '../modelos/elasticidad';
import { Demanda } from '../modelos/mercado';
import { COLOR, area, figuraDoble, limite, lineaCurva, panel, punto, seguro } from './_ui';

const SIM_ID = 'elasticidades';

export const DEF = { caso: 'lineal' as string, a: 14, b: 2, precio: 3, delta: 1 };
type P = typeof DEF;

function demanda(caso: string, a: number, b: number, precio: number): Demanda {
  if (caso === 'inelastica') return new Demanda(a, 0);
  if (caso === 'elastica') return Demanda.perfectamenteElastica(precio);
  return new Demanda(a, b);
}

function calcularSim(p: P): Simulacion {
  const { caso, a, b } = p;
  let { precio, delta } = p;
  const D = demanda(caso, a, b, precio);
  finito('El cambio de precio ΔP', delta);
  const avisos: string[] = [];
  if (caso === 'lineal' && precio > D.precioMaximo) {
    avisos.push(
      `Con esa demanda nadie compra a precios mayores que ${fmt(D.precioMaximo)}: se usa ese precio como P₁.`,
    );
    precio = D.precioMaximo;
  }
  const p1 = precio;
  let p2 = precio + delta;
  if (p2 < 0) {
    avisos.push('P₁ + ΔP sería negativo: se usa P₂ = 0.');
    p2 = 0;
  }
  delta = p2 - p1;
  const q1 = caso === 'inelastica' ? a : caso === 'elastica' ? null : D.cantidad(p1);

  let xMax: number;
  let yMax: number;
  if (caso === 'elastica') {
    xMax = limite([a], 10);
    yMax = limite([precio], 5) * 1.6;
  } else {
    xMax = limite([a], 10);
    yMax = limite([caso === 'lineal' ? D.precioMaximo : Math.max(p1, p2), p1, p2], 5);
  }
  const fig = figuraDoble(
    ['Demanda e ingreso total (rectángulo)', 'Ingreso total según el precio'],
    [
      ['Cantidad (Q)', 'Precio (P)'],
      ['Precio (P)', 'Ingreso total'],
    ],
    [
      [xMax, yMax],
      [yMax, null],
    ],
    SIM_ID,
  );
  lineaCurva(fig, D, xMax, yMax, 'Demanda', COLOR.demanda);

  let filas: (string | number | null)[][] = [];
  if (caso === 'lineal') {
    const pm = precioIngresoMaximo(D) as number;
    // tramos elástico / inelástico señalados sobre la demanda
    const qUnit = D.cantidad(pm);
    fig.layout.annotations.push(
      {
        x: qUnit * 0.45,
        y: D.precio(qUnit * 0.45),
        xref: 'x',
        yref: 'y',
        text: 'ε > 1 (elástica)',
        showarrow: false,
        xshift: 55,
        yshift: 12,
      },
      {
        x: qUnit * 1.5,
        y: D.precio(Math.min(qUnit * 1.5, a)),
        xref: 'x',
        yref: 'y',
        text: 'ε < 1 (inelástica)',
        showarrow: false,
        xshift: 50,
        yshift: 12,
      },
    );
    punto(fig, qUnit, pm, 'Elasticidad unitaria', COLOR.nuevo, 'diamond');
    const ps = Array.from({ length: 81 }, (_, i) => (D.precioMaximo * i) / 80);
    fig.data.push({
      type: 'scatter',
      x: ps,
      y: ps.map((q) => ingresoTotal(D, q)),
      mode: 'lines',
      name: 'Ingreso total',
      line: { color: COLOR.oferta, width: 3 },
      xaxis: 'x2',
      yaxis: 'y2',
    });
    fig.layout.xaxis2.range = [0, D.precioMaximo * 1.05];
    filas.push(['Precio que maximiza el ingreso', pm]);
  }
  if (q1 !== null) {
    area(
      fig,
      0,
      q1,
      () => p1,
      () => 0,
      COLOR.recaudo,
      'Ingreso total P₁×Q₁',
      yMax,
    );
    punto(fig, q1, p1, 'Punto 1', undefined, undefined, 1, '1');
    if (caso === 'lineal') punto(fig, p1, ingresoTotal(D, p1), 'IT en P₁', undefined, undefined, 2);
    const q2 = D.cantidad(p2);
    if (Number.isFinite(q2) && Math.abs(delta) > 1e-12)
      punto(fig, q2, p2, 'Punto 2', COLOR.nuevo, 'diamond', 1, '2');
  }

  const ePunto = elasticidadDemanda(D, p1);
  filas = [['Elasticidad en P₁ (puntual)', ePunto], ['Tramo', clasificar(ePunto)], ...filas];
  if (q1 !== null) filas.push(['Cantidad Q₁', q1], ['Ingreso total en P₁', ingresoTotal(D, p1)]);
  const bloques: Bloque[] = avisos.map((t) => aviso(t, 'info'));
  if (caso === 'lineal' && Math.abs(delta) > 1e-12) {
    const q2 = D.cantidad(p2);
    try {
      const ePm = puntoMedio(q1 as number, p1, q2, p2);
      filas.push(
        ['Elasticidad por punto medio (1→2)', ePm],
        ['Cambio en el ingreso total', ingresoTotal(D, p2) - ingresoTotal(D, p1)],
      );
    } catch (e) {
      if (!(e instanceof ErrorParametro)) throw e;
      bloques.push(aviso(e.message, 'info'));
    }
  }
  if (caso === 'elastica')
    bloques.push(
      aviso(
        'Con demanda perfectamente elástica, a un precio mayor la cantidad cae a cero y a uno menor es ilimitada: el ingreso total no está determinado.',
        'info',
      ),
    );
  return { fig, panel: panel(filas, bloques, 'cap. 5, «La elasticidad y su aplicación».') };
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 600,
  grupos: [
    {
      titulo: 'Demanda',
      controles: [
        {
          id: 'caso',
          etiqueta: 'Tipo de demanda',
          tipo: 'selector',
          opciones: [
            { valor: 'lineal', etiqueta: 'Lineal' },
            { valor: 'inelastica', etiqueta: 'Perfectamente inelástica' },
            { valor: 'elastica', etiqueta: 'Perfectamente elástica' },
          ],
        },
        {
          id: 'a',
          etiqueta: 'Intercepto a (Q si P = 0)',
          tipo: 'slider',
          min: 1,
          max: 100,
          paso: 1,
        },
        { id: 'b', etiqueta: 'Pendiente b', tipo: 'slider', min: 0.1, max: 10, paso: 0.1 },
      ],
    },
    {
      titulo: 'Punto y cambio de precio',
      controles: [
        { id: 'precio', etiqueta: 'Precio P₁', tipo: 'slider', min: 0, max: 50, paso: 0.1 },
        {
          id: 'delta',
          etiqueta: 'Cambio de precio ΔP (para el punto medio)',
          tipo: 'slider',
          min: -10,
          max: 10,
          paso: 0.1,
        },
      ],
    },
  ],
  calcular: (p: Params) => seguro<P>(p, calcularSim),
};
