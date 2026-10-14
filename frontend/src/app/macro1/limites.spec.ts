/**
 * Casos límite de Macro 1: parámetros en cero, negativos, vacíos (null/undefined/NaN), divisiones por
 * cero y sensibilidades nulas o infinitas. Regla: el modelo responde con un ErrorParametro claro o con
 * el resultado económico del caso extremo; el simulador nunca lanza una excepción ni dibuja NaN.
 */
import { describe, expect, it } from 'vitest';
import { ErrorParametro } from '../core/errores';
import { Params } from '../core/tipos';
import { precioMedianoPlazo, trayectoria } from './modelos/daoa';
import { equilibrioISLM } from './modelos/islm';
import { equilibrioKeynes } from './modelos/keynesiano';
import { equilibrioMF } from './modelos/mundell';
import { CARGADORES_MACRO1 } from './registro';

const KEY = { c0: 100, c1: 0.6, t: 0.25, T0: 0, I: 150, G: 200 };
const BIENES = { c0: 100, c1: 0.6, T: 100, b0: 100, b1: 0.1, b2: 10, G: 200 };
const OFERTA = { ...BIENES, modo: 'oferta' as const, ibar: 5, M: 400, P: 1, k: 0.5, h: 20 };
const DAOA = { ...BIENES, M: 400, k: 0.5, h: 20, Yn: 1000, lam: 1 };
const MF = {
  ...BIENES,
  regimen: 'flexible' as const,
  x0: 60,
  phi: 50,
  q: 0.1,
  k: 0.5,
  h: 20,
  M: 400,
  istar: 5,
  ee: 1,
  ebar: 1,
};

const rechaza = (fn: () => unknown, patron?: RegExp) => {
  expect(fn).toThrow(ErrorParametro);
  if (patron) expect(fn).toThrow(patron);
};

describe('Keynesiano: límites', () => {
  it('c₁ = 1 con t = 0 (división por cero en el multiplicador) se rechaza', () =>
    rechaza(() => equilibrioKeynes({ ...KEY, c1: 1, t: 0 }), /\[0, 1\)/));
  it('c₁ = 0: el multiplicador es exactamente 1', () =>
    expect(equilibrioKeynes({ ...KEY, c1: 0 }).multiplicador).toBe(1));
  it('t = 0 y t → 1⁻: el multiplicador va de 1/(1−c₁) a 1', () => {
    expect(equilibrioKeynes({ ...KEY, t: 0 }).multiplicador).toBeCloseTo(2.5, 12);
    expect(equilibrioKeynes({ ...KEY, t: 0.999999 }).multiplicador).toBeCloseTo(1, 5);
  });
  it('propensiones o gastos negativos se rechazan', () => {
    rechaza(() => equilibrioKeynes({ ...KEY, c1: -0.1 }));
    rechaza(() => equilibrioKeynes({ ...KEY, t: -0.1 }));
    rechaza(() => equilibrioKeynes({ ...KEY, G: -1 }));
    rechaza(() => equilibrioKeynes({ ...KEY, I: -1 }));
    rechaza(() => equilibrioKeynes({ ...KEY, c0: -1 }));
  });
  it('impuesto fijo negativo (transferencias) es válido y sube Y', () => {
    expect(equilibrioKeynes({ ...KEY, T0: -100 }).Y).toBeGreaterThan(equilibrioKeynes(KEY).Y);
  });
  it('gasto autónomo negativo (impuestos fijos enormes) da error claro', () =>
    rechaza(() => equilibrioKeynes({ c0: 0, c1: 0.9, t: 0, T0: 1000, I: 0, G: 0 }), /negativo/));
  it('todo en cero: Y = 0 sin errores', () =>
    expect(equilibrioKeynes({ c0: 0, c1: 0, t: 0, T0: 0, I: 0, G: 0 }).Y).toBe(0));
});

describe('IS–LM: límites', () => {
  it('c₁ + b₁ ≥ 1 se rechaza (multiplicador infinito)', () =>
    rechaza(() => equilibrioISLM({ ...OFERTA, c1: 0.8, b1: 0.2 }), /menor que 1/));
  it('k = 0 o M = 0 se rechazan (división por cero en la LM)', () => {
    rechaza(() => equilibrioISLM({ ...OFERTA, k: 0 }));
    rechaza(() => equilibrioISLM({ ...OFERTA, M: 0 }));
    rechaza(() => equilibrioISLM({ ...OFERTA, P: 0 }));
  });
  it('h negativo se rechaza; h = 0 da LM vertical', () => {
    rechaza(() => equilibrioISLM({ ...OFERTA, h: -1 }));
    expect(equilibrioISLM({ ...OFERTA, h: 0 }).Y).toBeCloseTo(800, 10);
  });
  it('b₂ = 0 y h = 0: IS y LM verticales paralelas → sin equilibrio', () =>
    rechaza(() => equilibrioISLM({ ...OFERTA, b2: 0, h: 0 }), /paralelas/));
  it('tasa de política negativa se rechaza (límite inferior cero); ī = 0 es válida', () => {
    rechaza(() => equilibrioISLM({ ...OFERTA, modo: 'tasa', ibar: -0.5 }), /negativa/);
    expect(equilibrioISLM({ ...OFERTA, modo: 'tasa', ibar: 0 }).i).toBe(0);
  });
  it('tasa tan alta que el producto sería negativo da error claro', () =>
    rechaza(() => equilibrioISLM({ ...OFERTA, modo: 'tasa', ibar: 40, b2: 40 }), /no es positivo/));
  it('sensibilidades extremas (h y b₂ muy grandes) siguen siendo finitas', () => {
    const r = equilibrioISLM({ ...OFERTA, h: 1e12, b2: 1e6 });
    expect(Number.isFinite(r.Y) && Number.isFinite(r.i)).toBe(true);
  });
});

