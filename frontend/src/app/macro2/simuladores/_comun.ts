/* eslint-disable @typescript-eslint/no-explicit-any */
import { Bloque, Figura } from '../../core/tipos';
import { COLORES, SUAVE, punto, referencia } from '../../core/tema';
import { fmt } from '../../core/formato';

/** Referencia por defecto de Macro 2. */
export const AUTOR_KO = 'Krugman y Obstfeld (2006)';
export const AUTOR_ESTANDAR = 'Notación estándar de manual';

export const refKO = (t: string): Bloque => referencia(t, AUTOR_KO);
export const refEstandar = (t: string): Bloque => referencia(t, AUTOR_ESTANDAR);

/** Diferencia legible (sin «−0»). */
export const delta = (v: number): number => (Math.abs(v) < 1e-9 ? 0 : v);

/** Estilo de las curvas «fantasma»: la posición inicial que queda de referencia tras un choque. */
export const FANTASMA = { color: SUAVE, width: 2, dash: 'dash' };

/** Agrega una curva; si `fantasma`, se dibuja gris y punteada (estática comparativa). */
export function curva(
  fig: Figura,
  x: (number | null)[],
  y: (number | null)[],
  nombre: string,
  color: string,
  fantasma = false,
  extra: any = {},
): void {
  fig.data.push({
    type: 'scatter',
    x,
    y,
    mode: 'lines',
    name: fantasma ? `${nombre} (inicial)` : nombre,
    line: fantasma ? { ...FANTASMA } : { color, width: 3 },
    opacity: fantasma ? 0.75 : 1,
    hoverinfo: fantasma ? 'skip' : undefined,
    ...extra,
  });
}

/**
 * Punto de equilibrio con proyecciones punteadas a ambos ejes y la lectura numérica sobre cada eje.
 * `x0`/`y0` son el borde inferior de cada eje (donde terminan las proyecciones).
 */
export function equilibrio(
  fig: Figura,
  x: number,
  y: number,
  nombre: string,
  etiqueta: string,
  color: string,
  ejes: { x0: number; y0: number; decX?: number; decY?: number; simbolo?: string },
): void {
  const linea = { color, width: 1.2, dash: 'dot' };
  fig.data.push({
    type: 'scatter',
    x: [x, x, null, x, ejes.x0],
    y: [ejes.y0, y, null, y, y],
    mode: 'lines',
    showlegend: false,
    hoverinfo: 'skip',
    line: linea,
  });
  punto(fig, x, y, nombre, color, ejes.simbolo ?? 'circle', etiqueta, {
    hovertemplate: `${nombre}<br>(%{x:.${ejes.decX ?? 2}f}, %{y:.${ejes.decY ?? 2}f})<extra></extra>`,
  });
  const ann = (fig.layout.annotations ??= []);
  const fuente = { size: 11, color };
  ann.push(
    {
      x,
      y: 0,
      xref: 'x',
      yref: 'paper',
      yanchor: 'bottom',
      text: fmt(x, ejes.decX ?? 2),
      showarrow: false,
      font: fuente,
      bgcolor: COLORES.panel,
    },
    {
      x: 0,
      y,
      xref: 'paper',
      yref: 'y',
      xanchor: 'left',
      text: fmt(y, ejes.decY ?? 2),
      showarrow: false,
      font: fuente,
      bgcolor: COLORES.panel,
    },
  );
}
