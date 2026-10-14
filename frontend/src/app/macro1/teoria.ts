/**
 * Fichas de teoría de Macro 1 (modal «Teoría»): definición, ecuaciones, variables, exógenas y choques,
 * lectura del equilibrio y un ejercicio que se resuelve sobre la gráfica. Los números del ejercicio
 * se calculan con las mismas funciones del simulador, así que siempre coinciden con la gráfica.
 * Referencia: Blanchard, O. (2017). Macroeconomía, 7.ª ed. Pearson.
 */
import { fmt } from '../core/formato';
import { Params, Teoria } from '../core/tipos';
import { trayectoria } from './modelos/daoa';
import { equilibrioISLM } from './modelos/islm';
import { equilibrioKeynes } from './modelos/keynesiano';
import { equilibrioMF } from './modelos/mundell';
import { escenarios as escDAOA } from './simuladores/da-oa';
import { escenarios as escISLM } from './simuladores/is-lm';
import { escenarios as escMF } from './simuladores/mundell-fleming';
import { AUTOR } from './simuladores/_comun';

const f = (v: number, d = 2): string => fmt(v, d);

const BIENES = {
  c0: 100,
  c1: 0.6,
  T: 100,
  b0: 100,
  b1: 0.1,
  b2: 10,
  G: 200,
};

// ------------------------------------------------------------------ keynesiano
function keynesiano(): Teoria {
  const parametros = {
    c0: 100,
    c1: 0.8,
    t: 0,
    T0: 100,
    I: 200,
    G: 200,
    dG: 100,
    dT: 100,
    dc0: 0,
    dI: 0,
  };
  const base = { c0: 100, c1: 0.8, t: 0, T0: 100, I: 200, G: 200 };
  const r0 = equilibrioKeynes(base);
  const r1 = equilibrioKeynes({ ...base, G: 300, T0: 200 });
  return {
    titulo: 'Modelo Keynesiano (gasto–ingreso)',
    definicion:
      'En el corto plazo, con precios fijos, la producción se ajusta a la demanda: las empresas producen lo que se les compra. ' +
      'El equilibrio es el nivel de producto en el que la producción Y iguala a la demanda agregada Z.',
    conceptos: [
      'Un aumento del gasto autónomo eleva el ingreso, que eleva el consumo, que vuelve a elevar el ingreso: el multiplicador.',
      'Los impuestos proporcionales (t) reducen la pendiente de Z y con ella el multiplicador: son estabilizadores automáticos.',
      'Paradoja del ahorro: si todos intentan ahorrar más, el producto cae y el ahorro total no aumenta.',
    ],
    formulas: [
      'Z = c_0 + c_1\\,(Y - T) + \\bar{I} + G, \\qquad T = T_0 + tY',
      'Y^{*} = \\dfrac{1}{1 - c_1(1-t)}\\,\\big(c_0 - c_1T_0 + \\bar{I} + G\\big)',
      '\\dfrac{\\Delta Y}{\\Delta G} = \\dfrac{1}{1 - c_1(1-t)}, \\qquad \\dfrac{\\Delta Y}{\\Delta T_0} = \\dfrac{-c_1}{1 - c_1(1-t)}',
    ],
    variables: [
      { simbolo: 'Y', significado: 'Producto = ingreso', tipo: 'endógena' },
      { simbolo: 'Z', significado: 'Demanda agregada de bienes', tipo: 'endógena' },
      { simbolo: 'C', significado: 'Consumo de los hogares', tipo: 'endógena' },
      { simbolo: 'c_0', significado: 'Consumo autónomo (confianza)', tipo: 'exógena' },
      { simbolo: 'c_1', significado: 'Propensión marginal a consumir', tipo: 'parámetro' },
      { simbolo: 't,\\;T_0', significado: 'Tasa impositiva e impuesto fijo', tipo: 'exógena' },
      { simbolo: '\\bar{I},\\;G', significado: 'Inversión y gasto público', tipo: 'exógena' },
    ],
    choques: [
      'ΔG: política fiscal por el lado del gasto; desplaza Z en paralelo.',
      'ΔT₀: política tributaria; mueve Z en −c₁·ΔT₀ (menos que ΔG).',
      'Δc₀ y ΔĪ: cambios en la confianza de hogares y empresas.',
      't: cambia la pendiente de Z, no su intercepto.',
    ],
    equilibrio:
      'El equilibrio está donde Z corta la recta de 45°. Si Z está por encima, la demanda supera la producción, ' +
      'los inventarios caen y las empresas producen más hasta llegar a Y*.',
    ejemplo: {
      parametros,
      enunciado:
        'Con c₀ = 100, c₁ = 0.8, t = 0, T₀ = 100, Ī = 200 y G = 200, el gobierno sube el gasto y los impuestos en 100 (presupuesto equilibrado).',
      resultado:
        `El producto inicial es ${f(r0.Y)}; el multiplicador del gasto es ${f(r0.multiplicador, 3)} y el del impuesto ${f(r0.multImpuesto, 3)}. ` +
        `Con ΔG = ΔT₀ = 100 el producto sube a ${f(r1.Y)}: el multiplicador del presupuesto equilibrado es ${f(r0.multEquilibrado, 3)}.`,
      prueba:
        'Pon ΔT₀ en 0: el producto sube 500 (solo gasto). Luego deja ΔG en 0 y ΔT₀ en 100: cae 400.',
    },
    fuente:
      'cap. 3, «El mercado de bienes» (demanda, equilibrio, multiplicador y paradoja del ahorro).',
    autor: AUTOR,
  };
}

