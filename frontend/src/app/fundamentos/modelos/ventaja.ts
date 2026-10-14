/**
 * Ventaja comparativa y ganancias del comercio (Mankiw, cap. 3, fig. 1-2): port de modelos/ventaja.py.
 * Dos productores con FPP lineales. El bien 1 va en el eje vertical y el bien 2 en el horizontal,
 * como en Mankiw (carne y papas). El precio se expresa en unidades del bien 2 por unidad del bien 1.
 */
import { ErrorParametro, TOL, casiIgual, finito, noNegativo, positivo } from './_comun';

export class Productor {
  readonly horas: number;
  readonly minutosBien1: number;
  readonly minutosBien2: number;

  constructor(
    readonly nombre: string,
    horas: number,
    /** Minutos para producir una unidad del bien 1. */
    minutosBien1: number,
    minutosBien2: number,
  ) {
    this.horas = positivo(`Las horas de ${nombre}`, horas);
    this.minutosBien1 = positivo(`Los minutos por unidad del bien 1 de ${nombre}`, minutosBien1);
    this.minutosBien2 = positivo(`Los minutos por unidad del bien 2 de ${nombre}`, minutosBien2);
  }

  get maxBien1(): number {
    return (this.horas * 60) / this.minutosBien1;
  }

  get maxBien2(): number {
    return (this.horas * 60) / this.minutosBien2;
  }

  /** Costo de oportunidad de 1 unidad del bien 1, en unidades del bien 2. */
  get costoBien1(): number {
    return this.minutosBien1 / this.minutosBien2;
  }

  get costoBien2(): number {
    return this.minutosBien2 / this.minutosBien1;
  }

  /** Producción si dedica esa fracción del tiempo al bien 1. */
  producir(fraccionBien1: number): [number, number] {
    let f = finito('La fracción de tiempo', fraccionBien1);
    if (f < -TOL || f > 1 + TOL)
      throw new ErrorParametro('La fracción de tiempo debe estar entre 0 y 1.');
    f = Math.min(Math.max(f, 0), 1);
    return [f * this.maxBien1, (1 - f) * this.maxBien2];
  }
}

export interface Ventajas {
  absolutaBien1: string | null;
  absolutaBien2: string | null;
  comparativaBien1: string | null;
  comparativaBien2: string | null;
}

/** Quién tiene ventaja absoluta y comparativa en cada bien (null si hay empate). */
export function ventajas(a: Productor, b: Productor): Ventajas {
  const menor = (x: number, y: number): string | null => {
    if (casiIgual(x, y)) return null;
    return x < y ? a.nombre : b.nombre;
  };
  return {
    absolutaBien1: menor(a.minutosBien1, b.minutosBien1),
    absolutaBien2: menor(a.minutosBien2, b.minutosBien2),
    comparativaBien1: menor(a.costoBien1, b.costoBien1),
    comparativaBien2: menor(a.costoBien2, b.costoBien2),
  };
}

/** Precios (bien 2 por bien 1) con los que ambos ganan: entre los dos costos de oportunidad. */
export function rangoPrecio(a: Productor, b: Productor): [number, number] {
  const [x, y] = [a.costoBien1, b.costoBien1];
  return x <= y ? [x, y] : [y, x];
}

export interface ResultadoVentaja {
  produccionA: [number, number];
  produccionB: [number, number];
  consumoA: [number, number];
  consumoB: [number, number];
  autarquiaA: [number, number];
  autarquiaB: [number, number];
  precioEnRango: boolean;
  gananciaA: [number, number];
  gananciaB: [number, number];
}

const resta = (c: [number, number], s: [number, number]): [number, number] => [
  c[0] - s[0],
  c[1] - s[1],
];

/**
 * `a` produce con `fraccionA` de su tiempo en el bien 1 y le entrega a `b` `bien1DeAaB` unidades del
 * bien 1 a cambio de precio × esa cantidad del bien 2 (una cantidad negativa invierte el sentido).
 * `autarquiaA/B` es la fracción de tiempo en el bien 1 sin comercio, para medir las ganancias.
 */
export function comerciar(
  a: Productor,
  b: Productor,
  fraccionA: number,
  fraccionB: number,
  autarquiaA: number,
  autarquiaB: number,
  bien1DeAaB: number,
  precio: number,
): ResultadoVentaja {
  precio = noNegativo('El precio de intercambio', precio);
  const q1 = finito('La cantidad intercambiada', bien1DeAaB);
  const pa = a.producir(fraccionA);
  const pb = b.producir(fraccionB);
  const ca: [number, number] = [pa[0] - q1, pa[1] + precio * q1];
  const cb: [number, number] = [pb[0] + q1, pb[1] - precio * q1];
  if (Math.min(...ca, ...cb) < -TOL)
    throw new ErrorParametro(
      'El intercambio deja a alguien con consumo negativo: no puede entregar más de lo que produce.',
    );
  const [lo, hi] = rangoPrecio(a, b);
  const aA = a.producir(autarquiaA);
  const aB = b.producir(autarquiaB);
  return {
    produccionA: pa,
    produccionB: pb,
    consumoA: ca,
    consumoB: cb,
    autarquiaA: aA,
    autarquiaB: aB,
    precioEnRango: lo - TOL <= precio && precio <= hi + TOL,
    gananciaA: resta(ca, aA),
    gananciaB: resta(cb, aB),
  };
}
