/**
 * Simulador 8 — Competencia perfecta (port de modelos/competencia.py).
 * Monsalve (2017), semanas 7 y 8.
 */
import { ErrorParametro, noNegativo, positivo } from '../../core/errores';
import { CostoCubico } from './costos';

export type Zona = 'cierra' | 'opera_con_perdidas' | 'beneficio_cero' | 'beneficio_positivo';

function zona(p: number, costo: CostoCubico): Zona {
  if (p < costo.precio_cierre()) return 'cierra';
  if (p < costo.precio_nivelacion()) return 'opera_con_perdidas';
  if (Math.abs(p - costo.precio_nivelacion()) < 1e-9) return 'beneficio_cero';
  return 'beneficio_positivo';
}

/** Oferta precio-aceptante: p = CMg en el tramo creciente, con cierre. */
export function ofertaEmpresaCubica(costo: CostoCubico, p: number, plazo: 'corto' | 'largo' = 'corto') {
  noNegativo('p', p);
  const umbral = plazo === 'corto' ? costo.precio_cierre() : costo.precio_nivelacion();
  let q: number;
  if (p < umbral - 1e-12) q = 0;
  else {
    // Raíz mayor de 3c q² − 2b q + (a − p) = 0 (tramo creciente del CMg).
    const { a, b, c } = costo;
    const disc = 4 * b * b - 12 * c * (a - p);
    q = (2 * b + Math.sqrt(Math.max(disc, 0))) / (6 * c);
  }
  const beneficio = q > 0 ? p * q - costo.CT(q) : plazo === 'corto' ? -costo.CF : 0;
  return {
    q, beneficio, umbral,
    precio_cierre: costo.precio_cierre(), precio_nivelacion: costo.precio_nivelacion(),
    zona: zona(p, costo),
  };
}

/** Sección 7.6: C(y) = (w1/k)·y² + w2·k (α = β = ½, k fijo). */
export function ofertaCpCobbDouglasMonsalve(w1: number, w2: number, k: number, p: number) {
  positivo('w1', w1); positivo('w2', w2); positivo('k', k); noNegativo('p', p);
  const pEstrella = 2 * Math.sqrt(w1 * w2);
  const yEstrella = Math.sqrt(w2 / w1) * k;
  const y = p >= pEstrella ? (k * p) / (2 * w1) : 0;
  return {
    y, p_umbral_libro: pEstrella, y_umbral: yEstrella, y_criterio_cvme: (k * p) / (2 * w1),
    beneficio: p * y - (w1 / k) * y * y - w2 * k,
  };
}

/** Demanda X = a − b·p, oferta Y = c + d·p (Monsalve, ej. 2 semana 8). */
export function equilibrioLineal(a: number, b: number, c: number, d: number) {
  positivo('a', a); positivo('b', b); positivo('d', d);
  if (a * d + b * c <= 0) throw new ErrorParametro('Sin equilibrio con cantidad positiva: se requiere a·d + b·c > 0.');
  const p = (a - c) / (b + d);
  const q = (a * d + b * c) / (b + d);
  const pMaxDem = a / b;
  const pMinOf = Math.max(-c / d, 0);
  const ec = 0.5 * q * (pMaxDem - p);
  const ep = c >= 0 ? p * q - (0.5 * (q - c) ** 2) / d : 0.5 * q * (p - pMinOf);
  return { p, q, EC: ec, EP: ep, ET: ec + ep, elasticidad_demanda: (-b * p) / q, elasticidad_oferta: (d * p) / q };
}

/** Impuesto específico t cobrado al vendedor: Y = c + d·(p − t). */
export function equilibrioConImpuesto(a: number, b: number, c: number, d: number, t: number) {
  noNegativo('t', t);
  const base = equilibrioLineal(a, b, c, d);
  const pc = (a - c + d * t) / (b + d);
  const pv = pc - t;
  const q = a - b * pc;
  if (q <= 0)
    return {
      p_consumidor: a / b, p_vendedor: a / b - t, q: 0, recaudo: 0, carga_consumidor: Number.NaN,
      perdida_eficiencia: base.ET, prohibitivo: true,
    };
  return {
    p_consumidor: pc, p_vendedor: pv, q, recaudo: t * q,
    carga_consumidor: t > 0 ? (pc - base.p) / t : Number.NaN,
    perdida_eficiencia: 0.5 * t * (base.q - q), prohibitivo: false,
  };
}

/** n empresas idénticas con costo cúbico frente a demanda X = a − b·p. */
export function equilibrioNEmpresasCubicas(a: number, b: number, costo: CostoCubico, n: number) {
  if (n < 1 || Math.trunc(n) !== n) throw new ErrorParametro('n debe ser un entero ≥ 1.');
  positivo('a', a); positivo('b', b);
  const exceso = (p: number) => n * ofertaEmpresaCubica(costo, p).q - Math.max(a - b * p, 0);
  let lo = 0;
  let hi = a / b;
  if (exceso(hi) < 0) throw new ErrorParametro('La oferta no alcanza la demanda ni al precio máximo.');
  for (let i = 0; i < 200; i++) {
    const m = (lo + hi) / 2;
    if (exceso(m) < 0) lo = m;
    else hi = m;
  }
  const p = hi;
  const qi = ofertaEmpresaCubica(costo, p).q;
  return { p, q_empresa: qi, Q: n * qi, beneficio_empresa: p * qi - costo.CT(qi) };
}

/** Largo plazo: p = mín CMe; n = X(p)/q_eme (el "número entero" de Pignol). */
export function nLibreEntrada(a: number, b: number, costo: CostoCubico) {
  const p = costo.precio_nivelacion();
  const q = costo.q_min_cme();
  const X = a - b * p;
  if (X <= 0) throw new ErrorParametro('La demanda es nula al precio de nivelación: no entra nadie.');
  const n = X / q;
  return { p, q_empresa: q, Q: X, n, n_entero: Math.floor(n), es_entero: Math.abs(n - Math.round(n)) < 1e-9 };
}

/** Ej. 3-4 semana 8: U = √x + y y C(x) = w x²/A². */
export function representativoMonsalve(w: number, A: number) {
  positivo('w', w); positivo('A', A);
  const p = (w / (2 * A * A)) ** (1 / 3);
  const x = (A / (2 * Math.sqrt(w))) ** (4 / 3);
  return { p, x, beneficio: p * x - (w * x * x) / (A * A) };
}

/** P_{t+1} = (a − c)/b − (d/b)·P_t (sección 8.8, ej. 6). */
export function telarana(a: number, b: number, c: number, d: number, P0: number, T = 30) {
  positivo('a', a); positivo('b', b); positivo('d', d);
  if (T < 1) throw new ErrorParametro('T debe ser ≥ 1.');
  const pe = (a - c) / (b + d);
  const precios = [P0];
  for (let i = 0; i < T; i++) precios.push((a - c) / b - (d / b) * precios[precios.length - 1]);
  const r = d / b;
  const tipo = r < 1 ? 'asintoticamente_estable' : Math.abs(r - 1) < 1e-12 ? 'oscilacion_perpetua' : 'inestable';
  return { precios, p_equilibrio: pe, razon: r, tipo, solucion_cerrada: (t: number) => (-r) ** t * (P0 - pe) + pe };
}
