import { Component, input } from '@angular/core';
import { Bloque } from '../core/tipos';
import { fmt } from '../core/formato';

/** Dibuja los bloques de resultados (tablas, avisos, lecturas...) de un simulador. */
@Component({
  selector: 'app-result-renderer',
  imports: [ResultRenderer],
  templateUrl: './result-renderer.html',
  styleUrl: './result-renderer.scss',
})
export class ResultRenderer {
  readonly bloques = input.required<Bloque[]>();
  protected readonly fmt = fmt;

  protected esTexto(v: unknown): v is string {
    return typeof v === 'string';
  }
}
