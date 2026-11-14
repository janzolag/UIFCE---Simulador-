import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import {
  AZUL, COLORES, DORADO, ROJO, SUAVE, VERDE, aviso, figura, figuraVacia, lectura, punto, resultados, tabla, texto,
} from '../../core/tema';
import { JUEGOS, Juego2x2, gatillo, induccion, nashMixto, nashPuros, pago, respuestaA, respuestaB, validarJuego } from '../modelos/juegos';
import { refLozano } from './_comun';

const SIM_ID = 'm3-juegos';
const DEF = { enfoque: 'normal' as string, juego: 'dilema' as string, ...JUEGOS['dilema'].pagos, delta: 0.6 };
type P = typeof DEF;

export const pagosDe = (p: P): Juego2x2 => ({
  a11: p.a11, a12: p.a12, a21: p.a21, a22: p.a22, b11: p.b11, b12: p.b12, b21: p.b21, b22: p.b22,
});

const acciones = (p: P): [string, string] => JUEGOS[p.juego]?.acciones ?? ['1', '2'];
const nombreA = (p: P, i: number) => `A${i === 0 ? '₁' : '₂'} (${acciones(p)[i]})`;
const nombreB = (p: P, j: number) => `B${j === 0 ? '₁' : '₂'} (${acciones(p)[j]})`;

/** Matriz de pagos (A, B) como tabla. */
function matriz(p: P, g: Juego2x2): Bloque {
  const celda = (i: number, j: number) => `(${fmt(pago.A(g, i, j))}, ${fmt(pago.B(g, i, j))})`;
  return tabla(
    [
      [nombreA(p, 0), celda(0, 0), celda(0, 1)],
      [nombreA(p, 1), celda(1, 0), celda(1, 1)],
    ],
    ['A \\ B', nombreB(p, 0), nombreB(p, 1)],
  );
}

function normal(p: P, g: Juego2x2): Simulacion {
  const fig = figura('Probabilidad de que B juegue B₁, q', 'Probabilidad de que A juegue A₁, p', SIM_ID + '-normal', {
    xaxis: { range: [-0.03, 1.03] },
    yaxis: { range: [-0.03, 1.03] },
  });
  const rA = respuestaA(g);
  const rB = respuestaB(g);
  fig.data.push({ type: 'scatter', x: rA.q, y: rA.p, mode: 'lines', name: 'Mejor respuesta de A, p(q)', line: { color: AZUL, width: 4 } });
  fig.data.push({ type: 'scatter', x: rB.q, y: rB.p, mode: 'lines', name: 'Mejor respuesta de B, q(p)', line: { color: ROJO, width: 3, dash: 'dash' } });
  const puros = nashPuros(g);
  for (const [i, j] of puros) {
    const [q, pr] = [j === 0 ? 1 : 0, i === 0 ? 1 : 0];
    // Etiqueta hacia el interior del cuadrado para que no se corte en las esquinas.
    const posicion = `${pr === 1 ? 'bottom' : 'top'} ${q === 1 ? 'left' : 'right'}`;
    punto(fig, q, pr, `Nash puro (${nombreA(p, i)}, ${nombreB(p, j)})`, DORADO, 'diamond', `(A${i + 1}, B${j + 1})`, { textposition: posicion });
  }
  const mixto = nashMixto(g);
  if (mixto) punto(fig, mixto.q, mixto.p, 'Nash en estrategias mixtas', VERDE, 'circle', 'mixto');
  const filas: (string | number | null)[][] = puros.map(([i, j]) => [
    `Puro: (A${i + 1}, B${j + 1})`, pago.A(g, i, j), pago.B(g, i, j),
  ]);
  if (mixto) filas.push([`Mixto: p = ${fmt(mixto.p, 3)}, q = ${fmt(mixto.q, 3)}`, mixto.uA, mixto.uB]);
  const panel = [
    resultados([
      lectura('Matriz de pagos (A, B)', matriz(p, g)),
      lectura(
        'Equilibrios de Nash',
        filas.length ? tabla(filas, ['Equilibrio', 'Pago esperado de A', 'Pago esperado de B']) : aviso('Este juego no tiene equilibrios aislados.'),
      ),
      lectura(
        'Lectura',
        texto(
          'Cada cruce de las mejores respuestas es un equilibrio de Nash: ningún jugador gana desviándose solo. ' +
            'En el mixto, la probabilidad de cada jugador deja indiferente al otro entre sus dos acciones.',
          'destacado',
        ),
        refLozano('juegos en forma normal: mejores respuestas y equilibrio de Nash en estrategias puras y mixtas.'),
      ),
    ]),
  ];
  return { fig, panel };
}

