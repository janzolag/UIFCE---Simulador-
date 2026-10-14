/**
 * Oferta y demanda lineales (Mankiw, cap. 4, 6 y 7): port de modelos/mercado.py.
 *
 * Demanda:  Qd = a − b·P   (b ≥ 0; b = 0 es perfectamente inelástica)
 * Oferta:   Qs = c + d·P   (d ≥ 0; d = 0 es perfectamente inelástica)
 * Cualquiera de las dos puede ser perfectamente elástica (horizontal) a un precio dado.
 *
 * `resolver(D, S, t)` es el núcleo del bloque: encuentra la cantidad transada cuando entre el
 * precio que paga el comprador (pc) y el que recibe el vendedor (pv) hay una cuña t (impuesto
 * t > 0, subsidio t < 0). Con t = 0 es el equilibrio de mercado.
 */
import { ErrorParametro, INF, TOL, finito, noNegativo } from './_comun';

export class Demanda {
  readonly a: number;
  readonly b: number;
  /** Precio si es perfectamente elástica. */
  readonly horizontalEn: number | null;

  constructor(a: number = 10, b: number = 1, horizontalEn: number | null = null) {
    if (horizontalEn !== null) {
      this.horizontalEn = noNegativo('El precio de la demanda horizontal', horizontalEn);
      this.a = a;
      this.b = b;
      return;
    }
    this.horizontalEn = null;
    this.a = noNegativo('El intercepto de la demanda (a)', a);
    this.b = noNegativo('La pendiente de la demanda (b)', b);
  }

  static perfectamenteElastica(precio: number): Demanda {
    return new Demanda(10, 1, precio);
  }

  get esHorizontal(): boolean {
    return this.horizontalEn !== null;
  }

  get esVertical(): boolean {
    return !this.esHorizontal && this.b <= TOL;
  }

  /** Cantidad sin truncar en cero (para resolver sistemas). */
  qLineal(p: number): number {
    if (this.esHorizontal)
      throw new ErrorParametro(
        'Con demanda perfectamente elástica la cantidad no está determinada por el precio.',
      );
    return this.a - this.b * p;
  }

  cantidad(p: number): number {
    if (this.horizontalEn !== null) return p < this.horizontalEn - TOL ? INF : 0;
    return Math.max(0, this.qLineal(p));
  }

  /** Demanda inversa: disposición a pagar por la unidad q. */
  precio(q: number): number {
    if (this.horizontalEn !== null) return this.horizontalEn;
    if (this.esVertical) return q < this.a - TOL ? INF : 0;
    return Math.max(0, (this.a - q) / this.b);
  }

  /** Precio al que la cantidad demandada es cero. */
  get precioMaximo(): number {
    if (this.horizontalEn !== null) return this.horizontalEn;
    if (this.esVertical) return this.a > TOL ? INF : 0;
    return this.a / this.b;
  }

  /** Desplazamiento horizontal (cambio en un determinante distinto del precio). */
  desplazar(dq: number): Demanda {
    if (this.esHorizontal) return this;
    return new Demanda(Math.max(0, this.a + finito('El desplazamiento', dq)), this.b);
  }

  /** Desplazamiento vertical de dp unidades de precio. */
  subir(dp: number): Demanda {
    const d = finito('El desplazamiento vertical', dp);
    if (this.horizontalEn !== null)
      return new Demanda(this.a, this.b, Math.max(0, this.horizontalEn + d));
    return new Demanda(Math.max(0, this.a + this.b * d), this.b);
  }

  igual(o: Demanda): boolean {
    return this.a === o.a && this.b === o.b && this.horizontalEn === o.horizontalEn;
  }
}

export class Oferta {
  readonly c: number;
  readonly d: number;
  readonly horizontalEn: number | null;
  /** Precio mínimo al que se ofrece algo (> 0 solo tras `subir`). */
  readonly piso: number;

