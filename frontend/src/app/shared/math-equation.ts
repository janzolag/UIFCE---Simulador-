import { Component, ElementRef, effect, input, viewChild } from '@angular/core';
import katex from 'katex';

/** Ecuación LaTeX (con o sin delimitadores $...$) renderizada con KaTeX. */
@Component({
  selector: 'app-math-equation',
  template: `<div #cont class="ecuacion" [class.ecuacion-mini]="mini()"></div>`,
  styles: `
    :host { display: block; }
  `,
})
export class MathEquation {
  readonly tex = input.required<string>();
  readonly mini = input(false);
  /** Ecuación centrada en su propia línea (fórmulas destacadas). */
  readonly bloque = input(false);

  private readonly cont = viewChild.required<ElementRef<HTMLDivElement>>('cont');

  constructor() {
    effect(() => {
      const limpio = this.tex().trim().replace(/^\$+|\$+$/g, '');
      katex.render(limpio, this.cont().nativeElement, { throwOnError: false, displayMode: this.bloque() });
    });
  }
}