function extensiva(p: P, g: Juego2x2): Simulacion {
  const fig = figura('Acciones de A (arriba) y respuestas de B (abajo)', 'Etapas del juego', SIM_ID + '-extensiva', {
    xaxis: { range: [0, 1], showticklabels: false, showgrid: false, zeroline: false },
    yaxis: { range: [-0.12, 1.12], showticklabels: false, showgrid: false, zeroline: false },
    showlegend: false,
    annotations: [],
  });
  const raiz: [number, number] = [0.5, 1];
  const nodosB: [number, number][] = [[0.25, 0.55], [0.75, 0.55]];
  const hojas: [number, number][][] = [
    [[0.12, 0.08], [0.38, 0.08]],
    [[0.62, 0.08], [0.88, 0.08]],
  ];
  const sol = induccion(g);
  const rama = (de: [number, number], a: [number, number], activa: boolean, etiqueta: string) => {
    fig.data.push({
      type: 'scatter', x: [de[0], a[0]], y: [de[1], a[1]], mode: 'lines', hoverinfo: 'skip', showlegend: false,
      line: { color: activa ? DORADO : SUAVE, width: activa ? 5 : 1.8 },
    });
    fig.layout.annotations.push({
      x: (de[0] + a[0]) / 2, y: (de[1] + a[1]) / 2, text: etiqueta, showarrow: false, xshift: de[0] < a[0] ? 14 : -14,
      font: { size: 12, color: activa ? DORADO : SUAVE },
    });
  };
  for (const i of [0, 1]) {
    rama(raiz, nodosB[i], sol.jugadaA === i, `A${i + 1}`);
    for (const j of [0, 1]) {
      rama(nodosB[i], hojas[i][j], sol.respuestaB[i] === j, `B${j + 1}`);
      const enCamino = sol.resultado[0] === i && sol.resultado[1] === j;
      fig.layout.annotations.push({
        x: hojas[i][j][0], y: hojas[i][j][1], text: `(${fmt(pago.A(g, i, j))}, ${fmt(pago.B(g, i, j))})`, showarrow: false, yshift: -16,
        font: { size: 13, color: enCamino ? DORADO : COLORES.texto },
      });
    }
  }
  fig.data.push({
    type: 'scatter', x: [raiz[0]], y: [raiz[1]], mode: 'markers+text', text: ['A'], textposition: 'top center', name: 'Nodo de A',
    marker: { size: 16, color: AZUL }, hovertemplate: 'A decide<extra></extra>',
  });
  fig.data.push({
    type: 'scatter', x: nodosB.map((n) => n[0]), y: nodosB.map((n) => n[1]), mode: 'markers+text', text: ['B', 'B'],
    textposition: 'middle left', name: 'Nodos de B', marker: { size: 14, color: ROJO }, hovertemplate: 'B decide<extra></extra>',
  });
  const hojasPlanas = hojas.flat();
  fig.data.push({
    type: 'scatter', x: hojasPlanas.map((h) => h[0]), y: hojasPlanas.map((h) => h[1]), mode: 'markers', name: 'Pagos (A, B)',
    marker: { size: 9, color: SUAVE }, hoverinfo: 'skip',
  });
  const [i, j] = sol.resultado;
  const simultaneo = nashPuros(g);
  const panel = [
    resultados([
      lectura(
        'Inducción hacia atrás',
        tabla([
          [`Si A juega A₁, B responde`, `B${sol.respuestaB[0] + 1}`],
          [`Si A juega A₂, B responde`, `B${sol.respuestaB[1] + 1}`],
          ['A anticipa y juega', `A${sol.jugadaA + 1}`],
          ['Resultado (A, B)', `(${fmt(pago.A(g, i, j))}, ${fmt(pago.B(g, i, j))})`],
        ]),
      ),
      lectura(
        'Equilibrio de Nash perfecto en subjuegos (ENPS)',
        texto(
          `Estrategia de B: (B${sol.respuestaB[0] + 1} si A₁, B${sol.respuestaB[1] + 1} si A₂); estrategia de A: A${sol.jugadaA + 1}. ` +
            'Las ramas doradas son las elecciones óptimas en cada nodo, incluso fuera del camino de equilibrio.',
          'destacado',
        ),
        texto(
          simultaneo.length
            ? `En el juego simultáneo los Nash puros son ${simultaneo.map(([a, b]) => `(A${a + 1}, B${b + 1})`).join(' y ')}; mover primero puede cambiar el resultado (ventaja del primero en mover).`
            : 'El juego simultáneo no tiene Nash puros, pero el secuencial siempre tiene solución por inducción hacia atrás.',
          'pequeno texto-suave',
        ),
        refLozano('juegos en forma extensiva: inducción hacia atrás y perfección en subjuegos.'),
      ),
    ]),
  ];
  return { fig, panel };
}

