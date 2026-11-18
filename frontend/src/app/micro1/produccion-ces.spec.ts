/**
 * CES corregida (Monsalve 2017, semanas 5 y 6): F = A·[a·x^ρ + b·y^ρ]^(ν/ρ); con A = a = b = ν = 1 es
 * F = [x^ρ + y^ρ]^(1/ρ), de rendimientos constantes. Se verifican fórmulas cerradas contra cálculo numérico.
 */
import { describe, expect, it } from 'vitest';
import { CES } from './modelos/produccion';
import { costoLp, demandasCondicionadas } from './modelos/costos';
import { SIM, crearTecnologia, minCosto } from './simuladores/produccion';
import { Bloque } from '../core/tipos';

const plano = (bs: Bloque[]): string => JSON.stringify(bs);

describe('CES de Monsalve', () => {
  it('con ρ = ½ y a = b = 1 es (√x + √y)²: rendimientos constantes y σ = 2', () => {
    const t = new CES(1, 0.5, 1, 1, 1);
    expect(t.F(4, 4)).toBeCloseTo(16, 10);
    expect(t.F(1, 9)).toBeCloseTo(16, 10);
    expect(t.F(8, 8) / t.F(4, 4)).toBeCloseTo(2, 10);
    expect(t.rendimientos(1.3, 2.1).tipo).toBe('constantes');
    expect(t.elasticidadSustitucion()).toBe(2);
    // TMST = (a/b)(y/x)^(1−ρ)
    expect(t.tmst(1, 4)).toBeCloseTo(2, 10);
  });

  it('el producto marginal coincide con la derivada numérica', () => {
    const t = new CES(1.7, -0.8, 0.6, 1.3, 0.9);
    const h = 1e-6;
    const [px, py] = t.pmg(2.3, 3.1);
    expect(px).toBeCloseTo((t.F(2.3 + h, 3.1) - t.F(2.3 - h, 3.1)) / (2 * h), 5);
    expect(py).toBeCloseTo((t.F(2.3, 3.1 + h) - t.F(2.3, 3.1 - h)) / (2 * h), 5);
  });

  it('la isocuanta devuelve puntos con F = q₀', () => {
    for (const rho of [-2, -0.5, 0.3, 0.8]) {
      const t = new CES(1.2, rho, 0.7, 1.1, 1.4);
      const q0 = t.F(3, 3);
      for (const x of [2, 3, 5]) {
        const y = t.isocuanta(q0, x);
        if (Number.isFinite(y)) expect(t.F(x, y), `ρ=${rho} x=${x}`).toBeCloseTo(q0, 8);
      }
    }
  });

  it('costo de (√K + √L)²: C = q·w₁w₂/(w₁+w₂) (semana 6, ejercicio 4)', () => {
    const t = new CES(1, 0.5, 1, 1, 1);
    expect(costoLp(t, 2, 3, 10)).toBeCloseTo((10 * 2 * 3) / 5, 9);
    const d = demandasCondicionadas(t, 2, 3, 10);
    expect(t.F(d.x, d.y)).toBeCloseTo(10, 9);
  });

  it('las demandas condicionadas cerradas coinciden con la minimización numérica', () => {
    for (const [rho, a, b, nu] of [[0.5, 1, 1, 1], [-1, 0.5, 0.25, 0.8], [0.7, 1.2, 0.4, 1.3], [-2.5, 1, 1, 0.6]]) {
      const t = new CES(1.4, rho, a, b, nu);
      const cerrada = t.demandasCondicionadas(2, 3, 4);
      const numerica = minCosto(t, 2, 3, 4);
      expect(cerrada.C, `ρ=${rho}`).toBeCloseTo(numerica.C, 4);
      expect(t.F(cerrada.x, cerrada.y)).toBeCloseTo(4, 8);
    }
  });

  it('máximo de beneficio: sólo con ν < 1 y en p = CMg', () => {
    expect(new CES(1, 0.5, 1, 1, 1).maxBeneficio(3, 2, 3).existe).toBe(false);
    const t = new CES(1, 0.5, 1, 1, 0.8);
    const r = t.maxBeneficio(3, 2, 3);
    expect(r.existe).toBe(true);
    if (!r.existe) return;
    const C = (z: number) => costoLp(t, 2, 3, z);
    const h = 1e-5;
    expect((C(r.z + h) - C(r.z - h)) / (2 * h)).toBeCloseTo(3, 4);
    // ningún z cercano da más beneficio
    for (const z of [r.z * 0.9, r.z * 1.1]) expect(3 * z - C(z)).toBeLessThan(r.beneficio);
    expect(t.F(r.x, r.y)).toBeCloseTo(r.z, 8);
  });

  it('ρ ≥ 1 o ρ = 0 no es una CES válida; en ρ = 0 el simulador usa el límite Cobb-Douglas', () => {
    expect(() => new CES(1, 1)).toThrow();
    expect(() => new CES(1, 0)).toThrow();
    const t = crearTecnologia('ces', 1, 1, 1, 0, 1);
    expect(t.nombre).toBe('Cobb-Douglas');
    expect(t.gradoHomogeneidad).toBeCloseTo(1, 12);
    expect(t.tmst(1, 4)).toBeCloseTo(4, 10);
  });
});

describe('simulador de producción con CES', () => {
  it('al elegir CES se cargan a = b = ν = 1 y al salir vuelven α y β por defecto', () => {
    const base = { ...SIM.defecto };
    const ces = SIM.alCambiar!(base, { ...base, tec: 'ces' })!;
    expect([ces['alpha'], ces['beta'], ces['nu']]).toEqual([1, 1, 1]);
    const cd = SIM.alCambiar!(ces, { ...ces, tec: 'cd' })!;
    expect([cd['alpha'], cd['beta']]).toEqual([0.5, 0.25]);
    expect(SIM.alCambiar!(base, { ...base, A: 2 })).toBeNull();
  });

  it('con la forma de Monsalve reporta F(4,4) = 16, rendimientos constantes y σ = 2', () => {
    const r = SIM.calcular({ ...SIM.defecto, tec: 'ces', alpha: 1, beta: 1, nu: 1, rho: 0.5 });
    const t = plano(r.panel);
    expect(t).toContain('"Producción F(x0, y0)",16');
    expect(t).toContain('"Rendimientos a escala","constantes"');
    expect(t).toContain('"Elasticidad de sustitución σ",2');
  });

  it('con ν < 1 aparece el óptimo de beneficio de la CES', () => {
    const r = SIM.calcular({ ...SIM.defecto, tec: 'ces', alpha: 1, beta: 1, nu: 0.8, rho: 0.5 });
    expect(r.fig.data.some((d) => d.name === 'Óptimo de beneficio')).toBe(true);
    expect(plano(r.panel)).toContain('Beneficio Π*');
  });

  it('ρ y ν sólo se muestran con la CES', () => {
    const g = SIM.grupos.find((x) => x.controles.some((c) => c.id === 'nu'))!;
    expect(g.controles.map((c) => c.id)).toEqual(['rho', 'nu']);
    expect(g.visibleSi!({ ...SIM.defecto, tec: 'ces' })).toBe(true);
    expect(g.visibleSi!({ ...SIM.defecto })).toBe(false);
  });
});
