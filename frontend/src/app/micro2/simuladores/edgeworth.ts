import { Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import { AZUL, COLORES, DORADO, ROJO, SUAVE, VERDE, aviso, figuraVacia, lectura, resultados, tabla, texto } from '../../core/tema';
import { ParamsEdgeworth, ResEdgeworth, contrato, excesoDemanda, indiferencia, utilidad, walras } from '../modelos/mercados';
import { Panel, curvaP, ejeX, ejeY, equilibrioP, figuraPaneles, flecha } from '../../macro2/simuladores/_paneles';
import { refVarian } from './_comun';

const SIM_ID = 'm2-edgeworth';
// u_A = x₁^0.6·x₂^0.4, u_B = x₁^0.3·x₂^0.7, ωᴬ = (8, 2), ωᴮ = (2, 8) ⇒ p₁/p₂ = 3.6/4.6.
const DEF = { a: 0.6, b: 0.3, wA1: 8, wA2: 2, wB1: 2, wB2: 8 };
type P = typeof DEF;

export const parametros = (p: P): ParamsEdgeworth => ({ a: p.a, b: p.b, wA1: p.wA1, wA2: p.wA2, wB1: p.wB1, wB2: p.wB2 });

/** Curva de indiferencia de B dibujada en coordenadas de A: x₂ᴬ = ω₂ − x₂ᴮ(ω₁ − x₁ᴬ). */
export const indiferenciaB = (q: ParamsEdgeworth, uB: number, xA1: number): number => {
  const w1 = q.wA1 + q.wB1;
  const w2 = q.wA2 + q.wB2;
  return w2 - indiferencia(q.b, uB, w1 - xA1);
};

export function calcular(p: P): Simulacion {
  const q = parametros(p);
  let r: ResEdgeworth;
  try {
    r = walras(q);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const { w1, w2 } = r;
  const C: Panel = {
    id: '',
    titulo: 'Caja de Edgeworth (origen de A abajo a la izquierda, de B arriba a la derecha)',
    tituloX: 'Bien 1 de A, x₁ᴬ  (B: x₁ᴮ = ω₁ − x₁ᴬ)',
    tituloY: 'Bien 2 de A, x₂ᴬ  (B: x₂ᴮ = ω₂ − x₂ᴬ)',
    rangoX: [0, w1],
    rangoY: [0, w2],
    dominio: { x: [0, 1], y: [0, 0.93] },
    movil: { x: [0, 1], y: [0, 0.93] },
  };
  const fig = figuraPaneles(SIM_ID, [C], 560);
  const dentro = (y: number) => (Number.isFinite(y) && y >= 0 && y <= w2 ? y : null);
  const xs = linspace(w1 / 600, w1 * (1 - 1 / 600), 300);
  const hoverB = `x₁ᴬ = %{x:.3f}, x₂ᴬ = %{y:.3f}<extra></extra>`;

  // Lente de mejoras de Pareto: uᴬ ≥ uᴬ(ω) y uᴮ ≥ uᴮ(ω).
  if (r.uA0 > 0 && r.uB0 > 0) {
    const lente = xs.filter((x) => indiferenciaB(q, r.uB0, x) > indiferencia(q.a, r.uA0, x));
    if (lente.length > 2) {
      const abajo = lente.map((x) => indiferencia(q.a, r.uA0, x));
      const arriba = lente.map((x) => indiferenciaB(q, r.uB0, x));
      fig.data.push({
        type: 'scatter',
        x: [...lente, ...[...lente].reverse()],
        y: [...abajo, ...[...arriba].reverse()],
        xaxis: ejeX(C),
        yaxis: ejeY(C),
        mode: 'lines',
        fill: 'toself',
        fillcolor: 'rgba(245, 196, 81, 0.12)',
        line: { width: 0 },
        name: 'Lente: asignaciones que mejoran a ambos',
        hoverinfo: 'name',
      });
    }
    curvaP(fig, C, xs, xs.map((x) => dentro(indiferencia(q.a, r.uA0, x))), 'Indiferencia de A por ω', AZUL, 'intermedio', 'uᴬ(ω)');
    curvaP(fig, C, xs, xs.map((x) => dentro(indiferenciaB(q, r.uB0, x))), 'Indiferencia de B por ω', ROJO, 'intermedio', 'uᴮ(ω)');
  }
  // Curvas de indiferencia que pasan por el equilibrio (tangentes entre sí y a la recta de precios).
  curvaP(fig, C, xs, xs.map((x) => dentro(indiferencia(q.a, r.uA, x))), 'Indiferencia de A en el equilibrio', AZUL, 'final', 'uᴬ*');
  curvaP(fig, C, xs, xs.map((x) => dentro(indiferenciaB(q, r.uB, x))), 'Indiferencia de B en el equilibrio', ROJO, 'final', 'uᴮ*');
  // Curva de contrato y núcleo (tramo dentro del lente).
  const xc = linspace(0, w1, 300);
  curvaP(fig, C, xc, xc.map((x) => contrato(q, x)), 'Curva de contrato (TMSᴬ = TMSᴮ)', VERDE, 'final', 'curva de contrato');
  const nucleo = xc.filter((x) => {
    const y = contrato(q, x);
    return utilidad(q.a, x, y) >= r.uA0 - 1e-12 && utilidad(q.b, w1 - x, w2 - y) >= r.uB0 - 1e-12;
  });
  if (nucleo.length > 1)
    fig.data.push({
      type: 'scatter',
      x: nucleo,
      y: nucleo.map((x) => contrato(q, x)),
      xaxis: ejeX(C),
      yaxis: ejeY(C),
      mode: 'lines',
      name: 'Núcleo (contrato dentro del lente)',
      line: { color: VERDE, width: 8 },
      opacity: 0.35,
      hovertemplate: hoverB,
    });
  // Recta de precios walrasiana por ω: x₂ᴬ = ω₂ᴬ − (p₁/p₂)·(x₁ᴬ − ω₁ᴬ).
  const recta = (x: number) => q.wA2 - r.p * (x - q.wA1);
  const xr = linspace(0, w1, 60);
  curvaP(fig, C, xr, xr.map((x) => dentro(recta(x))), `Recta de precios (p₁/p₂ = ${fmt(r.p, 4)})`, DORADO, 'intermedio', 'p₁/p₂');

  equilibrioP(fig, C, q.wA1, q.wA2, 'Dotación inicial ω', 'ω', SUAVE, { decX: 3, decY: 3 });
  equilibrioP(fig, C, r.xA1, r.xA2, 'Equilibrio walrasiano x*', 'x*', DORADO, { decX: 3, decY: 3, simbolo: 'diamond' });
  flecha(fig, C, [q.wA1, q.wA2], [r.xA1, r.xA2], DORADO);
  fig.layout.annotations.push(
    { x: 0, y: 0, xref: 'x', yref: 'y', text: '<b>Oᴬ</b>', showarrow: false, xanchor: 'left', yanchor: 'bottom', xshift: 4, yshift: 4, font: { color: AZUL } },
    { x: w1, y: w2, xref: 'x', yref: 'y', text: '<b>Oᴮ</b>', showarrow: false, xanchor: 'right', yanchor: 'top', xshift: -4, yshift: -4, font: { color: ROJO } },
  );
  // Marco de la caja.
  fig.data.push({
    type: 'scatter',
    x: [0, w1, w1, 0, 0],
    y: [0, 0, w2, w2, 0],
    mode: 'lines',
    line: { color: COLORES.borde, width: 2 },
    hoverinfo: 'skip',
    name: 'Caja',
  });

  const [z1, z2] = excesoDemanda(q, r.p);
  const mejoraA = r.uA >= r.uA0 - 1e-12;
  const mejoraB = r.uB >= r.uB0 - 1e-12;
  const panel = [
    resultados([
      lectura(
        'Equilibrio walrasiano (p₂ = 1)',
        tabla(
          [
            ['Precio relativo p₁/p₂', r.p, null],
            ['Dotación ω (A)', q.wA1, q.wA2],
            ['Asignación de A, x*ᴬ', r.xA1, r.xA2],
            ['Asignación de B, x*ᴮ', r.xB1, r.xB2],
            ['Exceso de demanda (z₁, z₂)', z1, z2],
          ],
          ['', 'Bien 1', 'Bien 2'],
        ),
      ),
      lectura(
        'Bienestar',
        tabla(
          [
            ['Utilidad de A', r.uA0, r.uA],
            ['Utilidad de B', r.uB0, r.uB],
          ],
          ['', 'En ω', 'En x*'],
        ),
        texto(
          `Ley de Walras: p₁·z₁ + p₂·z₂ = ${fmt(r.p * z1 + z2, 6)}. Primer teorema del bienestar: x* está en la curva de contrato ` +
            `(TMSᴬ = TMSᴮ = p₁/p₂) y ${mejoraA && mejoraB ? 'dentro del núcleo: ambos mejoran o quedan igual que en ω' : 'no empeora a nadie'}.`,
          'pequeno texto-suave',
        ),
      ),
      lectura(
        'Lectura',
        texto(
          'Cada punto de la caja reparte la dotación total entre A y B. En ω las curvas de indiferencia se cortan: hay un lente de intercambios que mejoran a ambos. ' +
            'Al precio walrasiano la recta de precios que pasa por ω es tangente a las dos curvas de indiferencia en el mismo punto x*.',
          'destacado',
        ),
        refVarian('«El intercambio»: caja de Edgeworth, asignaciones eficientes en el sentido de Pareto, curva de contrato, equilibrio de mercado y ley de Walras.'),
      ),
    ]),
  ];
  return { fig, panel };
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 600,
  grupos: [
    {
      titulo: 'Preferencias Cobb-Douglas',
      controles: [
        { id: 'a', etiqueta: 'A: uᴬ = x₁ᵃ·x₂¹⁻ᵃ, a', tipo: 'slider', min: 0.1, max: 0.9, paso: 0.05 },
        { id: 'b', etiqueta: 'B: uᴮ = x₁ᵇ·x₂¹⁻ᵇ, b', tipo: 'slider', min: 0.1, max: 0.9, paso: 0.05 },
      ],
    },
    {
      titulo: 'Dotaciones iniciales ω',
      controles: [
        { id: 'wA1', etiqueta: 'ω₁ᴬ (bien 1 de A)', tipo: 'slider', min: 0, max: 20, paso: 0.5 },
        { id: 'wA2', etiqueta: 'ω₂ᴬ (bien 2 de A)', tipo: 'slider', min: 0, max: 20, paso: 0.5 },
        { id: 'wB1', etiqueta: 'ω₁ᴮ (bien 1 de B)', tipo: 'slider', min: 0, max: 20, paso: 0.5 },
        { id: 'wB2', etiqueta: 'ω₂ᴮ (bien 2 de B)', tipo: 'slider', min: 0, max: 20, paso: 0.5 },
      ],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
