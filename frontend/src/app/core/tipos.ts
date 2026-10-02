/** Contratos comunes de los simuladores (equivalente a simuladores/base.py). */

export type Valor = number | string;
export type Params = Record<string, Valor>;

export interface Opcion {
  valor: string;
  etiqueta: string;
}

export interface Control {
  id: string;
  etiqueta: string;
  tipo: 'slider' | 'selector';
  min?: number;
  max?: number;
  paso?: number;
  opciones?: Opcion[];
}

export interface GrupoControles {
  titulo?: string;
  controles: Control[];
  /** Si se define, el grupo solo se muestra cuando devuelve true. */
  visibleSi?: (p: Params) => boolean;
}

/** Bloques de resultados (datos puros; los dibuja ResultRenderer). */
export type Bloque =
  | { t: 'tabla'; filas: (string | number | null)[][]; encabezado?: string[] }
  | { t: 'aviso'; texto: string; nivel?: 'info' | 'error' }
  | { t: 'lectura'; titulo: string; hijos: Bloque[] }
  | { t: 'texto'; texto: string; clase?: string }
  | { t: 'ref'; texto: string }
  | { t: 'rejilla'; hijos: Bloque[] };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Figura {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  layout: any;
}

export interface Simulacion {
  fig: Figura;
  panel: Bloque[];
}

export interface SimuladorDef {
  defecto: Params;
  grupos: GrupoControles[];
  alto?: number;
  calcular(p: Params): Simulacion;
  /** Permite reajustar parámetros al cambiar uno (p. ej. preset de Giffen). */
  alCambiar?(anterior: Params, nuevo: Params): Params | null;
}

export interface SimuladorMeta {
  id: string;
  nombre: string;
  descripcion: string;
  ecuacion: string;
  ecuacionResumen?: string;
  listo: boolean;
}

export interface Materia {
  id: string;
  nombre: string;
  sigla: string;
  color: string;
  descripcion: string;
  simuladores: SimuladorMeta[];
}
