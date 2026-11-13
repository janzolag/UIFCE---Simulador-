/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Motor del Modo Desafío: contrato de los retos, verificación con tolerancia y capas de la gráfica
 * (curvas fantasma del estado inicial y zona objetivo).
 *
 * Un reto es solo datos y funciones puras sobre los parámetros del simulador. `medir` usa las mismas
 * funciones del modelo que dibujan la gráfica, así que la verificación se prueba sin interfaz y
 * ningún simulador cambia para tener retos.
 */
import { ErrorParametro } from '../core/errores';
import { ACENTO } from '../core/tema';
import { Figura, Params } from '../core/tipos';

/** Tolerancia relativa de «Verificar Solución» (±1,5 % del valor objetivo). */
export const TOLERANCIA = 0.015;

export type Dificultad = 'Básico' | 'Intermedio' | 'Avanzado';

/** Dónde se dibuja la zona objetivo: eje y panel (sufijo de Plotly: '' = x/y, '2' = x2/y2…). */
export interface Zona {
  eje: 'x' | 'y';
  panel?: string;
}

export interface Objetivo {
  /** Variable que se mide, p. ej. «Producto Y». */
  etiqueta: string;
  meta: number;
  /** Decimales para mostrar el valor. */
  decimales?: number;
  medir(p: Params): number;
  /** Si la variable es una coordenada de la gráfica, se sombrea la banda de ±1,5 %. */
  zona?: Zona;
}

export interface Reto {
  id: string;
  materia: 'micro2' | 'macro2';
  sim: string;
  dificultad: Dificultad;
  titulo: string;
  /** Problema en máximo tres líneas. */
  enunciado: string;
  /** Valores que cambian respecto al estado por defecto del simulador. */
  inicial: Params;
  /** Únicos deslizadores que se muestran (ids del simulador). */
  controles: string[];
  objetivos: Objetivo[];
  /** Una combinación de los controles que resuelve el reto (pruebas de alcanzabilidad). */
  solucion: Params;
  /** Dos frases: por qué funciona. */
  explicacion: string;
  /** Una frase: hacia dónde mover. */
  pista: string;
}

export interface Medicion {
  objetivo: Objetivo;
  valor: number | null;
  ok: boolean;
}

export interface Veredicto {
  ok: boolean;
  mediciones: Medicion[];
}

export const dentroTolerancia = (valor: number, meta: number, tol = TOLERANCIA): boolean =>
  Number.isFinite(valor) && Math.abs(valor - meta) <= tol * Math.abs(meta) + 1e-12;

/** Mide cada objetivo; un parámetro imposible (ErrorParametro) cuenta como no logrado. */
export function verificar(reto: Reto, p: Params): Veredicto {
  const mediciones = reto.objetivos.map((o): Medicion => {
    let valor: number | null = null;
    try {
      const v = o.medir(p);
      valor = Number.isFinite(v) ? v : null;
    } catch (e) {
      if (!(e instanceof ErrorParametro)) throw e;
    }
    return { objetivo: o, valor, ok: valor !== null && dentroTolerancia(valor, o.meta) };
  });
  return { ok: mediciones.every((m) => m.ok), mediciones };
}

/** Parámetros con los que arranca el reto. */
export const estadoInicial = (reto: Reto, defecto: Params): Params => ({ ...defecto, ...reto.inicial });

/* ------------------------------------------------------------------ capas de la gráfica */

const FANTASMA = 'rgba(160, 170, 190, 0.55)';
const BANDA = 'rgba(245, 196, 81, 0.16)';

const nombreEje = (eje: 'x' | 'y', panel = ''): string => `${eje}axis${panel}`;

/**
 * Superpone a la figura actual las curvas del estado inicial (fantasma, punteadas y sin leyenda) y la
 * zona objetivo de cada meta. No modifica la figura original.
 */
