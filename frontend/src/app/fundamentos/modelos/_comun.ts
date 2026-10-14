/**
 * Utilidades comunes del motor de Fundamentos (Mankiw, Principios de Economía): port de
 * modelos/_comun.py. Usa el mismo ErrorParametro del resto de la aplicación.
 */
import { ErrorParametro } from '../../core/errores';

export { ErrorParametro };

export const TOL = 1e-9;
export const INF = Number.POSITIVE_INFINITY;

export function finito(nombre: string, valor: unknown): number {
  if (valor === null || valor === undefined || typeof valor !== 'number')
    throw new ErrorParametro(`${nombre} debe ser un número.`);
  if (!Number.isFinite(valor)) throw new ErrorParametro(`${nombre} debe ser un número finito.`);
  return valor;
}

export function noNegativo(nombre: string, valor: unknown): number {
  const v = finito(nombre, valor);
  if (v < -TOL) throw new ErrorParametro(`${nombre} no puede ser negativo.`);
  return Math.max(v, 0);
}

export function positivo(nombre: string, valor: unknown): number {
  const v = finito(nombre, valor);
  if (v <= TOL) throw new ErrorParametro(`${nombre} debe ser mayor que cero.`);
  return v;
}

export function casiIgual(x: number, y: number, tol = 1e-7): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return x === y;
  return Math.abs(x - y) <= tol * Math.max(1, Math.abs(x), Math.abs(y));
}

/** max(0, x) como en Python: un NaN (p. ej. ∞ − ∞) cuenta como 0 en lugar de contagiar el resultado. */
export function maxCero(x: number): number {
  return x > 0 ? x : 0;
}
