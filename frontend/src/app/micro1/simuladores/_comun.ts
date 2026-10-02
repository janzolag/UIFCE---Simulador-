import { Opcion } from '../../core/tipos';
import { CobbDouglas, CuasilinealRaiz, Leontief, Lineal, SeparableRaiz, StoneGeary, Utilidad } from '../modelos/consumidor';

/** Familias de preferencias que comparten preferencias, elección óptima, Slutsky y demanda. */
export const FAMILIAS: Opcion[] = [
  { valor: 'cd', etiqueta: 'Cobb-Douglas' },
  { valor: 'leontief', etiqueta: 'Complementarios (Leontief)' },
  { valor: 'lineal', etiqueta: 'Sustitutos perfectos' },
  { valor: 'cuasi', etiqueta: 'Cuasilineal' },
  { valor: 'separable', etiqueta: 'Separable' },
  { valor: 'stone', etiqueta: 'Stone-Geary' },
];

export const LIM = 10;

export function crearUtilidad(familia: string, a: number, b: number): Utilidad {
  switch (familia) {
    case 'cd':
      return new CobbDouglas(a, b);
    case 'leontief':
      return new Leontief(a, b);
    case 'lineal':
      return new Lineal(a, b);
    case 'cuasi':
      return new CuasilinealRaiz(a);
    case 'separable':
      return new SeparableRaiz(a, b);
    default:
      return new StoneGeary(a, b, 1, 1);
  }
}

/** Puntos (x, y) de la curva de indiferencia; maneja la escuadra de Leontief. */
export function curva(u: Utilidad, U0: number, xs: number[]): [number[], (number | null)[]] {
  if (u instanceof Leontief) {
    const xv = U0 / u.a;
    const yv = U0 / u.b;
    return [[xv, xv, LIM * 1.2], [LIM * 1.2, yv, yv]];
  }
  const ys = xs.map((x) => {
    const y = u.curvaIndiferencia(U0, x);
    return Number.isFinite(y) && y >= 0 && y <= LIM * 1.5 ? y : null;
  });
  return [xs, ys];
}