// ------------------------------------------------------------------ IS–LM
function islm(p: Params): Teoria {
  const oferta = p['modo'] === 'oferta';
  const parametros = oferta
    ? { ...BIENES, modo: 'oferta', ibar: 5, M: 400, k: 0.5, h: 20, dG: 50, dT: 0, di: 0, dM: 0 }
    : { ...BIENES, modo: 'tasa', ibar: 5, M: 400, k: 0.5, h: 20, dG: 0, dT: 0, di: -1, dM: 0 };
  const [b, n] = escISLM(parametros);
  const r0 = equilibrioISLM(b);
  const r1 = equilibrioISLM(n);
  const comun = {
    variables: [
      { simbolo: 'Y', significado: 'Producto', tipo: 'endógena' as const },
      { simbolo: 'i', significado: 'Tasa de interés nominal (%)', tipo: 'endógena' as const },
      {
        simbolo: 'I',
        significado: 'Inversión: sube con las ventas, baja con i',
        tipo: 'endógena' as const,
      },
      { simbolo: 'G,\\;T', significado: 'Política fiscal', tipo: 'exógena' as const },
      {
        simbolo: oferta ? 'M' : '\\bar{\\imath}',
        significado: oferta ? 'Oferta nominal de dinero' : 'Tasa fijada por el banco central',
        tipo: 'exógena' as const,
      },
      {
        simbolo: 'c_1,\\,b_1,\\,b_2',
        significado: 'Sensibilidades del consumo y la inversión',
        tipo: 'parámetro' as const,
      },
      ...(oferta
        ? [
            {
              simbolo: 'k,\\;h',
              significado: 'Sensibilidad de la demanda de dinero a Y y a i',
              tipo: 'parámetro' as const,
            },
          ]
        : []),
    ],
    choques: [
      'ΔG > 0 o ΔT < 0 (expansión fiscal): la IS se desplaza a la derecha.',
      oferta
        ? 'ΔM > 0 (expansión monetaria): la LM se desplaza hacia abajo y a la derecha.'
        : 'Δī < 0 (expansión monetaria): el banco central baja la tasa y la LM horizontal desciende.',
      'Δc₀ o Δb₀ (confianza): desplazan la IS igual que la política fiscal.',
    ],
    fuente:
      'caps. 4 y 5: mercados financieros y el modelo IS-LM (combinación de políticas y trampa de liquidez).',
    autor: AUTOR,
  };
  if (!oferta)
    return {
      titulo: 'IS–LM · el banco central fija la tasa',
      definicion:
        'El modelo IS-LM describe el equilibrio simultáneo del mercado de bienes y de los mercados financieros. ' +
        'Siguiendo a Blanchard, el banco central elige la tasa de interés y ajusta la cantidad de dinero para sostenerla.',
      conceptos: [
        'La IS tiene pendiente negativa: una tasa más alta reduce la inversión y, por el multiplicador, el producto.',
        'La LM es horizontal en ī: la política monetaria consiste en mover la tasa.',
        'La tasa no puede bajar de 0 %: en el límite inferior cero la política monetaria se agota.',
      ],
      formulas: [
        'IS:\\; Y = c_0 + c_1(Y - T) + b_0 + b_1Y - b_2\\,i + G',
        'Y^{*} = \\dfrac{c_0 - c_1T + b_0 + G - b_2\\,\\bar{\\imath}}{1 - c_1 - b_1}, \\qquad LM:\\; i = \\bar{\\imath}',
      ],
      ...comun,
      equilibrio:
        'El equilibrio está donde la IS corta la LM: a la tasa ī, el producto es el que vacía el mercado de bienes. ' +
        'Una expansión fiscal no cambia i (el banco central la sostiene), así que no hay efecto expulsión.',
      ejemplo: {
        parametros,
        enunciado:
          'Con la calibración de partida (A = 340, c₁ + b₁ = 0.7, b₂ = 10) el banco central baja ī de 5 % a 4 %.',
        resultado: `El producto pasa de ${f(r0.Y)} a ${f(r1.Y)}: cada punto menos de tasa sube Y en b₂/(1 − c₁ − b₁) = ${f(-r0.multMonetario)}.`,
        prueba:
          'Lleva Δī hasta −5: la tasa llega a 0 % y ya no se puede bajar más (límite inferior cero).',
      },
    };
  return {
    titulo: 'IS–LM · oferta monetaria fija',
    definicion:
      'Versión de texto clásica del IS-LM: el banco central fija M y la tasa de interés se determina en el mercado de dinero, ' +
      'donde la demanda de dinero crece con el ingreso y cae con la tasa.',
    conceptos: [
      'La LM tiene pendiente positiva: más producto pide más dinero para transacciones y, con M fija, sube i.',
      'Por eso la expansión fiscal sube i y desplaza parte de la inversión privada (efecto expulsión).',
      'Si la tasa toca 0 % la LM se vuelve plana (trampa de liquidez) y más dinero ya no mueve el producto.',
    ],
    formulas: [
      'IS:\\; Y = \\dfrac{A - b_2\\,i}{1 - c_1 - b_1}, \\qquad LM:\\; \\dfrac{M}{P} = kY - h\\,i',
      'Y^{*} = \\dfrac{A + \\tfrac{b_2}{h}\\tfrac{M}{P}}{1 - c_1 - b_1 + \\tfrac{b_2 k}{h}}',
    ],
    ...comun,
    equilibrio:
      'En el cruce de IS y LM los dos mercados están en equilibrio a la vez. Si h = 0 la LM es vertical y la política fiscal ' +
      'solo cambia la tasa; si h es muy grande la LM se aplana y la política fiscal recupera el multiplicador keynesiano.',
    ejemplo: {
      parametros,
      enunciado: 'Con M = 400, k = 0.5 y h = 20, el gobierno sube el gasto en 50.',
      resultado:
        `El producto pasa de ${f(r0.Y)} a ${f(r1.Y)} y la tasa de ${f(r0.i, 3)} % a ${f(r1.i, 3)} %. ` +
        `El multiplicador fiscal es ${f(r0.multFiscal, 3)}, menor que el keynesiano ${f(r0.multKeynes, 3)}.`,
      prueba:
        'Sube h hasta 100: la LM se aplana, el efecto expulsión se achica y ΔY se acerca a 50/0.3 = 166.67.',
    },
  };
}

