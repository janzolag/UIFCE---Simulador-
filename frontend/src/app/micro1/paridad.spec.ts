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
      case 'cadena': return [b.choque, b.transmision, b.resultado, ...(b.largo ? [b.largo] : [])];
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

// Monopolio y oligopolio pasaron a Micro 3 (simuladores nuevos con otra notación): sus fixtures ya no aplican.
const REDIBUJADAS = new Set(['Curva de indiferencia óptima', 'U inicial', 'U final']);
const TOPE_ORIGINAL = 12 - 1e-9;

/**
 * Casos donde el original tenía un defecto que la auditoría triple (2026-11) corrigió a propósito; su
 * comportamiento nuevo se prueba en auditoria-triple.spec.ts:
 *  - Slutsky con M = 0: el original dibujaba ejes de rango [0, 0]; ahora es un aviso de error.
 *  - Costo cúbico con CF = 0 y b = 0: el original daba CMe(0) = ∞ (punto de nivelación sin dibujar y
 *    eje y infinito); ahora CMe(0) = CVMe(0) = a.
 *  - Producción CES: el original normalizaba los pesos (δ = α/(α+β), ν = α+β), que no es la CES de
 *    Monsalve; ahora α y β son los pesos a y b de A·[a·x^ρ + b·y^ρ]^(ν/ρ) (ver produccion-ces.spec.ts).
 */
const CORREGIDO = (simId: string, p: Record<string, number | string>): boolean =>
  (simId === 'slutsky' && Number(p['M']) === 0) ||
  ((simId === 'costos' || simId === 'competencia-perfecta') && Number(p['CF']) === 0 && Number(p['b']) === 0) ||
  (simId === 'produccion' && p['tec'] === 'ces');

const vigentes = Object.entries(fixtures as unknown as Record<string, Caso[]>).filter(([id]) => id in CARGADORES_MICRO1);

for (const [simId, casos] of vigentes) {
  describe(`paridad ${simId}`, () => {
    casos.forEach((caso, i) => {
      it.skipIf(CORREGIDO(simId, caso.params))(`caso ${i}: ${JSON.stringify(caso.params)}`, async () => {
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
            // Curvas de indiferencia redibujadas hasta el borde de la gráfica: el original las cortaba en
            // y = 15 (y los brazos de Leontief en 12). Se comparan solo los puntos que el original sí dibujaba.
            if (REDIBUJADAS.has(t.name ?? '') && (t.y[m] === null || (t.x[m] ?? 0) >= TOPE_ORIGINAL || (t.y[m] ?? 0) >= TOPE_ORIGINAL)) return;
            expect(cerca(x[j], t.x[m]), `x[${j}] traza ${k} ${t.name}: ${x[j]} vs ${t.x[m]}`).toBe(true);
            if (j < y.length) expect(cerca(y[j], t.y[m]), `y[${j}] traza ${k} ${t.name}: ${y[j]} vs ${t.y[m]}`).toBe(true);
          });
        });
        expect(textos(r.panel)).toEqual(caso.panel);
      });
    });
  });
}