describe('DA–OA: límites', () => {
  it('λ = 0: OA horizontal, el precio no se mueve al impacto', () => {
    const tr = trayectoria({ ...DAOA, lam: 0 }, { ...DAOA, lam: 0, M: 500 });
    expect(tr.impacto.P).toBe(tr.inicial.P);
    expect(tr.periodos95).toBeNull();
  });
  it('λ negativo y Ȳₙ ≤ 0 se rechazan', () => {
    rechaza(() => precioMedianoPlazo({ ...DAOA, lam: -1 }));
    rechaza(() => precioMedianoPlazo({ ...DAOA, Yn: 0 }));
  });
  it('b₂ = 0: DA vertical, no hay ajuste vía precios', () =>
    rechaza(() => precioMedianoPlazo({ ...DAOA, b2: 0 }), /vertical/));
  it('Ȳₙ por encima de lo que la DA puede dar con i = 0: trampa de deflación', () =>
    rechaza(() => precioMedianoPlazo({ ...DAOA, Yn: 5000 }), /deflación/));
  it('h = 0 (teoría cuantitativa): P = M/(k·Ȳₙ)', () =>
    expect(precioMedianoPlazo({ ...DAOA, h: 0 })).toBeCloseTo(400 / 500, 10));
  it('λ muy grande (OA casi vertical): al impacto Y ya casi no se mueve', () => {
    const tr = trayectoria({ ...DAOA, lam: 1e6 }, { ...DAOA, lam: 1e6, M: 500 });
    expect(Math.abs(tr.impacto.Y - DAOA.Yn)).toBeLessThan(0.01);
  });
});

describe('Mundell–Fleming: límites', () => {
  it('h = 0 se rechaza (la paridad no se puede despejar)', () =>
    rechaza(() => equilibrioMF({ ...MF, h: 0 })));
  it('φ = 0: el tipo de cambio no afecta la demanda; la IS no depende de e', () => {
    const r = equilibrioMF({ ...MF, phi: 0 });
    expect(Number.isFinite(r.Y)).toBe(true);
  });
  it('q = 1, φ < 0 o i* < 0 se rechazan', () => {
    rechaza(() => equilibrioMF({ ...MF, q: 1 }));
    rechaza(() => equilibrioMF({ ...MF, phi: -1 }));
    rechaza(() => equilibrioMF({ ...MF, istar: -1 }));
  });
  it('tipo de cambio esperado o fijado en cero se rechaza', () => {
    rechaza(() => equilibrioMF({ ...MF, ee: 0 }));
    rechaza(() => equilibrioMF({ ...MF, regimen: 'fijo', ebar: 0 }));
  });
  it('cambio fijo con dinero endógeno negativo da error claro', () =>
    rechaza(() => equilibrioMF({ ...MF, regimen: 'fijo', istar: 15, h: 100, k: 0.1 }), /negativa/));
  it('movilidad de capitales extrema y φ muy grande siguen siendo finitos', () => {
    const r = equilibrioMF({ ...MF, phi: 1e6 });
    expect(Number.isFinite(r.Y) && Number.isFinite(r.e)).toBe(true);
  });
});

describe('simuladores de Macro 1 ante entradas inválidas', () => {
  const malos: [string, unknown][] = [
    ['null', null],
    ['undefined', undefined],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['negativo', -1e6],
  ];
  for (const sim of Object.keys(CARGADORES_MACRO1)) {
    it(`${sim}: cualquier parámetro vacío o absurdo produce un aviso, nunca una excepción ni NaN`, async () => {
      const d = await CARGADORES_MACRO1[sim]();
      const ids = d.grupos
        .flatMap((g) => g.controles)
        .filter((c) => c.tipo === 'slider')
        .map((c) => c.id);
      for (const id of ids) {
        for (const [nombre, v] of malos) {
          const r = d.calcular({ ...d.defecto, [id]: v } as Params);
          const s = JSON.stringify(r.fig.data);
          expect(s, `${id} = ${nombre}`).not.toMatch(/NaN|Infinity/);
          for (const t of r.fig.data)
            for (const k of ['x', 'y'])
              if (Array.isArray(t[k]))
                expect(
                  t[k].every((x: unknown) => x === null || Number.isFinite(x as number)),
                  `${id} = ${nombre}`,
                ).toBe(true);
          expect(r.panel.length, `${id} = ${nombre}`).toBeGreaterThan(0);
        }
      }
    });

    it(`${sim}: todos los parámetros en cero no lanzan excepción`, async () => {
      const d = await CARGADORES_MACRO1[sim]();
      const ceros = Object.fromEntries(
        Object.entries(d.defecto).map(([k, v]) => [k, typeof v === 'number' ? 0 : v]),
      );
      expect(() => d.calcular(ceros)).not.toThrow();
    });

    it(`${sim}: un selector con un valor desconocido usa el modo por defecto`, async () => {
      const d = await CARGADORES_MACRO1[sim]();
      const sel = d.grupos.flatMap((g) => g.controles).find((c) => c.tipo === 'selector');
      if (!sel) return;
      const r = d.calcular({ ...d.defecto, [sel.id]: 'otro' });
      expect(JSON.stringify(r.panel)).not.toContain('"nivel":"error"');
    });
  }
});
