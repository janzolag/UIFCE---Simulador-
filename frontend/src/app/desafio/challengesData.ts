/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Banco de retos del Modo Desafío (tres por modelo) para Micro 2 (Varian) y Macro 2.
 *
 * Cada `medir` usa las funciones del modelo que dibujan la gráfica, y `solucion` es una combinación
 * de deslizadores (dentro de su rango y sobre su paso) que cumple la meta con ±1,5 %. Las pruebas de
 * desafio.spec.ts lo verifican reto por reto, junto con que el estado inicial NO cumple la meta.
 */
import { Params } from '../core/tipos';
import { descomposicion } from '../micro1/modelos/slutsky';
import { ParamsProduccion, costoCorto, costoMinimo } from '../micro2/simuladores/produccion';
import { costoMedio, cournotNash, monopolio, stackelbergLider, walras } from '../micro2/modelos/mercados';
import { utilidadDe } from '../micro2/simuladores/slutsky';
import { cortoPlazo } from '../macro2/modelos/daoa';
import { equilibrioISLM2 } from '../macro2/modelos/islm';
import { inflacion } from '../macro2/modelos/phillips';
import { estadoEstacionario } from '../macro2/modelos/solow';
import { escenarios as escDAOA, desempleo } from '../macro2/simuladores/da-oa';
import { escenarios as escISLM } from '../macro2/simuladores/is-lm';
import { pasos as pasosMF } from '../macro2/simuladores/mundell-fleming';
import { escenarios as escPhillips } from '../macro2/simuladores/phillips';
import { escenarios as escSolow } from '../macro2/simuladores/solow';
import { Reto } from './motor';

const n = (p: Params, k: string): number => Number(p[k]);

/* ------------------------------------------------------------------ Micro 2 */

const slutsky = (p: Params) =>
  descomposicion(utilidadDe(String(p['caso']), n(p, 'a')), n(p, 'p1'), n(p, 'p2'), n(p, 'm'), n(p, 'p1n'), p['metodo'] as any);
const utilSlutsky = (p: Params) => {
  const d = slutsky(p);
  return utilidadDe(String(p['caso']), n(p, 'a')).U(d.C.x, d.C.y);
};
const cmeMinimo = (p: Params): number => {
  const q = { a: n(p, 'a'), b: n(p, 'b'), c: n(p, 'c'), d: n(p, 'd'), F: n(p, 'F') };
  return costoMedio(q, Math.sqrt((2 * q.F) / q.d));
};
const prod = (p: Params): ParamsProduccion => ({
  modo: String(p['modo']),
  a: n(p, 'a'), b: n(p, 'b'), w1: n(p, 'w1'), w2: n(p, 'w2'), y: n(p, 'y'),
  CF: n(p, 'CF'), ac: n(p, 'ac'), bc: n(p, 'bc'), cc: n(p, 'cc'),
});
const mono = (p: Params) => monopolio({ a: n(p, 'a'), b: n(p, 'b'), c: n(p, 'c'), d: n(p, 'd'), F: n(p, 'F') });
const duo = (p: Params) => ({ a: n(p, 'a'), b: n(p, 'b'), c1: n(p, 'c1'), c2: n(p, 'c2') });
const edge = (p: Params) =>
  walras({ a: n(p, 'a'), b: n(p, 'b'), wA1: n(p, 'wA1'), wA2: n(p, 'wA2'), wB1: n(p, 'wB1'), wB2: n(p, 'wB2') });

