/**
 * Validaciones compartidas por los modelos de Macro 1 (Blanchard, 2017).
 * Todos los modelos son de precios fijos o de ajuste lento y usan la misma función de consumo
 * C = c₀ + c₁·(Y − T) y la misma inversión I = b₀ + b₁·Y − b₂·i (i en puntos porcentuales).
 */
import { ErrorParametro, noNegativo } from '../../core/errores';

/** Número finito (acepta negativos: impuestos negativos son transferencias). */
export function finito(nombre: string, v: number): number {
  if (v === null || v === undefined || typeof v !== 'number' || !Number.isFinite(v))
    throw new ErrorParametro(`${nombre} debe ser un número finito (recibido: ${v}).`);
  return v;
}

/** Propensión marginal en [0, 1). Con 1 el multiplicador sería infinito. */
export function propension(nombre: string, v: number): number {
  finito(nombre, v);
  if (v < 0 || v >= 1) throw new ErrorParametro(`${nombre} debe estar en [0, 1) (recibido: ${v}).`);
  return v;
}

/** Parámetros del mercado de bienes en economía cerrada (IS). */
export interface Bienes {
  c0: number;
  c1: number;
  T: number;
  b0: number;
  b1: number;
  b2: number;
  G: number;
}

/** Valida el bloque de bienes y devuelve el gasto autónomo A y la pendiente s = 1 − c₁ − b₁. */
export function validarBienes(p: Bienes): { A: number; s: number } {
  noNegativo('c₀', p.c0);
  propension('c₁', p.c1);
  finito('T', p.T);
  noNegativo('b₀', p.b0);
  propension('b₁', p.b1);
  noNegativo('b₂', p.b2);
  noNegativo('G', p.G);
  const s = 1 - p.c1 - p.b1;
  if (s <= 1e-9)
    throw new ErrorParametro(
      `c₁ + b₁ debe ser menor que 1 (es ${p.c1 + p.b1}): si un peso más de ingreso genera un peso o más de gasto, el multiplicador no es finito.`,
    );
  return { A: p.c0 - p.c1 * p.T + p.b0 + p.G, s };
}
