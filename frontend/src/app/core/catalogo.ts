import { CARGADORES_FUNDAMENTOS } from '../fundamentos/registro';
import { CARGADORES_MACRO1 } from '../macro1/registro';
import { CARGADORES_MACRO2 } from '../macro2/registro';
import { CARGADORES_MICRO1 } from '../micro1/registro';
import { CARGADORES_MICRO2 } from '../micro2/registro';
import { CARGADORES_MICRO3 } from '../micro3/registro';
import { Materia, SimuladorMeta } from './tipos';

export const TITULO_APP = 'SimEc UNAL';
export const SUBTITULO_APP = 'Simulador Económico · Facultad de Ciencias Económicas';
export const CREADOR = 'Unidad Informática FCE · Universidad Nacional de Colombia';
export const VERSION_NUMERO = '0.8.0';
export const VERSION = VERSION_NUMERO + ' — Fundamentos, Microeconomía 1, 2 y 3, Macroeconomía 1 y 2 (beta)';

/** Un simulador está "listo" cuando tiene su módulo registrado en <materia>/registro.ts. */
const listoEn =
  (cargadores: Record<string, unknown>) =>
  (id: string, nombre: string, descripcion: string, ecuacion: string, ecuacionResumen?: string): SimuladorMeta => ({
    id,
    nombre,
    descripcion,
    ecuacion,
    ecuacionResumen,
    listo: id in cargadores,
  });
const listo = listoEn(CARGADORES_MICRO1);
const listoMacro = listoEn(CARGADORES_MACRO1);
const listoFund = listoEn(CARGADORES_FUNDAMENTOS);
const listoMacro2 = listoEn(CARGADORES_MACRO2);
const listoMicro2 = listoEn(CARGADORES_MICRO2);
const listoMicro3 = listoEn(CARGADORES_MICRO3);

/** Asigna un pilar del programa a un bloque de simuladores. */
const pilar = (nombre: string, sims: SimuladorMeta[]): SimuladorMeta[] => sims.map((s) => ({ ...s, pilar: nombre }));

