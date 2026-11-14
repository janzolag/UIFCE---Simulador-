/**
 * Fichas de teoría del modal «Teoría» (una por simulador y, cuando aplica, por modelo elegido:
 * Cobb-Douglas, Leontief, corto/largo plazo…). Los números de cada ejercicio se calculan con las
 * mismas funciones del simulador, así que siempre coinciden con lo que se ve en la gráfica.
 * Las referencias son las del material original (Monsalve, 2017).
 */
import { fmt } from '../core/formato';
import { Params, Teoria } from '../core/tipos';
import { CostoCubico, constanteBCd, costoLp } from './modelos/costos';
import { equilibrioNEmpresasCubicas, nLibreEntrada } from './modelos/competencia';
import { Giffen, Utilidad } from './modelos/consumidor';
import { agregacionEngel, elasticidades, variaciones } from './modelos/demanda';
import { recta } from './modelos/presupuesto';
import { CobbDouglasP } from './modelos/produccion';
import { descomposicion } from './modelos/slutsky';
import { crearUtilidad } from './simuladores/_comun';
import { crearTecnologia, maxProducto, minCosto } from './simuladores/produccion';

const f = (v: number, d = 3): string => fmt(v, d);
const num = (p: Params, k: string): number => Number(p[k]);

// ------------------------------------------------------------------ restricción presupuestal
function presupuesto(): Teoria {
  const parametros = { p1: 3, p2: 2, M: 45, p1n: 6, p2n: 2, Mn: 45 };
  const r = recta(3, 2, 45);
  const nueva = recta(6, 2, 45);
  const comparte = recta(6, 2, 90);
  return {
    titulo: 'Restricción presupuestal',
    conceptos: [
      'El conjunto presupuestal reúne las canastas (x, y) que el consumidor puede pagar: p₁x + p₂y ≤ M.',
      'La pendiente −p₁/p₂ es el costo de oportunidad de x medido en unidades de y.',
      'Multiplicar precios e ingreso por el mismo número no mueve la recta (no hay ilusión monetaria).',
    ],
    formulas: ['p_1 x + p_2 y = M', 'y = \\dfrac{M}{p_2} - \\dfrac{p_1}{p_2}\\,x'],
    ejemplo: {
      parametros,
      enunciado: 'Con p₁ = 3, p₂ = 2 y M = 45, y un nuevo precio p₁ = 6 (p₂ y M no cambian).',
      resultado:
        `Interceptos: x = M/p₁ = ${f(r.intercepto_x)} y y = M/p₂ = ${f(r.intercepto_y)}; pendiente −p₁/p₂ = ${f(r.pendiente)}. ` +
        `Con p₁ = 6 el intercepto en x baja a ${f(nueva.intercepto_x)} y el de y sigue en ${f(nueva.intercepto_y)}.`,
      prueba:
        `La recta punteada gira sobre el eje y. Ahora sube «Nuevo M» a 90: la recta nueva vuelve a cortar el eje x en ${f(comparte.intercepto_x)}, ` +
        'el mismo punto que la inicial.',
    },
    fuente: 'sección 1.4, figuras 1.10–1.14.',
  };
}

