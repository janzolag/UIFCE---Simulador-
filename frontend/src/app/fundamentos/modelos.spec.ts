/**
 * Pruebas matemáticas y teóricas del motor de Fundamentos: ejemplos numéricos de Mankiw, propiedades
 * que la teoría exige (conservación del bienestar, incidencia, óptimo de Pigou, equivalencias) y
 * comprobaciones contra métodos independientes (bisección, integración de Simpson, derivada numérica).
 */
import { describe, expect, it } from 'vitest';
import { ErrorParametro, derivada } from '../core/errores';
import {
  Bienestar,
  bienestar,
  bienestarEficiente,
  cantidadEscalonada,
  excedenteCompradores,
  excedenteConsumidor,
  excedenteProductor,
  excedenteVendedores,
} from './modelos/excedentes';
import {
  clasificar,
  clasificarIngreso,
  elasticidadCruzada,
  elasticidadDemanda,
  elasticidadIngreso,
  elasticidadOferta,
  ingresoTotal,
  precioIngresoMaximo,
  puntoMedio,
  tablaPuntoMedio,
} from './modelos/elasticidad';
import { comercio } from './modelos/comercio';
import { precioMaximo, precioMinimo } from './modelos/controles';
import { contaminacionConImpuesto, externalidad, precioPermiso } from './modelos/externalidades';
import { FPP } from './modelos/fpp';
import {
  aplicarImpuesto,
  curvaLaffer,
  impuestoProhibitivo,
  impuestoRecaudoMaximo,
} from './modelos/impuestos';
import {
  Demanda,
  Oferta,
  desplazamientoDemanda,
  desplazamientoOferta,
  equilibrio,
  resolver,
  sumaHorizontalDemanda,
} from './modelos/mercado';
import { Productor, comerciar, rangoPrecio, ventajas } from './modelos/ventaja';

const cerca = (a: number, b: number, tol = 1e-8) =>
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(a), Math.abs(b)));

const D = new Demanda(100, 2);
const S = new Oferta(10, 3);

/** Equilibrio por bisección sobre Qd(P) − Qs(P), independiente de la fórmula cerrada. */
function biseccion(Dm: Demanda, Sm: Oferta, t = 0): { p: number; q: number } {
  let lo = 0;
  let hi = 1e4;
  for (let i = 0; i < 200; i++) {
    const m = (lo + hi) / 2;
    // el vendedor recibe p, el comprador paga p + t
    if (Dm.cantidad(m + t) > Sm.cantidad(m)) lo = m;
    else hi = m;
  }
  return { p: lo, q: Sm.cantidad(lo) };
}

/** Integral por Simpson de una función en [0, q]. */
function simpson(f: (x: number) => number, q: number, n = 2000): number {
  const h = q / n;
  let s = f(0) + f(q);
  for (let i = 1; i < n; i++) s += f(i * h) * (i % 2 === 0 ? 2 : 4);
  return (s * h) / 3;
}

