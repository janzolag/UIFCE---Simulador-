import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Simulador Económico', loadComponent: () => import('./pages/inicio').then((m) => m.Inicio) },
  { path: ':materia', loadComponent: () => import('./pages/materia').then((m) => m.MateriaPage) },
  { path: ':materia/:sim', loadComponent: () => import('./pages/simulador').then((m) => m.SimuladorPage) },
  {
    path: ':materia/:sim/desafio',
    title: 'Modo Desafío · Simulador Económico',
    loadComponent: () => import('./pages/desafio').then((m) => m.DesafioPage),
  },
  { path: '**', loadComponent: () => import('./pages/no-encontrada').then((m) => m.NoEncontrada) },
];
