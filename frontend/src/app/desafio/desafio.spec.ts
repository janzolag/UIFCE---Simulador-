/**
 * Pruebas del Modo Desafío: cada reto es alcanzable con los deslizadores reales del simulador (rango y
 * paso) usando el mismo motor del modelo, el estado inicial NO cumple la meta, la figura del reto se
 * calcula sin errores y el progreso se guarda con tolerancia a fallos.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { buscarMateria, buscarSimulador } from '../core/catalogo';
import { CARGADORES } from '../core/registro';
import { Control, SimuladorDef } from '../core/tipos';
import { CHALLENGES, retosDe } from './challengesData';
import { MODELOS_CON_RETOS } from './indice';
import {
  CLAVE_PROGRESO,
  TOLERANCIA,
  dentroTolerancia,
  estadoInicial,
  figuraDesafio,
  leerProgreso,
  progresoVacio,
  registrarIntento,
  sanear,
  verificar,
} from './motor';

const controles = (d: SimuladorDef): Control[] => d.grupos.flatMap((g) => g.controles);
const esError = (panel: unknown) => JSON.stringify(panel).includes('"nivel":"error"');

describe('Banco de retos', () => {
  it('tiene tres retos por modelo, ids únicos y modelos publicados', () => {
    const ids = new Set(CHALLENGES.map((r) => r.id));
    expect(ids.size).toBe(CHALLENGES.length);
    const modelos = new Set(CHALLENGES.map((r) => `${r.materia}/${r.sim}`));
    for (const m of modelos) {
      const [materia, sim] = m.split('/');
      expect(retosDe(materia, sim).length, m).toBe(3);
      const mat = buscarMateria(materia);
      expect(mat && buscarSimulador(mat, sim)?.listo, m).toBe(true);
      expect(CARGADORES[materia]?.[sim], m).toBeTypeOf('function');
    }
  });

  it('el índice liviano de la barra superior coincide con el banco', () => {
    expect([...MODELOS_CON_RETOS].sort()).toEqual([...new Set(CHALLENGES.map((r) => `${r.materia}/${r.sim}`))].sort());
  });

  it('textos breves: enunciado ≤ 3 líneas, explicación de 2 frases y pista de 1', () => {
    const frases = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/).filter(Boolean).length;
    for (const r of CHALLENGES) {
      expect(r.enunciado.length, r.id).toBeLessThanOrEqual(240);
      expect(frases(r.explicacion), r.id).toBe(2);
      expect(frases(r.pista), r.id).toBe(1);
    }
  });
});

describe.each(CHALLENGES.map((r) => [r.id, r] as const))('Reto %s', (_id, reto) => {
  let def: SimuladorDef;
  beforeEach(async () => {
    def = await CARGADORES[reto.materia][reto.sim]();
  });

  it('los controles existen y la solución está dentro del rango y sobre el paso del deslizador', () => {
    const porId = new Map(controles(def).map((c) => [c.id, c]));
    expect(Object.keys(reto.solucion).sort()).toEqual([...reto.controles].sort());
    for (const id of reto.controles) {
      const c = porId.get(id);
      expect(c?.tipo, id).toBe('slider');
      for (const v of [Number(reto.solucion[id]), Number(estadoInicial(reto, def.defecto)[id])]) {
        expect(v, id).toBeGreaterThanOrEqual(c!.min!);
        expect(v, id).toBeLessThanOrEqual(c!.max!);
        const pasos = (v - c!.min!) / c!.paso!;
        expect(Math.abs(pasos - Math.round(pasos)), `${id} = ${v} fuera del paso`).toBeLessThan(1e-6);
      }
    }
  });

  it('el estado inicial NO cumple la meta', () => {
    const v = verificar(reto, estadoInicial(reto, def.defecto));
    expect(v.ok).toBe(false);
  });

  it('existe una solución alcanzable que cumple la meta con ±1,5 %', () => {
    const p = { ...estadoInicial(reto, def.defecto), ...reto.solucion };
    const v = verificar(reto, p);
    for (const m of v.mediciones) expect(m.ok, `${m.objetivo.etiqueta}: ${m.valor} vs ${m.objetivo.meta}`).toBe(true);
  });

  it('el simulador dibuja el estado inicial y la solución sin errores, con zona y fantasmas', () => {
    const p0 = estadoInicial(reto, def.defecto);
    const p1 = { ...p0, ...reto.solucion };
    const r0 = def.calcular(p0);
    const r1 = def.calcular(p1);
    expect(esError(r0.panel)).toBe(false);
    expect(esError(r1.panel)).toBe(false);
    const fig = figuraDesafio(r1.fig, r0.fig, reto);
    expect(fig.data.length).toBeGreaterThan(r1.fig.data.length);
    const zonas = reto.objetivos.filter((o) => o.zona).length;
    expect(fig.layout.shapes.length - (r1.fig.layout.shapes?.length ?? 0)).toBe(2 * zonas);
    // Los ejes de la zona existen en la figura del simulador.
    for (const o of reto.objetivos)
      if (o.zona) expect(r1.fig.layout[`${o.zona.eje}axis${o.zona.panel ?? ''}`], o.etiqueta).toBeDefined();
  });
});

describe('Motor', () => {
  it('tolerancia de ±1,5 %', () => {
    expect(TOLERANCIA).toBe(0.015);
    expect(dentroTolerancia(101.4, 100)).toBe(true);
    expect(dentroTolerancia(98.6, 100)).toBe(true);
    expect(dentroTolerancia(101.6, 100)).toBe(false);
    expect(dentroTolerancia(-0.609, -0.6)).toBe(true);
    expect(dentroTolerancia(Number.NaN, 1)).toBe(false);
  });

  it('un parámetro imposible cuenta como no logrado, sin romper la página', () => {
    const reto = CHALLENGES.find((r) => r.id === 'm2-solow-1')!;
    const v = verificar(reto, { A: 1, alpha: 0.5, s: 0.3, delta: 0, n: 0, g: 0, ds: 0, dn: 0, dA: 0 });
    expect(v.ok).toBe(false);
    expect(v.mediciones[0].valor).toBeNull();
  });

  it('racha: sube con retos nuevos, se reinicia al fallar y no cambia al repetir', () => {
    let p = progresoVacio();
    p = registrarIntento(p, 'a', true);
    p = registrarIntento(p, 'b', true);
    expect(p.racha).toBe(2);
    p = registrarIntento(p, 'b', true);
    expect(p.racha).toBe(2);
    p = registrarIntento(p, 'c', false);
    expect(p.racha).toBe(0);
    expect(p.mejorRacha).toBe(2);
    expect(Object.keys(p.resueltos)).toEqual(['a', 'b']);
  });

  it('progreso corrupto o sin almacenamiento no rompe nada', () => {
    expect(sanear(null)).toEqual(progresoVacio());
    expect(sanear({ resueltos: { x: 'si', y: true }, racha: -2, mejorRacha: 1.5 })).toEqual({ resueltos: { y: true }, racha: 0, mejorRacha: 0 });
    localStorage.setItem(CLAVE_PROGRESO, '{no es json');
    expect(leerProgreso()).toEqual(progresoVacio());
    localStorage.removeItem(CLAVE_PROGRESO);
  });
});