export function figuraDesafio(actual: Figura, inicial: Figura | null, reto: Reto): Figura {
  const layout = structuredClone(actual.layout ?? {});
  const fantasmas = (inicial?.data ?? [])
    .filter((t: any) => (t.type ?? 'scatter') === 'scatter' && String(t.mode ?? 'lines').includes('lines'))
    .map((t: any) => ({
      type: 'scatter',
      x: t.x,
      y: t.y,
      xaxis: t.xaxis,
      yaxis: t.yaxis,
      mode: 'lines',
      line: { color: FANTASMA, width: 1.5, dash: 'dot' },
      opacity: 0.8,
      hoverinfo: 'skip',
      showlegend: false,
      name: 'Estado inicial',
    }));
  const shapes: any[] = [...(layout.shapes ?? [])];
  const marcas: any[] = [];
  const porPanel = new Map<string, { x?: Objetivo; y?: Objetivo }>();
  for (const o of reto.objetivos) {
    if (!o.zona) continue;
    const panel = o.zona.panel ?? '';
    const ref = porPanel.get(panel) ?? {};
    ref[o.zona.eje] = o;
    porPanel.set(panel, ref);
  }
  for (const [panel, { x, y }] of porPanel) {
    for (const o of [x, y]) {
      if (!o) continue;
      const eje = o.zona!.eje;
      const ax = (layout[nombreEje(eje, panel)] ??= {});
      const lo = o.meta - TOLERANCIA * Math.abs(o.meta);
      const hi = o.meta + TOLERANCIA * Math.abs(o.meta);
      // Si la meta queda fuera de la vista, se amplía el eje para que siempre se vea.
      if (Array.isArray(ax.range) && Number.isFinite(ax.range[1]) && hi > ax.range[1] * 0.97) ax.range = [ax.range[0], hi * 1.12];
      const otro = eje === 'x' ? 'y' : 'x';
      const banda = {
        type: 'rect',
        layer: 'below',
        line: { width: 0 },
        fillcolor: BANDA,
        [`${eje}ref`]: `${eje}${panel}`,
        [`${otro}ref`]: `${otro}${panel} domain`,
        [`${eje}0`]: lo,
        [`${eje}1`]: hi,
        [`${otro}0`]: 0,
        [`${otro}1`]: 1,
      };
      const linea = {
        type: 'line',
        line: { color: ACENTO, width: 1.5, dash: 'dashdot' },
        [`${eje}ref`]: `${eje}${panel}`,
        [`${otro}ref`]: `${otro}${panel} domain`,
        [`${eje}0`]: o.meta,
        [`${eje}1`]: o.meta,
        [`${otro}0`]: 0,
        [`${otro}1`]: 1,
      };
      shapes.push(banda, linea);
    }
    if (x && y)
      marcas.push({
        type: 'scatter',
        x: [x.meta],
        y: [y.meta],
        xaxis: `x${panel}`,
        yaxis: `y${panel}`,
        mode: 'markers',
        marker: { size: 22, symbol: 'circle-open', color: ACENTO, line: { width: 2.5, color: ACENTO } },
        name: 'Objetivo',
        showlegend: false,
        hovertemplate: `Objetivo<br>${x.etiqueta} = %{x}<br>${y.etiqueta} = %{y}<extra></extra>`,
      });
  }
  layout.shapes = shapes;
  return { data: [...fantasmas, ...actual.data, ...marcas], layout, ...(actual.movil ? { movil: actual.movil } : {}) };
}

/* ------------------------------------------------------------------ progreso en el navegador */

export interface Progreso {
  resueltos: Record<string, true>;
  racha: number;
  mejorRacha: number;
}

export const CLAVE_PROGRESO = 'uifce.desafio.v1';

export const progresoVacio = (): Progreso => ({ resueltos: {}, racha: 0, mejorRacha: 0 });

/** Descarta lo que no tenga la forma esperada (datos viejos, editados a mano o corruptos). */
export function sanear(datos: unknown): Progreso {
  const p = progresoVacio();
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return p;
  const d = datos as Partial<Progreso>;
  if (d.resueltos && typeof d.resueltos === 'object' && !Array.isArray(d.resueltos))
    for (const [k, v] of Object.entries(d.resueltos)) if (v === true) p.resueltos[k] = true;
  const entero = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0);
  p.racha = entero(d.racha);
  p.mejorRacha = Math.max(entero(d.mejorRacha), p.racha);
  return p;
}

export function leerProgreso(): Progreso {
  try {
    const crudo = globalThis.localStorage?.getItem(CLAVE_PROGRESO);
    return crudo ? sanear(JSON.parse(crudo)) : progresoVacio();
  } catch {
    return progresoVacio();
  }
}

export function guardarProgreso(p: Progreso): void {
  try {
    globalThis.localStorage?.setItem(CLAVE_PROGRESO, JSON.stringify(p));
  } catch {
    /* sin almacenamiento: el progreso dura lo que dure la página */
  }
}

/**
 * Registra el resultado de una verificación (función pura). La racha cuenta retos nuevos resueltos
 * seguidos; un intento fallido la reinicia y repetir un reto ya resuelto no la cambia.
 */
export function registrarIntento(p: Progreso, retoId: string, ok: boolean): Progreso {
  if (!ok) return { ...p, racha: 0 };
  if (p.resueltos[retoId]) return p;
  const racha = p.racha + 1;
  return { resueltos: { ...p.resueltos, [retoId]: true }, racha, mejorRacha: Math.max(p.mejorRacha, racha) };
}
