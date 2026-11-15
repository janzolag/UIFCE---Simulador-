/* eslint-disable @typescript-eslint/no-explicit-any */
import { AfterViewInit, Component, ElementRef, OnDestroy, computed, effect, input, viewChild } from '@angular/core';
import { Figura } from '../core/tipos';
import { rotularAreas } from './rotulos';

/** Solo se conserva la cámara (descargar imagen); todo lo demás se maneja con rueda, pellizco y doble clic. */
const CONFIG = {
  displaylogo: false,
  responsive: true,
  scrollZoom: true, // zoom suave con la rueda del mouse
  doubleClick: 'reset+autosize', // doble clic: vuelve a los límites económicos originales
  modeBarButtonsToRemove: [
    'zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d',
    'autoScale2d', 'resetScale2d', 'hoverClosestCartesian', 'hoverCompareCartesian',
    'sendDataToCloud', 'editInChartStudio', 'toggleSpikelines',
  ],
  // Lista blanca: garantiza que, aunque Plotly agregue botones nuevos, solo quede la cámara.
  modeBarButtons: [['toImage']],
  toImageButtonOptions: { format: 'png', filename: 'simulador_uifce', scale: 2 },
};

let plotlyPromise: Promise<any> | null = null;
function cargarPlotly(): Promise<any> {
  plotlyPromise ??= import('plotly.js-dist-min').then((m: any) => m.default ?? m);
  return plotlyPromise;
}

/** Móvil o pantalla táctil: aquí solo el pellizco de dos dedos puede hacer zoom. */
const consultaMovil = '(max-width: 900px), (pointer: coarse)';
const esMovil = (): boolean => typeof matchMedia === 'function' && matchMedia(consultaMovil).matches;

const ES_EJE = /^[xy]axis\d*$/;

/**
 * Límites de zoom por eje: nunca por debajo de 0 (ni cuadrantes negativos) ni más allá de la vista
 * original (rango definido, o el máximo de los datos con un pequeño margen).
 */
function limitarEjes(layout: any, data: any[]): void {
  const maximos: Record<string, number> = {};
  for (const t of data) {
    for (const [dato, eje] of [[t.x, t.xaxis ?? 'x'], [t.y, t.yaxis ?? 'y']] as [any, string][]) {
      if (!Array.isArray(dato)) continue;
      const nombre = (eje[0] === 'x' ? 'xaxis' : 'yaxis') + eje.slice(1).replace(/^1$/, '');
      for (const v of dato) if (typeof v === 'number' && Number.isFinite(v) && v > (maximos[nombre] ?? -Infinity)) maximos[nombre] = v;
    }
  }
  const ejes = new Set<string>(Object.keys(layout).filter((k) => ES_EJE.test(k)));
  ejes.add('xaxis');
  ejes.add('yaxis');
  for (const nombre of ejes) {
    const ax = (layout[nombre] ??= {});
    const rango: number[] | undefined = ax.range;
    if (rango && rango.length === 2) {
      ax.minallowed = Math.min(0, rango[0], rango[1]);
      ax.maxallowed = Math.max(rango[0], rango[1]);
    } else {
      ax.rangemode = 'nonnegative';
      ax.minallowed = 0;
      if (maximos[nombre] !== undefined && maximos[nombre] > 0) ax.maxallowed = maximos[nombre] * 1.08;
    }
  }
}

/** Sobrescribe dominios y otras propiedades de primer nivel de cada eje (copia superficial por eje). */
function aplicarMovil(layout: any, extra: any): void {
  for (const [k, v] of Object.entries<any>(extra)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && layout[k] && typeof layout[k] === 'object')
      layout[k] = { ...layout[k], ...v };
    else layout[k] = v;
  }
}

/**
 * Pantallas angostas: los títulos de panel (anotaciones sin flecha ancladas arriba de un panel) son de
 * una sola línea y en 325 px se salían del lienzo (p. ej. «Caja de Edgeworth (origen de A…»). Aquí se
 * parten en líneas y, si hace falta, se reduce la letra hasta que quepan en el espacio disponible desde
 * su anclaje. No cambia colores ni posición; solo actúa cuando el texto estimado no cabe.
 */
