/**
 * Triple auditoría de Micro 2 (Varian).
 *  Pasada 1 · notación y ejes (x₁, x₂, p₁, m; y, p, IMg, CMg; f₁(y₂); caja con orígenes Oᴬ y Oᴮ) y contrato de la interfaz.
 *  Pasada 2 · equilibrio: soluciones analíticas = cruces graficados a 4 decimales.
 *  Pasada 3 · bordes: barrido de deslizadores y casos degenerados sin NaN ni divisiones por cero.
 */
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { MICRO2, MATERIAS } from '../core/catalogo';
import { CARGADORES, TEORIAS } from '../core/registro';
import { Control, Params, SimuladorDef, Simulacion } from '../core/tipos';
import { ControlPanel } from '../shared/control-panel';
import { TeoriaModal } from '../shared/teoria-modal';
import { descomposicion } from '../micro1/modelos/slutsky';
import {
  colusion,
  competencia,
  contrato,
  cournotNash,
  excesoDemanda,
  isobeneficio1,
  monopolio,
  reaccion1,
  reaccion2,
  stackelbergLider,
  tercerGrado,
  walras,
} from './modelos/mercados';
import { CARGADORES_MICRO2 } from './registro';
import { teoria } from './teoria';
import { CASOS, utilidadDe } from './simuladores/slutsky';

const DEC4 = 5e-5;
const SIMS = Object.keys(CARGADORES_MICRO2);
const VARIANTES: Record<string, Params[]> = {
  slutsky: ['normal', 'inferior', 'giffen'].flatMap((caso) =>
    ['slutsky', 'hicks'].map((metodo) => ({ caso, metodo, ...CASOS[caso] })),
  ),
  monopolio: [{ modo: 'simple' }, { modo: 'primer' }, { modo: 'tercer' }],
  oligopolio: [{ isobeneficios: 'si' }, { isobeneficios: 'no' }],
  edgeworth: [{}],
};
const controles = (d: SimuladorDef): Control[] => d.grupos.flatMap((g) => g.controles);
const esError = (r: Simulacion) => JSON.stringify(r.panel).includes('"nivel":"error"');
const json = (r: Simulacion) => JSON.stringify(r);
const limpias = (r: Simulacion) =>
  r.fig.data.every((t) =>
    ['x', 'y'].every((k) => !Array.isArray(t[k]) || t[k].every((v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v)))),
  );
const traza = (r: Simulacion, nombre: string) => r.fig.data.find((t) => t.name === nombre);

function cruces(a: any, b: any): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < a.x.length; i++)
    for (let j = 0; j + 1 < b.x.length; j++) {
      const v = [a.x[i], a.y[i], a.x[i + 1], a.y[i + 1], b.x[j], b.y[j], b.x[j + 1], b.y[j + 1]];
      if (v.some((z) => z === null)) continue;
      const [x1, y1, x2, y2, x3, y3, x4, y4] = v as number[];
      const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(den) < 1e-15) continue;
      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
      const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
      if (t >= -1e-12 && t <= 1 + 1e-12 && u >= -1e-12 && u <= 1 + 1e-12) out.push([x1 + t * (x2 - x1), y1 + t * (y2 - y1)]);
    }
  return out;
}
function cruzaEn(a: any, b: any, x: number, y: number): void {
  expect(a, 'traza A').toBeTruthy();
  expect(b, 'traza B').toBeTruthy();
  const cs = cruces(a, b);
  expect(cs.length, `sin cruce ${a.name} / ${b.name}`).toBeGreaterThan(0);
  const m = cs.reduce((p, c) => (Math.hypot(c[0] - x, c[1] - y) < Math.hypot(p[0] - x, p[1] - y) ? c : p));
  expect(Math.abs(m[0] - x)).toBeLessThan(DEC4);
  expect(Math.abs(m[1] - y)).toBeLessThan(DEC4);
}

