import { Bloque, Figura, Params, Simulacion, SimuladorDef } from '../../core/tipos';
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
  punto,
  resultados,
  tabla,
  texto,
} from '../../core/tema';
import { ModoLM, ParamsISLM, ResISLM, curvaIS, equilibrioISLM } from '../modelos/islm';
import { GRUPOS_BIENES, delta, ref } from './_comun';

const SIM_ID = 'is-lm';
// IS: Y = (340 − 10·i)/0.3. Con ī = 5 %: Y = 966.7; ΔG = 50 lo lleva a 1,133.3.
const DEF = {
  c0: 100,
  c1: 0.6,
  T: 100,
  b0: 100,
  b1: 0.1,
  b2: 10,
  G: 200,
  modo: 'tasa' as string,
  ibar: 5,
  M: 400,
  k: 0.5,
  h: 20,
  dG: 50,
  dT: 0,
  di: 0,
  dM: 0,
};
type P = typeof DEF;

export function escenarios(p: P): [ParamsISLM, ParamsISLM] {
  const modo = (p.modo === 'oferta' ? 'oferta' : 'tasa') as ModoLM;
  const base: ParamsISLM = {
    c0: p.c0,
    c1: p.c1,
    T: p.T,
    b0: p.b0,
    b1: p.b1,
    b2: p.b2,
    G: p.G,
    modo,
    ibar: p.ibar,
    M: p.M,
    P: 1,
    k: p.k,
    h: p.h,
  };
  return [base, { ...base, G: p.G + p.dG, T: p.T + p.dT, ibar: p.ibar + p.di, M: p.M + p.dM }];
}

function trazarIS(
  fig: Figura,
  q: ParamsISLM,
  r: ResISLM,
  imax: number,
  nombre: string,
  color: string,
): void {
  const is = linspace(0, imax, 80);
  fig.data.push({
    type: 'scatter',
    x: is.map((i) => curvaIS(r.A, r.s, q.b2, i)),
    y: is,
    mode: 'lines',
    name: nombre,
    line: { color, width: 3 },
  });
}

function trazarLM(
  fig: Figura,
  q: ParamsISLM,
  ymax: number,
  imax: number,
  nombre: string,
  color: string,
  dash = 'solid',
): void {
  const line = { color, width: 3, dash };
  if (q.modo === 'tasa') {
    fig.data.push({
      type: 'scatter',
      x: [0, ymax],
      y: [q.ibar, q.ibar],
      mode: 'lines',
      name: nombre,
      line,
    });
    return;
  }
  const m = q.M / q.P;
  if (q.h === 0) {
    const yv = m / q.k;
    fig.data.push({
      type: 'scatter',
      x: [0, yv, yv],
      y: [0, 0, imax],
      mode: 'lines',
      name: nombre,
      line,
    });
    return;
  }
  const ys = linspace(0, ymax, 160);
  fig.data.push({
    type: 'scatter',
    x: ys,
    y: ys.map((y) => Math.max(0, (q.k * y - m) / q.h)),
    mode: 'lines',
    name: nombre,
    line,
  });
}

