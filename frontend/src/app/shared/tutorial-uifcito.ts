import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { Tutorial } from '../core/tutorial';

/** Capa del tutorial: UIFCITO, su globo de diálogo y el recuadro que resalta cada elemento. */
@Component({
  selector: 'app-tutorial-uifcito',
  templateUrl: './tutorial-uifcito.html',
  styleUrl: './tutorial-uifcito.scss',
  host: {
    '(document:keydown.arrowright)': 'teclas($event, "sig")',
    '(document:keydown.arrowleft)': 'teclas($event, "ant")',
    '(document:keydown.escape)': 'teclas($event, "esc")',
  },
})
export class TutorialUifcito {
  protected readonly t = inject(Tutorial);
  protected readonly puntos = Array.from({ length: this.t.total });
  private readonly principal = viewChild<ElementRef<HTMLButtonElement>>('principal');

  constructor() {
    // El foco acompaña al botón principal de cada paso (teclado y lectores de pantalla).
    effect(() => {
      this.t.indice();
      setTimeout(() => this.principal()?.nativeElement.focus({ preventScroll: true }), 60);
    });
  }

  protected teclas(ev: Event, accion: 'sig' | 'ant' | 'esc'): void {
    if (this.t.indice() === null) return;
    ev.preventDefault();
    if (accion === 'sig') this.t.siguiente();
    else if (accion === 'ant') this.t.anterior();
    else this.t.terminar();
  }
}
