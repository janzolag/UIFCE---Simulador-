import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { CREADOR, MATERIAS, listos } from '../core/catalogo';

/** Menú lateral desplegable (cajón): materias en acordeón y, dentro de cada una, sus simuladores. */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly router = inject(Router);

  readonly abierta = input(false);
  readonly cerrar = output<void>();

  protected readonly creador = CREADOR;
  protected readonly materias = MATERIAS;
  protected readonly listos = listos;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Materia y simulador activos según la URL. */
  protected readonly ruta = computed(() => {
    const partes = this.url().split(/[?#]/)[0].split('/').filter(Boolean);
    return { materia: partes[0] ?? '', sim: partes[1] ?? '' };
  });

  /** Materia desplegada a mano; si no hay, se despliega la de la página actual. */
  private readonly manual = signal<string | null | undefined>(undefined);
  protected readonly desplegada = computed(() => (this.manual() === undefined ? this.ruta().materia : this.manual()));

  constructor() {
    // Al navegar, el acordeón vuelve a seguir la materia de la página.
    effect(() => {
      this.ruta();
      this.manual.set(undefined);
    });
  }

  protected alternar(id: string): void {
    this.manual.set(this.desplegada() === id ? null : id);
  }
}
