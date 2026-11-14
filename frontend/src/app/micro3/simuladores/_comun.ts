import { Bloque } from '../../core/tipos';
import { referencia } from '../../core/tema';

/**
 * Referencias de Micro 3 (programa de la FCE). Los textos no están en el proyecto: se cita autor y tema,
 * sin páginas ni citas textuales; la notación es la estándar de los manuales intermedios.
 */
export const AUTOR_MONSALVE_FALLAS = 'Monsalve, Fallas de mercado (2025)';
export const AUTOR_LOZANO = 'Lozano y Salamanca, Interacciones estratégicas (2024)';
export const refMonsalve = (t: string): Bloque => referencia(t, AUTOR_MONSALVE_FALLAS);
export const refLozano = (t: string): Bloque => referencia(t, AUTOR_LOZANO);
