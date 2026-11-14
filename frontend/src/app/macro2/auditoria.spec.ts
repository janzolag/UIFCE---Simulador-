/**
 * Triple auditoría de Macro 2 (paneles enlazados y motor de choques).
 *  Pasada 1 · notación y ejes: títulos de ejes, paneles enlazados (`matches`) y variante móvil apilada.
 *  Pasada 2 · equilibrio: la solución analítica coincide con el cruce de las curvas graficadas a 4 decimales
 *             (cruce de polilíneas para curvas lineales; para curvas no lineales, cada punto graficado está
 *             sobre la función analítica y el equilibrio la satisface).
 *  Pasada 3 · bordes: cada botón de choque × cada deslizador en sus extremos, sin divisiones por cero
 *             ni NaN, y los resultados clásicos de estática comparativa (Krugman y Obstfeld).
 */
import { describe, expect, it } from 'vitest';
import { Bloque, Control, Params, SimuladorDef, Simulacion } from '../core/tipos';
import { CARGADORES_MACRO2 } from './registro';
import { ParamsDDAA, ResDDAA, equilibrioDDAA, curvaAA, curvaDD } from './modelos/ddaa';
import { equilibrioISLM2, isY, lmR } from './modelos/islm';
import { estadoEstacionario, produccion } from './modelos/solow';
import * as ISLM from './simuladores/is-lm';
import * as MF from './simuladores/dd-aa';
import * as AB from './simuladores/mundell-fleming';
import { equilibrioAbierta, etapas, exportaciones, fpp, importaciones, rendimientoExterno } from './modelos/abierta';
import * as DAOA from './simuladores/da-oa';
import * as SOLOW from './simuladores/solow';
import * as PH from './simuladores/phillips';

const DEC4 = 5e-5; // «4 decimales»
const controles = (d: SimuladorDef): Control[] => d.grupos.flatMap((g) => g.controles);
const esError = (r: Simulacion) => JSON.stringify(r.panel).includes('"nivel":"error"');
const json = (r: Simulacion) => JSON.stringify(r);
const traza = (r: Simulacion, nombre: string, eje = 'x') =>
  r.fig.data.find((t) => t.name === nombre && (t.xaxis ?? 'x') === eje);
const bloques = (bs: Bloque[]): Bloque[] =>
  bs.flatMap((b) => (b.t === 'rejilla' || b.t === 'lectura' ? [b, ...bloques(b.hijos)] : [b]));
const cadenaDe = (r: Simulacion) => bloques(r.panel).find((b) => b.t === 'cadena');

/** Aplica un botón de choque igual que la página (con alCambiar). */
function pulsar(d: SimuladorDef, base: Params, valor: string): Params {
  const nuevo = { ...base, choque: valor };
  return { ...nuevo, ...(d.alCambiar?.(base, nuevo) ?? {}) };
}

/** Cruces de dos polilíneas (segmento contra segmento). */
function cruces(a: { x: (number | null)[]; y: (number | null)[] }, b: { x: (number | null)[]; y: (number | null)[] }) {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < a.x.length; i++) {
    const [x1, y1, x2, y2] = [a.x[i], a.y[i], a.x[i + 1], a.y[i + 1]];
    if ([x1, y1, x2, y2].some((v) => v === null)) continue;
    for (let j = 0; j + 1 < b.x.length; j++) {
      const [x3, y3, x4, y4] = [b.x[j], b.y[j], b.x[j + 1], b.y[j + 1]];
      if ([x3, y3, x4, y4].some((v) => v === null)) continue;
      const den = (x1! - x2!) * (y3! - y4!) - (y1! - y2!) * (x3! - x4!);
      if (Math.abs(den) < 1e-15) continue;
      const t = ((x1! - x3!) * (y3! - y4!) - (y1! - y3!) * (x3! - x4!)) / den;
      const u = -((x1! - x2!) * (y1! - y3!) - (y1! - y2!) * (x1! - x3!)) / den;
      if (t >= -1e-12 && t <= 1 + 1e-12 && u >= -1e-12 && u <= 1 + 1e-12)
        out.push([x1! + t * (x2! - x1!), y1! + t * (y2! - y1!)]);
    }
  }
  return out;
}
function cruzaEn(a: any, b: any, x: number, y: number): void {
  const cs = cruces(a, b);
  expect(cs.length, `sin cruce entre ${a.name} y ${b.name}`).toBeGreaterThan(0);
  const mejor = cs.reduce((m, c) => (Math.hypot(c[0] - x, c[1] - y) < Math.hypot(m[0] - x, m[1] - y) ? c : m));
  expect(Math.abs(mejor[0] - x), `${a.name}∩${b.name} x`).toBeLessThan(DEC4);
  expect(Math.abs(mejor[1] - y), `${a.name}∩${b.name} y`).toBeLessThan(DEC4);
}
/** Marcador por nombre en un panel. */
const marcador = (r: Simulacion, nombre: string, eje = 'x') =>
  r.fig.data.find((t) => t.name === nombre && t.mode?.includes('markers') && (t.xaxis ?? 'x') === eje);

