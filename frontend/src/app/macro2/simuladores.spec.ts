/**
 * Pruebas de interfaz y casos límite de Macro 2: contrato de cada simulador, barrido de todos los
 * deslizadores (mínimo, centro, máximo, y valores vacíos o absurdos), curvas fantasma, proyecciones
 * a los ejes, fichas de teoría concisas y renderizado real de los componentes Angular.
 */
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { MACRO2, MATERIAS } from '../core/catalogo';
import { CARGADORES, TEORIAS } from '../core/registro';
import { Control, Params, SimuladorDef, Simulacion } from '../core/tipos';
import { ControlPanel } from '../shared/control-panel';
import { TeoriaModal } from '../shared/teoria-modal';
import { CARGADORES_MACRO2 } from './registro';
import { teoria } from './teoria';

const SIMS = Object.keys(CARGADORES_MACRO2);
const VARIANTES: Record<string, { id: string; valores: string[] }[]> = {
  'is-lm': [],
  'mundell-fleming': [
    { id: 'regimen', valores: ['flotante', 'fijo'] },
    { id: 'movilidad', valores: ['perfecta', 'imperfecta'] },
  ],
  'da-oa': [{ id: 'autoajuste', valores: ['si', 'no'] }],
  phillips: [],
  solow: [],
};

const controles = (d: SimuladorDef): Control[] => d.grupos.flatMap((g) => g.controles);
const json = (r: Simulacion) => JSON.stringify(r);
const esError = (r: Simulacion) => JSON.stringify(r.panel).includes('"nivel":"error"');
function trazasLimpias(r: Simulacion): boolean {
  return r.fig.data.every((t) =>
    ['x', 'y'].every(
      (k) =>
        !Array.isArray(t[k]) ||
        t[k].every((v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v))),
    ),
  );
}
/** Todas las combinaciones de los selectores del simulador. */
function combinaciones(sim: string, defecto: Params): Params[] {
  let out: Params[] = [{ ...defecto }];
  for (const v of VARIANTES[sim]) out = out.flatMap((p) => v.valores.map((x) => ({ ...p, [v.id]: x })));
  return out;
}

describe('catálogo y navegación de Macro 2', () => {
  it('Macro 2 es una materia más, después de Macro 1, con sus 5 simuladores listos', () => {
    expect(MATERIAS.map((m) => m.id)).toEqual(['fundamentos', 'micro1', 'micro2', 'macro1', 'macro2']);
    expect(MACRO2.simuladores.map((s) => s.id)).toEqual(SIMS);
    expect(MACRO2.simuladores.every((s) => s.listo)).toBe(true);
    expect(CARGADORES['macro2']).toBe(CARGADORES_MACRO2);
  });
  it('la teoría de Macro 2 se carga desde el registro común', async () => {
    const fn = await TEORIAS['macro2']();
    expect(fn('solow', {})?.titulo).toContain('Solow');
    expect(fn('inexistente', {})).toBeNull();
  });
});

