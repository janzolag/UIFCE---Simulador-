import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, take } from 'rxjs';
import { Menu } from './menu';

export type Pose = 'saludo' | 'presentando' | 'explicando' | 'pensando' | 'feliz' | 'alerta2' | 'neutral' | 'cierre';
export type Dock = 'bl' | 'br' | 'tl' | 'tr';

export interface Paso {
  pose: Pose;
  titulo: string;
  texto: string;
  /** Pasos "a pantalla completa": UIFCITO en el centro y el texto a su derecha. */
  centro?: boolean;
  /** Ruta a la que hay que ir antes de mostrar el paso. */
  ruta?: string;
  /** Selector CSS del elemento que se resalta. */
  objetivo?: string;
  menu?: 'abrir' | 'cerrar';
  /** Esquina donde se ubica UIFCITO cuando hay un elemento resaltado. */
  dock?: Dock;
  siguiente?: string;
  saltar?: string;
}

export const PASOS: Paso[] = [
  {
    pose: 'saludo', centro: true, ruta: '/', menu: 'cerrar',
    titulo: '¡Hola, soy UIFCITO!',
    texto:
      'Te doy la bienvenida al Simulador Económico de la Unidad Informática de la Facultad de Ciencias Económicas. ' +
      'Aquí los modelos de Fundamentos, Microeconomía 1 y Macroeconomía 1 cobran vida: mueves un parámetro y ves ' +
      'cómo cambian las curvas. ¿Te muestro cómo se usa? Es un recorrido de un minuto.',
    siguiente: 'Mostrarme cómo', saltar: 'Explorar por mi cuenta',
  },
  {
    pose: 'presentando', objetivo: '.boton-menu', menu: 'cerrar', dock: 'br',
    titulo: 'El menú',
    texto: 'Con este botón abres el menú de materias y simuladores. Está plegado para dejarte todo el espacio a las gráficas.',
  },
  {
    pose: 'presentando', objetivo: '#menu-lateral', menu: 'abrir', dock: 'br',
    titulo: 'Elige materia y modelo',
    texto:
      'Pulsa una materia para ver sus simuladores. Los que tienen punto verde ya están listos; ' +
      'los de punto vacío están en construcción.',
  },
  {
    pose: 'explicando', ruta: '/micro1/monopolio', objetivo: '.panel-controles', menu: 'cerrar', dock: 'br',
    titulo: 'Los parámetros',
    texto:
      'Cada deslizador es una variable del modelo. Arrástralo y la gráfica responde al instante. ' +
      'Algunos modelos también te piden elegir una opción, como el tipo de preferencias.',
  },
  {
    pose: 'presentando', objetivo: '.panel-grafica', dock: 'bl',
    titulo: 'La gráfica',
    texto:
      'Pasa el cursor sobre las curvas para ver valores exactos. Con los íconos de la esquina superior derecha ' +
      'puedes ampliar, moverte o descargarla como imagen.',
  },
  {
    pose: 'pensando', objetivo: '.panel-explicacion', dock: 'tl',
    titulo: 'Los resultados',
    texto:
      'Aquí abajo están los números del modelo y su lectura económica, con la referencia de dónde sale cada fórmula. ' +
      'Se actualizan con cada cambio que haces.',
  },
  {
    pose: 'explicando', objetivo: '.boton-panel', dock: 'br',
    titulo: 'Para proyectar en clase',
    texto: 'Oculta los parámetros para darle todo el ancho a la gráfica. Un clic más y vuelven.',
  },
  {
    pose: 'cierre', centro: true, menu: 'cerrar',
    titulo: '¡Eso es todo!',
    texto:
      'Ahora te toca explorar. Si necesitas repasar algo, el botón «Tutorial» de la barra superior me llama de nuevo. ' +
      '¡Mucho éxito con tus modelos!',
    siguiente: 'Empezar a explorar',
  },
];

export interface Hueco {
  top: number;
  left: number;
  width: number;
  height: number;
}