/* ================================================================ Pasada 1 */
describe('Pasada 1 · notación, ejes y paneles enlazados', () => {
  const casos: [string, string[], Record<string, string>][] = [
    ['is-lm', ['', '2', '3'], { xaxis2: 'x', yaxis3: 'y' }],
    ['mundell-fleming', ['', '2', '3', '4', '5'], { yaxis3: 'y2', xaxis4: 'x' }],
    ['dd-aa', ['', '2'], { yaxis2: 'y' }],
    ['da-oa', ['', '2'], {}],
    ['solow', ['', '2'], { xaxis2: 'x' }],
  ];
  for (const [sim, ids, enlaces] of casos)
    it(`${sim}: ${ids.length} paneles con títulos, rangos, enlaces y versión móvil apilada`, async () => {
      const d = await CARGADORES_MACRO2[sim]();
      const r = d.calcular({ ...d.defecto });
      const L = r.fig.layout;
      for (const id of ids) {
        for (const e of ['xaxis', 'yaxis']) {
          expect(L[e + id].range, e + id).toHaveLength(2);
          expect(L[e + id].domain, e + id).toHaveLength(2);
        }
        expect(L['yaxis' + id].title.text.length, 'yaxis' + id).toBeGreaterThan(0);
      }
      for (const [eje, con] of Object.entries(enlaces)) expect(L[eje].matches).toBe(con);
      // Móvil: dominios apilados sin solaparse en vertical.
      const m = r.fig.movil!;
      expect(m.alto).toBeGreaterThan(d.alto!);
      const ys = ids.map((id) => m.layout['yaxis' + id].domain as number[]).sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < ys.length; i++) expect(ys[i][0]).toBeGreaterThanOrEqual(ys[i - 1][1]);
      for (const id of ids) expect(m.layout['xaxis' + id].domain).toEqual([0, 1]);
      // Títulos de los ejes según los manuales.
      expect(JSON.stringify(L)).not.toMatch(/undefined|NaN/);
    });

  it('notación: IS-LM en (Y, r); DD-AA en (Y, E); DA-OA en (Y, P) y Phillips en (u, π); Solow en k', async () => {
    const t = async (s: string) => (await CARGADORES_MACRO2[s]()).calcular({ ...(await CARGADORES_MACRO2[s]()).defecto }).fig.layout;
    const islm = await t('is-lm');
    expect(islm.xaxis.title.text).toBe('Producto Y');
    expect(islm.yaxis.title.text).toBe('Tasa de interés r (%)');
    expect(islm.yaxis2.title.text).toBe('Gasto planeado AE');
    expect(islm.xaxis3.title.text).toBe('Saldos reales M/P');
    const mf = await t('dd-aa');
    expect(mf.yaxis.title.text).toMatch(/^Tipo de cambio E/);
    expect(mf.xaxis2.title.text).toBe('Tasa de rendimiento (%)');
    const da = await t('da-oa');
    expect(da.yaxis.title.text).toBe('Nivel de precios P');
    expect(da.xaxis2.title.text).toBe('Desempleo u (%)');
    const so = await t('solow');
    expect(so.xaxis.title.text).toBe('Capital por trabajador efectivo k');
  });
});

