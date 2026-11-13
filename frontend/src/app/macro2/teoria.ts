/**
 * Fichas de teoría de Macro 2 (modal «Teoría»): idea clave (máx. 3 viñetas), máx. 2 ecuaciones y un
 * ejercicio que se comprueba en la gráfica. Los números del ejercicio se calculan con las mismas
 * funciones del simulador, así que siempre coinciden con lo que muestra la gráfica.
 * Referencia principal: Krugman, P. y Obstfeld, M. (2006). Economía internacional: teoría y política,
 * 7.ª ed. Pearson (modelo DD-AA). IS-LM, DA-OA, Phillips y Solow no están en ese libro: se usa la
 * notación estándar de manual y así lo indica la nota de fuente.
 */
import { fmt } from '../core/formato';
import { Params, Teoria } from '../core/tipos';
import { cortoPlazo, largoPlazo } from './modelos/daoa';
import { equilibrioDDAA } from './modelos/ddaa';
import { equilibrioISLM2 } from './modelos/islm';
import { desempleoParaMeta, inflacion, razonSacrificio } from './modelos/phillips';
import { estadoEstacionario } from './modelos/solow';
import { SIM as SIM_DAOA, escenarios as escDAOA } from './simuladores/da-oa';
import { SIM as SIM_ISLM, escenarios as escISLM } from './simuladores/is-lm';
import { SIM as SIM_MF, escenarios as escMF } from './simuladores/mundell-fleming';
import { SIM as SIM_PH, escenarios as escPH } from './simuladores/phillips';
import { SIM as SIM_SOLOW, escenarios as escSolow } from './simuladores/solow';
import { AUTOR_ESTANDAR, AUTOR_KO } from './simuladores/_comun';

const f = (v: number, d = 2): string => fmt(v, d);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const con = (sim: { defecto: Params }, cambios: Params): any => ({ ...sim.defecto, ...cambios });

// ------------------------------------------------------------------ IS–LM
function islm(): Teoria {
  const parametros = con(SIM_ISLM, { choque: 'fiscal', dG: 100, dT: 0, dm: 0 });
  const [b, n] = escISLM(parametros);
  const r0 = equilibrioISLM2(b);
  const r1 = equilibrioISLM2(n);
  return {
    titulo: 'IS–LM en economía cerrada',
    conceptos: [
      'La IS reúne las combinaciones (Y, r) que equilibran el mercado de bienes; la LM, las que equilibran el mercado de dinero. Su cruce es el equilibrio de corto plazo.',
      'Una expansión fiscal sube r y desplaza inversión privada (efecto expulsión); por eso el multiplicador es menor que el keynesiano 1/(1 − c).',
      'Trampa de liquidez: con r = 0 la LM es plana; más dinero no baja la tasa y solo la política fiscal mueve el producto.',
    ],
    formulas: [
      'IS:\\; Y = \\dfrac{C_0 - cT + I_0 + G - b\\,r}{1 - c}',
      'LM:\\; \\dfrac{M}{P} = kY - h\\,r',
    ],
    ejemplo: {
      parametros,
      enunciado:
        'Con los valores de partida (C₀ = 150, c = 0.75, I₀ = 200, b = 25, T = 200, k = 0.5, h = 25), G = 200 y M/P = 500. ' +
        'Luego lleva ΔG a +100 (G = 300).',
      resultado:
        `Inicialmente Y* = ${f(r0.Y)} y r* = ${f(r0.r)} %. Con G = 300: Y* = ${f(r1.Y)} y r* = ${f(r1.r)} %. ` +
        `La inversión privada cae de ${f(r0.I)} a ${f(r1.I)}: expulsión de ${f(r0.I - r1.I)}.`,
      prueba:
        'Lee E₀ y E₁ en los ejes. Luego sube M/P hasta 1,000 con ΔG = 0: la LM se aplana en r = 0 (trampa de liquidez) y el producto deja de crecer.',
    },
    fuente:
      'IS-LM de Hicks en notación estándar. Krugman y Obstfeld (2006) no trae el IS-LM cerrado; su versión de economía abierta es el modelo DD-AA (ver Mundell-Fleming).',
    autor: AUTOR_ESTANDAR,
  };
}

