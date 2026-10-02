import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './layout/sidebar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Sidebar],
  template: `
    <div class="contenedor-app">
      <app-sidebar />
      <main class="contenido"><router-outlet /></main>
    </div>
  `,
  styleUrl: './app.scss',
})
export class App {}
