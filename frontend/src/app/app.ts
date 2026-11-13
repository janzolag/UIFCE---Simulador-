import { Component, HostListener, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { TITULO_APP, buscarMateria, buscarSimulador } from './core/catalogo';
import { Menu } from './core/menu';
import { hayDesafio } from './desafio/indice';
import { Tutorial } from './core/tutorial';
import { Sidebar } from './layout/sidebar';
import { TutorialUifcito } from './shared/tutorial-uifcito';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, Sidebar, TutorialUifcito],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  protected readonly menu = inject(Menu);
  protected readonly tutorial = inject(Tutorial);

  protected readonly titulo = TITULO_APP;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** "Microeconomía 1 › Monopolio" para la barra superior. */
  protected readonly ubicacion = computed(() => {
    const [m, s, extra] = this.segmentos();
    const materia = m ? buscarMateria(m) : undefined;
    if (!materia) return null;
    const sim = s ? buscarSimulador(materia, s) : undefined;
    return sim
      ? { materia: materia.nombre, sim: sim.nombre, desafio: extra === 'desafio' }
      : { materia: materia.nombre, sim: '', desafio: false };
  });

  private readonly segmentos = computed(() => this.url().split(/[?#]/)[0].split('/').filter(Boolean));

  /** Botón «Modo Desafío» de la barra (o «Volver al Simulador» cuando ya se está en el desafío). */
  protected readonly desafio = computed(() => {
    const [m, s, extra] = this.segmentos();
    if (!m || !s || !hayDesafio(m, s)) return null;
    const dentro = extra === 'desafio';
    return { dentro, ruta: dentro ? ['/', m, s] : ['/', m, s, 'desafio'] };
  });

  constructor() {
    // UIFCITO da la bienvenida la primera vez que alguien entra por el inicio.
    this.tutorial.autoIniciar();
  }

  @HostListener('document:keydown.escape')
  protected cerrarConEscape(): void {
    this.menu.abierto.set(false);
  }
}