const CLAVE = 'uifce.tutorial.visto';
const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Recorrido guiado de UIFCITO. Todo ocurre en el navegador; "visto" se recuerda en localStorage. */
@Injectable({ providedIn: 'root' })
export class Tutorial {
  private readonly router = inject(Router);
  private readonly menu = inject(Menu);

  readonly indice = signal<number | null>(null);
  readonly hueco = signal<Hueco | null>(null);
  readonly total = PASOS.length;
  readonly paso = computed(() => {
    const i = this.indice();
    return i === null ? null : PASOS[i];
  });

  private ficha = 0;
  private cuadro = 0;

  /** Lanza el tutorial solo la primera vez que alguien entra por el inicio. */
  autoIniciar(): void {
    if (this.visto()) return;
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), take(1))
      .subscribe((e) => {
        if (e.urlAfterRedirects.split(/[?#]/)[0] === '/') setTimeout(() => this.iniciar(), 700);
      });
  }

  iniciar(): void {
    void this.ir(0);
  }

  siguiente(): void {
    const i = this.indice();
    if (i === null) return;
    if (i >= PASOS.length - 1) this.terminar(true);
    else void this.ir(i + 1);
  }

  anterior(): void {
    const i = this.indice();
    if (i !== null && i > 0) void this.ir(i - 1);
  }

  /** Cierra el tutorial; `alInicio` devuelve a la portada (al terminar el recorrido completo). */
  terminar(alInicio = false): void {
    this.ficha++;
    clearInterval(this.cuadro);
    this.indice.set(null);
    this.hueco.set(null);
    this.menu.abierto.set(false);
    this.marcarVisto();
    if (alInicio) void this.router.navigateByUrl('/');
  }

  private async ir(i: number): Promise<void> {
    const ficha = ++this.ficha;
    const p = PASOS[i];
    clearInterval(this.cuadro);
    this.indice.set(i);
    this.hueco.set(null);
    if (p.menu) this.menu.abierto.set(p.menu === 'abrir');
    if (p.ruta && this.rutaActual() !== p.ruta) await this.router.navigateByUrl(p.ruta);
    if (ficha !== this.ficha || !p.objetivo) return;

    const el = await this.buscar(p.objetivo, 5000);
    if (ficha !== this.ficha || !el) return;
    el.scrollIntoView({ block: 'center', behavior: 'auto' });
    await esperar(p.menu === 'abrir' ? 320 : 80);
    if (ficha !== this.ficha) return;
    this.seguir(p.objetivo, ficha);
  }

  /** Mantiene el recuadro sobre el elemento aunque haya scroll, animaciones o cambios de tamaño. */
  private seguir(selector: string, ficha: number): void {
    const medir = () => {
      if (ficha !== this.ficha) return;
      const el = document.querySelector(selector);
      if (el) {
        const r = el.getBoundingClientRect();
        const nuevo: Hueco = { top: r.top, left: r.left, width: r.width, height: r.height };
        const a = this.hueco();
        if (!a || a.top !== nuevo.top || a.left !== nuevo.left || a.width !== nuevo.width || a.height !== nuevo.height)
          this.hueco.set(nuevo);
      }
    };
    // Temporizador (no requestAnimationFrame): sigue funcionando aunque la pestaña esté en segundo plano.
    medir();
    this.cuadro = window.setInterval(medir, 50);
  }

  private async buscar(selector: string, limiteMs: number): Promise<Element | null> {
    const t0 = performance.now();
    while (performance.now() - t0 < limiteMs) {
      const el = document.querySelector(selector);
      if (el && el.getBoundingClientRect().width > 0) return el;
      await esperar(60);
    }
    return null;
  }

  private rutaActual(): string {
    return this.router.url.split(/[?#]/)[0] || '/';
  }

  private visto(): boolean {
    try {
      return localStorage.getItem(CLAVE) === '1';
    } catch {
      return false;
    }
  }

  private marcarVisto(): void {
    try {
      localStorage.setItem(CLAVE, '1');
    } catch {
      /* sin almacenamiento: el tutorial simplemente se ofrecerá de nuevo */
    }
  }
}
