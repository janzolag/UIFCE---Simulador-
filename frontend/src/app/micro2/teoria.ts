/**
 * Fichas de teoría de Micro 2 (modal «Teoría»): idea clave (máx. 3 viñetas), máx. 2 ecuaciones y un
 * ejercicio que se comprueba en la gráfica. Los números salen de las mismas funciones del simulador.
 * Referencia: Varian, H. R., Microeconomía intermedia: un enfoque actual, 8.ª ed. Se citan títulos de
 * capítulo, sin números de página. Los ejercicios numéricos son propios, con la notación de Varian.
 */
import { fmt } from '../core/formato';
import { Params, Teoria } from '../core/tipos';
import { descomposicion } from '../micro1/modelos/slutsky';
import { monopolio, tercerGrado, walras } from './modelos/mercados';
import { SIM as SIM_EDG, parametros as parEdg } from './simuladores/edgeworth';
import { SIM as SIM_PRO, costoCorto, costoMinimo } from './simuladores/produccion';
import { SIM as SIM_MON, parametrosMonopolio, parametrosTercer } from './simuladores/monopolio';
import { SIM as SIM_OLI, parametros as parOli, soluciones } from './simuladores/oligopolio';
import { CASOS, SIM as SIM_SL, utilidadDe } from './simuladores/slutsky';
import { AUTOR_VARIAN } from './simuladores/_comun';

const f = (v: number, d = 2): string => fmt(v, d);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const con = (sim: { defecto: Params }, cambios: Params): any => ({ ...sim.defecto, ...cambios });

function slutsky(p: Params): Teoria {
  const giffen = p['caso'] === 'giffen';
  const parametros = giffen
    ? con(SIM_SL, { caso: 'giffen', metodo: 'slutsky', ...CASOS['giffen'] })
    : con(SIM_SL, { caso: 'normal', metodo: 'slutsky', a: 0.5, ...CASOS['normal'] });
  const d = descomposicion(utilidadDe(parametros.caso, parametros.a), parametros.p1, parametros.p2, parametros.m, parametros.p1n, 'slutsky');
  return {
    titulo: 'Ecuación de Slutsky: efecto sustitución y efecto renta',
    conceptos: [
      'Un cambio de p₁ se divide en un pivote de la recta presupuestaria alrededor de la cesta inicial (efecto sustitución, siempre opuesto al precio) y un desplazamiento paralelo (efecto renta).',
      'Bien normal: ambos efectos van en la misma dirección. Bien inferior: el efecto renta va en contra, pero es menor. Bien Giffen: el efecto renta domina y la demanda sube con el precio.',
      'Compensación de Slutsky: Δm = x₁·Δp₁, la renta justa para seguir comprando la cesta inicial.',
    ],
    formulas: [
      '\\Delta x_1 = \\Delta x_1^{s} + \\Delta x_1^{n}',
      '\\dfrac{\\Delta x_1}{\\Delta p_1} = \\dfrac{\\Delta x_1^{s}}{\\Delta p_1} - \\dfrac{\\Delta x_1^{m}}{\\Delta m}\\,x_1',
    ],
    ejemplo: {
      parametros,
      enunciado: giffen
        ? 'Caso Giffen: p₁ = 2, p₂ = 1, m = 3.5; p₁ sube a 2.2. Calcula x₁ en A, B y C.'
        : 'Con u = x₁^0.5·x₂^0.5, p₁ = 2, p₂ = 1 y m = 40, el precio del bien 1 sube a p₁′ = 3. Descompón el cambio de x₁.',
      resultado:
        `A: x₁ = ${f(d.A.x, 3)}. Compensación Δm = ${f(d.compensacion, 3)} (m′ = ${f(d.M_compensado, 3)}). ` +
        `B: x₁ = ${f(d.B.x, 3)}; C: x₁ = ${f(d.C.x, 3)}. Efecto sustitución ${f(d.efecto_sustitucion[0], 3)}, efecto renta ${f(d.efecto_ingreso[0], 3)}, total ${f(d.efecto_total[0], 3)}.`,
      prueba: 'Lee A, B y C en el eje x₁ (panel A) y en las demandas del panel B. Luego elige «Giffen»: la flecha EI cambia de sentido y supera a ES.',
    },
    fuente:
      '«La ecuación de Slutsky». Notación de Varian (x₁, p₁, m, Δx₁ˢ, Δx₁ⁿ); el ejercicio numérico es propio y la utilidad Giffen es la del ejemplo 3.5 de Monsalve (2017).',
    autor: AUTOR_VARIAN,
  };
}

