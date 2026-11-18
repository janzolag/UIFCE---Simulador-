/** Casilla numérica junto a los deslizadores: lectura del texto, acotado y sincronía con el panel. */
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { acotar, parsearNumero, textoEntrada } from './entrada-numerica';
import { ControlPanel } from './control-panel';
import { GrupoControles } from '../core/tipos';

describe('parsearNumero', () => {
  it.each([
    ['3', 3], ['0.25', 0.25], ['0,25', 0.25], ['−1.5', -1.5], ['-2', -2], [' 7 ', 7], ['.5', 0.5], ['1e2', 100], ['1,500.5', 1500.5],
  ] as [string, number][])('%s → %s', (t, v) => expect(parsearNumero(t)).toBe(v));
  it.each(['', '-', 'abc', '1..2', '2x', ','])('«%s» no es un número', (t) => expect(parsearNumero(t)).toBeNull());
});

describe('acotar y textoEntrada', () => {
  it('acota al rango del control', () => {
    expect(acotar(15, 0, 10)).toBe(10);
    expect(acotar(-3, 0, 10)).toBe(0);
    expect(acotar(4.37, 0, 10)).toBe(4.37);
    expect(acotar(99)).toBe(99);
  });
  it('muestra el valor sin separador de miles y con 4 decimales como máximo', () => {
    expect(textoEntrada(1234.5)).toBe('1234.5');
    expect(textoEntrada(1 / 3)).toBe('0.3333');
    expect(textoEntrada(-0.5)).toBe('-0.5');
    expect(textoEntrada('x')).toBe('');
  });
});

describe('ControlPanel con casilla numérica', () => {
  const grupos: GrupoControles[] = [{ controles: [{ id: 'q', etiqueta: 'Cantidad q', tipo: 'slider', min: 0.1, max: 30, paso: 0.1 }] }];

  function montar(valor: number) {
    const f = TestBed.createComponent(ControlPanel);
    f.componentRef.setInput('grupos', grupos);
    f.componentRef.setInput('params', { q: valor });
    const emitidos: { id: string; valor: number | string }[] = [];
    f.componentInstance.cambio.subscribe((e) => emitidos.push(e));
    f.detectChanges();
    const casilla = f.nativeElement.querySelector('#num-q') as HTMLInputElement;
    const slider = f.nativeElement.querySelector('#ctl-q') as HTMLInputElement;
    return { f, emitidos, casilla, slider };
  }

  it('cada deslizador tiene su casilla con el valor actual', () => {
    const { casilla, slider } = montar(4);
    expect(casilla.value).toBe('4');
    expect(slider.value).toBe('4');
    expect(casilla.getAttribute('aria-label')).toContain('Cantidad q');
  });

  it('escribir un valor lo emite (con coma decimal) y el deslizador lo sigue', () => {
    const { f, emitidos, casilla, slider } = montar(4);
    casilla.value = '7,3';
    casilla.dispatchEvent(new Event('change'));
    expect(emitidos).toEqual([{ id: 'q', valor: 7.3 }]);
    f.componentRef.setInput('params', { q: 7.3 });
    f.detectChanges();
    expect(Number(slider.value)).toBeCloseTo(7.3, 10);
    expect(casilla.value).toBe('7.3');
  });

  it('un valor fuera de rango se acota y un texto inválido vuelve al valor actual', () => {
    const { emitidos, casilla } = montar(4);
    casilla.value = '99';
    casilla.dispatchEvent(new Event('change'));
    expect(emitidos.at(-1)).toEqual({ id: 'q', valor: 30 });
    expect(casilla.value).toBe('30');
    casilla.value = 'hola';
    casilla.dispatchEvent(new Event('change'));
    expect(casilla.value).toBe('4');
    expect(emitidos).toHaveLength(1);
  });

  it('mover el deslizador actualiza la casilla', () => {
    const { f, casilla } = montar(4);
    f.componentRef.setInput('params', { q: 12.3 });
    f.detectChanges();
    expect(casilla.value).toBe('12.3');
  });
});
