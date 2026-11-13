/**
 * Pruebas matemáticas de Macro 2: cada ejercicio de los modales «Teoría» se verifica a mano contra
 * la solución analítica, y se comprueban las propiedades económicas de cada modelo.
 */
import { describe, expect, it } from 'vitest';
import { ajuste, cortoPlazo, largoPlazo } from './modelos/daoa';
import { ParamsDDAA, curvaAA, curvaDD, equilibrioDDAA } from './modelos/ddaa';
import { equilibrioISLM2, isY, lmR } from './modelos/islm';
import { desempleoParaMeta, inflacion, razonSacrificio } from './modelos/phillips';
import { estadoEstacionario, produccion } from './modelos/solow';
import { SIM as SIM_DAOA, escenarios as escDAOA } from './simuladores/da-oa';
import { SIM as SIM_ISLM, escenarios as escISLM } from './simuladores/is-lm';
import { SIM as SIM_MF } from './simuladores/mundell-fleming';
import { SIM as SIM_PH } from './simuladores/phillips';
import { SIM as SIM_SOLOW } from './simuladores/solow';
import { teoria } from './teoria';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (s: { defecto: any }) => ({ ...s.defecto });

describe('IS–LM (Macro 2)', () => {
  const [base] = escISLM(d(SIM_ISLM));

  it('ejercicio del modal: G = 200 y M/P = 500 ⇒ Y* = 1200 y r* = 4 %', () => {
    const r = equilibrioISLM2(base);
    expect(r.Y).toBeCloseTo(1200, 9);
    expect(r.r).toBeCloseTo(4, 9);
    expect(r.I).toBeCloseTo(100, 9);
    expect(r.trampa).toBe(false);
  });

  it('ejercicio del modal: G = 300 ⇒ Y* = 1333.33, r* = 6.67 % e inversión expulsada de 66.67', () => {
    const r = equilibrioISLM2({ ...base, G: 300 });
    expect(r.Y).toBeCloseTo(4000 / 3, 9);
    expect(r.r).toBeCloseTo(20 / 3, 9);
    expect(100 - r.I).toBeCloseTo(200 / 3, 9);
    // multiplicador con LM = 1/(1 − c + b·k/h) = 1/0.75
    expect(r.multFiscal).toBeCloseTo(4 / 3, 12);
    expect(r.multKeynes).toBeCloseTo(4, 12);
  });

  it('el equilibrio está sobre ambas curvas', () => {
    const r = equilibrioISLM2(base);
    expect(isY(base, r.r)).toBeCloseTo(r.Y, 9);
    expect(lmR(base, r.Y)).toBeCloseTo(r.r, 9);
  });

  it('trampa de liquidez: con M/P = 1000 la tasa es 0 y más dinero no mueve Y', () => {
    const r1 = equilibrioISLM2({ ...base, m: 1000 });
    const r2 = equilibrioISLM2({ ...base, m: 1200 });
    expect(r1.trampa).toBe(true);
    expect(r1.r).toBe(0);
    expect(r1.Y).toBeCloseTo(1600, 9); // IS en r = 0: 400/0.25
    expect(r2.Y).toBeCloseTo(r1.Y, 9);
    expect(r1.multMonetario).toBe(0);
    // en la trampa, la política fiscal recupera el multiplicador keynesiano completo
    expect(equilibrioISLM2({ ...base, m: 1000, G: 300 }).Y - r1.Y).toBeCloseTo(400, 9);
  });

  it('el texto del modal cita los números correctos', () => {
    const t = teoria('is-lm', {})!;
    expect(t.ejemplo.resultado).toContain('Y* = 1,200 y r* = 4 %');
    expect(t.ejemplo.resultado).toContain('1,333.33');
    expect(t.ejemplo.resultado).toContain('6.67 %');
    expect(t.ejemplo.resultado).toContain('expulsión de 66.67');
  });
});

