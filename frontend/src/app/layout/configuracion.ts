import { AfterViewInit, Component, ElementRef, HostListener, Injectable, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Apariencia, Preferencia } from '../core/apariencia';
import { VERSION_NUMERO } from '../core/catalogo';
import { Menu } from '../core/menu';
import { Tutorial } from '../core/tutorial';

/**
 * Estado del panel de configuración. El botón vive en la barra superior y el panel fuera de ella
 * (la barra usa backdrop-filter, que atraparía a un panel `position: fixed` dentro de su caja).
 */
@Injectable({ providedIn: 'root' })
export class EstadoConfiguracion {
  private readonly menu = inject(Menu);
  private readonly ap = inject(Apariencia);

  readonly abierto = signal(false);
  /** Botón del engranaje, para devolverle el foco al cerrar. */
  boton: HTMLElement | null = null;

  abrir(): void {
    this.menu.abierto.set(false);
    this.abierto.set(true);
    this.ap.marcarNovedadVista();
  }

  cerrar(devolverFoco = true): void {
    if (!this.abierto()) return;
    this.abierto.set(false);
    if (devolverFoco) this.boton?.focus();
  }

  alternar(): void {
    if (this.abierto()) this.cerrar();
    else this.abrir();
  }
}

/** Engranaje redondo del extremo derecho de la barra superior. */
@Component({
  selector: 'app-boton-configuracion',
  template: `
    <button
      #boton
      type="button"
      class="boton-config"
      [class.nuevo]="ap.novedad()"
      aria-haspopup="dialog"
      [attr.aria-expanded]="estado.abierto()"
      aria-controls="panel-config"
      aria-label="Configuración"
      title="Configuración"
      (click)="estado.alternar()"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        />
      </svg>
    </button>
  `,
  styleUrl: './boton-configuracion.scss',
})
export class BotonConfiguracion implements AfterViewInit {
  protected readonly ap = inject(Apariencia);
  protected readonly estado = inject(EstadoConfiguracion);
  private readonly boton = viewChild.required<ElementRef<HTMLButtonElement>>('boton');

  ngAfterViewInit(): void {
    this.estado.boton = this.boton().nativeElement;
  }
}

interface OpcionTema {
  valor: Preferencia;
  etiqueta: string;
}

/** Panel de configuración: apariencia, Acerca de y tutorial. En móvil es una hoja que sube desde abajo. */
@Component({
  selector: 'app-panel-configuracion',
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.scss',
})
export class PanelConfiguracion {
  protected readonly ap = inject(Apariencia);
  protected readonly estado = inject(EstadoConfiguracion);
  private readonly router = inject(Router);
  private readonly tutorial = inject(Tutorial);

  protected readonly version = VERSION_NUMERO;
  protected readonly opciones: OpcionTema[] = [
    { valor: 'claro', etiqueta: 'Claro' },
    { valor: 'oscuro', etiqueta: 'Oscuro' },
    { valor: 'sistema', etiqueta: 'Sistema' },
  ];

  protected readonly nota = computed(() =>
    this.ap.preferencia() === 'sistema'
      ? `Sigue la configuración de tu equipo. Ahora: ${this.ap.temaEfectivo()}.`
      : 'Se guarda en este navegador.',
  );

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  constructor() {
    // Al abrir, el foco entra al panel en la opción de tema elegida.
    effect(() => {
      const panel = this.panel()?.nativeElement;
      if (panel) untracked(() => panel.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
    });
  }

  protected cerrar(): void {
    this.estado.cerrar();
  }

  protected elegir(p: Preferencia): void {
    this.ap.elegir(p);
  }

  /** Grupo de radio: las flechas mueven la elección (y el foco) entre Claro, Oscuro y Sistema. */
  protected alTeclearTema(ev: KeyboardEvent, i: number): void {
    const paso = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 0;
    if (!paso) return;
    ev.preventDefault();
    const j = (i + paso + this.opciones.length) % this.opciones.length;
    this.elegir(this.opciones[j].valor);
    this.panel()?.nativeElement.querySelectorAll<HTMLElement>('[role="radio"]')[j]?.focus();
  }

  protected irAcercaDe(): void {
    this.estado.cerrar(false);
    void this.router.navigateByUrl('/acerca-de');
  }

  protected repetirTutorial(): void {
    this.estado.cerrar(false);
    this.tutorial.iniciar();
  }

  /** El foco no sale del panel con Tab mientras está abierto. */
  protected alTeclearPanel(ev: KeyboardEvent): void {
    if (ev.key !== 'Tab') return;
    const enfocables = Array.from(
      this.panel()?.nativeElement.querySelectorAll<HTMLElement>('button:not([tabindex="-1"]), a[href]') ?? [],
    );
    if (!enfocables.length) return;
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    if (ev.shiftKey && document.activeElement === primero) {
      ev.preventDefault();
      ultimo.focus();
    } else if (!ev.shiftKey && document.activeElement === ultimo) {
      ev.preventDefault();
      primero.focus();
    }
  }

  @HostListener('document:keydown.escape')
  protected alEscape(): void {
    this.estado.cerrar();
  }
}