// ------------------------------------------------------------------ preferencias
const PREF: Record<string, { nombre: string; conceptos: string[]; formulas: string[]; parametros: Params; ejemplo: string; prueba: (u: Utilidad) => string }> = {
  cd: {
    nombre: 'Cobb-Douglas',
    conceptos: [
      'Las curvas de indiferencia son hipérbolas convexas: la TMS cae a medida que se tiene más x.',
      'α y β son las elasticidades de la utilidad; las preferencias son monótonas y homotéticas.',
    ],
    formulas: ['U(x,y)=x^{\\alpha}y^{\\beta}', 'TMS=\\dfrac{UMg_x}{UMg_y}=\\dfrac{\\alpha}{\\beta}\\,\\dfrac{y}{x}'],
    parametros: { familia: 'cd', a: 1, b: 1, x0: 4, y0: 5 },
    ejemplo: 'α = 1, β = 1 y la canasta (x₀, y₀) = (4, 5)',
    prueba: (u) => `Mueve x₀ a 5: la TMS baja a ${f(u.tms(5, 5) as number)} (más x, menos valor relativo de x) y U sube a ${f(u.U(5, 5))}.`,
  },
  leontief: {
    nombre: 'Leontief',
    conceptos: [
      'Complementarios perfectos: los bienes se consumen en proporción fija (b·y = a·x) y las curvas son escuadras.',
      'Tener más de un solo bien no aumenta la utilidad; en el vértice la TMS no está definida.',
    ],
    formulas: ['U(x,y)=\\min\\{ax,\\;by\\}', '\\text{Vértice: } ax=by'],
    parametros: { familia: 'leontief', a: 1, b: 1, x0: 4, y0: 5 },
    ejemplo: 'a = 1, b = 1 y la canasta (x₀, y₀) = (4, 5)',
    prueba: (u) => `Sube y₀ a 8: U sigue en ${f(u.U(4, 8))} (sobra y). Sube x₀ a 5 con y₀ = 5: U sube a ${f(u.U(5, 5))}.`,
  },
  lineal: {
    nombre: 'Sustitutos perfectos',
    conceptos: [
      'El consumidor cambia un bien por el otro siempre en la misma proporción.',
      'Las curvas son rectas de pendiente −a/b: la TMS es constante.',
    ],
    formulas: ['U(x,y)=ax+by', 'TMS=\\dfrac{a}{b}'],
    parametros: { familia: 'lineal', a: 2, b: 1, x0: 4, y0: 5 },
    ejemplo: 'a = 2, b = 1 y la canasta (x₀, y₀) = (4, 5)',
    prueba: (u) => `Mueve x₀ a 8: la TMS sigue en ${f(u.tms(8, 5) as number)} (es constante); solo cambia U, que pasa a ${f(u.U(8, 5))}.`,
  },
  cuasi: {
    nombre: 'Cuasilineal',
    conceptos: [
      'La utilidad es lineal en y («dinero») y cóncava en x: las curvas son una misma curva desplazada en vertical.',
      'La TMS solo depende de x, por eso la demanda de x no depende del ingreso (mientras la solución sea interior).',
    ],
    formulas: ['U(x,y)=a\\sqrt{x}+y', 'TMS=\\dfrac{a}{2\\sqrt{x}}'],
    parametros: { familia: 'cuasi', a: 2, b: 1, x0: 4, y0: 5 },
    ejemplo: 'a = 2 y la canasta (x₀, y₀) = (4, 5)',
    prueba: (u) => `Mueve x₀ a 9: la TMS baja a ${f(u.tms(9, 5) as number)} sin importar y₀, y U pasa a ${f(u.U(9, 5))}.`,
  },
  separable: {
    nombre: 'Separable',
    conceptos: [
      'Como Cobb-Douglas, pero las curvas tocan los ejes: es posible no consumir uno de los bienes.',
      'Cada bien aporta utilidad por separado y con rendimientos decrecientes.',
    ],
    formulas: ['U(x,y)=a\\sqrt{x}+b\\sqrt{y}', 'TMS=\\dfrac{a}{b}\\sqrt{\\dfrac{y}{x}}'],
    parametros: { familia: 'separable', a: 1, b: 1, x0: 4, y0: 9 },
    ejemplo: 'a = 1, b = 1 y la canasta (x₀, y₀) = (4, 9)',
    prueba: (u) => `Mueve x₀ a 9: la TMS baja a ${f(u.tms(9, 9) as number)} y U sube a ${f(u.U(9, 9))}.`,
  },
  stone: {
    nombre: 'Stone-Geary',
    conceptos: [
      'Cobb-Douglas desplazada: exige un consumo mínimo de cada bien (aquí 1 unidad), el nivel de subsistencia.',
      'Solo lo que excede ese mínimo genera utilidad.',
    ],
    formulas: ['U(x,y)=(x-1)^{\\alpha}(y-1)^{\\beta}', 'TMS=\\dfrac{\\alpha}{\\beta}\\,\\dfrac{y-1}{x-1}'],
    parametros: { familia: 'stone', a: 1, b: 1, x0: 4, y0: 5 },
    ejemplo: 'α = 1, β = 1 y la canasta (x₀, y₀) = (4, 5)',
    prueba: (u) => `Mueve x₀ a 5: la TMS baja a ${f(u.tms(5, 5) as number)} y U sube a ${f(u.U(5, 5))}.`,
  },
};

function preferencias(p: Params): Teoria {
  const c = PREF[String(p['familia'])] ?? PREF['cd'];
  const par = c.parametros;
  const u = crearUtilidad(String(par['familia']), num(par, 'a'), num(par, 'b'));
  const x0 = num(par, 'x0');
  const y0 = num(par, 'y0');
  const tms = u.tms(x0, y0);
  return {
    titulo: `Preferencias · ${c.nombre}`,
    conceptos: c.conceptos,
    formulas: c.formulas,
    ejemplo: {
      parametros: par,
      enunciado: `Con ${c.ejemplo}.`,
      resultado: `U(x₀, y₀) = ${f(u.U(x0, y0))}` + (tms !== null ? ` y TMS = ${f(tms)}.` : '; la TMS no está definida en el vértice de la escuadra.'),
      prueba: c.prueba(u),
    },
    fuente: 'ejemplos 1 y 2 de la semana 1; sección 3.6 (homotéticas).',
  };
}

