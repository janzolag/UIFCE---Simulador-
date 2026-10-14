/**
 * Pruebas de interfaz e interactividad de Macro 1: contrato de cada simulador (controles, valores por
 * defecto, rangos, selectores y grupos condicionales), barrido de todos los deslizadores, fichas de
 * teoría y renderizado real de los componentes Angular (panel de controles, resultados y modal).
 */
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { MACRO1 } from '../core/catalogo';
import { CARGADORES, TEORIAS } from '../core/registro';
import { Bloque, Control, Params, SimuladorDef, Simulacion } from '../core/tipos';
import { ControlPanel } from '../shared/control-panel';
import { ResultRenderer } from '../shared/result-renderer';
import { TeoriaModal } from '../shared/teoria-modal';
import { CARGADORES_MACRO1 } from './registro';
import { teoria } from './teoria';

const SIMS = Object.keys(CARGADORES_MACRO1);
const VARIANTES: Record<string, { id: string; valores: string[] } | null> = {
  keynesiano: null,
  'is-lm': { id: 'modo', valores: ['tasa', 'oferta'] },
  'da-oa': null,
  'mundell-fleming': { id: 'regimen', valores: ['flexible', 'fijo'] },
};

const controles = (d: SimuladorDef): Control[] => d.grupos.flatMap((g) => g.controles);
const json = (r: Simulacion) => JSON.stringify(r);
const esError = (r: Simulacion) => JSON.stringify(r.panel).includes('"nivel":"error"');

/** Ningún número inválido en las trazas (null sí: Plotly lo usa para cortar curvas). */
function trazasLimpias(r: Simulacion): boolean {
  return r.fig.data.every((t) =>
    ['x', 'y'].every(
      (k) =>
        !Array.isArray(t[k]) ||
        t[k].every((v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v))),
    ),
  );
}

function textos(bs: Bloque[]): string {
  return JSON.stringify(bs);
}

describe('catálogo y registro de Macro 1', () => {
  it('los cuatro simuladores del catálogo están listos y registrados', () => {
    expect(MACRO1.simuladores.map((s) => s.id)).toEqual(SIMS);
    expect(MACRO1.simuladores.every((s) => s.listo)).toBe(true);
    expect(CARGADORES['macro1']).toBe(CARGADORES_MACRO1);
  });

  it('la teoría de Macro 1 se carga desde el registro común', async () => {
    const fn = await TEORIAS['macro1']();
    expect(fn('is-lm', {})?.titulo).toContain('IS–LM');
    expect((await TEORIAS['micro1']())('monopolio', {})?.titulo).toBe('Monopolio');
  });
});