const MICRO2: Reto[] = [
  // Slutsky (Cobb-Douglas, a = 0.5, p₁ = 2, p₂ = 1, m = 40, p₁′ = 3)
  {
    id: 'm2-slutsky-1',
    materia: 'micro2',
    sim: 'slutsky',
    dificultad: 'Básico',
    titulo: 'Encarecer el bien 1',
    enunciado: 'Hoy compras x₁ = 10 a p₁ = 2. Sube el nuevo precio p₁′ hasta que la cesta final tenga x₁ = 5.',
    inicial: {},
    controles: ['p1n'],
    objetivos: [{ etiqueta: 'x₁ final', meta: 5, medir: (p) => slutsky(p).C.x, zona: { eje: 'x' } }],
    solucion: { p1n: 4 },
    explicacion:
      'Con Cobb-Douglas el gasto en el bien 1 es una fracción fija de la renta: x₁ = a·m/p₁ = 20/p₁′. Para que x₁ baje a la mitad, el precio debe duplicarse a p₁′ = 4.',
    pista: 'El gasto en x₁ siempre es 20: busca el precio que, multiplicado por 5, da 20.',
  },
  {
    id: 'm2-slutsky-2',
    materia: 'micro2',
    sim: 'slutsky',
    dificultad: 'Intermedio',
    titulo: 'Recuperar la utilidad',
    enunciado: 'Antes del alza (p₁ = 2) tu utilidad era U* = √200 ≈ 14.14. Con p₁′ = 3, elige la renta m que te devuelve a U*.',
    inicial: {},
    controles: ['m'],
    objetivos: [{ etiqueta: 'Utilidad final U', meta: Math.sqrt(200), medir: (p) => utilSlutsky(p) }],
    solucion: { m: 49 },
    explicacion:
      'Con u = √(x₁·x₂) la utilidad indirecta es m/(2·√(p₁·p₂)), así que volver a U* con p₁′ = 3 exige m = 2·√3·14.14 ≈ 49. Esa es la compensación de Hicks, algo menor que la de Slutsky (m = 50), porque basta volver a la curva de indiferencia y no a la cesta inicial.',
    pista: 'La utilidad crece en proporción a m: sube la renta hasta que el alza de p₁ quede compensada.',
  },
  {
    id: 'm2-slutsky-3',
    materia: 'micro2',
    sim: 'slutsky',
    dificultad: 'Avanzado',
    titulo: 'Efecto sustitución puro',
    enunciado: 'Con la compensación de Hicks (utilidad constante), elige el nuevo precio p₁′ para que el efecto sustitución sobre x₁ sea −2.93.',
    inicial: { metodo: 'hicks' },
    controles: ['p1n'],
    objetivos: [{ etiqueta: 'Efecto sustitución en x₁', meta: -2.93, medir: (p) => slutsky(p).efecto_sustitucion[0] }],
    solucion: { p1n: 4 },
    explicacion:
      'El efecto sustitución de Hicks es el movimiento sobre la misma curva de indiferencia: la demanda compensada es x₁ʰ = U*·√(p₂/p₁′). Con p₁′ = 4 cae a 7.07, es decir, 2.93 unidades menos que la cesta inicial.',
    pista: 'El efecto sustitución siempre va en contra del precio: sube p₁′ para hacerlo más negativo.',
  },
  // Producción y costos (largo: x₁^0.5·x₂^0.5, w = (4, 1), y = 10; corto: CF = 20, a = 10, b = 2, c = 0.5)
  {
    id: 'm2-produccion-1',
    materia: 'micro2',
    sim: 'produccion',
    dificultad: 'Básico',
    titulo: 'Costo mínimo para y*',
    enunciado: 'Producir y = 10 cuesta como mínimo c(w, y) = 40 con w₁ = 4 y w₂ = 1. Elige la producción y para que el costo mínimo sea 60.',
    inicial: { modo: 'largo' },
    controles: ['y'],
    objetivos: [{ etiqueta: 'Costo mínimo c(w, y)', meta: 60, decimales: 1, medir: (p) => costoMinimo(prod(p)).costo }],
    solucion: { y: 15 },
    explicacion:
      'Con rendimientos constantes a escala (a + b = 1) el costo mínimo es proporcional a la producción: c(w, y) = 2·√(w₁w₂)·y = 4y. Por eso pasar de 40 a 60 exige y = 15.',
    pista: 'Con a + b = 1 el costo crece en línea recta con y: sube la producción hasta que 4·y llegue a 60.',
  },
  {
    id: 'm2-produccion-2',
    materia: 'micro2',
    sim: 'produccion',
    dificultad: 'Intermedio',
    titulo: 'Precio de equilibrio (break-even)',
    enunciado: 'El precio de equilibrio, mínimo del CMe, es 14.8 con CF = 20. Cambia el costo fijo CF para que sea 20.',
    inicial: { modo: 'corto' },
    controles: ['CF'],
    objetivos: [
      { etiqueta: 'Mínimo del CMe', meta: 20, decimales: 1, medir: (p) => costoCorto(prod(p)).precio_nivelacion(), zona: { eje: 'y' } },
    ],
    solucion: { CF: 40 },
    explicacion:
      'El CMe mínimo es donde el CMg lo corta, y un costo fijo mayor eleva el CFMe y desplaza ese mínimo hacia arriba y a la derecha. Con CF = 40 el break-even llega a 19.9, y por debajo de ese precio la empresa pierde dinero.',
    pista: 'Duplicar el costo fijo sube el break-even: aumenta CF hasta rondar 40.',
  },
  {
    id: 'm2-produccion-3',
    materia: 'micro2',
    sim: 'produccion',
    dificultad: 'Avanzado',
    titulo: 'Precio de cierre',
    enunciado: 'El precio de cierre, mínimo del CVMe, es 8. Elige el parámetro b de la función de costo para que baje a 5.5.',
    inicial: { modo: 'corto' },
    controles: ['bc'],
    objetivos: [
      { etiqueta: 'Precio de cierre (mín CVMe)', meta: 5.5, decimales: 1, medir: (p) => costoCorto(prod(p)).precio_cierre(), zona: { eje: 'y' } },
    ],
    solucion: { bc: 3 },
    explicacion:
      'El CVMe = a − b·y + c·y² alcanza su mínimo a − b²/(4c) en y = b/(2c), así que un b mayor lo hace más profundo. Con b = 3 el precio de cierre cae a 5.5, porque la empresa soporta precios menores antes de apagar.',
    pista: 'El mínimo del CVMe baja con el cuadrado de b: sube b hasta 3.',
  },
  // Monopolio simple (a = 100, b = 2, c = 10, d = 1)
  {
    id: 'm2-monopolio-1',
    materia: 'micro2',
    sim: 'monopolio',
    dificultad: 'Básico',
    titulo: 'Trasladar el costo',
    enunciado: 'El monopolista cobra p = 64. Ajusta el costo marginal inicial c para que su precio óptimo sea p = 70.',
    inicial: { modo: 'simple' },
    controles: ['c'],
    objetivos: [{ etiqueta: 'Precio p', meta: 70, medir: (p) => mono(p).p, zona: { eje: 'y' } }],
    solucion: { c: 25 },
    explicacion:
      'De IMg = CMg sale y* = (a − c)/(2b + d) y p = a − b·y*: cada peso de costo sube el precio solo 0.4. Por eso pasar de 64 a 70 exige que c suba 15, de 10 a 25.',
    pista: 'El precio sube menos que el costo: necesitas un aumento de c mayor que 6.',
  },
  {
    id: 'm2-monopolio-2',
    materia: 'micro2',
    sim: 'monopolio',
    dificultad: 'Intermedio',
    titulo: 'Demanda más plana',
    enunciado: 'Hoy se producen 18 unidades. Cambia la pendiente b de la demanda para que el óptimo sea y = 20.',
    inicial: { modo: 'simple' },
    controles: ['b'],
    objetivos: [{ etiqueta: 'Producción y', meta: 20, medir: (p) => mono(p).y, zona: { eje: 'x' } }],
    solucion: { b: 1.75 },
    explicacion:
      'Con y* = 90/(2b + 1), una demanda más plana aleja el IMg de la demanda y el monopolista vende más. Por eso y = 20 exige 2b + 1 = 4.5, es decir, b = 1.75.',
    pista: 'Para producir más, la demanda debe ser más elástica: baja b.',
  },
  {
    id: 'm2-monopolio-3',
    materia: 'micro2',
    sim: 'monopolio',
    dificultad: 'Avanzado',
    titulo: 'Precio de equilibrio de largo plazo',
    enunciado: 'El costo medio mínimo es 20 (c = 10, d = 1). Cambia el costo fijo F para que el precio de break-even, el mínimo del CMe, sea 30.',
    inicial: { modo: 'simple' },
    controles: ['F'],
    objetivos: [{ etiqueta: 'CMe mínimo', meta: 30, decimales: 1, medir: (p) => cmeMinimo(p), zona: { eje: 'y' } }],
    solucion: { F: 200 },
    explicacion:
      'El CMe = F/y + c + (d/2)·y se minimiza donde cruza al CMg, en y = √(2F/d), y vale c + √(2·F·d). Con F = 200 el break-even es 30: por debajo de ese precio la empresa no cubre sus costos totales.',
    pista: 'El mínimo del CMe sube con la raíz del costo fijo: aumenta F hasta que c + √(2F) llegue a 30.',
  },
  // Oligopolio (a = 120, b = 1, c₁ = c₂ = 0)
  {
    id: 'm2-cournot-1',
    materia: 'micro2',
    sim: 'oligopolio',
    dificultad: 'Básico',
    titulo: 'Costo y reacción',
    enunciado: 'En Cournot cada empresa produce 40. Sube el costo c₁ hasta que la empresa 1 produzca y₁ = 30.',
    inicial: {},
    controles: ['c1'],
    objetivos: [{ etiqueta: 'y₁ (Cournot)', meta: 30, medir: (p) => cournotNash(duo(p)).y1, zona: { eje: 'x' } }],
    solucion: { c1: 15 },
    explicacion:
      'En Cournot y₁ = (a − 2c₁ + c₂)/(3b): cada peso de costo propio desplaza la curva de reacción y recorta y₁ en 2/3. Para bajar 10 unidades, c₁ debe subir 15.',
    pista: 'La producción de Cournot cae 2/3 de unidad por cada peso de c₁.',
  },
  {
    id: 'm2-cournot-2',
    materia: 'micro2',
    sim: 'oligopolio',
    dificultad: 'Intermedio',
    titulo: 'Mercado más grande',
    enunciado: 'El precio de Cournot es 40. Cambia el precio máximo a de la demanda para que el precio de Cournot sea 50.',
    inicial: {},
    controles: ['a'],
    objetivos: [
      { etiqueta: 'Precio p (Cournot)', meta: 50, medir: (p) => cournotNash(duo(p)).p, zona: { eje: 'y', panel: '2' } },
    ],
    solucion: { a: 150 },
    explicacion:
      'Con costos nulos el precio de Cournot es p = (a + c₁ + c₂)/3: solo un tercio de la demanda se queda como margen. Subir p en 10 exige ampliar a en 30.',
    pista: 'El precio de Cournot sube un tercio de lo que suba a.',
  },
  {
    id: 'm2-cournot-3',
    materia: 'micro2',
    sim: 'oligopolio',
    dificultad: 'Avanzado',
    titulo: 'Ventaja del líder',
    enunciado: 'En Stackelberg el líder produce 60. Elige el costo de la seguidora c₂ para que el líder produzca y₁ = 70.',
    inicial: {},
    controles: ['c2'],
    objetivos: [
      { etiqueta: 'y₁ (Stackelberg)', meta: 70, medir: (p) => stackelbergLider(duo(p)).y1, zona: { eje: 'x' } },
    ],
    solucion: { c2: 20 },
    explicacion:
      'El líder maximiza sobre la curva de reacción de la seguidora, y₁ = (a − 2c₁ + c₂)/(2b). Si la seguidora es más costosa, reacciona con menos y el líder ocupa ese espacio: c₂ = 20 lleva y₁ a 70.',
    pista: 'Encarecer a la seguidora libera mercado para el líder: sube c₂.',
  },
  // Edgeworth (a = 0.6, b = 0.3, ωᴬ = (8, 2), ωᴮ = (2, 8))
  {
    id: 'm2-edgeworth-1',
    materia: 'micro2',
    sim: 'edgeworth',
    dificultad: 'Básico',
    titulo: 'Precios iguales',
    enunciado: 'El precio relativo walrasiano es p₁/p₂ ≈ 0.78. Ajusta la preferencia de B por el bien 1 (b) para que sea 1.',
    inicial: {},
    controles: ['b'],
    objetivos: [{ etiqueta: 'Precio relativo p₁/p₂', meta: 1, medir: (p) => edge(p).p }],
    solucion: { b: 0.4 },
    explicacion:
      'El precio que vacía el mercado es p = (a·ω₂ᴬ + b·ω₂ᴮ)/((1 − a)·ω₁ᴬ + (1 − b)·ω₁ᴮ). Si B valora más el bien 1, su demanda sube y el precio relativo también: b = 0.4 lo lleva a 1.',
    pista: 'Más demanda por el bien 1 lo encarece: sube b.',
  },
  {
    id: 'm2-edgeworth-2',
    materia: 'micro2',
    sim: 'edgeworth',
    dificultad: 'Intermedio',
    titulo: 'Más dotación para A',
    enunciado: 'Cambia la dotación ω₁ᴬ para que, en el equilibrio walrasiano, A consuma x₁ᴬ = 7.8.',
    inicial: {},
    controles: ['wA1'],
    objetivos: [{ etiqueta: 'x₁ᴬ de equilibrio', meta: 7.8, medir: (p) => edge(p).xA1, zona: { eje: 'x' } }],
    solucion: { wA1: 10 },
    explicacion:
      'Más bien 1 en la economía abarata ese bien (p baja a 0.67) y aumenta la riqueza de A. Ambos efectos suben su consumo, y con ω₁ᴬ = 10 llega a x₁ᴬ = 7.8.',
    pista: 'Darle más bien 1 a A aumenta su consumo de equilibrio: sube ω₁ᴬ.',
  },
  {
    id: 'm2-edgeworth-3',
    materia: 'micro2',
    sim: 'edgeworth',
    dificultad: 'Avanzado',
    titulo: 'Asignación objetivo',
    enunciado: 'Elige la preferencia de A (a) para que el equilibrio walrasiano le dé exactamente la cesta (x₁ᴬ, x₂ᴬ) = (7, 3).',
    inicial: {},
    controles: ['a'],
    objetivos: [
      { etiqueta: 'x₁ᴬ', meta: 7, medir: (p) => edge(p).xA1, zona: { eje: 'x' } },
      { etiqueta: 'x₂ᴬ', meta: 3, medir: (p) => edge(p).xA2, zona: { eje: 'y' } },
    ],
    solucion: { a: 0.7 },
    explicacion:
      'Con a = 0.7 el precio de equilibrio es 1 y la renta de A vale 10, de la que gasta el 70 % en el bien 1. El equilibrio cae sobre la curva de contrato justo en (7, 3).',
    pista: 'A necesita valorar más el bien 1 que hoy: sube a.',
  },
];

