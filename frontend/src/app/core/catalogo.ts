import { CARGADORES_MACRO1 } from '../macro1/registro';
import { CARGADORES_MICRO1 } from '../micro1/registro';
import { Materia, SimuladorMeta } from './tipos';

export const TITULO_APP = 'Simulador Económico';
export const SUBTITULO_APP = 'Facultad de Ciencias Económicas';
export const CREADOR = 'Unidad Informática FCE · Universidad Nacional de Colombia';
export const VERSION = '0.4.0 — Microeconomía 1 y Macroeconomía 1 (beta)';

const pendiente = (
  id: string,
  nombre: string,
  descripcion: string,
  ecuacion: string,
  ecuacionResumen?: string,
): SimuladorMeta => ({ id, nombre, descripcion, ecuacion, ecuacionResumen, listo: false });

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

export const FUNDAMENTOS: Materia = {
  id: 'fundamentos',
  nombre: 'Fundamentos de Economía',
  sigla: 'Fu',
  color: '#3DD6B5',
  descripcion:
    'Mercados, elasticidades, excedentes e intervención del Estado: las herramientas básicas del análisis económico.',
  simuladores: [
    pendiente(
      'oferta-demanda',
      'Equilibrio de mercado',
      'Oferta y demanda lineales, precio y cantidad de equilibrio, y desplazamientos de las curvas.',
      String.raw`$Q^d = a - bP \qquad Q^s = c + dP$`,
    ),
    pendiente(
      'elasticidades',
      'Elasticidades',
      'Elasticidad precio, ingreso y cruzada a lo largo de la curva de demanda.',
      String.raw`$\varepsilon_{p} = \dfrac{\Delta Q / Q}{\Delta P / P}$`,
    ),
    pendiente(
      'excedentes',
      'Excedente del consumidor y del productor',
      'Áreas de bienestar en el equilibrio competitivo.',
      String.raw`$EC = \int_0^{Q^*} D(Q)\,dQ - P^*Q^*$`,
    ),
    pendiente(
      'intervencion',
      'Impuestos, subsidios y controles de precios',
      'Incidencia tributaria, pérdida irrecuperable de eficiencia, precios máximos y mínimos.',
      String.raw`$P_c - P_p = t$`,
    ),
    pendiente(
      'fpp',
      'Frontera de posibilidades de producción',
      'Costo de oportunidad creciente y eficiencia productiva.',
      String.raw`$\dfrac{x^2}{a^2} + \dfrac{y^2}{b^2} = 1$`,
    ),
    pendiente(
      'ventaja-comparativa',
      'Ventaja comparativa y comercio',
      'Costos de oportunidad entre dos países y ganancias del intercambio.',
      String.raw`$CO_{x} = \dfrac{\Delta y}{\Delta x}$`,
    ),
  ],
};

export const MICRO1: Materia = {
  id: 'micro1',
  nombre: 'Microeconomía 1',
  sigla: 'Mi',
  color: '#FFA45B',
  descripcion:
    'Teoría del consumidor y del productor: restricción presupuestal, preferencias, elección óptima, costos y estructuras de mercado.',
  simuladores: [
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
      'Tangencia entre la curva de indiferencia y la recta presupuestal.',
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
    listo(
      'produccion',
      'Tecnología e isocuantas',
      'Función de producción, productividad marginal y rendimientos a escala.',
      String.raw`$z = A\,x^{\alpha} y^{\beta}$`,
    ),
    listo(
      'costos',
      'Costos de corto y largo plazo',
      'Costo total, medio y marginal; envolvente de largo plazo.',
      String.raw`$CT(Q) = CF + CV(Q) \qquad CMg = \dfrac{dCT}{dQ}$`,
    ),
    listo(
      'competencia-perfecta',
      'Competencia perfecta',
      'Maximización de beneficios, punto de cierre y oferta de la empresa.',
      String.raw`$P = CMg(Q)$`,
    ),
    listo(
      'monopolio',
      'Monopolio',
      'Ingreso marginal, poder de mercado y pérdida de eficiencia.',
      String.raw`$IMg(Q) = CMg(Q)$`,
    ),
    listo(
      'oligopolio',
      'Oligopolio',
      'Cournot, Stackelberg, cartel y Bertrand; convergencia a competencia con n empresas.',
      String.raw`$y_i^{*} = \dfrac{a-c}{n+1} \qquad p^{*} = \dfrac{a+nc}{n+1}$`,
    ),
  ],
};

export const MACRO1: Materia = {
  id: 'macro1',
  nombre: 'Macroeconomía 1',
  sigla: 'Ma',
  color: '#5B9BFF',
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

export const MATERIAS: Materia[] = [FUNDAMENTOS, MICRO1, MACRO1];

export const totalSimuladores = (): number => MATERIAS.reduce((n, m) => n + m.simuladores.length, 0);
export const listos = (m: Materia): number => m.simuladores.filter((s) => s.listo).length;
export const buscarMateria = (id: string): Materia | undefined => MATERIAS.find((m) => m.id === id);
export const buscarSimulador = (m: Materia, id: string): SimuladorMeta | undefined =>
  m.simuladores.find((s) => s.id === id);
