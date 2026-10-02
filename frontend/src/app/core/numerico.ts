/** Ayudantes numéricos mínimos (reemplazan a numpy en el navegador). */

export function linspace(a: number, b: number, n: number): number[] {
  if (n === 1) return [a];
  const paso = (b - a) / (n - 1);
  return Array.from({ length: n }, (_, i) => a + i * paso);
}

export function arange(a: number, b: number, paso: number): number[] {
  const out: number[] = [];
  for (let x = a; x < b - 1e-12; x += paso) out.push(x);
  return out;
}

/** Bisección sobre [lo, hi] con f(lo) y f(hi) de signo opuesto. */
export function biseccion(f: (x: number) => number, lo: number, hi: number, tol = 1e-12, it = 200): number {
  let flo = f(lo);
  for (let i = 0; i < it && hi - lo > tol * Math.max(1, Math.abs(lo)); i++) {
    const m = 0.5 * (lo + hi);
    const fm = f(m);
    if (fm < 0 === flo < 0) {
      lo = m;
      flo = fm;
    } else hi = m;
  }
  return 0.5 * (lo + hi);
}

/** Máximo de una función unimodal en [lo, hi] (sección áurea). */
export function maximizar(f: (x: number) => number, lo: number, hi: number, tol = 1e-12): number {
  const g = (Math.sqrt(5) - 1) / 2;
  let a = lo;
  let b = hi;
  let c = b - g * (b - a);
  let d = a + g * (b - a);
  let fc = f(c);
  let fd = f(d);
  while (b - a > tol * Math.max(1, Math.abs(a))) {
    if (fc > fd) {
      b = d; d = c; fd = fc; c = b - g * (b - a); fc = f(c);
    } else {
      a = c; c = d; fc = fd; d = a + g * (b - a); fd = f(d);
    }
  }
  return 0.5 * (a + b);
}
