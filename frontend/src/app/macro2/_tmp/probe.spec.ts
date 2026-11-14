import { it } from 'vitest';
import { SIM, pasos } from '../simuladores/mundell-fleming';
it('probe', () => {
  for (const [reg, mov] of [['flotante','imperfecta'],['flotante','perfecta'],['fijo','imperfecta'],['fijo','perfecta']])
  for (const ch of ['apertura','fiscal','monetaria','externa','exportaciones','expectativas']) {
    const base: any = { ...SIM.defecto, regimen: reg, movilidad: mov, choque: ch };
    const p: any = { ...base, ...SIM.alCambiar!(SIM.defecto, base) };
    const s = pasos(p);
    const f = (r: any) => `i=${r.i.toFixed(3)} E=${r.E.toFixed(3)} q=${r.q.toFixed(3)} P=${r.P.toFixed(3)} S=${r.S.toFixed(1)} I=${r.I.toFixed(1)} KF=${r.KF.toFixed(1)} res=${r.reservas}`;
    console.log(reg, mov, ch, '\n  E0', f(s.e0.r), '\n  E1', f(s.e1.r), '\n  E2', f(s.e2.r));
  }
});
