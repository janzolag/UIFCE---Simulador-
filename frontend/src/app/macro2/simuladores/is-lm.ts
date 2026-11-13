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
  ACENTO,
  aviso,
  figura,
  figuraVacia,
  lectura,
  punto,
  resultados,
  tabla,
  texto,
} from '../../core/tema';
import { ParamsISLM2, ResISLM2, equilibrioISLM2, finTrampa, isY, lmR } from '../modelos/islm';
import { curva, delta, equilibrio, refEstandar } from './_comun';

const SIM_ID = 'm2-is-lm';
// IS: Y = (350 + G − 0.75·T − 25·r)/0.25; LM: r = (0.5·Y − M/P)/25. Con G = 200, M/P = 500: Y* = 1200, r* = 4 %.
const DEF = {
  C0: 150,
  c: 0.75,
  I0: 200,
  b: 25,
  G: 200,
  T: 200,
  m: 500,
  k: 0.5,
  h: 25,
  dG: 0,
  dT: 0,
  dm: 0,
};
type P = typeof DEF;

export function escenarios(p: P): [ParamsISLM2, ParamsISLM2] {
  const base: ParamsISLM2 = {
    C0: p.C0,
    c: p.c,
    I0: p.I0,
    b: p.b,
    G: p.G,
    T: p.T,
    m: p.m,
    k: p.k,
    h: p.h,
  };
  return [base, { ...base, G: p.G + p.dG, T: p.T + p.dT, m: p.m + p.dm }];
}

