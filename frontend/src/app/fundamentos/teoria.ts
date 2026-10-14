/**
 * Fichas de teoría de Fundamentos (modal «Teoría»): definición, ecuaciones, variables, exógenas y
 * choques, lectura del equilibrio y un ejercicio que se resuelve sobre la gráfica. Los números de
 * cada ejercicio se calculan con las mismas funciones del simulador, así que siempre coinciden con
 * lo que se ve. Referencia: Mankiw, N. G. Principios de Economía (6.ª ed.), cap. 2–10.
 */
import { fmt } from '../core/formato';
import { Params, Teoria } from '../core/tipos';
import { comercio } from './modelos/comercio';
import { precioMaximo, precioMinimo } from './modelos/controles';
import { clasificar, elasticidadDemanda, ingresoTotal, puntoMedio } from './modelos/elasticidad';
import { bienestar, excedenteCompradores } from './modelos/excedentes';
import { externalidad } from './modelos/externalidades';
import { FPP } from './modelos/fpp';
import { aplicarImpuesto, impuestoRecaudoMaximo } from './modelos/impuestos';
import { Demanda, Oferta, equilibrio } from './modelos/mercado';
import { Productor, comerciar, rangoPrecio } from './modelos/ventaja';
import { DEF as DEF_CP } from './simuladores/controles-precios';
import { DEF as DEF_CI } from './simuladores/comercio-internacional';
import { DEF as DEF_EL } from './simuladores/elasticidades';
import { DEF as DEF_EX } from './simuladores/excedentes';
import { DEF as DEF_EXT } from './simuladores/externalidades';
import { DEF as DEF_FPP } from './simuladores/fpp';
import { DEF as DEF_IM } from './simuladores/impuestos';
import { DEF as DEF_OD } from './simuladores/oferta-demanda';
import { DEF as DEF_VC } from './simuladores/ventaja-comparativa';
import { AUTOR } from './simuladores/_ui';

const f = (v: number, d = 2): string => fmt(v, d);

// ------------------------------------------------------------------ FPP
function fpp(): Teoria {
  const frontera = new FPP(DEF_FPP.X, DEF_FPP.Y, DEF_FPP.k);
  const yEf = frontera.yDeX(DEF_FPP.x);
  const co = frontera.costoOportunidad(DEF_FPP.x);
  const crece = frontera.desplazar(1.2, 1, 1);
  return {
    titulo: 'Frontera de posibilidades de producción',
    definicion:
      'La frontera de posibilidades de producción (FPP) es el conjunto de combinaciones máximas de dos bienes que una economía puede ' +
      'producir con sus recursos y su tecnología, usando todos sus recursos.',
    conceptos: [
      'Los puntos sobre la frontera son eficientes, los de adentro desperdician recursos y los de afuera son inalcanzables.',
      'La pendiente es el costo de oportunidad: cuando la frontera es cóncava (k > 1), cada unidad extra del bien 1 cuesta más unidades del bien 2.',
      'Más recursos desplazan toda la frontera; un avance tecnológico en un solo sector la rota sobre el eje de ese bien.',
    ],
    formulas: [
      '\\left(\\dfrac{x}{X}\\right)^{k} + \\left(\\dfrac{y}{Y}\\right)^{k} = 1',
      'CO(x) = -\\dfrac{dy}{dx} = \\dfrac{Y}{X}\\,r^{k-1}\\,(1-r^{k})^{\\frac{1}{k}-1}, \\quad r = \\dfrac{x}{X}',
    ],
    variables: [
      {
        simbolo: 'x,\\;y',
        significado: 'Cantidades producidas del bien 1 y del bien 2',
        tipo: 'endógena',
      },
      {
        simbolo: 'CO',
        significado: 'Costo de oportunidad del bien 1 en unidades del bien 2',
        tipo: 'endógena',
      },
      {
        simbolo: 'X,\\;Y',
        significado: 'Máximo producible de cada bien con todos los recursos',
        tipo: 'exógena',
      },
      {
        simbolo: 'k',
        significado: 'Curvatura: 1 es una recta (costo constante); mayor que 1, costo creciente',
        tipo: 'parámetro',
      },
    ],
    choques: [
      'Más recursos (trabajo, capital): la frontera se desplaza hacia afuera en ambos ejes.',
      'Avance tecnológico en el bien 1: aumenta X y deja Y igual, la frontera rota.',
      'Avance tecnológico en el bien 2: aumenta Y y deja X igual.',
    ],
    equilibrio:
      'No hay un equilibrio de mercado: se interpreta el punto elegido. Sobre la curva la economía es eficiente; dentro hay desempleo ' +
      'o recursos mal usados; fuera, ese plan no se puede producir. La tabla muestra el costo de oportunidad en ese punto.',
    ejemplo: {
      parametros: { ...DEF_FPP },
      enunciado: `Una economía con máximos de ${f(DEF_FPP.X, 0)} computadoras y ${f(DEF_FPP.Y, 0)} automóviles, curvatura k = ${DEF_FPP.k}, produce ${f(DEF_FPP.x, 0)} computadoras y ${f(DEF_FPP.y, 0)} automóviles.`,
      resultado:
        `Con ${f(DEF_FPP.x, 0)} computadoras podría producir hasta ${f(yEf, 0)} automóviles: el punto es ${frontera.clasificar(DEF_FPP.x, DEF_FPP.y)}. ` +
        `El costo de oportunidad de una computadora ahí es ${f(co, 3)} automóviles.`,
      prueba:
        `Sube «Bien 2» hasta ${f(yEf, 0)}: el punto pasa a eficiente. Si sigues subiendo se vuelve inalcanzable. ` +
        `Con recursos = 1.2 el máximo de computadoras sube a ${f(crece.X, 0)}.`,
    },
    fuente: 'cap. 2, «Pensar como un economista» (la frontera de posibilidades de producción).',
    autor: AUTOR,
  };
}