export const FUNDAMENTOS: Materia = {
  id: 'fundamentos',
  nombre: 'Fundamentos de Economía',
  sigla: 'Fu',
  color: '#3DD6B5',
  colorClaro: '#0A7D66',
  descripcion:
    'Mercados, elasticidades, excedentes e intervención del Estado: las herramientas básicas del análisis económico (Mankiw, cap. 2–10).',
  simuladores: [
    listoFund(
      'fpp',
      'Frontera de posibilidades de producción',
      'Costo de oportunidad creciente, eficiencia productiva y crecimiento.',
      String.raw`$\left(\dfrac{x}{X}\right)^k + \left(\dfrac{y}{Y}\right)^k = 1 \qquad CO = -\dfrac{dy}{dx}$`,
    ),
    listoFund(
      'ventaja-comparativa',
      'Ventaja comparativa y comercio',
      'Costos de oportunidad entre dos productores y ganancias del intercambio.',
      String.raw`$CO_{\text{carne}} = \dfrac{\text{min carne}}{\text{min papas}} \qquad CO_{\text{carne}}^{A} < P < CO_{\text{carne}}^{B}$`,
      String.raw`$CO_{\text{carne}} = \dfrac{\text{min carne}}{\text{min papas}}$`,
    ),
    listoFund(
      'oferta-demanda',
      'Equilibrio de mercado',
      'Oferta y demanda lineales, precio y cantidad de equilibrio, y desplazamientos de las curvas.',
      String.raw`$Q^d = a - bP \qquad Q^s = c + dP \qquad P^* = \dfrac{a-c}{b+d}$`,
    ),
    listoFund(
      'elasticidades',
      'Elasticidades',
      'Elasticidad precio por punto medio y su efecto sobre el ingreso total.',
      String.raw`$\varepsilon = \dfrac{(Q_2-Q_1)/[(Q_2+Q_1)/2]}{(P_2-P_1)/[(P_2+P_1)/2]} \qquad IT = P\times Q$`,
      String.raw`$\varepsilon = \dfrac{\Delta Q / \bar{Q}}{\Delta P / \bar{P}}$`,
    ),
    listoFund(
      'excedentes',
      'Excedente del consumidor y del productor',
      'Áreas de bienestar en el equilibrio competitivo, en curvas lineales y en tablas escalonadas.',
      String.raw`$EC = \int_0^{Q} \left[P^d(q) - P\right] dq \qquad EP = \int_0^{Q} \left[P - P^s(q)\right] dq$`,
      String.raw`$ET = EC + EP$`,
    ),
    listoFund(
      'controles-precios',
      'Precios máximos y mínimos',
      'Escasez, excedentes, desempleo por salario mínimo y pérdida de peso muerto.',
      String.raw`$P_{\max} < P^* \Rightarrow Q = Q^s(P_{\max}) < Q^d \qquad P_{\min} > P^* \Rightarrow Q = Q^d(P_{\min}) < Q^s$`,
      String.raw`$P_{\max} < P^* \Rightarrow Q^s < Q^d$`,
    ),
    listoFund(
      'impuestos',
      'Impuestos y subsidios',
      'Incidencia tributaria, pérdida irrecuperable de eficiencia y curva de Laffer.',
      String.raw`$P_c - P_v = t \qquad \text{Carga del comprador} = \dfrac{d}{b+d} \qquad PPM = \tfrac12\, t\,(Q^* - Q_t)$`,
      String.raw`$P_c - P_v = t$`,
    ),
    listoFund(
      'comercio-internacional',
      'Comercio internacional',
      'Precio mundial, ganadores y perdedores, arancel y cuota de importación.',
      String.raw`$M = Q^d(P_W + \tau) - Q^s(P_W + \tau) \qquad \text{Recaudo} = \tau \times M$`,
      String.raw`$M = Q^d - Q^s$`,
    ),
    listoFund(
      'externalidades',
      'Externalidades',
      'Costo y beneficio social, óptimo y corrección con impuestos o subsidios pigouvianos.',
      String.raw`$\text{Costo social} = P^s(Q) + e \qquad \text{Valor social} = P^d(Q) + e \qquad t_{\text{Pigou}} = e$`,
      String.raw`$t_{\text{Pigou}} = e$`,
    ),
  ],
};

export const MICRO1: Materia = {
  id: 'micro1',
  nombre: 'Microeconomía 1',
  sigla: 'Mi',
  color: '#FFA45B',
  colorClaro: '#B35A0E',
  descripcion:
    'Problema del consumidor, problema del productor y el mercado competitivo: restricción presupuestal, preferencias, elección óptima, costos y competencia perfecta.',
  simuladores: [
    ...pilar('Problema del consumidor', [
      listo(
        'restriccion-presupuestal',
        'Restricción presupuestal',
        'Conjunto factible del consumidor y efectos de cambios en precios e ingreso.',
        String.raw`$p_1 x + p_2 y = M$`,
      ),
      listo(
        'preferencias',
        'Preferencias y curvas de indiferencia',
        'Cobb-Douglas, Leontief, sustitutos perfectos, cuasilineal, separable y Stone-Geary.',
        String.raw`$U(x, y) = x^{\alpha} y^{\beta} \qquad TMS = \dfrac{UMg_x}{UMg_y}$`,
      ),
      listo(
        'eleccion-optima',
        'Elección óptima del consumidor',
        'Problema primal (máxima utilidad) y dual (mínimo gasto): demanda marshalliana frente a hicksiana.',
        String.raw`$TMS = \dfrac{UMg_x}{UMg_y} = \dfrac{p_1}{p_2}$`,
      ),
      listo(
        'slutsky',
        'Efectos ingreso y sustitución',
        'Descomposición de Slutsky y de Hicks ante un cambio de precio.',
        String.raw`$\dfrac{\partial x}{\partial p_1} = \dfrac{\partial h_1}{\partial p_1} - x\,\dfrac{\partial x}{\partial M}$`,
      ),
      listo(
        'demanda',
        'Demanda individual y de mercado',
        'Curva de demanda, curva de Engel, elasticidades y medidas de bienestar (VC, VE, excedente).',
        String.raw`$x^{*} = x(p_1, p_2, M) \qquad \varepsilon = \dfrac{\partial x}{\partial p_1}\dfrac{p_1}{x}$`,
      ),
    ]),
    ...pilar('Problema del productor', [
      listo(
        'produccion',
        'Tecnología e isocuantas',
        'Función de producción, rendimientos a escala, máximo producto con un presupuesto y mínimo costo de una producción.',
        String.raw`$z = A\,x^{\alpha} y^{\beta}$`,
      ),
      listo(
        'costos',
        'Costos de corto y largo plazo',
        'Costo total, medio y marginal; envolvente de largo plazo.',
        String.raw`$CT(Q) = CF + CV(Q) \qquad CMg = \dfrac{dCT}{dQ}$`,
      ),
    ]),
    ...pilar('El mercado', [
      listo(
        'competencia-perfecta',
        'Competencia perfecta',
        'Decisión de la empresa (P = CMg), punto de cierre, equilibrio de mercado y excedentes.',
        String.raw`$P = CMg(Q)$`,
      ),
    ]),
  ],
};