for (const sim of SIMS) {
  describe(`Macro 2 · ${sim}`, () => {
    it('cada control tiene valor por defecto dentro de su rango', async () => {
      const d = await CARGADORES_MACRO2[sim]();
      const ids = controles(d).map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const c of controles(d)) {
        expect(d.defecto, c.id).toHaveProperty(c.id);
        if (c.tipo === 'slider') {
          const v = d.defecto[c.id] as number;
          expect(c.min!, c.id).toBeLessThan(c.max!);
          expect(v, c.id).toBeGreaterThanOrEqual(c.min!);
          expect(v, c.id).toBeLessThanOrEqual(c.max!);
        } else expect(c.opciones!.map((o) => o.valor)).toContain(d.defecto[c.id]);
      }
    });

    it('por defecto: gráfica con equilibrio marcado, proyecciones punteadas y lecturas en los ejes', async () => {
      const d = await CARGADORES_MACRO2[sim]();
      for (const p of combinaciones(sim, d.defecto)) {
        const r = d.calcular(p);
        expect(esError(r), JSON.stringify(p)).toBe(false);
        expect(trazasLimpias(r)).toBe(true);
        expect(json(r)).not.toMatch(/NaN|undefined|Infinity|\[object/);
        const marcadores = r.fig.data.filter((t) => t.mode?.includes('markers'));
        expect(marcadores.length).toBeGreaterThan(0);
        expect(r.fig.data.some((t) => t.line?.dash === 'dot' && t.showlegend === false)).toBe(true);
        expect(r.fig.layout.annotations.length).toBeGreaterThanOrEqual(2);
        // Ejes con rango definido: el componente de la gráfica acota el zoom a esa vista.
        expect(r.fig.layout.xaxis.range).toHaveLength(2);
        expect(r.fig.layout.yaxis.range).toHaveLength(2);
      }
    });

    it('barrido: cada deslizador en mínimo, centro y máximo (y valores vacíos) nunca rompe la página', async () => {
      const d = await CARGADORES_MACRO2[sim]();
      for (const base of combinaciones(sim, d.defecto)) {
        for (const c of controles(d).filter((x) => x.tipo === 'slider')) {
          for (const v of [c.min!, (c.min! + c.max!) / 2, c.max!, NaN, -1e9, 1e9]) {
            const r = d.calcular({ ...base, [c.id]: v });
            expect(trazasLimpias(r), `${c.id} = ${v}`).toBe(true);
            if (esError(r)) expect(r.fig.data.length).toBe(0);
            else expect(json(r), `${c.id} = ${v}`).not.toMatch(/NaN|undefined|Infinity/);
          }
        }
      }
    });

    it('un choque deja la posición inicial como curva fantasma punteada', async () => {
      const d = await CARGADORES_MACRO2[sim]();
      const choques = controles(d).filter((c) => /^d[A-Za-z]/.test(c.id) && c.id !== 'delta' && c.tipo === 'slider');
      const cero = Object.fromEntries(choques.map((c) => [c.id, 0]));
      const r0 = d.calcular({ ...d.defecto, ...cero });
      expect(r0.fig.data.some((t) => String(t.name).endsWith('(inicial)'))).toBe(false);
      for (const c of choques) {
        const v = c.max! > 0 ? c.max! / 2 : c.min! / 2;
        const base: Params = sim === 'mundell-fleming' && c.id === 'dE0' ? { regimen: 'fijo' } : {};
        const r = d.calcular({ ...d.defecto, ...cero, ...base, [c.id]: v });
        if (esError(r)) continue;
        const fantasmas = r.fig.data.filter((t) => String(t.name).endsWith('(inicial)'));
        // Δ(M/P) con tipo fijo no mueve nada: es justo la lección de ese régimen.
        if (sim === 'mundell-fleming' && c.id === 'dMp' && base['regimen'] === 'fijo') continue;
        expect(fantasmas.length, c.id).toBeGreaterThan(0);
        expect(fantasmas.every((t) => t.line.dash === 'dash')).toBe(true);
      }
    });

    it('teoría concisa: 2–3 viñetas, máximo 2 ecuaciones y ejercicio que carga en la gráfica', async () => {
      const d = await CARGADORES_MACRO2[sim]();
      for (const p of combinaciones(sim, d.defecto)) {
        const t = teoria(sim, p)!;
        expect(t.conceptos.length).toBeGreaterThanOrEqual(2);
        expect(t.conceptos.length).toBeLessThanOrEqual(3);
        expect(t.formulas.length).toBeGreaterThanOrEqual(1);
        expect(t.formulas.length).toBeLessThanOrEqual(2);
        expect(t.fuente!.length).toBeGreaterThan(20);
        expect(t.autor).toMatch(/Krugman y Obstfeld \(2006\)|Notación estándar/);
        const texto = [t.titulo, ...t.conceptos, t.ejemplo.enunciado, t.ejemplo.resultado, t.ejemplo.prueba].join(' ');
        expect(texto).not.toMatch(/NaN|undefined|Infinity|\[object/);
        const ids = new Set(controles(d).map((c) => c.id));
        for (const k of Object.keys(t.ejemplo.parametros)) expect(ids.has(k), k).toBe(true);
        const r = d.calcular({ ...d.defecto, ...t.ejemplo.parametros });
        expect(esError(r)).toBe(false);
      }
    });
  });
}

describe('Macro 2: reglas de los modelos en la interfaz', () => {
  it('Mundell–Fleming: con tipo fijo se ve E₀ y la devaluación; con flotante, M/P y Eᵉ', async () => {
    const d = await CARGADORES_MACRO2['mundell-fleming']();
    const visibles = (p: Params) =>
      d.grupos.filter((g) => !g.visibleSi || g.visibleSi({ ...d.defecto, ...p })).flatMap((g) => g.controles.map((c) => c.id));
    expect(visibles({ regimen: 'flotante' })).toEqual(expect.arrayContaining(['Mp', 'Ee', 'dEe']));
    expect(visibles({ regimen: 'flotante' })).not.toContain('E0');
    expect(visibles({ regimen: 'fijo' })).toEqual(expect.arrayContaining(['E0', 'dE0']));
    expect(visibles({ regimen: 'fijo' })).not.toContain('Mp');
    expect(visibles({ movilidad: 'perfecta' })).not.toContain('mu');
    expect(visibles({ movilidad: 'imperfecta' })).toContain('mu');
  });

  it('IS–LM: con M/P alto aparece el aviso de trampa de liquidez y su tramo plano', async () => {
    const d = await CARGADORES_MACRO2['is-lm']();
    const r = d.calcular({ ...d.defecto, m: 1100 });
    expect(JSON.stringify(r.panel)).toContain('Trampa de liquidez');
    expect(r.fig.data.some((t) => String(t.name).startsWith('Trampa de liquidez'))).toBe(true);
  });

  it('IS–LM: una expansión fiscal muestra el efecto expulsión', async () => {
    const d = await CARGADORES_MACRO2['is-lm']();
    const r = d.calcular({ ...d.defecto, dG: 100 });
    expect(JSON.stringify(r.panel)).toContain('Efecto expulsión');
  });

  it('DA–OA: un choque de demanda marca la brecha inflacionaria y la trayectoria de autocorrección', async () => {
    const d = await CARGADORES_MACRO2['da-oa']();
    const r = d.calcular({ ...d.defecto });
    const nombres = r.fig.data.map((t) => t.name);
    expect(nombres).toContain('Brecha inflacionaria');
    expect(nombres).toContain('Autocorrección período a período');
    const solo = d.calcular({ ...d.defecto, autoajuste: 'no', dD0: -200 });
    expect(solo.fig.data.map((t) => t.name)).toContain('Brecha recesiva');
    expect(solo.fig.data.map((t) => t.name)).not.toContain('Autocorrección período a período');
  });
});

describe('componentes Angular con Macro 2', () => {
  for (const sim of SIMS) {
    it(`${sim}: el panel dibuja los controles y el modal de teoría se renderiza`, async () => {
      const d = await CARGADORES_MACRO2[sim]();
      TestBed.configureTestingModule({ imports: [ControlPanel, TeoriaModal] });
      HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      };
      HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
        this.removeAttribute('open');
      };
      const fx = TestBed.createComponent(ControlPanel);
      fx.componentRef.setInput('grupos', d.grupos);
      fx.componentRef.setInput('params', { ...d.defecto });
      fx.detectChanges();
      const html: string = fx.nativeElement.innerHTML;
      expect(html.length).toBeGreaterThan(100);

      const modal = TestBed.createComponent(TeoriaModal);
      modal.componentRef.setInput('teoria', teoria(sim, { ...d.defecto }));
      modal.componentRef.setInput('abierto', true);
      modal.detectChanges();
      const texto: string = modal.nativeElement.textContent;
      expect(texto).toContain('Idea clave');
      expect(texto).toContain('Resuélvelo en la gráfica');
      TestBed.resetTestingModule();
    });
  }
});
