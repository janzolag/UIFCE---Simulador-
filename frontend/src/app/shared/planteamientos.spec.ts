/**
 * Acordeón «Planteamiento del problema»: en todos los simuladores que lo usan, el parámetro existe en el
 * estado por defecto, cada opción se calcula sin errores ni NaN, la teoría responde a cada opción y el
 * componente se dibuja con la opción activa.
 */
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { MATERIAS, porPilar } from '../core/catalogo';
import { CARGADORES, TEORIAS } from '../core/registro';
import katex from 'katex';
import { PlanteamientosAcordeon } from './planteamientos';

const casos: [string, string][] = Object.entries(CARGADORES).flatMap(([m, sims]) => Object.keys(sims).map((s) => [m, s] as [string, string]));

describe('pilares del menú', () => {
  it('Micro 1 tiene 8 simuladores en 3 pilares, Micro 2 7 en 3 y Micro 3 4', () => {
    const m = (id: string) => MATERIAS.find((x) => x.id === id)!;
    expect(m('micro1').simuladores).toHaveLength(8);
    expect(porPilar(m('micro1')).map((g) => g.pilar)).toEqual(['Problema del consumidor', 'Problema del productor', 'El mercado']);
    expect(m('micro2').simuladores).toHaveLength(7);
    expect(porPilar(m('micro2'))).toHaveLength(3);
    expect(m('micro3').simuladores).toHaveLength(4);
    for (const id of ['micro1', 'micro2', 'micro3']) expect(m(id).simuladores.every((s) => s.listo), id).toBe(true);
  });
});

describe.each(casos)('planteamientos %s/%s', (materia, sim) => {
  it('cada opción se calcula, tiene teoría y el acordeón se dibuja', async () => {
    const d = await CARGADORES[materia][sim]();
    const pl = d.planteamientos;
    if (!pl) return;
    expect(pl.opciones.length).toBeGreaterThanOrEqual(2);
    expect(pl.opciones.map((o) => o.valor)).toContain(d.defecto[pl.param]);
    const teoria = await TEORIAS[materia]();
    const titulos = new Set<string>();
    for (const o of pl.opciones) {
      const p = { ...d.defecto, [pl.param]: o.valor };
      const r = d.calcular(p);
      const json = JSON.stringify(r);
      expect(json.includes('"nivel":"error"'), `${sim} · ${o.valor}`).toBe(false);
      expect(json, `${sim} · ${o.valor}`).not.toMatch(/NaN|undefined|Infinity/);
      const t = teoria(sim, p);
      expect(t, `${sim} · ${o.valor}`).not.toBeNull();
      titulos.add(t!.titulo);
      for (const fm of t!.formulas) {
        // LaTeX bien escapado: sin caracteres de control ni comandos sin barra (p. ej. «dfrac» suelto).
        expect(fm, `${sim} · ${o.valor}`).not.toMatch(/[\u0000-\u001f]/);
        expect(fm, `${sim} · ${o.valor}`).not.toMatch(/(^|[^\\a-zA-Z])(dfrac|frac|text|quad|qquad|max|min|bar|Delta|partial|gamma|pi)\b/);
        expect(() => katex.renderToString(fm, { throwOnError: true }), fm).not.toThrow();
      }
      const r2 = d.calcular({ ...p, ...t!.ejemplo.parametros });
      expect(JSON.stringify(r2.panel).includes('"nivel":"error"'), `ejercicio ${sim} · ${o.valor}`).toBe(false);
    }
    // Cada formulación tiene su propia ficha de teoría (salvo costos de Micro 1, que ya varía con el horizonte).
    expect(titulos.size, sim).toBe(pl.opciones.length);
    TestBed.configureTestingModule({ imports: [PlanteamientosAcordeon] });
    const fx = TestBed.createComponent(PlanteamientosAcordeon);
    fx.componentRef.setInput('def', pl);
    fx.componentRef.setInput('valor', d.defecto[pl.param]);
    fx.detectChanges();
    expect(fx.nativeElement.querySelectorAll('[role="radio"]').length).toBe(pl.opciones.length);
    expect(fx.nativeElement.querySelector('[aria-checked="true"]')).toBeTruthy();
    TestBed.resetTestingModule();
  });
});