// ------------------------------------------------------------------ elección óptima
const ELEC: Record<string, { nombre: string; conceptos: string[]; parametros: Params; prueba: (p: Params) => string }> = {
  cd: {
    nombre: 'Cobb-Douglas',
    conceptos: [
      'El óptimo es la canasta donde la curva de indiferencia más alta toca la recta presupuestal: ahí TMS = p₁/p₂ (Jevons).',
      'El consumidor destina fracciones fijas del ingreso: αM/(α+β) a x y βM/(α+β) a y.',
    ],
    parametros: { familia: 'cd', a: 1, b: 1, p1: 3, p2: 2, M: 45 },
    prueba: (p) => duplicar(p),
  },
  leontief: {
    nombre: 'Leontief',
    conceptos: [
      'La solución es el vértice de la escuadra sobre la recta presupuestal: a·x = b·y.',
      'Los precios mueven el vértice, pero nunca hay tangencia: la TMS no existe.',
    ],
    parametros: { familia: 'leontief', a: 1, b: 1, p1: 3, p2: 2, M: 45 },
    prueba: (p) => duplicar(p),
  },
  lineal: {
    nombre: 'Sustitutos perfectos',
    conceptos: [
      'Solución de esquina: se compra solo el bien con mayor utilidad por peso (a/p₁ frente a b/p₂).',
      'Si a/p₁ = b/p₂, cualquier canasta de la recta presupuestal es óptima.',
    ],
    parametros: { familia: 'lineal', a: 2, b: 1, p1: 3, p2: 2, M: 45 },
    prueba: (p) => {
      const r = optimo({ ...p, p1: 5 });
      return `Sube p₁ a 5: ahora a/p₁ = ${f(2 / 5)} < b/p₂ = ${f(1 / 2)} y la solución salta a la otra esquina: (x*, y*) = (${f(r.x)}, ${f(r.y)}).`;
    },
  },
  cuasi: {
    nombre: 'Cuasilineal',
    conceptos: [
      'TMS = p₁/p₂ fija la demanda de x con solo los precios; el resto del ingreso se gasta en y.',
      'Si M es muy bajo la solución es de esquina: todo el ingreso va a x.',
    ],
    parametros: { familia: 'cuasi', a: 2, b: 1, p1: 3, p2: 2, M: 45 },
    prueba: (p) => {
      const r = optimo({ ...p, M: 60 });
      return `Sube M a 60: x* no cambia (${f(r.x)}), porque no hay efecto ingreso sobre x; todo el ingreso extra va a y, que sube a ${f(r.y)}.`;
    },
  },
  separable: {
    nombre: 'Separable',
    conceptos: [
      'La solución siempre es interior: la utilidad marginal es infinita en cada eje, así que se consumen ambos bienes.',
      'En el óptimo se cumple TMS = p₁/p₂ y se agota todo el ingreso.',
    ],
    parametros: { familia: 'separable', a: 1, b: 1, p1: 3, p2: 2, M: 45 },
    prueba: (p) => {
      const r = optimo({ ...p, p1: 2 });
      return `Baja p₁ a 2: x* sube a ${f(r.x)} y y* pasa a ${f(r.y)}.`;
    },
  },
  stone: {
    nombre: 'Stone-Geary',
    conceptos: [
      'Primero se paga el consumo mínimo (p₁·1 + p₂·1); el ingreso restante se reparte como en Cobb-Douglas.',
      'Si M no alcanza para el mínimo, el modelo no tiene solución.',
    ],
    parametros: { familia: 'stone', a: 1, b: 1, p1: 3, p2: 2, M: 45 },
    prueba: (p) => {
      const r = optimo({ ...p, M: 85 });
      return `Sube M a 85: el ingreso por encima del mínimo se duplica y la canasta pasa a (x*, y*) = (${f(r.x)}, ${f(r.y)}).`;
    },
  },
};

function optimo(p: Params) {
  return crearUtilidad(String(p['familia']), num(p, 'a'), num(p, 'b')).eleccionOptima(num(p, 'p1'), num(p, 'p2'), num(p, 'M'));
}

/** Multiplicar p₁, p₂ y M por 2 deja la misma canasta (demanda homogénea de grado 0). */
function duplicar(p: Params): string {
  const r = optimo({ ...p, p1: num(p, 'p1') * 2, p2: num(p, 'p2') * 2, M: num(p, 'M') * 2 });
  return `Duplica p₁, p₂ y M (6, 4 y 90): la canasta óptima no cambia, sigue en (${f(r.x)}, ${f(r.y)}). No hay ilusión monetaria.`;
}