// ------------------------------------------------------------------ DA–OA
function daoa(): Teoria {
  const parametros = { ...BIENES, M: 400, k: 0.5, h: 20, Yn: 1000, lam: 1, dM: 100, dG: 0, dYn: 0 };
  const [b, n] = escDAOA(parametros);
  const tr = trayectoria(b, n);
  return {
    titulo: 'Demanda y oferta agregadas',
    definicion:
      'El modelo OA-DA une el IS-LM (demanda) con el mercado de trabajo (oferta) para explicar el producto y el nivel de precios. ' +
      'En el corto plazo los precios esperados están dados; en el mediano plazo se corrigen y el producto vuelve a su nivel natural.',
    conceptos: [
      'La DA tiene pendiente negativa: si P sube, caen los saldos reales M/P, sube i y baja la inversión.',
      'La OA de corto plazo tiene pendiente positiva: producir por encima de Ȳₙ baja el desempleo y presiona salarios y precios.',
      'En el mediano plazo el dinero es neutral: un aumento de M solo sube los precios en la misma proporción.',
    ],
    formulas: [
      'DA:\\; Y = Y\\!\\left(\\tfrac{M}{P},\\,G,\\,T\\right) \\quad\\text{(equilibrio IS-LM)}',
      'OA:\\; P = P^{e}\\left[1 + \\lambda\\,\\dfrac{Y - \\bar{Y}_n}{\\bar{Y}_n}\\right], \\qquad P^{e}_{t+1} = P_t',
    ],
    variables: [
      { simbolo: 'Y,\\;P', significado: 'Producto y nivel de precios', tipo: 'endógena' },
      { simbolo: 'i', significado: 'Tasa de interés', tipo: 'endógena' },
      {
        simbolo: 'P^{e}',
        significado: 'Precio esperado (se corrige cada período)',
        tipo: 'endógena',
      },
      { simbolo: 'M,\\;G,\\;T', significado: 'Políticas monetaria y fiscal', tipo: 'exógena' },
      {
        simbolo: '\\bar{Y}_n',
        significado: 'Producto natural (tecnología, mercado laboral, márgenes)',
        tipo: 'exógena',
      },
      {
        simbolo: '\\lambda',
        significado: 'Respuesta de los precios a la brecha de producto',
        tipo: 'parámetro',
      },
    ],
    choques: [
      'ΔM o ΔG: desplazan la DA. Mueven Y en el corto plazo y solo P (y la composición del gasto) en el mediano.',
      'ΔȲₙ: choque de oferta (p. ej. petróleo más caro sube los márgenes y baja Ȳₙ): menos producto y más precios.',
      'λ: con λ = 0 los precios no se ajustan; con λ grande el ajuste es casi inmediato.',
    ],
    equilibrio:
      'E₀ es el punto de partida en el mediano plazo. Al choque, la economía salta a E₁ sobre la OA de corto plazo; ' +
      'después los precios esperados se corrigen, la OA se desplaza y la economía recorre los puntos dorados hasta E₂, con Y = Ȳₙ.',
    ejemplo: {
      parametros,
      enunciado:
        'La economía está en su mediano plazo con M = 400 y Ȳₙ = 1,000; el banco central sube M a 500.',
      resultado:
        `Al impacto Y sube a ${f(tr.impacto.Y)} y P a ${f(tr.impacto.P, 4)}. En el mediano plazo Y vuelve a ${f(tr.final.Y)} y ` +
        `P pasa de ${f(tr.inicial.P, 4)} a ${f(tr.final.P, 4)}: sube 25 %, igual que M.`,
      prueba:
        'Pon λ en 3: el ajuste se acelera y la trayectoria dorada llega a E₂ en menos períodos.',
    },
    fuente:
      'modelo OA-DA («Todos los mercados juntos»); en la 7.ª ed. el ajuste se estudia con IS-LM-PC (cap. 9).',
    autor: AUTOR,
  };
}

