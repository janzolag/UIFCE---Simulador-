/**
 * Fichas de teoría de Micro 2 (modal «Teoría»): idea clave (máx. 3 viñetas), máx. 2 ecuaciones y un
 * ejercicio que se comprueba en la gráfica. Los números salen de las mismas funciones del simulador.
 * Referencias del programa: Varian, H. R., Microeconomía intermedia (se citan títulos de capítulo, sin
 * páginas); Monsalve (2017), Competencia bajo equilibrio general; Sen, sobre elección social. Los textos
 * de Monsalve y Sen no están en el proyecto: se citan autor y tema. Los ejercicios numéricos son propios.
 */
import { fmt } from '../core/formato';
import { Params, Teoria } from '../core/tipos';
import { descomposicion } from '../micro1/modelos/slutsky';
import { walras } from './modelos/mercados';
import { SIM as SIM_INC, loteria, seguro } from './simuladores/incertidumbre';
import { AUTOR_BIENESTAR, SIM as SIM_BIE, fpu, votacion } from './simuladores/bienestar';
import { SIM as SIM_EDG, parametros as parEdg } from './simuladores/edgeworth';
import { SIM as SIM_EGP, equilibrioAutarquia, produccionAPrecio } from './simuladores/equilibrio-produccion';
import { SIM as SIM_EXT, bienPublico, externalidad } from './simuladores/externalidades';
import { SIM as SIM_PRO, beneficio, costoCorto, costoMinimo } from './simuladores/produccion';
import { CASOS, SIM as SIM_SL, slutskyDotacion, utilidadDe } from './simuladores/slutsky';
import { AUTOR_VARIAN } from './simuladores/_comun';

/** Autor de las fichas de equilibrio general: Varian y Monsalve (2017). */
const AUTOR_EG = `${AUTOR_VARIAN}; Monsalve, Competencia bajo equilibrio general (2017)`;

const f = (v: number, d = 2): string => fmt(v, d);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const con = (sim: { defecto: Params }, cambios: Params): any => ({ ...sim.defecto, ...cambios });

function slutskyDotacionT(): Teoria {
  const parametros = con(SIM_SL, { enfoque: 'dotacion', alfa: 0.5, T: 24, mbar: 40, w0: 10, w1: 15 });
  const r = slutskyDotacion(0.5, 24, 40, 10, 15);
  return {
    titulo: 'Slutsky con dotación inicial: oferta de trabajo',
    conceptos: [
      'Quien vende su tiempo tiene una dotación: su renta monetaria m = w·T̄ + m̄ cambia con el salario.',
      'Un aumento de w produce efecto sustitución (menos ocio), efecto renta ordinario y efecto renta-dotación; los dos últimos van en sentidos opuestos.',
      'Si el efecto dotación domina, la oferta de trabajo se curva hacia atrás.',
    ],
    formulas: [String.raw`C + w\,R = w\,\bar T + \bar m`, String.raw`\dfrac{\Delta R}{\Delta w} = \dfrac{\Delta R^{s}}{\Delta w} + (\bar T - R)\,\dfrac{\Delta R^{m}}{\Delta m}`],
    ejemplo: {
      parametros,
      enunciado: 'u = R^0.5·C^0.5, T̄ = 24 h, m̄ = 40 y el salario sube de 10 a 15.',
      resultado:
        `Ocio: ${f(r.A.R, 3)} → ${f(r.C.R, 3)}. Sustitución ${f(r.sustitucion, 3)}, renta ordinaria ${f(r.ingresoOrdinario, 3)}, efecto dotación ${f(r.ingresoDotacion, 3)}. ` +
        `Las horas trabajadas pasan de ${f(r.L0, 3)} a ${f(r.L1, 3)}.`,
      prueba: 'Lee A y C en el panel A (la recta gira alrededor de ω) y los dos puntos de la oferta de trabajo en el panel B.',
    },
    fuente: '«La ecuación de Slutsky»: el efecto renta-dotación y la oferta de trabajo. Ejercicio propio con la notación de Varian.',
    autor: AUTOR_VARIAN,
  };
}

