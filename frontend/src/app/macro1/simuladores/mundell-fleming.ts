import { Bloque, Figura, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import {
  AZUL,
  COLORES,
  DORADO,
  MORADO,
  ROJO,
  SUAVE,
  VERDE,
  aviso,
  figura,
  figuraVacia,
  lectura,
  punto,
  resultados,
  tabla,
  texto,
} from '../../core/tema';
import {
  ParamsMF,
  Regimen,
  ResMF,
  curvaISAbierta,
  equilibrioMF,
  paridad,
} from '../modelos/mundell';
import { delta, ref } from './_comun';

const SIM_ID = 'mundell-fleming';
// Calibrado para que el punto de partida sea el mismo en ambos regímenes: Y = 1,000, i = i* = 5 %, e = 1.
const DEF = {
  regimen: 'flexible' as string,
  c0: 100,
  c1: 0.6,
  T: 100,
  b0: 100,
  b1: 0.1,
  b2: 10,
  G: 200,
  x0: 60,
  phi: 50,
  q: 0.1,
  k: 0.5,
  h: 20,
  M: 400,
  istar: 5,
  ee: 1,
  ebar: 1,
  dG: 50,
  dM: 0,
  dis: 0,
  debar: 0,
};
type P = typeof DEF;

export function escenarios(p: P): [ParamsMF, ParamsMF] {
  const regimen = (p.regimen === 'fijo' ? 'fijo' : 'flexible') as Regimen;
  const base: ParamsMF = {
    regimen,
    c0: p.c0,
    c1: p.c1,
    T: p.T,
    b0: p.b0,
    b1: p.b1,
    b2: p.b2,
    G: p.G,
    x0: p.x0,
    phi: p.phi,
    q: p.q,
    k: p.k,
    h: p.h,
    M: p.M,
    istar: p.istar,
    ee: p.ee,
    ebar: p.ebar,
  };
  return [
    base,
    {
      ...base,
      G: p.G + p.dG,
      istar: p.istar + p.dis,
      M: regimen === 'flexible' ? p.M + p.dM : p.M,
      ebar: regimen === 'fijo' ? p.ebar * (1 + p.debar / 100) : p.ebar,
    },
  ];
}

const ejeExtra = (titulo: string, dominio: number[], rango: number[]) => ({
  domain: dominio,
  anchor: 'y',
  range: rango,
  title: { text: titulo, font: { color: SUAVE } },
  gridcolor: COLORES.rejilla,
  zerolinecolor: COLORES.borde,
  linecolor: COLORES.borde,
  tickcolor: COLORES.borde,
  showline: true,
});

function trazarIS(
  fig: Figura,
  q: ParamsMF,
  r: ResMF,
  imax: number,
  nombre: string,
  color: string,
): void {
  const is = linspace(0, imax, 80);
  fig.data.push({
    type: 'scatter',
    x: is.map((i) => curvaISAbierta(q, r.A, r.s, i, r.e)),
    y: is,
    mode: 'lines',
    name: nombre,
    line: { color, width: 3 },
    hovertemplate: `${nombre} (e = ${fmt(r.e, 3)})<br>Y = %{x:.2f}, i = %{y:.2f}<extra></extra>`,
  });
}

function trazarLM(
  fig: Figura,
  q: ParamsMF,
  M: number,
  ymax: number,
  nombre: string,
  color: string,
  dash = 'solid',
): void {
  const ys = linspace(0, ymax, 120);
  fig.data.push({
    type: 'scatter',
    x: ys,
    y: ys.map((y) => Math.max(0, (q.k * y - M) / q.h)),
    mode: 'lines',
    name: nombre,
    line: { color, width: 3, dash },
  });
}

export function calcular(p: P): Simulacion {
  const [b, n] = escenarios(p);
  let r0: ResMF;
  let r1: ResMF;
  try {
    r0 = equilibrioMF(b);
    r1 = equilibrioMF(n);
  } catch (e) {
    if (e instanceof ErrorParametro)
      return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const fijo = b.regimen === 'fijo';
  const hayChoque = p.dG !== 0 || p.dis !== 0 || (fijo ? p.debar !== 0 : p.dM !== 0);
  const ymax = Math.max(r0.Y, r1.Y, 1) * 1.6;
  const imax = Math.max(r0.i, r1.i, b.istar, n.istar, 4) * 2;
  // Eje de e ajustado a los valores relevantes (la paridad cambia poco con i y se vería como una recta vertical).
  const es0 = fijo
    ? [r0.e, r1.e]
    : [b, n].flatMap((q) => [paridad(q.ee, q.istar, 0), paridad(q.ee, q.istar, imax)]);
  const eLo = Math.min(...es0, r0.e, r1.e);
  const eHi = Math.max(...es0, r0.e, r1.e);
  const ePad = Math.max(0.05 * eHi, 0.15 * (eHi - eLo));
  const emin = Math.max(0, eLo - ePad);
  const emax = eHi + ePad;
  const fig = figura('Producto Y', 'Tasa de interés i (%)', SIM_ID, {
    xaxis: { domain: [0, 0.6], range: [0, ymax] },
    yaxis: { range: [0, imax] },
    xaxis2: ejeExtra('Tipo de cambio e', [0.68, 1], [emin, emax]),
  });

  trazarIS(fig, b, r0, imax, 'IS inicial', AZUL);
  if (hayChoque) trazarIS(fig, n, r1, imax, 'IS final', VERDE);
  trazarLM(fig, b, r0.M, ymax, 'LM inicial', ROJO);
  if (Math.abs(r1.M - r0.M) > 1e-9)
    trazarLM(fig, n, r1.M, ymax, fijo ? 'LM final (M endógena)' : 'LM final', MORADO, 'dash');
  fig.data.push({
    type: 'scatter',
    x: [0, ymax],
    y: [b.istar, b.istar],
    mode: 'lines',
    name: 'Tasa externa i*',
    line: { color: SUAVE, width: 1.5, dash: 'dot' },
  });
  if (n.istar !== b.istar)
    fig.data.push({
      type: 'scatter',
      x: [0, ymax],
      y: [n.istar, n.istar],
      mode: 'lines',
      name: 'i* después del choque',
      line: { color: SUAVE, width: 1.5, dash: 'dashdot' },
    });
  punto(fig, r0.Y, r0.i, 'Equilibrio inicial', undefined, undefined, 'E₀');
  if (hayChoque) punto(fig, r1.Y, r1.i, 'Equilibrio final', DORADO, 'diamond', 'E₁');

  // Panel derecho: paridad de intereses en el plano (e, i).
  const is = linspace(0, imax, 80);
  for (const [q, r, nombre, color, dash] of [
    [b, r0, 'Paridad inicial', AZUL, 'solid'],
    ...(hayChoque ? [[n, r1, 'Paridad final', VERDE, 'dash']] : []),
  ] as [ParamsMF, ResMF, string, string, string][]) {
    if (fijo) {
      fig.data.push({
        type: 'scatter',
        x: [r.e, r.e],
        y: [0, imax],
        xaxis: 'x2',
        mode: 'lines',
        name: `${nombre} (ē)`,
        line: { color, width: 2.5, dash },
      });
    } else {
      const es = is.map((i) => paridad(q.ee, q.istar, i));
      fig.data.push({
        type: 'scatter',
        x: es.map((e) => (e <= emax * 1.5 ? e : null)),
        y: is,
        xaxis: 'x2',
        mode: 'lines',
        name: nombre,
        line: { color, width: 2.5, dash },
      });
    }
  }
  punto(fig, r0.e, r0.i, 'Paridad: inicial', undefined, undefined, undefined, {
    xaxis: 'x2',
    showlegend: false,
  });
  if (hayChoque)
    punto(fig, r1.e, r1.i, 'Paridad: final', DORADO, 'diamond', undefined, {
      xaxis: 'x2',
      showlegend: false,
    });

  const lecturas: Bloque[] = [];
  if (r0.i < 0 || r1.i < 0)
    lecturas.push(
      aviso('La tasa interna resulta negativa: el modelo ignora aquí el límite inferior cero.'),
    );
  if (hayChoque) {
    const de = r1.e - r0.e;
    lecturas.push(
      texto(
        `Y cambia en ${fmt(delta(r1.Y - r0.Y), 2)}, i en ${fmt(delta(r1.i - r0.i), 3)} puntos y e en ${fmt(delta(de), 4)} ` +
          `(${Math.abs(de) < 1e-9 ? 'sin cambio' : de > 0 ? 'depreciación' : 'apreciación'}); XN pasa de ${fmt(r0.XN, 2)} a ${fmt(r1.XN, 2)}.`,
        'destacado',
      ),
    );
    if (!fijo && p.dG !== 0)
      lecturas.push(
        texto(
          'Con tipo de cambio flexible, la expansión fiscal sube i, atrae capitales y aprecia la moneda: las exportaciones netas caen y el multiplicador es menor que en economía cerrada.',
          'pequeno texto-suave',
        ),
      );
    if (fijo && p.dG !== 0)
      lecturas.push(
        texto(
          `Con cambio fijo el banco central debe mantener i = i*: acomoda la expansión fiscal emitiendo dinero (M pasa de ${fmt(r0.M, 2)} a ${fmt(r1.M, 2)}).`,
          'pequeno texto-suave',
        ),
      );
    if (!fijo && p.dM !== 0)
      lecturas.push(
        texto(
          'La política monetaria funciona por dos vías: baja i (más inversión) y deprecia e (más exportaciones netas).',
          'pequeno texto-suave',
        ),
      );
  } else
    lecturas.push(
      texto('Mueve los choques para comparar los dos regímenes cambiarios.', 'pequeno texto-suave'),
    );
  if (fijo)
    lecturas.push(
      texto(
        'Bajo cambio fijo la política monetaria pierde autonomía: la cantidad de dinero es la que sostiene ē.',
        'pequeno texto-suave',
      ),
    );

  const panel = [
    resultados([
      lectura(
        `Equilibrio con tipo de cambio ${fijo ? 'fijo' : 'flexible'}`,
        tabla(
          [
            ['Producto Y', r0.Y, r1.Y],
            ['Tasa de interés i (%)', r0.i, r1.i],
            ['Tipo de cambio e', r0.e, r1.e],
            ['Exportaciones netas XN', r0.XN, r1.XN],
            [fijo ? 'Dinero M (endógeno)' : 'Dinero M', r0.M, r1.M],
            ['Consumo C', r0.C, r1.C],
            ['Inversión I', r0.I, r1.I],
          ],
          ['', 'Inicial', 'Final'],
        ),
      ),
      lectura(
        'Convención',
        texto(
          'e = pesos por unidad de moneda extranjera: si e sube, el peso se deprecia y las exportaciones netas aumentan (φ > 0).',
          'pequeno',
        ),
        texto(
          'Blanchard define E al revés (moneda extranjera por unidad nacional), pero las conclusiones son las mismas.',
          'pequeno texto-suave',
        ),
      ),
      lectura(
        'Lectura',
        ...lecturas,
        ref('caps. 19–20: producción, tasa de interés y tipo de cambio; regímenes cambiarios.'),
      ),
    ]),
  ];
  return { fig, panel };
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 580,
  grupos: [
    {
      titulo: 'Régimen cambiario',
      controles: [
        {
          id: 'regimen',
          etiqueta: 'Tipo de cambio',
          tipo: 'selector',
          opciones: [
            { valor: 'flexible', etiqueta: 'Flexible' },
            { valor: 'fijo', etiqueta: 'Fijo' },
          ],
        },
      ],
    },
    {
      titulo: 'Sector externo',
      controles: [
        {
          id: 'istar',
          etiqueta: 'Tasa externa i* (%)',
          tipo: 'slider',
          min: 0,
          max: 15,
          paso: 0.25,
        },
        {
          id: 'x0',
          etiqueta: 'Exportaciones netas autónomas x₀',
          tipo: 'slider',
          min: 0,
          max: 300,
          paso: 5,
        },
        {
          id: 'phi',
          etiqueta: 'Sensibilidad de XN a e: φ',
          tipo: 'slider',
          min: 0,
          max: 200,
          paso: 5,
        },
        {
          id: 'q',
          etiqueta: 'Propensión a importar q',
          tipo: 'slider',
          min: 0,
          max: 0.5,
          paso: 0.01,
        },
      ],
    },
    {
      titulo: 'Tipo de cambio esperado',
      visibleSi: (p) => p['regimen'] !== 'fijo',
      controles: [{ id: 'ee', etiqueta: 'eᵉ', tipo: 'slider', min: 0.5, max: 2, paso: 0.05 }],
    },
    {
      titulo: 'Paridad fijada',
      visibleSi: (p) => p['regimen'] === 'fijo',
      controles: [{ id: 'ebar', etiqueta: 'ē', tipo: 'slider', min: 0.5, max: 2, paso: 0.05 }],
    },
    {
      titulo: 'Dinero: M/P = k·Y − h·i  (P = 1)',
      visibleSi: (p) => p['regimen'] !== 'fijo',
      controles: [
        { id: 'M', etiqueta: 'Oferta de dinero M', tipo: 'slider', min: 50, max: 1000, paso: 10 },
      ],
    },
    {
      titulo: 'Demanda de dinero',
      controles: [
        {
          id: 'k',
          etiqueta: 'Sensibilidad al ingreso k',
          tipo: 'slider',
          min: 0.1,
          max: 1,
          paso: 0.05,
        },
        {
          id: 'h',
          etiqueta: 'Sensibilidad a la tasa h',
          tipo: 'slider',
          min: 1,
          max: 100,
          paso: 1,
        },
      ],
    },
    {
      titulo: 'Consumo, inversión y política fiscal',
      controles: [
        { id: 'c0', etiqueta: 'Consumo autónomo c₀', tipo: 'slider', min: 0, max: 300, paso: 5 },
        {
          id: 'c1',
          etiqueta: 'Propensión a consumir c₁',
          tipo: 'slider',
          min: 0,
          max: 0.9,
          paso: 0.01,
        },
        { id: 'b0', etiqueta: 'Inversión autónoma b₀', tipo: 'slider', min: 0, max: 300, paso: 5 },
        {
          id: 'b1',
          etiqueta: 'Sensibilidad a las ventas b₁',
          tipo: 'slider',
          min: 0,
          max: 0.3,
          paso: 0.01,
        },
        {
          id: 'b2',
          etiqueta: 'Sensibilidad a la tasa b₂',
          tipo: 'slider',
          min: 0,
          max: 40,
          paso: 1,
        },
        { id: 'G', etiqueta: 'Gasto público G', tipo: 'slider', min: 0, max: 500, paso: 5 },
        { id: 'T', etiqueta: 'Impuestos T', tipo: 'slider', min: 0, max: 400, paso: 5 },
      ],
    },
    {
      titulo: 'Choques',
      controles: [
        { id: 'dG', etiqueta: 'ΔG', tipo: 'slider', min: -150, max: 150, paso: 5 },
        { id: 'dis', etiqueta: 'Δi* (puntos)', tipo: 'slider', min: -5, max: 5, paso: 0.25 },
      ],
    },
    {
      visibleSi: (p) => p['regimen'] !== 'fijo',
      controles: [{ id: 'dM', etiqueta: 'ΔM', tipo: 'slider', min: -300, max: 300, paso: 10 }],
    },
    {
      visibleSi: (p) => p['regimen'] === 'fijo',
      controles: [
        {
          id: 'debar',
          etiqueta: 'Devaluación de ē (%)',
          tipo: 'slider',
          min: -30,
          max: 30,
          paso: 1,
        },
      ],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
