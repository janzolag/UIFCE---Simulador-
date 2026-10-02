import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { buscarMateria, listos } from '../core/catalogo';
import { MathEquation } from '../shared/math-equation';
import { NoEncontrada } from './no-encontrada';

@Component({
  selector: 'app-materia',
  imports: [RouterLink, MathEquation, NoEncontrada],
  templateUrl: './materia.html',
  styleUrl: './materia.scss',
})
export class MateriaPage {
  private readonly ruta = inject(ActivatedRoute);
  private readonly id = toSignal(this.ruta.paramMap.pipe(map((p) => p.get('materia') ?? '')), { initialValue: '' });

  protected readonly materia = computed(() => buscarMateria(this.id()));
  protected readonly listos = listos;
}