describe('DD–AA / Mundell–Fleming (Krugman y Obstfeld)', () => {
  const base = { ...d(SIM_MF), regimen: 'flotante', movilidad: 'perfecta' } as unknown as ParamsDDAA;

  it('calibración: Y* = 1000, E* = 1 y R = R* = 4 %', () => {
    const r = equilibrioDDAA(base);
    expect(r.Y).toBeCloseTo(1000, 8);
    expect(r.E).toBeCloseTo(1, 10);
    expect(r.R).toBeCloseTo(4, 8);
    expect(r.CA).toBeCloseTo(-50, 8);
  });

  it('el equilibrio flotante está sobre DD y sobre AA', () => {
    const r = equilibrioDDAA({ ...base, G: 270 });
    expect(curvaDD({ ...base, G: 270 }, r.E)).toBeCloseTo(r.Y, 8);
    expect(curvaAA({ ...base, G: 270 }, r.Y)).toBeCloseTo(r.E, 10);
  });

  it('ejercicio del modal (fijo): ΔG = 70 ⇒ Y = 1200 y M/P endógena = 560', () => {
    const r0 = equilibrioDDAA({ ...base, regimen: 'fijo' });
    const r1 = equilibrioDDAA({ ...base, regimen: 'fijo', G: 270 });
    expect(r0.Y).toBeCloseTo(1000, 10);
    expect(r0.Mp).toBeCloseTo(460, 10);
    expect(r1.Y).toBeCloseTo(1200, 10);
    expect(r1.E).toBe(1);
    expect(r1.R).toBe(4);
    expect(r1.Mp).toBeCloseTo(560, 10);
  });

  it('flotante: la expansión fiscal temporal aprecia la moneda y sube Y menos que con tipo fijo', () => {
    const r0 = equilibrioDDAA(base);
    const r1 = equilibrioDDAA({ ...base, G: 270 });
    const fijo = equilibrioDDAA({ ...base, regimen: 'fijo', G: 270 });
    expect(r1.E).toBeLessThan(r0.E);
    expect(r1.Y).toBeGreaterThan(r0.Y);
    expect(r1.Y).toBeLessThan(fijo.Y);
    expect(r1.CA).toBeLessThan(r0.CA);
  });

  it('flotante: la expansión monetaria deprecia y sube Y; con tipo fijo M no cambia nada', () => {
    const r0 = equilibrioDDAA(base);
    const r1 = equilibrioDDAA({ ...base, Mp: 560 });
    expect(r1.E).toBeGreaterThan(r0.E);
    expect(r1.Y).toBeGreaterThan(r0.Y);
    const f0 = equilibrioDDAA({ ...base, regimen: 'fijo' });
    const f1 = equilibrioDDAA({ ...base, regimen: 'fijo', Mp: 560 });
    expect(f1).toEqual(f0);
  });

  it('devaluación con tipo fijo: E₀ = 1.1 ⇒ Y = 360/0.35', () => {
    expect(equilibrioDDAA({ ...base, regimen: 'fijo', E0: 1.1 }).Y).toBeCloseTo(360 / 0.35, 10);
  });

  it('movilidad imperfecta con μ grande converge a la paridad exacta', () => {
    const p = equilibrioDDAA({ ...base, G: 270 });
    const im = equilibrioDDAA({ ...base, G: 270, movilidad: 'imperfecta', mu: 1e7 });
    expect(im.Y).toBeCloseTo(p.Y, 3);
    expect(im.E).toBeCloseTo(p.E, 5);
  });

  it('el texto del modal (fijo) cita los números correctos', () => {
    const t = teoria('mundell-fleming', { regimen: 'fijo' })!;
    expect(t.ejemplo.resultado).toContain('Y pasa de 1,000 a 1,200');
    expect(t.ejemplo.resultado).toContain('M/P de 460 a 560');
  });
});

