/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Auditoría triple (barrido transversal de TODAS las materias).
 *
 * Pruebas de propiedades sobre cada simulador registrado, sin depender del modelo concreto:
 *  1. Contrato de controles: el estado por defecto cae dentro del rango y sobre el paso de cada
 *     deslizador, y los selectores apuntan a opciones existentes.
 *  2. Barrido aleatorio (semilla fija) sobre la rejilla real de los deslizadores, más las esquinas
 *     (todo al mínimo / todo al máximo): `calcular` nunca lanza otra cosa que ErrorParametro (la página
 *     re-lanza cualquier otra excepción y se cae), no dibuja NaN/Infinity, los rangos de ejes son
 *     finitos y crecientes, toda curva visible con leyenda tiene nombre y ningún texto muestra «NaN»,
 *     «undefined» o «Infinity».
 *  3. Fichas de Teoría: existen para cada planteamiento, sus fórmulas y símbolos compilan en KaTeX
 *     (throwOnError), el ejercicio usa controles reales dentro de rango y se puede calcular sin error, y
 *     los símbolos de la tabla de variables no se repiten (la tabla usa `track v.simbolo`).
 *  4. Catálogo: todas las ecuaciones de las tarjetas compilan en KaTeX y cada simulador «listo» tiene
 *     cargador (no hay enlaces rotos en el menú).
 */
import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { MATERIAS } from './core/catalogo';
import { ErrorParametro } from './core/errores';
import { CARGADORES, TEORIAS } from './core/registro';
import { Control, Params, Simulacion, SimuladorDef } from './core/tipos';
import { CostoCubico } from './micro1/modelos/costos';
import { colusion, cournotNash } from './micro2/modelos/mercados';
import { ajustarTitulosAngostos } from './shared/plotly-chart';

const controlesDe = (d: SimuladorDef): Control[] => d.grupos.flatMap((g) => g.controles);