/* ================================================================ Pasada 2 */
describe('Pasada 2 · solución analítica = cruce graficado (4 decimales)', () => {
  it('IS-LM: IS∩LM, AE∩45° y oferta∩demanda de dinero, en E₀ y tras cada choque', async () => {
    const d = await CARGADORES_MACRO2['is-lm']();
    for (const c of ISLM.CHOQUES) {
      const p = pulsar(d, { ...d.defecto }, c.valor);
      const r = d.calcular(p);
      const [, n] = ISLM.escenarios(p as never);
      const e = equilibrioISLM2(n);
      cruzaEn(traza(r, 'IS'), traza(r, 'LM'), e.Y, e.r);
      expect(isY(n, e.r)).toBeCloseTo(e.Y, 8);
      expect(lmR(n, e.Y)).toBeCloseTo(e.r, 8);
      const ae = r.fig.data.find((t) => t.xaxis === 'x2' && String(t.name).startsWith('AE (') && !t.name.includes('('+'inicial') && t.line.dash === undefined);
      cruzaEn(ae, traza(r, 'AE = Y (45°)', 'x2'), e.Y, e.Y);
      const ms = traza(r, 'Oferta M/P', 'x3');
      const md = r.fig.data.find((t) => t.xaxis === 'x3' && String(t.name).startsWith('L(Y, r)') && t.line.dash === undefined);
      cruzaEn(ms, md, n.m, e.r);
      const fin = marcador(r, c.valor === 'ninguno' ? 'Equilibrio (Y*, r*)' : 'Equilibrio final');
      expect(fin.x[0]).toBeCloseTo(e.Y, 4);
      expect(fin.y[0]).toBeCloseTo(e.r, 4);
    }
  });

  it('IS-LM: E₁ fiscal = multiplicador keynesiano a r constante; E₁ monetario = efecto liquidez a Y constante', async () => {
    const d = await CARGADORES_MACRO2['is-lm']();
    const p = pulsar(d, { ...d.defecto }, 'fiscal') as never;
    const s = ISLM.pasos(p);
    expect(s.e1!.Y - s.r0.Y).toBeCloseTo(100 / (1 - 0.75), 4); // ΔG/(1 − c) = 400
    expect(s.e1!.r).toBe(s.r0.r);
    expect(s.r2.Y).toBeCloseTo(1333.3333, 4);
    expect(s.r2.r).toBeCloseTo(6.6667, 4);
    const m = ISLM.pasos(pulsar(d, { ...d.defecto }, 'contraccion') as never);
    expect(m.e1!.Y).toBe(m.r0.Y);
    expect(m.e1!.r).toBeCloseTo((0.5 * 1200 - 400) / 25, 10); // 8 %
    expect(m.r2.r).toBeGreaterThan(m.r0.r);
    expect(m.r2.Y).toBeLessThan(m.r0.Y);
  });

  it('DD-AA: cada curva graficada está sobre DD y AA analíticas y el equilibrio las satisface', async () => {
    const d = await CARGADORES_MACRO2['dd-aa']();
    for (const regimen of ['flotante', 'fijo'])
      for (const movilidad of ['perfecta', 'imperfecta'])
        for (const c of MF.CHOQUES) {
          const p = pulsar(d, { ...d.defecto, regimen, movilidad }, c.valor);
          const r = d.calcular(p);
          if (esError(r)) continue;
          const s = MF.pasos(p as never);
          const pares: [ParamsDDAA, ResDDAA][] = [[s.q0, s.e0], [s.q1, s.e1], ...(s.q2 ? [[s.q2, s.e2!] as [ParamsDDAA, ResDDAA]] : [])];
          for (const [q, e] of pares) {
            expect(Math.abs(curvaDD(q, e.E) - e.Y), `${regimen}/${movilidad}/${c.valor} DD`).toBeLessThan(DEC4);
            if (regimen === 'flotante')
              expect(Math.abs(curvaAA(q, e.Y) - e.E), `${regimen}/${movilidad}/${c.valor} AA`).toBeLessThan(DEC4);
          }
          // Las muestras de la DD final son la DD analítica.
          const dd = r.fig.data.filter((t) => t.name === 'DD' && (t.xaxis ?? 'x') === 'x').pop();
          const qf = s.q2 ?? s.q1;
          dd.y.forEach((E: number, i: number) => expect(Math.abs(dd.x[i] - curvaDD(qf, E))).toBeLessThan(1e-9));
        }
  });

  it('Krugman y Obstfeld: resultados de largo plazo (choques permanentes)', async () => {
    const d = await CARGADORES_MACRO2['dd-aa']();
    // Flotante, expansión fiscal permanente: Y no cambia y la CA cae exactamente ΔG (expulsión vía CA).
    const f = MF.pasos(pulsar(d, { ...d.defecto }, 'fiscal') as never);
    expect(f.e2!.Y).toBeCloseTo(f.e0.Y, 4);
    expect(f.e0.CA - f.e2!.CA).toBeCloseTo(70, 4);
    expect(f.e2!.E).toBeLessThan(f.e1.E); // aprecia más que el choque transitorio
    // Flotante, expansión monetaria permanente: neutralidad, E y P suben en la misma proporción.
    const m = MF.pasos(pulsar(d, { ...d.defecto }, 'monetaria') as never);
    expect(m.lambda).toBeCloseTo(480 / 460, 12);
    expect(m.e1.R).toBeGreaterThan(0); // la expansión del botón no cae en la trampa de liquidez
    expect(m.e2!.Y).toBeCloseTo(m.e0.Y, 4);
    expect(m.e2!.E).toBeCloseTo(m.e0.E * m.lambda, 4);
    expect(m.e1.E).toBeGreaterThan(m.e0.E);
    // Fijo: expansión fiscal sube Y a 1,200 con M/P = 560; a largo plazo P sube y Y vuelve a 1,000.
    const x = MF.pasos(pulsar(d, { ...d.defecto, regimen: 'fijo' }, 'fiscal') as never);
    expect(x.e1.Y).toBeCloseTo(1200, 4);
    expect(x.e1.Mp).toBeCloseTo(560, 4);
    expect(x.e2!.Y).toBeCloseTo(1000, 4);
    expect(x.lambda).toBeGreaterThan(1);
    // Fijo: la política monetaria no mueve nada; la devaluación a largo plazo solo sube P.
    const mm = MF.pasos(pulsar(d, { ...d.defecto, regimen: 'fijo' }, 'monetaria') as never);
    expect(mm.e1).toEqual(mm.e0);
    const dv = MF.pasos(pulsar(d, { ...d.defecto, regimen: 'fijo' }, 'devaluacion') as never);
    expect(dv.e1.Y).toBeCloseTo(360 / 0.35, 4);
    expect(dv.e2!.Y).toBeCloseTo(1000, 4);
    expect(dv.lambda).toBeCloseTo(1.1, 12);
    // Panel B: en E₀ con movilidad perfecta R = R* + 100·(Eᵉ − E)/E.
    const e = equilibrioDDAA(MF.escenarios(d.defecto as never)[0]);
    expect(e.R).toBeCloseTo(4 + (100 * (1 - e.E)) / e.E, 10);
  });

  it('DA-OA + Phillips: DA∩OACP y DA∩OALP; cada E está sobre su CPCP (enlace por Okun)', async () => {
    const d = await CARGADORES_MACRO2['da-oa']();
    for (const c of DAOA.CHOQUES) {
      const p = pulsar(d, { ...d.defecto }, c.valor);
      const r = d.calcular(p);
      expect(esError(r), c.valor).toBe(false);
      const s = DAOA.pasos(p as never);
      const [b, n] = DAOA.escenarios(p as never);
      const da = r.fig.data.filter((t) => t.name === 'DA' && (t.xaxis ?? 'x') === 'x').pop();
      const oa = r.fig.data.filter((t) => String(t.name).startsWith('OACP') && !t.name.includes('inicial') && (t.xaxis ?? 'x') === 'x')[0];
      cruzaEn(da, oa, s.e1.Y, s.e1.P);
      if (c.valor !== 'ninguno') {
        const oalp = r.fig.data.find((t) => t.name === 'OALP (Yₚ)');
        cruzaEn(da, oalp, s.e2!.Y, s.e2!.P);
      }
      // Phillips: E₀, E₁ y E₂ caen sobre sus CPCP y E₂ sobre la CPLP.
      const en = s.enlace;
      expect(DAOA.cpcp(en, b, DAOA.desempleo(en, b, s.e0.Y))).toBeCloseTo(DAOA.inflacionDe(en, s.e0.P), 8);
      expect(DAOA.cpcp(en, n, DAOA.desempleo(en, n, s.e1.Y))).toBeCloseTo(DAOA.inflacionDe(en, s.e1.P), 8);
      const q2 = { ...n, W: s.e2!.P };
      expect(DAOA.desempleo(en, q2, s.e2!.Y)).toBeCloseTo(p['ustar'] as number, 8);
      expect(DAOA.cpcp(en, q2, p['ustar'] as number)).toBeCloseTo(DAOA.inflacionDe(en, s.e2!.P), 8);
    }
  });

  it('DA-OA: ΔD₀ = +200 ⇒ E₁ = (1100, 110), u = 2 %, π = 10 %; E₂ = (1000, 120); el choque petrolero se autocorrige a E₀', async () => {
    const d = await CARGADORES_MACRO2['da-oa']();
    const s = DAOA.pasos(d.defecto as never);
    const [, n] = DAOA.escenarios(d.defecto as never);
    expect(s.e1.Y).toBeCloseTo(1100, 4);
    expect(DAOA.desempleo(s.enlace, n, s.e1.Y)).toBeCloseTo(2, 4);
    expect(DAOA.inflacionDe(s.enlace, s.e1.P)).toBeCloseTo(10, 4);
    expect(s.e2!.P).toBeCloseTo(120, 4);
    const o = DAOA.pasos(pulsar(d, { ...d.defecto }, 'petroleo') as never);
    expect(o.e1.Y).toBeCloseTo(900, 4);
    expect(o.e2!.Y).toBeCloseTo(o.e0.Y, 4);
    expect(o.e2!.P).toBeCloseTo(o.e0.P, 4);
  });

  it('Solow: s·A·f(k*) = (n + g + δ)·k*, f′(k oro) = n + g + δ y las curvas graficadas son las analíticas', async () => {
    const d = await CARGADORES_MACRO2['solow']();
    for (const c of SOLOW.CHOQUES) {
      const p = pulsar(d, { ...d.defecto }, c.valor);
      const r = d.calcular(p);
      const [, n] = SOLOW.escenarios(p as never);
      const e = estadoEstacionario(n);
      const rep = n.delta + n.n + (n.g ?? 0);
      expect(Math.abs(n.s * produccion(n, e.k) - rep * e.k)).toBeLessThan(1e-10);
      expect(Math.abs(n.alpha * n.A * Math.pow(e.kOro, n.alpha - 1) - rep)).toBeLessThan(1e-10);
      const inv = r.fig.data.filter((t) => t.name === 's·A·f(k)' && (t.xaxis ?? 'x') === 'x').pop();
      inv.x.forEach((k: number, i: number) => inv.y[i] !== null && expect(Math.abs(inv.y[i] - n.s * produccion(n, k))).toBeLessThan(1e-12));
      const repo = r.fig.data.filter((t) => t.name === '(n + g + δ)·k' && (t.xaxis ?? 'x') === 'x').pop();
      cruzaEn(repo, { x: [e.k - 1e-3, e.k + 1e-3], y: [n.s * produccion(n, e.k - 1e-3), n.s * produccion(n, e.k + 1e-3)] }, e.k, e.i);
    }
    const base = SOLOW.escenarios(d.defecto as never)[0];
    expect(estadoEstacionario(base).k).toBeCloseTo(4, 10);
  });

  it('Phillips: E₂ sin sorpresas sobre la CPLP', async () => {
    const d = await CARGADORES_MACRO2['phillips']();
    const p = pulsar(d, { ...d.defecto }, 'petroleo');
    const r = d.calcular(p);
    const e2 = r.fig.data.find((t) => t.name === 'Largo plazo sin sorpresas (CPLP)' && t.mode?.includes('markers'));
    expect(e2.x[0]).toBe(5);
    expect(e2.y[0]).toBeCloseTo(8, 10); // πᵉ + v = 6 + 2
    void PH;
  });
});

