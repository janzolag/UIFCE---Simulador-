/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Piezas de interfaz compartidas por los simuladores de Fundamentos (port de fundamentos/_ui.py).
 * Los colores salen de la paleta de la aplicación (core/tema.ts); aquí solo se les da nombre
 * semántico para las gráficas de mercado.
 */
import { ErrorParametro } from '../../core/errores';
import { fijo } from '../../core/formato';
import { Bloque, Figura, GrupoControles, Params, Simulacion } from '../../core/tipos';
import {
  ACENTO,
  AZUL,
  COLORES,
  NARANJA,
  ROJO,
  SUAVE,
  VERDE,
  aviso,
  figura,
  figuraVacia,
  lectura,
  punto as puntoTema,
  referencia,
  resultados,
  tabla,
} from '../../core/tema';
import { Demanda, Oferta } from '../modelos/mercado';

/** Texto de referencia de Fundamentos (sustituye al «Monsalve (2017)» de Micro 1). */
export const AUTOR = 'Mankiw, Principios de Economía';

export const ref = (t: string): Bloque => referencia(t, AUTOR);

/** Colores semánticos de las gráficas de mercado (consistentes en todo el bloque). */
export const COLOR = {
  demanda: AZUL,
  oferta: NARANJA,
  social: ROJO,
  equilibrio: COLORES.texto,
  nuevo: VERDE,
  ec: 'rgba(91,155,255,0.28)',
  ep: 'rgba(255,164,91,0.28)',
  recaudo: 'rgba(183,156,255,0.40)',
  ppm: 'rgba(255,122,133,0.50)',
  textoSuave: SUAVE,
  guia: 'rgba(238,241,246,0.45)',
  laffer: '#B79CFF',
};

export type Filas = (string | number | null)[][];
export type Sub = 1 | 2;

/** Ejes del segundo panel de una figura doble. */
const extraSub = (sub: Sub): any => (sub === 2 ? { xaxis: 'x2', yaxis: 'y2' } : {});

// ------------------------------------------------------------------ formato --

/** Como f"{x:.Nf}" de Python: conserva el signo de −0 y redondea al par en empates exactos. */
export function fijoPy(v: number, dec: number): string {
  const negativo = v < 0 || Object.is(v, -0);
  return (negativo ? '-' : '') + fijo(Math.abs(v), dec);
}

/** Número con signo explícito y d decimales: «+1.50», «−0.25» (como f"{x:+.2f}"). */
export function signado(v: number, dec = 2): string {
  const negativo = v < 0 || Object.is(v, -0);
  return (negativo ? '−' : '+') + fijo(Math.abs(v), dec);
}

// ------------------------------------------------------------------ paneles --

/** Panel de resultados: una tabla y, debajo, avisos y la referencia al libro. */
export function panel(filas: Filas, avisos: Bloque[], referenciaTexto: string): Bloque[] {
  return [
    resultados([
      lectura('Resultados', tabla(filas)),
      lectura('Lectura', ...avisos, ref(referenciaTexto)),
    ]),
  ];
}

/**
 * Nunca deja que un error de dominio rompa la página: muestra el aviso en la gráfica y en el panel
 * (equivale a calcular_seguro). Un parámetro vacío (null/undefined) se trata como un error.
 */
