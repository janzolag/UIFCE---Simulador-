/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Macro 2 · Figuras de varios paneles enlazados y motor de choques (estática comparativa).
 *
 * Cada panel es un par de ejes de Plotly (x/y, x2/y2, x3/y3) con su dominio; los paneles que comparten
 * una variable usan `matches` para que el zoom de uno mueva el otro. En móvil los paneles se apilan.
 * Convención de estados de un choque:
 *   E₀ inicial  → curvas grises punteadas (fantasma),
 *   E₁ intermedio / corto plazo → curvas de color en raya-punto,
 *   E₂ final / largo plazo → curvas sólidas.
 */
import { Bloque, Figura, GrupoControles, Params } from '../../core/tipos';
import { COLORES, SUAVE, layoutBase } from '../../core/tema';
import { fmt } from '../../core/formato';
import { FANTASMA } from './_comun';

export type IdPanel = '' | '2' | '3' | '4' | '5';
export type Estado = 'inicial' | 'intermedio' | 'final';

export interface Panel {
  id: IdPanel;
  titulo: string;
  tituloX: string;
  tituloY: string;
  rangoX: [number, number];
  rangoY: [number, number];
  dominio: { x: [number, number]; y: [number, number] };
  movil: { x: [number, number]; y: [number, number] };
  /** Eje con el que se enlaza (p. ej. 'x' para compartir Y con el panel principal). */
  enlaceX?: string;
  enlaceY?: string;
}

export const ejeX = (p: Panel): string => `x${p.id}`;
export const ejeY = (p: Panel): string => `y${p.id}`;

/** Figura con varios paneles y sus variantes de escritorio y móvil. */
export function figuraPaneles(rev: string, paneles: Panel[], altoMovil: number): Figura {
  const base = layoutBase({});
  const layout: any = {
    ...base,
    uirevision: rev,
    showlegend: false,
    margin: { l: 56, r: 20, t: 34, b: 44 },
    annotations: [],
  };
  const movil: any = {};
  for (const p of paneles) {
    const ax = (eje: 'x' | 'y') => ({
      ...(eje === 'x' ? base.xaxis : base.yaxis),
      title: { text: eje === 'x' ? p.tituloX : p.tituloY, font: { color: SUAVE, size: 12 }, standoff: 6 },
      range: eje === 'x' ? [...p.rangoX] : [...p.rangoY],
      domain: [...p.dominio[eje]],
      anchor: eje === 'x' ? ejeY(p) : ejeX(p),
      ...(eje === 'x' && p.enlaceX ? { matches: p.enlaceX } : {}),
      ...(eje === 'y' && p.enlaceY ? { matches: p.enlaceY } : {}),
    });
    layout[`xaxis${p.id}`] = ax('x');
    layout[`yaxis${p.id}`] = ax('y');
    movil[`xaxis${p.id}`] = { domain: [...p.movil.x] };
    movil[`yaxis${p.id}`] = { domain: [...p.movil.y] };
    layout.annotations.push({
      x: 0,
      y: 1,
      xref: `${ejeX(p)} domain`,
      yref: `${ejeY(p)} domain`,
      xanchor: 'left',
      yanchor: 'bottom',
      yshift: 4,
      text: `<b>${p.titulo}</b>`,
      showarrow: false,
      font: { size: 12, color: COLORES.texto },
    });
  }
  return { data: [], layout, movil: { alto: altoMovil, layout: movil } };
}

/** Sufijo del nombre de la traza según el estado (las pruebas buscan «(inicial)»). */
const SUFIJO: Record<Estado, string> = { inicial: ' (inicial)', intermedio: ' (corto plazo)', final: '' };

/**
 * Curva en un panel. Lleva una etiqueta al final (p. ej. «IS₁»), como en los diagramas de los manuales,
 * porque con varios paneles la leyenda no alcanza.
 */
export function curvaP(
  fig: Figura,
  p: Panel,
  x: (number | null)[],
  y: (number | null)[],
  nombre: string,
  color: string,
  estado: Estado = 'final',
  etiqueta?: string,
): void {
  const linea =
    estado === 'inicial'
      ? { ...FANTASMA }
      : estado === 'intermedio'
        ? { color, width: 2, dash: 'dashdot' }
        : { color, width: 3 };
  fig.data.push({
    type: 'scatter',
    x,
    y,
    xaxis: ejeX(p),
    yaxis: ejeY(p),
    mode: 'lines',
    name: nombre + SUFIJO[estado],
    line: linea,
    opacity: estado === 'inicial' ? 0.75 : estado === 'intermedio' ? 0.8 : 1,
    hoverinfo: estado === 'inicial' ? 'skip' : undefined,
    hovertemplate: estado === 'inicial' ? undefined : `${nombre}<br>(%{x:.2f}, %{y:.2f})<extra></extra>`,
  });
  if (!etiqueta) return;
  // Último punto visible dentro de los rangos del panel.
  for (let i = x.length - 1; i >= 0; i--) {
    const xi = x[i];
    const yi = y[i];
    if (xi === null || yi === null || !Number.isFinite(xi) || !Number.isFinite(yi)) continue;
    if (xi < p.rangoX[0] || xi > p.rangoX[1] || yi < p.rangoY[0] || yi > p.rangoY[1]) continue;
    fig.layout.annotations.push({
      x: xi,
      y: yi,
      xref: ejeX(p),
      yref: ejeY(p),
      text: etiqueta,
      showarrow: false,
      xanchor: 'right',
      yanchor: 'bottom',
      font: { size: 11, color: estado === 'inicial' ? SUAVE : color },
    });
    break;
  }
}