/* ================================================================ catálogo e interfaz */
describe('catálogo de Micro 2', () => {
  it('Micro 2 va después de Micro 1 con sus 4 simuladores listos y su teoría', async () => {
    expect(MATERIAS.map((m) => m.id)).toEqual(['fundamentos', 'micro1', 'micro2', 'macro1', 'macro2']);
    expect(MICRO2.simuladores.map((s) => s.id)).toEqual(SIMS);
    expect(MICRO2.simuladores.every((s) => s.listo)).toBe(true);
    expect(CARGADORES['micro2']).toBe(CARGADORES_MICRO2);
    const fn = await TEORIAS['micro2']();
    expect(fn('edgeworth', {})?.titulo).toContain('Edgeworth');
    expect(fn('nada', {})).toBeNull();
  });
});

for (const sim of SIMS)
  describe(`Micro 2 · ${sim}`, () => {
    it('Pasada 1: controles válidos, gráfica por defecto limpia, ejes con título y teoría concisa', async () => {
      const d = await CARGADORES_MICRO2[sim]();
      const ids = controles(d).map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const c of controles(d)) {
        if (c.tipo === 'slider') {
          expect(c.min!).toBeLessThan(c.max!);
          expect(d.defecto[c.id] as number).toBeGreaterThanOrEqual(c.min!);
          expect(d.defecto[c.id] as number).toBeLessThanOrEqual(c.max!);
        } else expect(c.opciones!.map((o) => o.valor)).toContain(d.defecto[c.id]);
      }
      for (const v of VARIANTES[sim]) {
        const p = { ...d.defecto, ...v };
        const r = d.calcular(p);
        expect(esError(r), JSON.stringify(v)).toBe(false);
        expect(limpias(r)).toBe(true);
        expect(json(r)).not.toMatch(/NaN|undefined|Infinity|\[object/);
        expect(r.fig.data.some((t) => t.mode?.includes('markers'))).toBe(true);
        expect(r.fig.layout.xaxis.title.text.length).toBeGreaterThan(0);
        expect(r.fig.layout.yaxis.title.text.length).toBeGreaterThan(0);
        expect(r.fig.layout.xaxis.range).toHaveLength(2);
        const t = teoria(sim, p)!;
        expect(t.conceptos.length).toBeGreaterThanOrEqual(2);
        expect(t.conceptos.length).toBeLessThanOrEqual(3);
        expect(t.formulas.length).toBeLessThanOrEqual(2);
        expect(t.autor).toContain('Varian');
        expect(t.fuente).not.toMatch(/p\.\s*\d|pág/); // sin números de página inventados
        const texto = [t.titulo, ...t.conceptos, t.ejemplo.enunciado, t.ejemplo.resultado, t.ejemplo.prueba].join(' ');
        expect(texto).not.toMatch(/NaN|undefined|Infinity/);
        for (const k of Object.keys(t.ejemplo.parametros)) expect(ids, k).toContain(k);
        expect(esError(d.calcular({ ...d.defecto, ...t.ejemplo.parametros }))).toBe(false);
      }
    });

    it('Pasada 3: cada deslizador en mínimo, centro, máximo y valores absurdos nunca rompe la página', async () => {
      const d = await CARGADORES_MICRO2[sim]();
      for (const v of VARIANTES[sim])
        for (const c of controles(d).filter((x) => x.tipo === 'slider'))
          for (const x of [c.min!, (c.min! + c.max!) / 2, c.max!, NaN, -1e9, 1e9]) {
            const r = d.calcular({ ...d.defecto, ...v, [c.id]: x });
            expect(limpias(r), `${c.id} = ${x}`).toBe(true);
            if (esError(r)) expect(r.fig.data.length).toBe(0);
            else expect(json(r), `${JSON.stringify(v)} ${c.id} = ${x}`).not.toMatch(/NaN|undefined|Infinity/);
          }
    });

    it('componentes: el panel y el modal de teoría se renderizan', async () => {
      const d = await CARGADORES_MICRO2[sim]();
      TestBed.configureTestingModule({ imports: [ControlPanel, TeoriaModal] });
      HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      };
      const fx = TestBed.createComponent(ControlPanel);
      fx.componentRef.setInput('grupos', d.grupos);
      fx.componentRef.setInput('params', { ...d.defecto });
      fx.detectChanges();
      expect(fx.nativeElement.innerHTML.length).toBeGreaterThan(100);
      const modal = TestBed.createComponent(TeoriaModal);
      modal.componentRef.setInput('teoria', teoria(sim, { ...d.defecto }));
      modal.componentRef.setInput('abierto', true);
      modal.detectChanges();
      expect(modal.nativeElement.textContent).toContain('Resuélvelo en la gráfica');
      TestBed.resetTestingModule();
    });
  });

