import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CREADOR, MATERIAS, TITULO_APP, VERSION, totalSimuladores } from '../core/catalogo';
import { Figura } from '../core/tipos';
import { ACENTO, COLORES, layoutBase } from '../core/tema';
import { linspace } from '../core/numerico';
import { PlotlyChart } from '../shared/plotly-chart';

/** Gráfica de muestra: oferta y demanda con equilibrio (equivale a figura_portada). */
export function figuraPortada(desplazamiento = 0): Figura {
  const q = linspace(0, 100, 101);
  const [a, b, c, d] = [80 + desplazamiento, 0.6, 10, 0.5]; // P = a - bQ ; P = c + dQ
  const qEq = (a - c) / (b + d);
  const pEq = c + d * qEq;
  const layout = layoutBase({
    xaxis: { title: { text: 'Cantidad (Q)' }, range: [0, 100] },
    yaxis: { title: { text: 'Precio (P)' }, range: [0, 110] },
    legend: { orientation: 'h', y: 1.08, x: 0 },
    margin: { l: 56, r: 16, t: 40, b: 48 },
    uirevision: 'portada',
  });
  return {
    layout,
    data: [
      { type: 'scatter', x: q, y: q.map((v) => c + d * v), name: 'Oferta', mode: 'lines', line: { width: 3, color: '#5B9BFF' }, hovertemplate: 'Q = %{x:.0f}<br>P = %{y:.1f}<extra>Oferta</extra>' },
      { type: 'scatter', x: q, y: q.map((v) => a - b * v), name: 'Demanda', mode: 'lines', line: { width: 3, color: '#FF7A85' }, hovertemplate: 'Q = %{x:.0f}<br>P = %{y:.1f}<extra>Demanda</extra>' },
      { type: 'scatter', x: [qEq, qEq, 0], y: [0, pEq, pEq], mode: 'lines', line: { dash: 'dot', width: 1.5, color: COLORES.textoSuave }, hoverinfo: 'skip', showlegend: false },
      { type: 'scatter', x: [qEq], y: [pEq], name: 'Equilibrio', mode: 'markers', marker: { size: 13, color: ACENTO, line: { width: 2, color: COLORES.fondo } }, hovertemplate: 'Q* = %{x:.1f}<br>P* = %{y:.1f}<extra>Equilibrio</extra>' },
    ],
  };
}

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, PlotlyChart],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio {
  protected readonly titulo = TITULO_APP;
  protected readonly creador = CREADOR;
  protected readonly version = VERSION;
  protected readonly materias = MATERIAS;
  protected readonly total = totalSimuladores();

  protected readonly desplazamiento = signal(0);
  protected readonly fig = computed(() => figuraPortada(this.desplazamiento()));

  protected alMover(ev: Event): void {
    this.desplazamiento.set(Number((ev.target as HTMLInputElement).value));
  }
}
