import { Bloque } from '../../core/tipos';
import { referencia } from '../../core/tema';

/** Referencia principal de Micro 2 (se citan títulos de capítulo; sin números de página). */
export const AUTOR_VARIAN = 'Varian, Microeconomía intermedia (8.ª ed.)';
export const refVarian = (t: string): Bloque => referencia(t, AUTOR_VARIAN);

/**
 * Muestras de una curva y = f(x) para un eje que llega hasta `tope` (fuera de rango → null). Se deja un
 * margen del 30 % por encima para que la curva entre por el borde del recuadro en vez de cortarse antes;
 * Plotly recorta lo que sobra.
 */
export function muestras(xs: number[], f: (x: number) => number, tope: number): (number | null)[] {
  return xs.map((x) => {
    const y = f(x);
    return Number.isFinite(y) && y >= 0 && y <= tope * 1.3 ? y : null;
  });
}
