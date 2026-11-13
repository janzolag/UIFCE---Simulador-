import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { buscarMateria, buscarSimulador } from '../core/catalogo';
import { ErrorParametro } from '../core/errores';
import { fmt } from '../core/formato';
import { figuraVacia } from '../core/tema';
import { CARGADORES } from '../core/registro';
import { Figura, GrupoControles, Params, SimuladorDef } from '../core/tipos';
import { retosDe } from '../desafio/challengesData';
import {
  Objetivo,
  Progreso,
  TOLERANCIA,
  Veredicto,
  estadoInicial,
  figuraDesafio,
  guardarProgreso,
  leerProgreso,
  registrarIntento,
  verificar,
} from '../desafio/motor';
import { ControlPanel } from '../shared/control-panel';
import { PlotlyChart } from '../shared/plotly-chart';
import { NoEncontrada } from './no-encontrada';

/**
 * Modo Desafío: vista aparte del simulador. Carga la misma definición del modelo, muestra solo los
 * deslizadores del reto, dibuja las curvas del estado inicial como fantasma y la zona objetivo, y
 * verifica la solución con ±1,5 % usando el mismo motor del modelo.
 */
@Component({
  selector: 'app-desafio',
  imports: [RouterLink, ControlPanel, PlotlyChart, NoEncontrada],
  templateUrl: './desafio.html',
  styleUrl: './desafio.scss',
})
export class DesafioPage {
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ids = toSignal(
    this.ruta.paramMap.pipe(map((p) => ({ materia: p.get('materia') ?? '', sim: p.get('sim') ?? '' }))),
    { initialValue: { materia: '', sim: '' } },
  );
  private readonly consulta = toSignal(this.ruta.queryParamMap.pipe(map((q) => Number(q.get('reto') ?? 1))), {
    initialValue: 1,
  });

  protected readonly materia = computed(() => buscarMateria(this.ids().materia));
  protected readonly sim = computed(() => {
    const m = this.materia();
    return m ? buscarSimulador(m, this.ids().sim) : undefined;
  });
  protected readonly retos = computed(() => retosDe(this.ids().materia, this.ids().sim));
  protected readonly indice = computed(() => {
    const n = this.consulta();
    const total = this.retos().length;
    return Number.isInteger(n) && n >= 1 && n <= total ? n - 1 : 0;
  });
  protected readonly reto = computed(() => this.retos()[this.indice()] ?? null);

  protected readonly def = signal<SimuladorDef | null>(null);
  protected readonly falla = signal(false);
  protected readonly params = signal<Params>({});
  protected readonly veredicto = signal<Veredicto | null>(null);
  protected readonly progreso = signal<Progreso>(leerProgreso());
  protected readonly tolerancia = `±${fmt(TOLERANCIA * 100, 1).replace('.', ',')} %`;

  /** Solo los deslizadores del reto, con los rangos y pasos del simulador. */
  protected readonly grupos = computed<GrupoControles[]>(() => {
    const d = this.def();
    const r = this.reto();
    if (!d || !r) return [];
    const todos = d.grupos.flatMap((g) => g.controles);
    return [{ titulo: 'Tus controles', controles: r.controles.map((id) => todos.find((c) => c.id === id)!).filter(Boolean) }];
  });

  private readonly figInicial = computed<Figura | null>(() => {
    const d = this.def();
    const r = this.reto();
    if (!d || !r) return null;
    try {
      return d.calcular(estadoInicial(r, d.defecto)).fig;
    } catch {
      return null;
    }
  });

  protected readonly figura = computed<Figura | null>(() => {
    const d = this.def();
    const r = this.reto();
    if (!d || !r) return null;
    try {
      return figuraDesafio(d.calcular(this.params()).fig, this.figInicial(), r);
    } catch (e) {
      if (e instanceof ErrorParametro) return figuraVacia(e.message);
      throw e;
    }
  });

  protected readonly resueltosModelo = computed(() => this.retos().filter((r) => this.progreso().resueltos[r.id]).length);

  constructor() {
    effect(() => {
      const { materia, sim } = this.ids();
      const cargador = CARGADORES[materia]?.[sim];
      this.def.set(null);
      this.falla.set(false);
      if (!cargador) return;
      cargador()
        .then((d) => {
          if (this.ids().materia !== materia || this.ids().sim !== sim) return;
          this.def.set(d);
        })
        .catch(() => this.falla.set(true));
    });
    // Al cambiar de reto (o al cargar el modelo) se parte de su estado inicial.
    effect(() => {
      const d = this.def();
      const r = this.reto();
      if (d && r) this.reiniciarCon(d, r.id);
    });
  }

  private reiniciarCon(d: SimuladorDef, id: string): void {
    const r = this.retos().find((x) => x.id === id);
    if (!r) return;
    cancelAnimationFrame(this.cuadro);
    this.cuadro = 0;
    this.pendiente = null;
    this.params.set(estadoInicial(r, d.defecto));
    this.veredicto.set(null);
  }

  protected reiniciar(): void {
    const d = this.def();
    const r = this.reto();
    if (d && r) this.reiniciarCon(d, r.id);
  }

  protected irA(i: number): void {
    void this.router.navigate([], { relativeTo: this.ruta, queryParams: { reto: i + 1 }, replaceUrl: true });
  }

  protected verificarSolucion(): void {
    const r = this.reto();
    if (!r) return;
    const p = this.pendiente ?? this.params();
    const v = verificar(r, p);
    this.veredicto.set(v);
    const nuevo = registrarIntento(this.progreso(), r.id, v.ok);
    this.progreso.set(nuevo);
    guardarProgreso(nuevo);
  }

  protected meta(o: Objetivo): string {
    return fmt(o.meta, o.decimales ?? 2);
  }

  protected valor(v: number | null, o: Objetivo): string {
    return v === null ? 'sin equilibrio' : fmt(v, o.decimales ?? 2);
  }

  private pendiente: Params | null = null;
  private cuadro = 0;

  /** Igual que en el simulador: un redibujado por cuadro de animación mientras se arrastra. */
  protected alCambiar(ev: { id: string; valor: number | string }): void {
    const d = this.def();
    if (!d) return;
    const anterior = this.pendiente ?? this.params();
    let nuevo: Params = { ...anterior, [ev.id]: ev.valor };
    const ajuste = d.alCambiar?.(anterior, nuevo);
    if (ajuste) nuevo = { ...nuevo, ...ajuste };
    this.pendiente = nuevo;
    this.veredicto.set(null);
    if (this.cuadro) return;
    this.cuadro = requestAnimationFrame(() => {
      this.cuadro = 0;
      if (this.pendiente) this.params.set(this.pendiente);
      this.pendiente = null;
    });
  }
}
