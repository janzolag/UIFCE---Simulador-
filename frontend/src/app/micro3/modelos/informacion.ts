/**
 * Micro 3 · Información asimétrica (versiones de manual, notación estándar):
 *  - Selección adversa (mercado de limones): calidad θ uniforme en [θ_min, θ_max]; el vendedor valora θ y el
 *    comprador k·θ (k > 1). A un precio p solo se ofrecen los autos con θ ≤ p.
 *  - Señalización de Spence: productividades θ_B < θ_A, costo de educación e/θ; salario θ si se cree el tipo.
 *  - Riesgo moral: esfuerzo no observable; el agente se esfuerza si el bono b ≥ ψ/(π_A − π_B).
 */
import { ErrorParametro, positivo } from '../../core/errores';

export interface ParamsLimones {
  k: number;
  tmin: number;
  tmax: number;
}

export function validarLimones(q: ParamsLimones): void {
  if (!(Number.isFinite(q.k) && q.k > 1)) throw new ErrorParametro('k debe ser mayor que 1: los compradores valoran más los autos.');
  if (!(Number.isFinite(q.tmin) && q.tmin >= 0)) throw new ErrorParametro('La calidad mínima no puede ser negativa.');
  if (!(Number.isFinite(q.tmax) && q.tmax > q.tmin)) throw new ErrorParametro('La calidad máxima debe superar a la mínima.');
}

/** Disposición a pagar de los compradores a precio p: k × calidad media de lo ofrecido. */
export const disposicion = (q: ParamsLimones, p: number): number => (q.k * (q.tmin + Math.min(Math.max(p, q.tmin), q.tmax))) / 2;

export interface ResLimones {
  /** Precio de equilibrio (mayor punto fijo p = DAP(p)). */
  p: number;
  /** Fracción de autos que se venden. */
  fraccion: number;
  calidadMedia: number;
  /** Excedente perdido frente a información completa (todos se venden). */
  perdida: number;
  colapso: boolean;
}

export function limones(q: ParamsLimones): ResLimones {
  validarLimones(q);
  const pTodo = disposicion(q, q.tmax);
  let p: number;
  if (pTodo >= q.tmax) p = pTodo; // se vende toda la calidad
  else p = q.k < 2 ? (q.k * q.tmin) / (2 - q.k) : q.tmax;
  p = Math.min(p, pTodo);
  const tope = Math.min(Math.max(p, q.tmin), q.tmax);
  const fraccion = (tope - q.tmin) / (q.tmax - q.tmin);
  const calidadMedia = (q.tmin + tope) / 2;
  // Ganancia del intercambio por auto: (k − 1)·θ. Pérdida = ganancia de los autos que no se venden.
  const ganancia = (a: number, b: number) => ((q.k - 1) * (b * b - a * a)) / 2 / (q.tmax - q.tmin);
  const perdida = ganancia(tope, q.tmax);
  return { p, fraccion, calidadMedia, perdida, colapso: fraccion < 1e-9 };
}

export interface ParamsSpence {
  tB: number;
  tA: number;
  /** Nivel de educación que el mercado exige para pagar θ_A. */
  e: number;
}

export interface ResSpence {
  eMin: number;
  eMax: number;
  separa: boolean;
  uB: number;
  uA: number;
  /** Utilidad del tipo bajo si imitara al alto. */
  uBimita: number;
}

export function spence(q: ParamsSpence): ResSpence {
  positivo('θ_B', q.tB);
  positivo('θ_A', q.tA);
  if (!(q.tA > q.tB)) throw new ErrorParametro('El tipo alto debe ser más productivo: θ_A > θ_B.');
  if (!(Number.isFinite(q.e) && q.e >= 0)) throw new ErrorParametro('La educación exigida no puede ser negativa.');
  const eMin = q.tB * (q.tA - q.tB);
  const eMax = q.tA * (q.tA - q.tB);
  const uBimita = q.tA - q.e / q.tB;
  const uA = q.tA - q.e / q.tA;
  const separa = q.e >= eMin - 1e-12 && q.e <= eMax + 1e-12;
  return { eMin, eMax, separa, uB: q.tB, uA, uBimita };
}

export interface ParamsRiesgo {
  piA: number;
  piB: number;
  psi: number;
  b: number;
}

export interface ResRiesgo {
  bMin: number;
  esfuerza: boolean;
  uEsfuerzo: number;
  uSinEsfuerzo: number;
}

export function riesgoMoral(q: ParamsRiesgo): ResRiesgo {
  if (!(Number.isFinite(q.piA) && Number.isFinite(q.piB) && q.piA > q.piB && q.piB >= 0 && q.piA <= 1))
    throw new ErrorParametro('Se requiere 0 ≤ π_B < π_A ≤ 1: el esfuerzo sube la probabilidad de éxito.');
  if (!(Number.isFinite(q.psi) && q.psi >= 0)) throw new ErrorParametro('El costo del esfuerzo no puede ser negativo.');
  if (!(Number.isFinite(q.b) && q.b >= 0)) throw new ErrorParametro('El bono no puede ser negativo.');
  const bMin = q.psi / (q.piA - q.piB);
  const uEsfuerzo = q.piA * q.b - q.psi;
  const uSinEsfuerzo = q.piB * q.b;
  return { bMin, esfuerza: uEsfuerzo >= uSinEsfuerzo - 1e-12, uEsfuerzo, uSinEsfuerzo };
}
