import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import {
  AZUL,
  DORADO,
  MORADO,
  ROJO,
  SUAVE,
  VERDE,
  aviso,
  figura,
  figuraVacia,
  lectura,
  resultados,
  tabla,
  texto,
} from '../../core/tema';
import { Movilidad, ParamsDDAA, Regimen, ResDDAA, curvaAA, curvaDD, equilibrioDDAA } from '../modelos/ddaa';
import { curva, delta, equilibrio, refKO } from './_comun';

const SIM_ID = 'm2-mundell-fleming';
// DD: Y = (250 + 100·E)/0.35; AA: M/P = 0.5·Y − 10·R con R = R* + 100·(Eᵉ − E)/E.
// Con M/P = 460, R* = 4 % y Eᵉ = 1: Y* = 1,000, E* = 1, R = 4 %.
const DEF = {
  regimen: 'flotante' as string,
  movilidad: 'perfecta' as string,
  C0: 100,
  c: 0.75,
  T: 200,
  I: 150,
  G: 200,
  n0: -50,
  x: 100,
  m: 0.1,
  Mp: 460,
  k: 0.5,
  h: 10,
  Rstar: 4,
  Ee: 1,
  E0: 1,
  mu: 50,
  dG: 0,
  dMp: 0,
  dRstar: 0,
  dn0: 0,
  dEe: 0,
  dE0: 0,
};
type P = typeof DEF;

export function escenarios(p: P): [ParamsDDAA, ParamsDDAA] {
  const base: ParamsDDAA = {
    regimen: (p.regimen === 'fijo' ? 'fijo' : 'flotante') as Regimen,
    movilidad: (p.movilidad === 'imperfecta' ? 'imperfecta' : 'perfecta') as Movilidad,
    C0: p.C0,
    c: p.c,
    T: p.T,
    I: p.I,
    G: p.G,
    n0: p.n0,
    x: p.x,
    m: p.m,
    Mp: p.Mp,
    k: p.k,
    h: p.h,
    Rstar: p.Rstar,
    Ee: p.Ee,
    E0: p.E0,
    mu: p.mu,
  };
  const fijo = base.regimen === 'fijo';
  return [
    base,
    {
      ...base,
      G: p.G + p.dG,
      n0: p.n0 + p.dn0,
      Rstar: p.Rstar + p.dRstar,
      Mp: fijo ? p.Mp : p.Mp + p.dMp,
      Ee: fijo ? p.Ee : p.Ee + p.dEe,
      E0: fijo ? p.E0 + p.dE0 : p.E0,
    },
  ];
}

