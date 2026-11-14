/**
 * Fichas de teoría de Micro 3 (modal «Teoría»): idea clave (máx. 3 viñetas), máx. 2 fórmulas y un ejercicio
 * que se resuelve en la gráfica. Referencias del programa: Lozano y Salamanca (2024), Interacciones
 * estratégicas, y Monsalve (2025), Fallas de mercado. Los textos no están en el proyecto: se citan autor y
 * tema, sin páginas; la notación es la estándar de manual y los ejercicios numéricos son propios.
 */
import { fmt } from '../core/formato';
import { Params, Teoria } from '../core/tipos';
import { monopolio, tercerGrado } from '../micro2/modelos/mercados';
import { JUEGOS, gatillo, induccion, nashMixto } from './modelos/juegos';
import { limones, riesgoMoral, spence } from './modelos/informacion';
import { bertrand, segundoGrado } from './modelos/estrategia';
import { SIM as SIM_INF } from './simuladores/informacion';
import { SIM as SIM_JUE } from './simuladores/juegos';
import { SIM as SIM_MON } from './simuladores/monopolio';
import { SIM as SIM_OLI, parametros as parOli, soluciones } from './simuladores/oligopolio';
import { AUTOR_LOZANO, AUTOR_MONSALVE_FALLAS } from './simuladores/_comun';

const f = (v: number, d = 2): string => fmt(v, d);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const con = (sim: { defecto: Params }, cambios: Params): any => ({ ...sim.defecto, ...cambios });

/* ------------------------------------------------------------------ juegos */
function juegos(p: Params): Teoria {
  const enfoque = p['enfoque'];
  if (enfoque === 'extensiva') {
    const parametros = con(SIM_JUE, { enfoque: 'extensiva', juego: 'coordinacion', ...JUEGOS['coordinacion'].pagos });
    const s = induccion(JUEGOS['coordinacion'].pagos);
    return {
      titulo: 'Juegos en forma extensiva: inducción hacia atrás',
      conceptos: [
        'En un juego secuencial con información perfecta se resuelve desde los nodos finales hacia la raíz: cada jugador anticipa la respuesta óptima de quien mueve después.',
        'El resultado es un equilibrio de Nash perfecto en subjuegos (ENPS): descarta amenazas no creíbles fuera del camino de equilibrio.',
      ],
      formulas: ['s_B^{*}(a) = \\arg\\max_{b}\\; u_B(a, b)', 'a^{*} = \\arg\\max_{a}\\; u_A\\big(a, s_B^{*}(a)\\big)'],
      ejemplo: {
        parametros,
        enunciado: 'Batalla de los sexos secuencial: A elige primero entre A₁ y A₂ y B observa. Pagos (A₁,B₁) = (2, 1), (A₂,B₂) = (1, 2), el resto (0, 0).',
        resultado: `B responde B${s.respuestaB[0] + 1} a A₁ y B${s.respuestaB[1] + 1} a A₂; A juega A${s.jugadaA + 1} y el resultado es (2, 1): mover primero da ventaja.`,
        prueba: 'Sigue las ramas doradas del árbol desde abajo hacia arriba y lee el pago dorado.',
      },
      fuente: 'juegos en forma extensiva, inducción hacia atrás y perfección en subjuegos.',
      autor: AUTOR_LOZANO,
    };
  }
  if (enfoque === 'repetido') {
    const parametros = con(SIM_JUE, { enfoque: 'repetido', juego: 'dilema', ...JUEGOS['dilema'].pagos, delta: 0.6 });
    const r = gatillo(JUEGOS['dilema'].pagos);
    return {
      titulo: 'Juegos repetidos: estrategias gatillo',
      conceptos: [
        'Repetido una sola vez, el dilema del prisionero termina en (Delatar, Delatar). Repetido indefinidamente, la amenaza de castigo puede sostener la cooperación.',
        'Gatillo: cooperar mientras el otro coopere y castigar para siempre tras una desviación. Funciona si el futuro pesa lo suficiente (δ alto).',
      ],
      formulas: ['\\dfrac{R}{1-\\delta} \\ge T + \\dfrac{\\delta P}{1-\\delta}', '\\delta \\ge \\delta^{*} = \\dfrac{T-R}{T-P}'],
      ejemplo: {
        parametros,
        enunciado: 'Dilema del prisionero con T = 5, R = 3, P = 1 y S = 0. ¿Desde qué δ se sostiene la cooperación con gatillo?',
        resultado: `δ* = (5 − 3)/(5 − 1) = ${f(r.delta ?? 0, 3)}. Con δ = 0.6 la cooperación se sostiene.`,
        prueba: 'Lee el rombo dorado δ*: es el cruce de la recta verde (cooperar) con la roja (desviarse). Baja δ por debajo de 0.5 y verás que conviene desviarse.',
      },
      fuente: 'juegos repetidos infinitamente, estrategias gatillo y factor de descuento.',
      autor: AUTOR_LOZANO,
    };
  }
  const parametros = con(SIM_JUE, { enfoque: 'normal', juego: 'coordinacion', ...JUEGOS['coordinacion'].pagos });
  const m = nashMixto(JUEGOS['coordinacion'].pagos)!;
  return {
    titulo: 'Juegos en forma normal: equilibrio de Nash',
    conceptos: [
      'Un perfil de estrategias es un equilibrio de Nash si cada jugador juega una mejor respuesta a lo que hacen los demás.',
      'En estrategias mixtas, la probabilidad de cada jugador hace indiferente al rival entre sus acciones; todo juego finito tiene al menos un equilibrio (Nash).',
    ],
    formulas: ['u_i(s_i^{*}, s_{-i}^{*}) \\ge u_i(s_i, s_{-i}^{*})\\quad \\forall s_i', 'q^{*}a_{11} + (1-q^{*})a_{12} = q^{*}a_{21} + (1-q^{*})a_{22}'],
    ejemplo: {
      parametros,
      enunciado: 'Batalla de los sexos: (A₁,B₁) = (2, 1), (A₂,B₂) = (1, 2) y el resto (0, 0). Halla los equilibrios.',
      resultado: `Dos Nash puros, (A₁, B₁) y (A₂, B₂), y uno mixto con p = ${f(m.p, 3)} y q = ${f(m.q, 3)} (pagos esperados ${f(m.uA, 3)} y ${f(m.uB, 3)}).`,
      prueba: 'Las mejores respuestas se cruzan tres veces: dos esquinas doradas y el punto verde interior.',
    },
    fuente: 'juegos en forma normal: mejores respuestas y equilibrio de Nash en estrategias puras y mixtas.',
    autor: AUTOR_LOZANO,
  };
}

