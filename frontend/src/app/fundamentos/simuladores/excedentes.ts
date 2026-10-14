/** Excedente del consumidor y del productor (Mankiw, cap. 7). Port de excedentes.py. */
import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { aviso } from '../../core/tema';
import { fmt } from '../../core/formato';
import {
  Escalonado,
  bienestar,
  cantidadEscalonada,
  excedenteCompradores,
  excedenteVendedores,
} from '../modelos/excedentes';
import { equilibrio } from '../modelos/mercado';
import {
  COLOR,
  area,
  controlesCurvas,
  curvas,
  figuraBase,
  guias,
  horizontal,
  limite,
  lineaCurva,
  panel,
  punto,
  seguro,
} from './_ui';

const SIM_ID = 'excedentes';

export const COMPRADORES: Escalonado = [
  ['John', 100],
  ['Paul', 80],
  ['George', 70],
  ['Ringo', 50],
];
export const VENDEDORES: Escalonado = [
  ['Grandma', 500],
  ['Georgia', 600],
  ['Frida', 800],
  ['Mary', 900],
];

export const DEF = {
  modo: 'continuo' as string,
  a: 100,
  b: 2,
  c: 10,
  d: 3,
  elastica: 'ninguna' as string,
  p_horizontal: 20,
  precio_escalonado: 70,
};
type P = typeof DEF;

function continuo(p: P): Simulacion {
  const [D, S] = curvas(p.a, p.b, p.c, p.d, p.elastica, p.p_horizontal);
  const r = equilibrio(D, S);
  const w = bienestar(D, S, r);
  const xMax = limite([r.q, D.a], 10);
  const yMax = Math.min(limite([r.p, D.precioMaximo], 10), limite([r.p], 10) * 2.5);
  const fig = figuraBase('Cantidad (Q)', 'Precio (P)', xMax, yMax, SIM_ID);
  if (r.intercambio) {
    area(
      fig,
      0,
      r.q,
      (q) => D.precio(q),
      () => r.p,
      COLOR.ec,
      'Excedente del consumidor',
      yMax,
    );
    area(
      fig,
      0,
      r.q,
      () => r.p,
      (q) => S.precio(q),
      COLOR.ep,
      'Excedente del productor',
      yMax,
    );
  }
  lineaCurva(fig, D, xMax, yMax, 'Demanda', COLOR.demanda);
  lineaCurva(fig, S, xMax, yMax, 'Oferta', COLOR.oferta);
  const bloques: Bloque[] = [];
  if (r.intercambio) {
    guias(fig, r.q, r.p);
    punto(fig, r.q, r.p, 'Equilibrio', undefined, undefined, 1, 'E');
  } else bloques.push(aviso('Sin intercambio no hay excedentes.', 'info'));
  if (D.esVertical && r.intercambio)
    bloques.push(
      aviso(
        'Con demanda perfectamente inelástica la disposición a pagar no tiene techo: el excedente del consumidor es infinito (el área no se cierra).',
        'info',
      ),
    );
  const filas = [
    ['Precio P*', r.intercambio ? r.p : null],
    ['Cantidad Q*', r.q],
    ['Excedente del consumidor', w.ec],
    ['Excedente del productor', w.ep],
    ['Excedente total', w.total],
  ];
  return {
    fig,
    panel: panel(
      filas,
      bloques,
      'cap. 7, «Los consumidores, los productores y la eficiencia de los mercados».',
    ),
  };
}

function escalonado(lado: string, precio: number): Simulacion {
  const compradores = lado === 'compradores';
  const datos = compradores ? COMPRADORES : VENDEDORES;
  const p = compradores ? precio : precio * 10;
  const orden = [...datos].sort((x, y) => (compradores ? y[1] - x[1] : x[1] - y[1]));
  const yMax = compradores ? 110 : 1000;
  const fig = figuraBase('Cantidad (unidades)', 'Precio', 4.5, yMax, SIM_ID);
  const xs: number[] = [];
  const ys: number[] = [];
  orden.forEach(([nombre, v], i) => {
    xs.push(i, i + 1);
    ys.push(v, v);
    const participa = compradores ? v >= p : v <= p;
    if (participa) {
      const [base, techo] = compradores ? [p, v] : [v, p];
      fig.data.push({
        type: 'scatter',
        x: [i, i + 1, i + 1, i],
        y: [base, base, techo, techo],
        fill: 'toself',
        fillcolor: compradores ? COLOR.ec : COLOR.ep,
        line: { width: 0 },
        mode: 'lines',
        name: `Excedente de ${nombre}`,
        hoverinfo: 'name',
      });
    }
    fig.layout.annotations = [
      ...(fig.layout.annotations ?? []),
      { x: i + 0.5, y: v, xref: 'x', yref: 'y', text: nombre, showarrow: false, yshift: 10 },
    ];
  });
  fig.data.push({
    type: 'scatter',
    x: xs,
    y: ys,
    mode: 'lines',
    name: compradores ? 'Demanda' : 'Oferta',
    line: { color: compradores ? COLOR.demanda : COLOR.oferta, width: 3, shape: 'hv' },
  });
  horizontal(fig, p, 4.5, `Precio = ${fmt(p, 0)}`, COLOR.equilibrio);
  const total = compradores ? excedenteCompradores(datos, p) : excedenteVendedores(datos, p);
  const q = cantidadEscalonada(datos, p, compradores ? 'demanda' : 'oferta');
  const filas = [
    ['Precio', p],
    [`Unidades ${compradores ? 'compradas' : 'vendidas'}`, q],
    [`Excedente ${compradores ? 'del consumidor' : 'del productor'}`, total],
  ];
  return {
    fig,
    panel: panel(
      filas,
      [
        aviso(
          'Quien está indiferente (valor igual al precio) se cuenta como participante con excedente cero, como en Mankiw.',
          'info',
        ),
      ],
      'cap. 7, tablas 1 y 2 (disposición a pagar y costo de los vendedores).',
    ),
  };
}

function calcularSim(p: P): Simulacion {
  if (p.modo === 'continuo') return continuo(p);
  return escalonado(p.modo, p.precio_escalonado);
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 540,
  grupos: [
    {
      titulo: 'Tipo de análisis',
      controles: [
        {
          id: 'modo',
          etiqueta: 'Modo',
          tipo: 'selector',
          opciones: [
            { valor: 'continuo', etiqueta: 'Curvas lineales' },
            { valor: 'compradores', etiqueta: 'Escalonado: compradores (tabla 1)' },
            { valor: 'vendedores', etiqueta: 'Escalonado: vendedores (tabla 2)' },
          ],
        },
      ],
    },
    ...controlesCurvas().map((g) => ({
      ...g,
      visibleSi: (q: Params) => q['modo'] === 'continuo' && (g.visibleSi ? g.visibleSi(q) : true),
    })),
    {
      titulo: 'Precio (modo escalonado)',
      visibleSi: (q) => q['modo'] !== 'continuo',
      controles: [
        {
          id: 'precio_escalonado',
          etiqueta: 'Precio (×10 para vendedores)',
          tipo: 'slider',
          min: 0,
          max: 110,
          paso: 1,
        },
      ],
    },
  ],
  calcular: (p: Params) => seguro<P>(p, calcularSim),
};