export function ajustarTitulosAngostos(layout: any, ancho: number): void {
  const anns: any[] | undefined = layout?.annotations;
  if (!anns?.length || !(ancho > 0)) return;
  const m = { l: 80, r: 80, ...(layout.margin ?? {}) };
  const anchoPapel = Math.max(1, ancho - m.l - m.r);
  const baseT: number = layout.margin?.t ?? 80;
  const aPapel = (a: any): number | null => {
    const ref = String(a.xref ?? 'x');
    if (ref === 'paper') return a.x;
    const dom = /^(x\d*) domain$/.exec(ref);
    if (!dom) return null; // anotaciones en coordenadas de datos (rótulos de curvas): no se tocan
    const eje = layout[`xaxis${dom[1].slice(1)}`];
    const [d0, d1] = eje?.domain ?? [0, 1];
    return d0 + a.x * (d1 - d0);
  };
  layout.annotations = anns.map((a) => {
    if (a?.showarrow !== false || typeof a.text !== 'string' || a.yanchor !== 'bottom') return a;
    const px = aPapel(a);
    if (px === null || !Number.isFinite(px)) return a;
    const pos = m.l + px * anchoPapel;
    const ancla = a.xanchor ?? 'center';
    const libre = ancla === 'left' ? ancho - pos - 4 : ancla === 'right' ? pos - 4 : 2 * Math.min(pos, ancho - pos) - 8;
    const negrita = /^<b>[\s\S]*<\/b>$/.test(a.text);
    const plano = a.text.replace(/<\/?b>/g, '');
    if (/<br>/i.test(plano)) return a;
    let fuente: number = a.font?.size ?? 12;
    const cabe = (f: number) => Math.max(8, Math.floor(libre / (0.58 * f)));
    if (plano.length <= cabe(fuente)) return a;
    fuente = Math.max(10, Math.min(fuente, 11));
    const max = cabe(fuente);
    const lineas: string[] = [];
    for (const palabra of plano.split(' ')) {
      const ult = lineas.length - 1;
      if (ult >= 0 && (lineas[ult] + ' ' + palabra).length <= max) lineas[ult] += ' ' + palabra;
      else lineas.push(palabra);
    }
    const texto = lineas.join('<br>');
    // Título del panel superior: las líneas extra crecen hacia arriba; se agranda el margen para que
    // no se monten sobre el área de la gráfica.
    const yref = String(a.yref ?? 'y');
    const dy = /^(y\d*) domain$/.exec(yref);
    const tope = yref === 'paper' ? a.y : dy ? (layout[`yaxis${dy[1].slice(1)}`]?.domain ?? [0, 1])[1] : 0;
    if (lineas.length > 1 && tope >= 0.97) {
      const extra = Math.ceil((lineas.length - 1) * fuente * 1.3);
      layout.margin = { ...(layout.margin ?? {}), t: Math.max(layout.margin?.t ?? baseT, baseT + extra) };
    }
    return { ...a, text: negrita ? `<b>${texto}</b>` : texto, font: { ...(a.font ?? {}), size: fuente } };
  });
}

/** Gráfica Plotly. Carga plotly.js bajo demanda, redibuja con Plotly.react y sigue el tamaño de su contenedor. */
@Component({
  selector: 'app-plotly-chart',
  template: `<div #cont class="grafica" [style.height.px]="altoEfectivo()"></div>`,
  styles: `
    :host { display: block; min-width: 0; }
    .grafica { width: 100%; }
    /* Un dedo solo desplaza la página en vertical; el pellizco lo gestiona el componente. */
    :host ::ng-deep .grafica, :host ::ng-deep .grafica * { touch-action: pan-y !important; }
  `,
})
export class PlotlyChart implements AfterViewInit, OnDestroy {
  readonly fig = input.required<Figura>();
  readonly alto = input(460);
  /** En móvil, las figuras de varios paneles se apilan y piden más alto. */
  protected readonly altoEfectivo = computed(() => {
    const f = this.fig();
    return f.movil && esMovil() ? f.movil.alto : this.alto();
  });

  private readonly cont = viewChild.required<ElementRef<HTMLDivElement>>('cont');
  private Plotly: any = null;
  private destruido = false;
  private observador?: ResizeObserver;
  private cuadro = 0;
  private quitarGestos?: () => void;

  constructor() {
    effect(() => {
      const f = this.fig();
      const alto = this.altoEfectivo();
      const el = this.cont().nativeElement;
      cargarPlotly().then((P) => {
        if (this.destruido) return;
        this.Plotly = P;
        const layout = { ...f.layout, autosize: true, height: alto };
        // Áreas sombreadas sin leyenda (excedentes, pérdida irrecuperable…): se rotulan sobre la gráfica.
        const rotulos = rotularAreas(f.data, f.layout);
        if (rotulos.length) layout.annotations = [...(f.layout?.annotations ?? []), ...rotulos];
        if (f.movil && esMovil()) aplicarMovil(layout, f.movil.layout);
        if (esMovil()) ajustarTitulosAngostos(layout, el.clientWidth);
        // Móvil: sin arrastre (dragmode false); escritorio: arrastrar desplaza y la rueda hace zoom.
        layout.dragmode = esMovil() ? false : 'pan';
        limitarEjes(layout, f.data);
        P.react(el, f.data, layout, CONFIG);
      });
    });
  }

  ngAfterViewInit(): void {
    const el = this.cont().nativeElement;
    // Al ocultar/mostrar el panel de parámetros cambia el ancho del contenedor: se reajusta el gráfico.
    this.observador = new ResizeObserver(() => {
      cancelAnimationFrame(this.cuadro);
      this.cuadro = requestAnimationFrame(() => {
        if (this.Plotly && el.offsetWidth > 0 && el.querySelector('.plotly')) this.Plotly.Plots.resize(el);
      });
    });
    this.observador.observe(el);
    this.quitarGestos = this.activarGestos(el);
  }

  ngOnDestroy(): void {
    this.destruido = true;
    cancelAnimationFrame(this.cuadro);
    this.observador?.disconnect();
    this.quitarGestos?.();
    if (this.Plotly) this.Plotly.purge(this.cont().nativeElement);
  }

