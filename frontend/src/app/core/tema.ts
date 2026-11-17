/* eslint-disable @typescript-eslint/no-explicit-any */
import { Bloque, Figura } from './tipos';

export const COLORES = {
  fondo: '#171b22', // fondo del papel de Plotly = color de la tarjeta
  fondoLateral: '#0a0d12',
  panel: '#12161d', // área de trazado
  borde: '#262c36',
  rejilla: '#222834',
  texto: '#eef1f6',
  textoSuave: '#8b94a5',
  acento: '#F5C451', // resalta puntos de equilibrio en las gráficas
};

export const SERIE = ['#5B9BFF', '#F5C451', '#3DD6B5', '#FF7A85', '#B79CFF', '#FFA45B'];
export const [AZUL, DORADO, VERDE, ROJO, MORADO, NARANJA] = SERIE;
export const ACENTO = COLORES.acento;
export const SUAVE = COLORES.textoSuave;

/* ---- Modo claro ----
   Los simuladores siguen armando sus figuras con los colores oscuros de arriba; PlotlyChart traduce la
   figura con MAPA_CLARO justo antes de dibujarla cuando el tema efectivo es claro. Un color que no esté
   en el mapa se queda igual. */

/** Lienzo de Plotly en modo claro (mismas claves que COLORES). */
export const COLORES_CLARO: typeof COLORES = {
  fondo: '#FFFFFF',
  fondoLateral: '#FFFFFF',
  panel: '#FBFCFE',
  borde: '#C9D0DB',
  rejilla: '#E9EDF2',
  texto: '#141A23',
  textoSuave: '#5A6577',
  acento: '#B07A00',
};

/** Series en modo claro: mismo orden y significado que SERIE (la demanda sigue azul y la oferta naranja). */
export const SERIE_CLARA = ['#2563D9', '#B07A00', '#0B8A70', '#D23A4B', '#7448D4', '#D0650F'];

/** Diccionario «color oscuro → color claro», con las claves en minúsculas. */
export const MAPA_CLARO: Readonly<Record<string, string>> = (() => {
  const mapa: Record<string, string> = {};
  for (const k of Object.keys(COLORES) as (keyof typeof COLORES)[]) mapa[COLORES[k].toLowerCase()] = COLORES_CLARO[k];
  SERIE.forEach((c, i) => (mapa[c.toLowerCase()] = SERIE_CLARA[i]));
  return mapa;
})();

const canales = (hex: string): string =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',');

/** Mismo mapa por canales «r,g,b», para traducir rgb()/rgba() conservando la transparencia. */
const MAPA_RGB: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(MAPA_CLARO).map(([oscuro, claro]) => [canales(oscuro), canales(claro)]),
);

const RE_RGB = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+%?)\s*)?\)$/i;

/** Traduce un color al modo claro; si no está en el mapa (o no es un color) lo devuelve igual. */
export function traducirColor<T>(v: T): T {
  if (typeof v !== 'string') return v;
  const s = v.trim().toLowerCase();
  const directo = MAPA_CLARO[s];
  if (directo) return directo as T;
  const m = RE_RGB.exec(s);
  if (m) {
    const k = MAPA_RGB[`${+m[1]},${+m[2]},${+m[3]}`];
    if (k) return (m[4] !== undefined ? `rgba(${k},${m[4]})` : `rgb(${k})`) as T;
  }
  return v;
}

const esPlano = (o: unknown): o is Record<string, unknown> => {
  if (!o || typeof o !== 'object') return false;
  const proto = Object.getPrototypeOf(o);
  return proto === Object.prototype || proto === null;
};

/**
 * Copia de una figura (data o layout) con los colores traducidos al modo claro. Solo recorre arreglos
 * y objetos planos; los arreglos tipados y demás objetos se conservan tal cual.
 */
export function traducirAClaro<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map((x) => traducirAClaro(x)) as T;
  if (esPlano(obj)) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj)) out[k] = traducirAClaro(obj[k]);
    return out as T;
  }
  return traducirColor(obj);
}

