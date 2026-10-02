import { Component, computed, input, output } from '@angular/core';
import { Control, GrupoControles, Params } from '../core/tipos';
import { fmt } from '../core/formato';

/** Panel de parámetros: sliders y selectores en grupos (según la definición del simulador). */
@Component({
  selector: 'app-control-panel',
  templateUrl: './control-panel.html',
  styleUrl: './control-panel.scss',
})
export class ControlPanel {
  readonly grupos = input.required<GrupoControles[]>();
  readonly params = input.required<Params>();
  readonly cambio = output<{ id: string; valor: number | string }>();

  protected readonly visibles = computed(() => this.grupos().filter((g) => !g.visibleSi || g.visibleSi(this.params())));

  protected valor(c: Control): number | string {
    return this.params()[c.id];
  }

  protected texto(c: Control): string {
    return fmt(this.params()[c.id] as number, 3);
  }

  protected alSlider(c: Control, ev: Event): void {
    const v = Number((ev.target as HTMLInputElement).value);
    if (Number.isFinite(v)) this.cambio.emit({ id: c.id, valor: v });
  }

  protected alElegir(c: Control, valor: string): void {
    this.cambio.emit({ id: c.id, valor });
  }
}