export const MACRO1: Materia = {
  id: 'macro1',
  nombre: 'Macroeconomía 1',
  sigla: 'Ma',
  color: '#5B9BFF',
  colorClaro: '#2557C7',
  descripcion:
    'El corto plazo y el principio de la demanda efectiva: del modelo Keynesiano al modelo Mundell-Fleming.',
  simuladores: [
    listoMacro(
      'keynesiano',
      'Modelo Keynesiano (Gasto–Ingreso)',
      'Equilibrio en el mercado de bienes con precios fijos y multiplicador con impuestos proporcionales.',
      String.raw`$Z = c_0 + c_1(Y - T) + \bar{I} + G, \quad T = T_0 + tY \quad\Rightarrow\quad Y^{*} = \dfrac{A}{1 - c_1(1-t)}$`,
      String.raw`$Y^{*} = \dfrac{A}{1 - c_1(1-t)}$`,
    ),
    listoMacro(
      'is-lm',
      'IS–LM en economía cerrada',
      'Equilibrio conjunto del mercado de bienes y del mercado de dinero; política fiscal y monetaria.',
      String.raw`$IS:\; Y = \dfrac{A - b_2\,i}{1 - c_1 - b_1} \qquad LM:\; i = \bar{\imath} \;\text{ o }\; \dfrac{M}{P} = kY - h\,i$`,
      String.raw`$Y = \dfrac{A - b_2\,i}{1 - c_1 - b_1}, \;\; i = \bar{\imath}$`,
    ),
    listoMacro(
      'da-oa',
      'Demanda y oferta agregadas (DA–OA)',
      'Nivel de precios, rigideces nominales y ajuste hacia el producto potencial.',
      String.raw`$OA_{CP}:\; P = P^{e}\left[1 + \lambda\,\dfrac{Y - \bar{Y}_n}{\bar{Y}_n}\right]$`,
    ),
    listoMacro(
      'mundell-fleming',
      'Mundell–Fleming (IS–LM–BP)',
      'Economía abierta: balanza de pagos, tipo de cambio y efectividad de las políticas.',
      String.raw`$XN = x_0 + \phi\,e - qY \qquad e = e^{e}\,\dfrac{1 + i^{*}}{1 + i}$`,
    ),
  ],
};

