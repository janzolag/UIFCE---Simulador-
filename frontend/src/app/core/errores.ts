/** Parámetro fuera del dominio económico del modelo (equivale a ErrorParametro de Python). */
export class ErrorParametro extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorParametro';
  }
}

export function positivo(nombre: string, v: number): number {
  if (v === null || v === undefined || !Number.isFinite(v) || v <= 0)
    throw new ErrorParametro(`${nombre} debe ser un número positivo (recibido: ${v}).`);
  return v;
}

export function noNegativo(nombre: string, v: number): number {
  if (v === null || v === undefined || !Number.isFinite(v) || v < 0)
    throw new ErrorParametro(`${nombre} no puede ser negativo (recibido: ${v}).`);
  return v;
}

export function enIntervalo(nombre: string, v: number, bajo: number, alto: number, abierto = true): number {
  if (v === null || v === undefined || !Number.isFinite(v))
    throw new ErrorParametro(`${nombre} debe ser un número finito.`);
  const ok = abierto ? bajo < v && v < alto : bajo <= v && v <= alto;
  if (!ok) {
    const [a, b] = abierto ? ['(', ')'] : ['[', ']'];
    throw new ErrorParametro(`${nombre} debe estar en ${a}${bajo}, ${alto}${b} (recibido: ${v}).`);
  }
  return v;
}

export function cerca(a: number, b: number, tol = 1e-9): boolean {
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
}

export function derivada(f: (x: number) => number, x: number, h?: number): number {
  const hh = h ?? 1e-6 * Math.max(1, Math.abs(x));
  return (f(x + hh) - f(x - hh)) / (2 * hh);
}