describe('Mercado: equilibrio y desplazamientos (cap. 4)', () => {
  it('P* = (a − c)/(b + d), Q* = (ad + bc)/(b + d)', () => {
    const e = equilibrio(D, S);
    cerca(e.p, 90 / 5);
    cerca(e.q, (100 * 3 + 2 * 10) / 5);
    expect(e.intercambio).toBe(true);
  });

  it('coincide con una bisección independiente en mercados aleatorios', () => {
    let semilla = 7;
    const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 100; i++) {
      const Dm = new Demanda(20 + azar() * 180, 0.2 + azar() * 9);
      const Sm = new Oferta(azar() * 10, 0.2 + azar() * 9);
      const e = equilibrio(Dm, Sm);
      const b = biseccion(Dm, Sm);
      cerca(e.p, b.p, 1e-7);
      cerca(e.q, b.q, 1e-7);
    }
  });

  it('los cuatro desplazamientos básicos dan el signo de la teoría', () => {
    const e0 = equilibrio(D, S);
    const dMas = equilibrio(D.desplazar(20), S);
    const dMenos = equilibrio(D.desplazar(-20), S);
    const sMas = equilibrio(D, S.desplazar(20));
    const sMenos = equilibrio(D, S.desplazar(-20));
    expect([dMas.p > e0.p, dMas.q > e0.q]).toEqual([true, true]);
    expect([dMenos.p < e0.p, dMenos.q < e0.q]).toEqual([true, true]);
    expect([sMas.p < e0.p, sMas.q > e0.q]).toEqual([true, true]);
    expect([sMenos.p > e0.p, sMenos.q < e0.q]).toEqual([true, true]);
  });

  it('si se mueven las dos curvas, un efecto queda ambiguo', () => {
    // demanda y oferta aumentan: la cantidad sube siempre; el precio depende de cuál se mueve más
    const masDemanda = equilibrio(D.desplazar(30), S.desplazar(5));
    const masOferta = equilibrio(D.desplazar(5), S.desplazar(30));
    const e0 = equilibrio(D, S);
    expect(masDemanda.q).toBeGreaterThan(e0.q);
    expect(masOferta.q).toBeGreaterThan(e0.q);
    expect(masDemanda.p).toBeGreaterThan(e0.p);
    expect(masOferta.p).toBeLessThan(e0.p);
  });

  it('determinantes: el signo lo pone la teoría', () => {
    expect(desplazamientoDemanda({ ingreso: 10, bien: 'normal' })).toBe(10);
    expect(desplazamientoDemanda({ ingreso: 10, bien: 'inferior' })).toBe(-10);
    expect(desplazamientoDemanda({ precioRelacionado: 10, relacion: 'sustituto' })).toBe(10);
    expect(desplazamientoDemanda({ precioRelacionado: 10, relacion: 'complemento' })).toBe(-10);
    expect(desplazamientoDemanda({ gustos: 3, expectativas: 2, compradores: 1 })).toBe(6);
    expect(desplazamientoOferta({ precioInsumos: 10 })).toBe(-10);
    expect(desplazamientoOferta({ tecnologia: 10, vendedores: 5, expectativas: -2 })).toBe(13);
  });

  it('suma horizontal de la demanda (Mankiw, cap. 4, fig. 2): Catherine Q = 12 − 4P y Nicholas Q = 7 − 2P', () => {
    const puntos = sumaHorizontalDemanda(new Demanda(12, 4), new Demanda(7, 2));
    expect(puntos[0]).toEqual([0, 19]);
    // en P = 3 Catherine deja de comprar y solo queda Nicholas: 7 − 6 = 1
    cerca(puntos.find(([p]) => p === 3)![1], 1);
  });

  it('resolver con una cuña t: pc − pv = t y coincide con la bisección', () => {
    for (const t of [-8, -2, 0, 3, 10, 25]) {
      const r = resolver(D, S, t);
      cerca(r.pc - r.pv, t);
      const b = biseccion(D, S, t);
      cerca(r.pv, b.p, 1e-7);
      cerca(r.q, b.q, 1e-7);
    }
  });

  it('curvas perfectamente elásticas: el precio lo fija la curva horizontal', () => {
    const rd = equilibrio(Demanda.perfectamenteElastica(20), S);
    cerca(rd.p, 20);
    cerca(rd.q, 10 + 3 * 20);
    const rs = equilibrio(D, Oferta.perfectamenteElastica(15));
    cerca(rs.p, 15);
    cerca(rs.q, 100 - 30);
  });

  it('curvas perfectamente inelásticas: la cantidad la fija la curva vertical', () => {
    const r = equilibrio(D, new Oferta(40, 0));
    cerca(r.q, 40);
    cerca(r.p, (100 - 40) / 2);
    const r2 = equilibrio(new Demanda(60, 0), S);
    cerca(r2.q, 60);
    cerca(r2.p, 50 / 3);
  });

  it('sin intercambio: precio máximo de los compradores menor que el mínimo de los vendedores', () => {
    const r = equilibrio(new Demanda(10, 1), new Oferta(-100, 1)); // demanda hasta P = 10, oferta desde P = 100
    expect(r.intercambio).toBe(false);
    expect(r.q).toBe(0);
  });

  it('subir() es un desplazamiento vertical: P_d(q) − e y P_s(q) + e', () => {
    const Sd = S.subir(7);
    for (const q of [0, 5, 20, 60]) cerca(Sd.precio(q), S.precio(q) + 7);
    const Dd = D.subir(7);
    for (const q of [0, 5, 40, 90]) cerca(Dd.precio(q), D.precio(q) + 7);
  });
});

