/**
 * Casos límite de Fundamentos: parámetros en cero, negativos, vacíos (null/undefined/NaN/∞), divisiones
 * por cero y elasticidades nulas o infinitas. Regla: el motor responde con un ErrorParametro claro o con
 * el resultado económico del caso extremo; el simulador nunca lanza una excepción ni dibuja NaN.
 */
import { describe, expect, it } from 'vitest';
import { ErrorParametro } from '../core/errores';
import { Params } from '../core/tipos';
import { precioMaximo, precioMinimo } from './modelos/controles';
import {
  clasificar,
  elasticidadDemanda,
  elasticidadIngreso,
  elasticidadOferta,
  puntoMedio,
} from './modelos/elasticidad';
import { comercio } from './modelos/comercio';
import {
  cantidadEscalonada,
  excedenteCompradores,
  excedenteConsumidor,
  excedenteProductor,
  excedenteVendedores,
} from './modelos/excedentes';
import { externalidad } from './modelos/externalidades';
import { FPP } from './modelos/fpp';
import {
  aplicarImpuesto,
  curvaLaffer,
  impuestoProhibitivo,
  pendienteCantidad,
} from './modelos/impuestos';
import { Demanda, Oferta, equilibrio, resolver } from './modelos/mercado';
import { Productor, comerciar } from './modelos/ventaja';
import { CARGADORES_FUNDAMENTOS } from './registro';

const D = new Demanda(100, 2);
const S = new Oferta(10, 3);

const rechaza = (fn: () => unknown, patron?: RegExp) => {
  expect(fn).toThrow(ErrorParametro);
  if (patron) expect(fn).toThrow(patron);
};

describe('curvas: parámetros inválidos', () => {
  it('nulos, NaN, infinitos y texto se rechazan con un mensaje claro', () => {
    // (`undefined` no entra: en TypeScript un argumento omitido toma su valor por defecto)
    for (const malo of [null, Number.NaN, Infinity, -Infinity, '5']) {
      rechaza(() => new Demanda(malo as number, 1), /número/);
      rechaza(() => new Demanda(10, malo as number), /número/);
      rechaza(() => new Oferta(malo as number, 1), /número/);
      rechaza(() => new Oferta(0, malo as number), /número/);
    }
  });

  it('pendientes e interceptos negativos de la demanda, y pendiente negativa de la oferta, se rechazan', () => {
    rechaza(() => new Demanda(-1, 1), /negativo/);
    rechaza(() => new Demanda(10, -1), /negativo/);
    rechaza(() => new Oferta(0, -1), /negativo/);
  });

  it('el intercepto de la oferta puede ser negativo, salvo que la oferta sea vertical', () => {
    expect(new Oferta(-20, 2).precioMinimo).toBe(10);
    rechaza(() => new Oferta(-20, 0), /vertical/);
  });

  it('precio de curva horizontal negativo se rechaza; en cero es válido', () => {
    rechaza(() => Demanda.perfectamenteElastica(-1));
    rechaza(() => Oferta.perfectamenteElastica(-1));
    expect(Demanda.perfectamenteElastica(0).precioMaximo).toBe(0);
  });

  it('una curva horizontal no tiene cantidad determinada por el precio', () => {
    rechaza(() => Demanda.perfectamenteElastica(5).qLineal(1), /elástica/);
    rechaza(() => Oferta.perfectamenteElastica(5).qLineal(1), /elástica/);
  });

  it('desplazamientos no finitos se rechazan; una demanda desplazada más allá de cero se trunca en cero', () => {
    rechaza(() => D.desplazar(Number.NaN));
    rechaza(() => S.subir(Infinity));
    expect(D.desplazar(-1000).a).toBe(0);
  });
});

