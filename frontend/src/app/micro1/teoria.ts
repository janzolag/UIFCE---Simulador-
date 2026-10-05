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
import { monopolioLineal } from './modelos/monopolio';
import { cartel, cournot, stackelberg } from './modelos/oligopolio';
import { recta } from './modelos/presupuesto';
import { CobbDouglasP } from './modelos/produccion';
import { descomposicion } from './modelos/slutsky';
import { crearUtilidad } from './simuladores/_comun';
import { crearTecnologia } from './simuladores/produccion';

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

function eleccion(p: Params): Teoria {
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
  const c = SLUTSKY_FAM[familia] ?? SLUTSKY_FAM['cd'];
  const base = familia === 'giffen' ? { p1: 2, p2: 1, M: 3.5, p1n: 2.2 } : { p1: 3, p2: 2, M: 45, p1n: 3.6 };
  const parametros: Params = { familia, metodo: 'hicks', a: 2, b: 1, ...base };
  const u: Utilidad = familia === 'giffen' ? new Giffen() : crearUtilidad(familia, 2, 1);
  const h = descomposicion(u, base.p1, base.p2, base.M, base.p1n, 'hicks');
  const s = descomposicion(u, base.p1, base.p2, base.M, base.p1n, 'slutsky');
  const esH = h.efecto_sustitucion[0];
  const esS = s.efecto_sustitucion[0];
  return {
    titulo: `Efectos ingreso y sustitución · ${c.nombre}`,
    conceptos: [
      'Ante un cambio de precio, el efecto total se parte en sustitución (A → B, compensando) e ingreso (B → C).',
      c.nota,
      'Hicks mantiene la utilidad inicial; Slutsky devuelve el ingreso que permite comprar la canasta A.',
    ],
    formulas: ['\\Delta x=\\Delta x^{S}+\\Delta x^{I}', '\\dfrac{\\partial x}{\\partial p_1}=\\dfrac{\\partial h_1}{\\partial p_1}-x\\,\\dfrac{\\partial x}{\\partial M}'],
    ejemplo: {
      parametros,
      enunciado: `Con p₁ = ${f(base.p1)} que sube a p₁' = ${f(base.p1n)}, p₂ = ${f(base.p2)} y M = ${f(base.M)}, compensación de Hicks${familia === 'cd' ? ' (el ejemplo 1 de la semana 4)' : ''}.`,
      resultado:
        `Δx de sustitución = ${f(esH)}, de ingreso = ${f(h.efecto_ingreso[0])} y total = ${f(h.efecto_total[0])}. ` +
        `La canasta pasa de A = (${f(h.A.x)}, ${f(h.A.y)}) a C = (${f(h.C.x)}, ${f(h.C.y)}).`,
      prueba:
        Math.abs(esH - esS) < 1e-9
          ? `Cambia la compensación a «Slutsky»: el efecto sustitución en x sigue en ${f(esS)}; en este modelo los dos métodos coinciden.`
          : `Cambia la compensación a «Slutsky»: el efecto sustitución en x pasa de ${f(esH)} a ${f(esS)} y el punto B se mueve.`,
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

function produccion(p: Params): Teoria {
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
function competencia(): Teoria {
  const parametros: Params = { CF: 20, a: 10, b: 2, c: 0.5, n: 20, Ad: 400, Bd: 10 };
  const k = new CostoCubico(20, 10, 2, 0.5);
  const e20 = equilibrioNEmpresasCubicas(400, 10, k, 20);
  const e40 = equilibrioNEmpresasCubicas(400, 10, k, 40);
  const le = nLibreEntrada(400, 10, k);
  return {
    titulo: 'Competencia perfecta',
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

// ------------------------------------------------------------------ monopolio
function monopolio(): Teoria {
  const parametros: Params = { a: 12, b: 1, c: 0, d: 1, CF: 0 };
  const r = monopolioLineal(12, 1, 0, 1, 0);
  const r2 = monopolioLineal(12, 1, 4, 1, 0);
  return {
    titulo: 'Monopolio',
    conceptos: [
      'El monopolista iguala ingreso marginal y costo marginal; como IMg < p, produce menos y cobra más que en competencia.',
      'La diferencia genera una pérdida irrecuperable de eficiencia (área roja); opera siempre en el tramo elástico de la demanda.',
      'Si CMe > CMg (economías de escala), regular con p = CMg dejaría pérdidas: se regula con p = CMe.',
    ],
    formulas: ['IMg(y)=CMg(y)', '\\dfrac{p-CMg}{p}=-\\dfrac{1}{\\varepsilon}\\quad\\text{(índice de Lerner)}'],
    ejemplo: {
      parametros,
      enunciado: 'Con demanda p = 12 − y y costo C = y² (a = 12, b = 1, c = 0, d = 1, CF = 0).',
      resultado:
        `Monopolio: y = ${f(r.y_m)} y p = ${f(r.p_m)}; competencia: y = ${f(r.y_c)} y p = ${f(r.p_c)}. ` +
        `Pérdida irrecuperable = ${f(r.perdida_eficiencia)} e índice de Lerner = ${f(r.lerner)}.`,
      prueba: `Sube c a 4: el monopolista produce y = ${f(r2.y_m)} y cobra p = ${f(r2.p_m)}; la pérdida de eficiencia pasa a ${f(r2.perdida_eficiencia)}.`,
    },
    fuente: 'ejemplos 1 y 2 de la semana 10 (C = y², y = 12 − p); secciones 10.4–10.5.',
  };
}

// ------------------------------------------------------------------ oligopolio
function oligopolio(): Teoria {
  const parametros: Params = { a: 20, c: 2, n: 3 };
  const duo = cournot(20, 2, 2);
  const c3 = cournot(20, 2, 3);
  const c10 = cournot(20, 2, 10);
  const st = stackelberg(20, 2);
  const ka = cartel(20, 2, 2);
  return {
    titulo: 'Oligopolio',
    conceptos: [
      'En Cournot cada empresa elige su producción tomando como dada la de las demás; el equilibrio es la intersección de las curvas de reacción.',
      'En precio: cartel > Cournot > Stackelberg > Bertrand. El cartel no es estable: cada empresa querría desviarse.',
      'Al aumentar n, el precio converge al costo marginal y Cournot se acerca a la competencia perfecta.',
    ],
    formulas: ['y_i^{*}=\\dfrac{a-c}{n+1},\\qquad p^{*}=\\dfrac{a+nc}{n+1}', 'y_i=\\dfrac{a-c-y_j}{2}\\quad\\text{(curva de reacción)}'],
    ejemplo: {
      parametros,
      enunciado: 'Con p = a − Y, a = 20, costo marginal c = 2 y n = 3 empresas.',
      resultado:
        `Duopolio: Cournot p = ${f(duo.p)}, Stackelberg p = ${f(st.p)} y cartel p = ${f(ka.p)}. ` +
        `Con n = 3 (Cournot): y por empresa = ${f(c3.y_i)} y p = ${f(c3.p)}.`,
      prueba: `Sube n a 10: el precio baja a ${f(c10.p)}, ya cerca del costo marginal (c = 2), y cada empresa produce ${f(c10.y_i)}.`,
    },
    fuente: 'tabla 11.3 y figuras 11.4–11.5; paradoja de Bertrand (sección 11.3.3).',
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
    case 'competencia-perfecta': return competencia();
    case 'monopolio': return monopolio();
    case 'oligopolio': return oligopolio();
    default: return null;
  }
}