function monopolioT(p: Params): Teoria {
  if (p['modo'] === 'tercer') {
    const parametros = con(SIM_MON, { modo: 'tercer', a1: 100, b1: 2, a2: 60, b2: 1, c: 10, F: 50 });
    const r = tercerGrado(parametrosTercer(parametros));
    return {
      titulo: 'Discriminación de precios de tercer grado',
      conceptos: [
        'El monopolista vende a grupos separables a precios distintos e iguala el ingreso marginal de cada mercado al costo marginal.',
        'El grupo con demanda menos elástica paga el precio más alto: pᵢ·(1 − 1/|εᵢ|) = CMg.',
      ],
      formulas: ['IMg_1(y_1) = IMg_2(y_2) = CMg(y_1 + y_2)', 'p_i\\left[1 - \\dfrac{1}{|\\varepsilon_i|}\\right] = CMg'],
      ejemplo: {
        parametros,
        enunciado: 'Mercado 1: p₁ = 100 − 2y₁; mercado 2: p₂ = 60 − y₂; CMg = 10.',
        resultado:
          `y₁ = ${f(r.m1.y)}, p₁ = ${f(r.m1.p)} (|ε₁| = ${f(r.m1.elasticidad, 3)}); y₂ = ${f(r.m2.y)}, p₂ = ${f(r.m2.p)} (|ε₂| = ${f(r.m2.elasticidad, 3)}). ` +
          `Con precio único p = ${f(r.pUnico)} el beneficio sería ${f(r.beneficioUnico)} en vez de ${f(r.beneficio)}.`,
        prueba: 'Lee pᵢ en cada panel; compara con la línea naranja del precio único.',
      },
      fuente: '«La conducta monopolística» (discriminación de tercer grado). Ejercicio propio con la notación de Varian.',
      autor: AUTOR_VARIAN,
    };
  }
  const parametros = con(SIM_MON, { modo: p['modo'] === 'primer' ? 'primer' : 'simple', a: 100, b: 2, c: 10, d: 1, F: 50 });
  const r = monopolio(parametrosMonopolio(parametros));
  return {
    titulo: p['modo'] === 'primer' ? 'Discriminación de primer grado' : 'Monopolio',
    conceptos: [
      'El monopolista elige y donde IMg = CMg y cobra el precio de la demanda: p > CMg, por eso produce menos que la competencia y genera una pérdida irrecuperable de eficiencia.',
      'Nunca opera en el tramo inelástico: p(y)·[1 − 1/|ε|] = CMg exige |ε| > 1.',
      'Con discriminación perfecta (primer grado) vende hasta p = CMg y se apropia de todo el excedente: no hay pérdida irrecuperable.',
    ],
    formulas: ['IMg(y) = p(y) + p\'(y)\\,y = CMg(y)', 'p(y)\\left[1 - \\dfrac{1}{|\\varepsilon(y)|}\\right] = CMg(y)'],
    ejemplo: {
      parametros,
      enunciado: 'Demanda p = 100 − 2y; costo C(y) = 50 + 10y + y²/2 (CMg = 10 + y).',
      resultado:
        `Monopolio: y* = ${f(r.y)}, p* = ${f(r.p)}, CMg = ${f(r.cmg)}, |ε| = ${f(r.elasticidad, 3)}. ` +
        `Competencia: y = ${f(r.yc)}, p = ${f(r.pc)}. Pérdida irrecuperable = ${f(r.PIE)}; beneficio del monopolio = ${f(r.beneficio)}.`,
      prueba: 'Lee E en los ejes y el área roja (pérdida irrecuperable). Cambia a «Primer grado»: la producción sube a 30 y el triángulo rojo desaparece.',
    },
    fuente: '«El monopolio» y «La conducta monopolística». Ejercicio propio con la notación de Varian.',
    autor: AUTOR_VARIAN,
  };
}

function oligopolioT(): Teoria {
  const parametros = con(SIM_OLI, { a: 120, b: 1, c1: 0, c2: 0 });
  const s = soluciones(parOli(parametros));
  return {
    titulo: 'Oligopolio: Cournot, Stackelberg y colusión',
    conceptos: [
      'Cournot: cada empresa elige su producción como mejor respuesta a la de la otra; el equilibrio es el cruce de las funciones de reacción.',
      'Stackelberg: el líder elige primero sabiendo que el seguidor responderá con f₂(y₁); produce más y gana más que en Cournot.',
      'Colusión: maximizar el beneficio conjunto da menos producción y precio más alto, pero cada empresa tiene incentivo a desviarse.',
    ],
    formulas: ['f_1(y_2) = \\dfrac{a - c_1 - b\\,y_2}{2b}', '\\max_{y_1}\\; p\\big(y_1 + f_2(y_1)\\big)\\,y_1 - c_1 y_1'],
    ejemplo: {
      parametros,
      enunciado: 'Demanda p = 120 − (y₁ + y₂) y costos marginales nulos.',
      resultado:
        `Cournot: y₁ = y₂ = ${f(s.cournot.y1)}, p = ${f(s.cournot.p)}, π = ${f(s.cournot.pi1)} cada una. ` +
        `Stackelberg: y₁ = ${f(s.stackelberg.y1)}, y₂ = ${f(s.stackelberg.y2)}, p = ${f(s.stackelberg.p)}. Colusión: Y = ${f(s.colusion.Y)}, p = ${f(s.colusion.p)}.`,
      prueba: 'Lee el cruce de f₁ y f₂ en el panel A y los precios en el panel B. El isobeneficio del líder es tangente a f₂ en el punto de Stackelberg.',
    },
    fuente: '«El oligopolio»: elección de la cantidad (Cournot), liderazgo en la cantidad (Stackelberg) y colusión. Ejercicio propio con la notación de Varian.',
    autor: AUTOR_VARIAN,
  };
}