const eje = () => ({
  gridcolor: COLORES.rejilla,
  zerolinecolor: COLORES.borde,
  linecolor: COLORES.borde,
  tickcolor: COLORES.borde,
  showline: true,
  mirror: false,
});

function fusionar(base: any, extra: any): any {
  for (const k of Object.keys(extra ?? {})) {
    const v = extra[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object')
      fusionar(base[k], v);
    else base[k] = v;
  }
  return base;
}

/** Layout con el tema "uifce" (equivale a la plantilla Plotly de config.py). */
export function layoutBase(extra: any = {}): any {
  const base = {
    paper_bgcolor: COLORES.fondo,
    plot_bgcolor: COLORES.panel,
    font: { family: 'Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif', color: COLORES.texto, size: 13 },
    colorway: SERIE,
    xaxis: eje(),
    yaxis: eje(),
    legend: { bgcolor: 'rgba(0,0,0,0)', font: { color: COLORES.textoSuave } },
    hoverlabel: { bgcolor: COLORES.fondoLateral, bordercolor: COLORES.borde, font: { color: COLORES.texto } },
    margin: { l: 56, r: 24, t: 48, b: 48 },
  };
  return fusionar(base, extra);
}

/** Equivale a _ui.figura: figura vacía con títulos de ejes y leyenda horizontal. */
export function figura(tituloX: string, tituloY: string, rev: string, extra: any = {}): Figura {
  return {
    data: [],
    layout: layoutBase(
      fusionar(
        {
          xaxis: { title: { text: tituloX, font: { color: SUAVE } } },
          yaxis: { title: { text: tituloY, font: { color: SUAVE } } },
          uirevision: rev,
          legend: { orientation: 'h', y: 1.08, x: 0 },
          margin: { l: 56, r: 24, t: 56, b: 48 },
        },
        extra,
      ),
    ),
  };
}

export function figuraVacia(mensaje = ''): Figura {
  const layout = layoutBase({ xaxis: { showticklabels: false }, yaxis: { showticklabels: false } });
  if (mensaje)
    layout.annotations = [
      { text: mensaje, showarrow: false, x: 0.5, y: 0.5, xref: 'paper', yref: 'paper', font: { size: 15, color: SUAVE } },
    ];
  return { data: [], layout };
}

/** Marcador destacado (equivale a _ui.punto). */
export function punto(
  fig: Figura,
  x: number,
  y: number,
  nombre: string,
  color = ACENTO,
  simbolo = 'circle',
  texto?: string,
  extra: any = {},
): void {
  fig.data.push({
    type: 'scatter',
    x: [x],
    y: [y],
    mode: texto ? 'markers+text' : 'markers',
    name: nombre,
    text: texto ? [texto] : undefined,
    textposition: 'top right',
    textfont: { color },
    marker: { size: 12, color, symbol: simbolo, line: { width: 2, color: COLORES.fondo } },
    hovertemplate: `${nombre}<br>%{x:.3f}, %{y:.3f}<extra></extra>`,
    ...extra,
  });
}

/* ---- constructores de bloques de resultados (equivalen a _ui.tabla, aviso...) ---- */
export const tabla = (filas: (string | number | null)[][], encabezado?: string[]): Bloque => ({ t: 'tabla', filas, encabezado });
export const aviso = (texto: string, nivel: 'info' | 'error' = 'info'): Bloque => ({ t: 'aviso', texto, nivel });
export const lectura = (titulo: string, ...hijos: Bloque[]): Bloque => ({ t: 'lectura', titulo, hijos });
export const resultados = (hijos: Bloque[]): Bloque => ({ t: 'rejilla', hijos });
export const texto = (t: string, clase = ''): Bloque => ({ t: 'texto', texto: t, clase });
export const referencia = (t: string, autor?: string): Bloque =>
  autor ? { t: 'ref', texto: t, autor } : { t: 'ref', texto: t };