// ------------------------------------------------------------------ DD–AA (Mundell–Fleming)
function mundell(p: Params): Teoria {
  const fijo = p['regimen'] === 'fijo';
  const parametros = con(SIM_MF, { regimen: fijo ? 'fijo' : 'flotante', movilidad: 'perfecta', choque: 'fiscal', dG: 70 });
  const [b, n] = escMF(parametros);
  const r0 = equilibrioDDAA(b);
  const r1 = equilibrioDDAA(n);
  const otro = equilibrioDDAA({ ...n, regimen: fijo ? 'flotante' : 'fijo' });
  return {
    titulo: `Mundell–Fleming (DD–AA) · tipo ${fijo ? 'fijo' : 'flotante'}`,
    conceptos: [
      'DD: un tipo de cambio más alto (depreciación) abarata los bienes nacionales, mejora la cuenta corriente y eleva el producto.',
      'AA: más producto sube la demanda de dinero y la tasa R; por la paridad de intereses la moneda se aprecia (E baja).',
      fijo
        ? 'Con tipo fijo la política monetaria es ineficaz (M se vuelve endógena) y la fiscal es muy potente; la devaluación eleva el producto.'
        : 'Con tipo flotante la política monetaria es potente; la fiscal temporal se debilita porque aprecia la moneda y empeora la cuenta corriente.',
    ],
    formulas: [
      'DD:\\; Y = D\\!\\left(\\tfrac{EP^{*}}{P},\\, Y - T,\\, I,\\, G\\right)',
      'AA:\\; \\dfrac{M^{s}}{P} = L(R, Y), \\qquad R = R^{*} + \\dfrac{E^{e} - E}{E}',
    ],
    ejemplo: {
      parametros,
      enunciado: fijo
        ? 'Tipo fijo con E₀ = 1, R* = 4 % y movilidad perfecta. El gobierno sube G en 70 (ΔG = +70).'
        : 'Tipo flotante con M/P = 460, R* = 4 % y Eᵉ = 1 (movilidad perfecta). El gobierno sube G en 70 de forma temporal (ΔG = +70).',
      resultado: fijo
        ? `Y pasa de ${f(r0.Y)} a ${f(r1.Y)} con E fijo en ${f(r1.E, 3)}: el banco central amplía M/P de ${f(r0.Mp)} a ${f(r1.Mp)} para sostener la paridad. ` +
          `Con tipo flotante el mismo choque solo llevaría Y a ${f(otro.Y)}.`
        : `Y pasa de ${f(r0.Y)} a ${f(r1.Y)} y E baja de ${f(r0.E, 4)} a ${f(r1.E, 4)} (apreciación); la cuenta corriente pasa de ${f(r0.CA)} a ${f(r1.CA)}. ` +
          `Con tipo fijo el mismo choque llevaría Y a ${f(otro.Y)}.`,
      prueba: fijo
        ? 'Ahora mueve Δ(M/P): el equilibrio no cambia (política monetaria ineficaz). Prueba ΔE₀ = +0.1 (devaluación) con ΔG = 0.'
        : 'Pon ΔEᵉ = +0.1 (el choque se cree permanente): la AA sube y el resultado cambia. Compara con el régimen fijo.',
    },
    fuente:
      'cap. 16, «La producción nacional y el tipo de cambio a corto plazo» (DD-AA), y cap. 17, «Los tipos de cambio fijos y la intervención en los mercados de divisas» (numeración de la 7.ª ed.). La versión con movilidad imperfecta (μ) es una extensión estándar.',
    autor: AUTOR_KO,
  };
}

// ------------------------------------------------------------------ DA–OA
function daoa(): Teoria {
  const parametros = con(SIM_DAOA, { autoajuste: 'si', theta: 1, choque: 'demanda', dD0: 200, dW: 0, dYp: 0 });
  const [b, n] = escDAOA(parametros);
  const e0 = cortoPlazo(b);
  const e1 = cortoPlazo(n);
  const e2 = largoPlazo(n);
  return {
    titulo: 'Demanda y oferta agregadas (DA–OACP–OALP)',
    conceptos: [
      'En el corto plazo los salarios nominales son rígidos: un choque de demanda mueve el producto y los precios en la misma dirección.',
      'Si Y > Yₚ hay brecha inflacionaria (salarios al alza); si Y < Yₚ, brecha recesiva. Al ajustarse los salarios la OACP se desplaza.',
      'En el largo plazo la economía se autocorrige hasta la OALP: la demanda solo afecta a P. Un choque de oferta adverso produce estanflación.',
    ],
    formulas: [
      'DA:\\; Y = D_0 - d\\,P, \\qquad OALP:\\; Y = Y_p',
      'OACP:\\; P = W + \\dfrac{Y - Y_p}{\\sigma}',
    ],
    ejemplo: {
      parametros,
      enunciado:
        'Parte de D₀ = 2,000, d = 10, W = 100, σ = 10 y Yₚ = 1,000 (equilibrio de largo plazo). Llega un choque de demanda ΔD₀ = +200.',
      resultado:
        `De E₀ = (${f(e0.Y)}, ${f(e0.P)}) la economía pasa en el corto plazo a E₁ = (${f(e1.Y)}, ${f(e1.P)}): brecha inflacionaria de ${f(e1.Y - n.Yp)}. ` +
        `Con la autocorrección termina en E₂ = (${f(e2.Y)}, ${f(e2.P)}).`,
      prueba:
        'Pon ΔD₀ = 0 y ΔW = +20 (choque de oferta): Y cae a 900 y P sube a 110 (estanflación).',
    },
    fuente:
      'modelo DA-OA de corto y largo plazo en notación estándar de manual; Krugman y Obstfeld (2006) no lo desarrolla para economía cerrada.',
    autor: AUTOR_ESTANDAR,
  };
}

