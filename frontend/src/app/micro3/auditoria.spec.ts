/**
 * Triple auditoría de Micro 3 (Lozano y Salamanca, 2024; Monsalve, 2025): misma pauta que Micro 2.
 *  Pasada 1 · controles, ejes, teoría concisa y ejercicio cargable.
 *  Pasada 2 · equilibrios: soluciones analíticas = cruces graficados.
 *  Pasada 3 · bordes: barrido de deslizadores sin NaN ni divisiones por cero.
 */
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { MICRO3 } from '../core/catalogo';
import { CARGADORES, TEORIAS } from '../core/registro';
import { Control, Params, SimuladorDef, Simulacion } from '../core/tipos';
import { ControlPanel } from '../shared/control-panel';
import { TeoriaModal } from '../shared/teoria-modal';
import { colusion, competencia, cournotNash, isobeneficio1, monopolio, reaccion1, reaccion2, stackelbergLider, tercerGrado } from '../micro2/modelos/mercados';
import { bertrand, cournotN, segundoGrado } from './modelos/estrategia';
import { induccion, nashMixto, nashPuros, gatillo, JUEGOS } from './modelos/juegos';
import { limones, riesgoMoral, spence } from './modelos/informacion';
import { CARGADORES_MICRO3 } from './registro';
import { teoria } from './teoria';

const SIMS = Object.keys(CARGADORES_MICRO3);
const VARIANTES: Record<string, Params[]> = {
  juegos: ['dilema', 'coordinacion', 'monedas'].flatMap((juego) =>
    ['normal', 'extensiva', 'repetido'].map((enfoque) => ({ enfoque, juego, ...JUEGOS[juego].pagos })),
  ),
  monopolio: [
    { enfoque: 'basico' },
    { enfoque: 'discriminacion', modo: 'primer' },
    { enfoque: 'discriminacion', modo: 'segundo' },
    { enfoque: 'discriminacion', modo: 'tercer' },
  ],
  oligopolio: [
    { enfoque: 'cournot', isobeneficios: 'si' },
    { enfoque: 'cournot', isobeneficios: 'no', n: 10 },
    { enfoque: 'stackelberg' },
    { enfoque: 'bertrand' },
    { enfoque: 'bertrand', c1: 10, c2: 30 },
  ],
  informacion: [
    { enfoque: 'seleccion' },
    { enfoque: 'seleccion', tmin: 0 },
    { enfoque: 'senalizacion', tema: 'spence' },
    { enfoque: 'senalizacion', tema: 'riesgo' },
  ],
};
const DEC4 = 5e-5;
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


/* ================================================================ catálogo */
describe('catálogo de Micro 3', () => {
  it('Micro 3 tiene 4 simuladores listos (juegos, monopolio, oligopolio e información) y su teoría', async () => {
    expect(SIMS).toEqual(['juegos', 'monopolio', 'oligopolio', 'informacion']);
    expect(MICRO3.simuladores.map((s) => s.id)).toEqual(SIMS);
    expect(MICRO3.simuladores.every((s) => s.listo)).toBe(true);
    expect(CARGADORES['micro3']).toBe(CARGADORES_MICRO3);
    const fn = await TEORIAS['micro3']();
    expect(fn('monopolio', {})?.titulo).toContain('Monopolio');
    expect(fn('nada', {})).toBeNull();
  });
});