function edgeworthT(): Teoria {
  const parametros = con(SIM_EDG, { a: 0.6, b: 0.3, wA1: 8, wA2: 2, wB1: 2, wB2: 8 });
  const r = walras(parEdg(parametros));
  return {
    titulo: 'Equilibrio general de intercambio (caja de Edgeworth)',
    conceptos: [
      'Una asignación es eficiente en el sentido de Pareto cuando las curvas de indiferencia de A y B son tangentes (TMSᴬ = TMSᴮ): el conjunto de esas asignaciones es la curva de contrato.',
      'El equilibrio walrasiano es el precio relativo que anula el exceso de demanda; por la ley de Walras basta con vaciar un mercado.',
      'Primer teorema del bienestar: el equilibrio competitivo está en la curva de contrato.',
    ],
    formulas: ['TMS^{A} = TMS^{B} = \\dfrac{p_1}{p_2}', 'p_1 z_1(p) + p_2 z_2(p) \\equiv 0'],
    ejemplo: {
      parametros,
      enunciado: 'uᴬ = x₁^0.6·x₂^0.4, uᴮ = x₁^0.3·x₂^0.7; dotaciones ωᴬ = (8, 2) y ωᴮ = (2, 8). Toma p₂ = 1.',
      resultado:
        `p₁/p₂ = ${f(r.p, 4)}. A consume (${f(r.xA1, 3)}, ${f(r.xA2, 3)}) y B (${f(r.xB1, 3)}, ${f(r.xB2, 3)}). ` +
        `La utilidad de A pasa de ${f(r.uA0, 3)} a ${f(r.uA, 3)} y la de B de ${f(r.uB0, 3)} a ${f(r.uB, 3)}.`,
      prueba: 'Lee x* en los ejes de la caja: está sobre la curva de contrato y sobre la recta de precios que sale de ω.',
    },
    fuente: '«El intercambio»: caja de Edgeworth, curva de contrato, equilibrio de mercado y ley de Walras. Ejercicio propio con la notación de Varian.',
    autor: AUTOR_VARIAN,
  };
}

function produccionT(p: Params): Teoria {
  const corto = p['modo'] === 'corto';
  const largo = con(SIM_PRO, { modo: 'largo' });
  const cp = con(SIM_PRO, { modo: 'corto' });
  const s = costoMinimo(largo);
  const k = costoCorto(cp);
  return {
    titulo: corto ? 'Costos de corto plazo: cierre y equilibrio' : 'Minimización de costos: isocuanta e isocosto',
    conceptos: [
      'La empresa minimiza w₁x₁ + w₂x₂ sujeto a f(x₁, x₂) = y: en el óptimo la TMST iguala w₁/w₂ (isocuanta tangente al isocosto).',
      'El CMg corta al CVMe y al CMe en sus mínimos; esos mínimos son el precio de cierre y el de equilibrio (break-even).',
      'Con un precio entre ambos la empresa pierde, pero cubre su costo variable y sigue produciendo en el corto plazo.',
    ],
    formulas: [
      String.raw`c(w, y) = \min_{x}\; w_1x_1 + w_2x_2 \;\text{ s.a. }\; f(x) = y`,
      String.raw`CMg(y) = CMe(y) \;\Rightarrow\; \min CMe`,
    ],
    ejemplo: {
      parametros: corto ? cp : largo,
      enunciado: corto
        ? 'C(y) = 20 + 10y − 2y² + 0.5y³. Halla el precio de cierre y el de equilibrio.'
        : 'Con f = x₁^0.5·x₂^0.5, w₁ = 4, w₂ = 1 y y = 10, halla la mezcla de costo mínimo.',
      resultado: corto
        ? `Cierre: ${f(k.precio_cierre(), 3)} (en y = ${f(k.q_min_cvme(), 3)}). Equilibrio: ${f(k.precio_nivelacion(), 3)} (en y = ${f(k.q_min_cme(), 3)}).`
        : `x₁* = ${f(s.x, 3)}, x₂* = ${f(s.y, 3)}, costo mínimo = ${f(s.costo, 3)}.`,
      prueba: corto
        ? 'Mira los dos puntos marcados: el CMg los cruza justo en el mínimo del CVMe y del CMe.'
        : 'Lee x* donde la isocuanta toca el isocosto; sube w₁ y verás que x₁* baja.',
    },
    fuente: '«Minimización de costos», «Funciones de costos» y «Oferta de la empresa». Ejercicio propio con la notación de Varian.',
    autor: AUTOR_VARIAN,
  };
}

export function teoria(sim: string, p: Params): Teoria | null {
  switch (sim) {
    case 'slutsky':
      return slutsky(p);
    case 'produccion':
      return produccionT(p);
    case 'monopolio':
      return monopolioT(p);
    case 'oligopolio':
      return oligopolioT();
    case 'edgeworth':
      return edgeworthT();
    default:
      return null;
  }
}