// ------------------------------------------------------------------ Ventaja comparativa
function ventaja(): Teoria {
  const g = new Productor('Ganadero', DEF_VC.horas, DEF_VC.g_carne, DEF_VC.g_papas);
  const c = new Productor('Campesino', DEF_VC.horas, DEF_VC.c_carne, DEF_VC.c_papas);
  const r = comerciar(
    g,
    c,
    DEF_VC.fraccion_g,
    DEF_VC.fraccion_c,
    0.5,
    0.5,
    DEF_VC.carne_intercambiada,
    DEF_VC.precio,
  );
  const [lo, hi] = rangoPrecio(g, c);
  return {
    titulo: 'Ventaja comparativa y ganancias del comercio',
    definicion:
      'Un productor tiene ventaja absoluta si produce un bien con menos recursos que otro, y ventaja comparativa si su costo de ' +
      'oportunidad de producirlo es menor. El comercio beneficia a todos cuando cada uno se especializa donde tiene ventaja comparativa.',
    conceptos: [
      'La ventaja comparativa depende del costo de oportunidad, no de la productividad absoluta: uno puede ser mejor en todo y aun así comerciar.',
      'Si cada uno se especializa y comercian a un precio entre sus dos costos de oportunidad, ambos consumen fuera de su propia frontera.',
      'Fuera de ese rango de precios, uno de los dos pierde y el intercambio no ocurriría voluntariamente.',
    ],
    formulas: [
      'CO^{i}_{\\text{carne}} = \\dfrac{\\text{minutos por kg de carne}_i}{\\text{minutos por kg de papas}_i}',
      'CO^{A}_{\\text{carne}} < P < CO^{B}_{\\text{carne}}',
    ],
    variables: [
      {
        simbolo: 'CO',
        significado: 'Costo de oportunidad de 1 kg de carne, en kg de papas',
        tipo: 'endógena',
      },
      {
        simbolo: 'P',
        significado: 'Precio de intercambio: kg de papas por kg de carne',
        tipo: 'exógena',
      },
      { simbolo: 'q', significado: 'Carne que el ganadero entrega al campesino', tipo: 'exógena' },
      {
        simbolo: 'h,\\;m_{ij}',
        significado: 'Horas de trabajo y minutos que cada productor necesita por kg',
        tipo: 'parámetro',
      },
    ],
    choques: [
      'Cambiar los minutos por kg de un productor (tecnología) altera su costo de oportunidad y su ventaja.',
      'Cambiar el precio de intercambio mueve cómo se reparten las ganancias; fuera del rango deja a uno peor que sin comerciar.',
      'Cambiar la fracción de tiempo dedicada a cada bien mueve la producción a lo largo de cada frontera lineal.',
    ],
    equilibrio:
      'Cada panel es la frontera de un productor. El punto A es su consumo sin comercio, el cuadrado su producción y la estrella (C) su ' +
      'consumo con comercio. Si C queda fuera de la frontera (arriba y a la derecha de A), hay ganancias del comercio.',
    ejemplo: {
      parametros: { ...DEF_VC },
      enunciado:
        'El ganadero tarda 20 minutos por kg de carne y 10 por kg de papas; el campesino, 60 y 15. Trabajan 8 horas. El ganadero dedica 75 % de su tiempo a la carne, el campesino todo a las papas, y intercambian 5 kg de carne a 3 kg de papas por kg.',
      resultado:
        `Los costos de oportunidad de la carne son ${f(g.costoBien1)} y ${f(c.costoBien1)} kg de papas: el precio debe estar entre ${f(lo)} y ${f(hi)}. ` +
        `El ganadero consume ${f(r.consumoA[0])} kg de carne y ${f(r.consumoA[1])} de papas (gana ${f(r.gananciaA[0])} y ${f(r.gananciaA[1])}); ` +
        `el campesino consume ${f(r.consumoB[0])} y ${f(r.consumoB[1])} (gana ${f(r.gananciaB[0])} y ${f(r.gananciaB[1])}).`,
      prueba:
        'Sube el precio por encima de 4: el campesino queda peor que sin comerciar y aparece el aviso de precio fuera del rango.',
    },
    fuente:
      'cap. 3, «Interdependencia y ganancias derivadas del comercio» (el ganadero y el campesino).',
    autor: AUTOR,
  };
}