describe('DA–OA (Macro 2)', () => {
  const [b, n] = escDAOA({ ...d(SIM_DAOA), dD0: 200, theta: 1 });

  it('equilibrio inicial (1000, 100) = largo plazo', () => {
    expect(cortoPlazo(b)).toEqual({ Y: 1000, P: 100 });
    expect(largoPlazo(b)).toEqual({ Y: 1000, P: 100 });
  });

  it('ejercicio del modal: ΔD₀ = 200 ⇒ corto plazo (1100, 110) y largo plazo (1000, 120)', () => {
    const e1 = cortoPlazo(n);
    expect(e1.Y).toBeCloseTo(1100, 10);
    expect(e1.P).toBeCloseTo(110, 10);
    const e2 = largoPlazo(n);
    expect(e2.Y).toBe(1000);
    expect(e2.P).toBeCloseTo(120, 10);
  });

  it('la autocorrección converge al largo plazo', () => {
    const c = ajuste(n, 1);
    const ult = c[c.length - 1];
    expect(ult.Y).toBeCloseTo(1000, 0);
    expect(ult.P).toBeCloseTo(120, 1);
    expect(c[0]).toEqual(cortoPlazo(n));
  });

  it('choque de oferta ΔW = 20 ⇒ estanflación (900, 110)', () => {
    const e = cortoPlazo({ ...b, W: 120 });
    expect(e.Y).toBeCloseTo(900, 10);
    expect(e.P).toBeCloseTo(110, 10);
  });

  it('el texto del modal cita los números correctos', () => {
    const t = teoria('da-oa', {})!;
    expect(t.ejemplo.resultado).toContain('E₁ = (1,100, 110)');
    expect(t.ejemplo.resultado).toContain('E₂ = (1,000, 120)');
  });
});

describe('curva de Phillips', () => {
  const p = { pie: 6, beta: 0.5, ustar: 5, v: 0 };
  it('ejercicio del modal: u = 7 ⇒ π = 5; meta 2 % ⇒ u = 13; sacrificio 2', () => {
    expect(inflacion(p, 7)).toBe(5);
    expect(desempleoParaMeta(p, 2)).toBe(13);
    expect(razonSacrificio(p)).toBe(2);
    expect(inflacion(p, desempleoParaMeta(p, 2))).toBeCloseTo(2, 12);
  });
  it('en la NAIRU la inflación es la esperada más el choque', () => {
    expect(inflacion({ ...p, v: 1.5 }, 5)).toBe(7.5);
  });
  it('los valores por defecto del simulador son los del ejercicio', () => {
    expect(SIM_PH.defecto).toMatchObject({ pie: 6, beta: 0.5, ustar: 5, v: 0, uobj: 7, piobj: 2 });
    const t = teoria('phillips', {})!;
    expect(t.ejemplo.resultado).toContain('la inflación es 5 %');
    expect(t.ejemplo.resultado).toContain('u = 13 %');
  });
});

describe('Solow', () => {
  const p = { A: 1, alpha: 0.5, s: 0.3, delta: 0.08, n: 0.05, g: 0.02 };
  it('ejercicio del modal: k* = 4, y* = 2, c* = 1.4', () => {
    const r = estadoEstacionario(p);
    expect(r.k).toBeCloseTo(4, 12);
    expect(r.y).toBeCloseTo(2, 12);
    expect(r.c).toBeCloseTo(1.4, 12);
  });
  it('ejercicio del modal: s = 0.45 ⇒ k* = 9, y* = 3, c* = 1.65', () => {
    const r = estadoEstacionario({ ...p, s: 0.45 });
    expect(r.k).toBeCloseTo(9, 12);
    expect(r.y).toBeCloseTo(3, 12);
    expect(r.c).toBeCloseTo(1.65, 12);
  });
  it('en k* la inversión iguala la reposición; la regla de oro maximiza c', () => {
    const r = estadoEstacionario(p);
    expect(p.s * produccion(p, r.k)).toBeCloseTo((p.delta + p.n + p.g) * r.k, 12);
    expect(r.sOro).toBe(0.5);
    expect(r.kOro).toBeCloseTo(100 / 9, 10);
    expect(r.cOro).toBeCloseTo(5 / 3, 10);
    for (const s of [0.3, 0.45, 0.6, 0.8])
      expect(estadoEstacionario({ ...p, s }).c).toBeLessThanOrEqual(r.cOro + 1e-12);
    expect(estadoEstacionario({ ...p, s: 0.5 }).c).toBeCloseTo(r.cOro, 12);
  });
  it('los valores por defecto del simulador son los del ejercicio', () => {
    expect(SIM_SOLOW.defecto).toMatchObject(p);
    const t = teoria('solow', {})!;
    expect(t.ejemplo.resultado).toContain('k* = 4, y* = 2 y c* = 1.4');
    expect(t.ejemplo.resultado).toContain('k* = 9, y* = 3 y c* = 1.65');
  });
});