/** Generador pseudoaleatorio con semilla (mulberry32): el barrido es reproducible. */
function rng(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sobreRejilla = (c: Control, u: number): number => {
  const n = Math.round((c.max! - c.min!) / c.paso!);
  const k = Math.min(n, Math.floor(u * (n + 1)));
  return +(c.min! + k * c.paso!).toFixed(10);
};

/** Aplica el valor como lo haría la página: con el ajuste `alCambiar` del simulador. */
function mover(d: SimuladorDef, p: Params, id: string, v: number | string): Params {
  let nuevo: Params = { ...p, [id]: v };
  const ajuste = d.alCambiar?.(p, nuevo);
  if (ajuste) nuevo = { ...nuevo, ...ajuste };
  return nuevo;
}

function muestras(d: SimuladorDef, n: number, semilla: number): Params[] {
  const r = rng(semilla);
  const ctrls = controlesDe(d);
  const out: Params[] = [];
  const extremo = (lado: 'min' | 'max') => {
    let p: Params = { ...d.defecto };
    for (const c of ctrls) if (c.tipo === 'slider') p = mover(d, p, c.id, c[lado]!);
    return p;
  };
  out.push(extremo('min'), extremo('max'));
  // Cada deslizador solo en sus extremos (el resto por defecto): aísla divisiones por cero.
  for (const c of ctrls)
    if (c.tipo === 'slider') out.push(mover(d, d.defecto, c.id, c.min!), mover(d, d.defecto, c.id, c.max!));
  // Cada opción de cada selector con el resto por defecto.
  for (const c of ctrls) if (c.tipo === 'selector') for (const o of c.opciones ?? []) out.push(mover(d, d.defecto, c.id, o.valor));
  for (const pl of d.planteamientos?.opciones ?? []) out.push(mover(d, d.defecto, d.planteamientos!.param, pl.valor));
  for (let i = 0; i < n; i++) {
    let p: Params = { ...d.defecto };
    for (const pl of d.planteamientos ? [d.planteamientos] : [])
      p = mover(d, p, pl.param, pl.opciones[Math.floor(r() * pl.opciones.length)].valor);
    for (const c of ctrls) {
      if (c.tipo === 'selector') {
        const ops = c.opciones ?? [];
        if (ops.length && r() < 0.5) p = mover(d, p, c.id, ops[Math.floor(r() * ops.length)].valor);
      } else if (r() < 0.7) p = mover(d, p, c.id, sobreRejilla(c, r()));
    }
    out.push(p);
  }
  return out;
}

/** Problemas de una figura/panel ya calculados (lista vacía = sano). */
function problemas(s: Simulacion): string[] {
  const out: string[] = [];
  const malo = (v: unknown) => typeof v === 'number' && !Number.isFinite(v);
  for (const [i, t] of (s.fig.data ?? []).entries()) {
    for (const k of ['x', 'y', 'z']) {
      const arr = t[k];
      if (Array.isArray(arr)) {
        const flat = arr.flat(2);
        if (flat.some(malo)) out.push(`traza ${i} (${t.name ?? '?'}): ${k} con NaN/Infinity`);
      }
    }
    const visible = t.visible !== false && t.visible !== 'legendonly';
    const conLeyenda = t.showlegend !== false && (t.type ?? 'scatter') === 'scatter';
    if (visible && conLeyenda && (t.name === undefined || String(t.name).trim() === '') && s.fig.layout?.showlegend !== false)
      out.push(`traza ${i}: visible en la leyenda sin nombre ("trace ${i}")`);
  }
  for (const [k, ax] of Object.entries<any>(s.fig.layout ?? {})) {
    if (!/^[xy]axis\d*$/.test(k) || !ax?.range) continue;
    const [a, b] = ax.range;
    if (ax.type === 'log') continue;
    if (!Number.isFinite(a) || !Number.isFinite(b)) out.push(`${k}.range no finito: ${ax.range}`);
    else if (!(b > a) && !ax.autorange) out.push(`${k}.range no creciente: [${a}, ${b}]`);
  }
  const texto = JSON.stringify({ panel: s.panel, names: s.fig.data.map((t: any) => [t.name, t.text, t.hovertemplate]), ann: s.fig.layout?.annotations, title: s.fig.layout?.title });
  for (const mal of ['NaN', 'undefined', 'Infinity', '[object Object]'])
    if (new RegExp(`(?<![A-Za-z])${mal.replace(/[[\]]/g, '\\$&')}(?![A-Za-z])`).test(texto)) out.push(`texto con «${mal}»`);
  return out;
}

const SIMS = Object.entries(CARGADORES).flatMap(([materia, sims]) => Object.keys(sims).map((sim) => [materia, sim] as const));

describe.each(SIMS)('%s/%s', (materia, sim) => {
  it('contrato de controles: estado por defecto en rango, sobre el paso y con opciones válidas', async () => {
    const d = await CARGADORES[materia][sim]();
    for (const c of controlesDe(d)) {
      const v = d.defecto[c.id];
      if (c.tipo === 'slider') {
        expect(c.min, c.id).toBeTypeOf('number');
        expect(c.max! > c.min!, `${c.id}: max > min`).toBe(true);
        expect(c.paso! > 0, `${c.id}: paso > 0`).toBe(true);
        if (v === undefined) continue; // parámetros opcionales
        expect(Number(v), c.id).toBeGreaterThanOrEqual(c.min!);
        expect(Number(v), c.id).toBeLessThanOrEqual(c.max!);
        const pasos = (Number(v) - c.min!) / c.paso!;
        expect(Math.abs(pasos - Math.round(pasos)), `${c.id}=${v} fuera del paso ${c.paso}`).toBeLessThan(1e-6);
      } else {
        const valores = (c.opciones ?? []).map((o) => o.valor);
        expect(valores.length, c.id).toBeGreaterThan(0);
        if (v !== undefined) expect(valores, c.id).toContain(String(v));
      }
    }
    if (d.planteamientos) {
      const vals = d.planteamientos.opciones.map((o) => o.valor);
      expect(vals).toContain(String(d.defecto[d.planteamientos.param]));
    }
  });

  it('estado por defecto: calcula sin aviso de error y sin problemas de figura', async () => {
    const d = await CARGADORES[materia][sim]();
    const s = d.calcular(d.defecto);
    expect(JSON.stringify(s.panel).includes('"nivel":"error"'), JSON.stringify(s.panel).slice(0, 300)).toBe(false);
    expect(problemas(s)).toEqual([]);
  });

  it('barrido de propiedades (esquinas + 120 muestras): solo ErrorParametro, sin NaN, ejes y leyendas sanos', async () => {
    const d = await CARGADORES[materia][sim]();
    const fallas: string[] = [];
    for (const [i, p] of muestras(d, 120, 20261115 + sim.length).entries()) {
      try {
        const s = d.calcular(p);
        for (const pr of problemas(s)) fallas.push(`#${i} ${pr} :: ${JSON.stringify(p)}`);
      } catch (e) {
        if (!(e instanceof ErrorParametro)) fallas.push(`#${i} excepción ${(e as Error)?.message} :: ${JSON.stringify(p)}`);
      }
    }
    expect([...new Set(fallas)].slice(0, 8)).toEqual([]);
  });

  it('ficha de Teoría por planteamiento: KaTeX válido, ejercicio con controles reales y calculable', async () => {
    const d = await CARGADORES[materia][sim]();
    const teoria = await TEORIAS[materia]();
    const porId = new Map(controlesDe(d).map((c) => [c.id, c]));
    const variantes: Params[] = [d.defecto];
    for (const pl of d.planteamientos?.opciones ?? []) variantes.push(mover(d, d.defecto, d.planteamientos!.param, pl.valor));
    for (const p of variantes) {
      const t = teoria(sim, p);
      expect(t, `${sim} sin ficha para ${JSON.stringify(p).slice(0, 80)}`).not.toBeNull();
      for (const fm of t!.formulas) expect(() => katex.renderToString(fm.trim().replace(/^\$+|\$+$/g, ''), { throwOnError: true }), fm).not.toThrow();
      const simbolos = (t!.variables ?? []).map((v) => v.simbolo);
      expect(new Set(simbolos).size, `símbolos repetidos en ${t!.titulo}: ${simbolos}`).toBe(simbolos.length);
      for (const s of simbolos) expect(() => katex.renderToString(s.trim().replace(/^\$+|\$+$/g, ''), { throwOnError: true }), s).not.toThrow();
      const ej = t!.ejemplo.parametros;
      for (const [id, v] of Object.entries(ej)) {
        const c = porId.get(id);
        if (!c) {
          expect(id in d.defecto, `${t!.titulo}: el ejercicio usa «${id}», que no es control ni parámetro`).toBe(true);
          continue;
        }
        if (c.tipo === 'slider') {
          expect(Number(v), `${t!.titulo}: ${id}`).toBeGreaterThanOrEqual(c.min!);
          expect(Number(v), `${t!.titulo}: ${id}`).toBeLessThanOrEqual(c.max!);
        } else expect((c.opciones ?? []).map((o) => o.valor), `${t!.titulo}: ${id}`).toContain(String(v));
      }
      // «Cargar en la gráfica» reemplaza los parámetros: el ejercicio debe ser un estado completo.
      const s = d.calcular({ ...ej });
      expect(JSON.stringify(s.panel).includes('"nivel":"error"'), `${t!.titulo}: el ejercicio da error`).toBe(false);
      expect(problemas(s), t!.titulo).toEqual([]);
    }
  });
});

describe('Catálogo', () => {
  it('las ecuaciones de las tarjetas compilan en KaTeX y cada simulador listo tiene cargador', () => {
    for (const m of MATERIAS)
      for (const s of m.simuladores) {
        for (const tex of [s.ecuacion, s.ecuacionResumen].filter(Boolean) as string[])
          expect(() => katex.renderToString(tex.trim().replace(/^\$+|\$+$/g, ''), { throwOnError: true }), `${m.id}/${s.id}`).not.toThrow();
        if (s.listo) expect(CARGADORES[m.id]?.[s.id], `${m.id}/${s.id}`).toBeTypeOf('function');
      }
  });
  it('no hay cargadores huérfanos (registrados pero ausentes del catálogo)', () => {
    for (const [mid, sims] of Object.entries(CARGADORES)) {
      const m = MATERIAS.find((x) => x.id === mid);
      expect(m, mid).toBeDefined();
      for (const id of Object.keys(sims)) expect(m!.simuladores.some((s) => s.id === id), `${mid}/${id}`).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ regresiones de esta auditoría */

describe('Regresiones de la auditoría triple', () => {
  it('títulos de panel largos se parten en móvil; los rótulos en coordenadas de datos no se tocan', () => {
    const layout: any = {
      margin: { l: 56, r: 20, t: 34, b: 44 },
      annotations: [
        { text: '<b>Caja de Edgeworth (origen de A abajo a la izquierda, de B arriba a la derecha)</b>', x: 0, y: 1, xref: 'x domain', yref: 'y domain', xanchor: 'left', yanchor: 'bottom', showarrow: false, font: { size: 12 } },
        { text: 'Lente: asignaciones que mejoran a ambos y algo más de texto largo', x: 6, y: 3, xref: 'x', yref: 'y', showarrow: false },
        { text: 'Corto', x: 0.5, y: 1, xref: 'paper', yref: 'paper', xanchor: 'center', yanchor: 'bottom', showarrow: false },
      ],
    };
    ajustarTitulosAngostos(layout, 325);
    const [t, rot, corto] = layout.annotations;
    expect(t.text).toMatch(/^<b>.*<br>.*<\/b>$/);
    for (const linea of t.text.replace(/<\/?b>/g, '').split('<br>')) expect(linea.length * 0.58 * t.font.size).toBeLessThanOrEqual(325 - 56);
    expect(rot.text).not.toContain('<br>');
    expect(corto.text).toBe('Corto');
  });

  it('figuras de dos paneles lado a lado traen variante apilada para móvil', async () => {
    for (const [m, s] of [['fundamentos', 'elasticidades'], ['fundamentos', 'impuestos'], ['fundamentos', 'ventaja-comparativa'], ['micro1', 'demanda'], ['micro1', 'competencia-perfecta']]) {
      const d = await CARGADORES[m][s]();
      const f = d.calcular(d.defecto).fig;
      expect(f.movil, `${m}/${s}`).toBeDefined();
      expect(f.movil!.layout.xaxis.domain, `${m}/${s}`).toEqual([0, 1]);
      expect(f.movil!.layout.xaxis2.domain, `${m}/${s}`).toEqual([0, 1]);
      // Los títulos siguen al dominio de su panel (no a coordenadas de papel fijas).
      const titulos = (f.layout.annotations ?? []).filter((a: any) => a.yanchor === 'bottom' && /domain$/.test(String(a.xref)));
      expect(titulos.length, `${m}/${s}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('Solow: la estrella de k oro del panel B está sobre la recta de reposición', async () => {
    const d = await CARGADORES['macro2']['solow']();
    const f = d.calcular(d.defecto).fig;
    const t = f.data.find((x: any) => String(x.name).startsWith('k de la regla de oro'));
    const { n, g, delta } = d.defecto as any;
    expect(t.y[0]).toBeCloseTo((Number(n) + Number(g) + Number(delta)) * t.x[0], 10);
  });

  it('costos con CF = 0 y b = 0: el mínimo del CMe es finito (CMe(0) = a)', () => {
    const k = new CostoCubico(0, 1, 0, 0.05);
    expect(k.precio_nivelacion()).toBe(1);
    expect(k.CMe(0)).toBe(1);
    expect(new CostoCubico(20, 10, 2, 0.5).CMe(0)).toBe(Infinity);
  });

  it('Slutsky (Micro 1) con M = 0 da aviso de error, no una gráfica vacía de rango [0, 0]', async () => {
    const d = await CARGADORES['micro1']['slutsky']();
    const s = d.calcular({ ...d.defecto, M: 0 });
    expect(JSON.stringify(s.panel)).toContain('"nivel":"error"');
  });
  it('colusión (cartel): Y = (a − c)/2b, reparto igual con costos iguales y la empresa barata produce todo', () => {
    const q = { a: 120, b: 1, c1: 0, c2: 0 };
    const k = colusion(q);
    expect(k.y1 + k.y2).toBeCloseTo(60, 10);
    expect(k.y1).toBeCloseTo(30, 10);
    expect(k.p).toBeCloseTo(60, 10);
    const asim = colusion({ a: 100, b: 2, c1: 10, c2: 20 });
    expect(asim.y1).toBeCloseTo(22.5, 10);
    expect(asim.y2).toBe(0);
    // El cartel produce menos y cobra más que Cournot.
    expect(k.p).toBeGreaterThan(cournotNash(q).p);
  });
});