export function calcular(p: P): Simulacion {
  const [b, n] = escenarios(p);
  let r0: ResISLM;
  let r1: ResISLM;
  try {
    r0 = equilibrioISLM(b);
    r1 = equilibrioISLM(n);
  } catch (e) {
    if (e instanceof ErrorParametro)
      return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const choqueFiscal = p.dG !== 0 || p.dT !== 0;
  const choqueMonetario = b.modo === 'tasa' ? p.di !== 0 : p.dM !== 0;
  const hayChoque = choqueFiscal || choqueMonetario;
  const ymax = Math.max(r0.Y, r1.Y, 1) * 1.6;
  const imax = Math.max(r0.i, r1.i, b.modo === 'tasa' ? Math.max(b.ibar, n.ibar) : 0, 4) * 2;
  const fig = figura('Producto Y', 'Tasa de interés i (%)', SIM_ID, {
    xaxis: { range: [0, ymax] },
    yaxis: { range: [0, imax] },
  });
  trazarIS(fig, b, r0, imax, 'IS inicial', AZUL);
  if (choqueFiscal) trazarIS(fig, n, r1, imax, 'IS después del choque', VERDE);
  trazarLM(
    fig,
    b,
    ymax,
    imax,
    b.modo === 'tasa' ? 'LM: ī fijada por el banco central' : 'LM inicial',
    ROJO,
  );
  if (choqueMonetario) trazarLM(fig, n, ymax, imax, 'LM después del choque', MORADO, 'dash');

  // Producto si la tasa no se moviera: mide el efecto expulsión de la inversión.
  const ySinExpulsion = curvaIS(r1.A, r1.s, n.b2, r0.i);
  const hayExpulsion = choqueFiscal && b.modo === 'oferta' && Math.abs(ySinExpulsion - r1.Y) > 1e-6;
  if (hayExpulsion)
    fig.data.push({
      type: 'scatter',
      x: [r0.Y, ySinExpulsion],
      y: [r0.i, r0.i],
      mode: 'lines',
      showlegend: false,
      line: { color: SUAVE, dash: 'dot', width: 1.2 },
      hoverinfo: 'skip',
    });
  punto(fig, r0.Y, r0.i, 'Equilibrio inicial', undefined, undefined, 'E₀');
  if (hayExpulsion)
    punto(fig, ySinExpulsion, r0.i, 'Sin efecto expulsión (i constante)', SUAVE, 'circle-open');
  if (hayChoque) punto(fig, r1.Y, r1.i, 'Equilibrio final', DORADO, 'diamond', 'E₁');

  const lecturas: Bloque[] = [];
  if (r0.trampa || r1.trampa)
    lecturas.push(
      aviso(
        'Trampa de liquidez: la tasa llegó a 0 %. Más dinero ya no la baja, la LM es plana y solo la política fiscal mueve el producto.',
      ),
    );
  if (hayChoque)
    lecturas.push(
      texto(
        `El producto cambia en ${fmt(delta(r1.Y - r0.Y), 2)} y la tasa en ${fmt(delta(r1.i - r0.i), 3)} puntos.`,
        'destacado',
      ),
    );
  if (hayExpulsion)
    lecturas.push(
      texto(
        `Con la tasa fija el producto llegaría a ${fmt(ySinExpulsion, 2)}; la subida de i reduce la inversión y ` +
          `se pierden ${fmt(ySinExpulsion - r1.Y, 2)} (efecto expulsión).`,
        'pequeno texto-suave',
      ),
    );
  if (b.modo === 'tasa' && choqueFiscal)
    lecturas.push(
      texto(
        'Como el banco central mantiene ī, la expansión fiscal no sube la tasa: el multiplicador es el keynesiano 1/(1 − c₁ − b₁).',
        'pequeno texto-suave',
      ),
    );
  if (!hayChoque)
    lecturas.push(
      texto(
        'Mueve ΔG, ΔT o la política monetaria para desplazar las curvas.',
        'pequeno texto-suave',
      ),
    );

  const monetario = b.modo === 'tasa' ? 'dY/dī (por punto)' : 'dY/dM';
  const panel = [
    resultados([
      lectura(
        'Equilibrio en bienes y dinero',
        tabla(
          [
            ['Producto Y', r0.Y, r1.Y],
            ['Tasa de interés i (%)', r0.i, r1.i],
            ['Consumo C', r0.C, r1.C],
            ['Inversión I', r0.I, r1.I],
            ['Gasto autónomo A', r0.A, r1.A],
          ],
          ['', 'Inicial', 'Después del choque'],
        ),
      ),
      lectura(
        'Multiplicadores',
        tabla([
          ['Fiscal dY/dG', r0.multFiscal],
          ['Keynesiano 1/(1 − c₁ − b₁)', r0.multKeynes],
          [monetario, r0.multMonetario],
        ]),
        texto(
          b.modo === 'tasa'
            ? 'Versión de Blanchard: el banco central elige i y la LM es horizontal.'
            : 'LM con oferta monetaria fija: la tasa sube con Y porque crece la demanda de dinero.',
          'pequeno texto-suave',
        ),
      ),
      lectura(
        'Lectura',
        ...lecturas,
        ref('cap. 5, «Los mercados de bienes y financieros: el modelo IS-LM».'),
      ),
    ]),
  ];
  return { fig, panel };
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 560,
  grupos: [
    {
      titulo: 'Política monetaria',
      controles: [
        {
          id: 'modo',
          etiqueta: 'Regla del banco central',
          tipo: 'selector',
          opciones: [
            { valor: 'tasa', etiqueta: 'Fija la tasa ī (Blanchard)' },
            { valor: 'oferta', etiqueta: 'Fija la oferta de dinero M' },
          ],
        },
      ],
    },
    {
      titulo: 'LM: i = ī',
      visibleSi: (p) => p['modo'] !== 'oferta',
      controles: [
        {
          id: 'ibar',
          etiqueta: 'Tasa de política ī (%)',
          tipo: 'slider',
          min: 0,
          max: 15,
          paso: 0.25,
        },
      ],
    },
    {
      titulo: 'LM: M/P = k·Y − h·i  (P = 1)',
      visibleSi: (p) => p['modo'] === 'oferta',
      controles: [
        { id: 'M', etiqueta: 'Oferta de dinero M', tipo: 'slider', min: 50, max: 1000, paso: 10 },
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
          min: 0,
          max: 100,
          paso: 1,
        },
      ],
    },
    ...GRUPOS_BIENES,
    {
      titulo: 'Choques',
      controles: [
        { id: 'dG', etiqueta: 'ΔG', tipo: 'slider', min: -150, max: 150, paso: 5 },
        { id: 'dT', etiqueta: 'ΔT', tipo: 'slider', min: -150, max: 150, paso: 5 },
      ],
    },
    {
      visibleSi: (p) => p['modo'] !== 'oferta',
      controles: [
        { id: 'di', etiqueta: 'Δī (puntos)', tipo: 'slider', min: -5, max: 5, paso: 0.25 },
      ],
    },
    {
      visibleSi: (p) => p['modo'] === 'oferta',
      controles: [{ id: 'dM', etiqueta: 'ΔM', tipo: 'slider', min: -300, max: 300, paso: 10 }],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
