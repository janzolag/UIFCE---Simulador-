/**
 * Paridad Python ↔ TypeScript del Bloque A (Fundamentos): compara las trazas de cada gráfica y las
 * tablas y avisos del panel contra el `calcular()` original en Python/Dash (fixtures generados por
 * tools/exportar_fixtures_fundamentos.py). Las gráficas deben coincidir punto a punto; el texto de los
 * avisos se compara sin los números (el formato de cifras de la aplicación es distinto al de Dash).
 */
import { describe, expect, it } from 'vitest';
import { Bloque } from '../core/tipos';
import fixtures from './paridad.fixtures.json';
import { CARGADORES_FUNDAMENTOS } from './registro';

interface Traza {
  name: string | null;
  n: number;
  ny: number;
  idx: number[];
  x: (number | null)[];
  y: (number | null)[];
}
type Celda = string | number | null;
type BloquePy = { t: 'tabla'; filas: Celda[][] } | { t: 'aviso'; texto: string };
interface Caso {
  params: Record<string, number | string>;
  trazas: Traza[];
  panel: BloquePy[];
}

/** Tablas y avisos del panel de la aplicación, en orden de aparición. */
function planos(bs: Bloque[]): BloquePy[] {
  return bs.flatMap((b): BloquePy[] => {
    switch (b.t) {
      case 'rejilla':
        return planos(b.hijos);
      case 'lectura':
        return planos(b.hijos);
      case 'tabla':
        return [{ t: 'tabla', filas: b.filas as Celda[][] }];
      case 'aviso':
        return [{ t: 'aviso', texto: b.texto }];
      default:
        return [];
    }
  });
}

const cerca = (a: number | null, b: number | null): boolean => {
  const noFinito = (v: number | null) => v === null || !Number.isFinite(v);
  if (noFinito(a) || noFinito(b)) return noFinito(a) && noFinito(b);
  return (
    Math.abs((a as number) - (b as number)) <=
    1e-8 * Math.max(1, Math.abs(a as number), Math.abs(b as number))
  );
};

const numeros = (v: unknown): (number | null)[] =>
  Array.isArray(v) ? v.map((e) => (typeof e === 'number' ? e : null)) : [];

/** Quita los números del texto (la app y Dash los formatean distinto). */
const sinNumeros = (s: string): string =>
  s.replace(/[-−]?\d+(?:[  ,]\d{3})*(?:\.\d+)?(?:e[+-]?\d+)?/gi, '#');

function celdaPy(v: Celda): number | string | null {
  if (v === 'inf') return Infinity;
  if (v === '-inf') return -Infinity;
  if (v === 'nan') return Number.NaN;
  return v;
}

function comparaCelda(ts: Celda, py: Celda, donde: string): void {
  const esperado = celdaPy(py);
  if (typeof esperado === 'number') {
    expect(typeof ts, donde).toBe('number');
    if (Number.isNaN(esperado)) expect(Number.isNaN(ts as number), donde).toBe(true);
    else expect(cerca(ts as number, esperado), `${donde}: ${ts} vs ${esperado}`).toBe(true);
  } else if (typeof esperado === 'string') {
    expect(typeof ts, donde).toBe('string');
    expect((ts as string).replace(/−/g, '-'), donde).toBe(esperado);
  } else expect(ts, donde).toBeNull();
}

for (const [simId, casos] of Object.entries(fixtures as unknown as Record<string, Caso[]>)) {
  describe(`paridad ${simId}`, () => {
    casos.forEach((caso, i) => {
      it(`caso ${i}: ${JSON.stringify(caso.params)}`, async () => {
        const def = await CARGADORES_FUNDAMENTOS[simId]();
        const r = def.calcular(caso.params);

        // gráfica: mismas trazas, mismos valores
        expect(r.fig.data.length, 'número de trazas').toBe(caso.trazas.length);
        caso.trazas.forEach((t, k) => {
          const d = r.fig.data[k];
          const x = numeros(d.x);
          const y = numeros(d.y);
          expect(x.length, `n(x) traza ${k} ${t.name}`).toBe(t.n);
          expect(y.length, `n(y) traza ${k} ${t.name}`).toBe(t.ny);
          t.idx.forEach((j, m) => {
            expect(cerca(x[j], t.x[m]), `x[${j}] traza ${k} ${t.name}: ${x[j]} vs ${t.x[m]}`).toBe(
              true,
            );
            if (j < y.length)
              expect(
                cerca(y[j], t.y[m]),
                `y[${j}] traza ${k} ${t.name}: ${y[j]} vs ${t.y[m]}`,
              ).toBe(true);
          });
        });

        // panel: mismas tablas (valores) y mismos avisos (texto sin cifras)
        const ts = planos(r.panel);
        expect(ts.length, 'bloques del panel').toBe(caso.panel.length);
        caso.panel.forEach((py, k) => {
          const b = ts[k];
          expect(b.t, `tipo del bloque ${k}`).toBe(py.t);
          if (py.t === 'aviso')
            expect(sinNumeros((b as { texto: string }).texto)).toBe(sinNumeros(py.texto));
          else {
            const filas = (b as { filas: Celda[][] }).filas;
            expect(filas.length, 'filas').toBe(py.filas.length);
            py.filas.forEach((fila, n) => {
              expect(filas[n][0], `fila ${n}`).toBe(fila[0]);
              comparaCelda(filas[n][1], fila[1], `fila «${fila[0]}»`);
            });
          }
        });
      });
    });
  });
}
