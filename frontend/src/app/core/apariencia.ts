import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Materia } from './tipos';

export type Preferencia = 'claro' | 'oscuro' | 'sistema';
export type Tema = 'claro' | 'oscuro';

/** Clave de localStorage (la lee también el script anti-destello de index.html). */
export const CLAVE_TEMA = 'uifce-tema';
const CLAVE_NOVEDAD = 'uifce-config-vista';
/** Quien entra por primera vez ve el oscuro de siempre. */
export const PREFERENCIA_INICIAL: Preferencia = 'oscuro';

const COLOR_BARRA: Record<Tema, string> = { oscuro: '#0e1116', claro: '#f4f6f9' };

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null; // modo incógnito o almacenamiento bloqueado: no debe romper nada
  }
}

function guardar(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* sin almacenamiento: la preferencia dura solo esta visita */
  }
}

export const esPreferencia = (v: unknown): v is Preferencia => v === 'claro' || v === 'oscuro' || v === 'sistema';

/**
 * Apariencia del simulador: modo claro, oscuro o el del sistema. Escribe `data-tema` en <html>
 * (el CSS y las gráficas leen el tema efectivo) y recuerda la elección en este navegador.
 */
@Injectable({ providedIn: 'root' })
export class Apariencia {
  private readonly doc = inject(DOCUMENT);

  readonly preferencia = signal<Preferencia>(this.preferenciaGuardada());
  /** Tema del sistema operativo, actualizado en vivo. */
  private readonly sistemaOscuro = signal(true);
  readonly temaEfectivo = computed<Tema>(() => {
    const p = this.preferencia();
    if (p !== 'sistema') return p;
    return this.sistemaOscuro() ? 'oscuro' : 'claro';
  });
  readonly claro = computed(() => this.temaEfectivo() === 'claro');

  /** Punto de novedad sobre el engranaje: se muestra hasta que se abre el panel por primera vez. */
  readonly novedad = signal(leer(CLAVE_NOVEDAD) !== '1');

  constructor() {
    const vista = this.doc.defaultView;
    if (vista && typeof vista.matchMedia === 'function') {
      const consulta = vista.matchMedia('(prefers-color-scheme: dark)');
      this.sistemaOscuro.set(consulta.matches);
      const alCambiar = (e: MediaQueryListEvent) => this.sistemaOscuro.set(e.matches);
      consulta.addEventListener?.('change', alCambiar);
      inject(DestroyRef).onDestroy(() => consulta.removeEventListener?.('change', alCambiar));
    }

    effect(() => {
      const tema = this.temaEfectivo();
      const raiz = this.doc.documentElement;
      raiz.setAttribute('data-tema', tema);
      this.doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[tema]);
    });
  }

  elegir(p: Preferencia): void {
    this.preferencia.set(p);
    guardar(CLAVE_TEMA, p);
  }

  marcarNovedadVista(): void {
    if (!this.novedad()) return;
    this.novedad.set(false);
    guardar(CLAVE_NOVEDAD, '1');
  }

  /** Color de la materia según el tema (el claro es más oscuro para leerse sobre blanco). */
  colorMateria(m: Pick<Materia, 'color' | 'colorClaro'>): string {
    return this.claro() ? m.colorClaro : m.color;
  }

  private preferenciaGuardada(): Preferencia {
    const v = leer(CLAVE_TEMA);
    return esPreferencia(v) ? v : PREFERENCIA_INICIAL;
  }
}
