import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';
import { Params, Teoria } from '../core/tipos';
import { MathEquation } from './math-equation';

/** Modal «Teoría»: idea clave, fórmulas y un ejercicio que se resuelve sobre la gráfica. */
@Component({
  selector: 'app-teoria-modal',
  imports: [MathEquation],
  templateUrl: './teoria-modal.html',
  styleUrl: './teoria-modal.scss',
})
export class TeoriaModal {
  readonly teoria = input<Teoria | null>(null);
  readonly abierto = input(false);
  readonly cerrar = output<void>();
  readonly cargar = output<Params>();

  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  constructor() {
    // <dialog> nativo: trampa de foco, Esc y fondo oscuro los resuelve el navegador.
    effect(() => {
      const d = this.dialogo().nativeElement;
      if (this.abierto() && this.teoria()) {
        if (!d.open) d.showModal();
      } else if (d.open) d.close();
    });
  }

  /** Clic en el fondo (fuera de la tarjeta) cierra el modal. */
  protected alClicDialogo(ev: MouseEvent): void {
    if (ev.target === this.dialogo().nativeElement) this.cerrar.emit();
  }
}
