import { Component, computed, input, output, signal } from '@angular/core';
import { Planteamientos as DefPlanteamientos, Valor } from '../core/tipos';

/**
 * Acordeón «Planteamiento del problema»: va debajo de la gráfica (no cambia su tamaño ni su estilo).
 * Cada opción es una formulación del modelo; al elegirla se fija el parámetro del simulador.
 */
@Component({
  selector: 'app-planteamientos',
  template: `
    <section class="planteamientos">
      <button
        type="button"
        class="cabeza"
        [attr.aria-expanded]="abierto()"
        aria-controls="planteamientos-cuerpo"
        (click)="abierto.set(!abierto())"
      >
        <span class="sobre">Planteamiento del problema</span>
        <span class="actual">{{ activo()?.titulo }}</span>
        <span class="flecha" [class.girada]="abierto()" aria-hidden="true">›</span>
      </button>
      @if (abierto()) {
        <div id="planteamientos-cuerpo" class="cuerpo" role="radiogroup" aria-label="Planteamiento del problema">
          @for (o of def().opciones; track o.valor) {
            <button
              type="button"
              role="radio"
              class="opcion"
              [class.activa]="o.valor === valor()"
              [attr.aria-checked]="o.valor === valor()"
              (click)="elegir.emit(o.valor)"
            >
              <span class="marca" aria-hidden="true"></span>
              <span class="textos">
                <span class="titulo">{{ o.titulo }}</span>
                @if (o.valor === valor()) {
                  <span class="resumen">{{ o.resumen }}</span>
                }
              </span>
            </button>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .planteamientos { margin-top: 10px; border: 1px solid var(--borde); border-radius: 12px; background: var(--panel); }
    .cabeza {
      display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; font: inherit; text-align: left;
      color: var(--texto); background: transparent; border: 0; border-radius: 12px; cursor: pointer;
      &:hover { background: var(--panel-hover); }
      &:focus-visible { outline: 2px solid var(--acento); outline-offset: -2px; }
    }
    .sobre { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--texto-suave); white-space: nowrap; }
    .actual { flex: 1; font-weight: 600; font-size: 0.9rem; color: var(--color-materia, var(--texto)); }
    .flecha { color: var(--texto-suave); font-size: 1.2rem; transition: transform 0.18s; &.girada { transform: rotate(90deg); } }
    .cuerpo { display: flex; flex-direction: column; gap: 4px; padding: 0 8px 8px; }
    .opcion {
      display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; font: inherit; text-align: left;
      color: var(--texto-suave); background: transparent; border: 1px solid transparent; border-radius: 10px; cursor: pointer;
      &:hover { background: var(--panel-hover); color: var(--texto); }
      &:focus-visible { outline: 2px solid var(--acento); outline-offset: -2px; }
      &.activa { color: var(--texto); border-color: var(--borde); background: var(--panel-hover); }
    }
    .marca {
      width: 12px; height: 12px; margin-top: 4px; border-radius: 50%; flex: none; border: 2px solid var(--texto-suave);
      .activa & { border-color: var(--color-materia, var(--acento)); background: var(--color-materia, var(--acento)); }
    }
    .textos { display: flex; flex-direction: column; gap: 2px; }
    .titulo { font-size: 0.9rem; font-weight: 550; }
    .resumen { font-size: 0.82rem; color: var(--texto-suave); }
    @media (max-width: 600px) { .sobre { display: none; } }
    @media (prefers-reduced-motion: reduce) { .flecha { transition: none; } }
  `,
})
export class PlanteamientosAcordeon {
  readonly def = input.required<DefPlanteamientos>();
  readonly valor = input<Valor | undefined>(undefined);
  readonly elegir = output<string>();

  protected readonly abierto = signal(true);
  protected readonly activo = computed(() => this.def().opciones.find((o) => o.valor === this.valor()) ?? null);
}