// ------------------------------------------------------------------ Oferta y demanda
function ofertaDemanda(): Teoria {
  const D = new Demanda(DEF_OD.a, DEF_OD.b);
  const S = new Oferta(DEF_OD.c, DEF_OD.d);
  const e0 = equilibrio(D, S);
  const e1 = equilibrio(D.desplazar(20), S);
  return {
    titulo: 'Oferta y demanda: equilibrio y desplazamientos',
    definicion:
      'En un mercado competitivo el precio se ajusta hasta que la cantidad que los compradores quieren comprar iguala la que los ' +
      'vendedores quieren vender. Ese precio y esa cantidad son el equilibrio.',
    conceptos: [
      'Un cambio en el precio es un movimiento a lo largo de la curva; un cambio en cualquier otro determinante desplaza la curva.',
      'Análisis en tres pasos: ¿qué curva se mueve?, ¿hacia dónde?, ¿cómo cambian el precio y la cantidad de equilibrio?',
      'Si se mueven las dos curvas, un efecto (cantidad o precio) queda determinado y el otro es ambiguo.',
    ],
    formulas: [
      'Q^{d} = a - bP, \\qquad Q^{s} = c + dP',
      'P^{*} = \\dfrac{a-c}{b+d}, \\qquad Q^{*} = \\dfrac{ad + bc}{b+d}',
    ],
    variables: [
      {
        simbolo: 'P^{*},\\;Q^{*}',
        significado: 'Precio y cantidad de equilibrio',
        tipo: 'endógena',
      },
      {
        simbolo: 'a,\\;c',
        significado:
          'Interceptos: cantidad demandada y ofrecida si P = 0 (se desplazan con los determinantes)',
        tipo: 'exógena',
      },
      {
        simbolo: 'b,\\;d',
        significado: 'Pendientes: sensibilidad de la cantidad al precio',
        tipo: 'parámetro',
      },
    ],
    choques: [
      'Demanda: ingreso (bien normal o inferior), precio de sustitutos o complementos, gustos, expectativas y número de compradores.',
      'Oferta: precio de los insumos, tecnología, expectativas y número de vendedores.',
      'Una curva perfectamente elástica fija el precio; una perfectamente inelástica fija la cantidad.',
    ],
    equilibrio:
      'El equilibrio E está donde se cruzan oferta y demanda. A un precio mayor hay excedente (se ofrece más de lo que se demanda) y ' +
      'el precio baja; a uno menor hay escasez y el precio sube. Tras el desplazamiento, E₁ es el nuevo equilibrio.',
    ejemplo: {
      parametros: { ...DEF_OD, evento_d: 'ingreso_normal', cambio_d: 20 },
      enunciado:
        'Con Qd = 100 − 2P y Qs = 10 + 3P, aumenta el ingreso de los consumidores de un bien normal y la demanda se desplaza 20 unidades a la derecha.',
      resultado:
        `El equilibrio pasa de P = ${f(e0.p)}, Q = ${f(e0.q)} a P = ${f(e1.p)}, Q = ${f(e1.q)}: suben el precio y la cantidad. ` +
        `Al precio anterior habría escasez de ${f(D.desplazar(20).cantidad(e0.p) - S.cantidad(e0.p))} unidades.`,
      prueba:
        'Cambia el determinante a «Ingreso (bien inferior)»: la demanda se desplaza a la izquierda y precio y cantidad bajan.',
    },
    fuente: 'cap. 4, «Las fuerzas del mercado: la oferta y la demanda».',
    autor: AUTOR,
  };
}

