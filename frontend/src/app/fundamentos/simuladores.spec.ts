/**
 * Pruebas de interfaz e interactividad de Fundamentos: contrato de cada simulador (controles, rangos,
 * selectores y grupos condicionales), barrido de deslizadores y opciones, revisión de cada figura
 * (sin NaN ni infinitos, ejes finitos, leyenda sin duplicados), fichas de teoría y renderizado real
 * de los componentes Angular (panel de controles, resultados y modal).
 */
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { FUNDAMENTOS } from '../core/catalogo';
import { CARGADORES, TEORIAS } from '../core/registro';
import { Control, Params, SimuladorDef, Simulacion } from '../core/tipos';
import { ControlPanel } from '../shared/control-panel';
import { ResultRenderer } from '../shared/result-renderer';
import { TeoriaModal } from '../shared/teoria-modal';
import { CARGADORES_FUNDAMENTOS } from './registro';
import { teoria } from './teoria';

const SIMS = Object.keys(CARGADORES_FUNDAMENTOS);
const controles = (d: SimuladorDef): Control[] => d.grupos.flatMap((g) => g.controles);
const esError = (r: Simulacion) => JSON.stringify(r.panel).includes('"nivel":"error"');

/** Variantes con teoría propia. */
const VARIANTES: Record<string, { id: string; valores: string[] } | null> = {
  'controles-precios': { id: 'tipo', valores: ['maximo', 'minimo'] },
  externalidades: { id: 'tipo', valores: ['negativa', 'positiva'] },
};

/** Una figura nunca puede llevar NaN o infinitos (Plotly la dibuja mal), ni ejes degenerados. */
function revisar(r: Simulacion, contexto: string): void {
  for (const t of r.fig.data)
    for (const k of ['x', 'y'])
      if (Array.isArray(t[k]))
        expect(
          t[k].every((v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v))),
          `${contexto}: valores no finitos en «${t.name}» (${k})`,
        ).toBe(true);
  for (const eje of ['xaxis', 'yaxis', 'xaxis2', 'yaxis2']) {
    const rango = r.fig.layout[eje]?.range;
    if (rango) {
      expect(
        Number.isFinite(rango[0]) && Number.isFinite(rango[1]) && rango[1] > rango[0],
        `${contexto}: rango de ${eje} ${rango}`,
      ).toBe(true);
    }
  }
  const nombres = r.fig.data
    .filter((t) => t.name && t.showlegend !== false)
    .map((t) => t.name as string);
  expect(new Set(nombres).size, `${contexto}: leyenda duplicada ${nombres}`).toBe(nombres.length);
  expect(() => JSON.stringify(r.fig), contexto).not.toThrow();
  expect(JSON.stringify(r.panel), contexto).not.toMatch(/NaN|undefined|\[object/);
}

describe('catálogo y registro de Fundamentos', () => {
  it('los nueve simuladores del catálogo están listos y registrados', () => {
    expect(FUNDAMENTOS.simuladores.map((s) => s.id)).toEqual(SIMS);
    expect(FUNDAMENTOS.simuladores.length).toBe(9);
    expect(FUNDAMENTOS.simuladores.every((s) => s.listo)).toBe(true);
    expect(CARGADORES['fundamentos']).toBe(CARGADORES_FUNDAMENTOS);
  });

  it('el orden sigue el libro: cap. 2 → 10', () => {
    expect(SIMS).toEqual([
      'fpp',
      'ventaja-comparativa',
      'oferta-demanda',
      'elasticidades',
      'excedentes',
      'controles-precios',
      'impuestos',
      'comercio-internacional',
      'externalidades',
    ]);
  });

  it('la teoría de Fundamentos se carga desde el registro común', async () => {
    const fn = await TEORIAS['fundamentos']();
    expect(fn('fpp', {})?.titulo).toContain('Frontera');
    expect(fn('no-existe', {})).toBeNull();
  });
});