/* ================================================================ Pasada 2 */
describe('Pasada 2 · Slutsky (Varian)', () => {
  it('A es tangencia en la recta inicial; B está en la recta pivotada; ES + EI = total', () => {
    for (const caso of ['normal', 'inferior', 'giffen']) {
      const c = CASOS[caso];
      const u = utilidadDe(caso, 0.5);
      const d = descomposicion(u, c.p1, c.p2, c.m, c.p1n, 'slutsky');
      expect(c.p1 * d.A.x + c.p2 * d.A.y).toBeCloseTo(c.m, 8);
      expect(u.tms(d.A.x, d.A.y)!).toBeCloseTo(c.p1 / c.p2, 4);
      expect(c.p1n * d.A.x + c.p2 * d.A.y).toBeCloseTo(d.M_compensado, 8); // pivote alrededor de A
      expect(c.p1n * d.B.x + c.p2 * d.B.y).toBeCloseTo(d.M_compensado, 8);
      expect(c.p1n * d.C.x + c.p2 * d.C.y).toBeCloseTo(c.m, 8);
      expect(d.efecto_sustitucion[0] + d.efecto_ingreso[0]).toBeCloseTo(d.efecto_total[0], 10);
      expect(d.efecto_sustitucion[0]).toBeLessThan(0); // el efecto sustitución siempre es opuesto al precio
      expect(d.clasificacion_x).toBe(caso);
    }
  });
  it('ejercicio: Cobb-Douglas ½, p₁ 2 → 3, m = 40 ⇒ A = 10, B = 8.3333, C = 6.6667', async () => {
    const d = descomposicion(utilidadDe('normal', 0.5), 2, 1, 40, 3, 'slutsky');
    expect(d.A.x).toBeCloseTo(10, 4);
    expect(d.B.x).toBeCloseTo(8.3333, 4);
    expect(d.C.x).toBeCloseTo(6.6667, 4);
    expect(d.compensacion).toBeCloseTo(10, 10); // Δm = x₁·Δp₁
    const sim = await CARGADORES_MICRO2['slutsky']();
    const r = sim.calcular({ ...sim.defecto });
    const pts = r.fig.data.filter((t) => t.mode?.includes('markers') && (t.xaxis ?? 'x') === 'x');
    expect(pts.find((t) => t.name.startsWith('A'))!.x[0]).toBeCloseTo(10, 4);
    expect(pts.find((t) => t.name.startsWith('B'))!.x[0]).toBeCloseTo(8.3333, 4);
    // La recta pivotada graficada pasa por A.
    const piv = traza(r, 'Recta pivotada (Slutsky) (corto plazo)')!;
    const m = (piv.y[0] as number) * 1; // intersección vertical = m′/p₂
    expect(m).toBeCloseTo(50, 8);
  });
  it('al elegir un caso los deslizadores saltan a su región válida', async () => {
    const d = await CARGADORES_MICRO2['slutsky']();
    const nuevo = { ...d.defecto, caso: 'giffen' };
    expect(d.alCambiar!(d.defecto, nuevo)).toEqual(CASOS['giffen']);
  });
});