/** Problema dual: mínimo gasto para alcanzar la utilidad del primal (Cobb-Douglas α = β = 1). */
function eleccionDual(): Teoria {
  const parametros: Params = { familia: 'cd', a: 1, b: 1, p1: 3, p2: 2, M: 45, problema: 'dual', k: 1 };
  const u = crearUtilidad('cd', 1, 1);
  const v = u.eleccionOptima(3, 2, 45).utilidad;
  const e = u.gasto(3, 2, v);
  const [h1, h2] = u.hicks(3, 2, v);
  const e2 = u.gasto(3, 2, 2 * v);
  return {
    titulo: 'Elección óptima · problema dual (mínimo gasto)',
    conceptos: [
      'El dual minimiza el gasto p₁x + p₂y para alcanzar una utilidad Ū; su solución es la demanda hicksiana h(p, Ū) y su valor, la función de gasto e(p, Ū).',
      'Primal y dual se encuentran en la misma tangencia: h(p, v(p, M)) = x(p, M) y e(p, v(p, M)) = M.',
      'La hicksiana mantiene la utilidad constante; la marshalliana mantiene el ingreso constante.',
    ],
    formulas: [String.raw`e(p,\bar U)=\min_{x,y}\;p_1x+p_2y\quad\text{s.a.}\quad U(x,y)\ge \bar U`, String.raw`h(p,\bar U)=x\big(p,\,e(p,\bar U)\big)`],
    ejemplo: {
      parametros,
      enunciado: 'Con U = xy, p₁ = 3, p₂ = 2 y M = 45, fija Ū igual a la utilidad del primal (k = 1).',
      resultado: `v(p, M) = ${f(v)}; e(p, Ū) = ${f(e)} = M y h = (${f(h1)}, ${f(h2)}), la misma canasta marshalliana.`,
      prueba: `Sube k a 2: Ū se duplica y el gasto mínimo pasa a ${f(e2)} (con Cobb-Douglas de grado 2, e crece con √Ū).`,
    },
    fuente: 'teoría del consumidor: problema dual, demanda hicksiana y función de gasto.',
  };
}

function eleccion(p: Params): Teoria {
  if (p['problema'] === 'dual') return eleccionDual();
  const c = ELEC[String(p['familia'])] ?? ELEC['cd'];
  const par = c.parametros;
  const r = optimo(par);
  const dato = (k: string) => (num(par, k) === 0 ? '' : f(num(par, k)));
  const pref = String(par['familia']) === 'lineal' ? 'a = 2, b = 1' : String(par['familia']) === 'cuasi' ? 'a = 2' : `${['cd', 'stone'].includes(String(par['familia'])) ? 'α = 1, β = 1' : 'a = 1, b = 1'}`;
  return {
    titulo: `Elección óptima · ${c.nombre}`,
    conceptos: c.conceptos,
    formulas: ['\\max_{x,y}\\;U(x,y)\\quad \\text{s.a.}\\quad p_1x+p_2y=M', 'TMS=\\dfrac{UMg_x}{UMg_y}=\\dfrac{p_1}{p_2}\\quad\\text{(solución interior)}'],
    ejemplo: {
      parametros: par,
      enunciado: `Con ${pref}, p₁ = ${dato('p1')}, p₂ = ${dato('p2')} y M = ${dato('M')}.`,
      resultado: `Canasta óptima (x*, y*) = (${f(r.x)}, ${f(r.y)}) con utilidad U = ${f(r.utilidad)}.`,
      prueba: c.prueba(par),
    },
    fuente: 'ejemplos 3–7 de la semana 1; ejemplos 4–6 de la semana 2.',
  };
}

// ------------------------------------------------------------------ Slutsky / Hicks
const SLUTSKY_FAM: Record<string, { nombre: string; nota: string }> = {
  cd: { nombre: 'Cobb-Douglas', nota: 'Con Cobb-Douglas x es un bien normal: sustitución e ingreso reducen el consumo cuando sube p₁.' },
  separable: { nombre: 'Separable', nota: 'Con preferencias separables x es un bien normal: ambos efectos van en la misma dirección.' },
  leontief: { nombre: 'Leontief', nota: 'Con complementarios perfectos el efecto sustitución es nulo: todo el cambio es efecto ingreso.' },
  cuasi: { nombre: 'Cuasilineal', nota: 'Con cuasilineal el efecto ingreso sobre x es nulo (solución interior): todo el cambio es sustitución.' },
  stone: { nombre: 'Stone-Geary', nota: 'Con Stone-Geary x es normal; el efecto ingreso actúa sobre el ingreso por encima del consumo mínimo.' },
  giffen: { nombre: 'Bien Giffen', nota: 'En el bien Giffen el efecto ingreso supera al de sustitución y la demanda de x sube con su precio.' },
};

