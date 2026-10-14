/**
 * Simulador 2 — IS–LM en economía cerrada (Blanchard, 2017, caps. 3–5).
 *   IS: Y = C(Y − T) + I(Y, i) + G  ⇒  Y = (A − b₂·i) / s,   A = c₀ − c₁T + b₀ + G,  s = 1 − c₁ − b₁.
 *   LM, dos versiones:
 *     · «tasa»   (Blanchard): el banco central fija la tasa de interés, i = ī (LM horizontal).
 *     · «oferta» (versión de texto clásica): fija la cantidad de dinero, M/P = k·Y − h·i.
 *   La tasa nominal no baja de cero: si el equilibrio la pide negativa, la economía cae en la
 *   trampa de liquidez (i = 0 y la política monetaria deja de mover el producto).
 *   i se mide en puntos porcentuales (5 = 5 %).
 */
import { ErrorParametro, noNegativo, positivo } from '../../core/errores';
import { Bienes, finito, validarBienes } from './_comun';

export type ModoLM = 'tasa' | 'oferta';

export interface ParamsISLM extends Bienes {
  modo: ModoLM;
  /** Tasa fijada por el banco central (modo «tasa»). */
  ibar: number;
  /** Oferta nominal de dinero y nivel de precios (modo «oferta»). */
  M: number;
  P: number;
  k: number;
  h: number;
}

export interface ResISLM {
  Y: number;
  i: number;
  A: number;
  s: number;
  C: number;
  I: number;
  /** El equilibrio sin restricción pediría i < 0: trampa de liquidez. */
  trampa: boolean;
  /** dY/dG con la regla monetaria vigente. */
  multFiscal: number;
  /** dY/dG si la tasa no se moviera (multiplicador keynesiano de la IS). */
  multKeynes: number;
  /** dY/dM (modo «oferta») o dY/dī (modo «tasa»). */
  multMonetario: number;
}

export function validarISLM(p: ParamsISLM): { A: number; s: number } {
  const r = validarBienes(p);
  if (p.modo === 'tasa') {
    finito('ī', p.ibar);
    if (p.ibar < 0)
      throw new ErrorParametro(
        `La tasa nominal no puede ser negativa (ī = ${p.ibar}): el efectivo rinde 0 % y nadie prestaría por menos (límite inferior cero).`,
      );
  } else {
    positivo('M', p.M);
    positivo('P', p.P);
    positivo('k', p.k);
    noNegativo('h', p.h);
  }
  return r;
}

/** Producto sobre la IS para una tasa dada. Con b₂ = 0 la IS es vertical. */
export function curvaIS(A: number, s: number, b2: number, i: number): number {
  return (A - b2 * i) / s;
}

/** Tasa sobre la LM (con el piso de cero) para un producto dado; modo «oferta» con h > 0. */
export function curvaLM(p: ParamsISLM, Y: number): number {
  return Math.max(0, (p.k * Y - p.M / p.P) / p.h);
}

/** Equilibrio IS–LM sin exigir Y > 0 (la DA lo usa para recorrer todos los niveles de precios). */
export function resolverISLM(p: ParamsISLM): ResISLM {
  const { A, s } = validarISLM(p);
  const multKeynes = 1 / s;
  let Y: number;
  let i: number;
  let trampa = false;
  let multFiscal: number;
  let multMonetario: number;

  if (p.modo === 'tasa') {
    i = p.ibar;
    Y = curvaIS(A, s, p.b2, i);
    multFiscal = multKeynes;
    multMonetario = -p.b2 / s; // por punto porcentual de ī
  } else {
    const m = p.M / p.P;
    if (p.h === 0) {
      // LM vertical (teoría cuantitativa): el producto lo fija el dinero.
      Y = m / p.k;
      if (p.b2 === 0) {
        if (Math.abs(Y - A / s) > 1e-9 * Math.max(1, Y))
          throw new ErrorParametro(
            'Con b₂ = 0 y h = 0 la IS y la LM son verticales y paralelas: no hay tasa de interés que equilibre ambos mercados.',
          );
        i = 0;
      } else i = (A - s * Y) / p.b2;
      multFiscal = 0;
      multMonetario = 1 / (p.k * p.P);
    } else {
      const D = s + (p.b2 * p.k) / p.h;
      Y = (A + (p.b2 * m) / p.h) / D;
      i = (p.k * Y - m) / p.h;
      multFiscal = 1 / D;
      multMonetario = p.b2 / p.h / D / p.P;
    }
    if (i < 0) {
      // Trampa de liquidez: la LM es plana en i = 0 y más dinero ya no baja la tasa.
      trampa = true;
      i = 0;
      Y = curvaIS(A, s, p.b2, 0);
      multFiscal = multKeynes;
      multMonetario = 0;
    }
  }
  const C = p.c0 + p.c1 * (Y - p.T);
  return {
    Y,
    i,
    A,
    s,
    C,
    I: p.b0 + p.b1 * Y - p.b2 * i,
    trampa,
    multFiscal,
    multKeynes,
    multMonetario,
  };
}

export function equilibrioISLM(p: ParamsISLM): ResISLM {
  const r = resolverISLM(p);
  if (!(r.Y > 0))
    throw new ErrorParametro(
      `El producto de equilibrio no es positivo (Y = ${r.Y.toFixed(2)}): el gasto autónomo no alcanza con esta tasa de interés.`,
    );
  return r;
}
