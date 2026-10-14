import { Bloque, GrupoControles } from '../../core/tipos';
import { referencia } from '../../core/tema';

/** Texto de referencia de Macro 1 (sustituye al «Monsalve (2017)» de Micro 1). */
export const AUTOR = 'Blanchard (2017)';

export const ref = (t: string): Bloque => referencia(t, AUTOR);

/** Diferencia legible: «+12.5» o «−3». */
export const delta = (v: number): number => (Math.abs(v) < 1e-9 ? 0 : v);

/** Controles del mercado de bienes en economía cerrada (consumo, inversión, política fiscal). */
export const GRUPOS_BIENES: GrupoControles[] = [
  {
    titulo: 'Consumo: C = c₀ + c₁·(Y − T)',
    controles: [
      { id: 'c0', etiqueta: 'Consumo autónomo c₀', tipo: 'slider', min: 0, max: 300, paso: 5 },
      {
        id: 'c1',
        etiqueta: 'Propensión a consumir c₁',
        tipo: 'slider',
        min: 0,
        max: 0.9,
        paso: 0.01,
      },
    ],
  },
  {
    titulo: 'Inversión: I = b₀ + b₁·Y − b₂·i',
    controles: [
      { id: 'b0', etiqueta: 'Inversión autónoma b₀', tipo: 'slider', min: 0, max: 300, paso: 5 },
      {
        id: 'b1',
        etiqueta: 'Sensibilidad a las ventas b₁',
        tipo: 'slider',
        min: 0,
        max: 0.3,
        paso: 0.01,
      },
      { id: 'b2', etiqueta: 'Sensibilidad a la tasa b₂', tipo: 'slider', min: 0, max: 40, paso: 1 },
    ],
  },
  {
    titulo: 'Política fiscal inicial',
    controles: [
      { id: 'G', etiqueta: 'Gasto público G', tipo: 'slider', min: 0, max: 500, paso: 5 },
      { id: 'T', etiqueta: 'Impuestos T', tipo: 'slider', min: 0, max: 400, paso: 5 },
    ],
  },
];