// ------------------------------------------------------------------ Elasticidades
function elasticidades(): Teoria {
  const D = new Demanda(DEF_EL.a, DEF_EL.b);
  const p1 = DEF_EL.precio;
  const p2 = p1 + DEF_EL.delta;
  const e1 = elasticidadDemanda(D, p1);
  const ePm = puntoMedio(D.cantidad(p1), p1, D.cantidad(p2), p2);
  return {
    titulo: 'Elasticidad precio e ingreso total',
    definicion:
      'La elasticidad precio de la demanda mide cuánto cambia la cantidad demandada cuando cambia el precio, en porcentajes. ' +
      'Se calcula por el método del punto medio para que no dependa del sentido del cambio.',
    conceptos: [
      'Demanda elástica (ε > 1): la cantidad reacciona más que el precio; inelástica (ε < 1): reacciona menos.',
      'En una demanda lineal la pendiente es constante pero la elasticidad no: es alta con precios altos y baja con precios bajos.',
      'Si la demanda es inelástica, subir el precio aumenta el ingreso total; si es elástica, lo reduce. El ingreso es máximo donde ε = 1.',
    ],
    formulas: [
      '\\varepsilon = \\dfrac{(Q_2-Q_1)/[(Q_2+Q_1)/2]}{(P_2-P_1)/[(P_2+P_1)/2]}',
      'IT = P\\times Q, \\qquad \\varepsilon_{\\text{puntual}} = \\dfrac{bP}{Q}, \\qquad P_{IT\\max} = \\dfrac{a}{2b}',
    ],
    variables: [
      {
        simbolo: '\\varepsilon',
        significado: 'Elasticidad precio de la demanda (valor absoluto)',
        tipo: 'endógena',
      },
      {
        simbolo: 'Q,\\;IT',
        significado: 'Cantidad demandada e ingreso total del vendedor',
        tipo: 'endógena',
      },
      {
        simbolo: 'P_1,\\;\\Delta P',
        significado: 'Precio de partida y cambio de precio',
        tipo: 'exógena',
      },
      {
        simbolo: 'a,\\;b',
        significado: 'Intercepto y pendiente de la demanda Q = a − bP',
        tipo: 'parámetro',
      },
    ],
    choques: [
      'Mover P₁ recorre la curva de demanda: cambia el tramo (elástico o inelástico) y el ingreso total.',
      'ΔP define el segundo punto para la elasticidad por punto medio y el cambio en el ingreso.',
      'Una demanda vertical (ε = 0) o una horizontal (ε = ∞) son los casos extremos.',
    ],
    equilibrio:
      'No hay equilibrio de mercado: la gráfica izquierda muestra el punto elegido y el rectángulo de ingreso P×Q; la derecha, el ingreso ' +
      'según el precio, con su máximo donde la elasticidad es unitaria.',
    ejemplo: {
      parametros: { ...DEF_EL },
      enunciado: `Demanda Q = ${DEF_EL.a} − ${DEF_EL.b}P. El precio sube de ${f(p1)} a ${f(p2)}.`,
      resultado:
        `En P = ${f(p1)} la elasticidad puntual es ${f(e1, 3)} (${clasificar(e1)}). Entre ${f(p1)} y ${f(p2)}, por punto medio, ε = ${f(ePm, 3)} ` +
        `(elasticidad unitaria) y el ingreso total pasa de ${f(ingresoTotal(D, p1))} a ${f(ingresoTotal(D, p2))}: no cambia.`,
      prueba:
        'Baja P₁ a 1 y sube ΔP a 1: ahora la demanda es inelástica y el ingreso total sube. Con P₁ = 5, el ingreso baja.',
    },
    fuente: 'cap. 5, «La elasticidad y su aplicación» (punto medio, ingreso total, figura 4).',
    autor: AUTOR,
  };
}