describe('Elasticidad (cap. 5)', () => {
  it('punto medio: de (4, 120) a (6, 80) la elasticidad es 1.0 en ambas direcciones', () => {
    cerca(puntoMedio(120, 4, 80, 6), 1);
    cerca(puntoMedio(80, 6, 120, 4), 1);
  });

  it('figura 4 del libro, Q = 14 − 2P, fila por fila', () => {
    const filas = tablaPuntoMedio(new Demanda(14, 2), [7, 6, 5, 4, 3, 2, 1, 0]);
    expect(filas.map((x) => x.ingreso)).toEqual([0, 12, 20, 24, 24, 20, 12, 0]);
    const esperadas = [13, 3.7, 1.8, 1, 0.6, 0.27, 0.08];
    filas
      .slice(0, 7)
      .forEach((x, i) =>
        expect(x.elasticidad!).toBeCloseTo(esperadas[i], i === 5 || i === 6 ? 1 : 1),
      );
    expect(filas[0].tramo).toBe('elástica');
    expect(filas[3].tramo).toBe('elasticidad unitaria');
    expect(filas[6].tramo).toBe('inelástica');
    cerca(filas[0].cambioCantidad!, 200);
    cerca(filas[0].cambioPrecio!, (100 * 1) / 6.5);
  });

  it('el ingreso total es máximo donde ε = 1 (P = a/2b)', () => {
    const Dm = new Demanda(14, 2);
    const pm = precioIngresoMaximo(Dm)!;
    cerca(pm, 3.5);
    cerca(elasticidadDemanda(Dm, pm), 1);
    for (const p of [0.5, 2, 3, 4, 5, 6.5])
      expect(ingresoTotal(Dm, p)).toBeLessThanOrEqual(ingresoTotal(Dm, pm) + 1e-12);
  });

  it('subir el precio aumenta el ingreso si la demanda es inelástica y lo baja si es elástica', () => {
    const Dm = new Demanda(14, 2);
    expect(ingresoTotal(Dm, 2.5)).toBeGreaterThan(ingresoTotal(Dm, 2)); // ε < 1
    expect(ingresoTotal(Dm, 5)).toBeLessThan(ingresoTotal(Dm, 4.5)); // ε > 1
  });

  it('elasticidad puntual = bP/Q = −(dQ/dP)(P/Q) con derivada numérica', () => {
    const Dm = new Demanda(50, 3);
    for (const p of [2, 6, 10])
      cerca(
        elasticidadDemanda(Dm, p),
        -derivada((x) => Dm.cantidad(x), p) * (p / Dm.cantidad(p)),
        1e-6,
      );
    const Sm = new Oferta(5, 2);
    for (const p of [2, 6, 10])
      cerca(
        elasticidadOferta(Sm, p),
        derivada((x) => Sm.cantidad(x), p) * (p / Sm.cantidad(p)),
        1e-6,
      );
  });

  it('casos extremos: vertical ε = 0, horizontal ε = ∞', () => {
    expect(elasticidadDemanda(new Demanda(10, 0), 5)).toBe(0);
    expect(elasticidadDemanda(Demanda.perfectamenteElastica(5), 5)).toBe(Infinity);
    expect(elasticidadOferta(new Oferta(10, 0), 5)).toBe(0);
    expect(elasticidadOferta(Oferta.perfectamenteElastica(5), 5)).toBe(Infinity);
    expect(clasificar(0)).toBe('perfectamente inelástica');
    expect(clasificar(Infinity)).toBe('perfectamente elástica');
  });

  it('elasticidad ingreso: ε = 1 es la frontera, no «necesario» (lección de Micro 1)', () => {
    expect(clasificarIngreso(1)).toContain('frontera');
    expect(clasificarIngreso(0.5)).toBe('normal necesario');
    expect(clasificarIngreso(1.5)).toBe('normal de lujo');
    expect(clasificarIngreso(-0.3)).toBe('inferior');
    expect(clasificarIngreso(0)).toContain('neutro');
    cerca(elasticidadIngreso(100, 1000, 120, 1200), 1);
  });

  it('elasticidad cruzada: positiva con sustitutos y negativa con complementos', () => {
    expect(elasticidadCruzada(100, 10, 120, 12)).toBeGreaterThan(0);
    expect(elasticidadCruzada(100, 10, 80, 12)).toBeLessThan(0);
  });
});

