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

/**
 * Puntos (x, y) de la curva de indiferencia; maneja la escuadra de Leontief. Con `lims` (el recuadro de la
 * gráfica) la curva llega hasta los bordes del recuadro; sin él usa el recuadro fijo 0–LIM.
 */
export function curva(u: Utilidad, U0: number, xs: number[], lims?: { x: number; y: number }): [number[], (number | null)[]] {
  const bx = lims ? lims.x * 1.2 : LIM * 1.2;
  const by = lims ? lims.y * 1.2 : LIM * 1.2;
  const tope = lims ? lims.y * 1.5 : LIM * 1.5;
  if (u instanceof Leontief) {
    const xv = U0 / u.a;
    const yv = U0 / u.b;
    return [[xv, xv, bx], [by, yv, yv]];
  }
  const ys = xs.map((x) => {
    const y = u.curvaIndiferencia(U0, x);
    return Number.isFinite(y) && y >= 0 && y <= tope ? y : null;
  });
  return [xs, ys];
}

/**
 * Figuras de dos paneles lado a lado (demanda/Engel, empresa/mercado): en pantallas angostas se
 * apilan a todo el ancho; los títulos van anclados al dominio de cada panel y lo siguen.
 */
export const MOVIL_DOBLE = {
  alto: 900,
  layout: {
    xaxis: { domain: [0, 1] },
    yaxis: { domain: [0.58, 1] },
    xaxis2: { domain: [0, 1] },
    yaxis2: { domain: [0, 0.4] },
    legend: { y: -0.1 },
  },
};
