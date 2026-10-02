import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { TITULO_APP, buscarMateria, buscarSimulador } from './core/catalogo';
import { Sidebar } from './layout/sidebar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);

  protected readonly titulo = TITULO_APP;
  protected readonly menuAbierto = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** "Microeconomía 1 › Monopolio" para la barra superior. */
  protected readonly ubicacion = computed(() => {
    const [m, s] = this.url().split(/[?#]/)[0].split('/').filter(Boolean);
    const materia = m ? buscarMateria(m) : undefined;
    if (!materia) return null;
    const sim = s ? buscarSimulador(materia, s) : undefined;
    return sim ? { materia: materia.nombre, sim: sim.nombre } : { materia: materia.nombre, sim: '' };
  });

  @HostListener('document:keydown.escape')
  protected cerrarConEscape(): void {
    this.menuAbierto.set(false);
  }
}