describe('Excedentes (cap. 7)', () => {
  const compradores: [string, number][] = [
    ['John', 100],
    ['Paul', 80],
    ['George', 70],
    ['Ringo', 50],
  ];
  const vendedores: [string, number][] = [
    ['Grandma', 500],
    ['Georgia', 600],
    ['Frida', 800],
    ['Mary', 900],
  ];

  it('tabla 1: EC = 20 a $80 y 40 a $70', () => {
    cerca(excedenteCompradores(compradores, 80), 20);
    cerca(excedenteCompradores(compradores, 70), 40);
    expect(cantidadEscalonada(compradores, 70, 'demanda')).toBe(3);
  });

  it('tabla 2: EP = 100 a $600 y 500 a $800', () => {
    cerca(excedenteVendedores(vendedores, 600), 100);
    cerca(excedenteVendedores(vendedores, 800), 500);
    expect(cantidadEscalonada(vendedores, 800, 'oferta')).toBe(3);
  });

  it('los excedentes continuos coinciden con una integración de Simpson', () => {
    for (const [Dm, Sm] of [
      [D, S],
      [new Demanda(60, 1.5), new Oferta(-5, 2)],
      [new Demanda(80, 4), new Oferta(0, 1)],
    ] as [Demanda, Oferta][]) {
      const e = equilibrio(Dm, Sm);
      const ec = simpson((q) => Dm.precio(q) - e.p, e.q);
      const ep = simpson((q) => e.p - Sm.precio(q), e.q);
      cerca(excedenteConsumidor(Dm, e.q, e.p), ec, 1e-5);
      cerca(excedenteProductor(Sm, e.q, e.p), ep, 1e-5);
    }
  });

  it('el equilibrio maximiza el excedente total (producir más o menos reduce la suma)', () => {
    const e = equilibrio(D, S);
    const total = (q: number) => simpson((x) => D.precio(x) - S.precio(x), q);
    for (const q of [0.5 * e.q, 0.9 * e.q, 1.1 * e.q, 1.5 * e.q])
      expect(total(q)).toBeLessThan(total(e.q));
  });

  it('con demanda perfectamente inelástica el excedente del consumidor es infinito', () => {
    expect(excedenteConsumidor(new Demanda(40, 0), 40, 10)).toBe(Infinity);
  });

  it('con oferta perfectamente elástica el EP es cero', () => {
    const Sh = Oferta.perfectamenteElastica(15);
    const e = equilibrio(D, Sh);
    cerca(excedenteProductor(Sh, e.q, e.p), 0);
  });
});