describe('Pasada 2 · monopolio y discriminación', () => {
  it('IMg ∩ CMg y D ∩ CMg graficados coinciden con la solución analítica (y* = 18, p* = 64, y_c = 30)', async () => {
    const d = await CARGADORES_MICRO2['monopolio']();
    const r = d.calcular({ ...d.defecto });
    const s = monopolio({ a: 100, b: 2, c: 10, d: 1, F: 50 });
    expect(s.y).toBeCloseTo(18, 10);
    expect(s.p).toBeCloseTo(64, 10);
    expect(s.yc).toBeCloseTo(30, 10);
    expect(s.PIE).toBeCloseTo(216, 8);
    cruzaEn(traza(r, 'Ingreso marginal IMg'), traza(r, 'Costo marginal CMg'), s.y, s.cmg);
    cruzaEn(traza(r, 'Demanda p(y)'), traza(r, 'Costo marginal CMg'), s.yc, s.pc);
    expect(s.p * (1 - 1 / s.elasticidad)).toBeCloseTo(s.cmg, 10); // regla de Varian
    expect(s.lerner).toBeCloseTo(1 / s.elasticidad, 10);
    expect(s.elasticidad).toBeGreaterThan(1);
  });
  it('primer grado: sin pérdida irrecuperable; tercer grado: IMgᵢ = c y discriminar no reduce el beneficio', async () => {
    const d = await CARGADORES_MICRO2['monopolio']();
    const r = d.calcular({ ...d.defecto, modo: 'primer' });
    expect(r.fig.data.some((t) => String(t.name).startsWith('Pérdida irrecuperable'))).toBe(false);
    const t = tercerGrado({ a1: 100, b1: 2, a2: 60, b2: 1, c: 10, F: 50 });
    expect(100 - 4 * t.m1.y).toBeCloseTo(10, 10);
    expect(60 - 2 * t.m2.y).toBeCloseTo(10, 10);
    expect(t.m1.p * (1 - 1 / t.m1.elasticidad)).toBeCloseTo(10, 10);
    expect(t.m2.p * (1 - 1 / t.m2.elasticidad)).toBeCloseTo(10, 10);
    expect(t.beneficio).toBeGreaterThanOrEqual(t.beneficioUnico - 1e-9);
    expect(t.m1.elasticidad < t.m2.elasticidad).toBe(t.m1.p > t.m2.p); // menos elástico ⇒ precio más alto
    const r3 = d.calcular({ ...d.defecto, modo: 'tercer' });
    cruzaEn(traza(r3, 'IMg1'), r3.fig.data.find((x) => x.name === 'CMg = c' && (x.xaxis ?? 'x') === 'x'), t.m1.y, 10);
  });
});

describe('Pasada 2 · oligopolio', () => {
  const q = { a: 120, b: 1, c1: 0, c2: 0 };
  it('f₁ ∩ f₂ graficadas = Cournot (40, 40); Stackelberg (60, 30) está sobre f₂ y su isobeneficio es tangente', async () => {
    const d = await CARGADORES_MICRO2['oligopolio']();
    const r = d.calcular({ ...d.defecto });
    const c = cournotNash(q);
    expect([c.y1, c.y2, c.p]).toEqual([40, 40, 40]);
    cruzaEn(traza(r, 'Reacción de la empresa 1, f₁(y₂)'), traza(r, 'Reacción de la empresa 2, f₂(y₁)'), 40, 40);
    const s = stackelbergLider(q);
    expect(s.y1).toBeCloseTo(60, 10);
    expect(s.y2).toBeCloseTo(30, 10);
    expect(reaccion2(q, s.y1)).toBeCloseTo(s.y2, 12);
    const h = 1e-5;
    const pendiente = (isobeneficio1(q, s.pi1, s.y1 + h) - isobeneficio1(q, s.pi1, s.y1 - h)) / (2 * h);
    expect(pendiente).toBeCloseTo(-0.5, 4); // pendiente de f₂
    expect(s.pi1).toBeGreaterThan(c.pi1);
    const k = colusion(q);
    const w = competencia(q);
    expect(k.Y < c.Y && c.Y < s.Y && s.Y < w.Y).toBe(true);
    expect(k.p).toBe(60);
  });
  it('costos asimétricos y esquinas: si c₂ ≥ a la empresa 1 es monopolista', () => {
    const asim = { a: 120, b: 1, c1: 0, c2: 130 };
    const c = cournotNash(asim);
    expect(c.y2).toBe(0);
    expect(c.y1).toBeCloseTo(60, 10);
    const s = stackelbergLider(asim);
    expect(s.y2).toBe(0);
    expect(s.y1).toBeCloseTo(60, 10);
    expect(reaccion1(asim, 0)).toBeCloseTo(60, 10);
    const s2 = stackelbergLider({ a: 120, b: 1, c1: 0, c2: 50 });
    expect(s2.y2).toBeGreaterThanOrEqual(0);
    expect(s2.pi1).toBeGreaterThanOrEqual(cournotNash({ a: 120, b: 1, c1: 0, c2: 50 }).pi1 - 1e-9);
  });
});

