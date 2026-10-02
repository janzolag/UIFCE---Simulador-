/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, ElementRef, OnDestroy, effect, input, viewChild } from '@angular/core';
import { Figura } from '../core/tipos';

const CONFIG = {
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  toImageButtonOptions: { format: 'png', filename: 'simulador_uifce', scale: 2 },
};

let plotlyPromise: Promise<any> | null = null;
function cargarPlotly(): Promise<any> {
  plotlyPromise ??= import('plotly.js-dist-min').then((m: any) => m.default ?? m);
  return plotlyPromise;
}

/** Gráfica Plotly. Carga plotly.js bajo demanda y redibuja con Plotly.react. */
@Component({
  selector: 'app-plotly-chart',
  template: `<div #cont class="grafica" [style.height.px]="alto()"></div>`,
  styles: `
    .grafica { width: 100%; }
  `,
})
export class PlotlyChart implements OnDestroy {
  readonly fig = input.required<Figura>();
  readonly alto = input(460);

  private readonly cont = viewChild.required<ElementRef<HTMLDivElement>>('cont');
  private Plotly: any = null;
  private destruido = false;

  constructor() {
    effect(() => {
      const f = this.fig();
      const alto = this.alto();
      const el = this.cont().nativeElement;
      cargarPlotly().then((P) => {
        if (this.destruido) return;
        this.Plotly = P;
        P.react(el, f.data, { ...f.layout, autosize: true, height: alto }, CONFIG);
      });
    });
  }

  ngOnDestroy(): void {
    this.destruido = true;
    if (this.Plotly) this.Plotly.purge(this.cont().nativeElement);
  }
}