// ------------------------------------------------------------------ Excedentes
function excedentes(): Teoria {
  const D = new Demanda(DEF_EX.a, DEF_EX.b);
  const S = new Oferta(DEF_EX.c, DEF_EX.d);
  const eq = equilibrio(D, S);
  const w = bienestar(D, S, eq);
  const ec70 = excedenteCompradores(
    [
      ['John', 100],
      ['Paul', 80],
      ['George', 70],
      ['Ringo', 50],
    ],
    70,
  );
  return {
    titulo: 'Excedente del consumidor y del productor',
    definicion:
      'El excedente del consumidor es la diferencia entre lo que los compradores están dispuestos a pagar y lo que pagan. ' +
      'El del productor es la diferencia entre lo que reciben los vendedores y su costo. Su suma mide el bienestar del mercado.',
    conceptos: [
      'La demanda refleja la disposición a pagar y la oferta el costo de los vendedores: sus áreas respecto al precio son los excedentes.',
      'En el equilibrio competitivo el excedente total es máximo: el mercado asigna el bien a quien más lo valora y lo produce quien menos cuesta.',
      'El modo escalonado reproduce las tablas del libro con cuatro compradores y cuatro vendedores.',
    ],
    formulas: [
      'EC = \\int_0^{Q} \\left[P^{d}(q) - P\\right]dq, \\qquad EP = \\int_0^{Q} \\left[P - P^{s}(q)\\right]dq',
      'ET = EC + EP',
    ],
    variables: [
      {
        simbolo: 'P^{*},\\;Q^{*}',
        significado: 'Precio y cantidad de equilibrio',
        tipo: 'endógena',
      },
      {
        simbolo: 'EC,\\;EP,\\;ET',
        significado: 'Excedente del consumidor, del productor y total',
        tipo: 'endógena',
      },
      { simbolo: 'a,\\;c', significado: 'Interceptos de demanda y oferta', tipo: 'exógena' },
      { simbolo: 'b,\\;d', significado: 'Pendientes de demanda y oferta', tipo: 'parámetro' },
    ],
    choques: [
      'Un desplazamiento de la demanda (a) cambia sobre todo el excedente del consumidor.',
      'Un desplazamiento de la oferta (c) cambia sobre todo el excedente del productor.',
      'Una demanda perfectamente inelástica deja el excedente del consumidor sin techo (infinito).',
    ],
    equilibrio:
      'El área azul entre la demanda y el precio es el excedente del consumidor; el área naranja entre el precio y la oferta es el del ' +
      'productor. Producir más o menos que Q* reduce el total: por eso el equilibrio es eficiente.',
    ejemplo: {
      parametros: { ...DEF_EX, modo: 'compradores', precio_escalonado: 70 },
      enunciado:
        'Cuatro compradores valoran un bien en 100 (John), 80 (Paul), 70 (George) y 50 (Ringo). El precio es 70.',
      resultado:
        `Compran John, Paul y George (George queda indiferente): el excedente del consumidor es 30 + 10 + 0 = ${f(ec70, 0)}. ` +
        `Con las curvas lineales por defecto, el excedente del consumidor es ${f(w.ec)}, el del productor ${f(w.ep)} y el total ${f(w.total)}.`,
      prueba:
        'Baja el precio a 50: Ringo también compra y el excedente sube a 100. Sube el precio a 90: solo compra John.',
    },
    fuente:
      'cap. 7, «Los consumidores, los productores y la eficiencia de los mercados» (tablas 1 y 2).',
    autor: AUTOR,
  };
}

// ------------------------------------------------------------------ Controles de precios
function controles(p: Params): Teoria {
  const minimo = p['tipo'] === 'minimo';
  const D = new Demanda(DEF_CP.a, DEF_CP.b);
  const S = new Oferta(DEF_CP.c, DEF_CP.d);
  const control = minimo ? 26 : DEF_CP.precio_control;
  const r = (minimo ? precioMinimo : precioMaximo)(D, S, control);
  return {
    titulo: `Controles de precios · precio ${minimo ? 'mínimo' : 'máximo'}`,
    definicion:
      'Un control de precios es un límite legal al precio. Un precio máximo (techo) prohíbe cobrar más; un precio mínimo (piso) ' +
      'prohíbe cobrar menos. El salario mínimo es un precio mínimo en el mercado de trabajo.',
    conceptos: [
      'Un control solo es obligatorio si cambia el equilibrio: el techo debe estar por debajo de P* y el piso por encima.',
      'Un techo obligatorio genera escasez (se demanda más de lo que se ofrece); un piso obligatorio genera excedente, y en el mercado laboral, desempleo.',
      'Ambos reducen la cantidad transada y producen una pérdida de peso muerto (se supone racionamiento eficiente).',
    ],
    formulas: [
      'P_{\\max} < P^{*} \\;\\Rightarrow\\; Q = Q^{s}(P_{\\max}) < Q^{d}(P_{\\max})',
      'P_{\\min} > P^{*} \\;\\Rightarrow\\; Q = Q^{d}(P_{\\min}) < Q^{s}(P_{\\min})',
    ],
    variables: [
      {
        simbolo: 'Q',
        significado: 'Cantidad transada bajo el control (la menor de las dos)',
        tipo: 'endógena',
      },
      {
        simbolo: 'Q^{d} - Q^{s}',
        significado: 'Escasez (techo) o excedente de oferta (piso)',
        tipo: 'endógena',
      },
      {
        simbolo: 'P_{\\max},\\;P_{\\min}',
        significado: 'Precio (o salario) fijado por la ley',
        tipo: 'exógena',
      },
      {
        simbolo: 'a,\\;b,\\;c,\\;d',
        significado: 'Parámetros de la demanda y la oferta',
        tipo: 'parámetro',
      },
    ],
    choques: [
      'Mover el precio fijado: cuanto más lejos del equilibrio, mayor la escasez o el excedente.',
      'Cambiar las elasticidades: con curvas más elásticas el mismo control causa mayores distorsiones.',
      'Pasar al mercado laboral: la demanda es de las empresas, la oferta de los trabajadores y el piso es el salario mínimo.',
    ],
    equilibrio:
      'E es el equilibrio sin control. La línea roja es el precio fijado. Los rombos verdes marcan lo demandado y lo ofrecido a ese precio; ' +
      'la distancia entre ellos es la escasez o el excedente. El área roja es la pérdida de peso muerto.',
    ejemplo: {
      parametros: { ...DEF_CP, tipo: minimo ? 'minimo' : 'maximo', precio_control: control },
      enunciado: `Con Qd = 100 − 2P y Qs = 10 + 3P (equilibrio P = 18, Q = 64), la ley fija un precio ${minimo ? 'mínimo' : 'máximo'} de ${control}.`,
      resultado:
        `A ${control} se demandan ${f(r.qd)} y se ofrecen ${f(r.qs)}: se transan ${f(r.q)} y ${minimo ? 'sobran' : 'faltan'} ${f(Math.abs(r.faltante))} unidades. ` +
        `La pérdida de peso muerto es ${f(r.ppm)}.`,
      prueba: `Mueve el precio fijado hacia ${minimo ? 'abajo' : 'arriba'} de 18: cuando lo cruzas, el control deja de ser obligatorio y desaparece la distorsión.`,
    },
    fuente:
      'cap. 6, «La oferta, la demanda y las políticas del gobierno» (controles de precios, figuras 1–5).',
    autor: AUTOR,
  };
}

