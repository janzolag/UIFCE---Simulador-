/**
 * Triple auditoría de Micro 2 (Varian; Monsalve, 2017; Sen).
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
import { contrato, excesoDemanda, walras } from './modelos/mercados';
import { fpu, votacion } from './simuladores/bienestar';
import { equilibrioAutarquia, produccionAPrecio } from './simuladores/equilibrio-produccion';
import { bienPublico, externalidad } from './simuladores/externalidades';
import { beneficio } from './simuladores/produccion';
import { CARGADORES_MICRO2 } from './registro';
import { teoria } from './teoria';
import { CASOS, slutskyDotacion, utilidadDe } from './simuladores/slutsky';

const DEC4 = 5e-5;
const SIMS = Object.keys(CARGADORES_MICRO2);
const VARIANTES: Record<string, Params[]> = {
  slutsky: [
    ...['normal', 'inferior', 'giffen'].flatMap((caso) => ['slutsky', 'hicks'].map((metodo) => ({ caso, metodo, ...CASOS[caso] }))),
    { enfoque: 'dotacion' },
  ],
  produccion: [{ enfoque: 'beneficio' }, { enfoque: 'costos', modo: 'largo' }, { enfoque: 'costos', modo: 'corto' }],
  edgeworth: [{ enfoque: 'contrato' }, { enfoque: 'walras' }],
  'equilibrio-produccion': [{ enfoque: 'fpp' }, { enfoque: 'teoremas' }],
  bienestar: [{ enfoque: 'fpu' }, { enfoque: 'arrow' }, { enfoque: 'arrow', v3: 'xyz' }],
  externalidades: [{ enfoque: 'externalidad' }, { enfoque: 'publico' }],
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
  it('Micro 2 va después de Micro 1 con sus 6 simuladores en 3 pilares y su teoría', async () => {
    expect(MATERIAS.map((m) => m.id)).toEqual(['fundamentos', 'micro1', 'micro2', 'micro3', 'macro1', 'macro2']);
    expect(SIMS).toHaveLength(6);
    expect(new Set(MICRO2.simuladores.map((s) => s.pilar)).size).toBe(3);
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
        for (const k of Object.keys(t.ejemplo.parametros)) expect([...ids, d.planteamientos?.param], k).toContain(k);
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
    const fig = d.calcular({ ...d.defecto, enfoque: 'walras' });
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

describe('Pasada 2 · dualidad del productor y Slutsky con dotación', () => {
  it('Hotelling: f = x^0.5, p = 20, w = 5 ⇒ x* = 4, y* = 2, π = 20 y ∂π/∂p = y, ∂π/∂w = −x', () => {
    const r = beneficio(0.5, 20, 5);
    expect(r.x).toBeCloseTo(4, 10);
    expect(r.y).toBeCloseTo(2, 10);
    expect(r.pi).toBeCloseTo(20, 10);
    const h = 1e-5;
    expect((beneficio(0.5, 20 + h, 5).pi - beneficio(0.5, 20 - h, 5).pi) / (2 * h)).toBeCloseTo(r.y, 5);
    expect((beneficio(0.5, 20, 5 + h).pi - beneficio(0.5, 20, 5 - h).pi) / (2 * h)).toBeCloseTo(-r.x, 5);
  });
  it('Slutsky con dotación: los tres efectos suman el total y la recta pasa por ω', () => {
    const r = slutskyDotacion(0.5, 24, 40, 10, 15);
    expect(r.sustitucion + r.ingresoOrdinario + r.ingresoDotacion).toBeCloseTo(r.total, 12);
    expect(r.sustitucion).toBeLessThan(0); // el ocio se encarece
    expect(r.ingresoDotacion).toBeGreaterThan(0); // la dotación vale más
    expect(r.C.C + 15 * r.C.R).toBeCloseTo(15 * 24 + 40, 10);
  });
});

describe('Pasada 2 · equilibrio general con producción', () => {
  const e = { L: 100, K: 100, alfa: 0.7, beta: 0.3 };
  it('en el equilibrio TMS = TMT y los pagos a factores agotan el valor de la producción', () => {
    const q = equilibrioAutarquia(e, 0.5);
    expect(q.tms).toBeCloseTo(q.tmt, 4);
    expect(q.w * 100 + q.r * 100).toBeCloseTo(q.tmt * q.y1 + q.y2, 4);
  });
  it('Rybczynski y Stolper-Samuelson con el bien 1 intensivo en trabajo', () => {
    const a = produccionAPrecio(e, 1);
    const ry = produccionAPrecio({ ...e, L: 120 }, 1);
    expect(ry.y1).toBeGreaterThan(a.y1);
    expect(ry.y2).toBeLessThan(a.y2);
    expect(a.tmt).toBeCloseTo(1, 4);
    const ss = produccionAPrecio(e, 1.3);
    expect(ss.w / 1.3).toBeGreaterThan(a.w / 1); // salario real en bien 1 sube
    expect(ss.w).toBeGreaterThan(a.w); // y en bien 2
    expect(ss.r).toBeLessThan(a.r);
    expect(ss.r / 1.3).toBeLessThan(a.r);
  });
});

describe('Pasada 2 · bienestar y elección social', () => {
  it('FPU: Bentham, Rawls y Nash sobre la frontera y con sus condiciones', () => {
    const r = fpu(2, 1, 100);
    for (const c of [r.bentham, r.rawls, r.nash]) expect((c.uA / 2) ** 2 + c.uB ** 2).toBeCloseTo(100, 10);
    expect(r.rawls.uA).toBeCloseTo(r.rawls.uB, 10);
    expect(r.bentham.xA).toBeCloseTo(80, 10);
    expect(r.nash.xA).toBe(50);
    expect(r.bentham.uA + r.bentham.uB).toBeGreaterThanOrEqual(r.rawls.uA + r.rawls.uB);
  });
  it('Condorcet: el perfil clásico cicla; con dos votantes iguales hay ganador', () => {
    expect(votacion(['xyz', 'yzx', 'zxy']).ciclo).toBe(true);
    const r = votacion(['xyz', 'yzx', 'xyz']);
    expect(r.ciclo).toBe(false);
    expect(r.condorcet).toBe(0);
  });
});

describe('Pasada 2 · externalidades y bienes públicos', () => {
  it('Pigou: Qᵐ = 45, Q* = 36, t* = 18 y el impuesto lleva el mercado al óptimo', () => {
    const r = externalidad({ a: 100, b: 1, c: 10, d: 1, e: 0.5 });
    expect(r.Qm).toBeCloseTo(45, 10);
    expect(r.Qs).toBeCloseTo(36, 10);
    expect(r.t).toBeCloseTo(18, 10);
    expect(100 - 36).toBeCloseTo(10 + 36 + r.t, 10); // p = CMg privado + t en Q*
    expect(r.danoEvitado).toBeGreaterThan(r.beneficioPerdido); // Coase: hay acuerdo posible
  });
  it('Samuelson: Σ TMS = CMg en G* = 30; provisión privada 20', () => {
    const r = bienPublico({ a1: 60, b1: 1, a2: 40, b2: 1, cg: 40 });
    expect(r.G).toBeCloseTo(30, 8);
    expect(r.sumaTMS).toBeCloseTo(40, 6);
    expect(r.Gprivado).toBe(20);
  });
});