for (const sim of SIMS) {
  describe(`simulador ${sim}`, () => {
    it('cada control tiene valor por defecto dentro de su rango y paso coherente', async () => {
      const d = await CARGADORES_FUNDAMENTOS[sim]();
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
          const valores = c.opciones!.map((o) => o.valor);
          expect(valores, c.id).toContain(d.defecto[c.id]);
          expect(new Set(valores).size).toBe(valores.length);
        }
      }
      // todo parámetro por defecto es un control (y al revés)
      expect(Object.keys(d.defecto).sort()).toEqual([...ids].sort());
    });

    it('con los valores por defecto produce gráfica y panel sin errores, y cita a Mankiw', async () => {
      const d = await CARGADORES_FUNDAMENTOS[sim]();
      const r = d.calcular({ ...d.defecto });
      expect(esError(r)).toBe(false);
      expect(r.fig.data.length).toBeGreaterThan(1);
      revisar(r, 'defecto');
      expect(JSON.stringify(r.panel)).toContain('Mankiw');
      expect(r.fig.layout.uirevision).toBe(sim);
    });

    it('extremos y punto medio de cada deslizador', async () => {
      const d = await CARGADORES_FUNDAMENTOS[sim]();
      for (const c of controles(d).filter((x) => x.tipo === 'slider'))
        for (const v of [c.min!, (c.min! + c.max!) / 2, c.max!])
          revisar(d.calcular({ ...d.defecto, [c.id]: v }), `${c.id} = ${v}`);
    });

    it('todas las opciones de cada selector', async () => {
      const d = await CARGADORES_FUNDAMENTOS[sim]();
      for (const c of controles(d).filter((x) => x.tipo === 'selector'))
        for (const o of c.opciones!) {
          const r = d.calcular({ ...d.defecto, [c.id]: o.valor });
          revisar(r, `${c.id} = ${o.valor}`);
          expect(esError(r), `${c.id} = ${o.valor}`).toBe(false);
        }
    });

    it('todos los deslizadores en su mínimo o en su máximo a la vez, con cada opción del primer selector', async () => {
      const d = await CARGADORES_FUNDAMENTOS[sim]();
      const sliders = controles(d).filter((x) => x.tipo === 'slider');
      const primero = controles(d).find((x) => x.tipo === 'selector');
      for (const pos of ['min', 'max'] as const)
        for (const o of primero ? primero.opciones!.map((x) => x.valor) : [null]) {
          const p: Params = {
            ...d.defecto,
            ...Object.fromEntries(sliders.map((c) => [c.id, c[pos] as number])),
          };
          if (primero && o) p[primero.id] = o;
          revisar(d.calcular(p), `${pos} ${o}`);
        }
    });

    it('60 combinaciones aleatorias: nunca excepción, figura siempre válida', async () => {
      const d = await CARGADORES_FUNDAMENTOS[sim]();
      let semilla = 42;
      const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
      let errores = 0;
      for (let i = 0; i < 60; i++) {
        const p: Params = { ...d.defecto };
        for (const c of controles(d)) {
          if (c.tipo === 'slider')
            p[c.id] = Math.min(
              c.max!,
              Math.max(
                c.min!,
                Math.round((c.min! + azar() * (c.max! - c.min!)) / c.paso!) * c.paso!,
              ),
            );
          else p[c.id] = c.opciones![Math.floor(azar() * c.opciones!.length)].valor;
        }
        const r = d.calcular(p);
        revisar(r, JSON.stringify(p));
        if (r.fig.data.length === 0) errores++; // el caso falló por completo (sin gráfica)
      }
      // un error que borra toda la gráfica no debe ser la norma; los avisos parciales sí pueden aparecer
      expect(errores).toBeLessThan(20);
    });

    const variantes = VARIANTES[sim];
    for (const valor of variantes ? variantes.valores : [null]) {
      it(`teoría${valor ? ` · ${valor}` : ''}: ficha completa y ejercicio que carga sin errores`, async () => {
        const d = await CARGADORES_FUNDAMENTOS[sim]();
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
        expect(t.autor).toBe('Mankiw, Principios de Economía');
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
        expect(t.ejemplo.prueba.length).toBeGreaterThan(10);
        if (variantes && valor) expect(t.ejemplo.parametros[variantes.id]).toBe(valor);
        // El ejercicio reemplaza todos los parámetros: debe traerlos todos
        expect(Object.keys(t.ejemplo.parametros).sort()).toEqual(Object.keys(d.defecto).sort());
        const r = d.calcular({ ...t.ejemplo.parametros });
        expect(esError(r)).toBe(false);
        revisar(r, 'ejercicio');
        expect(r.fig.data.length).toBeGreaterThan(1);
      });
    }
  });
}

describe('el resultado del ejercicio de la teoría coincide con lo que muestra el simulador', () => {
  it('oferta y demanda: los precios y cantidades del texto aparecen en la tabla', async () => {
    const d = await CARGADORES_FUNDAMENTOS['oferta-demanda']();
    const t = teoria('oferta-demanda', {})!;
    const r = d.calcular({ ...t.ejemplo.parametros });
    const tabla = JSON.stringify(r.panel);
    expect(tabla).toContain('"Nuevo precio P₁",22');
    expect(tabla).toContain('"Nueva cantidad Q₁",76');
    expect(t.ejemplo.resultado).toContain('22');
    expect(t.ejemplo.resultado).toContain('76');
  });

  it('impuestos: el recaudo y la PPM del texto son los de la tabla', async () => {
    const d = await CARGADORES_FUNDAMENTOS['impuestos']();
    const t = teoria('impuestos', {})!;
    const r = d.calcular({ ...t.ejemplo.parametros });
    const tabla = JSON.stringify(r.panel);
    expect(tabla).toContain('["Recaudo",290]');
    expect(tabla).toContain('["Pérdida de peso muerto",15]');
    expect(t.ejemplo.resultado).toContain('290');
    expect(t.ejemplo.resultado).toContain('15');
  });
});

