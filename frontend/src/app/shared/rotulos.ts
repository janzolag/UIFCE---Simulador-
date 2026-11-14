/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Rótulos de las áreas sombreadas (excedentes, pérdida irrecuperable, beneficio, renta…).
 *
 * Muchas figuras de varios paneles ocultan la leyenda, así que un área de color quedaba sin explicar.
 * Esta función añade, para cada área rellena con nombre que no aparece en la leyenda, un rótulo con su
 * nombre en el color del área, sobre su centro (o con una flecha corta si el área es muy pequeña).
 * No cambia colores ni trazas: solo agrega anotaciones.
 */
import { COLORES } from '../core/tema';

const MAX_LINEA = 24;

/** Parte el texto en renglones cortos (máx. 3) para que quepa dentro del área. */
export function partir(texto: string): string {
  const palabras = texto.split(/\s+/);
  const lineas: string[] = [];
  let actual = '';
  for (const p of palabras) {
    if (actual && (actual + ' ' + p).length > MAX_LINEA) {
      lineas.push(actual);
      actual = p;
    } else actual = actual ? `${actual} ${p}` : p;
  }
  if (actual) lineas.push(actual);
  return lineas.slice(0, 3).join('<br>');
}

/** Color opaco a partir del relleno (rgba → rgb) para el texto del rótulo. */
export function colorOpaco(relleno: string | undefined): string {
  if (!relleno) return COLORES.texto;
  const m = relleno.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  return m ? `rgb(${m[1]}, ${m[2]}, ${m[3]})` : relleno;
}

const visibleEnLeyenda = (t: any, layout: any): boolean => layout?.showlegend !== false && t.showlegend !== false;

/** Centro de masa del polígono (x, y); si el área es casi nula, el promedio de los vértices. */
function centro(xs: number[], ys: number[]): { x: number; y: number; area: number } {
  let A = 0;
  let cx = 0;
  let cy = 0;
  const n = xs.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const c = xs[i] * ys[j] - xs[j] * ys[i];
    A += c;
    cx += (xs[i] + xs[j]) * c;
    cy += (ys[i] + ys[j]) * c;
  }
  A /= 2;
  if (Math.abs(A) < 1e-12) {
    const mx = xs.reduce((s, v) => s + v, 0) / n;
    const my = ys.reduce((s, v) => s + v, 0) / n;
    return { x: mx, y: my, area: 0 };
  }
  return { x: cx / (6 * A), y: cy / (6 * A), area: Math.abs(A) };
}

/** Rango del eje (del layout si está fijo; si no, el de los datos). */
function rango(layout: any, eje: string, valores: number[]): [number, number] {
  const r = layout?.[eje]?.range;
  if (Array.isArray(r) && r.length === 2 && r.every((v: unknown) => typeof v === 'number' && Number.isFinite(v))) return [r[0], r[1]];
  return [Math.min(...valores), Math.max(...valores)];
}

const nombreEje = (ref: string | undefined, eje: 'x' | 'y'): string => `${eje}axis${(ref ?? eje).slice(1)}`;

/** Anotaciones que rotulan las áreas sombreadas sin leyenda. */
export function rotularAreas(data: any[], layout: any): any[] {
  const out: any[] = [];
  // Posiciones ya ocupadas (en fracción del recuadro de cada panel) para no montar un rótulo sobre otro.
  const ocupados: { panel: string; fx: number; fy: number }[] = [];
  for (const t of data ?? []) {
    if (t?.fill !== 'toself' || !t.name || visibleEnLeyenda(t, layout)) continue;
    const xs: number[] = [];
    const ys: number[] = [];
    (t.x ?? []).forEach((x: unknown, i: number) => {
      const y = t.y?.[i];
      if (typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y)) {
        xs.push(x);
        ys.push(y);
      }
    });
    if (xs.length < 3) continue;
    const c = centro(xs, ys);
    const ax = nombreEje(t.xaxis, 'x');
    const ay = nombreEje(t.yaxis, 'y');
    const [x0, x1] = rango(layout, ax, xs);
    const [y0, y1] = rango(layout, ay, ys);
    const fraccion = c.area / Math.max((x1 - x0) * (y1 - y0), 1e-12);
    if (fraccion < 1e-5) continue; // área degenerada (p. ej. sin pérdida): nada que rotular
    const pequena = fraccion < 0.012;
    const panel = `${t.xaxis ?? 'x'}${t.yaxis ?? 'y'}`;
    const fx = (c.x - x0) / (x1 - x0 || 1);
    let fy = (c.y - y0) / (y1 - y0 || 1);
    let yshift = 0;
    // Si el centro cae sobre otro rótulo (p. ej. el beneficio dentro del excedente del productor), baja un renglón doble.
    for (let k = 0; k < 6 && ocupados.some((o) => o.panel === panel && Math.abs(o.fx - fx) < 0.16 && Math.abs(o.fy - fy) < 0.09); k++) {
      yshift -= 30;
      fy -= 0.09;
    }
    ocupados.push({ panel, fx, fy });
    out.push({
      x: c.x,
      y: c.y,
      yshift,
      xref: t.xaxis ?? 'x',
      yref: t.yaxis ?? 'y',
      text: partir(String(t.name).replace(/\s*\((inicial|corto plazo)\)$/, '')),
      showarrow: pequena,
      ...(pequena ? { ax: 36, ay: -28, arrowcolor: colorOpaco(t.fillcolor), arrowwidth: 1.2, arrowhead: 0 } : {}),
      font: { size: 11, color: colorOpaco(t.fillcolor) },
      bgcolor: 'rgba(18, 22, 29, 0.72)',
      borderpad: 2,
      align: 'center',
      captureevents: false,
    });
  }
  return out;
}
