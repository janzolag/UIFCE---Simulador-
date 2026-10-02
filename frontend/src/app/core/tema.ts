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
export const referencia = (t: string): Bloque => ({ t: 'ref', texto: t });
