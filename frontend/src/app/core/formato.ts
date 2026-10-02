/**
 * Como `toFixed`, pero redondea al par en empates exactos (igual que f"{v:.{dec}f}" de Python:
 * 0.5625 → 0.562, mientras que toFixed daría 0.563).
 */
function fijo(v: number, dec: number): string {
  const exacto = v.toFixed(Math.min(100, dec + 60));
  const cola = exacto.slice(exacto.indexOf('.') + 1 + dec);
  if (/^50*$/.test(cola)) {
    const corte = exacto.slice(0, exacto.length - cola.length).replace(/\.$/, '');
    const ultimo = Number(corte.replace('.', '').slice(-1));
    if (ultimo % 2 === 0) return corte;
  }
  return v.toFixed(dec);
}

/** Equivale a f"{v:g}" de Python (6 cifras significativas, sin ceros sobrantes). */
export function g(v: number): string {
  return String(Number.parseFloat(v.toPrecision(6)));
}

/** Número legible (punto decimal, minus tipográfico), igual que _ui.fmt de Python. */
export function fmt(v: number | string | null | undefined, dec = 3): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  if (Number.isNaN(v)) return 'no definida';
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
  if (Math.abs(v) >= 1e5 || (v !== 0 && Math.abs(v) < 1e-3)) {
    return v.toExponential(3).replace(/e([+-])(\d)$/, 'e$10$2');
  }
  let s = fijo(Math.abs(v), dec);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  const [ent, frac] = s.split('.');
  s = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (frac ? '.' + frac : '');
  if (v < 0 && s !== '0') s = '−' + s;
  return s;
}