// ------------------------------------------------------------------ Impuestos
function impuestos(): Teoria {
  const D = new Demanda(DEF_IM.a, DEF_IM.b);
  const S = new Oferta(DEF_IM.c, DEF_IM.d);
  const r = aplicarImpuesto(D, S, DEF_IM.t, 'vendedores');
  const r2 = aplicarImpuesto(D, S, 2 * DEF_IM.t, 'vendedores');
  const tStar = impuestoRecaudoMaximo(D, S) as number;
  return {
    titulo: 'Impuestos y subsidios por unidad',
    definicion:
      'Un impuesto por unidad abre una cuña entre el precio que paga el comprador y el que recibe el vendedor. Reduce la cantidad ' +
      'transada, genera recaudo y una pérdida de peso muerto. Un subsidio es un impuesto negativo.',
    conceptos: [
      'No importa a quién se le cobre: la carga se reparte según las elasticidades y recae más sobre el lado más inelástico.',
      'La pérdida de peso muerto crece con el cuadrado del impuesto: duplicar t la multiplica por cuatro.',
      'El recaudo primero sube y luego baja con t (curva de Laffer) hasta que el impuesto elimina el mercado.',
    ],
    formulas: [
      'P_c - P_v = t, \\qquad \\text{carga del comprador} = \\dfrac{d}{b+d}',
      'PPM = \\tfrac{1}{2}\\,t\\,(Q^{*} - Q_t), \\qquad t^{*}_{\\text{recaudo}} = \\dfrac{Q^{*}}{2k}',
    ],
    variables: [
      {
        simbolo: 'P_c,\\;P_v,\\;Q_t',
        significado: 'Precio del comprador, precio del vendedor y cantidad con impuesto',
        tipo: 'endógena',
      },
      {
        simbolo: 'R = tQ_t',
        significado: 'Recaudo (o gasto en subsidio si t < 0)',
        tipo: 'endógena',
      },
      { simbolo: 't', significado: 'Impuesto por unidad (negativo = subsidio)', tipo: 'exógena' },
      {
        simbolo: 'a,\\;b,\\;c,\\;d',
        significado: 'Parámetros de la demanda y la oferta; k = bd/(b+d)',
        tipo: 'parámetro',
      },
    ],
    choques: [
      'Subir t: aumenta la cuña, baja la cantidad, sube la pérdida de peso muerto (con el cuadrado de t).',
      'Cambiar a quién se cobra: la curva que se desplaza cambia, pero Pc, Pv y Q no.',
      'Hacer una curva más inelástica: ese lado carga con más del impuesto y la pérdida baja.',
    ],
    equilibrio:
      'A la izquierda, el impuesto desplaza una curva; el rectángulo morado es el recaudo y el triángulo rojo la pérdida de peso muerto. ' +
      'A la derecha, la curva de Laffer: el recaudo (morado) alcanza su máximo y luego cae, mientras la pérdida (roja) siempre crece.',
    ejemplo: {
      parametros: { ...DEF_IM },
      enunciado: `Con Qd = 100 − 2P y Qs = 10 + 3P (equilibrio P = 18, Q = 64), se cobra un impuesto de ${DEF_IM.t} por unidad a los vendedores.`,
      resultado:
        `El comprador paga ${f(r.pc)} y el vendedor recibe ${f(r.pv)}; se transan ${f(r.q)}. Los compradores cargan ${f((r.cargaCompradores ?? 0) * 100, 0)} % del impuesto ` +
        `(d/(b+d) = 3/5). El recaudo es ${f(r.recaudo)} y la pérdida de peso muerto ${f(r.ppm)}. Con t = ${2 * DEF_IM.t} la pérdida sube a ${f(r2.ppm)}.`,
      prueba: `Cambia «Se cobra a» a compradores: los precios y la cantidad no cambian. Sube t hasta ${f(tStar, 1)}: es el impuesto que maximiza el recaudo.`,
    },
    fuente:
      'caps. 6 y 8, «La oferta, la demanda y las políticas del gobierno» y «Aplicación: los costos de los impuestos».',
    autor: AUTOR,
  };
}