/* ------------------------------------------------------------------ monopolio */
function monopolioT(p: Params): Teoria {
  if (p['enfoque'] === 'discriminacion') {
    if (p['modo'] === 'tercer') {
      const parametros = con(SIM_MON, { enfoque: 'discriminacion', modo: 'tercer', a1: 100, b1: 1, a2: 60, b2: 1, c: 10, F: 50 });
      const r = tercerGrado({ a1: 100, b1: 1, a2: 60, b2: 1, c: 10, F: 50 });
      return {
        titulo: 'Discriminación de precios de tercer grado',
        conceptos: [
          'El monopolista vende a grupos separables a precios distintos e iguala el ingreso marginal de cada mercado al costo marginal.',
          'El grupo con demanda menos elástica paga el precio más alto: pᵢ·(1 − 1/|εᵢ|) = CMg.',
        ],
        formulas: ['IMg_1(y_1) = IMg_2(y_2) = CMg', 'p_i\\left[1 - \\dfrac{1}{|\\varepsilon_i|}\\right] = CMg'],
        ejemplo: {
          parametros,
          enunciado: 'Mercado 1: p₁ = 100 − y₁; mercado 2: p₂ = 60 − y₂; CMg = 10.',
          resultado:
            `y₁ = ${f(r.m1.y)}, p₁ = ${f(r.m1.p)} (|ε₁| = ${f(r.m1.elasticidad, 3)}); y₂ = ${f(r.m2.y)}, p₂ = ${f(r.m2.p)} (|ε₂| = ${f(r.m2.elasticidad, 3)}). ` +
            `Con precio único el beneficio sería ${f(r.beneficioUnico)} en vez de ${f(r.beneficio)}.`,
          prueba: 'Lee pᵢ en cada panel y compáralo con la línea naranja del precio único.',
        },
        fuente: 'discriminación de precios de tercer grado.',
        autor: AUTOR_MONSALVE_FALLAS,
      };
    }
    if (p['modo'] === 'segundo') {
      const parametros = con(SIM_MON, { enfoque: 'discriminacion', modo: 'segundo', a1: 100, b1: 1, a2: 60, b2: 1, c: 10 });
      const r = segundoGrado({ a1: 100, b1: 1, a2: 60, b2: 1, c: 10 });
      return {
        titulo: 'Discriminación de precios de segundo grado',
        conceptos: [
          'El monopolista no distingue a los consumidores, pero ofrece un menú de paquetes (cantidad, pago) y cada tipo se autoselecciona.',
          'Para que el tipo alto no imite al bajo, el paquete bajo se reduce y el alto recibe una renta informativa; el tipo alto obtiene su cantidad eficiente.',
        ],
        formulas: ['2\\,p_2(q_L) - p_1(q_L) = c', 'T_H = \\int_0^{q_H} p_1\\,dq - \\int_0^{q_L} (p_1 - p_2)\\,dq'],
        ejemplo: {
          parametros,
          enunciado: 'Tipo alto: p₁ = 100 − q; tipo bajo: p₂ = 60 − q; CMg = 10; un consumidor de cada tipo.',
          resultado: `q_L = ${f(r.qL)} (eficiente ${f(r.qLef)}), q_H = ${f(r.qH)}; pagos T_L = ${f(r.TL)} y T_H = ${f(r.TH)}; renta informativa ${f(r.renta)}.`,
          prueba: 'Lee q_L y q_H en el eje; el área dorada es la renta que se le deja al tipo alto.',
        },
        fuente: 'discriminación de precios de segundo grado y autoselección.',
        autor: AUTOR_MONSALVE_FALLAS,
      };
    }
    const parametros = con(SIM_MON, { enfoque: 'discriminacion', modo: 'primer', a: 100, b: 2, c: 10, d: 1, F: 50 });
    const r = monopolio({ a: 100, b: 2, c: 10, d: 1, F: 50 });
    return {
      titulo: 'Discriminación de precios de primer grado',
      conceptos: [
        'Con discriminación perfecta cada unidad se vende a su precio de reserva: el monopolista se apropia de todo el excedente.',
        'Produce hasta p = CMg, como en competencia: no hay pérdida irrecuperable, pero el consumidor queda sin excedente.',
      ],
      formulas: ['p(y_1) = CMg(y_1)', '\\pi = \\int_0^{y_1} p(y)\\,dy - C(y_1)'],
      ejemplo: {
        parametros,
        enunciado: 'Demanda p = 100 − 2y; costo C(y) = 50 + 10y + y²/2.',
        resultado: `Vende y = ${f(r.yc)} (frente a ${f(r.y)} con precio único) y la pérdida irrecuperable desaparece (era ${f(r.PIE)}).`,
        prueba: 'Lee la última unidad vendida donde la demanda corta al CMg; todo el triángulo dorado es beneficio.',
      },
      fuente: 'discriminación de precios de primer grado (perfecta).',
      autor: AUTOR_MONSALVE_FALLAS,
    };
  }
  const parametros = con(SIM_MON, { enfoque: 'basico', a: 100, b: 2, c: 10, d: 1, F: 50 });
  const r = monopolio({ a: 100, b: 2, c: 10, d: 1, F: 50 });
  return {
    titulo: 'Monopolio básico: IMg = CMg, Lerner y PIE',
    conceptos: [
      'El monopolista elige y donde IMg = CMg y cobra el precio de la demanda: p > CMg, produce menos que en competencia y genera una pérdida irrecuperable de eficiencia (PIE).',
      'El índice de Lerner (p − CMg)/p = 1/|ε| mide el poder de mercado; el monopolista siempre opera en el tramo elástico (|ε| > 1).',
    ],
    formulas: ["IMg(y) = p(y) + p'(y)\\,y = CMg(y)", 'L = \\dfrac{p - CMg}{p} = \\dfrac{1}{|\\varepsilon|}'],
    ejemplo: {
      parametros,
      enunciado: 'Demanda p = 100 − 2y; costo C(y) = 50 + 10y + y²/2 (CMg = 10 + y).',
      resultado:
        `y* = ${f(r.y)}, p* = ${f(r.p)}, CMg = ${f(r.cmg)}; Lerner = ${f(r.lerner, 3)} = 1/|ε| con |ε| = ${f(r.elasticidad, 3)}. ` +
        `Competencia: y = ${f(r.yc)}, p = ${f(r.pc)}; PIE = ${f(r.PIE)}.`,
      prueba: 'Lee E en los ejes y el triángulo rojo (PIE) entre y* y la producción competitiva.',
    },
    fuente: 'monopolio: maximización del beneficio, poder de mercado y pérdida de eficiencia.',
    autor: AUTOR_MONSALVE_FALLAS,
  };
}

