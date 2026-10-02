/* eslint-disable @typescript-eslint/no-explicit-any */
import { AfterViewInit, Component, ElementRef, OnDestroy, effect, input, viewChild } from '@angular/core';
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

/** Gráfica Plotly. Carga plotly.js bajo demanda, redibuja con Plotly.react y sigue el tamaño de su contenedor. */
@Component({
  selector: 'app-plotly-chart',
  template: `<div #cont class="grafica" [style.height.px]="alto()"></div>`,
  styles: `
    :host { display: block; min-width: 0; }
    .grafica { width: 100%; }
  `,
})
export class PlotlyChart implements AfterViewInit, OnDestroy {
  readonly fig = input.required<Figura>();
  readonly alto = input(460);

  private readonly cont = viewChild.required<ElementRef<HTMLDivElement>>('cont');
  private Plotly: any = null;
  private destruido = false;
  private observador?: ResizeObserver;
  private cuadro = 0;

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

  ngAfterViewInit(): void {
    // Al ocultar/mostrar el panel de parámetros cambia el ancho del contenedor: se reajusta el gráfico.
    const el = this.cont().nativeElement;
    this.observador = new ResizeObserver(() => {
      cancelAnimationFrame(this.cuadro);
      this.cuadro = requestAnimationFrame(() => {
        if (this.Plotly && el.offsetWidth > 0 && el.querySelector('.plotly')) this.Plotly.Plots.resize(el);
      });
    });
    this.observador.observe(el);
  }

  ngOnDestroy(): void {
    this.destruido = true;
    cancelAnimationFrame(this.cuadro);
    this.observador?.disconnect();
    if (this.Plotly) this.Plotly.purge(this.cont().nativeElement);
  }
}