describe('Controles de precios (cap. 6)', () => {
  it('un techo por debajo de P* produce escasez y transa lo que ofrecen los vendedores', () => {
    const r = precioMaximo(D, S, 12);
    expect(r.obligatorio).toBe(true);
    cerca(r.qd, 100 - 24);
    cerca(r.qs, 10 + 36);
    cerca(r.q, r.qs);
    cerca(r.faltante, r.qd - r.qs);
    expect(r.faltante).toBeGreaterThan(0);
  });

  it('un piso por encima de P* produce excedente (desempleo en el mercado de trabajo) y transa lo que demandan', () => {
    const r = precioMinimo(D, S, 26);
    expect(r.obligatorio).toBe(true);
    cerca(r.q, r.qd);
    expect(r.faltante).toBeGreaterThan(0);
    cerca(r.faltante, r.qs - r.qd);
  });

  it('un control del lado equivocado no es obligatorio y no cambia nada', () => {
    for (const r of [precioMaximo(D, S, 30), precioMinimo(D, S, 5)]) {
      expect(r.obligatorio).toBe(false);
      cerca(r.q, 64);
      expect(r.ppm).toBe(0);
      expect(r.faltante).toBe(0);
    }
  });

  it('la pérdida de peso muerto es positiva y crece al alejar el techo del equilibrio', () => {
    const p1 = precioMaximo(D, S, 16).ppm;
    const p2 = precioMaximo(D, S, 12).ppm;
    const p3 = precioMaximo(D, S, 8).ppm;
    expect(p1).toBeGreaterThan(0);
    expect(p2).toBeGreaterThan(p1);
    expect(p3).toBeGreaterThan(p2);
  });
});

describe('Impuestos y subsidios (caps. 6 y 8)', () => {
  it('no importa a quién se cobre: mismos precios que paga y recibe cada lado y misma cantidad', () => {
    const v = aplicarImpuesto(D, S, 5, 'vendedores');
    const c = aplicarImpuesto(D, S, 5, 'compradores');
    cerca(v.pc, c.pc);
    cerca(v.pv, c.pv);
    cerca(v.q, c.q);
    cerca(v.recaudo, c.recaudo);
  });

  it('caso del libro: pc − pv = t; carga del comprador = d/(b + d); recaudo = t·Q', () => {
    const r = aplicarImpuesto(D, S, 5);
    cerca(r.pc - r.pv, 5);
    cerca(r.cargaCompradores!, 3 / 5);
    cerca(r.cargaVendedores!, 2 / 5);
    cerca(r.recaudo, 5 * r.q);
    cerca(r.q, 58);
  });

  it('la carga recae sobre el lado más inelástico', () => {
    const demandaInelastica = aplicarImpuesto(new Demanda(100, 0.5), new Oferta(10, 5), 5);
    const ofertaInelastica = aplicarImpuesto(new Demanda(100, 5), new Oferta(10, 0.5), 5);
    expect(demandaInelastica.cargaCompradores!).toBeGreaterThan(0.5);
    expect(ofertaInelastica.cargaCompradores!).toBeLessThan(0.5);
  });

  it('PPM = ½·t·ΔQ y crece con el cuadrado del impuesto', () => {
    const r = aplicarImpuesto(D, S, 5);
    cerca(r.ppm, 0.5 * 5 * (r.qEquilibrio - r.q));
    cerca(aplicarImpuesto(D, S, 10).ppm / r.ppm, 4);
  });

  it('conservación del bienestar: EC + EP + recaudo + PPM = excedente eficiente (mercados aleatorios)', () => {
    let semilla = 11;
    const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
    let verificados = 0;
    for (let i = 0; i < 300; i++) {
      const Dm = new Demanda(30 + azar() * 170, 0.3 + azar() * 8);
      const Sm = new Oferta(azar() * 10, 0.3 + azar() * 8);
      const t = azar() * 15;
      let r;
      try {
        r = aplicarImpuesto(Dm, Sm, t);
      } catch (e) {
        if (e instanceof ErrorParametro) continue; // impuesto que dejaría un precio negativo: el modelo lo rechaza
        throw e;
      }
      cerca(r.bienestar.total + r.ppm, r.eficiente.total, 1e-9);
      verificados++;
    }
    expect(verificados).toBeGreaterThan(150);
  });

  it('subsidio: t < 0 aumenta la cantidad, el recaudo es negativo y también hay pérdida de peso muerto', () => {
    const r = aplicarImpuesto(D, S, -5);
    expect(r.q).toBeGreaterThan(64);
    expect(r.recaudo).toBeLessThan(0);
    expect(r.ppm).toBeGreaterThan(0);
  });

  it('curva de Laffer: sube hasta t* = Q*/(2k), baja después y se anula en el impuesto prohibitivo', () => {
    const k = (2 * 3) / (2 + 3);
    cerca(impuestoRecaudoMaximo(D, S)!, 64 / (2 * k));
    cerca(impuestoProhibitivo(D, S), 64 / k);
    const tStar = impuestoRecaudoMaximo(D, S)!;
    const rec = (t: number) => aplicarImpuesto(D, S, t).recaudo;
    expect(rec(tStar)).toBeGreaterThan(rec(0.5 * tStar));
    expect(rec(tStar)).toBeGreaterThan(rec(1.5 * tStar));
    const l = curvaLaffer(D, S, 2 * tStar, 40);
    expect(l.length).toBeGreaterThan(30);
    expect(Math.max(...l.map((x) => x[1]))).toBeLessThanOrEqual(rec(tStar) + 1e-9);
  });

  it('impuesto prohibitivo: el mercado desaparece, no hay recaudo y la PPM es todo el excedente', () => {
    const r = aplicarImpuesto(D, S, impuestoProhibitivo(D, S) * 1.5);
    expect(r.q).toBe(0);
    expect(r.recaudo).toBe(0);
    cerca(r.ppm, r.eficiente.total);
  });

  it('con una curva perfectamente inelástica la cantidad no cambia y no hay PPM', () => {
    const r = aplicarImpuesto(new Demanda(100, 0), S, 5);
    expect(r.ppm).toBeLessThan(1e-9);
    expect(impuestoRecaudoMaximo(new Demanda(100, 0), S)).toBeNull();
  });
});