/* ================================================================ Pasada 3 */
describe('Pasada 3 · bordes: botones de choque × extremos de cada deslizador', () => {
  const VARIANTES: Record<string, Params[]> = {
    'is-lm': [{}],
    'mundell-fleming': [
      { regimen: 'flotante', movilidad: 'perfecta' },
      { regimen: 'fijo', movilidad: 'perfecta' },
      { regimen: 'flotante', movilidad: 'imperfecta' },
      { regimen: 'fijo', movilidad: 'imperfecta' },
    ],
    'dd-aa': [
      { regimen: 'flotante', movilidad: 'perfecta' },
      { regimen: 'fijo', movilidad: 'perfecta' },
      { regimen: 'flotante', movilidad: 'imperfecta' },
      { regimen: 'fijo', movilidad: 'imperfecta' },
    ],
    'da-oa': [{ autoajuste: 'si' }, { autoajuste: 'no' }],
    phillips: [{}],
    solow: [{}],
  };
  for (const sim of Object.keys(CARGADORES_MACRO2))
    it(`${sim}: ningún botón ni extremo produce NaN, Infinity o división por cero`, async () => {
      const d = await CARGADORES_MACRO2[sim]();
      const botones = controles(d).find((c) => c.id === 'choque')!.opciones!.map((o) => o.valor);
      for (const v of VARIANTES[sim])
        for (const b of botones) {
          const base = pulsar(d, { ...d.defecto, ...v }, b);
          const r0 = d.calcular(base);
          expect(esError(r0), `${sim} ${JSON.stringify(v)} ${b}`).toBe(false);
          if (b !== 'ninguno') {
            expect(cadenaDe(r0), `${sim} ${b}: caja de estática comparativa`).toBeTruthy();
            expect(r0.fig.data.some((t) => String(t.name).endsWith('(inicial)')), `${sim} ${b}: E₀ fantasma`).toBe(
              !(['mundell-fleming', 'dd-aa'].includes(sim) && b === 'monetaria' && v['regimen'] === 'fijo'),
            );
          }
          for (const c of controles(d).filter((x) => x.tipo === 'slider'))
            for (const x of [c.min!, c.max!]) {
              const r = d.calcular({ ...base, [c.id]: x });
              expect(json(r), `${sim} ${b} ${c.id}=${x}`).not.toMatch(/NaN|undefined|Infinity/);
              if (esError(r)) expect(r.fig.data.length).toBe(0);
            }
        }
    }, 30000); // barrido pesado: con la suite completa en paralelo supera los 5 s por defecto

  it('botones: fijan su choque y anulan los demás; mover un delta a mano deja el botón en «manual»', async () => {
    const d = await CARGADORES_MACRO2['is-lm']();
    const a = pulsar(d, { ...d.defecto, dT: 50 }, 'fiscal');
    expect(a).toMatchObject({ choque: 'fiscal', dG: 100, dT: 0, dm: 0 });
    const nuevo = { ...a, dG: 150 };
    expect(d.alCambiar!(a, nuevo)).toEqual({ choque: 'manual' });
    expect(pulsar(d, a, 'ninguno')).toMatchObject({ dG: 0, dT: 0, dm: 0 });
  });

  it('casos degenerados con choques: h = 0 (LM vertical), b = 0, c = 0, trampa de liquidez, n + g + δ = 0', async () => {
    const islm = await CARGADORES_MACRO2['is-lm']();
    for (const extra of [{ h: 0 }, { b: 0 }, { c: 0 }, { m: 1200 }, { h: 0, b: 0 }] as Params[])
      for (const b of ISLM.CHOQUES.map((c) => c.valor)) {
        const r = islm.calcular(pulsar(islm, { ...islm.defecto, ...extra }, b));
        expect(json(r), JSON.stringify(extra) + b).not.toMatch(/NaN|Infinity|undefined/);
      }
    const trampa = ISLM.pasos(pulsar(islm, { ...islm.defecto, m: 1200 }, 'expansion') as never);
    expect(trampa.r0.r).toBe(0);
    expect(trampa.r2.Y).toBe(trampa.r0.Y); // más dinero en la trampa no mueve Y
    const so = await CARGADORES_MACRO2['solow']();
    const r = so.calcular({ ...so.defecto, delta: 0, n: 0, g: 0 });
    expect(esError(r)).toBe(true); // sin reposición: aviso claro, no división por cero
    const da = await CARGADORES_MACRO2['da-oa']();
    const neg = da.calcular({ ...da.defecto, okun: 1, dD0: 400 });
    expect(JSON.stringify(neg.panel)).toContain('desempleo negativo');
    expect(neg.fig.data.filter((t) => t.xaxis === 'x2' && t.mode?.includes('markers')).every((t) => t.x[0] >= 0)).toBe(true);
  });
});