for (const sim of SIMS)
  describe(`Micro 3 · ${sim}`, () => {
    it('Pasada 1: controles válidos, gráfica por defecto limpia, ejes con título y teoría concisa', async () => {
      const d = await CARGADORES_MICRO3[sim]();
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
        expect(t.autor).toMatch(/Monsalve|Lozano/);
        expect(t.fuente).not.toMatch(/p\.\s*\d|pág/); // sin números de página inventados
        const texto = [t.titulo, ...t.conceptos, t.ejemplo.enunciado, t.ejemplo.resultado, t.ejemplo.prueba].join(' ');
        expect(texto).not.toMatch(/NaN|undefined|Infinity/);
        for (const k of Object.keys(t.ejemplo.parametros)) expect([...ids, d.planteamientos?.param], k).toContain(k);
        expect(esError(d.calcular({ ...d.defecto, ...t.ejemplo.parametros }))).toBe(false);
      }
    });

    it('Pasada 3: cada deslizador en mínimo, centro, máximo y valores absurdos nunca rompe la página', async () => {
      const d = await CARGADORES_MICRO3[sim]();
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
      const d = await CARGADORES_MICRO3[sim]();
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
describe('Pasada 2 · monopolio y discriminación', () => {
  it('IMg ∩ CMg y D ∩ CMg graficados coinciden con la solución analítica (y* = 18, p* = 64, y_c = 30)', async () => {
    const d = await CARGADORES_MICRO3['monopolio']();
    const r = d.calcular({ ...d.defecto });
    const s = monopolio({ a: 100, b: 2, c: 10, d: 1, F: 50 });
    expect(s.y).toBeCloseTo(18, 10);
    expect(s.p).toBeCloseTo(64, 10);
    expect(s.PIE).toBeCloseTo(216, 8);
    cruzaEn(traza(r, 'Ingreso marginal IMg'), traza(r, 'Costo marginal CMg'), s.y, s.cmg);
    cruzaEn(traza(r, 'Demanda p(y)'), traza(r, 'Costo marginal CMg'), s.yc, s.pc);
    expect(s.lerner).toBeCloseTo(1 / s.elasticidad, 10);
  });
  it('primer grado sin PIE; tercer grado IMgᵢ = c; segundo grado: 2p₂(q_L) − p₁(q_L) = c y sin distorsión en la cima', async () => {
    const d = await CARGADORES_MICRO3['monopolio']();
    const r = d.calcular({ ...d.defecto, enfoque: 'discriminacion', modo: 'primer' });
    expect(r.fig.data.some((t) => String(t.name).startsWith('Pérdida irrecuperable'))).toBe(false);
    const t = tercerGrado({ a1: 100, b1: 1, a2: 60, b2: 1, c: 10, F: 50 });
    expect(100 - 2 * t.m1.y).toBeCloseTo(10, 10);
    expect(t.beneficio).toBeGreaterThanOrEqual(t.beneficioUnico - 1e-9);
    const s = segundoGrado({ a1: 100, b1: 1, a2: 60, b2: 1, c: 10 });
    expect(2 * (60 - s.qL) - (100 - s.qL)).toBeCloseTo(10, 10);
    expect(100 - s.qH).toBeCloseTo(10, 10);
    expect(s.beneficio).toBeLessThanOrEqual(s.beneficioPrimer + 1e-9);
    expect(s.TH - (100 * s.qH - s.qH ** 2 / 2)).toBeCloseTo(-s.renta, 10);
  });
});

describe('Pasada 2 · oligopolio', () => {
  const q = { a: 120, b: 1, c1: 0, c2: 0 };
  it('f₁ ∩ f₂ graficadas = Cournot (40, 40); Stackelberg (60, 30) sobre f₂ con isobeneficio tangente', async () => {
    const d = await CARGADORES_MICRO3['oligopolio']();
    const r = d.calcular({ ...d.defecto });
    expect(cournotNash(q).y1).toBe(40);
    cruzaEn(traza(r, 'Reacción de la empresa 1, f₁(y₂)'), traza(r, 'Reacción de la empresa 2, f₂(y₁)'), 40, 40);
    const s = stackelbergLider(q);
    expect(reaccion2(q, s.y1)).toBeCloseTo(s.y2, 12);
    const h = 1e-5;
    expect((isobeneficio1(q, s.pi1, s.y1 + h) - isobeneficio1(q, s.pi1, s.y1 - h)) / (2 * h)).toBeCloseTo(-0.5, 4);
    const k = colusion(q);
    const w = competencia(q);
    expect(k.Y < cournotNash(q).Y && cournotNash(q).Y < s.Y && s.Y < w.Y).toBe(true);
    expect(reaccion1({ ...q, c2: 130 }, 0)).toBeCloseTo(60, 10);
  });
  it('Bertrand: p = c con costos iguales; con costos distintos la eficiente cobra el costo de la rival', () => {
    expect(bertrand(q).p).toBe(0);
    const b = bertrand({ ...q, c1: 10, c2: 30 });
    expect(b.p).toBe(30);
    expect(b.y2).toBe(0);
    expect(b.pi1).toBeCloseTo(20 * 90, 10);
    const n = cournotN(q, 50);
    expect(n.p).toBeCloseTo(120 / 51, 10);
  });
});

describe('Pasada 2 · teoría de juegos', () => {
  it('dilema: único Nash (Delatar, Delatar); batalla de los sexos: dos puros y un mixto (2/3, 1/3)', () => {
    expect(nashPuros(JUEGOS['dilema'].pagos)).toEqual([[1, 1]]);
    expect(nashMixto(JUEGOS['dilema'].pagos)).toBeNull();
    const bs = JUEGOS['coordinacion'].pagos;
    expect(nashPuros(bs)).toEqual([[0, 0], [1, 1]]);
    const m = nashMixto(bs)!;
    expect(m.p).toBeCloseTo(2 / 3, 12);
    expect(m.q).toBeCloseTo(1 / 3, 12);
    expect(nashPuros(JUEGOS['monedas'].pagos)).toEqual([]);
    expect(nashMixto(JUEGOS['monedas'].pagos)!.p).toBeCloseTo(0.5, 12);
  });
  it('inducción hacia atrás y umbral de la estrategia gatillo', () => {
    expect(induccion(JUEGOS['coordinacion'].pagos).resultado).toEqual([0, 0]);
    expect(induccion(JUEGOS['dilema'].pagos).resultado).toEqual([1, 1]);
    expect(gatillo(JUEGOS['dilema'].pagos).delta).toBeCloseTo(0.5, 12);
  });
});

describe('Pasada 2 · información asimétrica', () => {
  it('limones: p* = kθmin/(2 − k); con θmin = 0 el mercado colapsa', () => {
    const r = limones({ k: 1.5, tmin: 20, tmax: 100 });
    expect(r.p).toBeCloseTo(60, 10);
    expect(r.fraccion).toBeCloseTo(0.5, 10);
    expect(limones({ k: 1.5, tmin: 0, tmax: 100 }).colapso).toBe(true);
    expect(limones({ k: 2.5, tmin: 20, tmax: 100 }).fraccion).toBe(1);
  });
  it('Spence separa entre θ_B(θ_A − θ_B) y θ_A(θ_A − θ_B); riesgo moral b* = ψ/(π_A − π_B)', () => {
    const s = spence({ tB: 2, tA: 4, e: 5 });
    expect([s.eMin, s.eMax, s.separa]).toEqual([4, 8, true]);
    expect(spence({ tB: 2, tA: 4, e: 3 }).separa).toBe(false);
    const r = riesgoMoral({ piA: 0.8, piB: 0.4, psi: 10, b: 20 });
    expect(r.bMin).toBeCloseTo(25, 10);
    expect(r.esfuerza).toBe(false);
  });
});