/** Punto de equilibrio con proyecciones punteadas a los ejes del panel y lectura numérica en ellos. */
export function equilibrioP(
  fig: Figura,
  p: Panel,
  x: number,
  y: number,
  nombre: string,
  etiqueta: string,
  color: string,
  op: { decX?: number; decY?: number; simbolo?: string; lecturas?: boolean } = {},
): void {
  const [x0] = p.rangoX;
  const [y0] = p.rangoY;
  fig.data.push({
    type: 'scatter',
    x: [x, x, null, x, x0],
    y: [y0, y, null, y, y],
    xaxis: ejeX(p),
    yaxis: ejeY(p),
    mode: 'lines',
    showlegend: false,
    hoverinfo: 'skip',
    line: { color, width: 1.1, dash: 'dot' },
  });
  fig.data.push({
    type: 'scatter',
    x: [x],
    y: [y],
    xaxis: ejeX(p),
    yaxis: ejeY(p),
    mode: 'markers+text',
    name: nombre,
    text: [etiqueta],
    textposition: 'top left',
    textfont: { color, size: 12 },
    marker: { size: 11, color, symbol: op.simbolo ?? 'circle', line: { width: 2, color: COLORES.fondo } },
    hovertemplate: `${nombre}<br>(%{x:.${op.decX ?? 2}f}, %{y:.${op.decY ?? 2}f})<extra></extra>`,
  });
  if (op.lecturas === false) return;
  const fuente = { size: 10, color };
  fig.layout.annotations.push(
    {
      x,
      y: 0,
      xref: ejeX(p),
      yref: `${ejeY(p)} domain`,
      yanchor: 'bottom',
      text: fmt(x, op.decX ?? 2),
      showarrow: false,
      font: fuente,
      bgcolor: COLORES.panel,
    },
    {
      x: 0,
      y,
      xref: `${ejeX(p)} domain`,
      yref: ejeY(p),
      xanchor: 'left',
      text: fmt(y, op.decY ?? 2),
      showarrow: false,
      font: fuente,
      bgcolor: COLORES.panel,
    },
  );
}

/** Flecha de desplazamiento entre dos puntos del panel (se omite si los puntos casi coinciden). */
export function flecha(fig: Figura, p: Panel, de: [number, number], a: [number, number], color: string): void {
  const dx = (a[0] - de[0]) / (p.rangoX[1] - p.rangoX[0]);
  const dy = (a[1] - de[1]) / (p.rangoY[1] - p.rangoY[0]);
  if (Math.hypot(dx, dy) < 0.02 || ![...de, ...a].every(Number.isFinite)) return;
  fig.layout.annotations.push({
    x: a[0],
    y: a[1],
    ax: de[0],
    ay: de[1],
    xref: ejeX(p),
    yref: ejeY(p),
    axref: ejeX(p),
    ayref: ejeY(p),
    showarrow: true,
    arrowhead: 2,
    arrowsize: 1.1,
    arrowwidth: 1.8,
    arrowcolor: color,
    standoff: 7,
    startstandoff: 7,
    text: '',
  });
}

/** Recorrido E₀ → E₁ → E₂ con flechas (omite los pasos repetidos). */
export function recorrido(fig: Figura, p: Panel, puntos: ([number, number] | null)[], color: string): void {
  const pts = puntos.filter((q): q is [number, number] => q !== null);
  for (let i = 1; i < pts.length; i++) flecha(fig, p, pts[i - 1], pts[i], color);
}

/** Bloque de estática comparativa en tres pasos. */
export const cadena = (choque: string, transmision: string, resultado: string, largo?: string): Bloque =>
  largo ? { t: 'cadena', choque, transmision, resultado, largo } : { t: 'cadena', choque, transmision, resultado };

/** Signo con flecha: ↑, ↓ o «sin cambio». */
export const sube = (d: number, tol = 1e-9): string => (d > tol ? '↑' : d < -tol ? '↓' : '=');
/** Cambio legible «de a a b (Δ = …)». */
export const cambio = (a: number, b: number, dec = 2): string =>
  `${fmt(a, dec)} → ${fmt(b, dec)} (Δ = ${fmt(Math.abs(b - a) < 1e-9 ? 0 : b - a, dec)})`;

/* ------------------------------------------------------------------ botones de choque */

export interface Choque {
  valor: string;
  etiqueta: string;
  /** Deltas que fija el botón (los demás deltas vuelven a 0). */
  cambios: Params;
}

/** Grupo con los botones de choque (un clic). */
export function grupoChoques(choques: Choque[], visibleSi?: (p: Params) => boolean): GrupoControles {
  return {
    titulo: 'Choques (un clic)',
    ...(visibleSi ? { visibleSi } : {}),
    controles: [
      {
        id: 'choque',
        etiqueta: 'Aplica un choque típico; luego ajusta su tamaño abajo',
        tipo: 'selector',
        opciones: choques.map((c) => ({ valor: c.valor, etiqueta: c.etiqueta })),
      },
    ],
  };
}

/**
 * Al pulsar un botón: fija sus deltas y pone en cero los demás. Al mover un delta a mano, el botón
 * queda en «manual» (ninguno resaltado).
 */
export function alCambiarChoques(choques: Choque[], deltas: string[]) {
  return (anterior: Params, nuevo: Params): Params | null => {
    if (nuevo['choque'] !== anterior['choque']) {
      const c = choques.find((x) => x.valor === nuevo['choque']);
      if (!c) return null;
      return { ...Object.fromEntries(deltas.map((d) => [d, 0])), ...c.cambios };
    }
    if (deltas.some((d) => nuevo[d] !== anterior[d])) return { choque: 'manual' };
    return null;
  };
}