/* ================================================================ Sistema de economía abierta */
describe('Mundell–Fleming en cinco paneles · analítico = gráfica', () => {
  const REG = [
    { regimen: 'flotante', movilidad: 'imperfecta' },
    { regimen: 'flotante', movilidad: 'perfecta' },
    { regimen: 'fijo', movilidad: 'imperfecta' },
    { regimen: 'fijo', movilidad: 'perfecta' },
  ];
  const finalDe = (r: Simulacion, nombre: string, eje: string) =>
    r.fig.data.filter((t) => t.name === nombre && (t.xaxis ?? 'x') === eje && t.line?.dash === undefined).pop();

  it('identidades en E₀, E₁ y E₂: fondos, balanza de pagos, paridad, FPP y estructura', async () => {
    const d = await CARGADORES_MACRO2['mundell-fleming']();
    for (const v of REG)
      for (const c of AB.CHOQUES) {
        const p = pulsar(d, { ...d.defecto, ...v }, c.valor);
        const s = AB.pasos(p as never);
        for (const { q, r } of [s.e0, s.e1, s.e2]) {
          const tag = `${JSON.stringify(v)} ${c.valor}`;
          expect(Math.abs(r.S + r.credito + r.KF - r.I), `${tag} fondos`).toBeLessThan(1e-8);
          expect(Math.abs(r.XN + r.KF), `${tag} BP`).toBeLessThan(1e-8);
          expect(Math.abs(exportaciones(q, r.q) - importaciones(q, r.q) - r.XN), `${tag} XN`).toBeLessThan(1e-8);
          expect(Math.abs(r.C - fpp(q.Yf, r.S))).toBeLessThan(1e-9);
          expect(Math.abs(r.E - r.q * r.P), `${tag} E = qP`).toBeLessThan(1e-9);
          if (q.movilidad === 'perfecta') expect(Math.abs(r.i - q.iStar - r.eps), `${tag} paridad`).toBeLessThan(1e-8);
          if (q.movilidad === 'imperfecta')
            expect(Math.abs(r.KF - q.kappa * (r.i - q.iStar - r.eps)), `${tag} KF = κ(i − i* − ε)`).toBeLessThan(1e-7);
          if (q.movilidad === 'cerrada') expect(r.KF).toBeCloseTo(0, 9);
          if (q.Ee !== null && q.movilidad !== 'cerrada')
            expect(Math.abs(r.eps - (100 * (q.Ee - r.E)) / r.E), `${tag} ε`).toBeLessThan(1e-7);
          if (q.regimen === 'fijo') expect(r.E).toBe(q.Ebar);
        }
      }
  });

  it('cada marcador y cada cruce graficado coincide con la solución analítica (4 decimales)', async () => {
    const d = await CARGADORES_MACRO2['mundell-fleming']();
    for (const v of REG)
      for (const c of AB.CHOQUES) {
        const p = pulsar(d, { ...d.defecto, ...v }, c.valor);
        const r = d.calcular(p);
        expect(esError(r), c.valor).toBe(false);
        const s = AB.pasos(p as never);
        const est = AB.estadosAb(p as never, s);
        const { q, r: e } = est[est.length - 1];
        const nom = est.length === 1 ? 'Equilibrio' : est.length === 3 ? 'Largo plazo (Eᵉ = E)' : 'Nuevo equilibrio';
        const tag = `${JSON.stringify(v)} ${c.valor}`;
        // ① fondos: el equilibrio está en (I, i) si entra capital, en (Sᴺ + ΔC, i) si sale.
        const m1 = marcador(r, nom, 'x');
        expect(m1.x[0], tag).toBeCloseTo(e.KF >= 0 ? e.I : e.S + e.credito, 4);
        expect(m1.y[0], tag).toBeCloseTo(e.i, 4);
        const dn = traza(r, 'Dᴺ (inversión)');
        if (q.movilidad === 'imperfecta' && e.KF > 1e-6)
          cruzaEn(finalDe(r, 'Sᴺ⁺ᴱ (ahorro nacional + externo)', 'x'), dn, e.I, e.i);
        if (q.movilidad === 'imperfecta' && e.KF < -1e-6)
          cruzaEn(finalDe(r, 'Dᴺ⁺ᴱ (inversión + salida de capital)', 'x'), finalDe(r, 'Sᴺ (ahorro nacional)', 'x'), e.S + e.credito, e.i);
        // ② paridad: el rendimiento externo graficado en E es i* + 100·(Eᵉ − E)/E.
        const m2 = marcador(r, nom, 'x2');
        expect(m2.x[0]).toBeCloseTo(e.i, 4);
        expect(m2.y[0]).toBeCloseTo(e.E, 4);
        const ext = finalDe(r, 'i* + (Eᵉ − E)/E (depósitos en divisas)', 'x2');
        const Ee = q.Ee ?? e.E;
        ext.y.forEach(
          (E: number, k: number) =>
            ext.x[k] !== null && expect(Math.abs(ext.x[k] - rendimientoExterno(q.iStar, Ee, E))).toBeLessThan(1e-9),
        );
        if (q.movilidad === 'perfecta' && q.regimen === 'flotante')
          cruzaEn(finalDe(r, 'i (depósitos nacionales)', 'x2'), ext, e.i, e.E);
        // ③ comercio: X y M a q de equilibrio; X ∩ M en el equilibrio comercial.
        const m3 = marcador(r, nom, 'x3');
        expect(m3.x[0]).toBeCloseTo(e.X, 4);
        expect(m3.y[0]).toBeCloseTo(e.q, 4);
        cruzaEn(finalDe(r, 'X (exportaciones)', 'x3'), traza(r, 'M (importaciones)', 'x3'), exportaciones(q, e.qBal), e.qBal);
        if (Math.abs(e.XN) > 1e-6) {
          const br = r.fig.data.find((t) => String(t.name).includes('comercial (') && t.xaxis === 'x3');
          expect(Math.abs(Math.abs(br.x[1] - br.x[0]) - Math.abs(e.XN))).toBeLessThan(DEC4);
        }
        // ④ FPP: cada punto del arco está sobre C = √(Yf² − I²); absorción en (I, C).
        const ar = traza(r, 'FPP', 'x4');
        ar.x.forEach((k: number, j: number) => expect(Math.abs(ar.y[j] - fpp(q.Yf, k))).toBeLessThan(1e-9));
        const m4 = marcador(r, nom, 'x4');
        expect(m4.x[0]).toBeCloseTo(e.I, 4);
        expect(m4.y[0]).toBeCloseTo(e.C, 4);
        // ⑤ estructura: vértice (L, C) con L = 20·I/C.
        const m5 = marcador(r, nom, 'x5');
        expect(m5.x[0]).toBeCloseTo(etapas(e.I, e.C), 4);
        expect(m5.y[0]).toBeCloseTo(e.C, 4);
      }
  });

  it('resultados de referencia: apertura, fiscal, monetaria, i*, exportaciones y expectativas', async () => {
    const d = await CARGADORES_MACRO2['mundell-fleming']();
    const P = (b: string, extra: Params = {}) => AB.pasos(pulsar(d, { ...d.defecto, ...extra }, b) as never);
    // Apertura por defecto: cerrada i = 8 %, q = 1; abierta (κ = 25) i = 6 %, KF = 50 = déficit: 200·q − 200/q = −50.
    const qDef = (xn: number, X0 = 200) => (xn + Math.sqrt(xn * xn + 4 * X0 * 200)) / (2 * X0);
    const a = P('apertura');
    expect(a.e0.r.i).toBeCloseTo(8, 10);
    expect(a.e0.r.q).toBeCloseTo(1, 10);
    expect(a.e0.r.XN).toBeCloseTo(0, 10);
    expect(a.e2.r.i).toBeCloseTo(6, 10);
    expect(a.e2.r.KF).toBeCloseTo(50, 10);
    expect(a.e2.r.q).toBeCloseTo(qDef(-50), 10);
    expect(a.e1.r.q).toBeGreaterThan(a.e2.r.q); // con Eᵉ aún en 1 aprecia menos
    expect(a.e1.r.q).toBeLessThan(a.e0.r.q);
    expect(etapas(a.e2.r.I, a.e2.r.C)).toBeGreaterThan(etapas(a.e0.r.I, a.e0.r.C));
    const ap = P('apertura', { movilidad: 'perfecta' });
    expect(ap.e2.r.i).toBeCloseTo(4, 10);
    expect(ap.e2.r.q).toBeCloseTo(qDef(-100), 10);
    // Fiscal (+50): i = 7 % y déficit 75 a largo plazo (déficits gemelos).
    const f = P('fiscal');
    expect(f.e0.r.i).toBeCloseTo(6, 10);
    expect(f.e2.r.i).toBeCloseTo(7, 10);
    expect(f.e2.r.q).toBeCloseTo(qDef(-75), 10);
    expect(f.e2.r.XN).toBeLessThan(f.e0.r.XN);
    // Monetaria flotante: a corto plazo i ↓ y E ↑; a largo plazo neutral, E = 1.1·E₀ y q = q₀.
    const m = P('monetaria');
    expect(m.e1.r.i).toBeLessThan(m.e0.r.i);
    expect(m.e1.r.E).toBeGreaterThan(m.e0.r.E);
    expect(m.e1.r.I).toBeGreaterThan(m.e0.r.I);
    expect(m.e2.r.q).toBeCloseTo(m.e0.r.q, 10);
    expect(m.e2.r.i).toBeCloseTo(m.e0.r.i, 10);
    expect(m.e2.r.E).toBeCloseTo(1.1 * m.e0.r.E, 10);
    // Monetaria con tipo fijo: nada real cambia y se pierden 40 de reservas (trilema).
    const mf = P('monetaria', { regimen: 'fijo' });
    for (const k of ['i', 'E', 'q', 'I', 'XN'] as const) expect(mf.e1.r[k]).toBeCloseTo(mf.e0.r[k], 10);
    expect(mf.e1.r.reservas).toBe(-40);
    // i* +2: i ↑, I ↓, E ↑, XN ↑.
    const x = P('externa');
    expect(x.e2.r.i).toBeGreaterThan(x.e0.r.i);
    expect(x.e2.r.I).toBeLessThan(x.e0.r.I);
    expect(x.e2.r.E).toBeGreaterThan(x.e0.r.E);
    expect(x.e2.r.XN).toBeGreaterThan(x.e0.r.XN);
    // Auge exportador: a largo plazo XN no cambia y q cae (X₀ = 240 con el mismo déficit).
    const ex = P('exportaciones');
    expect(ex.e2.r.XN).toBeCloseTo(ex.e0.r.XN, 10);
    expect(ex.e2.r.q).toBeCloseTo(qDef(-50, 240), 10);
    expect(ex.e2.r.q).toBeLessThan(ex.e0.r.q);
    // Expectativas de depreciación: E ↑ e i ↑ hoy; si no se validan, todo vuelve a E₀.
    const ee = P('expectativas');
    expect(ee.e1.r.E).toBeGreaterThan(ee.e0.r.E);
    expect(ee.e1.r.i).toBeGreaterThan(ee.e0.r.i);
    expect(ee.e2.r.E).toBeCloseTo(ee.e0.r.E, 10);
    const eef = P('expectativas', { regimen: 'fijo', movilidad: 'perfecta' });
    expect(eef.e1.r.i).toBeCloseTo(eef.e0.r.i + 10, 10); // defender Ē exige pagar la prima ε
  });

  it('movilidad imperfecta con κ grande converge a la movilidad perfecta', () => {
    const base = AB.parametrosBase({ ...AB.SIM.defecto } as never);
    const per = equilibrioAbierta({ ...base, movilidad: 'perfecta', G: 250 });
    const imp = equilibrioAbierta({ ...base, movilidad: 'imperfecta', kappa: 1e8, G: 250 });
    expect(imp.i).toBeCloseTo(per.i, 5);
    expect(imp.q).toBeCloseTo(per.q, 5);
  });

  it('bordes: cada choque × extremos de cada deslizador da una gráfica válida o un aviso claro', async () => {
    const d = await CARGADORES_MACRO2['mundell-fleming']();
    let validos = 0;
    let avisos = 0;
    for (const v of REG)
      for (const c of AB.CHOQUES) {
        const base = pulsar(d, { ...d.defecto, ...v }, c.valor);
        for (const ctl of controles(d).filter((x) => x.tipo === 'slider'))
          for (const x of [ctl.min!, ctl.max!, (ctl.min! + ctl.max!) / 2]) {
            const r = d.calcular({ ...base, [ctl.id]: x });
            expect(json(r), `${c.valor} ${ctl.id}=${x}`).not.toMatch(/NaN|undefined|Infinity/);
            if (esError(r)) {
              avisos++;
              expect(r.fig.data.length).toBe(0);
              expect(r.fig.layout.annotations[0].text.length).toBeGreaterThan(20);
            } else validos++;
          }
      }
    // La gran mayoría de las combinaciones debe dar una gráfica (los avisos son la excepción).
    expect(validos).toBeGreaterThan(avisos * 10);
  });

  it('casos degenerados: s = b = 0 con economía cerrada y deltas no numéricos', async () => {
    const d = await CARGADORES_MACRO2['mundell-fleming']();
    const r = d.calcular({ ...d.defecto, s: 0, b: 0 });
    expect(esError(r)).toBe(true);
    expect(JSON.stringify(r.panel)).toContain('s + b');
    for (const k of ['dAp', 'dG', 'dM', 'dIs', 'dX', 'dEe'])
      expect(esError(d.calcular({ ...d.defecto, [k]: NaN })), k).toBe(true);
    const sinApertura = d.calcular({ ...d.defecto, choque: 'ninguno', dAp: 0, s: 0, b: 0 });
    expect(json(sinApertura)).not.toMatch(/NaN|Infinity|undefined/);
  });
});
