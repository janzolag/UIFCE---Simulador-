/** Costos: el nivel de producción q se puede fijar directamente (slider + casilla numérica). */
import { describe, expect, it } from 'vitest';
import { SIM } from './simuladores/costos';
import { CostoCubico, curvasLp } from './modelos/costos';
import { CobbDouglasP } from './modelos/produccion';

const plano = (x: unknown) => JSON.stringify(x);

describe('costos con q elegido', () => {
  it('q es un control del simulador y está en el estado por defecto', () => {
    const c = SIM.grupos.flatMap((g) => g.controles).find((x) => x.id === 'q');
    expect(c?.tipo).toBe('slider');
    expect(SIM.defecto['q']).toBe(4);
    expect(SIM.grupos.find((g) => g.controles.includes(c!))!.visibleSi).toBeUndefined();
  });

  it('corto plazo: la tabla trae CT, CV, CMg, CMe y CVMe en q, y la gráfica marca q', () => {
    const r = SIM.calcular({ ...SIM.defecto, modo: 'corto', q: 6.5 });
    const k = new CostoCubico(20, 10, 2, 0.5);
    const t = plano(r.panel);
    expect(t).toContain('Costos en q = 6.5');
    expect(t).toContain(`"Costo total CT(q)",${k.CT(6.5)}`);
    expect(t).toContain(`"Costo marginal CMg(q)",${k.CMg(6.5)}`);
    const m = r.fig.data.find((d) => d.name === 'En q = 6.5');
    expect(m.y).toEqual([k.CMg(6.5), k.CMe(6.5), k.CVMe(6.5)]);
    expect(r.fig.layout.shapes.some((s: { x0: number }) => s.x0 === 6.5)).toBe(true);
  });

  it('un q grande amplía los ejes para que el punto se vea', () => {
    const r = SIM.calcular({ ...SIM.defecto, modo: 'corto', q: 25 });
    const k = new CostoCubico(20, 10, 2, 0.5);
    const xs = r.fig.data[0].x as number[];
    expect(xs[xs.length - 1]).toBeGreaterThan(25);
    expect(r.fig.layout.yaxis.range[1]).toBeGreaterThan(k.CMg(25));
  });

  it('largo plazo: el costo se reporta en z = q', () => {
    const r = SIM.calcular({ ...SIM.defecto, modo: 'largo', q: 7 });
    const c = curvasLp(new CobbDouglasP(1, 0.3, 0.4), 2, 3, 7);
    expect(plano(r.panel)).toContain(`"Costo de producir z = 7",${c.CT}`);
    expect(r.fig.data.find((d) => d.name === 'En z = 7').y[0]).toBeCloseTo(c.CMe, 10);
  });

  it('sin q (o q inválido) el simulador se comporta como antes', () => {
    const sinQ = { ...SIM.defecto };
    delete sinQ['q'];
    for (const p of [sinQ, { ...SIM.defecto, q: 0 }, { ...SIM.defecto, q: 'x' }]) {
      const r = SIM.calcular(p);
      expect(r.fig.data.some((d) => String(d.name).startsWith('En q'))).toBe(false);
      expect(plano(r.panel)).not.toContain('Costos en q');
    }
  });
});