  constructor(c: number = 0, d: number = 1, horizontalEn: number | null = null, piso: number = 0) {
    if (horizontalEn !== null) {
      this.horizontalEn = noNegativo('El precio de la oferta horizontal', horizontalEn);
      this.c = c;
      this.d = d;
      this.piso = piso;
      return;
    }
    this.horizontalEn = null;
    this.c = finito('El intercepto de la oferta (c)', c);
    this.piso = noNegativo('El piso de precio de la oferta', piso);
    this.d = noNegativo('La pendiente de la oferta (d)', d);
    if (this.d <= TOL && this.c < -TOL)
      throw new ErrorParametro('Una oferta vertical necesita una cantidad no negativa (c ≥ 0).');
  }

  static perfectamenteElastica(precio: number): Oferta {
    return new Oferta(0, 1, precio);
  }

  get esHorizontal(): boolean {
    return this.horizontalEn !== null;
  }

  get esVertical(): boolean {
    return !this.esHorizontal && this.d <= TOL;
  }

  qLineal(p: number): number {
    if (this.esHorizontal)
      throw new ErrorParametro(
        'Con oferta perfectamente elástica la cantidad no está determinada por el precio.',
      );
    return this.c + this.d * p;
  }

  cantidad(p: number): number {
    if (this.horizontalEn !== null) return p > this.horizontalEn + TOL ? INF : 0;
    if (p < this.piso - TOL) return 0;
    return Math.max(0, this.qLineal(p));
  }

  /** Oferta inversa: costo de la unidad q (nunca menor que cero). */
  precio(q: number): number {
    if (this.horizontalEn !== null) return this.horizontalEn;
    if (this.esVertical) return q <= this.c + TOL ? this.piso : INF;
    return Math.max(this.piso, (q - this.c) / this.d);
  }

  /** Precio a partir del cual se ofrece una cantidad positiva. */
  get precioMinimo(): number {
    if (this.horizontalEn !== null) return this.horizontalEn;
    if (this.esVertical) return this.c > TOL ? this.piso : INF;
    return Math.max(this.piso, -this.c / this.d);
  }

  desplazar(dq: number): Oferta {
    if (this.esHorizontal) return this;
    return new Oferta(this.c + finito('El desplazamiento', dq), this.d, null, this.piso);
  }

  /** Sube el costo de cada unidad en dp (p. ej. costo social = privado + costo externo). */
  subir(dp: number): Oferta {
    const x = finito('El desplazamiento vertical', dp);
    if (this.horizontalEn !== null)
      return new Oferta(this.c, this.d, Math.max(0, this.horizontalEn + x), this.piso);
    return new Oferta(this.c - this.d * x, this.d, null, Math.max(0, this.piso + x));
  }

  igual(o: Oferta): boolean {
    return (
      this.c === o.c &&
      this.d === o.d &&
      this.horizontalEn === o.horizontalEn &&
      this.piso === o.piso
    );
  }
}

export interface Resultado {
  /** Precio que paga el comprador. */
  pc: number;
  /** Precio que recibe el vendedor. */
  pv: number;
  /** Cantidad transada. */
  q: number;
  /** False si el mercado no existe (q = 0). */
  intercambio: boolean;
  /** Precio de equilibrio (el del comprador). */
  p: number;
}

function resultado(pc: number, pv: number, q: number, intercambio: boolean): Resultado {
  return { pc, pv, q, intercambio, p: pc };
}