function slutsky(p: Params): Teoria {
  const familia = String(p['familia']);
  const metodo = p['metodo'] === 'slutsky' ? 'slutsky' : 'hicks';
  const c = SLUTSKY_FAM[familia] ?? SLUTSKY_FAM['cd'];
  const base = familia === 'giffen' ? { p1: 2, p2: 1, M: 3.5, p1n: 2.2 } : { p1: 3, p2: 2, M: 45, p1n: 3.6 };
  const parametros: Params = { familia, metodo, a: 2, b: 1, ...base };
  const u: Utilidad = familia === 'giffen' ? new Giffen() : crearUtilidad(familia, 2, 1);
  const elegido = descomposicion(u, base.p1, base.p2, base.M, base.p1n, metodo);
  const otro = descomposicion(u, base.p1, base.p2, base.M, base.p1n, metodo === 'hicks' ? 'slutsky' : 'hicks');
  const es = elegido.efecto_sustitucion[0];
  const esOtro = otro.efecto_sustitucion[0];
  const nombre = metodo === 'hicks' ? 'Hicks' : 'Slutsky';
  const nombreOtro = metodo === 'hicks' ? 'Slutsky' : 'Hicks';
  return {
    titulo: `Descomposición de ${nombre} · ${c.nombre}`,
    conceptos: [
      'Ante un cambio de precio, el efecto total se parte en sustitución (A → B, compensando) e ingreso (B → C).',
      c.nota,
      metodo === 'hicks'
        ? 'Hicks compensa para mantener la utilidad inicial: B está sobre la curva de indiferencia de A.'
        : 'Slutsky compensa para que se pueda comprar la canasta A: la recta compensada pasa por A y el consumidor queda un poco mejor.',
    ],
    formulas: [String.raw`\Delta x=\Delta x^{S}+\Delta x^{I}`, String.raw`\dfrac{\partial x}{\partial p_1}=\dfrac{\partial h_1}{\partial p_1}-x\,\dfrac{\partial x}{\partial M}`],
    ejemplo: {
      parametros,
      enunciado: `Con p₁ = ${f(base.p1)} que sube a p₁' = ${f(base.p1n)}, p₂ = ${f(base.p2)} y M = ${f(base.M)}, compensación de ${nombre}${familia === 'cd' ? ' (el ejemplo 1 de la semana 4)' : ''}.`,
      resultado:
        `Δx de sustitución = ${f(es)}, de ingreso = ${f(elegido.efecto_ingreso[0])} y total = ${f(elegido.efecto_total[0])}. ` +
        `La canasta pasa de A = (${f(elegido.A.x)}, ${f(elegido.A.y)}) a C = (${f(elegido.C.x)}, ${f(elegido.C.y)}).`,
      prueba:
        Math.abs(es - esOtro) < 1e-9
          ? `Elige «Descomposición de ${nombreOtro}» debajo de la gráfica: el efecto sustitución en x sigue en ${f(esOtro)}; en este modelo los dos métodos coinciden.`
          : `Elige «Descomposición de ${nombreOtro}» debajo de la gráfica: el efecto sustitución en x pasa de ${f(es)} a ${f(esOtro)} y el punto B se mueve.`,
    },
    fuente: 'ejemplo 1 de la semana 4 (x²y, 3x + 2y = 45, p1 sube 20 %); ejemplo 5 de la semana 3 (Giffen).',
  };
}

// ------------------------------------------------------------------ demanda
const DEM_FAM: Record<string, { nombre: string; nota: string; a: number; b: number }> = {
  cd: { nombre: 'Cobb-Douglas', a: 1, b: 1, nota: 'Elasticidad-precio −1 y elasticidad-ingreso 1: el gasto en cada bien es una fracción fija del ingreso.' },
  leontief: { nombre: 'Leontief', a: 1, b: 1, nota: 'Complementarios perfectos: x e y son complementarios brutos (la elasticidad cruzada es negativa).' },
  lineal: { nombre: 'Sustitutos perfectos', a: 2, b: 1, nota: 'Se compra solo el bien más barato por unidad de utilidad; la demanda salta cuando cambia el precio relativo.' },
  cuasi: { nombre: 'Cuasilineal', a: 2, b: 1, nota: 'La demanda de x no depende del ingreso (ε_M = 0) y VC, ΔEC y VE coinciden.' },
  separable: { nombre: 'Separable', a: 1, b: 1, nota: 'La elasticidad-precio de x está entre −1 y −2; x es un bien normal.' },
  stone: { nombre: 'Stone-Geary', a: 1, b: 1, nota: 'Solo el ingreso por encima del consumo mínimo se reparte; x es un bien necesario (0 < ε_M < 1).' },
};

function demanda(p: Params): Teoria {
  const familia = String(p['familia']);
  const c = DEM_FAM[familia] ?? DEM_FAM['cd'];
  const parametros: Params = { familia, a: c.a, b: c.b, p2: 2, M: 45, p1: 3, p1n: 4 };
  const u = crearUtilidad(familia, c.a, c.b);
  const el = elasticidades(u, 3, 2, 45);
  const v = variaciones(u, 3, 2, 45, 4);
  const engel = agregacionEngel(el);
  const pref = ['cd', 'stone'].includes(familia) ? 'α = 1, β = 1' : familia === 'lineal' ? 'a = 2, b = 1' : familia === 'cuasi' ? 'a = 2' : 'a = 1, b = 1';
  return {
    titulo: `Demanda y bienestar · ${c.nombre}`,
    conceptos: [
      'La elasticidad mide el cambio porcentual de la cantidad ante un cambio de 1 % en el precio, el ingreso o el precio del otro bien.',
      'La curva de Engel muestra cómo cambia x con el ingreso; su pendiente separa bienes normales, inferiores y de lujo.',
      c.nota,
    ],
    formulas: ['\\varepsilon_{x,p_1}=\\dfrac{\\partial x}{\\partial p_1}\\cdot\\dfrac{p_1}{x}', 'VC=e(p^{\\prime},U_0)-M,\\qquad VE=M-e(p,U_1)'],
    ejemplo: {
      parametros,
      enunciado: `Con ${pref}, p₁ = 3, p₂ = 2 y M = 45, y un alza de p₁ a 4.`,
      resultado:
        `ε(x,p₁) = ${f(el.e_x_p1)} y ε(x,M) = ${f(el.e_x_M)}` +
        (Number.isFinite(engel) ? ` (agregación de Engel ${f(engel, 4)})` : '') +
        `; VC = ${f(v.VC)}, ΔEC = ${f(v.perdida_EC)} y VE = ${f(v.VE)}.`,
      prueba: 'Lleva «Nuevo p₁» a 3, igual al precio inicial: no hay cambio de precio y VC, ΔEC y VE valen 0.',
    },
    fuente: 'semana 3 (elasticidades) y sección 4.8 (excedente).',
  };
}