describe('Pasada 2 · Edgeworth', () => {
  const q = { a: 0.6, b: 0.3, wA1: 8, wA2: 2, wB1: 2, wB2: 8 };
  it('el equilibrio vacía ambos mercados, está en la curva de contrato y en la recta de precios por ω', async () => {
    const r = walras(q);
    expect(r.p).toBeCloseTo(3.6 / 4.6, 12);
    const [z1, z2] = excesoDemanda(q, r.p);
    expect(Math.abs(z1)).toBeLessThan(1e-12);
    expect(Math.abs(z2)).toBeLessThan(1e-12);
    expect(contrato(q, r.xA1)).toBeCloseTo(r.xA2, 10);
    expect(r.p * r.xA1 + r.xA2).toBeCloseTo(r.p * q.wA1 + q.wA2, 10);
    const tmsA = (0.6 / 0.4) * (r.xA2 / r.xA1);
    const tmsB = (0.3 / 0.7) * (r.xB2 / r.xB1);
    expect(tmsA).toBeCloseTo(r.p, 10);
    expect(tmsB).toBeCloseTo(r.p, 10);
    expect(r.uA).toBeGreaterThanOrEqual(r.uA0);
    expect(r.uB).toBeGreaterThanOrEqual(r.uB0);
    const d = await CARGADORES_MICRO2['edgeworth']();
    const fig = d.calcular({ ...d.defecto });
    const precios = fig.fig.data.find((t) => String(t.name).startsWith('Recta de precios'));
    const contr = fig.fig.data.find((t) => t.name === 'Curva de contrato (TMSᴬ = TMSᴮ)');
    const cs = cruces(precios, contr);
    expect(cs.some((c) => Math.abs(c[0] - r.xA1) < 5e-3 && Math.abs(c[1] - r.xA2) < 5e-3)).toBe(true);
    const eq = fig.fig.data.find((t) => t.name === 'Equilibrio walrasiano x*');
    expect(eq.x[0]).toBeCloseTo(r.xA1, 4);
    expect(eq.y[0]).toBeCloseTo(r.xA2, 4);
  });
  it('ley de Walras para cualquier precio y bordes de la caja', () => {
    for (const p of [0.1, 0.5, 1, 3, 10]) {
      const [z1, z2] = excesoDemanda(q, p);
      expect(p * z1 + z2).toBeCloseTo(0, 10);
    }
    expect(contrato(q, 0)).toBe(0);
    expect(contrato(q, 10)).toBeCloseTo(10, 12);
    // Un consumidor sin dotación: el equilibrio existe y no hay NaN.
    const r = walras({ ...q, wA1: 0, wA2: 0 });
    expect(r.xA1).toBe(0);
    expect(Number.isFinite(r.p)).toBe(true);
  });
});