/** Cantidad y precios con una cuña t entre comprador y vendedor (pc − pv = t). */
export function resolver(D: Demanda, S: Oferta, t: number = 0): Resultado {
  t = finito('El impuesto o subsidio', t);
  if (S.piso > TOL)
    throw new ErrorParametro(
      'resolver() trabaja con la oferta original; `subir` solo se usa para dibujar.',
    );
  if (D.esHorizontal && S.esHorizontal)
    throw new ErrorParametro(
      'Con oferta y demanda perfectamente elásticas la cantidad de equilibrio no está determinada.',
    );

  let pc: number;
  let pv: number;
  let q: number;
  if (D.horizontalEn !== null) {
    pc = D.horizontalEn;
    pv = pc - t;
    q = S.qLineal(pv);
  } else if (S.horizontalEn !== null) {
    pv = S.horizontalEn;
    pc = pv + t;
    q = D.qLineal(pc);
  } else {
    const pendiente = D.b + S.d;
    if (pendiente <= TOL)
      throw new ErrorParametro(
        'Con oferta y demanda perfectamente inelásticas el precio no está determinado.',
      );
    pv = (D.a - S.c - D.b * t) / pendiente;
    pc = pv + t;
    q = S.qLineal(pv);
  }

  if (q <= TOL) return resultado(D.precioMaximo, S.precioMinimo, 0, false);
  if (pv < -TOL || pc < -TOL) {
    if (t < 0 && pc < -TOL)
      throw new ErrorParametro(
        'El subsidio es tan alto que el precio para el comprador sería negativo.',
      );
    throw new ErrorParametro(
      'El equilibrio tendría precio negativo: a precio cero se ofrece más de lo que se demanda.',
    );
  }
  return resultado(Math.max(pc, 0), Math.max(pv, 0), q, true);
}

export function equilibrio(D: Demanda, S: Oferta): Resultado {
  return resolver(D, S, 0);
}

// --- Determinantes de la demanda y la oferta (Mankiw, cap. 4, tablas 1 y 2) ---

export interface DeterminantesDemanda {
  ingreso?: number;
  bien?: string;
  precioRelacionado?: number;
  relacion?: string;
  gustos?: number;
  expectativas?: number;
  compradores?: number;
}

/**
 * Cambio en la cantidad demandada a cada precio (Δa). El signo lo pone la teoría: más ingreso sube
 * la demanda de un bien normal y baja la de uno inferior; un sustituto más caro la sube y un
 * complemento más caro la baja.
 */
export function desplazamientoDemanda(p: DeterminantesDemanda = {}): number {
  const {
    ingreso = 0,
    bien = 'normal',
    precioRelacionado = 0,
    relacion = 'sustituto',
    gustos = 0,
    expectativas = 0,
    compradores = 0,
  } = p;
  if (bien !== 'normal' && bien !== 'inferior')
    throw new ErrorParametro("El tipo de bien debe ser 'normal' o 'inferior'.");
  if (relacion !== 'sustituto' && relacion !== 'complemento')
    throw new ErrorParametro("La relación debe ser 'sustituto' o 'complemento'.");
  const sIng = bien === 'normal' ? 1 : -1;
  const sRel = relacion === 'sustituto' ? 1 : -1;
  return (
    sIng * finito('ingreso', ingreso) +
    sRel * finito('precio relacionado', precioRelacionado) +
    finito('gustos', gustos) +
    finito('expectativas', expectativas) +
    finito('compradores', compradores)
  );
}

export interface DeterminantesOferta {
  precioInsumos?: number;
  tecnologia?: number;
  expectativas?: number;
  vendedores?: number;
}

/** Cambio en la cantidad ofrecida a cada precio (Δc). Insumos más caros la reducen. */
export function desplazamientoOferta(p: DeterminantesOferta = {}): number {
  const { precioInsumos = 0, tecnologia = 0, expectativas = 0, vendedores = 0 } = p;
  return (
    -finito('precio de insumos', precioInsumos) +
    finito('tecnología', tecnologia) +
    finito('expectativas', expectativas) +
    finito('vendedores', vendedores)
  );
}

/** Puntos de quiebre (precio, cantidad) de la demanda de mercado (Mankiw cap. 4, fig. 2). */
export function sumaHorizontalDemanda(...curvas: Demanda[]): [number, number][] {
  if (curvas.length === 0) throw new ErrorParametro('Se necesita al menos una curva individual.');
  const precios = [
    ...new Set([
      0,
      ...curvas.filter((c) => !c.esVertical && !c.esHorizontal).map((c) => c.precioMaximo),
    ]),
  ].sort((x, y) => x - y);
  return precios.map((p) => [p, curvas.reduce((s, c) => s + c.cantidad(p), 0)]);
}
