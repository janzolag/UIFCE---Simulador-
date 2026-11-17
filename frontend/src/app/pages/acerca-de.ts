import { Component, inject } from '@angular/core';
import { Apariencia } from '../core/apariencia';
import { FUNDAMENTOS, MACRO1, MATERIAS, MICRO1, TITULO_APP, VERSION_NUMERO } from '../core/catalogo';
import { Materia } from '../core/tipos';

interface Agradecimiento {
  iniciales: string;
  nombre: string;
  aporte: string;
  materia: Materia;
}

/** Página «Acerca de»: autoría, origen del proyecto y agradecimientos. */
@Component({
  selector: 'app-acerca-de',
  templateUrl: './acerca-de.html',
  styleUrl: './acerca-de.scss',
})
export class AcercaDe {
  protected readonly ap = inject(Apariencia);
  protected readonly titulo = TITULO_APP;
  protected readonly version = VERSION_NUMERO;
  protected readonly nMaterias = MATERIAS.length;
  protected readonly anio = 2026;

  protected readonly autor = {
    nombre: 'Jeferson David Anzola Grajales',
    cargo: 'Estudiante Auxiliar Junior · Unidad de Informática, Facultad de Ciencias Económicas',
    linkedin: 'https://www.linkedin.com/in/jeferson-david-anzola-grajales-',
    github: 'https://github.com/Jeferson-Anzola',
  };

  protected readonly gracias: Agradecimiento[] = [
    { iniciales: 'UI', nombre: 'Unidad de Informática FCE', aporte: 'Por acoger y apoyar el proyecto', materia: FUNDAMENTOS },
    { iniciales: 'JL', nombre: 'Juan Esteban Laguna', aporte: 'Compañero que apoyó el proyecto', materia: MACRO1 },
    { iniciales: 'DL', nombre: 'Diego Fernando López Abril', aporte: 'Compañero que apoyó el proyecto', materia: MACRO1 },
    { iniciales: 'MM', nombre: 'Prof. Mónica Yolanda Mogollón Plazas', aporte: 'Microeconomía', materia: MICRO1 },
    { iniciales: 'AB', nombre: 'Prof. Andrea Catalina Blanco Moreno', aporte: 'Microeconomía', materia: MICRO1 },
  ];
}
