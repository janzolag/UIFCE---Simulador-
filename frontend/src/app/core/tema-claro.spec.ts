import { describe, expect, it } from 'vitest';
import { COLORES, COLORES_CLARO, MAPA_CLARO, SERIE, SERIE_CLARA, traducirAClaro, traducirColor } from './tema';
import { MATERIAS } from './catalogo';

/** Luminancia relativa WCAG 2.x de un color #rrggbb. */
function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe('Modo claro de las gráficas (MAPA_CLARO)', () => {
  it('cada color de COLORES tiene su equivalente claro en el mapa', () => {
    for (const [clave, oscuro] of Object.entries(COLORES)) {
      const claro = MAPA_CLARO[oscuro.toLowerCase()];
      expect(claro, `COLORES.${clave} (${oscuro})`).toBeDefined();
      expect(claro).toBe(COLORES_CLARO[clave as keyof typeof COLORES]);
    }
  });

  it('cada color de SERIE tiene su equivalente claro, en el mismo orden', () => {
    expect(SERIE_CLARA).toHaveLength(SERIE.length);
    SERIE.forEach((oscuro, i) => expect(MAPA_CLARO[oscuro.toLowerCase()], oscuro).toBe(SERIE_CLARA[i]));
  });

  it('los textos claros alcanzan al menos 4.5:1 sobre el papel y el área de trazado', () => {
    for (const fondo of [COLORES_CLARO.fondo, COLORES_CLARO.panel]) {
      expect(contraste(COLORES_CLARO.texto, fondo)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(COLORES_CLARO.textoSuave, fondo)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('las series claras se distinguen del área de trazado (al menos 3:1)', () => {
    for (const c of SERIE_CLARA) expect(contraste(c, COLORES_CLARO.panel), c).toBeGreaterThanOrEqual(3);
  });

  it('el color claro de cada materia se lee como texto sobre blanco (al menos 4.5:1)', () => {
    for (const m of MATERIAS) expect(contraste(m.colorClaro, '#FFFFFF'), m.nombre).toBeGreaterThanOrEqual(4.5);
  });

  it('traduce hexadecimales sin importar mayúsculas y conserva la transparencia de rgba', () => {
    expect(traducirColor('#5B9BFF')).toBe('#2563D9');
    expect(traducirColor('#5b9bff')).toBe('#2563D9');
    expect(traducirColor('rgba(91,155,255,0.28)')).toBe('rgba(37,99,217,0.28)');
    expect(traducirColor('rgba(18, 22, 29, 0.72)')).toBe('rgba(251,252,254,0.72)');
    expect(traducirColor('rgb(255, 122, 133)')).toBe('rgb(210,58,75)');
  });

  it('deja igual lo que no es un color del mapa', () => {
    expect(traducirColor('#123456')).toBe('#123456');
    expect(traducirColor('rgba(0,0,0,0)')).toBe('rgba(0,0,0,0)');
    expect(traducirColor('Demanda')).toBe('Demanda');
    expect(traducirColor(3)).toBe(3);
  });

  it('traduce una figura completa sin modificar la original', () => {
    const data = [{ x: [1, 2], y: new Float64Array([3, 4]), line: { color: '#5B9BFF' }, fillcolor: 'rgba(255,164,91,0.28)' }];
    const layout = { paper_bgcolor: COLORES.fondo, font: { color: COLORES.texto }, colorway: SERIE };
    const d = traducirAClaro(data);
    const l = traducirAClaro(layout);
    expect(d[0].line.color).toBe('#2563D9');
    expect(d[0].fillcolor).toBe('rgba(208,101,15,0.28)');
    expect(d[0].y).toBe(data[0].y); // arreglos tipados intactos
    expect(l.paper_bgcolor).toBe('#FFFFFF');
    expect(l.font.color).toBe('#141A23');
    expect(l.colorway).toEqual(SERIE_CLARA);
    expect(data[0].line.color).toBe('#5B9BFF');
    expect(layout.paper_bgcolor).toBe(COLORES.fondo);
  });
});
