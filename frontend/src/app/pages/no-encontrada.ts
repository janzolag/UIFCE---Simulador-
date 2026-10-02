import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-no-encontrada',
  imports: [RouterLink],
  template: `
    <div class="pagina-404">
      <h1>Página no encontrada</h1>
      <p class="texto-suave">No existe esta sección del simulador.</p>
      <a routerLink="/" class="boton-secundario">← Volver al inicio</a>
    </div>
  `,
  styles: `
    .pagina-404 { padding-top: 60px; }
  `,
})
export class NoEncontrada {}