describe('equilibrio: casos degenerados', () => {
  it('oferta y demanda perfectamente elásticas a la vez: cantidad no determinada', () =>
    rechaza(
      () => equilibrio(Demanda.perfectamenteElastica(5), Oferta.perfectamenteElastica(5)),
      /no está determinada/,
    ));

  it('oferta y demanda perfectamente inelásticas a la vez: precio no determinado', () =>
    rechaza(() => equilibrio(new Demanda(10, 0), new Oferta(5, 0)), /no está determinado/));

  it('pendientes casi nulas (1e-12) no producen NaN ni infinitos', () => {
    const e = equilibrio(new Demanda(100, 1e-12), new Oferta(10, 1e-12 + 1));
    expect(Number.isFinite(e.p) && Number.isFinite(e.q)).toBe(true);
  });

  it('pendientes enormes (1e9): el equilibrio sigue siendo finito', () => {
    const e = equilibrio(new Demanda(100, 1e9), new Oferta(0, 1e9));
    expect(Number.isFinite(e.p) && Number.isFinite(e.q)).toBe(true);
  });

  it('a precio cero se ofrece más de lo demandado: aviso de precio negativo, no un precio negativo', () =>
    rechaza(() => equilibrio(new Demanda(10, 1), new Oferta(50, 1)), /negativo/));

  it('cuña negativa tan grande que el comprador pagaría un precio negativo', () =>
    rechaza(() => resolver(D, S, -500), /negativo/));

  it('mercado sin intercambio devuelve q = 0 y no un error', () => {
    const r = equilibrio(new Demanda(0, 1), new Oferta(0, 1));
    expect(r.intercambio).toBe(false);
    expect(r.q).toBe(0);
  });

  it('resolver() no acepta curvas dibujadas con piso (solo para graficar)', () =>
    rechaza(() => resolver(D, S.subir(5)), /piso|resolver/));
});

describe('elasticidad: divisiones por cero y casos extremos', () => {
  it('punto medio con P₁ = P₂ o con Q₁ = Q₂ = 0 no está definida', () => {
    rechaza(() => puntoMedio(10, 5, 8, 5), /no está definida/);
    rechaza(() => puntoMedio(0, 5, 0, 6), /no está definida/);
  });

  it('el cambio porcentual con promedio cero y las elasticidades con ingresos iguales se rechazan', () => {
    rechaza(() => elasticidadIngreso(10, 100, 12, 100), /iguales/);
  });

  it('con Q = 0 la elasticidad es infinita; con P = 0 es cero', () => {
    expect(elasticidadDemanda(new Demanda(10, 1), 10)).toBe(Infinity);
    expect(elasticidadDemanda(new Demanda(10, 1), 0)).toBe(0);
    expect(elasticidadOferta(new Oferta(0, 1), 0)).toBe(Infinity);
  });

  it('clasificar rechaza valores negativos o nulos', () => {
    rechaza(() => clasificar(-1));
    rechaza(() => clasificar(null));
  });

  it('precio negativo en cualquier función de elasticidad se rechaza', () =>
    rechaza(() => elasticidadDemanda(D, -1)));
});

describe('excedentes: listas y precios inválidos', () => {
  it('lista vacía, valores negativos o lado desconocido se rechazan', () => {
    rechaza(() => excedenteCompradores([], 5), /vacía/);
    rechaza(() => excedenteVendedores([['a', -1]], 5), /negativo/);
    rechaza(() => cantidadEscalonada([['a', 1]], 5, 'otro'), /lado/);
  });

  it('cantidad cero: excedentes cero; curvas horizontales: áreas rectangulares', () => {
    expect(excedenteConsumidor(D, 0, 10)).toBe(0);
    expect(excedenteProductor(S, 0, 10)).toBe(0);
    expect(excedenteConsumidor(Demanda.perfectamenteElastica(20), 5, 12)).toBe(40);
    expect(excedenteProductor(Oferta.perfectamenteElastica(8), 5, 12)).toBe(20);
  });
});