// ------------------------------------------------------------------ producción
const PROD_FAM: Record<string, { nombre: string; nota: string; formulas: string[]; prueba: (t: ReturnType<typeof crearTecnologia>) => string }> = {
  cd: {
    nombre: 'Cobb-Douglas',
    nota: 'Con α + β < 1 hay rendimientos decrecientes y existe un máximo de beneficio interior; con α + β ≥ 1 no.',
    formulas: ['F(x,y)=A\\,x^{\\alpha}y^{\\beta}', 'TMST=\\dfrac{PMg_x}{PMg_y}=\\dfrac{\\alpha}{\\beta}\\,\\dfrac{y}{x}'],
    prueba: () => {
      const t = crearTecnologia('cd', 1, 0.75, 0.25, 0.5);
      return `Sube α a 0.75: α + β = 1, los rendimientos pasan a ser ${t.rendimientos(1.3, 2.1).tipo} y el beneficio ya no tiene máximo interior (desaparece el punto verde).`;
    },
  },
  ces: {
    nombre: 'CES',
    nota: 'σ = 1/(1−ρ): con ρ → 0 se acerca a Cobb-Douglas, con ρ → 1 a sustitutos perfectos y con ρ → −∞ a Leontief.',
    formulas: ['F(x,y)=A\\left[\\delta x^{\\rho}+(1-\\delta)y^{\\rho}\\right]^{\\nu/\\rho}', '\\sigma=\\dfrac{1}{1-\\rho}'],
    prueba: () => `Baja ρ a −1: la elasticidad de sustitución σ pasa de ${f(1 / (1 - 0.5))} a ${f(1 / (1 + 1))} y las isocuantas se curvan más.`,
  },
  leontief: {
    nombre: 'Leontief',
    nota: 'Insumos en proporción fija: σ = 0 y rendimientos constantes; la TMST no existe en el vértice.',
    formulas: ['F(x,y)=\\min\\{x/a,\\;y/b\\}', '\\sigma=0'],
    prueba: (t) => `Sube y₀ a 8: F no cambia (${f(t.F(4, 8))}) porque sobra y. Sube x₀ a 6 con y₀ = 4: F pasa a ${f(t.F(6, 4))}.`,
  },
  lineal: {
    nombre: 'Sustitutos perfectos',
    nota: 'Los insumos se sustituyen a razón constante: σ = ∞, TMST = a/b y rendimientos constantes.',
    formulas: ['F(x,y)=ax+by', 'TMST=\\dfrac{a}{b}'],
    prueba: (t) => `Mueve x₀ a 8: la TMST sigue en ${f(t.tmst(8, 4) as number)} (es constante) y F pasa a ${f(t.F(8, 4))}.`,
  },
  separable: {
    nombre: 'Separable',
    nota: 'Rendimientos decrecientes (grado ½): existe un máximo de beneficio interior.',
    formulas: ['F(x,y)=\\sqrt{x}+\\sqrt{y}', 'TMST=\\sqrt{y/x}'],
    prueba: (t) => {
      const antes = t.maxBeneficio?.(3, 2, 3);
      const b = t.maxBeneficio?.(6, 2, 3);
      return antes?.existe && b?.existe
        ? `Sube p a 6: el óptimo de beneficio pasa de (x*, y*) = (${f(antes.x)}, ${f(antes.y)}) a (${f(b.x)}, ${f(b.y)}).`
        : '';
    },
  },
};

