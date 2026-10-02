/**
 * Paridad Python ↔ TypeScript: compara trazas y texto del panel de cada simulador contra los
 * resultados del `calcular()` original (fixtures generados por tools/exportar_fixtures.py).
 */
import { describe, expect, it } from 'vitest';
import fixtures from './paridad.fixtures.json';
import { CARGADORES_MICRO1 } from './registro';
import { fmt } from '../core/formato';
import { Bloque } from '../core/tipos';

interface Traza { name: string | null; n: number; ny: number; idx: number[]; x: (number | null)[]; y: (number | null)[] }
interface Caso { params: Record<string, number | string>; trazas: Traza[]; panel: string[] }

function textos(bs: Bloque[]): string[] {
  return bs.flatMap((b): string[] => {
    switch (b.t) {
      case 'rejilla': return textos(b.hijos);
      case 'lectura': return [b.titulo, ...textos(b.hijos)];
      case 'tabla':
        return [
          ...(b.encabezado ?? []),
          ...b.filas.flatMap((f) => [String(f[0]), ...f.slice(1).map((v) => fmt(v))]),
        ];
      case 'aviso': return [b.texto];
      case 'texto': return [b.texto];
      case 'ref': return ['Monsalve (2017) · ', b.texto];
    }
  });
}

const cerca = (a: number | null, b: number | null): boolean => {
  if (a === null || b === null || Number.isNaN(a) || Number.isNaN(b) || !Number.isFinite(a) || !Number.isFinite(b))
    return (a === null || !Number.isFinite(a) || Number.isNaN(a)) && (b === null || !Number.isFinite(b) || Number.isNaN(b));
  return Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b));
};

const numeros = (v: unknown): (number | null)[] => (Array.isArray(v) ? v.map((e) => (typeof e === 'number' ? e : null)) : []);
const normalizar = (s: string) => s.replace(/[-−]?\d+(\.\d+)?(e[+-]\d+)?/gi, '#');

for (const [simId, casos] of Object.entries(fixtures as unknown as Record<string, Caso[]>)) {
  describe(`paridad ${simId}`, () => {
    casos.forEach((caso, i) => {
      it(`caso ${i}: ${JSON.stringify(caso.params)}`, async () => {
        const def = await CARGADORES_MICRO1[simId]();
        const r = def.calcular(caso.params);
        const esError = caso.trazas.length === 0;
        if (esError) {
          expect(r.fig.data.length).toBe(0);
          expect(r.panel.length).toBe(1);
          expect(normalizar(textos(r.panel)[0])).toBe(normalizar(caso.panel[0]));
          return;
        }
        expect(r.fig.data.length).toBe(caso.trazas.length);
        caso.trazas.forEach((t, k) => {
          const d = r.fig.data[k];
          const x = numeros(d.x);
          const y = numeros(d.y);
          expect(x.length, `n(x) traza ${k} ${t.name}`).toBe(t.n);
          expect(y.length, `n(y) traza ${k} ${t.name}`).toBe(t.ny);
          t.idx.forEach((j, m) => {
            expect(cerca(x[j], t.x[m]), `x[${j}] traza ${k} ${t.name}: ${x[j]} vs ${t.x[m]}`).toBe(true);
            if (j < y.length) expect(cerca(y[j], t.y[m]), `y[${j}] traza ${k} ${t.name}: ${y[j]} vs ${t.y[m]}`).toBe(true);
          });
        });
        expect(textos(r.panel)).toEqual(caso.panel);
      });
    });
  });
}