describe('controles, impuestos, comercio y externalidades: límites', () => {
  it('controles: sin mercado, precio negativo o no numérico', () => {
    rechaza(() => precioMaximo(new Demanda(0, 1), new Oferta(0, 1), 5), /Sin intercambio/);
    rechaza(() => precioMinimo(D, S, -1));
    rechaza(() => precioMaximo(D, S, Number.NaN));
  });

  it('controles: precio máximo en cero transa cero si los vendedores no ofrecen a ese precio', () => {
    const r = precioMaximo(D, new Oferta(-10, 3), 0);
    expect(r.q).toBe(0);
    expect(Number.isFinite(r.ppm)).toBe(true);
    expect(r.faltante).toBeGreaterThan(0);
  });

  it('impuestos: valores inválidos, destino desconocido y n < 2 en la curva de Laffer', () => {
    rechaza(() => aplicarImpuesto(D, S, Number.NaN));
    rechaza(() => aplicarImpuesto(D, S, 5, 'otro'), /vendedores/);
    rechaza(() => curvaLaffer(D, S, 10, 1), /2 puntos/);
    rechaza(() => curvaLaffer(D, S, -1));
  });

  it('impuestos: subsidio gigante da error claro; impuesto gigante elimina el mercado', () => {
    rechaza(() => aplicarImpuesto(D, S, -1e6), /negativo/);
    const r = aplicarImpuesto(D, S, 1e6);
    expect(r.q).toBe(0);
    expect(r.recaudo).toBe(0);
    expect(r.cargaCompradores).toBeNull();
  });

  it('impuestos: t = 0 no tiene incidencia definida (0/0) y se informa como no disponible', () => {
    const r = aplicarImpuesto(D, S, 0);
    expect(r.cargaCompradores).toBeNull();
    expect(r.ppm).toBe(0);
  });

  it('impuestos: elasticidades extremas dan 100 % de carga a un lado', () => {
    const demandaVertical = aplicarImpuesto(new Demanda(100, 0), S, 5);
    expect(demandaVertical.cargaCompradores!).toBeCloseTo(1, 9);
    const ofertaVertical = aplicarImpuesto(D, new Oferta(20, 0), 5);
    expect(ofertaVertical.cargaCompradores!).toBeCloseTo(0, 9);
    const demandaHorizontal = aplicarImpuesto(Demanda.perfectamenteElastica(30), S, 5);
    expect(demandaHorizontal.cargaCompradores!).toBeCloseTo(0, 9);
  });

  it('impuestos: curvas verticales a la vez o horizontales a la vez no determinan la pendiente', () => {
    rechaza(() => pendienteCantidad(new Demanda(10, 0), new Oferta(5, 0)), /verticales/);
    rechaza(
      () => pendienteCantidad(Demanda.perfectamenteElastica(5), Oferta.perfectamenteElastica(5)),
      /horizontales/,
    );
    expect(impuestoProhibitivo(new Demanda(100, 0), S)).toBe(Infinity); // demanda vertical: ningún impuesto reduce la cantidad
  });

  it('comercio: curvas horizontales, arancel y cuota juntos, precio mundial negativo', () => {
    rechaza(() => comercio(Demanda.perfectamenteElastica(5), S, 3), /pendiente finita/);
    rechaza(() => comercio(D, S, 12, 3, 10), /no ambos/);
    rechaza(() => comercio(D, S, -1));
    rechaza(() => comercio(D, S, 12, -1));
  });

  it('comercio: precio mundial en cero y cuota en cero', () => {
    const r = comercio(D, S, 0);
    expect(r.rol).toBe('importador');
    expect(Number.isFinite(r.ppm) && Number.isFinite(r.importaciones)).toBe(true);
    const c = comercio(D, S, 12, 0, 0);
    expect(c.prohibitivo).toBe(true);
    expect(c.importaciones).toBeCloseTo(0, 9);
  });

  it('externalidades: tipo desconocido, e negativa e intervención no numérica', () => {
    rechaza(() => externalidad(D, S, 'rara', 5), /negativa|positiva/);
    rechaza(() => externalidad(D, S, 'negativa', -1));
    rechaza(() => externalidad(D, S, 'negativa', 5, Number.NaN));
  });
});

describe('FPP y ventaja comparativa: límites', () => {
  it('FPP: ejes cero o negativos, curvatura fuera de [1, 10] y valores no numéricos', () => {
    rechaza(() => new FPP(0, 100, 2), /mayor que cero/);
    rechaza(() => new FPP(100, -5, 2));
    rechaza(() => new FPP(100, 100, 0.5), /entre 1/);
    rechaza(() => new FPP(100, 100, 11), /entre 1/);
    rechaza(() => new FPP(100, 100, Number.NaN));
    expect(new FPP(100, 100, 1).k).toBe(1);
    expect(new FPP(100, 100, 10).k).toBe(10);
  });

  it('FPP: en los extremos el costo de oportunidad es 0 (x = 0) o infinito (x = X) y se rechaza producir de más', () => {
    const f = new FPP(100, 200, 3);
    expect(f.costoOportunidad(0)).toBe(0);
    expect(f.costoOportunidad(100)).toBe(Infinity);
    expect(f.yDeX(100)).toBe(0);
    expect(f.yDeX(0)).toBe(200);
    rechaza(() => f.yDeX(101), /supera/);
    rechaza(() => f.yDeX(-1));
  });

  it('FPP: factores de crecimiento cero o negativos se rechazan', () => {
    rechaza(() => new FPP(100, 100, 2).desplazar(0));
    rechaza(() => new FPP(100, 100, 2).desplazar(1, -1, 1));
  });

  it('ventaja: horas o minutos en cero, fracción fuera de [0, 1] y precio negativo', () => {
    rechaza(() => new Productor('A', 0, 10, 10), /mayor que cero/);
    rechaza(() => new Productor('A', 8, 0, 10), /mayor que cero/);
    const a = new Productor('A', 8, 20, 10);
    const b = new Productor('B', 8, 60, 15);
    rechaza(() => a.producir(1.5), /entre 0 y 1/);
    rechaza(() => a.producir(-0.1), /entre 0 y 1/);
    rechaza(() => comerciar(a, b, 0.5, 0.5, 0.5, 0.5, 1, -1));
  });

  it('ventaja: un intercambio que deja consumo negativo se rechaza', () => {
    const a = new Productor('A', 8, 20, 10);
    const b = new Productor('B', 8, 60, 15);
    rechaza(() => comerciar(a, b, 0.75, 0, 0.5, 0.5, 50, 3), /consumo negativo/);
  });
});