/** Planteamientos del productor: máximo producto con C₀ y su dual, mínimo costo de q₀ (Cobb-Douglas). */
function produccionProblema(problema: string): Teoria {
  const maxq = problema === 'maxq';
  const parametros: Params = { tec: 'cd', A: 1, alpha: 0.5, beta: 0.25, rho: 0.5, x0: 4, y0: 4, p: 3, w1: 2, w2: 3, problema, C0: 18, q0: 3 };
  const t = crearTecnologia('cd', 1, 0.5, 0.25, 0.5);
  const m = maxProducto(t, 2, 3, 18);
  const c = minCosto(t, 2, 3, 3);
  return {
    titulo: maxq ? 'Productor · máximo producto dado C₀' : 'Productor · mínimo costo dado q₀',
    conceptos: [
      'Máximo producto: la isocuanta más alta que toca la recta de isocosto w₁x + w₂y = C₀.',
      'Mínimo costo: el isocosto más bajo que toca la isocuanta q₀; es el problema dual y lleva a la misma condición TMST = w₁/w₂.',
      'Con Cobb-Douglas el gasto se reparte en proporción α : β entre los dos factores.',
    ],
    formulas: maxq
      ? [String.raw`\max_{x,y}\;F(x,y)\quad\text{s.a.}\quad w_1x+w_2y=C_0`, String.raw`TMST=\dfrac{PMg_x}{PMg_y}=\dfrac{w_1}{w_2}`]
      : [String.raw`c(w,q_0)=\min_{x,y}\;w_1x+w_2y\quad\text{s.a.}\quad F(x,y)=q_0`, String.raw`TMST=\dfrac{w_1}{w_2}`],
    ejemplo: {
      parametros,
      enunciado: maxq
        ? 'Con F = x^0.5·y^0.25, w₁ = 2, w₂ = 3 y un presupuesto C₀ = 18.'
        : 'Con F = x^0.5·y^0.25, w₁ = 2 y w₂ = 3, produce q₀ = 3 al menor costo.',
      resultado: maxq
        ? `x* = ${f(m.x)}, y* = ${f(m.y)} y producción máxima q* = ${f(m.q)} (2/3 del gasto va a x).`
        : `x* = ${f(c.x)}, y* = ${f(c.y)} y costo mínimo c(w, 3) = ${f(c.C)}.`,
      prueba: maxq
        ? 'Lee el rombo dorado q*: la isocuanta dorada toca la recta roja de isocosto. Sube w₁ y verás que x* baja.'
        : 'Lee el rombo dorado c*: es el punto de la isocuanta q₀ con el isocosto más bajo. Sube q₀ y el isocosto se desplaza.',
    },
    fuente: 'teoría del productor: maximización del producto y minimización de costos.',
  };
}

function produccion(p: Params): Teoria {
  // El planteamiento (máximo producto / mínimo costo) se explica con Cobb-Douglas; las otras tecnologías muestran su ficha.
  if ((p['problema'] === 'maxq' || p['problema'] === 'minc') && (p['tec'] ?? 'cd') === 'cd') return produccionProblema(String(p['problema']));
  const tec = String(p['tec']);
  const c = PROD_FAM[tec] ?? PROD_FAM['cd'];
  const parametros: Params = { tec, A: 1, alpha: 0.5, beta: 0.25, rho: 0.5, x0: 4, y0: 4, p: 3, w1: 2, w2: 3 };
  const t = crearTecnologia(tec, 1, 0.5, 0.25, 0.5);
  const rend = t.rendimientos(1.3, 2.1);
  const tmst = t.tmst(4, 4);
  const usa = tec === 'leontief' || tec === 'lineal' ? 'a = 0.5, b = 0.25' : tec === 'separable' ? 'sin parámetros propios' : tec === 'ces' ? 'α = 0.5, β = 0.25, ρ = 0.5' : 'A = 1, α = 0.5, β = 0.25';
  return {
    titulo: `Tecnología · ${c.nombre}`,
    conceptos: ['Las isocuantas reúnen las combinaciones de insumos que producen lo mismo; su pendiente es −TMST.', c.nota],
    formulas: c.formulas,
    ejemplo: {
      parametros,
      enunciado: `Con ${usa} y la combinación (x₀, y₀) = (4, 4).`,
      resultado:
        `F(x₀, y₀) = ${f(t.F(4, 4))}; ` +
        (tmst === null ? 'la TMST no está definida en el vértice' : `TMST = ${f(tmst)}`) +
        `; rendimientos ${rend.tipo} (grado ${f(rend.grado_local)}); σ = ${f(t.elasticidadSustitucion())}.`,
      prueba: c.prueba(t),
    },
    fuente: 'ejemplo 2 (rendimientos a escala) y ejemplos 4–6 de la semana 5.',
  };
}

