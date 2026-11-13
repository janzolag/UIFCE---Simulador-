import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import {
  AZUL,
  DORADO,
  NARANJA,
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
import { ParamsSolow, ResSolow, estadoEstacionario, produccion } from '../modelos/solow';
import { curva, equilibrio, refEstandar } from './_comun';

const SIM_ID = 'm2-solow';
// y = k^0.5, s = 0.3, δ + n = 0.15 ⇒ k* = (0.3/0.15)² = 4, y* = 2. Regla de oro: s = 0.5, k = 11.11.
const DEF = {
  A: 1,
  alpha: 0.5,
  s: 0.3,
  delta: 0.1,
  n: 0.05,
  ds: 0,
  dn: 0,
  dA: 0,
};
type P = typeof DEF;

export function escenarios(p: P): [ParamsSolow, ParamsSolow] {
  const base: ParamsSolow = { A: p.A, alpha: p.alpha, s: p.s, delta: p.delta, n: p.n };
  return [base, { ...base, s: p.s + p.ds, n: p.n + p.dn, A: p.A + p.dA }];
}

export function calcular(p: P): Simulacion {
  const [b, n] = escenarios(p);
  let r0: ResSolow;
  let r1: ResSolow;
  try {
    r0 = estadoEstacionario(b);
    r1 = estadoEstacionario(n);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
  const choque = p.ds !== 0 || p.dn !== 0 || p.dA !== 0;
  // Vista acotada: hasta 1.6 veces el mayor de k* y k de la regla de oro (con tope razonable).
  const kmax = Math.max(r0.k, r1.k, Math.min(r1.kOro, Math.max(r0.k, r1.k) * 4), 1e-6) * 1.6;
  const ks = linspace(0, kmax, 200);
  const ymax = Math.max(produccion(n, kmax), produccion(b, kmax), (n.delta + n.n) * kmax) * 1.08;
  const fig = figura('Capital por trabajador k', 'Producción, inversión y depreciación por trabajador', SIM_ID, {
    xaxis: { range: [0, kmax] },
    yaxis: { range: [0, ymax] },
  });
  const tope = (v: number) => (v <= ymax * 1.5 ? v : null);

  if (p.dA !== 0) curva(fig, ks, ks.map((k) => tope(produccion(b, k))), 'y = A·kᵅ', AZUL, true);
  curva(fig, ks, ks.map((k) => tope(produccion(n, k))), 'y = A·kᵅ', AZUL);
  if (p.ds !== 0 || p.dA !== 0) curva(fig, ks, ks.map((k) => tope(b.s * produccion(b, k))), 's·f(k)', VERDE, true);
  curva(fig, ks, ks.map((k) => tope(n.s * produccion(n, k))), 's·f(k)', VERDE);
  if (p.dn !== 0) curva(fig, [0, kmax], [0, (b.delta + b.n) * kmax], '(δ + n)·k', ROJO, true);
  curva(fig, [0, kmax], [0, (n.delta + n.n) * kmax], '(δ + n)·k', ROJO);

  // Regla de oro: donde la pendiente de f iguala δ + n.
  if (r1.kOro <= kmax) {
    fig.data.push({
      type: 'scatter',
      x: [r1.kOro, r1.kOro],
      y: [(n.delta + n.n) * r1.kOro, r1.yOro],
      mode: 'lines',
      name: `Consumo de la regla de oro (s = ${fmt(r1.sOro, 2)})`,
      line: { color: NARANJA, width: 3 },
      hovertemplate: `c oro = ${fmt(r1.cOro, 3)}<extra></extra>`,
    });
    punto(fig, r1.kOro, r1.yOro, 'Regla de oro', NARANJA, 'star', 'k oro');
  }
  // Consumo en el estado estacionario: distancia entre f(k*) y s·f(k*).
  fig.data.push({
    type: 'scatter',
    x: [r1.k, r1.k],
    y: [r1.i, r1.y],
    mode: 'lines',
    name: 'Consumo c* = (1 − s)·y*',
    line: { color: DORADO, width: 2 },
    hovertemplate: `c* = ${fmt(r1.c, 3)}<extra></extra>`,
  });
  const ejes = { x0: 0, y0: 0, decX: 3, decY: 3 };
  if (choque) equilibrio(fig, r0.k, r0.i, 'Estado estacionario inicial', 'k₀*', SUAVE, ejes);
  equilibrio(fig, r1.k, r1.i, 'Estado estacionario s·f(k*) = (δ + n)·k*', 'k*', DORADO, { ...ejes, simbolo: 'diamond' });
  punto(fig, r1.k, r1.y, 'Producción y*', AZUL, 'circle', 'y*', {
    hovertemplate: 'y* = %{y:.3f}<extra></extra>',
  });

  const lecturas: Bloque[] = [];
  if (choque)
    lecturas.push(
      texto(
        `k* pasa de ${fmt(r0.k, 3)} a ${fmt(r1.k, 3)} y y* de ${fmt(r0.y, 3)} a ${fmt(r1.y, 3)}. ` +
          'En el nuevo estado estacionario el producto por trabajador vuelve a crecer a la tasa del progreso técnico (cero aquí).',
        'destacado',
      ),
    );
  const dif = n.s - r1.sOro;
  lecturas.push(
    texto(
      Math.abs(dif) < 1e-9
        ? 'La tasa de ahorro es la de la regla de oro: el consumo de estado estacionario es el máximo posible.'
        : dif < 0
          ? `s = ${fmt(n.s, 2)} < s oro = ${fmt(r1.sOro, 2)}: ahorrar más elevaría el consumo de largo plazo.`
          : `s = ${fmt(n.s, 2)} > s oro = ${fmt(r1.sOro, 2)}: hay exceso de capital; ahorrar menos elevaría el consumo hoy y mañana.`,
      'pequeno texto-suave',
    ),
    texto(
      `Convergencia: λ = (1 − α)(δ + n) = ${fmt(r1.lambda, 4)}; la mitad de la distancia a k* se cierra en unos ${fmt(r1.vidaMedia, 1)} períodos.`,
      'pequeno texto-suave',
    ),
  );
  if (!choque)
    lecturas.push(texto('Mueve Δs, Δn o ΔA: las curvas iniciales quedan como fantasmas punteadas.', 'pequeno texto-suave'));

  const panel = [
    resultados([
      lectura(
        'Estado estacionario',
        tabla(
          [
            ['Capital por trabajador k*', r0.k, r1.k],
            ['Producción y*', r0.y, r1.y],
            ['Inversión s·y*', r0.i, r1.i],
            ['Consumo c*', r0.c, r1.c],
          ],
          ['', 'Inicial', 'Después del choque'],
        ),
      ),
      lectura(
        'Regla de oro',
        tabla([
          ['Ahorro de la regla de oro s = α', r1.sOro],
          ['k de la regla de oro', r1.kOro],
          ['Consumo máximo c oro', r1.cOro],
        ]),
      ),
      lectura('Lectura', ...lecturas, refEstandar('modelo de Solow-Swan con Cobb-Douglas; Krugman y Obstfeld (2006) no lo cubre.')),
    ]),
  ];
  return { fig, panel };
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 560,
  grupos: [
    {
      titulo: 'Tecnología: y = A·kᵅ',
      controles: [
        { id: 'A', etiqueta: 'Productividad total de los factores A', tipo: 'slider', min: 0.5, max: 3, paso: 0.05 },
        { id: 'alpha', etiqueta: 'Participación del capital α', tipo: 'slider', min: 0.1, max: 0.8, paso: 0.05 },
      ],
    },
    {
      titulo: 'Acumulación: Δk = s·f(k) − (δ + n)·k',
      controles: [
        { id: 's', etiqueta: 'Tasa de ahorro s', tipo: 'slider', min: 0.05, max: 0.9, paso: 0.01 },
        { id: 'delta', etiqueta: 'Depreciación δ', tipo: 'slider', min: 0, max: 0.2, paso: 0.01 },
        { id: 'n', etiqueta: 'Crecimiento de la población n', tipo: 'slider', min: 0, max: 0.1, paso: 0.005 },
      ],
    },
    {
      titulo: 'Choques (estática comparativa)',
      controles: [
        { id: 'ds', etiqueta: 'Δs', tipo: 'slider', min: -0.2, max: 0.4, paso: 0.01 },
        { id: 'dn', etiqueta: 'Δn', tipo: 'slider', min: -0.04, max: 0.05, paso: 0.005 },
        { id: 'dA', etiqueta: 'ΔA', tipo: 'slider', min: -0.4, max: 1, paso: 0.05 },
      ],
    },
  ],
  calcular: (p: Params) => calcular(p as unknown as P),
};