// ------------------------------------------------------------------ Comercio
function comercioInternacional(): Teoria {
  const D = new Demanda(DEF_CI.a, DEF_CI.b);
  const S = new Oferta(DEF_CI.c, DEF_CI.d);
  const libre = comercio(D, S, DEF_CI.precio_mundial);
  const arancel = comercio(D, S, DEF_CI.precio_mundial, 3);
  return {
    titulo: 'Comercio internacional en un país pequeño',
    definicion:
      'Un país pequeño toma el precio mundial como dado. Si ese precio es menor que el de su equilibrio sin comercio, importa el bien; ' +
      'si es mayor, lo exporta. Un arancel o una cuota restringen las importaciones.',
    conceptos: [
      'Quien importa: ganan los consumidores, pierden los productores nacionales y el país gana en total.',
      'Quien exporta: ganan los productores, pierden los consumidores y el país también gana en total.',
      'Un arancel o una cuota suben el precio interno, reducen las importaciones y causan pérdida de peso muerto (dos triángulos).',
    ],
    formulas: [
      'M = Q^{d}(P_W + \\tau) - Q^{s}(P_W + \\tau)',
      '\\text{Recaudo} = \\tau\\,M, \\qquad PPM = \\text{triángulo de consumo} + \\text{triángulo de producción}',
    ],
    variables: [
      {
        simbolo: 'P,\\;Q^{d},\\;Q^{s}',
        significado: 'Precio interno, consumo y producción nacionales',
        tipo: 'endógena',
      },
      { simbolo: 'M', significado: 'Importaciones (negativas si exporta)', tipo: 'endógena' },
      { simbolo: 'P_W', significado: 'Precio mundial', tipo: 'exógena' },
      {
        simbolo: '\\tau,\\;\\text{cuota}',
        significado: 'Arancel por unidad o límite a las importaciones',
        tipo: 'exógena',
      },
    ],
    choques: [
      'Bajar el precio mundial: aumentan las importaciones y las ganancias del país.',
      'Subir el precio mundial por encima del interno: el país pasa a exportar.',
      'Aplicar un arancel o una cuota: el precio interno sube. Con la misma importación, el arancel recauda y la cuota genera rentas.',
    ],
    equilibrio:
      'La línea del precio mundial cruza la demanda y la oferta nacionales: el tramo entre la oferta y la demanda es lo que se importa. ' +
      'Con arancel o cuota, el precio interno sube y los triángulos rojos son la pérdida de peso muerto.',
    ejemplo: {
      parametros: { ...DEF_CI, politica: 'arancel', arancel: 3 },
      enunciado:
        'Sin comercio, P = 18 y Q = 64. El precio mundial es 12. Primero se compara libre comercio con un arancel de 3 por unidad.',
      resultado:
        `Con libre comercio se importan ${f(libre.importaciones)} unidades y el país gana ${f(libre.gananciaVsAutarquia)} frente a no comerciar. ` +
        `Con el arancel el precio interno es ${f(arancel.precioInterno)}, se importan ${f(arancel.importaciones)}, el recaudo es ${f(arancel.recaudo)} ` +
        `y la pérdida de peso muerto ${f(arancel.ppm)}.`,
      prueba:
        'Sube el precio mundial por encima de 18: el país pasa a exportar y el arancel de importación ya no tiene efecto.',
    },
    fuente:
      'cap. 9, «Aplicación: el comercio internacional» (ganadores, perdedores, aranceles y cuotas).',
    autor: AUTOR,
  };
}