describe('simuladores ante entradas inválidas', () => {
  const malos: [string, unknown][] = [
    ['null', null],
    ['undefined', undefined],
    ['NaN', Number.NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
    ['negativo grande', -1e6],
    ['positivo grande', 1e6],
    ['cero', 0],
    ['casi cero', 1e-9],
  ];

  for (const sim of Object.keys(CARGADORES_FUNDAMENTOS)) {
    it(`${sim}: cualquier parámetro vacío o absurdo produce un aviso o una gráfica válida, nunca una excepción ni NaN`, async () => {
      const d = await CARGADORES_FUNDAMENTOS[sim]();
      const ids = d.grupos
        .flatMap((g) => g.controles)
        .filter((c) => c.tipo === 'slider')
        .map((c) => c.id);
      for (const id of ids)
        for (const [nombre, v] of malos) {
          const r = d.calcular({ ...d.defecto, [id]: v } as Params);
          const donde = `${id} = ${nombre}`;
          expect(JSON.stringify(r.fig.data), donde).not.toMatch(/NaN|Infinity/);
          for (const t of r.fig.data)
            for (const k of ['x', 'y'])
              if (Array.isArray(t[k]))
                expect(
                  t[k].every((x: unknown) => x === null || Number.isFinite(x as number)),
                  donde,
                ).toBe(true);
          expect(r.panel.length, donde).toBeGreaterThan(0);
          if (v === null || v === undefined)
            expect(JSON.stringify(r.panel), donde).toContain('Falta un valor');
        }
    });

    it(`${sim}: todos los parámetros numéricos en cero no lanzan excepción`, async () => {
      const d = await CARGADORES_FUNDAMENTOS[sim]();
      const ceros = Object.fromEntries(
        Object.entries(d.defecto).map(([k, v]) => [k, typeof v === 'number' ? 0 : v]),
      );
      expect(() => d.calcular(ceros)).not.toThrow();
    });

    it(`${sim}: un selector con un valor desconocido no rompe la página`, async () => {
      const d = await CARGADORES_FUNDAMENTOS[sim]();
      for (const c of d.grupos.flatMap((g) => g.controles).filter((x) => x.tipo === 'selector')) {
        expect(() => d.calcular({ ...d.defecto, [c.id]: 'otro' }), c.id).not.toThrow();
      }
    });
  }

  it('rejilla de valores extremos (0, 1e-9, 1, 1e6) en las curvas de los simuladores de mercado: nunca excepción ni valores no finitos', async () => {
    const extremos = [0, 1e-9, 1, 1e6];
    for (const sim of [
      'oferta-demanda',
      'excedentes',
      'controles-precios',
      'impuestos',
      'externalidades',
      'comercio-internacional',
    ]) {
      const d = await CARGADORES_FUNDAMENTOS[sim]();
      for (const a of extremos)
        for (const b of extremos)
          for (const c of [-50, 0, 1, 50])
            for (const dd of extremos) {
              const r = d.calcular({ ...d.defecto, a, b, c, d: dd });
              expect(JSON.stringify(r.fig.data), `${sim} a=${a} b=${b} c=${c} d=${dd}`).not.toMatch(
                /NaN|Infinity/,
              );
              expect(r.panel.length).toBeGreaterThan(0);
            }
    }
  });
});
