import { Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { ErrorParametro } from '../../core/errores';
import { fmt } from '../../core/formato';
import { linspace } from '../../core/numerico';
import { AZUL, DORADO, ROJO, SUAVE, VERDE, aviso, figura, figuraVacia, lectura, punto, resultados, tabla, texto } from '../../core/tema';
import { disposicion, limones, riesgoMoral, spence } from '../modelos/informacion';
import { refMonsalve } from './_comun';
import { referencia } from '../../core/tema';

const SIM_ID = 'm3-informacion';
// Limones: k = 1.5, θ ∈ [20, 100] ⇒ p* = 60 y se vende la mitad. Spence: θ_B = 2, θ_A = 4 ⇒ e ∈ [4, 8].
const DEF = {
  enfoque: 'seleccion' as string,
  tema: 'spence' as string,
  k: 1.5,
  tmin: 20,
  tmax: 100,
  tB: 2,
  tA: 4,
  e: 5,
  piA: 0.8,
  piB: 0.4,
  psi: 10,
  b: 20,
};
type P = typeof DEF;

const AUTOR_VARIAN = 'Varian, Microeconomía intermedia (cap. «La información asimétrica»)';

function seleccion(p: P): Simulacion {
  const q = { k: p.k, tmin: p.tmin, tmax: p.tmax };
  const r = limones(q);
  const top = Math.max(q.tmax, disposicion(q, q.tmax)) * 1.1;
  const ps = linspace(0, top, 200);
  const fig = figura('Precio p', 'Disposición a pagar y precio', SIM_ID + '-limones', {
    xaxis: { range: [0, top] },
    yaxis: { range: [0, top] },
  });
  fig.data.push({ type: 'scatter', x: [0, top], y: [0, top], mode: 'lines', name: 'Precio p (recta de 45°)', line: { color: SUAVE, width: 2, dash: 'dot' } });
  fig.data.push({
    type: 'scatter', x: ps, y: ps.map((v) => disposicion(q, v)), mode: 'lines', name: 'Disposición a pagar: k × calidad media ofrecida',
    line: { color: AZUL, width: 3 },
  });
  fig.data.push({
    type: 'scatter', x: [0, top], y: [q.k * (q.tmin + q.tmax) / 2, q.k * (q.tmin + q.tmax) / 2], mode: 'lines',
    name: 'Disposición con información completa', line: { color: VERDE, width: 2, dash: 'dash' },
  });
  punto(fig, r.p, r.p, 'Equilibrio con información asimétrica', DORADO, 'diamond', 'p*');
  const panel = [
    resultados([
      lectura(
        'Equilibrio del mercado de limones',
        tabla([
          ['Precio de equilibrio p*', r.p], ['Calidad media vendida', r.calidadMedia],
          ['Autos que se venden', `${fmt(r.fraccion * 100, 1)} %`], ['Ganancia perdida por auto', r.perdida],
        ]),
      ),
      lectura(
        'Lectura',
        texto(
          r.colapso
            ? 'El mercado colapsa: a cualquier precio los compradores esperan calidad tan baja que no pagan lo que piden los dueños de autos buenos.'
            : r.fraccion < 1
              ? `Solo se ofrecen los autos con θ ≤ ${fmt(r.p, 2)}: los buenos salen del mercado aunque los compradores los valoran más (k > 1). Es selección adversa.`
              : 'Con estos valores todos los autos se venden: la asimetría no destruye el mercado.',
          'destacado',
        ),
        texto('El equilibrio es el cruce de la disposición a pagar con la recta de 45°: el precio debe igualar lo que vale, en promedio, lo que se ofrece.', 'pequeno texto-suave'),
        refMonsalve('selección adversa: el mercado de limones de Akerlof.'),
      ),
    ]),
  ];
  return { fig, panel };
}

function senal(p: P): Simulacion {
  const r = spence({ tB: p.tB, tA: p.tA, e: p.e });
  const emax = Math.max(r.eMax * 1.4, p.e * 1.2, 1);
  const fig = figura('Educación e', 'Salario w', SIM_ID + '-spence', {
    xaxis: { range: [0, emax] },
    yaxis: { range: [0, p.tA * 1.6] },
  });
  fig.data.push({
    type: 'scatter', x: [0, p.e, p.e, emax], y: [p.tB, p.tB, p.tA, p.tA], mode: 'lines', name: 'Salario ofrecido w(e)',
    line: { color: SUAVE, width: 3, shape: 'hv' },
  });
  const es = linspace(0, emax, 60);
  fig.data.push({
    type: 'scatter', x: es, y: es.map((e) => r.uB + e / p.tB), mode: 'lines', name: 'Indiferencia del tipo bajo (pendiente 1/θ_B)',
    line: { color: ROJO, width: 2.5 },
  });
  fig.data.push({
    type: 'scatter', x: es, y: es.map((e) => r.uA + e / p.tA), mode: 'lines', name: 'Indiferencia del tipo alto (pendiente 1/θ_A)',
    line: { color: AZUL, width: 2.5 },
  });
  fig.data.push({
    type: 'scatter', x: [r.eMin, r.eMax, r.eMax, r.eMin, r.eMin], y: [0, 0, p.tA * 1.6, p.tA * 1.6, 0], fill: 'toself',
    fillcolor: 'rgba(61,214,181,.12)', line: { width: 0 }, name: 'Exigencias que separan', hoverinfo: 'name',
  });
  punto(fig, 0, p.tB, 'Elección del tipo bajo', ROJO, 'circle', 'B');
  punto(fig, p.e, p.tA, 'Elección del tipo alto', AZUL, 'diamond', 'A');
  const panel = [
    resultados([
      lectura(
        'Equilibrio separador',
        tabla([
          ['Educación exigida e', p.e], ['Mínima que separa θ_B(θ_A − θ_B)', r.eMin], ['Máxima que separa θ_A(θ_A − θ_B)', r.eMax],
          ['Utilidad del bajo sin educarse', r.uB], ['Utilidad del bajo si imita', r.uBimita], ['Utilidad del alto', r.uA],
        ]),
      ),
      lectura(
        'Lectura',
        texto(
          r.separa
            ? 'La educación separa: al tipo bajo no le compensa estudiar e (su indiferencia queda por encima del salario alto) y al alto sí. La educación funciona como señal aunque no aumente la productividad.'
            : p.e < r.eMin
              ? 'La exigencia es tan baja que el tipo bajo también estudia para imitar: no hay separación.'
              : 'La exigencia es tan alta que ni el tipo alto quiere pagar la señal: no hay separación.',
          'destacado',
        ),
        texto(`El equilibrio separador más eficiente exige e = ${fmt(r.eMin, 2)}: más educación solo es costo de señalizar.`, 'pequeno texto-suave'),
        refMonsalve('señalización en el mercado de trabajo (modelo de Spence).'),
      ),
    ]),
  ];
  return { fig, panel };
}

function riesgo(p: P): Simulacion {
  const r = riesgoMoral({ piA: p.piA, piB: p.piB, psi: p.psi, b: p.b });
  const bmax = Math.max(r.bMin * 2, p.b * 1.2, 1);
  const bs = linspace(0, bmax, 100);
  const top = Math.max(p.piA * bmax - p.psi, p.piB * bmax, 1) * 1.15;
  const fig = figura('Bono por éxito b', 'Pago esperado neto del agente', SIM_ID + '-riesgo', {
    xaxis: { range: [0, bmax] },
    yaxis: { range: [0, top] },
  });
  fig.data.push({ type: 'scatter', x: bs, y: bs.map((b) => Math.max(0, p.piA * b - p.psi)), mode: 'lines', name: 'Esforzarse: π_A·b − ψ', line: { color: VERDE, width: 3 } });
  fig.data.push({ type: 'scatter', x: bs, y: bs.map((b) => p.piB * b), mode: 'lines', name: 'No esforzarse: π_B·b', line: { color: ROJO, width: 3 } });
  punto(fig, r.bMin, p.piB * r.bMin, 'Bono mínimo de incentivo', DORADO, 'diamond', 'b*');
  punto(fig, p.b, Math.max(r.uEsfuerzo, r.uSinEsfuerzo, 0), 'Bono elegido', AZUL, 'circle', 'b');
  const panel = [
    resultados([
      lectura(
        'Restricción de incentivos',
        tabla([
          ['Bono mínimo b* = ψ/(π_A − π_B)', r.bMin], ['Bono elegido b', p.b],
          ['Pago si se esfuerza', r.uEsfuerzo], ['Pago si no se esfuerza', r.uSinEsfuerzo],
        ]),
      ),
      lectura(
        'Lectura',
        texto(
          r.esfuerza
            ? `Con b = ${fmt(p.b, 2)} ≥ b* el agente se esfuerza: el contrato liga el pago al resultado porque el principal no observa el esfuerzo.`
            : `Con b = ${fmt(p.b, 2)} < b* = ${fmt(r.bMin, 2)} al agente no le conviene esforzarse: es riesgo moral.`,
          'destacado',
        ),
        texto('Cuanto menos informativo es el resultado (π_A − π_B pequeño), mayor el bono necesario.', 'pequeno texto-suave'),
        referencia('riesgo moral y contratos de incentivos.', AUTOR_VARIAN),
      ),
    ]),
  ];
  return { fig, panel };
}

export function calcular(p: P): Simulacion {
  try {
    if (p.enfoque === 'senalizacion') return p.tema === 'riesgo' ? riesgo(p) : senal(p);
    return seleccion(p);
  } catch (e) {
    if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
    throw e;
  }
}

const en = (enfoque: string) => (p: Params) => (p['enfoque'] === 'senalizacion' ? 'senalizacion' : 'seleccion') === enfoque;

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 540,
  grupos: [
    {
      titulo: 'Mercado de autos usados',
      visibleSi: en('seleccion'),
      controles: [
        { id: 'k', etiqueta: 'Valoración del comprador k (× la del vendedor)', tipo: 'slider', min: 1.05, max: 3, paso: 0.05 },
        { id: 'tmin', etiqueta: 'Calidad mínima θ_min', tipo: 'slider', min: 0, max: 60, paso: 1 },
        { id: 'tmax', etiqueta: 'Calidad máxima θ_max', tipo: 'slider', min: 70, max: 200, paso: 5 },
      ],
    },
    {
      visibleSi: en('senalizacion'),
      controles: [
        {
          id: 'tema', etiqueta: 'Modelo', tipo: 'selector',
          opciones: [
            { valor: 'spence', etiqueta: 'Señalización (Spence)' },
            { valor: 'riesgo', etiqueta: 'Riesgo moral' },
          ],
        },
      ],
    },
    {
      titulo: 'Trabajadores: productividad θ y costo e/θ',
      visibleSi: (p) => en('senalizacion')(p) && p['tema'] !== 'riesgo',
      controles: [
        { id: 'tB', etiqueta: 'Productividad baja θ_B', tipo: 'slider', min: 0.5, max: 5, paso: 0.25 },
        { id: 'tA', etiqueta: 'Productividad alta θ_A', tipo: 'slider', min: 1, max: 8, paso: 0.25 },
        { id: 'e', etiqueta: 'Educación exigida e', tipo: 'slider', min: 0, max: 30, paso: 0.25 },
      ],
    },
    {
      titulo: 'Principal y agente',
      visibleSi: (p) => en('senalizacion')(p) && p['tema'] === 'riesgo',
      controles: [
        { id: 'piA', etiqueta: 'Prob. de éxito con esfuerzo π_A', tipo: 'slider', min: 0.1, max: 1, paso: 0.05 },
        { id: 'piB', etiqueta: 'Prob. de éxito sin esfuerzo π_B', tipo: 'slider', min: 0, max: 0.9, paso: 0.05 },
        { id: 'psi', etiqueta: 'Costo del esfuerzo ψ', tipo: 'slider', min: 0, max: 40, paso: 1 },
        { id: 'b', etiqueta: 'Bono por éxito b', tipo: 'slider', min: 0, max: 100, paso: 1 },
      ],
    },
  ],
  planteamientos: {
    param: 'enfoque',
    opciones: [
      { valor: 'seleccion', titulo: 'Selección adversa (mercado de limones)', resumen: 'El comprador no observa la calidad: paga por la calidad media y los autos buenos salen del mercado.' },
      { valor: 'senalizacion', titulo: 'Señalización (Spence) y riesgo moral', resumen: 'Antes del contrato, la educación señala el tipo; después, el bono por resultado induce el esfuerzo no observable.' },
    ],
  },
  calcular: (p: Params) => calcular(p as unknown as P),
};