// ------------------------------------------------------------------ Externalidades
function externalidades(p: Params): Teoria {
  const positiva = p['tipo'] === 'positiva';
  const D = new Demanda(DEF_EXT.a, DEF_EXT.b);
  const S = new Oferta(DEF_EXT.c, DEF_EXT.d);
  const t = positiva ? 'positiva' : 'negativa';
  const sinInt = externalidad(D, S, t, DEF_EXT.e, 0);
  const conInt = externalidad(D, S, t, DEF_EXT.e, positiva ? -DEF_EXT.e : DEF_EXT.e);
  return {
    titulo: `Externalidades · ${positiva ? 'positiva en el consumo' : 'negativa en la producción'}`,
    definicion:
      'Una externalidad es el efecto de la actividad de una persona o empresa sobre el bienestar de terceros que no participan en la ' +
      'transacción. El mercado no la considera, así que produce una cantidad distinta del óptimo social.',
    conceptos: positiva
      ? [
          'Con una externalidad positiva (educación, vacunas) el valor social está por encima de la demanda: el mercado produce muy poco.',
          'Un subsidio igual al beneficio externo por unidad lleva la cantidad al óptimo.',
          'La pérdida de peso muerto es el valor social de las unidades que no se producen.',
        ]
      : [
          'Con una externalidad negativa (contaminación) el costo social está por encima de la oferta: el mercado produce demasiado.',
          'Un impuesto pigouviano igual al costo externo por unidad lleva la cantidad al óptimo.',
          'La pérdida de peso muerto es el costo social de las unidades de más.',
        ],
    formulas: [
      positiva ? '\\text{Valor social} = P^{d}(Q) + e' : '\\text{Costo social} = P^{s}(Q) + e',
      't_{\\text{Pigou}} = e \\quad (\\text{subsidio si la externalidad es positiva})',
    ],
    variables: [
      {
        simbolo: 'Q_{\\text{mercado}},\\;Q_{\\text{óptimo}}',
        significado: 'Cantidad que elige el mercado y cantidad socialmente óptima',
        tipo: 'endógena',
      },
      {
        simbolo: 'e',
        significado: positiva ? 'Beneficio externo por unidad' : 'Costo externo por unidad',
        tipo: 'exógena',
      },
      {
        simbolo: 't',
        significado: 'Impuesto (+) o subsidio (−) por unidad aplicado por el Estado',
        tipo: 'exógena',
      },
      {
        simbolo: 'a,\\;b,\\;c,\\;d',
        significado: 'Parámetros privados de demanda y oferta',
        tipo: 'parámetro',
      },
    ],
    choques: [
      'Subir e: se amplía la distancia entre la curva privada y la social, y con ella la pérdida de peso muerto.',
      'Aplicar un impuesto o subsidio igual a e: el mercado llega al óptimo y la pérdida desaparece.',
      'Una intervención en el sentido contrario (o excesiva) aleja el resultado del óptimo.',
    ],
    equilibrio:
      'El punto «Mercado» es el equilibrio privado; la estrella es el óptimo social, donde se cruza la curva social con la privada ' +
      'del otro lado. El triángulo rojo entre ambas cantidades es la pérdida de peso muerto.',
    ejemplo: {
      parametros: { ...DEF_EXT, tipo: t, intervencion: positiva ? -DEF_EXT.e : DEF_EXT.e },
      enunciado: `Con Qd = 100 − 2P y Qs = 10 + 3P, hay una externalidad ${positiva ? 'positiva' : 'negativa'} de ${DEF_EXT.e} por unidad y el Estado aplica ${positiva ? 'un subsidio' : 'un impuesto'} de ${DEF_EXT.e}.`,
      resultado:
        `Sin intervención el mercado transa ${f(sinInt.qMercado)} y el óptimo es ${f(sinInt.qOptimo)}; la pérdida de peso muerto es ${f(sinInt.ppmMercado)}. ` +
        `Con ${positiva ? 'el subsidio' : 'el impuesto'} la cantidad es ${f(conInt.q)} (el óptimo) y la pérdida es ${f(conInt.ppm)}.`,
      prueba: `Pon la intervención en 0: reaparece la pérdida. Si el signo es el contrario, la cantidad se aleja del óptimo y el simulador avisa.`,
    },
    fuente: 'cap. 10, «Las externalidades» (impuestos y subsidios correctivos).',
    autor: AUTOR,
  };
}

export function teoria(sim: string, p: Params): Teoria | null {
  switch (sim) {
    case 'fpp':
      return fpp();
    case 'ventaja-comparativa':
      return ventaja();
    case 'oferta-demanda':
      return ofertaDemanda();
    case 'elasticidades':
      return elasticidades();
    case 'excedentes':
      return excedentes();
    case 'controles-precios':
      return controles(p);
    case 'impuestos':
      return impuestos();
    case 'comercio-internacional':
      return comercioInternacional();
    case 'externalidades':
      return externalidades(p);
    default:
      return null;
  }
}