export function calcular(p: P): Simulacion {
  const [b, n] = escenarios(p);
  const fijo = b.regimen === 'fijo';
  let r0: ResDDAA;
  let r1: ResDDAA;
  try {
    r0 = equilibrioDDAA(b);
    r1 = equilibrioDDAA(n);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const choqueDD = p.dG !== 0 || p.dn0 !== 0;
  const choqueAA = p.dRstar !== 0 || (!fijo && (p.dMp !== 0 || p.dEe !== 0));
  const devaluacion = fijo && p.dE0 !== 0;
  const choque = choqueDD || choqueAA || devaluacion || (fijo && (p.dMp !== 0 || p.dEe !== 0));
  // Vista acercada alrededor de los equilibrios, como en los diagramas DD-AA del libro.
  const ymin = Math.min(r0.Y, r1.Y) * 0.6;
  const ymax = Math.max(r0.Y, r1.Y) * 1.4;
  const emin = Math.min(r0.E, r1.E) * 0.6;
  const emax = Math.max(r0.E, r1.E) * 1.4;
  const fig = figura('Producto Y', 'Tipo de cambio E (moneda nacional por divisa)', SIM_ID, {
    xaxis: { range: [ymin, ymax] },
    yaxis: { range: [emin, emax] },
  });

  const es = linspace(emin, emax, 80);
  const ys = linspace(ymin, ymax, 200);
  const trazarDD = (q: ParamsDDAA, nombre: string, color: string, fantasma = false) =>
    curva(fig, es.map((e) => curvaDD(q, e)), es, nombre, color, fantasma);
  // Con tipo fijo la AA pasa por el equilibrio porque M/P es la que sostiene la paridad.
  const trazarAA = (q: ParamsDDAA, r: ResDDAA, nombre: string, color: string, fantasma = false) => {
    const Ee = q.regimen === 'fijo' ? q.E0 : q.Ee;
    curva(
      fig,
      ys,
      ys.map((y) => {
        const e = curvaAA(q, y, r.Mp, Ee);
        return e >= emin * 0.5 && e <= emax * 1.5 ? e : null;
      }),
      nombre,
      color,
      fantasma,
    );
  };

  if (choqueDD || devaluacion) trazarDD(b, 'DD', AZUL, true);
  trazarDD(n, 'DD', choqueDD ? VERDE : AZUL);
  const aaMovio = Math.abs(r1.Mp - r0.Mp) > 1e-9 || choqueAA;
  if (aaMovio) trazarAA(b, r0, 'AA', ROJO, true);
  trazarAA(n, r1, fijo ? 'AA (M/P endógena)' : 'AA', aaMovio ? MORADO : ROJO);
  if (fijo)
    fig.data.push({
      type: 'scatter',
      x: [ymin, ymax],
      y: [n.E0, n.E0],
      mode: 'lines',
      name: `Paridad fija E₀ = ${fmt(n.E0, 3)}`,
      line: { color: DORADO, width: 1.5, dash: 'dashdot' },
    });

  const ejes = { x0: ymin, y0: emin, decY: 3 };
  equilibrio(fig, r0.Y, r0.E, choque ? 'Equilibrio inicial' : 'Equilibrio (Y*, E*)', 'E₀', choque ? SUAVE : DORADO, ejes);
  if (choque) equilibrio(fig, r1.Y, r1.E, 'Equilibrio final', 'E₁', DORADO, { ...ejes, simbolo: 'diamond' });

  const lecturas: Bloque[] = [];
  if (choque)
    lecturas.push(
      texto(
        `Y pasa de ${fmt(r0.Y, 2)} a ${fmt(r1.Y, 2)} (Δ = ${fmt(delta(r1.Y - r0.Y), 2)}); E de ${fmt(r0.E, 4)} a ${fmt(r1.E, 4)} ` +
          `(${r1.E > r0.E + 1e-9 ? 'depreciación' : r1.E < r0.E - 1e-9 ? 'apreciación' : 'sin cambio'}).`,
        'destacado',
      ),
    );
  if (fijo && (p.dMp !== 0 || p.dEe !== 0))
    lecturas.push(
      aviso(
        'Con tipo de cambio fijo la política monetaria es ineficaz: para sostener E₀ el banco central compra o vende divisas hasta que M/P vuelve al nivel que exige la paridad.',
      ),
    );
  if (fijo && (choqueDD || devaluacion || p.dRstar !== 0))
    lecturas.push(
      texto(
        `Para sostener la paridad la oferta real de dinero pasa de ${fmt(r0.Mp, 2)} a ${fmt(r1.Mp, 2)}: ` +
          'el banco central acomoda el choque con intervención en el mercado de divisas.',
        'pequeno texto-suave',
      ),
    );
  if (!fijo && p.dG !== 0 && p.dEe === 0)
    lecturas.push(
      texto(
        'Expansión fiscal temporal con tipo flotante: sube R, la moneda se aprecia y la cuenta corriente empeora; el producto sube menos que con tipo fijo.',
        'pequeno texto-suave',
      ),
    );
  if (!choque)
    lecturas.push(
      texto(
        'Aplica un choque: la posición inicial de DD y AA queda como curva fantasma punteada. Cambia el régimen para comparar.',
        'pequeno texto-suave',
      ),
    );

  const panel = [
    resultados([
      lectura(
        'Equilibrio (Y*, E*)',
        tabla(
          [
            ['Producto Y*', r0.Y, r1.Y],
            ['Tipo de cambio E*', r0.E, r1.E],
            ['Tasa de interés R (%)', r0.R, r1.R],
            ['Cuenta corriente CA', r0.CA, r1.CA],
            [fijo ? 'M/P (endógena)' : 'M/P', r0.Mp, r1.Mp],
          ],
          ['', 'Inicial', 'Después del choque'],
        ),
      ),
      lectura(
        'Lectura',
        ...lecturas,
        refKO('cap. 16, «La producción nacional y el tipo de cambio a corto plazo», y cap. 17, «Los tipos de cambio fijos y la intervención en los mercados de divisas» (numeración de la 7.ª ed.).'),
      ),
    ]),
  ];
  return { fig, panel };
}

const flotante = (p: Params) => p['regimen'] !== 'fijo';

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 560,
  grupos: [
    {
      titulo: 'Régimen',
      controles: [
        {
          id: 'regimen',
          etiqueta: 'Tipo de cambio',
          tipo: 'selector',
          opciones: [
            { valor: 'flotante', etiqueta: 'Flotante' },
            { valor: 'fijo', etiqueta: 'Fijo' },
          ],
        },
        {
          id: 'movilidad',
          etiqueta: 'Movilidad del capital',
          tipo: 'selector',
          opciones: [
            { valor: 'perfecta', etiqueta: 'Perfecta (paridad de intereses)' },
            { valor: 'imperfecta', etiqueta: 'Imperfecta (μ finito)' },
          ],
        },
      ],
    },
    {
      visibleSi: (p) => p['movilidad'] === 'imperfecta',
      controles: [
        { id: 'mu', etiqueta: 'Movilidad del capital μ', tipo: 'slider', min: 1, max: 200, paso: 1 },
      ],
    },
    {
      titulo: 'Mercado de bienes (DD)',
      controles: [
        { id: 'C0', etiqueta: 'Consumo autónomo C₀', tipo: 'slider', min: 0, max: 300, paso: 10 },
        { id: 'c', etiqueta: 'Propensión a consumir c', tipo: 'slider', min: 0, max: 0.9, paso: 0.01 },
        { id: 'I', etiqueta: 'Inversión I', tipo: 'slider', min: 0, max: 400, paso: 10 },
        { id: 'G', etiqueta: 'Gasto público G', tipo: 'slider', min: 0, max: 500, paso: 10 },
        { id: 'T', etiqueta: 'Impuestos T', tipo: 'slider', min: 0, max: 400, paso: 10 },
        { id: 'n0', etiqueta: 'Exportaciones netas autónomas n₀', tipo: 'slider', min: -200, max: 200, paso: 10 },
        { id: 'x', etiqueta: 'Respuesta de CA a E, x', tipo: 'slider', min: 10, max: 300, paso: 10 },
        { id: 'm', etiqueta: 'Propensión a importar m', tipo: 'slider', min: 0, max: 0.5, paso: 0.01 },
      ],
    },
    {
      titulo: 'Mercados de activos (AA)',
      controles: [
        { id: 'Rstar', etiqueta: 'Tasa de interés externa R* (%)', tipo: 'slider', min: 0, max: 15, paso: 0.25 },
        { id: 'k', etiqueta: 'Demanda de dinero: sensibilidad a Y, k', tipo: 'slider', min: 0.1, max: 1, paso: 0.05 },
        { id: 'h', etiqueta: 'Demanda de dinero: sensibilidad a R, h', tipo: 'slider', min: 1, max: 60, paso: 1 },
      ],
    },
    {
      visibleSi: flotante,
      controles: [
        { id: 'Mp', etiqueta: 'Oferta real de dinero M/P', tipo: 'slider', min: 50, max: 1000, paso: 10 },
        { id: 'Ee', etiqueta: 'Tipo de cambio esperado Eᵉ', tipo: 'slider', min: 0.5, max: 2, paso: 0.01 },
      ],
    },
    {
      visibleSi: (p) => !flotante(p),
      controles: [
        { id: 'E0', etiqueta: 'Paridad fijada E₀', tipo: 'slider', min: 0.5, max: 2, paso: 0.01 },
      ],
    },
    {
      titulo: 'Choques (estática comparativa)',
      controles: [
        { id: 'dG', etiqueta: 'ΔG (política fiscal)', tipo: 'slider', min: -150, max: 150, paso: 10 },
        { id: 'dn0', etiqueta: 'Δn₀ (demanda externa)', tipo: 'slider', min: -150, max: 150, paso: 10 },
        { id: 'dRstar', etiqueta: 'ΔR* (puntos)', tipo: 'slider', min: -4, max: 6, paso: 0.25 },
        { id: 'dMp', etiqueta: 'Δ(M/P) (política monetaria)', tipo: 'slider', min: -200, max: 300, paso: 10 },
      ],
    },
    {
      visibleSi: flotante,
      controles: [
        { id: 'dEe', etiqueta: 'ΔEᵉ (choque permanente esperado)', tipo: 'slider', min: -0.4, max: 0.6, paso: 0.01 },
      ],
    },
    {
      visibleSi: (p) => !flotante(p),
      controles: [
        { id: 'dE0', etiqueta: 'ΔE₀ (devaluación > 0)', tipo: 'slider', min: -0.3, max: 0.5, paso: 0.01 },
      ],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
