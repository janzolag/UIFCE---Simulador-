import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { buscarMateria, buscarSimulador } from '../core/catalogo';
import { ErrorParametro } from '../core/errores';
import { Params, Simulacion, SimuladorDef } from '../core/tipos';
import { aviso, figuraVacia } from '../core/tema';
import { CARGADORES } from '../micro1/registro';
import { ControlPanel } from '../shared/control-panel';
import { MathEquation } from '../shared/math-equation';
import { PlotlyChart } from '../shared/plotly-chart';
import { ResultRenderer } from '../shared/result-renderer';
import { NoEncontrada } from './no-encontrada';

/** Página genérica de simulador: se arma a partir de la definición registrada. */
@Component({
  selector: 'app-simulador',
  imports: [RouterLink, ControlPanel, MathEquation, PlotlyChart, ResultRenderer, NoEncontrada],
  templateUrl: './simulador.html',
  styleUrl: './simulador.scss',
})
export class SimuladorPage {
  private readonly ruta = inject(ActivatedRoute);
  private readonly ids = toSignal(
    combineLatest([this.ruta.paramMap]).pipe(map(([p]) => ({ materia: p.get('materia') ?? '', sim: p.get('sim') ?? '' }))),
    { initialValue: { materia: '', sim: '' } },
  );

  protected readonly materia = computed(() => buscarMateria(this.ids().materia));
  protected readonly sim = computed(() => {
    const m = this.materia();
    return m ? buscarSimulador(m, this.ids().sim) : undefined;
  });

  protected readonly def = signal<SimuladorDef | null>(null);
  protected readonly params = signal<Params>({});
  protected readonly cargando = signal(false);
  protected readonly falla = signal(false);

  /** Resultado del cálculo; un ErrorParametro se muestra como aviso rojo (como en la versión Dash). */
  protected readonly resultado = computed<Simulacion | null>(() => {
    const d = this.def();
    if (!d) return null;
    try {
      return d.calcular(this.params());
    } catch (e) {
      if (e instanceof ErrorParametro) return { fig: figuraVacia(e.message), panel: [aviso(e.message, 'error')] };
      throw e;
    }
  });

  constructor() {
    effect(() => {
      const { materia, sim } = this.ids();
      const cargador = CARGADORES[materia]?.[sim];
      this.def.set(null);
      this.falla.set(false);
      if (!cargador) return;
      this.cargando.set(true);
      cargador()
        .then((d) => {
          if (this.ids().materia !== materia || this.ids().sim !== sim) return;
          this.params.set({ ...d.defecto });
          this.def.set(d);
        })
        .catch(() => this.falla.set(true))
        .finally(() => this.cargando.set(false));
    });
  }

  protected alCambiar(ev: { id: string; valor: number | string }): void {
    const d = this.def();
    if (!d) return;
    const anterior = this.params();
    let nuevo: Params = { ...anterior, [ev.id]: ev.valor };
    const ajuste = d.alCambiar?.(anterior, nuevo);
    if (ajuste) nuevo = { ...nuevo, ...ajuste };
    this.params.set(nuevo);
  }
}