/* ------------------------------------------------------------------ oligopolio */
function oligopolioT(p: Params): Teoria {
  const enfoque = p['enfoque'] === 'stackelberg' || p['enfoque'] === 'bertrand' ? p['enfoque'] : 'cournot';
  const parametros = con(SIM_OLI, { enfoque, a: 120, b: 1, c1: 0, c2: 0 });
  const s = soluciones(parOli(parametros));
  if (enfoque === 'bertrand') {
    const asim = bertrand({ a: 120, b: 1, c1: 10, c2: 30 });
    return {
      titulo: 'Bertrand y colusión',
      conceptos: [
        'En Bertrand las empresas compiten en precios con un bien homogéneo: quien cobre menos se lleva el mercado, así que con costos iguales p = CMg (paradoja de Bertrand).',
        'El cártel maximiza el beneficio conjunto (precio de monopolio), pero cada empresa gana bajando un poco su precio: la colusión no es un equilibrio del juego de una sola vez.',
      ],
      formulas: ['p_1 = p_2 = c', 'p^{cártel} = \\dfrac{a + c}{2}'],
      ejemplo: {
        parametros,
        enunciado: 'Demanda p = 120 − Y y costos marginales nulos. Compara Bertrand con el cártel; luego toma c₁ = 10 y c₂ = 30.',
        resultado: `Bertrand: p = ${f(s.bertrand.p)} y beneficio cero; cártel: p = ${f(s.colusion.p)}, Y = ${f(s.colusion.Y)}. Con c₁ = 10 y c₂ = 30, la empresa 1 cobra ${f(asim.p)} y atiende todo el mercado.`,
        prueba: 'En el panel A el equilibrio está en el cruce de las mejores respuestas; la flecha morada muestra el incentivo a romper el cártel.',
      },
      fuente: 'competencia en precios (Bertrand), colusión y cártel.',
      autor: AUTOR_MONSALVE_FALLAS,
    };
  }
  if (enfoque === 'stackelberg')
    return {
      titulo: 'Stackelberg: líder y seguidora',
      conceptos: [
        'El líder elige primero sabiendo que la seguidora responderá con f₂(y₁): maximiza sobre esa curva (inducción hacia atrás).',
        'El líder produce más y gana más que en Cournot; la seguidora produce y gana menos.',
      ],
      formulas: ['\\max_{y_1}\\; p\\big(y_1 + f_2(y_1)\\big)\\,y_1 - c_1 y_1', 'y_1^{S} = \\dfrac{a - 2c_1 + c_2}{2b}'],
      ejemplo: {
        parametros,
        enunciado: 'Demanda p = 120 − (y₁ + y₂) y costos marginales nulos; la empresa 1 lidera.',
        resultado: `y₁ = ${f(s.stackelberg.y1)}, y₂ = ${f(s.stackelberg.y2)}, p = ${f(s.stackelberg.p)}; π₁ sube de ${f(s.cournot.pi1)} (Cournot) a ${f(s.stackelberg.pi1)}.`,
        prueba: 'El isobeneficio del líder es tangente a f₂ en el punto de Stackelberg (cuadrado naranja).',
      },
      fuente: 'liderazgo en cantidades (Stackelberg).',
      autor: AUTOR_MONSALVE_FALLAS,
    };
  return {
    titulo: 'Cournot: curvas de reacción',
    conceptos: [
      'Cada empresa elige su producción como mejor respuesta a la de la otra; el cruce de las funciones de reacción es el equilibrio de Nash.',
      'Con n empresas iguales, yᵢ = (a − c)/(b(n + 1)): al crecer n el precio converge al costo marginal.',
    ],
    formulas: ['f_1(y_2) = \\dfrac{a - c_1 - b\\,y_2}{2b}', 'p^{*} = \\dfrac{a + n\\,c}{n + 1}'],
    ejemplo: {
      parametros,
      enunciado: 'Demanda p = 120 − (y₁ + y₂) y costos marginales nulos.',
      resultado: `y₁ = y₂ = ${f(s.cournot.y1)}, p = ${f(s.cournot.p)}, π = ${f(s.cournot.pi1)} cada una (colusión: p = ${f(s.colusion.p)}).`,
      prueba: 'Lee el cruce de f₁ y f₂ en el panel A y el precio en el panel B; sube n en «Cournot con n empresas» y mira la tabla.',
    },
    fuente: 'oligopolio de Cournot: funciones de reacción y equilibrio de Nash.',
    autor: AUTOR_MONSALVE_FALLAS,
  };
}