// ------------------------------------------------------------------ Phillips
function phillips(): Teoria {
  const parametros = con(SIM_PH, { choque: 'ninguno', dpie: 0, dv: 0 });
  const [b] = escPH(parametros);
  const pi = inflacion(b, parametros.uobj);
  const u = desempleoParaMeta(b, parametros.piobj);
  return {
    titulo: 'Curva de Phillips de corto y largo plazo',
    conceptos: [
      'A corto plazo, con πᵉ dada, menos desempleo se paga con más inflación (CPCP con pendiente negativa).',
      'A largo plazo las expectativas se ajustan y la curva es vertical en la NAIRU u*: no hay intercambio permanente.',
      'Desinflar cuesta desempleo: cada punto de inflación exige 1/β puntos-año de desempleo sobre u* (razón de sacrificio).',
    ],
    formulas: ['\\pi = \\pi^{e} - \\beta\\,(u - u^{*}) + v', 'CPLP:\\; u = u^{*}'],
    ejemplo: {
      parametros,
      enunciado: 'Con πᵉ = 6 %, β = 0.5, u* = 5 % y v = 0, el gobierno fija u = 7 %. Luego quiere bajar la inflación a 2 % en un año.',
      resultado:
        `Con u = 7 % la inflación es ${f(pi)} %. Para π = 2 % se necesita u = ${f(u)} %; la razón de sacrificio es ${f(razonSacrificio(b))}.`,
      prueba: 'Mueve el desempleo objetivo a 13 %: el punto dorado cae sobre la meta. Luego sube Δπᵉ: la CPCP se desplaza hacia arriba.',
    },
    fuente:
      'curva de Phillips aumentada con expectativas (Friedman–Phelps) en notación estándar; Krugman y Obstfeld (2006) no la modela.',
    autor: AUTOR_ESTANDAR,
  };
}

// ------------------------------------------------------------------ Solow
function solow(): Teoria {
  const parametros = con(SIM_SOLOW, { choque: 'ahorro', ds: 0.15, dn: 0, dA: 0 });
  const [b, n] = escSolow(parametros);
  const r0 = estadoEstacionario(b);
  const r1 = estadoEstacionario(n);
  return {
    titulo: 'Modelo de crecimiento de Solow',
    conceptos: [
      'El capital por trabajador efectivo crece mientras la inversión s·A·f(k) supere la reposición (n + g + δ)·k; se detiene en k*.',
      'Más ahorro eleva k* e y* (efecto de nivel), pero no la tasa de crecimiento de largo plazo: esa la da el progreso técnico.',
      'La regla de oro (f′(k) = n + g + δ, con Cobb-Douglas s = α) maximiza el consumo de estado estacionario.',
    ],
    formulas: [
      '\\Delta k = s\\,A k^{\\alpha} - (n + g + \\delta)\\,k',
      'k^{*} = \\left(\\dfrac{sA}{n + g + \\delta}\\right)^{\\frac{1}{1-\\alpha}}',
    ],
    ejemplo: {
      parametros,
      enunciado: 'Con A = 1, α = 0.5, s = 0.3, n = 0.05, g = 0.02 y δ = 0.08 (n + g + δ = 0.15), pulsa «+ Tasa de ahorro» (Δs = +0.15, s = 0.45).',
      resultado:
        `Inicialmente k* = ${f(r0.k)}, y* = ${f(r0.y)} y c* = ${f(r0.c)}. Con s = 0.45: k* = ${f(r1.k)}, y* = ${f(r1.y)} y c* = ${f(r1.c)}. ` +
        `La regla de oro es s = ${f(r1.sOro)} con c = ${f(r1.cOro, 3)}.`,
      prueba: 'Lleva Δs a +0.2 (s = 0.5): el estado estacionario coincide con la estrella de la regla de oro.',
    },
    fuente:
      'modelo de Solow-Swan con función Cobb-Douglas en notación estándar; Krugman y Obstfeld (2006) no lo cubre.',
    autor: AUTOR_ESTANDAR,
  };
}

export function teoria(sim: string, p: Params): Teoria | null {
  switch (sim) {
    case 'is-lm':
      return islm();
    case 'mundell-fleming':
      return mundell(p);
    case 'da-oa':
      return daoa();
    case 'phillips':
      return phillips();
    case 'solow':
      return solow();
    default:
      return null;
  }
}