describe('Comercio internacional (cap. 9)', () => {
  it('importador: ganan los consumidores, pierden los productores y el país gana en total', () => {
    const r = comercio(D, S, 12);
    expect(r.rol).toBe('importador');
    expect(r.bienestar.ec).toBeGreaterThan(r.autarquia.ec);
    expect(r.bienestar.ep).toBeLessThan(r.autarquia.ep);
    expect(r.gananciaVsAutarquia).toBeGreaterThan(0);
    cerca(r.importaciones, r.qd - r.qs);
    expect(r.importaciones).toBeGreaterThan(0);
  });

  it('exportador: ganan los productores, pierden los consumidores y el país gana en total', () => {
    const r = comercio(D, S, 30);
    expect(r.rol).toBe('exportador');
    expect(r.bienestar.ep).toBeGreaterThan(r.autarquia.ep);
    expect(r.bienestar.ec).toBeLessThan(r.autarquia.ec);
    expect(r.gananciaVsAutarquia).toBeGreaterThan(0);
    expect(r.importaciones).toBeLessThan(0);
  });

  it('precio mundial igual al de autarquía: sin comercio', () => {
    const r = comercio(D, S, 18);
    expect(r.rol).toBe('sin comercio');
    cerca(r.gananciaVsAutarquia, 0);
  });

  it('arancel: precio interno = Pw + τ, recaudo = τ·M y pérdida = dos triángulos', () => {
    const r = comercio(D, S, 12, 3);
    cerca(r.precioInterno, 15);
    cerca(r.recaudo, 3 * (r.qd - r.qs));
    const libre = comercio(D, S, 12);
    const triangulos = 0.5 * 3 * (r.qs - libre.qs) + 0.5 * 3 * (libre.qd - r.qd);
    cerca(r.ppm, triangulos);
    cerca(r.bienestar.total + r.ppm, libre.bienestar.total);
  });

  it('arancel prohibitivo: el país vuelve al equilibrio sin comercio', () => {
    const r = comercio(D, S, 12, 100);
    expect(r.prohibitivo).toBe(true);
    cerca(r.importaciones, 0);
    cerca(r.precioInterno, 18);
  });

  it('una cuota equivale al arancel que da las mismas importaciones; la diferencia son las rentas', () => {
    const a = comercio(D, S, 12, 3);
    const c = comercio(D, S, 12, 0, a.importaciones);
    cerca(c.precioInterno, a.precioInterno);
    cerca(c.importaciones, a.importaciones);
    cerca(c.rentasCuota, a.recaudo);
    cerca(c.ppm, a.ppm);
  });

  it('arancel cuando el país exporta no tiene efecto', () => {
    cerca(comercio(D, S, 30, 5).precioInterno, 30);
  });
});

