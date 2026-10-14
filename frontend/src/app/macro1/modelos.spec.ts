/**
 * Pruebas matemáticas y teóricas de Macro 1: cada equilibrio cumple sus ecuaciones, los multiplicadores
 * cerrados coinciden con la derivada numérica y se reproducen los resultados de libro (Blanchard, 2017).
 */
import { describe, expect, it } from 'vitest';
import { derivada } from '../core/errores';
import {
  demandaAgregada,
  equilibrioCortoPlazo,
  ofertaAgregada,
  precioMedianoPlazo,
  trayectoria,
} from './modelos/daoa';
import { ParamsISLM, curvaIS, equilibrioISLM } from './modelos/islm';
import { ParamsKeynes, demandaKeynes, equilibrioKeynes } from './modelos/keynesiano';
import { ParamsMF, equilibrioMF, paridad } from './modelos/mundell';

const cerca = (a: number, b: number, tol = 1e-8) =>
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(a), Math.abs(b)));

const KEY: ParamsKeynes = { c0: 100, c1: 0.6, t: 0.25, T0: 0, I: 150, G: 200 };
const BIENES = { c0: 100, c1: 0.6, T: 100, b0: 100, b1: 0.1, b2: 10, G: 200 };
const TASA: ParamsISLM = { ...BIENES, modo: 'tasa', ibar: 5, M: 400, P: 1, k: 0.5, h: 20 };
const OFERTA: ParamsISLM = { ...TASA, modo: 'oferta' };
const DAOA = { ...BIENES, M: 400, k: 0.5, h: 20, Yn: 1000, lam: 1 };
const MF: ParamsMF = {
  ...BIENES,
  regimen: 'flexible',
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

describe('Keynesiano: Y = Z', () => {
  it('valores de la calibración por defecto (multiplicador 1/0.55)', () => {
    const r = equilibrioKeynes(KEY);
    cerca(r.multiplicador, 1 / 0.55);
    cerca(r.A, 450);
    cerca(r.Y, 450 / 0.55);
  });

  it('el equilibrio cumple Y = Z(Y) y C = c₀ + c₁(Y − T)', () => {
    for (const p of [KEY, { ...KEY, t: 0, T0: 80 }, { ...KEY, c1: 0.9, t: 0.4, T0: -50 }]) {
      const r = equilibrioKeynes(p);
      cerca(r.Y, demandaKeynes(p, r.Y));
      cerca(r.C, p.c0 + p.c1 * (r.Y - r.T));
    }
  });

  it('multiplicadores = derivadas numéricas de Y*', () => {
    const Y = (cambios: Partial<ParamsKeynes>) => equilibrioKeynes({ ...KEY, ...cambios }).Y;
    const r = equilibrioKeynes(KEY);
    cerca(
      derivada((g) => Y({ G: g }), KEY.G),
      r.multiplicador,
      1e-6,
    );
    cerca(
      derivada((t0) => Y({ T0: t0 }), 10),
      r.multImpuesto,
      1e-6,
    );
    cerca(
      derivada((c0) => Y({ c0 }), KEY.c0),
      r.multiplicador,
      1e-6,
    );
  });

  it('multiplicador del presupuesto equilibrado = 1 cuando t = 0 (Haavelmo)', () => {
    const p = { ...KEY, t: 0, c1: 0.8 };
    const r0 = equilibrioKeynes(p);
    const r1 = equilibrioKeynes({ ...p, G: p.G + 100, T0: p.T0 + 100 });
    cerca(r1.Y - r0.Y, 100);
    cerca(r0.multEquilibrado, 1);
  });

  it('identidad ahorro = inversión: S privado + (T − G) = Ī', () => {
    for (const p of [KEY, { ...KEY, t: 0.4, T0: 50 }]) {
      const r = equilibrioKeynes(p);
      cerca(r.ahorroPrivado + r.ahorroPublico, p.I);
    }
  });

  it('paradoja del ahorro: menos c₀ baja Y pero el ahorro nacional no cambia', () => {
    const r0 = equilibrioKeynes(KEY);
    const r1 = equilibrioKeynes({ ...KEY, c0: KEY.c0 - 50 });
    expect(r1.Y).toBeLessThan(r0.Y);
    cerca(r1.ahorroPrivado + r1.ahorroPublico, r0.ahorroPrivado + r0.ahorroPublico);
  });

  it('el impuesto proporcional reduce el multiplicador (estabilizador automático)', () => {
    expect(equilibrioKeynes({ ...KEY, t: 0.3 }).multiplicador).toBeLessThan(
      equilibrioKeynes({ ...KEY, t: 0 }).multiplicador,
    );
  });
});

describe('IS–LM', () => {
  it('banco central fija ī: Y = (A − b₂ī)/(1 − c₁ − b₁)', () => {
    const r = equilibrioISLM(TASA);
    cerca(r.A, 340);
    cerca(r.Y, (340 - 50) / 0.3);
    cerca(r.i, 5);
    cerca(r.multFiscal, 1 / 0.3);
  });

  it('oferta fija: el equilibrio cumple la IS y la LM a la vez', () => {
    for (const p of [OFERTA, { ...OFERTA, h: 5 }, { ...OFERTA, b2: 25, k: 0.8, M: 700 }]) {
      const r = equilibrioISLM(p);
      cerca(r.Y, curvaIS(r.A, r.s, p.b2, r.i));
      cerca(p.M / p.P, p.k * r.Y - p.h * r.i);
      cerca(r.Y, r.C + r.I + p.G);
    }
  });

  it('multiplicadores fiscal y monetario = derivadas numéricas', () => {
    const r = equilibrioISLM(OFERTA);
    cerca(
      derivada((g) => equilibrioISLM({ ...OFERTA, G: g }).Y, OFERTA.G),
      r.multFiscal,
      1e-6,
    );
    cerca(
      derivada((m) => equilibrioISLM({ ...OFERTA, M: m }).Y, OFERTA.M),
      r.multMonetario,
      1e-6,
    );
    cerca(
      derivada((ib) => equilibrioISLM({ ...TASA, ibar: ib }).Y, TASA.ibar),
      equilibrioISLM(TASA).multMonetario,
      1e-6,
    );
  });

  it('efecto expulsión: con M fija la expansión fiscal sube i y el multiplicador es menor que el keynesiano', () => {
    const r0 = equilibrioISLM(OFERTA);
    const r1 = equilibrioISLM({ ...OFERTA, G: OFERTA.G + 50 });
    expect(r1.i).toBeGreaterThan(r0.i);
    expect(r1.I).toBeLessThan(r0.I + OFERTA.b1 * (r1.Y - r0.Y));
    expect(r0.multFiscal).toBeLessThan(r0.multKeynes);
  });

  it('con ī fija la política fiscal no mueve la tasa (sin efecto expulsión)', () => {
    const r1 = equilibrioISLM({ ...TASA, G: TASA.G + 50 });
    cerca(r1.i, 5);
    cerca(r1.Y - equilibrioISLM(TASA).Y, 50 / 0.3);
  });

  it('LM vertical (h = 0): la política fiscal solo sube i, el dinero fija Y', () => {
    const p = { ...OFERTA, h: 0 };
    const r0 = equilibrioISLM(p);
    const r1 = equilibrioISLM({ ...p, G: p.G + 50 });
    cerca(r0.Y, 400 / 0.5);
    cerca(r1.Y, r0.Y);
    expect(r1.i).toBeGreaterThan(r0.i);
    expect(r0.multFiscal).toBe(0);
  });

  it('LM casi horizontal (h → ∞): el multiplicador fiscal tiende al keynesiano', () => {
    const r = equilibrioISLM({ ...OFERTA, h: 1e9 });
    cerca(r.multFiscal, r.multKeynes, 1e-6);
  });

  it('IS vertical (b₂ = 0): la política monetaria no mueve el producto', () => {
    const p = { ...OFERTA, b2: 0 };
    cerca(equilibrioISLM({ ...p, M: 900 }).Y, equilibrioISLM(p).Y);
  });

  it('trampa de liquidez: con mucho dinero i = 0 y más M ya no sube Y', () => {
    const p = { ...OFERTA, M: 5000 };
    const r = equilibrioISLM(p);
    expect(r.trampa).toBe(true);
    expect(r.i).toBe(0);
    cerca(r.Y, r.A / r.s);
    cerca(equilibrioISLM({ ...p, M: 9000 }).Y, r.Y);
    expect(r.multMonetario).toBe(0);
    cerca(r.multFiscal, r.multKeynes);
  });
});

describe('DA–OA', () => {
  it('precio de mediano plazo: DA(P) = Ȳₙ (valor cerrado 200/210)', () => {
    const P = precioMedianoPlazo(DAOA);
    cerca(P, 200 / 210, 1e-10);
    cerca(demandaAgregada(DAOA, P), DAOA.Yn, 1e-10);
  });

  it('la DA tiene pendiente negativa y la OA positiva', () => {
    expect(demandaAgregada(DAOA, 1.2)).toBeLessThan(demandaAgregada(DAOA, 0.9));
    expect(ofertaAgregada(DAOA, 1, 1100)).toBeGreaterThan(ofertaAgregada(DAOA, 1, 900));
    cerca(ofertaAgregada(DAOA, 1, DAOA.Yn), 1);
  });

  it('el equilibrio de corto plazo está sobre la DA y sobre la OA', () => {
    const e = equilibrioCortoPlazo({ ...DAOA, M: 500 }, 0.95);
    cerca(e.Y, demandaAgregada({ ...DAOA, M: 500 }, e.P), 1e-9);
    cerca(e.P, ofertaAgregada(DAOA, 0.95, e.Y), 1e-9);
  });

  it('neutralidad del dinero: en el mediano plazo P sube en la proporción de M y Y, i vuelven', () => {
    const tr = trayectoria(DAOA, { ...DAOA, M: 500 });
    cerca(tr.final.P / tr.inicial.P, 1.25, 1e-9);
    cerca(tr.final.Y, tr.inicial.Y);
    cerca(tr.final.i, tr.inicial.i, 1e-8);
    expect(tr.impacto.Y).toBeGreaterThan(DAOA.Yn);
    expect(tr.impacto.P).toBeGreaterThan(tr.inicial.P);
    expect(tr.impacto.P).toBeLessThan(tr.final.P);
  });

  it('las expectativas adaptativas llevan la economía a Ȳₙ de forma monótona', () => {
    const tr = trayectoria(DAOA, { ...DAOA, M: 500 }, 80);
    const brechas = tr.camino.map((e) => e.Y - DAOA.Yn);
    for (let t = 1; t < brechas.length; t++)
      expect(brechas[t]).toBeLessThanOrEqual(brechas[t - 1] + 1e-9);
    expect(Math.abs(brechas[brechas.length - 1])).toBeLessThan(1);
    expect(tr.periodos95).not.toBeNull();
  });

  it('expansión fiscal: en el mediano plazo Y = Ȳₙ pero la tasa es más alta (expulsión total)', () => {
    const tr = trayectoria(DAOA, { ...DAOA, G: DAOA.G + 50 });
    cerca(tr.final.Y, DAOA.Yn);
    expect(tr.final.i).toBeGreaterThan(tr.inicial.i);
  });

  it('choque de oferta adverso: al impacto cae Y y sube P (estanflación)', () => {
    const tr = trayectoria(DAOA, { ...DAOA, Yn: 950 });
    expect(tr.impacto.Y).toBeLessThan(DAOA.Yn);
    expect(tr.impacto.P).toBeGreaterThan(tr.inicial.P);
    cerca(tr.final.Y, 950);
  });

  it('λ más alto acelera el ajuste', () => {
    const lento = trayectoria({ ...DAOA, lam: 0.5 }, { ...DAOA, lam: 0.5, M: 500 });
    const rapido = trayectoria({ ...DAOA, lam: 3 }, { ...DAOA, lam: 3, M: 500 });
    expect(rapido.periodos95!).toBeLessThan(lento.periodos95!);
  });
});

describe('Mundell–Fleming', () => {
  it('calibración: Y = 1,000, i = i* = 5 %, e = 1 en ambos regímenes', () => {
    for (const regimen of ['flexible', 'fijo'] as const) {
      const r = equilibrioMF({ ...MF, regimen });
      cerca(r.Y, 1000, 1e-9);
      cerca(r.i, 5, 1e-9);
      cerca(r.e, 1, 1e-9);
      cerca(r.M, 400, 1e-9);
    }
  });

  it('el equilibrio flexible cumple IS, LM y paridad de intereses', () => {
    const p = { ...MF, G: 260, M: 450, istar: 6 };
    const r = equilibrioMF(p);
    cerca(r.Y, r.C + r.I + p.G + r.XN, 1e-9);
    cerca(p.M, p.k * r.Y - p.h * r.i, 1e-9);
    cerca((1 + r.i / 100) * r.e, (1 + p.istar / 100) * p.ee, 1e-9);
  });

  it('paridad: una tasa interna mayor aprecia la moneda (e baja)', () => {
    expect(paridad(1, 5, 7)).toBeLessThan(paridad(1, 5, 5));
    cerca(paridad(1.2, 5, 5), 1.2);
  });

  it('flexible: la expansión fiscal sube i, aprecia e y reduce XN', () => {
    const r0 = equilibrioMF(MF);
    const r1 = equilibrioMF({ ...MF, G: MF.G + 50 });
    expect(r1.Y).toBeGreaterThan(r0.Y);
    expect(r1.i).toBeGreaterThan(r0.i);
    expect(r1.e).toBeLessThan(r0.e);
    expect(r1.XN).toBeLessThan(r0.XN);
  });

  it('flexible: la expansión monetaria baja i, deprecia e y sube Y', () => {
    const r0 = equilibrioMF(MF);
    const r1 = equilibrioMF({ ...MF, M: 450 });
    expect(r1.i).toBeLessThan(r0.i);
    expect(r1.e).toBeGreaterThan(r0.e);
    expect(r1.Y).toBeGreaterThan(r0.Y);
  });

  it('la política fiscal es más potente con cambio fijo que con flexible', () => {
    const dFlex = equilibrioMF({ ...MF, G: 250 }).Y - equilibrioMF(MF).Y;
    const fijo = { ...MF, regimen: 'fijo' as const };
    const dFijo = equilibrioMF({ ...fijo, G: 250 }).Y - equilibrioMF(fijo).Y;
    expect(dFijo).toBeGreaterThan(dFlex);
    cerca(dFijo, 50 / 0.4);
  });

  it('cambio fijo: i = i*, la M exógena no importa y M endógena acomoda la expansión fiscal', () => {
    const fijo = { ...MF, regimen: 'fijo' as const };
    cerca(equilibrioMF({ ...fijo, M: 900 }).Y, equilibrioMF(fijo).Y);
    const r1 = equilibrioMF({ ...fijo, G: 250 });
    cerca(r1.i, fijo.istar);
    expect(r1.M).toBeGreaterThan(400);
  });

  it('cambio fijo: una devaluación sube XN y el producto', () => {
    const fijo = { ...MF, regimen: 'fijo' as const };
    const r0 = equilibrioMF(fijo);
    const r1 = equilibrioMF({ ...fijo, ebar: 1.1 });
    expect(r1.XN).toBeGreaterThan(r0.XN);
    cerca(r1.Y - r0.Y, (50 * 0.1) / 0.4);
  });

  it('subida de i*: deprecia con flexible y contrae con fijo', () => {
    const flex0 = equilibrioMF(MF);
    const flex1 = equilibrioMF({ ...MF, istar: 7 });
    expect(flex1.e).toBeGreaterThan(flex0.e);
    const fijo = { ...MF, regimen: 'fijo' as const };
    expect(equilibrioMF({ ...fijo, istar: 7 }).Y).toBeLessThan(equilibrioMF(fijo).Y);
  });
});