/* ------------------------------------------------------------------ Macro 2 */

const islm = (p: Params) => equilibrioISLM2(escISLM(p as any)[1]);
const mf = (p: Params) => pasosMF(p as any);
const daoa = (p: Params) => {
  const [b, q] = escDAOA(p as any);
  const e0 = cortoPlazo(b);
  const e1 = cortoPlazo(q);
  return { e1, u: desempleo({ P0: e0.P, ustar: n(p, 'ustar'), okun: n(p, 'okun') }, q, e1.Y) };
};
const phillips = (p: Params) => inflacion(escPhillips(p as any)[1], n(p, 'uobj'));
const solow = (p: Params) => estadoEstacionario(escSolow(p as any)[1]);

const SIN_CHOQUE_MF = { choque: 'ninguno', dAp: 0, dG: 0, dM: 0, dIs: 0, dX: 0, dEe: 0 };

const MACRO2: Reto[] = [
  // IS-LM (Y* = 1,200, r* = 4 %)
  {
    id: 'm2-islm-1',
    materia: 'macro2',
    sim: 'is-lm',
    dificultad: 'Básico',
    titulo: 'Estímulo fiscal',
    enunciado: 'La economía está en Y = 1,200. Usa solo ΔG para llevar el producto de equilibrio a Y = 1,320.',
    inicial: {},
    controles: ['dG'],
    objetivos: [{ etiqueta: 'Producto Y', meta: 1320, decimales: 0, medir: (p) => islm(p).Y, zona: { eje: 'x' } }],
    solucion: { dG: 90 },
    explicacion:
      'El multiplicador fiscal con LM creciente es 4/3, menor que el keynesiano de 4, porque la tasa sube y expulsa inversión. Para ganar 120 de producto hacen falta ΔG = 90.',
    pista: 'Cada peso de gasto sube el producto en 1.33, no en 4: hay efecto expulsión.',
  },
  {
    id: 'm2-islm-2',
    materia: 'macro2',
    sim: 'is-lm',
    dificultad: 'Intermedio',
    titulo: 'Salir de la trampa de liquidez',
    enunciado: 'Con M/P = 900 la economía está en la trampa (r = 0, Y = 1,600). Tienes ΔG y Δ(M/P): lleva el producto a Y = 1,760.',
    inicial: { m: 900 },
    controles: ['dG', 'dm'],
    objetivos: [{ etiqueta: 'Producto Y', meta: 1760, decimales: 0, medir: (p) => islm(p).Y, zona: { eje: 'x' } }],
    solucion: { dG: 40, dm: 0 },
    explicacion:
      'En la trampa la LM es plana en r = 0: más dinero no baja la tasa y la política monetaria no mueve el producto. La política fiscal, en cambio, opera con el multiplicador keynesiano completo (4) sin efecto expulsión, así que ΔG = 40 suma 160.',
    pista: 'Mover el dinero no sirve con r = 0; usa el gasto público, que aquí no expulsa inversión.',
  },
  {
    id: 'm2-islm-3',
    materia: 'macro2',
    sim: 'is-lm',
    dificultad: 'Avanzado',
    titulo: 'Mezcla de políticas',
    enunciado: 'Combina ΔG y Δ(M/P) para llegar a Y = 1,400 sin mover la tasa de interés: r = 4 %.',
    inicial: {},
    controles: ['dG', 'dm'],
    objetivos: [
      { etiqueta: 'Producto Y', meta: 1400, decimales: 0, medir: (p) => islm(p).Y, zona: { eje: 'x' } },
      { etiqueta: 'Tasa r (%)', meta: 4, medir: (p) => islm(p).r, zona: { eje: 'y' } },
    ],
    solucion: { dG: 50, dm: 100 },
    explicacion:
      'Con la tasa fija opera el multiplicador keynesiano completo (4), así que ΔG = 50 suma 200 de producto. La política monetaria acomoda la mayor demanda de dinero con Δ(M/P) = k·ΔY = 100, y la LM se mueve junto con la IS.',
    pista: 'Primero calcula el gasto con r fija (multiplicador 4) y luego el dinero que pide ese producto (k = 0.5).',
  },
  // Mundell-Fleming (economía abierta de cinco paneles)
  {
    id: 'm2-mf-1',
    materia: 'macro2',
    sim: 'mundell-fleming',
    dificultad: 'Básico',
    titulo: 'Gasto y tasa de interés',
    enunciado: 'Con tipo de cambio flotante, usa ΔG para que la tasa de interés real de largo plazo suba de 6 % a i = 7 %.',
    inicial: { ...SIN_CHOQUE_MF, regimen: 'flotante' },
    controles: ['dG'],
    objetivos: [{ etiqueta: 'Tasa i de largo plazo (%)', meta: 7, medir: (p) => mf(p).e2.r.i, zona: { eje: 'y' } }],
    solucion: { dG: 50 },
    explicacion:
      'Más gasto público reduce el ahorro nacional y la curva de ahorro se desplaza a la izquierda, lo que sube la tasa de interés. Con estos parámetros cada 50 de gasto la eleva un punto, y entra más capital extranjero.',
    pista: 'La tasa sube un punto por cada 50 de gasto adicional.',
  },
  {
    id: 'm2-mf-2',
    materia: 'macro2',
    sim: 'mundell-fleming',
    dificultad: 'Intermedio',
    titulo: 'Neutralidad del dinero',
    enunciado: 'Con tipo flotante, elige la expansión monetaria ΔM (%) para que el tipo de cambio de largo plazo llegue a E = 1.059.',
    inicial: { ...SIN_CHOQUE_MF, regimen: 'flotante' },
    controles: ['dM'],
    objetivos: [
      { etiqueta: 'E de largo plazo', meta: 1.059, decimales: 3, medir: (p) => mf(p).e2.r.E, zona: { eje: 'y', panel: '2' } },
    ],
    solucion: { dM: 20 },
    explicacion:
      'A largo plazo el dinero es neutral: los precios suben en la misma proporción que M y el tipo de cambio real vuelve a su nivel. Por eso E se deprecia exactamente 20 %, de 0.883 a 1.059.',
    pista: 'En el largo plazo E sube en el mismo porcentaje que la masa monetaria.',
  },
  {
    id: 'm2-mf-3',
    materia: 'macro2',
    sim: 'mundell-fleming',
    dificultad: 'Avanzado',
    titulo: 'Defender la paridad',
    enunciado: 'Con tipo de cambio fijo, elige ΔM (%) de modo que el banco central pierda 40 de reservas internacionales.',
    inicial: { ...SIN_CHOQUE_MF, regimen: 'fijo' },
    controles: ['dM'],
    objetivos: [{ etiqueta: 'Variación de reservas', meta: -40, decimales: 1, medir: (p) => mf(p).e1.r.reservas }],
    solucion: { dM: 10 },
    explicacion:
      'Con paridad fija el crédito nuevo presiona a la baja la tasa y sale capital, así que el banco central vende divisas para sostener E. Cada punto de ΔM se pierde en 4 de reservas: la política monetaria es ineficaz.',
    pista: 'Cada punto de expansión monetaria se escapa como 4 de reservas.',
  },
  // DA-OA con enlace a Phillips (Y = 1,000, P = 100)
  {
    id: 'm2-daoa-1',
    materia: 'macro2',
    sim: 'da-oa',
    dificultad: 'Básico',
    titulo: 'Impulso de demanda',
    enunciado: 'Parte de Y = 1,000. Elige ΔD₀ para que el PIB de corto plazo sea Y = 1,075.',
    inicial: { choque: 'ninguno', dD0: 0, dW: 0, dYp: 0 },
    controles: ['dD0'],
    objetivos: [{ etiqueta: 'PIB de corto plazo Y', meta: 1075, decimales: 0, medir: (p) => daoa(p).e1.Y, zona: { eje: 'x' } }],
    solucion: { dD0: 150 },
    explicacion:
      'La DA se desplaza a la derecha y, como la OACP tiene pendiente, la mitad del impulso se va a precios y la otra mitad al producto. Así ΔY = ΔD₀/2 y hacen falta 150.',
    pista: 'Solo la mitad del desplazamiento de la DA se convierte en producto.',
  },
  {
    id: 'm2-daoa-2',
    materia: 'macro2',
    sim: 'da-oa',
    dificultad: 'Intermedio',
    titulo: 'Frenar la espiral de precios',
    enunciado: 'Un choque petrolero ΔW = +20 ya subió la OACP. Usa la demanda (ΔD₀) para que el nivel de precios no suba: P = 100.',
    inicial: { choque: 'petroleo', dD0: 0, dW: 20, dYp: 0 },
    controles: ['dD0'],
    objetivos: [{ etiqueta: 'Precios de corto plazo P', meta: 100, decimales: 1, medir: (p) => daoa(p).e1.P, zona: { eje: 'y' } }],
    solucion: { dD0: -200 },
    explicacion:
      'Con OACP más alta, el equilibrio es P = (W + D₀/10 − 100)/2, así que contraer la DA en 200 anula el alza de precios. El costo es una recesión (Y = 800): ante un choque de oferta la política de demanda elige entre inflación y producto.',
    pista: 'Para que P no suba hay que contraer la demanda: mueve ΔD₀ a valores negativos.',
  },
  {
    id: 'm2-daoa-3',
    materia: 'macro2',
    sim: 'da-oa',
    dificultad: 'Avanzado',
    titulo: 'Desempleo vía Okun',
    enunciado: 'Con u* = 5 % y Okun ω = 0.3, elige ΔD₀ para que el desempleo de corto plazo baje a u = 3.5 %.',
    inicial: { choque: 'ninguno', dD0: 0, dW: 0, dYp: 0 },
    controles: ['dD0'],
    objetivos: [{ etiqueta: 'Desempleo u (%)', meta: 3.5, medir: (p) => daoa(p).u, zona: { eje: 'x', panel: '2' } }],
    solucion: { dD0: 100 },
    explicacion:
      'Por Okun, u − u* = −0.3·(brecha del producto en %); bajar 1.5 puntos exige una brecha de 5 %, es decir, Y = 1,050. Como ΔY = ΔD₀/2, se necesita ΔD₀ = 100, y en el panel de Phillips la economía sube por la CPCP.',
    pista: 'Cada punto de brecha del producto baja el desempleo 0.3 puntos.',
  },
  // Curva de Phillips (π = 6 − 0.5·(u − 5))
  {
    id: 'm2-phillips-1',
    materia: 'macro2',
    sim: 'phillips',
    dificultad: 'Básico',
    titulo: 'Desinflación',
    enunciado: 'Con πᵉ = 6 % y β = 0.5, elige el desempleo objetivo u para que la inflación baje a π = 3 %.',
    inicial: {},
    controles: ['uobj'],
    objetivos: [{ etiqueta: 'Inflación π (%)', meta: 3, medir: phillips, zona: { eje: 'y' } }],
    solucion: { uobj: 11 },
    explicacion:
      'Sobre la CPCP cada punto de desempleo por encima de u* baja la inflación β = 0.5 puntos. Desinflar 3 puntos exige 6 puntos de desempleo extra: u = 11 %.',
    pista: 'Cada punto de desempleo sobre u* resta medio punto de inflación.',
  },
  {
    id: 'm2-phillips-2',
    materia: 'macro2',
    sim: 'phillips',
    dificultad: 'Intermedio',
    titulo: 'Después del choque petrolero',
    enunciado: 'Un choque de oferta Δv = +2 ya desplazó la CPCP hacia arriba. Elige u para que la inflación sea π = 4 %.',
    inicial: { choque: 'petroleo', dv: 2 },
    controles: ['uobj'],
    objetivos: [{ etiqueta: 'Inflación π (%)', meta: 4, medir: phillips, zona: { eje: 'y' } }],
    solucion: { uobj: 13 },
    explicacion:
      'El choque suma 2 puntos de inflación a cualquier nivel de desempleo, así que contenerla cuesta más desempleo. Para π = 4 % se necesitan 8 puntos sobre u*: u = 13 %.',
    pista: 'Primero suma el choque v a la inflación y luego divide la desinflación entre β.',
  },
  {
    id: 'm2-phillips-3',
    materia: 'macro2',
    sim: 'phillips',
    dificultad: 'Avanzado',
    titulo: 'Pendiente y sacrificio',
    enunciado: 'Con u = 9 % la inflación es 4 %. Ajusta la pendiente β para que, con el mismo desempleo, la inflación sea π = 3 %.',
    inicial: { uobj: 9 },
    controles: ['beta'],
    objetivos: [{ etiqueta: 'Inflación π (%)', meta: 3, medir: phillips, zona: { eje: 'y' } }],
    solucion: { beta: 0.75 },
    explicacion:
      'Con 4 puntos de desempleo sobre u*, la inflación cae 4·β; para pasar de 6 a 3 se necesita β = 0.75. Una CPCP más empinada reduce la razón de sacrificio 1/β de 2 a 1.33.',
    pista: 'Una curva más empinada desinfla más con el mismo desempleo: sube β.',
  },
  // Solow (A = 1, α = 0.5, s = 0.3, n + g + δ = 0.15)
  {
    id: 'm2-solow-1',
    materia: 'macro2',
    sim: 'solow',
    dificultad: 'Básico',
    titulo: 'Regla de oro',
    enunciado: 'Ajusta la tasa de ahorro s para que el capital de estado estacionario k* sea el de la regla de oro (k = 11.11).',
    inicial: {},
    controles: ['s'],
    objetivos: [{ etiqueta: 'Capital k*', meta: 100 / 9, medir: (p) => solow(p).k, zona: { eje: 'x' } }],
    solucion: { s: 0.5 },
    explicacion:
      'La regla de oro maximiza el consumo de estado estacionario y se alcanza cuando s = α, porque entonces el producto marginal del capital iguala n + g + δ. Con α = 0.5, s = 0.5 lleva k* a (0.5/0.15)² = 11.11.',
    pista: 'En Cobb-Douglas la tasa de ahorro de la regla de oro es igual a α.',
  },
  {
    id: 'm2-solow-2',
    materia: 'macro2',
    sim: 'solow',
    dificultad: 'Intermedio',
    titulo: 'Crecimiento de la población',
    enunciado: 'Hoy k* = 4. Cambia la tasa de crecimiento de la población n para que el capital de estado estacionario sea k* = 6.25.',
    inicial: {},
    controles: ['n'],
    objetivos: [{ etiqueta: 'Capital k*', meta: 6.25, medir: (p) => solow(p).k, zona: { eje: 'x' } }],
    solucion: { n: 0.02 },
    explicacion:
      'Con menos crecimiento poblacional la recta de reposición (n + g + δ)·k es más plana y corta a la inversión más a la derecha. Así, k* =(s/(n + 0.1))² = 6.25 exige n + 0.1 = 0.12, es decir, n = 2 %.',
    pista: 'Menos población nueva que equipar significa más capital por trabajador: baja n.',
  },
  {
    id: 'm2-solow-3',
    materia: 'macro2',
    sim: 'solow',
    dificultad: 'Avanzado',
    titulo: 'Salto de productividad',
    enunciado: 'El producto de estado estacionario es y* = 2. Elige el choque de productividad ΔA para que suba a y* = 3.125.',
    inicial: {},
    controles: ['dA'],
    objetivos: [{ etiqueta: 'Producto y*', meta: 3.125, decimales: 3, medir: (p) => solow(p).y, zona: { eje: 'y', panel: '2' } }],
    solucion: { dA: 0.25 },
    explicacion:
      'La productividad sube el producto directamente y además eleva la inversión, que acumula más capital: con α = 0.5, y* = 2·A². Por eso basta A = 1.25 para pasar de 2 a 3.125.',
    pista: 'El efecto de A sobre y* es más que proporcional: con α = 0.5, y* crece con A al cuadrado.',
  },
];

/** Banco completo de retos (tres por modelo). */
export const CHALLENGES: Reto[] = [...MICRO2, ...MACRO2];

export const retosDe = (materia: string, sim: string): Reto[] =>
  CHALLENGES.filter((r) => r.materia === materia && r.sim === sim);

export const tieneRetos = (materia: string, sim: string): boolean => retosDe(materia, sim).length > 0;