describe('grupos condicionales', () => {
  const visibles = (d: SimuladorDef, p: Params) =>
    d.grupos
      .filter((g) => !g.visibleSi || g.visibleSi(p))
      .flatMap((g) => g.controles.map((c) => c.id));

  it('el precio de la curva horizontal solo aparece si hay una curva horizontal', async () => {
    for (const sim of [
      'oferta-demanda',
      'excedentes',
      'controles-precios',
      'impuestos',
      'externalidades',
    ]) {
      const d = await CARGADORES_FUNDAMENTOS[sim]();
      expect(
        visibles(d, { ...d.defecto, modo: 'continuo', elastica: 'ninguna' }),
        sim,
      ).not.toContain('p_horizontal');
      expect(visibles(d, { ...d.defecto, modo: 'continuo', elastica: 'demanda' }), sim).toContain(
        'p_horizontal',
      );
      expect(visibles(d, { ...d.defecto, modo: 'continuo', elastica: 'oferta' }), sim).toContain(
        'p_horizontal',
      );
    }
  });

  it('excedentes: curvas en modo continuo, precio en los modos escalonados', async () => {
    const d = await CARGADORES_FUNDAMENTOS['excedentes']();
    expect(visibles(d, { ...d.defecto, modo: 'continuo' })).toEqual(
      expect.arrayContaining(['a', 'b', 'c', 'd']),
    );
    expect(visibles(d, { ...d.defecto, modo: 'continuo' })).not.toContain('precio_escalonado');
    for (const modo of ['compradores', 'vendedores']) {
      expect(visibles(d, { ...d.defecto, modo })).toContain('precio_escalonado');
      expect(visibles(d, { ...d.defecto, modo })).not.toContain('a');
    }
  });

  it('comercio: el arancel solo con arancel y la cuota solo con cuota; sin curvas horizontales', async () => {
    const d = await CARGADORES_FUNDAMENTOS['comercio-internacional']();
    expect(visibles(d, { ...d.defecto, politica: 'libre' })).not.toEqual(
      expect.arrayContaining(['arancel']),
    );
    expect(visibles(d, { ...d.defecto, politica: 'arancel' })).toContain('arancel');
    expect(visibles(d, { ...d.defecto, politica: 'arancel' })).not.toContain('cuota');
    expect(visibles(d, { ...d.defecto, politica: 'cuota' })).toContain('cuota');
    expect(visibles(d, d.defecto)).not.toContain('elastica');
  });
});

describe('componentes Angular con los simuladores de Fundamentos', () => {
  for (const sim of SIMS) {
    it(`${sim}: el panel dibuja un control por parámetro visible y emite el valor al mover un deslizador`, async () => {
      const d = await CARGADORES_FUNDAMENTOS[sim]();
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
      // un valor no numérico (caja numérica vacía) no se emite
      Object.defineProperty(primero, 'value', { value: 'abc', configurable: true });
      primero.dispatchEvent(new Event('input'));
      expect(emitidos.length).toBe(1);
      // un selector emite su opción
      const opcion = el.querySelector('[role=radio]') as HTMLButtonElement | null;
      if (opcion) {
        opcion.click();
        expect(emitidos.length).toBe(2);
        expect(typeof emitidos[1].valor).toBe('string');
      }
    });

    it(`${sim}: el panel de resultados muestra tablas y la referencia a Mankiw`, async () => {
      const d = await CARGADORES_FUNDAMENTOS[sim]();
      TestBed.configureTestingModule({ imports: [ResultRenderer] });
      const fx = TestBed.createComponent(ResultRenderer);
      fx.componentRef.setInput('bloques', d.calcular({ ...d.defecto }).panel);
      fx.detectChanges();
      const el: HTMLElement = fx.nativeElement;
      expect(el.querySelectorAll('table.tabla-resultados').length).toBeGreaterThan(0);
      expect(el.querySelector('.referencia')?.textContent).toContain('Mankiw');
      expect(el.textContent).not.toContain('Monsalve');
      expect(el.textContent).not.toMatch(/NaN|undefined/);
    });
  }

  it('el modal de teoría muestra las seis secciones y la fuente de Mankiw', async () => {
    TestBed.configureTestingModule({ imports: [TeoriaModal] });
    const fx = TestBed.createComponent(TeoriaModal);
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
    const t = teoria('impuestos', {})!;
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
    expect(el.querySelector('.fuente')?.textContent).toContain('Mankiw');
  });
});
