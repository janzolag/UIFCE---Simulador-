/**
 * Casilla numérica junto a cada deslizador: el usuario puede escribir el valor exacto de un parámetro.
 * Acepta coma o punto decimal y el signo menos tipográfico (−); el valor se acota al rango del control.
 */

/** Convierte lo que escribió el usuario en un número, o null si no es un número. */
export function parsearNumero(texto: string): number | null {
  let s = texto.trim().replace(/\s+/g, '').replace(/[−–]/g, '-');
  if (s === '' || s === '-' || s === '.' || s === ',') return null;
  // «1,5» es decimal; «1,500.5» usa la coma como separador de miles.
  s = s.includes('.') ? s.replace(/,/g, '') : s.replace(',', '.');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

/** Acota v a [min, max] (si alguno no está definido no se acota por ese lado). */
export function acotar(v: number, min?: number, max?: number): number {
  if (min !== undefined && v < min) return min;
  if (max !== undefined && v > max) return max;
  return v;
}

/** Texto que muestra la casilla: sin separador de miles y con a lo sumo 4 decimales. */
export function textoEntrada(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return String(Number.parseFloat(n.toFixed(4)));
}