export const MICRO2: Materia = {
  id: 'micro2',
  nombre: 'Microeconomía 2',
  sigla: 'Mi2',
  color: '#FF7A85',
  colorClaro: '#C2384A',
  descripcion:
    'Equilibrio general y bienestar: dualidad del consumidor y del productor, incertidumbre, intercambio y producción en una economía 2×2, elección social y fallas de mercado (Varian; Monsalve, 2017; Sen).',
  simuladores: [
    ...pilar('Fundamentos de consumidor y productor', [
      listoMicro2(
        'slutsky',
        'Ecuación de Slutsky y dualidad del consumidor',
        'Pivote y desplazamiento de la recta presupuestaria (Slutsky y Hicks) y efecto dotación en la oferta de trabajo.',
        String.raw`$\Delta x_1 = \Delta x_1^{s} + \Delta x_1^{n}$`,
      ),
      listoMicro2(
        'incertidumbre',
        'Elección bajo incertidumbre',
        'Utilidad esperada de von Neumann-Morgenstern: equivalente cierto, prima de riesgo y demanda de seguros.',
        String.raw`$UE = \pi\,u(w_1) + (1-\pi)\,u(w_2)$`,
      ),
      listoMicro2(
        'produccion',
        'Dualidad del productor',
        'Función de beneficio π(p, w) con el lema de Hotelling y función de costos c(w, y) con el lema de Shephard.',
        String.raw`$\dfrac{\partial \pi}{\partial p} = y \qquad \dfrac{\partial c}{\partial w_i} = x_i(w, y)$`,
      ),
    ]),
    ...pilar('Equilibrio general', [
      listoMicro2(
        'edgeworth',
        'Caja de Edgeworth (intercambio puro)',
        'Curva de contrato y núcleo; equilibrio walrasiano, ley de Walras y teoremas del bienestar.',
        String.raw`$TMS^{A} = TMS^{B} = \dfrac{p_1}{p_2}$`,
      ),
      listoMicro2(
        'equilibrio-produccion',
        'Equilibrio general con producción (2×2)',
        'Frontera de posibilidades de producción con TMS = TMT, y teoremas de Stolper-Samuelson y Rybczynski.',
        String.raw`$TMS = TMT = \dfrac{p_1}{p_2}$`,
      ),
    ]),
    ...pilar('Bienestar, elección social y fallas', [
      listoMicro2(
        'bienestar',
        'Bienestar y elección social',
        'Frontera de posibilidades de utilidad con criterios de Bentham, Rawls y Nash, y teorema de imposibilidad de Arrow.',
        String.raw`$W = u_A + u_B \qquad W = \min\{u_A, u_B\} \qquad W = u_A\,u_B$`,
      ),
      listoMicro2(
        'externalidades',
        'Externalidades y bienes públicos',
        'Óptimo social, impuesto pigouviano y teorema de Coase; condición de Samuelson para bienes públicos.',
        String.raw`$t^{*} = CMgE(q^{*}) \qquad \textstyle\sum_i TMS_i = CMg$`,
      ),
    ]),
  ],
};

export const MICRO3: Materia = {
  id: 'micro3',
  nombre: 'Microeconomía 3',
  sigla: 'Mi3',
  color: '#F06FB0',
  colorClaro: '#B8357A',
  descripcion:
    'Teoría de juegos y fallas de mercado: interacción estratégica, monopolio, oligopolio e información asimétrica (Lozano y Salamanca, 2024; Monsalve, 2025).',
  simuladores: [
    listoMicro3(
      'juegos',
      'Teoría de juegos',
      'Forma normal (Nash en estrategias puras y mixtas), forma extensiva (inducción hacia atrás) y juegos repetidos con estrategias gatillo.',
      String.raw`$u_i(s_i^{*}, s_{-i}^{*}) \ge u_i(s_i, s_{-i}^{*})$`,
    ),
    listoMicro3(
      'monopolio',
      'Monopolio y discriminación de precios',
      'IMg = CMg, índice de Lerner y pérdida irrecuperable; discriminación de primer, segundo y tercer grado.',
      String.raw`$p(y)\left[1 - \dfrac{1}{|\varepsilon|}\right] = CMg(y)$`,
    ),
    listoMicro3(
      'oligopolio',
      'Oligopolio e interacción estratégica',
      'Curvas de reacción de Cournot, liderazgo de Stackelberg, competencia de Bertrand y colusión.',
      String.raw`$f_1(y_2) = \dfrac{a - c_1 - b\,y_2}{2b}$`,
    ),
    listoMicro3(
      'informacion',
      'Información asimétrica',
      'Selección adversa en el mercado de limones, señalización de Spence y riesgo moral.',
      String.raw`$p = \mathbb{E}[\,v \mid \text{calidad ofrecida}\,]$`,
    ),
  ],
};