function repetido(p: P, g: Juego2x2): Simulacion {
  const r = gatillo(g);
  const delta = p.delta;
  if (!(Number.isFinite(delta) && delta >= 0 && delta < 1)) throw new ErrorParametro('El factor de descuento δ debe estar en [0, 1).');
  const ds = linspace(0, 0.99, 100);
  const top = Math.max(r.T, r.R, r.P, 1) * 1.15;
  const fig = figura('Factor de descuento δ', 'Pago promedio por período (1 − δ)·V', SIM_ID + '-repetido', {
    xaxis: { range: [0, 1] },
    yaxis: { range: [0, top] },
  });
  fig.data.push({ type: 'scatter', x: ds, y: ds.map(() => r.R), mode: 'lines', name: `Cooperar siempre: R = ${fmt(r.R)}`, line: { color: VERDE, width: 3 } });
  fig.data.push({
    type: 'scatter', x: ds, y: ds.map((d) => (1 - d) * r.T + d * r.P), mode: 'lines', name: 'Desviarse hoy y recibir castigo: (1 − δ)T + δP',
    line: { color: ROJO, width: 3 },
  });
  if (r.delta !== null && r.delta >= 0 && r.delta < 1) punto(fig, r.delta, r.R, 'Umbral δ*', DORADO, 'diamond', 'δ*');
  const coopera = r.delta !== null && delta >= r.delta;
  punto(fig, delta, coopera ? r.R : (1 - delta) * r.T + delta * r.P, 'δ elegido', AZUL, 'circle', 'δ');
  const panel = [
    resultados([
      lectura('Matriz de la etapa (A, B)', matriz(p, g)),
      lectura(
        'Estrategia gatillo',
        tabla([
          ['Tentación T (A₂ contra B₁)', r.T], ['Recompensa R (A₁, B₁)', r.R], ['Castigo P (A₂, B₂)', r.P],
          ['Umbral δ* = (T − R)/(T − P)', r.delta], ['δ elegido', delta],
        ]),
        ...(r.esDilema ? [] : [aviso('Estos pagos no forman un dilema del prisionero (T > R > P ≥ S): el umbral pierde su lectura habitual.')]),
      ),
      lectura(
        'Lectura',
        texto(
          r.delta === null
            ? 'Desviarse no da más que cooperar: no se necesita amenaza para sostener la cooperación.'
            : coopera
              ? `Con δ = ${fmt(delta, 2)} ≥ δ* = ${fmt(r.delta, 3)} la cooperación (A₁, B₁) es un equilibrio perfecto en subjuegos: el castigo futuro pesa más que la ganancia de hoy.`
              : `Con δ = ${fmt(delta, 2)} < δ* = ${fmt(r.delta, 3)} los jugadores son impacientes: conviene desviarse y la cooperación no se sostiene.`,
          'destacado',
        ),
        refLozano('juegos repetidos infinitamente: estrategias gatillo y factor de descuento.'),
      ),
    ]),
  ];
  return { fig, panel };
}

export function calcular(p: P): Simulacion {
  const g = pagosDe(p);
  try {
    validarJuego(g);
    if (p.enfoque === 'extensiva') return extensiva(p, g);
    if (p.enfoque === 'repetido') return repetido(p, g);
    return normal(p, g);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
}

const pagoSlider = (id: string, etiqueta: string) => ({ id, etiqueta, tipo: 'slider' as const, min: 0, max: 10, paso: 1 });

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 560,
  grupos: [
    {
      controles: [
        {
          id: 'juego',
          etiqueta: 'Juego de partida',
          tipo: 'selector',
          opciones: Object.entries(JUEGOS).map(([valor, j]) => ({ valor, etiqueta: j.nombre })),
        },
      ],
    },
    {
      titulo: 'Pagos de A (aᵢⱼ)',
      controles: [pagoSlider('a11', 'a₁₁ (A₁, B₁)'), pagoSlider('a12', 'a₁₂ (A₁, B₂)'), pagoSlider('a21', 'a₂₁ (A₂, B₁)'), pagoSlider('a22', 'a₂₂ (A₂, B₂)')],
    },
    {
      titulo: 'Pagos de B (bᵢⱼ)',
      controles: [pagoSlider('b11', 'b₁₁ (A₁, B₁)'), pagoSlider('b12', 'b₁₂ (A₁, B₂)'), pagoSlider('b21', 'b₂₁ (A₂, B₁)'), pagoSlider('b22', 'b₂₂ (A₂, B₂)')],
    },
    {
      titulo: 'Juego repetido',
      visibleSi: (p) => p['enfoque'] === 'repetido',
      controles: [{ id: 'delta', etiqueta: 'Factor de descuento δ', tipo: 'slider', min: 0, max: 0.95, paso: 0.01 }],
    },
  ],
  planteamientos: {
    param: 'enfoque',
    opciones: [
      { valor: 'normal', titulo: 'Forma normal (Nash puras y mixtas)', resumen: 'Jugadas simultáneas: mejores respuestas en probabilidades y sus cruces (equilibrios de Nash).' },
      { valor: 'extensiva', titulo: 'Forma extensiva (inducción hacia atrás / ENPS)', resumen: 'A mueve primero y B observa: se resuelve desde el final del árbol hacia la raíz.' },
      { valor: 'repetido', titulo: 'Juegos repetidos (estrategias gatillo)', resumen: 'El juego se repite sin fin: cooperar se sostiene si δ ≥ (T − R)/(T − P).' },
    ],
  },
  /** Al elegir un juego de partida, los deslizadores toman sus pagos. */
  alCambiar: (anterior, nuevo) =>
    anterior['juego'] === nuevo['juego'] ? null : { ...(JUEGOS[String(nuevo['juego'])]?.pagos ?? JUEGOS['dilema'].pagos) },
  calcular: (p: Params) => calcular(p as unknown as P),
};
