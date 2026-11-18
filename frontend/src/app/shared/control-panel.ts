import { Component, computed, input, output } from '@angular/core';
import { Control, GrupoControles, Params } from '../core/tipos';
import { acotar, parsearNumero, textoEntrada } from './entrada-numerica';

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

  protected textoNum(c: Control): string {
    return textoEntrada(this.params()[c.id]);
  }

  /** Posición del valor dentro del rango, para rellenar la pista del deslizador. */
  protected porcentaje(c: Control): string {
    const min = c.min ?? 0;
    const max = c.max ?? 1;
    const v = Number(this.params()[c.id]);
    return `${Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100))}%`;
  }

  protected alSlider(c: Control, ev: Event): void {
    const v = Number((ev.target as HTMLInputElement).value);
    if (Number.isFinite(v)) this.cambio.emit({ id: c.id, valor: v });
  }

  /** Casilla numérica: acota al rango del deslizador; si no es un número, vuelve al valor actual. */
  protected alEscribir(c: Control, ev: Event): void {
    const el = ev.target as HTMLInputElement;
    const leido = parsearNumero(el.value);
    if (leido === null) {
      el.value = this.textoNum(c);
      return;
    }
    const v = acotar(leido, c.min, c.max);
    // El valor puede no cambiar (p. ej. al acotar): se reescribe la casilla para que muestre el valor real.
    el.value = textoEntrada(v);
    if (v !== Number(this.params()[c.id])) this.cambio.emit({ id: c.id, valor: v });
  }

  protected restaurar(c: Control, ev: Event): void {
    (ev.target as HTMLInputElement).value = this.textoNum(c);
  }

  protected alElegir(c: Control, valor: string): void {
    this.cambio.emit({ id: c.id, valor });
  }
}
