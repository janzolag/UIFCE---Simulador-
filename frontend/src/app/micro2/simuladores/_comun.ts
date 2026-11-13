import { Bloque } from '../../core/tipos';
import { referencia } from '../../core/tema';

/** Referencia principal de Micro 2 (se citan títulos de capítulo; sin números de página). */
export const AUTOR_VARIAN = 'Varian, Microeconomía intermedia (8.ª ed.)';
export const refVarian = (t: string): Bloque => referencia(t, AUTOR_VARIAN);

/** Muestras de una curva y = f(x) recortadas a [0, tope] (fuera de rango → null). */
export function muestras(xs: number[], f: (x: number) => number, tope: number): (number | null)[] {
  return xs.map((x) => {
    const y = f(x);
    return Number.isFinite(y) && y >= 0 && y <= tope ? y : null;
  });
}
