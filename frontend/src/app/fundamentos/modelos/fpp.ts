/**
 * Frontera de posibilidades de producción (Mankiw, cap. 2, fig. 2-3): port de modelos/fpp.py.
 * (x/X)^k + (y/Y)^k = 1, con X e Y los máximos de cada bien y k ≥ 1 la curvatura: k = 1 es una
 * recta (costo de oportunidad constante); k > 1 es cóncava hacia afuera (costo creciente).
 */
import { ErrorParametro, INF, TOL, finito, noNegativo, positivo } from './_comun';

export const K_MAX = 10;

export class FPP {
  readonly X: number;
  readonly Y: number;
  readonly k: number;

  constructor(X = 100, Y = 100, k = 2) {
    this.X = positivo('El máximo del bien 1', X);
    this.Y = positivo('El máximo del bien 2', Y);
    const kk = finito('La curvatura', k);
    if (kk < 1 - TOL || kk > K_MAX + TOL)
      throw new ErrorParametro(`La curvatura debe estar entre 1 (recta) y ${K_MAX}.`);
    this.k = kk;
  }

  yDeX(x: number): number {
    x = noNegativo('La cantidad del bien 1', x);
    if (x > this.X * (1 + 1e-9))
      throw new ErrorParametro('Esa cantidad del bien 1 supera el máximo producible.');
    const r = Math.min(x / this.X, 1);
    return this.Y * Math.max(0, 1 - r ** this.k) ** (1 / this.k);
  }

  /** Unidades del bien 2 que se sacrifican por una unidad adicional del bien 1 (−dy/dx). */
  costoOportunidad(x: number): number {
    x = noNegativo('La cantidad del bien 1', x);
    const r = Math.min(x / this.X, 1);
    if (Math.abs(this.k - 1) <= TOL) return this.Y / this.X;
    if (r >= 1 - TOL) return INF;
    if (r <= TOL) return 0;
    return (this.Y / this.X) * r ** (this.k - 1) * (1 - r ** this.k) ** (1 / this.k - 1);
  }

  clasificar(x: number, y: number, tol = 1e-6): string {
    x = noNegativo('La cantidad del bien 1', x);
    y = noNegativo('La cantidad del bien 2', y);
    const g = (x / this.X) ** this.k + (y / this.Y) ** this.k;
    if (Math.abs(g - 1) <= tol) return 'eficiente';
    return g < 1 ? 'ineficiente' : 'inalcanzable';
  }

  /** Más recursos desplazan toda la frontera; la tecnología de un sector la rota. */
  desplazar(recursos = 1, tecnologia1 = 1, tecnologia2 = 1): FPP {
    const r = positivo('El factor de recursos', recursos);
    const t1 = positivo('La tecnología del bien 1', tecnologia1);
    const t2 = positivo('La tecnología del bien 2', tecnologia2);
    return new FPP(this.X * r * t1, this.Y * r * t2, this.k);
  }

  puntos(n = 101): [number[], number[]] {
    if (n < 2) throw new ErrorParametro('Se necesitan al menos 2 puntos.');
    const xs = Array.from({ length: n }, (_, i) => (this.X * i) / (n - 1));
    return [xs, xs.map((x) => this.yDeX(x))];
  }

  igual(o: FPP): boolean {
    return this.X === o.X && this.Y === o.Y && this.k === o.k;
  }
}