// ------------------------------------------------------------------ Mundell–Fleming
function mundell(p: Params): Teoria {
  const fijo = p['regimen'] === 'fijo';
  const parametros = {
    regimen: fijo ? 'fijo' : 'flexible',
    ...BIENES,
    x0: 60,
    phi: 50,
    q: 0.1,
    k: 0.5,
    h: 20,
    M: 400,
    istar: 5,
    ee: 1,
    ebar: 1,
    dG: 50,
    dM: 0,
    dis: 0,
    debar: 0,
  };
  const [b, n] = escMF(parametros);
  const r0 = equilibrioMF(b);
  const r1 = equilibrioMF(n);
  return {
    titulo: `Mundell–Fleming · cambio ${fijo ? 'fijo' : 'flexible'}`,
    definicion:
      'IS-LM para una economía abierta con movilidad perfecta de capitales: la paridad de intereses liga la tasa interna, ' +
      'la tasa externa y el tipo de cambio, y el tipo de cambio afecta la demanda a través de las exportaciones netas.',
    conceptos: fijo
      ? [
          'Para sostener ē con expectativas creíbles, la tasa interna debe igualar a la externa: i = i*.',
          'La política monetaria pierde autonomía: M se ajusta sola para mantener la paridad.',
          'La política fiscal es muy potente: no sube i ni aprecia la moneda.',
        ]
      : [
          'Una tasa interna más alta atrae capitales y aprecia la moneda (e baja), lo que reduce las exportaciones netas.',
          'La política monetaria actúa por dos vías: tasa de interés e inversión, y tipo de cambio y exportaciones netas.',
          'La política fiscal se debilita: la apreciación desplaza exportaciones netas.',
        ],
    formulas: [
      'IS:\\; Y = C(Y - T) + I(Y, i) + G + XN(Y, e), \\quad XN = x_0 + \\phi\\,e - qY',
      'LM:\\; \\tfrac{M}{P} = kY - h\\,i, \\qquad (1 + i) = (1 + i^{*})\\,\\dfrac{e^{e}}{e}',
    ],
    variables: [
      { simbolo: 'Y,\\;i', significado: 'Producto y tasa de interés interna', tipo: 'endógena' },
      {
        simbolo: 'e',
        significado: fijo
          ? 'Tipo de cambio: lo fija el banco central (ē)'
          : 'Tipo de cambio (pesos por dólar)',
        tipo: fijo ? 'exógena' : 'endógena',
      },
      {
        simbolo: 'M',
        significado: fijo ? 'Dinero: se ajusta para sostener ē' : 'Oferta de dinero',
        tipo: fijo ? 'endógena' : 'exógena',
      },
      { simbolo: 'XN', significado: 'Exportaciones netas', tipo: 'endógena' },
      {
        simbolo: 'i^{*},\\;e^{e}',
        significado: 'Tasa externa y tipo de cambio esperado',
        tipo: 'exógena',
      },
      {
        simbolo: '\\phi,\\;q',
        significado: 'Sensibilidad de XN al tipo de cambio y propensión a importar',
        tipo: 'parámetro',
      },
    ],
    choques: [
      'ΔG: política fiscal; desplaza la IS.',
      fijo
        ? 'Devaluación de ē: abarata las exportaciones y desplaza la IS a la derecha.'
        : 'ΔM: política monetaria; desplaza la LM.',
      'Δi*: una subida de la tasa externa deprecia la moneda (flexible) o obliga a subir i (fijo).',
    ],
    equilibrio:
      'A la izquierda, el cruce IS-LM da Y e i; la IS está dibujada con el tipo de cambio de equilibrio. A la derecha, la ' +
      `paridad de intereses ${fijo ? 'es vertical en ē: la única tasa compatible es i = i*' : 'muestra qué tipo de cambio corresponde a cada tasa interna'}.`,
    ejemplo: {
      parametros,
      enunciado: `Partiendo de Y = 1,000, i = i* = 5 % y e = 1, el gobierno sube el gasto en 50 con cambio ${fijo ? 'fijo' : 'flexible'}.`,
      resultado:
        `El producto pasa de ${f(r0.Y)} a ${f(r1.Y)}, la tasa de ${f(r0.i, 3)} % a ${f(r1.i, 3)} % y e de ${f(r0.e, 4)} a ${f(r1.e, 4)}` +
        (fijo
          ? `; M sube de ${f(r0.M)} a ${f(r1.M)} para sostener la paridad.`
          : '; la apreciación reduce las exportaciones netas.'),
      prueba: fijo
        ? 'Cambia a régimen flexible con el mismo ΔG: el producto sube menos porque la moneda se aprecia.'
        : 'Cambia a régimen fijo con el mismo ΔG: el producto sube más porque el banco central emite para sostener ē.',
    },
    fuente:
      'caps. 19 y 20: la producción, el tipo de interés y el tipo de cambio; regímenes cambiarios.',
    autor: AUTOR,
  };
}

export function teoria(sim: string, p: Params): Teoria | null {
  switch (sim) {
    case 'keynesiano':
      return keynesiano();
    case 'is-lm':
      return islm(p);
    case 'da-oa':
      return daoa();
    case 'mundell-fleming':
      return mundell(p);
    default:
      return null;
  }
}