describe('Externalidades (cap. 10)', () => {
  it('negativa: el mercado produce de más; el impuesto pigouviano t = e logra el óptimo y elimina la PPM', () => {
    const sin = externalidad(D, S, 'negativa', 10, 0);
    expect(sin.qMercado).toBeGreaterThan(sin.qOptimo);
    expect(sin.ppmMercado).toBeGreaterThan(0);
    const con = externalidad(D, S, 'negativa', 10, 10);
    cerca(con.q, con.qOptimo);
    expect(con.ppm).toBeLessThan(1e-9);
  });

  it('positiva: el mercado produce de menos; el subsidio t = −e logra el óptimo', () => {
    const sin = externalidad(D, S, 'positiva', 10, 0);
    expect(sin.qMercado).toBeLessThan(sin.qOptimo);
    expect(sin.ppmMercado).toBeGreaterThan(0);
    const con = externalidad(D, S, 'positiva', 10, -10);
    cerca(con.q, con.qOptimo);
    expect(con.ppm).toBeLessThan(1e-9);
  });

  it('el óptimo maximiza el bienestar social frente a 50 intervenciones aleatorias', () => {
    const optimo = externalidad(D, S, 'negativa', 10, 10).bienestarSocial;
    let semilla = 5;
    const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 50; i++)
      expect(
        externalidad(D, S, 'negativa', 10, azar() * 30 - 5).bienestarSocial,
      ).toBeLessThanOrEqual(optimo + 1e-9);
  });

  it('beneficio externo muy grande: el óptimo se calcula sin fallar aunque el subsidio pigouviano daría precio negativo', () => {
    const r = externalidad(D, S, 'positiva', 40, 0);
    expect(Number.isFinite(r.qOptimo)).toBe(true);
    expect(r.qOptimo).toBeGreaterThan(r.qMercado);
  });

  it('e = 0: no hay externalidad y el óptimo es el equilibrio', () => {
    const r = externalidad(D, S, 'negativa', 0, 0);
    cerca(r.qOptimo, r.qMercado);
    cerca(r.ppmMercado, 0);
  });

  it('un impuesto en el sentido equivocado empeora el bienestar', () => {
    const sin = externalidad(D, S, 'negativa', 10, 0).bienestarSocial;
    expect(externalidad(D, S, 'negativa', 10, -10).bienestarSocial).toBeLessThan(sin);
  });

  it('permisos negociables equivalen al impuesto: el precio del permiso es el impuesto que da esa contaminación', () => {
    const demandaContaminacion = new Demanda(60, 2);
    const permisos = 20;
    const precio = precioPermiso(demandaContaminacion, permisos);
    cerca(contaminacionConImpuesto(demandaContaminacion, precio), permisos);
    expect(precioPermiso(demandaContaminacion, 100)).toBe(0);
  });
});