export const MACRO2: Materia = {
  id: 'macro2',
  nombre: 'Macroeconomía 2',
  sigla: 'M2',
  color: '#B79CFF',
  colorClaro: '#6D4BC4',
  descripcion:
    'Economía abierta, ciclo y crecimiento: IS–LM, Mundell–Fleming (sistema de cinco paneles y DD–AA de Krugman y Obstfeld), DA–OA, curva de Phillips y Solow.',
  simuladores: [
    listoMacro2(
      'is-lm',
      'IS–LM con trampa de liquidez',
      'Tres paneles enlazados (cruz keynesiana, mercado de dinero e IS–LM) con choques fiscales y monetarios, efecto expulsión y trampa de liquidez.',
      String.raw`$IS:\; Y = \dfrac{C_0 - cT + I_0 + G - b\,r}{1-c} \qquad LM:\; \dfrac{M}{P} = kY - h\,r$`,
      String.raw`$\dfrac{M}{P} = kY - h\,r$`,
    ),
    listoMacro2(
      'mundell-fleming',
      'Mundell–Fleming: economía abierta en cinco paneles',
      'Fondos prestables, paridad de intereses, comercio exterior, FPP consumo–inversión y estructura intertemporal de la producción enlazados: apertura financiera, política fiscal y monetaria, i*, exportaciones y expectativas con tipo fijo o flotante.',
      String.raw`$S^N(i) + KF = I(i) \qquad XN(q) = S^N - I = -KF$`,
      String.raw`$XN = S^N - I$`,
    ),
    listoMacro2(
      'dd-aa',
      'Mundell–Fleming de corto plazo (modelo DD–AA)',
      'DD–AA y mercado de divisas enlazados: choques transitorios y permanentes con tipo fijo o flotante y movilidad de capital (Krugman y Obstfeld).',
      String.raw`$DD:\; Y = D\!\left(\tfrac{EP^*}{P}, Y-T, I, G\right) \qquad AA:\; R = R^* + \dfrac{E^e - E}{E}$`,
      String.raw`$R = R^* + \dfrac{E^e - E}{E}$`,
    ),
    listoMacro2(
      'da-oa',
      'DA–OA y curva de Phillips',
      'DA–OACP–OALP enlazado con la curva de Phillips (ley de Okun): choques de demanda, petroleros y de productividad con autocorrección.',
      String.raw`$Y = D_0 - dP \qquad P = W + \tfrac{Y - Y_p}{\sigma}$`,
      String.raw`$P = W + \dfrac{Y - Y_p}{\sigma}$`,
    ),
    listoMacro2(
      'phillips',
      'Curva de Phillips',
      'Intercambio de corto plazo entre inflación y desempleo, NAIRU y costo de la desinflación.',
      String.raw`$\pi = \pi^e - \beta\,(u - u^*) + v$`,
    ),
    listoMacro2(
      'solow',
      'Modelo de crecimiento de Solow',
      'Dos paneles con eje k compartido: producción y = A·f(k) e inversión frente a reposición; estado estacionario, regla de oro y choques.',
      String.raw`$\Delta k = s\,A k^{\alpha} - (n + g + \delta)\,k$`,
    ),
  ],
};

export const MATERIAS: Materia[] = [FUNDAMENTOS, MICRO1, MICRO2, MICRO3, MACRO1, MACRO2];

export const totalSimuladores = (): number => MATERIAS.reduce((n, m) => n + m.simuladores.length, 0);
export const listos = (m: Materia): number => m.simuladores.filter((s) => s.listo).length;
export const buscarMateria = (id: string): Materia | undefined => MATERIAS.find((m) => m.id === id);
/** Simuladores de la materia agrupados por pilar, en orden (pilar null = sin agrupar). */
export function porPilar(m: Materia): { pilar: string | null; simuladores: SimuladorMeta[] }[] {
  const grupos: { pilar: string | null; simuladores: SimuladorMeta[] }[] = [];
  for (const s of m.simuladores) {
    const pilar = s.pilar ?? null;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.pilar === pilar) ultimo.simuladores.push(s);
    else grupos.push({ pilar, simuladores: [s] });
  }
  return grupos;
}

export const buscarSimulador = (m: Materia, id: string): SimuladorMeta | undefined =>
  m.simuladores.find((s) => s.id === id);