export function calcular(p: P): Simulacion {
  const [b, n] = escenarios(p);
  let r0: ResISLM2;
  let r1: ResISLM2;
  try {
    if (!(b.m > 0) || !(n.m > 0)) throw new ErrorParametro('La oferta real de dinero M/P debe ser positiva.');
    r0 = equilibrioISLM2(b);
    r1 = equilibrioISLM2(n);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const fiscal = p.dG !== 0 || p.dT !== 0;
  const monetario = p.dm !== 0;
  const choque = fiscal || monetario;
  const ymax = Math.max(r0.Y, r1.Y, 1) * 1.5;
  const rmax = Math.max(r0.r, r1.r, 4) * 2;
  const fig = figura('Producto Y', 'Tasa de interés r (%)', SIM_ID, {
    xaxis: { range: [0, ymax] },
    yaxis: { range: [-rmax * 0.03, rmax] },
  });

  const rs = linspace(0, rmax, 90);
  const trazarIS = (q: ParamsISLM2, nombre: string, color: string, fantasma = false) =>
    curva(fig, rs.map((r) => isY(q, r)), rs, nombre, color, fantasma);
  const ys = linspace(0, ymax, 200);
  const trazarLM = (q: ParamsISLM2, nombre: string, color: string, fantasma = false) => {
    if (q.h === 0) {
      const yv = q.m / q.k;
      curva(fig, [yv, yv], [0, rmax], nombre, color, fantasma);
    } else curva(fig, ys, ys.map((y) => lmR(q, y)), nombre, color, fantasma);
  };

  if (fiscal) trazarIS(b, 'IS', AZUL, true);
  trazarIS(n, 'IS', fiscal ? VERDE : AZUL);
  if (monetario) trazarLM(b, 'LM', ROJO, true);
  trazarLM(n, 'LM', monetario ? MORADO : ROJO);

  // Zona de trampa de liquidez: tramo plano de la LM vigente en r = 0.
  const yTrampa = n.h > 0 ? Math.min(finTrampa(n), ymax) : 0;
  if (yTrampa > 0)
    fig.data.push({
      type: 'scatter',
      x: [0, yTrampa],
      y: [0, 0],
      mode: 'lines',
      name: 'Trampa de liquidez (LM plana en r = 0)',
      line: { color: ACENTO, width: 9 },
      opacity: 0.35,
      hovertemplate: 'Trampa de liquidez: r = 0 hasta Y = %{x:.0f}<extra></extra>',
    });

  // Efecto expulsión: producto si la tasa se quedara en r₀.
  const ySinExpulsion = isY(n, r0.r);
  const hayExpulsion = fiscal && Math.abs(ySinExpulsion - r1.Y) > 1e-6;
  if (hayExpulsion) {
    fig.data.push({
      type: 'scatter',
      x: [r0.Y, ySinExpulsion],
      y: [r0.r, r0.r],
      mode: 'lines',
      showlegend: false,
      line: { color: SUAVE, dash: 'dot', width: 1.2 },
      hoverinfo: 'skip',
    });
    punto(fig, ySinExpulsion, r0.r, 'Sin efecto expulsión (r constante)', SUAVE, 'circle-open');
  }
  const ejes = { x0: 0, y0: -rmax * 0.03 };
  equilibrio(fig, r0.Y, r0.r, choque ? 'Equilibrio inicial' : 'Equilibrio (Y*, r*)', 'E₀', choque ? SUAVE : DORADO, ejes);
  if (choque) equilibrio(fig, r1.Y, r1.r, 'Equilibrio final', 'E₁', DORADO, { ...ejes, simbolo: 'diamond' });

  const lecturas: Bloque[] = [];
  if (r1.trampa || r0.trampa)
    lecturas.push(
      aviso(
        'Trampa de liquidez: la tasa está en 0 % y la LM es plana. Más dinero ya no baja r ni mueve el producto; la política fiscal recupera el multiplicador completo 1/(1 − c).',
      ),
    );
  if (choque)
    lecturas.push(
      texto(
        `Y pasa de ${fmt(r0.Y, 2)} a ${fmt(r1.Y, 2)} (Δ = ${fmt(delta(r1.Y - r0.Y), 2)}) y r de ${fmt(r0.r, 2)} % a ${fmt(r1.r, 2)} %.`,
        'destacado',
      ),
    );
  if (hayExpulsion)
    lecturas.push(
      texto(
        `Efecto expulsión: con r fija el producto llegaría a ${fmt(ySinExpulsion, 2)}. La subida de r recorta la inversión privada en ` +
          `${fmt(Math.abs(delta(r1.I - r0.I)), 2)} (de ${fmt(r0.I, 2)} a ${fmt(r1.I, 2)}).`,
        'pequeno texto-suave',
      ),
    );
  if (!choque)
    lecturas.push(
      texto('Mueve ΔG, ΔT o Δ(M/P): la posición inicial queda como curva fantasma punteada.', 'pequeno texto-suave'),
    );
  if (r1.I < 0)
    lecturas.push(aviso('Con esta tasa la inversión calculada es negativa: la calibración sale del rango económico.'));

  const panel = [
    resultados([
      lectura(
        'Equilibrio (Y*, r*)',
        tabla(
          [
            ['Producto Y*', r0.Y, r1.Y],
            ['Tasa de interés r* (%)', r0.r, r1.r],
            ['Consumo C', r0.C, r1.C],
            ['Inversión I = I₀ − b·r', r0.I, r1.I],
          ],
          ['', 'Inicial', 'Después del choque'],
        ),
      ),
      lectura(
        'Multiplicadores',
        tabla([
          ['Fiscal dY/dG (con LM)', r1.multFiscal],
          ['Keynesiano 1/(1 − c)', r1.multKeynes],
          ['Monetario dY/d(M/P)', r1.multMonetario],
        ]),
      ),
      lectura(
        'Lectura',
        ...lecturas,
        refEstandar('IS-LM de economía cerrada; en Krugman y Obstfeld el análisis equivalente es el modelo DD-AA de economía abierta.'),
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
      titulo: 'Mercado de bienes (IS)',
      controles: [
        { id: 'C0', etiqueta: 'Consumo autónomo C₀', tipo: 'slider', min: 0, max: 400, paso: 10 },
        { id: 'c', etiqueta: 'Propensión a consumir c', tipo: 'slider', min: 0, max: 0.9, paso: 0.01 },
        { id: 'I0', etiqueta: 'Inversión autónoma I₀', tipo: 'slider', min: 0, max: 400, paso: 10 },
        { id: 'b', etiqueta: 'Sensibilidad de la inversión a r, b', tipo: 'slider', min: 0, max: 60, paso: 1 },
        { id: 'G', etiqueta: 'Gasto público G', tipo: 'slider', min: 0, max: 500, paso: 10 },
        { id: 'T', etiqueta: 'Impuestos T', tipo: 'slider', min: 0, max: 500, paso: 10 },
      ],
    },
    {
      titulo: 'Mercado de dinero (LM): M/P = k·Y − h·r',
      controles: [
        { id: 'm', etiqueta: 'Oferta real de dinero M/P', tipo: 'slider', min: 50, max: 1200, paso: 10 },
        { id: 'k', etiqueta: 'Sensibilidad al ingreso k', tipo: 'slider', min: 0.1, max: 1, paso: 0.05 },
        { id: 'h', etiqueta: 'Sensibilidad a la tasa h', tipo: 'slider', min: 0, max: 100, paso: 1 },
      ],
    },
    {
      titulo: 'Choques (estática comparativa)',
      controles: [
        { id: 'dG', etiqueta: 'ΔG', tipo: 'slider', min: -200, max: 200, paso: 10 },
        { id: 'dT', etiqueta: 'ΔT', tipo: 'slider', min: -200, max: 200, paso: 10 },
        { id: 'dm', etiqueta: 'Δ(M/P)', tipo: 'slider', min: -400, max: 600, paso: 10 },
      ],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