  /**
   * Táctil: un dedo no toca la gráfica (solo desplaza la página); dos dedos hacen zoom con pellizco,
   * respetando los límites de cada eje.
   */
  private activarGestos(el: HTMLElement): () => void {
    let inicio: {
      dist: number;
      ejes: { nombre: string; vertical: boolean; r0: number[]; offset: number; largo: number; min: number; max: number; foco: number }[];
    } | null = null;
    let pendiente: Record<string, number[]> | null = null;
    let ocupado = false;

    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const centro = (t: TouchList, caja: DOMRect) => ({
      x: (t[0].clientX + t[1].clientX) / 2 - caja.left,
      y: (t[0].clientY + t[1].clientY) / 2 - caja.top,
    });
    const frac = (e: { vertical: boolean; offset: number; largo: number }, c: { x: number; y: number }) =>
      e.vertical ? 1 - (c.y - e.offset) / e.largo : (c.x - e.offset) / e.largo;

    // Una actualización a la vez: mientras Plotly redibuja se acumula solo el último estado del pellizco.
    const aplicar = (): void => {
      if (ocupado || !pendiente || !this.Plotly) return;
      const cambios: Record<string, number[]> = {};
      for (const [k, v] of Object.entries(pendiente)) cambios[`${k}.range`] = v;
      pendiente = null;
      ocupado = true;
      Promise.resolve(this.Plotly.relayout(el, cambios)).finally(() => {
        ocupado = false;
        aplicar();
      });
    };

    const alIniciar = (ev: TouchEvent) => {
      if (ev.touches.length < 2) {
        ev.stopPropagation(); // un dedo: Plotly no interviene; la página se desplaza sola
        inicio = null;
        return;
      }
      const gd: any = el;
      const fl = gd._fullLayout;
      if (!fl?._plots) return;
      const caja = el.getBoundingClientRect();
      const c = centro(ev.touches, caja);
      const ejes: NonNullable<typeof inicio>['ejes'] = [];
      for (const sp of Object.values<any>(fl._plots)) {
        const xa = sp.xaxis;
        const ya = sp.yaxis;
        if (!xa?.range || !ya?.range) continue;
        const dentroX = frac({ vertical: false, offset: xa._offset, largo: xa._length }, c);
        const dentroY = frac({ vertical: true, offset: ya._offset, largo: ya._length }, c);
        if (dentroX < 0 || dentroX > 1 || dentroY < 0 || dentroY > 1) continue; // el gesto fue en otro subgráfico
        for (const [ax, vertical, f] of [[xa, false, dentroX], [ya, true, dentroY]] as [any, boolean, number][]) {
          const r0 = [...ax.range] as number[];
          ejes.push({
            nombre: ax._name, vertical, r0, offset: ax._offset, largo: ax._length,
            min: Number.isFinite(ax.minallowed) ? ax.minallowed : -Infinity,
            max: Number.isFinite(ax.maxallowed) ? ax.maxallowed : Infinity,
            foco: r0[0] + f * (r0[1] - r0[0]),
          });
        }
      }
      inicio = ejes.length ? { dist: dist(ev.touches), ejes } : null;
      if (inicio) ev.preventDefault();
    };

    const alMover = (ev: TouchEvent) => {
      if (ev.touches.length < 2) {
        ev.stopPropagation();
        return;
      }
      if (!inicio) return;
      ev.preventDefault();
      const escala = Math.min(40, Math.max(0.05, dist(ev.touches) / inicio.dist));
      const c = centro(ev.touches, el.getBoundingClientRect());
      const cambios: Record<string, number[]> = {};
      for (const e of inicio.ejes) {
        let ancho = (e.r0[1] - e.r0[0]) / escala;
        ancho = Math.min(ancho, e.max - e.min); // nunca más allá de la vista original
        ancho = Math.max(ancho, (e.r0[1] - e.r0[0]) / 60);
        let lo = e.foco - frac(e, c) * ancho; // el punto pellizcado sigue bajo los dedos
        let hi = lo + ancho;
        if (lo < e.min) { lo = e.min; hi = lo + ancho; }
        if (hi > e.max) { hi = e.max; lo = hi - ancho; }
        cambios[e.nombre] = [lo, hi];
      }
      pendiente = cambios;
      aplicar();
    };

    const alTerminar = (ev: TouchEvent) => {
      if (ev.touches.length < 2) inicio = null;
    };

    // Fase de captura: se decide antes de que el evento llegue a Plotly.
    el.addEventListener('touchstart', alIniciar, { capture: true, passive: false });
    el.addEventListener('touchmove', alMover, { capture: true, passive: false });
    el.addEventListener('touchend', alTerminar, { capture: true, passive: true });
    el.addEventListener('touchcancel', alTerminar, { capture: true, passive: true });
    return () => {
      pendiente = null;
      el.removeEventListener('touchstart', alIniciar, true);
      el.removeEventListener('touchmove', alMover, true);
      el.removeEventListener('touchend', alTerminar, true);
      el.removeEventListener('touchcancel', alTerminar, true);
    };
  }
}
