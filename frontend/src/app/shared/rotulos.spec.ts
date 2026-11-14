/** Rótulos de áreas sombreadas: cada área sin leyenda recibe un rótulo en su color y no se montan entre sí. */
import { describe, expect, it } from 'vitest';
import { CARGADORES_MICRO3 } from '../micro3/registro';
import { colorOpaco, partir, rotularAreas } from './rotulos';

describe('rotularAreas', () => {
  it('rotula excedentes, beneficio y pérdida irrecuperable del monopolio sin solaparlos', async () => {
    const d = await CARGADORES_MICRO3['monopolio']();
    const { fig } = d.calcular({ ...d.defecto });
    const r = rotularAreas(fig.data, fig.layout);
    const textos = r.map((a) => String(a.text).replace(/<br>/g, ' '));
    for (const t of ['Excedente del consumidor', 'Excedente del productor', 'Pérdida irrecuperable', 'Beneficio'])
      expect(textos.some((x) => x.startsWith(t)), t).toBe(true);
    // El beneficio queda dentro del excedente del productor: su rótulo se desplaza.
    expect(r.some((a) => a.yshift < 0)).toBe(true);
  });
  it('no rotula áreas que ya están en la leyenda ni áreas degeneradas', () => {
    const area = { type: 'scatter', fill: 'toself', name: 'A', x: [0, 1, 0], y: [0, 0, 1] };
    expect(rotularAreas([area], {})).toHaveLength(0); // leyenda visible
    expect(rotularAreas([{ ...area, showlegend: false }], {})).toHaveLength(1);
    expect(rotularAreas([{ ...area, showlegend: false, x: [0, 1, 2], y: [0, 0, 0] }], {})).toHaveLength(0);
  });
  it('ayudantes de texto y color', () => {
    expect(partir('Pérdida irrecuperable de eficiencia = 216')).toContain('<br>');
    expect(colorOpaco('rgba(255, 122, 133, 0.4)')).toBe('rgb(255, 122, 133)');
  });
});