export function seguro<P>(p: Params, calcular: (p: P) => Simulacion): Simulacion {
  try {
    if (Object.values(p).some((v) => v === null || v === undefined))
      throw new ErrorParametro('Falta un valor: complete todos los parámetros.');
    return calcular(p as unknown as P);
  } catch (e) {
    if (e instanceof ErrorParametro)
      return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
}

// ------------------------------------------------------------------ figuras --

export function figuraBase(
  tituloX: string,
  tituloY: string,
  xMax: number,
  yMax: number,
  id: string,
): Figura {
  return figura(tituloX, tituloY, id, { xaxis: { range: [0, xMax] }, yaxis: { range: [0, yMax] } });
}

const ejeSub = (titulo: string, dominio: number[], ancla: string, rango: number[] | null): any => ({
  domain: dominio,
  anchor: ancla,
  title: { text: titulo, font: { color: SUAVE } },
  gridcolor: COLORES.rejilla,
  zerolinecolor: COLORES.borde,
  linecolor: COLORES.borde,
  tickcolor: COLORES.borde,
  showline: true,
  ...(rango ? { range: rango } : { rangemode: 'nonnegative' }),
});

/** Dos paneles lado a lado, con leyenda abajo para no tapar los títulos de cada panel. */
export function figuraDoble(
  titulos: [string, string],
  ejes: [[string, string], [string, string]],
  rangos: [[number, number | null], [number, number | null]],
  id: string,
  anchos: [number, number] = [0.58, 0.42],
): Figura {
  const separacion = 0.12;
  const w1 = ((1 - separacion) * anchos[0]) / (anchos[0] + anchos[1]);
  const dom1 = [0, w1];
  const dom2 = [w1 + separacion, 1];
  const rango = ([xm, ym]: [number, number | null]) =>
    [[0, xm], ym === null ? null : [0, ym]] as const;
  const [rx1, ry1] = rango(rangos[0]);
  const [rx2, ry2] = rango(rangos[1]);
  const fig = figura('', '', id, {
    xaxis: ejeSub(ejes[0][0], dom1, 'y', [...rx1]),
    yaxis: ejeSub(ejes[0][1], [0, 1], 'x', ry1 ? [...ry1] : null),
    legend: { orientation: 'h', yanchor: 'top', y: -0.2, xanchor: 'left', x: 0 },
    margin: { t: 50, b: 150 },
  });
  fig.layout.xaxis2 = ejeSub(ejes[1][0], dom2, 'y2', [...rx2]);
  fig.layout.yaxis2 = ejeSub(ejes[1][1], [0, 1], 'x2', ry2 ? [...ry2] : null);
  fig.layout.annotations = [
    {
      text: titulos[0],
      x: (dom1[0] + dom1[1]) / 2,
      y: 1,
      xref: 'paper',
      yref: 'paper',
      xanchor: 'center',
      yanchor: 'bottom',
      showarrow: false,
      font: { size: 15 },
    },
    {
      text: titulos[1],
      x: (dom2[0] + dom2[1]) / 2,
      y: 1,
      xref: 'paper',
      yref: 'paper',
      xanchor: 'center',
      yanchor: 'bottom',
      showarrow: false,
      font: { size: 15 },
    },
  ];
  return fig;
}

/** Rango de eje a partir de los valores finitos relevantes. */
export function limite(valores: (number | null | undefined)[], minimo = 1, margen = 1.15): number {
  const finitos = valores.filter(
    (v): v is number => v !== null && v !== undefined && Number.isFinite(v) && v > 0,
  );
  return Math.max(minimo, (finitos.length ? Math.max(...finitos) : minimo) * margen);
}

export const recortar = (y: number, yMax: number): number => Math.min(y, yMax * 1.5);

/** Dibuja una Demanda u Oferta en el plano (Q, P), incluidos los casos vertical y horizontal. */
export function lineaCurva(
  fig: Figura,
  curva: Demanda | Oferta,
  xMax: number,
  yMax: number,
  nombre: string,
  color: string,
  punteada = false,
  sub: Sub = 1,
  n = 80,
): void {
  const line = { color, width: 3, dash: punteada ? 'dash' : 'solid' };
  const esDemanda = curva instanceof Demanda;
  let xs: number[];
  let ys: number[];
  if (curva.horizontalEn !== null) {
    xs = [0, xMax];
    ys = [curva.horizontalEn, curva.horizontalEn];
  } else if (curva.esVertical) {
    const q = esDemanda ? (curva as Demanda).a : (curva as Oferta).c;
    xs = [q, q];
    ys = [esDemanda ? 0 : (curva as Oferta).piso, yMax * 1.5];
  } else {
    xs = Array.from({ length: n }, (_, i) => (xMax * i) / (n - 1));
    if (esDemanda) {
      const a = (curva as Demanda).a;
      xs = [...xs.filter((x) => x < a), ...(a <= xMax ? [a] : [])];
    }
    ys = xs.map((x) => recortar(curva.precio(x), yMax));
  }
  fig.data.push({
    type: 'scatter',
    x: xs,
    y: ys,
    mode: 'lines',
    name: nombre,
    line,
    ...extraSub(sub),
    hovertemplate: `${nombre}<br>Q=%{x:.2f}<br>P=%{y:.2f}<extra></extra>`,
  });
}

/** Rellena la región entre dos funciones de Q (para excedentes y pérdidas). */
export function area(
  fig: Figura,
  x0: number,
  x1: number,
  fArriba: (q: number) => number,
  fAbajo: (q: number) => number,
  color: string,
  nombre: string,
  yMax: number,
  sub: Sub = 1,
  n = 60,
): void {
  if (x1 - x0 <= 1e-12) return;
  const xs = Array.from({ length: n }, (_, i) => x0 + ((x1 - x0) * i) / (n - 1));
  const arriba = xs.map((x) => recortar(fArriba(x), yMax));
  const abajo = xs.map((x) => recortar(fAbajo(x), yMax));
  if (arriba.every((a, i) => Math.abs(a - abajo[i]) < 1e-12)) return;
  fig.data.push({
    type: 'scatter',
    x: [...xs, ...[...xs].reverse()],
    y: [...arriba, ...[...abajo].reverse()],
    fill: 'toself',
    fillcolor: color,
    line: { width: 0 },
    mode: 'lines',
    name: nombre,
    hoverinfo: 'name',
    ...extraSub(sub),
  });
}

export function punto(
  fig: Figura,
  x: number,
  y: number,
  nombre: string,
  color: string = ACENTO,
  simbolo = 'circle',
  sub: Sub = 1,
  texto?: string,
  posicion = 'top right',
): void {
  puntoTema(fig, x, y, nombre, color, simbolo, texto, { textposition: posicion, ...extraSub(sub) });
}

/** Líneas punteadas desde un punto hasta los ejes. */
export function guias(fig: Figura, x: number, y: number, sub: Sub = 1): void {
  fig.data.push({
    type: 'scatter',
    x: [0, x, x],
    y: [y, y, 0],
    mode: 'lines',
    showlegend: false,
    hoverinfo: 'skip',
    line: { color: COLOR.guia, width: 1, dash: 'dot' },
    ...extraSub(sub),
  });
}

export function horizontal(
  fig: Figura,
  y: number,
  xMax: number,
  nombre: string,
  color: string,
  sub: Sub = 1,
  dash = 'dot',
): void {
  fig.data.push({
    type: 'scatter',
    x: [0, xMax],
    y: [y, y],
    mode: 'lines',
    name: nombre,
    line: { color, width: 2, dash },
    hovertemplate: `${nombre}: %{y:.2f}<extra></extra>`,
    ...extraSub(sub),
  });
}

// -------------------------------------------------- controles de mercado --

/** Deslizadores de Qd = a − bP y Qs = c + dP, con opción de curvas perfectamente elásticas. */
export function controlesCurvas(elasticas = true): GrupoControles[] {
  const grupos: GrupoControles[] = [
    {
      titulo: 'Demanda: Qd = a − b·P',
      controles: [
        {
          id: 'a',
          etiqueta: 'Intercepto a (Q si P = 0)',
          tipo: 'slider',
          min: 0,
          max: 200,
          paso: 1,
        },
        {
          id: 'b',
          etiqueta: 'Pendiente b (b = 0: inelástica)',
          tipo: 'slider',
          min: 0,
          max: 10,
          paso: 0.1,
        },
      ],
    },
    {
      titulo: 'Oferta: Qs = c + d·P',
      controles: [
        { id: 'c', etiqueta: 'Intercepto c', tipo: 'slider', min: -50, max: 50, paso: 1 },
        {
          id: 'd',
          etiqueta: 'Pendiente d (d = 0: inelástica)',
          tipo: 'slider',
          min: 0,
          max: 10,
          paso: 0.1,
        },
      ],
    },
  ];
  if (elasticas)
    grupos.push(
      {
        titulo: 'Curva perfectamente elástica',
        controles: [
          {
            id: 'elastica',
            etiqueta: 'Curva horizontal',
            tipo: 'selector',
            opciones: [
              { valor: 'ninguna', etiqueta: 'Ninguna' },
              { valor: 'demanda', etiqueta: 'Demanda horizontal' },
              { valor: 'oferta', etiqueta: 'Oferta horizontal' },
            ],
          },
        ],
      },
      {
        visibleSi: (p) => p['elastica'] !== 'ninguna',
        controles: [
          {
            id: 'p_horizontal',
            etiqueta: 'Precio de la curva horizontal',
            tipo: 'slider',
            min: 0,
            max: 100,
            paso: 1,
          },
        ],
      },
    );
  return grupos;
}

export function curvas(
  a: number,
  b: number,
  c: number,
  d: number,
  elastica = 'ninguna',
  pHorizontal = 20,
): [Demanda, Oferta] {
  const D = elastica === 'demanda' ? Demanda.perfectamenteElastica(pHorizontal) : new Demanda(a, b);
  const S = elastica === 'oferta' ? Oferta.perfectamenteElastica(pHorizontal) : new Oferta(c, d);
  return [D, S];
}

/** Figura con las curvas y un aviso, para casos sin intercambio en los que no hay nada más que mostrar. */
export function soloCurvas(D: Demanda, S: Oferta, mensaje: string, id: string): Simulacion {
  const xMax = limite([D.a, S.c], 10);
  const yMax = limite(
    [
      Number.isFinite(D.precioMaximo) ? D.precioMaximo : null,
      Number.isFinite(S.precioMinimo) ? S.precioMinimo : null,
    ],
    10,
  );
  const fig = figuraBase('Cantidad (Q)', 'Precio (P)', xMax, yMax, id);
  lineaCurva(fig, D, xMax, yMax, 'Demanda', COLOR.demanda);
  lineaCurva(fig, S, xMax, yMax, 'Oferta', COLOR.oferta);
  return { fig, panel: [resultados([lectura('Resultados', aviso(mensaje, 'info'))])] };
}
