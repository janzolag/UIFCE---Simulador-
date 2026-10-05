/**
 * Fichas de teoría: estructura (2–3 ideas, ≤ 2 fórmulas), sin valores inválidos, y que el ejercicio
 * se pueda cargar en el simulador correspondiente sin producir un error de parámetros.
 */
import { describe, expect, it } from 'vitest';
import { CARGADORES_MICRO1 } from './registro';
import { teoria } from './teoria';

const VARIANTES: Record<string, { id: string; valores: string[] } | null> = {
  'restriccion-presupuestal': null,
  preferencias: { id: 'familia', valores: ['cd', 'leontief', 'lineal', 'cuasi', 'separable', 'stone'] },
  'eleccion-optima': { id: 'familia', valores: ['cd', 'leontief', 'lineal', 'cuasi', 'separable', 'stone'] },
  slutsky: { id: 'familia', valores: ['cd', 'separable', 'leontief', 'cuasi', 'stone', 'giffen'] },
  demanda: { id: 'familia', valores: ['cd', 'leontief', 'lineal', 'cuasi', 'separable', 'stone'] },
  produccion: { id: 'tec', valores: ['cd', 'ces', 'leontief', 'lineal', 'separable'] },
  costos: { id: 'modo', valores: ['corto', 'largo'] },
  'competencia-perfecta': null,
  monopolio: null,
  oligopolio: null,
};

for (const [sim, variante] of Object.entries(VARIANTES)) {
  for (const valor of variante ? variante.valores : [null]) {
    describe(`teoría ${sim}${valor ? ` · ${valor}` : ''}`, () => {
      it('tiene estructura completa y sin valores inválidos', async () => {
        const def = await CARGADORES_MICRO1[sim]();
        const p = variante && valor ? { ...def.defecto, [variante.id]: valor } : { ...def.defecto };
        const t = teoria(sim, p);
        expect(t).not.toBeNull();
        if (!t) return;
        expect(t.conceptos.length).toBeGreaterThanOrEqual(2);
        expect(t.conceptos.length).toBeLessThanOrEqual(3);
        expect(t.formulas.length).toBeGreaterThanOrEqual(1);
        expect(t.formulas.length).toBeLessThanOrEqual(2);
        const texto = [t.titulo, ...t.conceptos, t.ejemplo.enunciado, t.ejemplo.resultado, t.ejemplo.prueba].join(' ');
        expect(texto).not.toMatch(/NaN|undefined|Infinity|\[object/);
        expect(t.ejemplo.prueba.length).toBeGreaterThan(10);
        if (variante && valor) expect(t.ejemplo.parametros[variante.id]).toBe(valor);
      });

      it('el ejercicio se resuelve en el simulador (sin error de parámetros)', async () => {
        const def = await CARGADORES_MICRO1[sim]();
        const p = variante && valor ? { ...def.defecto, [variante.id]: valor } : { ...def.defecto };
        const t = teoria(sim, p)!;
        const r = def.calcular({ ...def.defecto, ...t.ejemplo.parametros });
        const error = JSON.stringify(r.panel).includes('"nivel":"error"');
        expect(error).toBe(false);
        expect(r.fig.data.length).toBeGreaterThan(0);
      });
    });
  }
}

describe('teoría de un simulador desconocido', () => {
  it('devuelve null', () => expect(teoria('no-existe', {})).toBeNull());
});
