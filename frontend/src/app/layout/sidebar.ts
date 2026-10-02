import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { CREADOR, MATERIAS, SUBTITULO_APP, TITULO_APP, listos } from '../core/catalogo';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly router = inject(Router);

  protected readonly titulo = TITULO_APP;
  protected readonly subtitulo = SUBTITULO_APP;
  protected readonly creador = CREADOR;
  protected readonly materias = MATERIAS;
  protected readonly listos = listos;
  protected readonly abierta = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** [materia, simulador] activos según la URL actual. */
  protected readonly ruta = computed(() => {
    const partes = this.url().split(/[?#]/)[0].split('/').filter(Boolean);
    return { materia: partes[0] ?? '', sim: partes[1] ?? '' };
  });

  protected alternar(): void {
    this.abierta.update((v) => !v);
  }

  protected cerrar(): void {
    this.abierta.set(false);
  }
}