function slutsky(p: Params): Teoria {
  if (p['enfoque'] === 'dotacion') return slutskyDotacionT();
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

function edgeworthT(p: Params): Teoria {
  const walrasiano = p['enfoque'] === 'walras';
  const parametros = con(SIM_EDG, { enfoque: walrasiano ? 'walras' : 'contrato', a: 0.6, b: 0.3, wA1: 8, wA2: 2, wB1: 2, wB2: 8 });
  const r = walras(parEdg(parametros));
  return {
    titulo: walrasiano ? 'Caja de Edgeworth: equilibrio walrasiano y teoremas del bienestar' : 'Caja de Edgeworth: curva de contrato y núcleo',
    conceptos: [
      'Una asignación es eficiente en el sentido de Pareto cuando las curvas de indiferencia de A y B son tangentes (TMSᴬ = TMSᴮ): el conjunto de esas asignaciones es la curva de contrato.',
      'El equilibrio walrasiano es el precio relativo que anula el exceso de demanda; por la ley de Walras basta con vaciar un mercado.',
      walrasiano
        ? 'Primer teorema: el equilibrio competitivo es eficiente. Segundo: con preferencias convexas, toda asignación eficiente es un equilibrio tras redistribuir la dotación.'
        : 'El núcleo es el tramo de la curva de contrato que ambos prefieren a su dotación: ninguna coalición lo puede bloquear.',
    ],
    formulas: ['TMS^{A} = TMS^{B} = \\dfrac{p_1}{p_2}', 'p_1 z_1(p) + p_2 z_2(p) \\equiv 0'],
    ejemplo: {
      parametros,
      enunciado: 'uᴬ = x₁^0.6·x₂^0.4, uᴮ = x₁^0.3·x₂^0.7; dotaciones ωᴬ = (8, 2) y ωᴮ = (2, 8). Toma p₂ = 1.',
      resultado:
        `p₁/p₂ = ${f(r.p, 4)}. A consume (${f(r.xA1, 3)}, ${f(r.xA2, 3)}) y B (${f(r.xB1, 3)}, ${f(r.xB2, 3)}). ` +
        `La utilidad de A pasa de ${f(r.uA0, 3)} a ${f(r.uA, 3)} y la de B de ${f(r.uB0, 3)} a ${f(r.uB, 3)}.`,
      prueba: walrasiano
        ? 'Lee x* en los ejes de la caja: está sobre la curva de contrato y sobre la recta de precios que sale de ω.'
        : 'El tramo verde grueso es el núcleo: sus extremos N₁ y N₂ dan a B o a A todo el beneficio del intercambio; x* (vista walrasiana) cae dentro.',
    },
    fuente: '«El intercambio»: caja de Edgeworth, curva de contrato, equilibrio de mercado, ley de Walras y teoremas del bienestar. Ejercicio propio con la notación de Varian.',
    autor: AUTOR_EG,
  };
}

function produccionBeneficioT(): Teoria {
  const parametros = con(SIM_PRO, { enfoque: 'beneficio', alfa: 0.5, pp: 20, w: 5 });
  const r = beneficio(0.5, 20, 5);
  const r2 = beneficio(0.5, 30, 5);
  return {
    titulo: 'Maximización de beneficios y lema de Hotelling',
    conceptos: [
      'La empresa competitiva elige x donde p·PMg(x) = w: la recta de isobeneficio más alta toca la función de producción.',
      'La función de beneficio π(p, w) es creciente en p, decreciente en w y convexa. Lema de Hotelling: sus derivadas dan la oferta y la demanda del factor.',
    ],
    formulas: [String.raw`\pi(p, w) = \max_{x}\; p\,f(x) - w\,x`, String.raw`\dfrac{\partial \pi}{\partial p} = y(p, w), \qquad \dfrac{\partial \pi}{\partial w} = -x(p, w)`],
    ejemplo: {
      parametros,
      enunciado: 'f(x) = x^0.5, p = 20 y w = 5.',
      resultado: `x* = (0.5·20/5)² = ${f(r.x)}, y* = ${f(r.y)} y π = ${f(r.pi)}. Con p = 30: y* = ${f(r2.y)} y π = ${f(r2.pi)}.`,
      prueba: 'Lee x* en la tangencia y el intercepto π/p de la recta roja; compara las derivadas numéricas con y* y −x* en la tabla de Hotelling.',
    },
    fuente: '«Maximización del beneficio» y función de beneficio; Monsalve (2017), dualidad del productor. Ejercicio propio.',
    autor: AUTOR_EG,
  };
}

function produccionT(p: Params): Teoria {
  if (p['enfoque'] !== 'costos') return produccionBeneficioT();
  const corto = p['modo'] === 'corto';
  const largo = con(SIM_PRO, { enfoque: 'costos', modo: 'largo' });
  const cp = con(SIM_PRO, { enfoque: 'costos', modo: 'corto' });
  const s = costoMinimo(largo);
  const k = costoCorto(cp);
  return {
    titulo: corto ? 'Costos de corto plazo: cierre y equilibrio' : 'Función de costos y lema de Shephard',
    conceptos: [
      'La empresa minimiza w₁x₁ + w₂x₂ sujeto a f(x₁, x₂) = y: en el óptimo la TMST iguala w₁/w₂. Lema de Shephard: ∂c/∂wᵢ = xᵢ(w, y).',
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
    fuente: '«Minimización de costos», «Funciones de costos» y «Oferta de la empresa»; lema de Shephard. Ejercicio propio con la notación de Varian.',
    autor: AUTOR_EG,
  };
}

function equilibrioProduccionT(p: Params): Teoria {
  const e = { L: 100, K: 100, alfa: 0.7, beta: 0.3 };
  if (p['enfoque'] === 'teoremas') {
    const parametros = con(SIM_EGP, { enfoque: 'teoremas', ...e, p: 1, pn: 1.3, dL: 20 });
    const a = produccionAPrecio(e, 1);
    const ry = produccionAPrecio({ ...e, L: 120 }, 1);
    const ss = produccionAPrecio(e, 1.3);
    return {
      titulo: 'Stolper-Samuelson y Rybczynski',
      conceptos: [
        'Rybczynski: a precios dados, si aumenta la dotación de un factor crece más que proporcionalmente la producción del bien que lo usa intensivamente y cae la del otro.',
        'Stolper-Samuelson: si sube el precio relativo de un bien, el factor que usa intensivamente gana en términos reales de ambos bienes y el otro pierde.',
      ],
      formulas: [String.raw`TMT(y_1, y_2) = \dfrac{p_1}{p_2}`, String.raw`\hat w > \hat p_1 > \hat p_2 > \hat r \quad (\text{bien 1 intensivo en } L)`],
      ejemplo: {
        parametros,
        enunciado: 'L = K = 100, α = 0.7 (bien 1 intensivo en trabajo), β = 0.3 y p₁/p₂ = 1. El trabajo sube a 120; luego p₁/p₂ sube a 1.3.',
        resultado:
          `Rybczynski: y₁ ${f(a.y1, 3)} → ${f(ry.y1, 3)}, y₂ ${f(a.y2, 3)} → ${f(ry.y2, 3)}. ` +
          `Stolper-Samuelson: w/p₂ ${f(a.w, 3)} → ${f(ss.w, 3)} y r/p₂ ${f(a.r, 3)} → ${f(ss.r, 3)}.`,
        prueba: 'Sigue la flecha azul (de A a R) y la morada (de A a S); compara los pagos reales en la tabla.',
      },
      fuente: '«La producción» (economía 2×2) y los teoremas de comercio en notación estándar. Ejercicio propio.',
      autor: AUTOR_EG,
    };
  }
  const parametros = con(SIM_EGP, { enfoque: 'fpp', ...e, gamma: 0.5 });
  const q = equilibrioAutarquia(e, 0.5);
  return {
    titulo: 'Equilibrio general con producción (2×2)',
    conceptos: [
      'La FPP reúne las producciones eficientes: en ambos sectores la TMST es igual (curva de contrato de la caja de producción).',
      'El óptimo de Pareto con producción exige TMS = TMT: la tasa a la que se desea cambiar los bienes iguala la tasa a la que se pueden transformar.',
      'En el equilibrio competitivo ambas tasas igualan el precio relativo p₁/p₂.',
    ],
    formulas: [String.raw`TMST_1 = TMST_2 = \dfrac{w}{r}`, String.raw`TMS = TMT = \dfrac{p_1}{p_2}`],
    ejemplo: {
      parametros,
      enunciado: 'L = K = 100, y₁ = L₁^0.7·K₁^0.3, y₂ = L₂^0.3·K₂^0.7 y u = y₁^0.5·y₂^0.5.',
      resultado: `Producción (${f(q.y1, 3)}, ${f(q.y2, 3)}), TMT = TMS = p₁/p₂ = ${f(q.tmt, 3)}; el bien 1 usa L₁ = ${f(q.L1, 2)} y K₁ = ${f(q.K1, 2)}.`,
      prueba: 'Lee E: la curva de indiferencia dorada y la recta de precios roja son tangentes a la FPP en ese punto.',
    },
    fuente: '«La producción»: FPP, eficiencia en la producción y en el consumo; Monsalve (2017), equilibrio general con producción. Ejercicio propio.',
    autor: AUTOR_EG,
  };
}

function bienestarT(p: Params): Teoria {
  if (p['enfoque'] === 'arrow') {
    const parametros = con(SIM_BIE, { enfoque: 'arrow', v1: 'xyz', v2: 'yzx', v3: 'zxy' });
    const r = votacion(['xyz', 'yzx', 'zxy']);
    return {
      titulo: 'Elección social: teorema de imposibilidad de Arrow',
      conceptos: [
        'Una regla de elección social convierte preferencias individuales en una ordenación social.',
        'Arrow: con tres o más alternativas, ninguna regla cumple a la vez dominio universal, Pareto, independencia de alternativas irrelevantes y transitividad, salvo la dictadura.',
        'La mayoría entre pares puede ciclar (paradoja de Condorcet).',
      ],
      formulas: [String.raw`x \succ_S y \iff \#\{i : x \succ_i y\} > n/2`, String.raw`x \succ_S y \succ_S z \succ_S x \;\; \text{(ciclo)}`],
      ejemplo: {
        parametros,
        enunciado: 'Votante 1: x ≻ y ≻ z; votante 2: y ≻ z ≻ x; votante 3: z ≻ x ≻ y. Vota por mayoría cada par.',
        resultado: `x vence a y ${r.gana[0][1]}–${r.gana[1][0]}, y vence a z ${r.gana[1][2]}–${r.gana[2][1]} y z vence a x ${r.gana[2][0]}–${r.gana[0][2]}: la preferencia social cicla y no hay ganador de Condorcet.`,
        prueba: 'Las tres flechas rojas forman un círculo. Cambia el votante 3 a x ≻ y ≻ z: aparece un ganador de Condorcet (dorado).',
      },
      fuente: '«El bienestar»: agregación de preferencias y teorema de Arrow; Sen, elección colectiva. Ejercicio propio.',
      autor: AUTOR_BIENESTAR,
    };
  }
  const parametros = con(SIM_BIE, { enfoque: 'fpu', ua: 2, ub: 1, W: 100 });
  const r = fpu(2, 1, 100);
  return {
    titulo: 'Bienestar: FPU y criterios de Bentham, Rawls y Nash',
    conceptos: [
      'La frontera de posibilidades de utilidad (FPU) reúne las utilidades de las asignaciones eficientes: todas son óptimos de Pareto.',
      'Una función de bienestar social elige entre ellas: Bentham suma utilidades, Rawls maximiza la del peor, Nash maximiza el producto.',
    ],
    formulas: [String.raw`W_B = u_A + u_B \qquad W_R = \min\{u_A, u_B\} \qquad W_N = u_A\,u_B`, String.raw`\left(\dfrac{u_A}{a}\right)^2 + \left(\dfrac{u_B}{b}\right)^2 = W`],
    ejemplo: {
      parametros,
      enunciado: 'W = 100 unidades; u_A = 2·√x_A y u_B = √x_B.',
      resultado:
        `Bentham: x_A = ${f(r.bentham.xA)} (u_A = ${f(r.bentham.uA, 3)}, u_B = ${f(r.bentham.uB, 3)}). ` +
        `Rawls: x_A = ${f(r.rawls.xA)} (u_A = u_B = ${f(r.rawls.uA, 3)}). Nash: x_A = ${f(r.nash.xA)}.`,
      prueba: 'Lee B, R y N sobre la FPU: cada uno es la tangencia de su curva de bienestar social (recta, escuadra o hipérbola).',
    },
    fuente: '«El bienestar»: funciones de bienestar social; Sen sobre utilitarismo y el criterio de Rawls. Ejercicio propio.',
    autor: AUTOR_BIENESTAR,
  };
}

function externalidadesT(p: Params): Teoria {
  if (p['enfoque'] === 'publico') {
    const parametros = con(SIM_EXT, { enfoque: 'publico', a1: 60, b1: 1, a2: 40, b2: 1, cg: 40 });
    const r = bienPublico({ a1: 60, b1: 1, a2: 40, b2: 1, cg: 40 });
    return {
      titulo: 'Bienes públicos: condición de Samuelson',
      conceptos: [
        'Un bien público es no rival y no excluible: todos consumen la misma cantidad G.',
        'Eficiencia (Samuelson): la suma de las TMS entre el bien público y el privado iguala el costo marginal. La provisión privada se queda corta por el polizón.',
      ],
      formulas: [String.raw`\sum_i TMS_i(G^{*}) = CMg(G^{*})`, String.raw`TMS_i = a_i - b_i\,G`],
      ejemplo: {
        parametros,
        enunciado: 'TMS₁ = 60 − G, TMS₂ = 40 − G y CMg = 40.',
        resultado: `100 − 2G = 40 ⇒ G* = ${f(r.G)}. Provisión privada: solo aporta el consumidor 1, G = ${f(r.Gprivado)}.`,
        prueba: 'Lee G* donde la suma vertical (morada) corta al CMg, y Gᵖ donde lo corta la TMS del consumidor 1.',
      },
      fuente: '«Los bienes públicos»: condición de Samuelson y el polizón. Ejercicio propio con la notación de Varian.',
      autor: AUTOR_EG,
    };
  }
  const parametros = con(SIM_EXT, { enfoque: 'externalidad', a: 100, b: 1, c: 10, d: 1, e: 0.5 });
  const r = externalidad({ a: 100, b: 1, c: 10, d: 1, e: 0.5 });
  return {
    titulo: 'Externalidades: impuesto pigouviano y teorema de Coase',
    conceptos: [
      'Con una externalidad negativa el productor iguala el precio al CMg privado e ignora el daño: produce más que el óptimo social.',
      'Pigou: un impuesto igual al daño marginal en el óptimo internaliza la externalidad. Coase: sin costos de transacción, la negociación llega al óptimo sea quien sea el dueño del derecho.',
    ],
    formulas: ['p(Q^{*}) = CMg_P(Q^{*}) + CMgE(Q^{*})', 't^{*} = CMgE(Q^{*})'],
    ejemplo: {
      parametros,
      enunciado: 'p = 100 − Q, CMg privado = 10 + Q y daño marginal CMgE = 0.5·Q.',
      resultado: `Mercado: Q = ${f(r.Qm)}; óptimo: Q* = ${f(r.Qs)}; t* = ${f(r.t)}. Pérdida irrecuperable sin corregir = ${f(r.PIE)}.`,
      prueba: 'Lee S*, donde la demanda corta al CMg social; la recta morada (CMg privado + t*) pasa por el mismo punto.',
    },
    fuente: '«Las externalidades»: impuesto pigouviano y teorema de Coase; Monsalve (2017). Ejercicio propio.',
    autor: AUTOR_EG,
  };
}

function incertidumbreT(p: Params): Teoria {
  if (p['enfoque'] === 'seguro') {
    const parametros = con(SIM_INC, { enfoque: 'seguro', r: 0.5, W: 100, L: 50, pl: 0.2, gamma: 0.2 });
    const s = seguro(0.5, 100, 50, 0.2, 0.2);
    const caro = seguro(0.5, 100, 50, 0.2, 0.22);
    return {
      titulo: 'Incertidumbre: mercado de seguros',
      conceptos: [
        'Con consumo contingente, comprar K de cobertura cuesta γK en ambos estados y paga K si hay pérdida: la recta tiene pendiente −(1 − γ)/γ.',
        'El óptimo iguala la TMS de utilidad esperada, π·u′(c_b)/((1 − π)·u′(c_g)), con el precio relativo γ/(1 − γ).',
        'Con prima justa (γ = π), quien es averso al riesgo se asegura por completo.',
      ],
      formulas: [String.raw`c_b = W - L + (1-\gamma)K, \qquad c_g = W - \gamma K`, String.raw`\dfrac{\pi\,u'(c_b)}{(1-\pi)\,u'(c_g)} = \dfrac{\gamma}{1-\gamma}`],
      ejemplo: {
        parametros,
        enunciado: 'u = √w, W = 100, pérdida L = 50 con probabilidad 0.2 y prima γ = 0.2 por peso asegurado.',
        resultado: `K* = ${f(s.K)}: c_b = c_g = ${f(s.cg)} (seguro completo). Si γ sube a 0.22, K* baja a ${f(caro.K)}.`,
        prueba: 'El rombo E queda sobre la recta de certeza; sube γ y verás que E se aleja de ella hacia la dotación ω.',
      },
      fuente: '«La incertidumbre»: consumo contingente y demanda de seguros. Ejercicio propio con la notación de Varian.',
      autor: AUTOR_EG,
    };
  }
  const parametros = con(SIM_INC, { enfoque: 'riesgo', r: 0.5, w1: 25, w2: 100, pi: 0.5 });
  const l = loteria(0.5, 25, 100, 0.5);
  return {
    titulo: 'Incertidumbre: actitudes frente al riesgo',
    conceptos: [
      'Con utilidad de von Neumann-Morgenstern, una lotería se valora por su utilidad esperada UE = πu(w₁) + (1 − π)u(w₂).',
      'Si u es cóncava (aversión al riesgo), u(VE) > UE: el equivalente cierto es menor que el valor esperado y la diferencia es la prima de riesgo.',
    ],
    formulas: [String.raw`UE = \pi\,u(w_1) + (1-\pi)\,u(w_2)`, String.raw`u(EC) = UE, \qquad \text{prima} = VE - EC`],
    ejemplo: {
      parametros,
      enunciado: 'u = √w; la lotería da 25 o 100 con probabilidad ½ cada uno.',
      resultado: `VE = ${f(l.VE)}, UE = ${f(l.UE)}, EC = ${f(l.EC)} y prima de riesgo = ${f(l.prima)}.`,
      prueba: 'La flecha roja va del punto VE (sobre la cuerda) al EC (sobre la curva): su largo es la prima. Lleva r a 1 y desaparece.',
    },
    fuente: '«La incertidumbre»: utilidad esperada y aversión al riesgo; Monsalve (2017). Ejercicio propio.',
    autor: AUTOR_EG,
  };
}

export function teoria(sim: string, p: Params): Teoria | null {
  switch (sim) {
    case 'slutsky':
      return slutsky(p);
    case 'incertidumbre':
      return incertidumbreT(p);
    case 'produccion':
      return produccionT(p);
    case 'edgeworth':
      return edgeworthT(p);
    case 'equilibrio-produccion':
      return equilibrioProduccionT(p);
    case 'bienestar':
      return bienestarT(p);
    case 'externalidades':
      return externalidadesT(p);
    default:
      return null;
  }
}