/* ------------------------------------------------------------------ información asimétrica */
function informacionT(p: Params): Teoria {
  if (p['enfoque'] === 'senalizacion' && p['tema'] === 'riesgo') {
    const parametros = con(SIM_INF, { enfoque: 'senalizacion', tema: 'riesgo', piA: 0.8, piB: 0.4, psi: 10, b: 20 });
    const r = riesgoMoral({ piA: 0.8, piB: 0.4, psi: 10, b: 20 });
    return {
      titulo: 'Riesgo moral: contratos de incentivos',
      conceptos: [
        'Después de firmar, el principal no observa el esfuerzo del agente: solo puede pagar según el resultado.',
        'El agente se esfuerza si el bono compensa el costo: (π_A − π_B)·b ≥ ψ (restricción de incentivos).',
      ],
      formulas: ['\\pi_A b - \\psi \\ge \\pi_B b', 'b^{*} = \\dfrac{\\psi}{\\pi_A - \\pi_B}'],
      ejemplo: {
        parametros,
        enunciado: 'π_A = 0.8, π_B = 0.4 y ψ = 10. ¿Qué bono mínimo induce el esfuerzo?',
        resultado: `b* = 10/0.4 = ${f(r.bMin)}; con b = 20 el agente ${r.esfuerza ? 'se esfuerza' : 'no se esfuerza'}.`,
        prueba: 'El rombo dorado b* es el cruce de las dos rectas; mueve el bono por debajo de 25 y verás que el agente deja de esforzarse.',
      },
      fuente: 'riesgo moral (cap. «La información asimétrica»); Monsalve (2025), fallas de mercado por información.',
      autor: 'Varian, Microeconomía intermedia; Monsalve, Fallas de mercado (2025)',
    };
  }
  if (p['enfoque'] === 'senalizacion') {
    const parametros = con(SIM_INF, { enfoque: 'senalizacion', tema: 'spence', tB: 2, tA: 4, e: 5 });
    const r = spence({ tB: 2, tA: 4, e: 5 });
    return {
      titulo: 'Señalización: modelo de Spence',
      conceptos: [
        'La educación es más barata para el trabajador más productivo (costo e/θ); por eso puede servir de señal aunque no aumente la productividad.',
        'Hay equilibrio separador si al tipo bajo no le compensa imitar y al alto sí: θ_B(θ_A − θ_B) ≤ e ≤ θ_A(θ_A − θ_B).',
      ],
      formulas: ['\\theta_A - \\dfrac{e}{\\theta_B} \\le \\theta_B', '\\theta_A - \\dfrac{e}{\\theta_A} \\ge \\theta_B'],
      ejemplo: {
        parametros,
        enunciado: 'θ_B = 2, θ_A = 4 y el mercado exige e = 5 para pagar θ_A.',
        resultado: `Separa si e ∈ [${f(r.eMin)}, ${f(r.eMax)}]: con e = 5 sí separa; el tipo bajo obtendría ${f(r.uBimita)} imitando, menos que ${f(r.uB)}.`,
        prueba: 'La franja verde marca las exigencias que separan; lleva e por debajo de 4 y verás que el tipo bajo imita.',
      },
      fuente: 'señalización en el mercado de trabajo (Spence).',
      autor: AUTOR_MONSALVE_FALLAS,
    };
  }
  const parametros = con(SIM_INF, { enfoque: 'seleccion', k: 1.5, tmin: 20, tmax: 100 });
  const r = limones({ k: 1.5, tmin: 20, tmax: 100 });
  return {
    titulo: 'Selección adversa: el mercado de limones',
    conceptos: [
      'El comprador no observa la calidad θ y paga según la calidad media de lo que se ofrece; a precio p solo venden quienes tienen θ ≤ p.',
      'Los autos buenos salen del mercado aunque haya ganancias del intercambio (k > 1): la asimetría destruye transacciones eficientes.',
    ],
    formulas: ['p = k\\,\\mathbb{E}[\\theta \\mid \\theta \\le p] = k\\,\\dfrac{\\theta_{\\min} + p}{2}', 'p^{*} = \\dfrac{k\\,\\theta_{\\min}}{2 - k}\\quad (k < 2)'],
    ejemplo: {
      parametros,
      enunciado: 'Calidad uniforme en [20, 100]; los compradores valoran 1.5 veces lo que valoran los vendedores.',
      resultado: `p* = 1.5 × 20/0.5 = ${f(r.p)}: solo se vende el ${f(r.fraccion * 100, 1)} % de los autos, con calidad media ${f(r.calidadMedia)}.`,
      prueba: 'Lee p* en el cruce de la disposición a pagar con la recta de 45°. Lleva θ_min a 0 y el mercado colapsa.',
    },
    fuente: 'selección adversa: el mercado de limones (Akerlof).',
    autor: AUTOR_MONSALVE_FALLAS,
  };
}

export function teoria(sim: string, p: Params): Teoria | null {
  switch (sim) {
    case 'juegos':
      return juegos(p);
    case 'monopolio':
      return monopolioT(p);
    case 'oligopolio':
      return oligopolioT(p);
    case 'informacion':
      return informacionT(p);
    default:
      return null;
  }
}
