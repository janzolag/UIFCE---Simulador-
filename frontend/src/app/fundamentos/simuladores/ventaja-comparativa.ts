/** Ventaja comparativa y ganancias del comercio (Mankiw, cap. 3). Port de ventaja_comparativa.py. */
import { fijo } from '../../core/formato';
import { Bloque, Figura, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { aviso } from '../../core/tema';
import { ErrorParametro } from '../modelos/_comun';
import { Productor, ResultadoVentaja, comerciar, rangoPrecio, ventajas } from '../modelos/ventaja';
import { COLOR, Sub, figuraDoble, panel, punto, seguro, signado } from './_ui';

const SIM_ID = 'ventaja-comparativa';

export const DEF = {
  horas: 8,
  g_carne: 20,
  g_papas: 10,
  c_carne: 60,
  c_papas: 15,
  fraccion_g: 0.75,
  fraccion_c: 0,
  carne_intercambiada: 5,
  precio: 3,
};
type P = typeof DEF;

function calcularSim(p: P): Simulacion {
  const g = new Productor('Ganadero', p.horas, p.g_carne, p.g_papas);
  const c = new Productor('Campesino', p.horas, p.c_carne, p.c_papas);
  let avisoIntercambio: string | null = null;
  let r: ResultadoVentaja;
  try {
    r = comerciar(g, c, p.fraccion_g, p.fraccion_c, 0.5, 0.5, p.carne_intercambiada, p.precio);
  } catch (e) {
    // intercambio imposible: se dibuja la producción sin comerciar
    if (!(e instanceof ErrorParametro)) throw e;
    r = comerciar(g, c, p.fraccion_g, p.fraccion_c, 0.5, 0.5, 0, p.precio);
    avisoIntercambio = `${e.message} Se muestra el resultado sin intercambio.`;
  }
  const v = ventajas(g, c);
  const [lo, hi] = rangoPrecio(g, c);
  const papasMax = Math.max(g.maxBien2, c.maxBien2, r.consumoA[1], r.consumoB[1]) * 1.15;
  const carneMax = Math.max(g.maxBien1, c.maxBien1, r.consumoA[0], r.consumoB[0]) * 1.15;
  const fig: Figura = figuraDoble(
    ['Ganadero', 'Campesino'],
    [
      ['Papas (kg)', 'Carne (kg)'],
      ['Papas (kg)', 'Carne (kg)'],
    ],
    [
      [papasMax, carneMax],
      [papasMax, carneMax],
    ],
    SIM_ID,
    [0.5, 0.5],
  );
  const lados: [Productor, [number, number], [number, number], [number, number], Sub][] = [
    [g, r.produccionA, r.consumoA, r.autarquiaA, 1],
    [c, r.produccionB, r.consumoB, r.autarquiaB, 2],
  ];
  for (const [prod, produccion, consumo, autarquia, sub] of lados) {
    fig.data.push({
      type: 'scatter',
      x: [0, prod.maxBien2],
      y: [prod.maxBien1, 0],
      mode: 'lines',
      name: `FPP ${prod.nombre}`,
      line: { color: sub === 1 ? COLOR.demanda : COLOR.oferta, width: 3 },
      ...(sub === 2 ? { xaxis: 'x2', yaxis: 'y2' } : {}),
    });
    punto(
      fig,
      autarquia[1],
      autarquia[0],
      `${prod.nombre}: sin comercio`,
      COLOR.textoSuave,
      'circle',
      sub,
      'A',
      'bottom left',
    );
    punto(
      fig,
      produccion[1],
      produccion[0],
      `${prod.nombre}: producción`,
      COLOR.equilibrio,
      'square',
      sub,
    );
    punto(
      fig,
      consumo[1],
      consumo[0],
      `${prod.nombre}: consumo con comercio`,
      COLOR.nuevo,
      'star',
      sub,
      'C',
    );
  }
  // los ejes muestran carne en Y y papas en X, como en Mankiw
  for (const t of fig.data)
    t.hovertemplate = 'Papas=%{x:.2f}<br>Carne=%{y:.2f}<extra>%{fullData.name}</extra>';

  const filas = [
    ['CO de 1 kg de carne: ganadero', `${fijo(g.costoBien1, 2)} kg de papas`],
    ['CO de 1 kg de carne: campesino', `${fijo(c.costoBien1, 2)} kg de papas`],
    ['Ventaja absoluta en carne', v.absolutaBien1 ?? 'empate'],
    ['Ventaja absoluta en papas', v.absolutaBien2 ?? 'empate'],
    ['Ventaja comparativa en carne', v.comparativaBien1 ?? 'ninguno (mismo costo)'],
    ['Ventaja comparativa en papas', v.comparativaBien2 ?? 'ninguno (mismo costo)'],
    [
      'Precios con ganancia para ambos',
      `entre ${fijo(lo, 2)} y ${fijo(hi, 2)} kg de papas por kg de carne`,
    ],
    [
      'Ganancia del ganadero (carne, papas)',
      `${signado(r.gananciaA[0])}, ${signado(r.gananciaA[1])}`,
    ],
    [
      'Ganancia del campesino (carne, papas)',
      `${signado(r.gananciaB[0])}, ${signado(r.gananciaB[1])}`,
    ],
  ];
  const bloques: Bloque[] = avisoIntercambio ? [aviso(avisoIntercambio, 'error')] : [];
  if (!r.precioEnRango)
    bloques.push(
      aviso(
        'El precio está fuera del rango de los costos de oportunidad: uno de los dos estaría mejor sin comerciar.',
        'info',
      ),
    );
  if (v.comparativaBien1 === null)
    bloques.push(
      aviso(
        'Los dos tienen el mismo costo de oportunidad: especializarse no genera ganancias.',
        'info',
      ),
    );
  return {
    fig,
    panel: panel(filas, bloques, 'cap. 3, «Interdependencia y ganancias derivadas del comercio».'),
  };
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 600,
  grupos: [
    {
      titulo: 'Tecnología (minutos por kg)',
      controles: [
        {
          id: 'horas',
          etiqueta: 'Horas de trabajo al día',
          tipo: 'slider',
          min: 1,
          max: 16,
          paso: 1,
        },
        { id: 'g_carne', etiqueta: 'Ganadero: carne', tipo: 'slider', min: 5, max: 120, paso: 5 },
        { id: 'g_papas', etiqueta: 'Ganadero: papas', tipo: 'slider', min: 5, max: 120, paso: 5 },
        { id: 'c_carne', etiqueta: 'Campesino: carne', tipo: 'slider', min: 5, max: 120, paso: 5 },
        { id: 'c_papas', etiqueta: 'Campesino: papas', tipo: 'slider', min: 5, max: 120, paso: 5 },
      ],
    },
    {
      titulo: 'Producción e intercambio',
      controles: [
        {
          id: 'fraccion_g',
          etiqueta: 'Ganadero: fracción del tiempo en carne',
          tipo: 'slider',
          min: 0,
          max: 1,
          paso: 0.05,
        },
        {
          id: 'fraccion_c',
          etiqueta: 'Campesino: fracción del tiempo en carne',
          tipo: 'slider',
          min: 0,
          max: 1,
          paso: 0.05,
        },
        {
          id: 'carne_intercambiada',
          etiqueta: 'Carne que el ganadero entrega (kg)',
          tipo: 'slider',
          min: -20,
          max: 20,
          paso: 0.5,
        },
        {
          id: 'precio',
          etiqueta: 'Precio: kg de papas por kg de carne',
          tipo: 'slider',
          min: 0,
          max: 8,
          paso: 0.1,
        },
      ],
    },
  ],
  calcular: (p: Params) => seguro<P>(p, calcularSim),
};