for (const sim of SIMS) {
  describe(`simulador ${sim}`, () => {
    it('cada control tiene valor por defecto dentro de su rango y paso coherente', async () => {
      const d = await CARGADORES_MACRO1[sim]();
      const ids = controles(d).map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const c of controles(d)) {
        expect(d.defecto, c.id).toHaveProperty(c.id);
        if (c.tipo === 'slider') {
          const v = d.defecto[c.id] as number;
          expect(c.min!, c.id).toBeLessThan(c.max!);
          expect(c.paso!, c.id).toBeGreaterThan(0);
          expect(v, c.id).toBeGreaterThanOrEqual(c.min!);
          expect(v, c.id).toBeLessThanOrEqual(c.max!);
        } else {
          expect(c.opciones!.map((o) => o.valor)).toContain(d.defecto[c.id]);
        }
      }
    });

    it('con los valores por defecto produce gráfica, punto de equilibrio y panel sin errores', async () => {
      const d = await CARGADORES_MACRO1[sim]();
      const r = d.calcular({ ...d.defecto });
      expect(esError(r)).toBe(false);
      expect(r.fig.data.length).toBeGreaterThan(2);
      expect(
        r.fig.data.some(
          (t) => t.name === 'Equilibrio inicial' || t.name === 'Mediano plazo inicial',
        ),
      ).toBe(true);
      expect(trazasLimpias(r)).toBe(true);
      expect(json(r)).not.toMatch(/NaN|undefined|Infinity|\[object/);
      expect(textos(r.panel)).toContain('Blanchard (2017)');
      expect(r.fig.layout.uirevision).toBe(sim);
    });

    it('barrido: cada deslizador en su mínimo, centro y máximo nunca rompe la página', async () => {
      const d = await CARGADORES_MACRO1[sim]();
      const variantes = VARIANTES[sim];
      for (const valor of variantes ? variantes.valores : [null]) {
        const base: Params =
          variantes && valor ? { ...d.defecto, [variantes.id]: valor } : { ...d.defecto };
        for (const c of controles(d).filter((x) => x.tipo === 'slider')) {
          for (const v of [c.min!, (c.min! + c.max!) / 2, c.max!]) {
            const r = d.calcular({ ...base, [c.id]: v });
            expect(trazasLimpias(r), `${c.id} = ${v}`).toBe(true);
            if (esError(r)) {
              expect(r.fig.data.length).toBe(0);
              expect(r.panel.length).toBe(1);
            } else expect(json(r), `${c.id} = ${v}`).not.toMatch(/NaN|undefined|Infinity/);
          }
        }
      }
    });

    it('mover un choque cambia el equilibrio final; con choques en cero no se dibuja E₁', async () => {
      const d = await CARGADORES_MACRO1[sim]();
      const choques = controles(d)
        .filter((c) => /^d/.test(c.id))
        .map((c) => c.id);
      const sinChoque = Object.fromEntries(choques.map((k) => [k, 0]));
      const r0 = d.calcular({ ...d.defecto, ...sinChoque });
      expect(esError(r0)).toBe(false);
      expect(
        r0.fig.data.some((t) => t.name === 'Equilibrio final' || t.name === 'Mediano plazo final'),
      ).toBe(false);
      const r1 = d.calcular({ ...d.defecto });
      expect(
        r1.fig.data.some((t) => t.name === 'Equilibrio final' || t.name === 'Mediano plazo final'),
      ).toBe(true);
    });

    const variantes = VARIANTES[sim];
    for (const valor of variantes ? variantes.valores : [null]) {
      it(`teoría${valor ? ` · ${valor}` : ''}: ficha completa y ejercicio que carga sin errores`, async () => {
        const d = await CARGADORES_MACRO1[sim]();
        const p = variantes && valor ? { ...d.defecto, [variantes.id]: valor } : { ...d.defecto };
        const t = teoria(sim, p)!;
        expect(t).not.toBeNull();
        expect(t.definicion!.length).toBeGreaterThan(40);
        expect(t.conceptos.length).toBeGreaterThanOrEqual(2);
        expect(t.conceptos.length).toBeLessThanOrEqual(3);
        expect(t.formulas.length).toBeGreaterThanOrEqual(1);
        expect(t.formulas.length).toBeLessThanOrEqual(3);
        expect(t.variables!.some((v) => v.tipo === 'endógena')).toBe(true);
        expect(t.variables!.some((v) => v.tipo === 'exógena')).toBe(true);
        expect(t.choques!.length).toBeGreaterThanOrEqual(2);
        expect(t.equilibrio!.length).toBeGreaterThan(40);
        expect(t.autor).toBe('Blanchard (2017)');
        const texto = [
          t.titulo,
          t.definicion,
          ...t.conceptos,
          t.equilibrio,
          ...t.choques!,
          t.ejemplo.enunciado,
          t.ejemplo.resultado,
          t.ejemplo.prueba,
        ].join(' ');
        expect(texto).not.toMatch(/NaN|undefined|Infinity|\[object/);
        if (variantes && valor) expect(t.ejemplo.parametros[variantes.id]).toBe(valor);
        const r = d.calcular({ ...d.defecto, ...t.ejemplo.parametros });
        expect(esError(r)).toBe(false);
        // Todos los parámetros del ejercicio son controles del simulador.
        const ids = new Set(controles(d).map((c) => c.id));
        for (const k of Object.keys(t.ejemplo.parametros)) expect(ids.has(k), k).toBe(true);
      });
    }
  });
}

describe('grupos condicionales', () => {
  it('IS–LM muestra ī o M según la regla del banco central', async () => {
    const d = await CARGADORES_MACRO1['is-lm']();
    const visibles = (modo: string) =>
      d.grupos
        .filter((g) => !g.visibleSi || g.visibleSi({ ...d.defecto, modo }))
        .flatMap((g) => g.controles.map((c) => c.id));
    expect(visibles('tasa')).toContain('ibar');
    expect(visibles('tasa')).not.toContain('M');
    expect(visibles('oferta')).toContain('M');
    expect(visibles('oferta')).not.toContain('ibar');
  });

  it('Mundell–Fleming muestra M y eᵉ con flexible, ē y la devaluación con fijo', async () => {
    const d = await CARGADORES_MACRO1['mundell-fleming']();
    const visibles = (regimen: string) =>
      d.grupos
        .filter((g) => !g.visibleSi || g.visibleSi({ ...d.defecto, regimen }))
        .flatMap((g) => g.controles.map((c) => c.id));
    expect(visibles('flexible')).toEqual(expect.arrayContaining(['M', 'ee', 'dM']));
    expect(visibles('flexible')).not.toContain('debar');
    expect(visibles('fijo')).toEqual(expect.arrayContaining(['ebar', 'debar']));
    expect(visibles('fijo')).not.toContain('M');
  });
});

describe('componentes Angular con los simuladores de Macro 1', () => {
  for (const sim of SIMS) {
    it(`${sim}: el panel dibuja un control por parámetro visible y emite el valor al mover un deslizador`, async () => {
      const d = await CARGADORES_MACRO1[sim]();
      TestBed.configureTestingModule({ imports: [ControlPanel] });
      const fx = TestBed.createComponent(ControlPanel);
      fx.componentRef.setInput('grupos', d.grupos);
      fx.componentRef.setInput('params', d.defecto);
      fx.detectChanges();
      const el: HTMLElement = fx.nativeElement;
      const visibles = d.grupos
        .filter((g) => !g.visibleSi || g.visibleSi(d.defecto))
        .flatMap((g) => g.controles);
      const rangos = el.querySelectorAll('input[type=range]');
      expect(rangos.length).toBe(visibles.filter((c) => c.tipo === 'slider').length);
      expect(el.querySelectorAll('[role=radiogroup]').length).toBe(
        visibles.filter((c) => c.tipo === 'selector').length,
      );

      const emitidos: { id: string; valor: number | string }[] = [];
      fx.componentInstance.cambio.subscribe((e) => emitidos.push(e));
      const primero = rangos[0] as HTMLInputElement;
      primero.value = primero.max;
      primero.dispatchEvent(new Event('input'));
      expect(emitidos.length).toBe(1);
      expect(typeof emitidos[0].valor).toBe('number');
      // Un valor vacío (caja numérica borrada) no se emite.
      primero.value = '';
      Object.defineProperty(primero, 'value', { value: 'abc', configurable: true });
      primero.dispatchEvent(new Event('input'));
      expect(emitidos.length).toBe(1);
    });

    it(`${sim}: el panel de resultados muestra tablas y la referencia a Blanchard`, async () => {
      const d = await CARGADORES_MACRO1[sim]();
      TestBed.configureTestingModule({ imports: [ResultRenderer] });
      const fx = TestBed.createComponent(ResultRenderer);
      fx.componentRef.setInput('bloques', d.calcular({ ...d.defecto }).panel);
      fx.detectChanges();
      const el: HTMLElement = fx.nativeElement;
      expect(el.querySelectorAll('table.tabla-resultados').length).toBeGreaterThan(0);
      expect(el.querySelector('.referencia')?.textContent).toContain('Blanchard (2017)');
      expect(el.textContent).not.toContain('Monsalve');
    });
  }

  it('el modal de teoría muestra definición, variables, choques y equilibrio', async () => {
    TestBed.configureTestingModule({ imports: [TeoriaModal] });
    const fx = TestBed.createComponent(TeoriaModal);
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
    const t = teoria('is-lm', { modo: 'oferta' })!;
    fx.componentRef.setInput('teoria', t);
    fx.componentRef.setInput('abierto', true);
    fx.detectChanges();
    const el: HTMLElement = fx.nativeElement;
    const titulos = [...el.querySelectorAll('h3')].map((h) => h.textContent?.trim());
    expect(titulos).toEqual(
      expect.arrayContaining([
        'Definición',
        'Idea clave',
        'Fórmulas',
        'Variables',
        'Exógenas y choques',
        'Cómo leer el equilibrio',
      ]),
    );
    expect(el.querySelectorAll('table.variables tr').length).toBe(t.variables!.length);
    expect(el.querySelector('.fuente')?.textContent).toContain('Blanchard (2017)');
  });
});
