import { Injectable, signal } from '@angular/core';

/** Estado del menú lateral desplegable (compartido por la barra superior, el menú y el tutorial). */
@Injectable({ providedIn: 'root' })
export class Menu {
  readonly abierto = signal(false);
}
