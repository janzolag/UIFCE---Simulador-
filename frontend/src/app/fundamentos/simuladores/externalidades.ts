/** Externalidades e impuesto pigouviano (Mankiw, cap. 10). Port de externalidades.py. */
import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { aviso } from '../../core/tema';
import { ErrorParametro } from '../modelos/_comun';
import { externalidad } from '../modelos/externalidades';
import {
  COLOR,
  area,
  controlesCurvas,
  curvas,
  figuraBase,
  guias,
  limite,
  lineaCurva,
  panel,
  punto,
  seguro,
} from './_ui';

const SIM_ID = 'externalidades';

export const DEF = {
  tipo: 'negativa' as string,
  e: 10,
  intervencion: 0,
  a: 100,
  b: 2,
  c: 10,
  d: 3,
  elastica: 'ninguna' as string,
  p_horizontal: 20,
};
type P = typeof DEF;

function calcularSim(p: P): Simulacion {
  const { tipo, e } = p;
  let { intervencion } = p;
  const [D, S] = curvas(p.a, p.b, p.c, p.d, p.elastica, p.p_horizontal);
  let avisoInt: string | null = null;
  let r;
  try {
    r = externalidad(D, S, tipo, e, intervencion);
  } catch (err) {
    // la intervención es la que falla: se muestra el mercado sin ella
    if (!(err instanceof ErrorParametro)) throw err;
    r = externalidad(D, S, tipo, e, 0);
    avisoInt = `${err.message} Se muestra el resultado sin intervención.`;
    intervencion = 0;
  }
  const xMax = limite([r.qMercado, r.qOptimo, r.q, D.a], 10);
  const yMax = Math.min(
    limite([r.pMercado, r.pOptimo, r.pc, D.precioMaximo + e], 10),
    limite([r.pMercado, r.pOptimo, r.pc], 10) * 2.5,
  );
  const fig = figuraBase('Cantidad (Q)', 'Precio (P)', xMax, yMax, SIM_ID);
  const valor =
    tipo === 'positiva' ? (x: number) => r.demandaSocial.precio(x) : (x: number) => D.precio(x);
  const costo =
    tipo === 'negativa' ? (x: number) => r.ofertaSocial.precio(x) : (x: number) => S.precio(x);
  if (Math.abs(r.q - r.qOptimo) > 1e-9) {
    const [q0, q1] = [r.q, r.qOptimo].sort((x, y) => x - y);
    area(
      fig,
      q0,
      q1,
      (x) => Math.max(valor(x), costo(x)),
      (x) => Math.min(valor(x), costo(x)),
      COLOR.ppm,
      'Pérdida de peso muerto',
      yMax,
    );
  }
  lineaCurva(fig, D, xMax, yMax, 'Demanda (valor privado)', COLOR.demanda);
  lineaCurva(fig, S, xMax, yMax, 'Oferta (costo privado)', COLOR.oferta);
  if (e > 0) {
    if (tipo === 'negativa')
      lineaCurva(fig, r.ofertaSocial, xMax, yMax, 'Costo social', COLOR.social);
    else lineaCurva(fig, r.demandaSocial, xMax, yMax, 'Valor social', COLOR.social);
  }
  punto(fig, r.qMercado, r.pMercado, 'Equilibrio de mercado', undefined, undefined, 1, 'Mercado');
  guias(fig, r.qOptimo, r.pOptimo);
  punto(fig, r.qOptimo, r.pOptimo, 'Óptimo social', COLOR.nuevo, 'star', 1, 'Óptimo');
  if (Math.abs(intervencion) > 1e-12)
    punto(fig, r.q, r.pc, 'Con la intervención', COLOR.social, 'diamond');

  const filas = [
    ['Cantidad de mercado', r.qMercado],
    ['Cantidad óptima', r.qOptimo],
    ['Cantidad con la intervención', r.q],
    ['Intervención óptima (Pigou)', tipo === 'negativa' ? e : -e],
    ['Pérdida de peso muerto sin intervenir', r.ppmMercado],
    ['Pérdida de peso muerto con la intervención', r.ppm],
    ['Bienestar social', r.bienestarSocial],
  ];
  const bloques: Bloque[] = avisoInt ? [aviso(avisoInt, 'error')] : [];
  const signoOk =
    (tipo === 'negativa' && intervencion >= 0) || (tipo === 'positiva' && intervencion <= 0);
  if (Math.abs(intervencion) > 1e-12 && !signoOk)
    bloques.push(
      aviso(
        'Esta intervención empuja la cantidad en la dirección equivocada y aumenta la pérdida.',
        'info',
      ),
    );
  else if (Math.abs(Math.abs(intervencion) - e) < 1e-9 && e > 0)
    bloques.push(
      aviso(
        'La intervención es igual a la externalidad: el mercado llega al óptimo social.',
        'info',
      ),
    );
  return {
    fig,
    panel: panel(
      filas,
      bloques,
      'cap. 10, «Las externalidades»: impuestos y subsidios correctivos.',
    ),
  };
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 540,
  grupos: [
    {
      titulo: 'Externalidad',
      controles: [
        {
          id: 'tipo',
          etiqueta: 'Tipo de externalidad',
          tipo: 'selector',
          opciones: [
            { valor: 'negativa', etiqueta: 'Negativa en la producción' },
            { valor: 'positiva', etiqueta: 'Positiva en el consumo' },
          ],
        },
        {
          id: 'e',
          etiqueta: 'Costo o beneficio externo por unidad e',
          tipo: 'slider',
          min: 0,
          max: 40,
          paso: 0.5,
        },
        {
          id: 'intervencion',
          etiqueta: 'Impuesto (+) o subsidio (−) por unidad',
          tipo: 'slider',
          min: -40,
          max: 40,
          paso: 0.5,
        },
      ],
    },
    ...controlesCurvas(),
  ],
  calcular: (p: Params) => seguro<P>(p, calcularSim),
};