// ------------------------------------------------------------------ costos
function costos(p: Params): Teoria {
  if (String(p['modo']) === 'largo') {
    const parametros: Params = { modo: 'largo', CF: 20, a: 10, b: 2, c: 0.5, alpha: 0.3, beta: 0.4, w1: 2, w2: 3 };
    const tec = new CobbDouglasP(1, 0.3, 0.4);
    const B = constanteBCd(0.3, 0.4, 2, 3);
    return {
      titulo: 'Costos · Largo plazo',
      conceptos: [
        'El costo de largo plazo sale de minimizar w₁x + w₂y para cada nivel de producción z.',
        'El CMe de largo plazo es la envolvente de los CMe de corto plazo: los toca donde la planta (k) es la óptima.',
        'α + β < 1: costo convexo (CMe creciente); α + β = 1: CMe = CMg constantes; α + β > 1: CMe decreciente.',
      ],
      formulas: ['C(z)=B\\,z^{1/(\\alpha+\\beta)}', 'CMe_{LP}\\;\\text{envuelve a los}\\;CMe_{CP}'],
      ejemplo: {
        parametros,
        enunciado: 'Con α = 0.3, β = 0.4, w₁ = 2 y w₂ = 3 (tecnología Cobb-Douglas).',
        resultado: `α + β = 0.7 < 1, así que el costo es convexo; B = ${f(B)} y producir z = 5 cuesta ${f(costoLp(tec, 2, 3, 5))}.`,
        prueba: 'Sube β a 0.7 (α + β = 1): el CMe y el CMg se vuelven rectas horizontales e iguales (rendimientos constantes).',
      },
      fuente: 'figura 6.3 y ejemplo 1 de la semana 6; sección 7.4.',
    };
  }
  const parametros: Params = { modo: 'corto', CF: 20, a: 10, b: 2, c: 0.5, alpha: 0.3, beta: 0.4, w1: 2, w2: 3 };
  const k = new CostoCubico(20, 10, 2, 0.5);
  const k2 = new CostoCubico(40, 10, 2, 0.5);
  return {
    titulo: 'Costos · Corto plazo',
    conceptos: [
      'El CMg corta al CVMe y al CMe en sus mínimos; de ahí la forma de U de las curvas.',
      'Mínimo del CVMe = punto de cierre; mínimo del CMe = punto de nivelación. Entre ambos la empresa pierde, pero cubre su costo variable.',
    ],
    formulas: ['CT(q)=CF+aq-bq^{2}+cq^{3}', 'CMg=\\dfrac{dCT}{dq}=a-2bq+3cq^{2}'],
    ejemplo: {
      parametros,
      enunciado: 'Con CF = 20, a = 10, b = 2 y c = 0.5.',
      resultado:
        `El CVMe es mínimo en q = ${f(k.q_min_cvme())}, con precio de cierre ${f(k.precio_cierre())}; ` +
        `el CMe es mínimo en q = ${f(k.q_min_cme())}, con precio de nivelación ${f(k.precio_nivelacion())}.`,
      prueba:
        `Sube CF a 40: el punto de nivelación se corre a q = ${f(k2.q_min_cme())} y precio ${f(k2.precio_nivelacion())}, ` +
        `pero el precio de cierre sigue en ${f(k2.precio_cierre())}, porque el costo fijo no entra en el CVMe.`,
    },
    fuente: 'semana 7 (curvas de costo de corto plazo en forma de U).',
  };
}

// ------------------------------------------------------------------ competencia perfecta
function competencia(p: Params): Teoria {
  const vista = p['vista'] === 'mercado' ? 'mercado' : 'firma';
  const parametros: Params = { CF: 20, a: 10, b: 2, c: 0.5, n: 20, Ad: 400, Bd: 10, vista };
  const k = new CostoCubico(20, 10, 2, 0.5);
  const e20 = equilibrioNEmpresasCubicas(400, 10, k, 20);
  const e40 = equilibrioNEmpresasCubicas(400, 10, k, 40);
  const le = nLibreEntrada(400, 10, k);
  return {
    titulo: vista === 'mercado' ? 'Competencia perfecta · mercado y excedentes' : 'Competencia perfecta · decisión de la firma',
    conceptos: [
      'La empresa precio-aceptante produce donde p = CMg en el tramo creciente; si p < mín CVMe, cierra.',
      'La oferta de mercado es la suma horizontal de las n empresas (n·CMg); el equilibrio la iguala con la demanda.',
      'Con libre entrada, en el largo plazo p = mín CMe y el beneficio es cero; el número de empresas casi nunca es entero.',
    ],
    formulas: ['p=CMg(q)\\quad\\text{(con } p\\ge\\min CVMe)', 'Q^{s}(p)=n\\,q(p)=Q^{d}(p)=A-B\\,p'],
    ejemplo: {
      parametros,
      enunciado: 'Con CF = 20, a = 10, b = 2, c = 0.5, n = 20 empresas y demanda Q = 400 − 10p.',
      resultado:
        `Equilibrio: p* = ${f(e20.p)}, Q* = ${f(e20.Q)} y q = ${f(e20.q_empresa)} por empresa, con beneficio ${f(e20.beneficio_empresa)} cada una. ` +
        `Con libre entrada llegarían a ${f(le.n)} empresas.`,
      prueba: `Sube n a 40: el precio de equilibrio ${e40.p < e20.p ? 'baja' : 'sube'} de ${f(e20.p)} a ${f(e40.p)} y cada empresa produce ${f(e40.q_empresa)}.`,
    },
    fuente: 'secciones 7.6–7.7 y semana 8.',
  };
}

/** Ficha de teoría del simulador `simId` para el modelo elegido en `p` (o null si no hay). */
export function teoria(simId: string, p: Params): Teoria | null {
  switch (simId) {
    case 'restriccion-presupuestal': return presupuesto();
    case 'preferencias': return preferencias(p);
    case 'eleccion-optima': return eleccion(p);
    case 'slutsky': return slutsky(p);
    case 'demanda': return demanda(p);
    case 'produccion': return produccion(p);
    case 'costos': return costos(p);
    case 'competencia-perfecta': return competencia(p);
    default: return null;
  }
}