describe('Frontera de posibilidades de producción (cap. 2)', () => {
  it('los puntos de la frontera la satisfacen: (x/X)^k + (y/Y)^k = 1', () => {
    for (const k of [1, 1.5, 2, 4, 6]) {
      const f = new FPP(1000, 3000, k);
      for (const x of [0, 100, 500, 900, 1000]) {
        const y = f.yDeX(x);
        cerca((x / f.X) ** k + (y / f.Y) ** k, 1);
        expect(f.clasificar(x, y)).toBe('eficiente');
      }
    }
  });

  it('el costo de oportunidad coincide con −dy/dx numérico para k = 1…6 y es creciente si k > 1', () => {
    for (const k of [1, 1.5, 2, 3, 4, 6]) {
      const f = new FPP(1000, 3000, k);
      for (const x of [100, 400, 700, 900])
        cerca(f.costoOportunidad(x), -derivada((u) => f.yDeX(u), x, 1e-3), 1e-4);
      if (k > 1) expect(f.costoOportunidad(700)).toBeGreaterThan(f.costoOportunidad(300));
      else cerca(f.costoOportunidad(700), f.costoOportunidad(300));
    }
  });

  it('adentro es ineficiente, afuera es inalcanzable', () => {
    const f = new FPP(1000, 3000, 2);
    expect(f.clasificar(500, 1000)).toBe('ineficiente');
    expect(f.clasificar(900, 2900)).toBe('inalcanzable');
  });

  it('más recursos desplazan la frontera; la tecnología de un sector la rota', () => {
    const f = new FPP(1000, 3000, 2);
    const g = f.desplazar(1.2, 1, 1);
    cerca(g.X, 1200);
    cerca(g.Y, 3600);
    const h = f.desplazar(1, 1.5, 1);
    cerca(h.X, 1500);
    cerca(h.Y, 3000);
  });
});

describe('Ventaja comparativa (cap. 3)', () => {
  const g = new Productor('Ganadero', 8, 20, 10);
  const c = new Productor('Campesino', 8, 60, 15);

  it('fig. 1–2 del libro: máximos 24/48 y 8/32; costo de la papa 1/2 y 1/4 kg de carne', () => {
    cerca(g.maxBien1, 24);
    cerca(g.maxBien2, 48);
    cerca(c.maxBien1, 8);
    cerca(c.maxBien2, 32);
    cerca(g.costoBien2, 0.5);
    cerca(c.costoBien2, 0.25);
  });

  it('el ganadero tiene ventaja absoluta en todo y comparativa en carne; el campesino, comparativa en papas', () => {
    const v = ventajas(g, c);
    expect([v.absolutaBien1, v.absolutaBien2]).toEqual(['Ganadero', 'Ganadero']);
    expect(v.comparativaBien1).toBe('Ganadero');
    expect(v.comparativaBien2).toBe('Campesino');
  });

  it('con comercio ambos consumen fuera de su frontera: (13, 27) y (5, 17); ganancias +1/+3 y +1/+1', () => {
    const r = comerciar(g, c, 0.75, 0, 0.5, 0.5, 5, 3);
    expect(r.consumoA.map((x) => Math.round(x * 1e9) / 1e9)).toEqual([13, 27]);
    expect(r.consumoB.map((x) => Math.round(x * 1e9) / 1e9)).toEqual([5, 17]);
    expect(r.gananciaA.map(Math.round)).toEqual([1, 3]);
    expect(r.gananciaB.map(Math.round)).toEqual([1, 1]);
    expect(r.precioEnRango).toBe(true);
  });

  it('el rango de precios con ganancia para ambos es el intervalo entre los dos costos de oportunidad', () => {
    const [lo, hi] = rangoPrecio(g, c);
    cerca(lo, 2);
    cerca(hi, 4);
    expect(comerciar(g, c, 0.75, 0, 0.5, 0.5, 5, 5).precioEnRango).toBe(false);
  });

  it('el precio del extremo del rango deja a uno exactamente igual que sin comerciar', () => {
    const r = comerciar(g, c, 1, 0, 0.5, 0.5, 8, 4);
    cerca(r.gananciaB[0] * 4 + r.gananciaB[1], 0, 1e-9 + 8);
  });

  it('mismo costo de oportunidad: no hay ventaja comparativa', () => {
    const v = ventajas(new Productor('A', 8, 20, 10), new Productor('B', 8, 40, 20));
    expect(v.comparativaBien1).toBeNull();
    expect(v.comparativaBien2).toBeNull();
  });
});

describe('bienestar agregado', () => {
  it('Bienestar.total suma EC, EP y otros', () => {
    cerca(new Bienestar(10, 20, -5).total, 25);
  });
  it('bienestarEficiente = bienestar en el equilibrio', () => {
    const e = equilibrio(D, S);
    cerca(bienestarEficiente(D, S).total, bienestar(D, S, e).total);
  });
});
