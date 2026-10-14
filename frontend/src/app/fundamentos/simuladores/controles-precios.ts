/** Controles de precios y salario mínimo (Mankiw, cap. 6). Port de controles_precios.py. */
import { Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { precioMaximo, precioMinimo } from '../modelos/controles';
import { equilibrio } from '../modelos/mercado';
import {
  COLOR,
  area,
  controlesCurvas,
  curvas,
  figuraBase,
  horizontal,
  limite,
  lineaCurva,
  panel,
  punto,
  seguro,
  soloCurvas,
} from './_ui';

const SIM_ID = 'controles-precios';

export const DEF = {
  mercado: 'bienes' as string,
  tipo: 'maximo' as string,
  precio_control: 12,
  a: 100,
  b: 2,
  c: 10,
  d: 3,
  elastica: 'ninguna' as string,
  p_horizontal: 20,
};
type P = typeof DEF;

function calcularSim(p: P): Simulacion {
  const { mercado, tipo, precio_control: precioControl } = p;
  const [D, S] = curvas(p.a, p.b, p.c, p.d, p.elastica, p.p_horizontal);
  if (!equilibrio(D, S).intercambio)
    return soloCurvas(
      D,
      S,
      'Sin intercambio en equilibrio no hay mercado que controlar: el precio más alto que pagan los compradores es menor que el mínimo que aceptan los vendedores.',
      SIM_ID,
    );
  const r = (tipo === 'maximo' ? precioMaximo : precioMinimo)(D, S, precioControl);
  const lab = mercado === 'laboral';
  const [nQ, nP] = lab ? ['Trabajo (L)', 'Salario (W)'] : ['Cantidad (Q)', 'Precio (P)'];
  const finitos = [r.qd, r.qs].filter((v) => v < Infinity);
  const xMax = limite([r.qEquilibrio, ...finitos, D.a], 10);
  const yMax = Math.min(
    limite([r.pEquilibrio, precioControl, D.precioMaximo], 10),
    limite([r.pEquilibrio, precioControl], 10) * 2.5,
  );
  const fig = figuraBase(nQ, nP, xMax, yMax, SIM_ID);
  if (r.q > 0) {
    area(
      fig,
      0,
      r.q,
      (q) => D.precio(q),
      () => r.precio,
      COLOR.ec,
      'Excedente del consumidor',
      yMax,
    );
    area(
      fig,
      0,
      r.q,
      () => r.precio,
      (q) => S.precio(q),
      COLOR.ep,
      'Excedente del productor',
      yMax,
    );
  }
  if (r.obligatorio)
    area(
      fig,
      r.q,
      r.qEquilibrio,
      (q) => D.precio(q),
      (q) => S.precio(q),
      COLOR.ppm,
      'Pérdida de peso muerto',
      yMax,
    );
  lineaCurva(fig, D, xMax, yMax, lab ? 'Demanda de trabajo' : 'Demanda', COLOR.demanda);
  lineaCurva(fig, S, xMax, yMax, lab ? 'Oferta de trabajo' : 'Oferta', COLOR.oferta);
  const nombreControl =
    tipo === 'minimo'
      ? lab
        ? 'Salario mínimo'
        : 'Precio mínimo'
      : lab
        ? 'Salario máximo'
        : 'Precio máximo';
  horizontal(fig, precioControl, xMax, nombreControl, COLOR.social, 1, 'dash');
  punto(fig, r.qEquilibrio, r.pEquilibrio, 'Equilibrio sin control', undefined, undefined, 1, 'E');
  if (r.obligatorio)
    for (const [q, nom] of [
      [Math.min(r.qd, xMax), 'Cantidad demandada'],
      [Math.min(r.qs, xMax), 'Cantidad ofrecida'],
    ] as [number, string][])
      punto(fig, q, precioControl, nom, COLOR.nuevo, 'diamond');

  const nombreFaltante =
    tipo === 'maximo'
      ? 'Escasez'
      : lab
        ? 'Desempleo (exceso de oferta de trabajo)'
        : 'Excedente de oferta';
  const filas = [
    ['¿Es obligatorio?', r.obligatorio ? 'sí' : 'no (no cambia el resultado)'],
    [`${lab ? 'Salario' : 'Precio'} de equilibrio`, r.pEquilibrio],
    ['Cantidad demandada', r.qd],
    ['Cantidad ofrecida', r.qs],
    ['Cantidad transada', r.q],
    [nombreFaltante, r.faltante],
    ['Excedente del consumidor', r.bienestar.ec],
    ['Excedente del productor', r.bienestar.ep],
    ['Pérdida de peso muerto', r.ppm],
  ];
  return {
    fig,
    panel: panel(
      filas,
      [],
      'cap. 6, «La oferta, la demanda y las políticas del gobierno»: controles de precios.',
    ),
  };
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 540,
  grupos: [
    {
      titulo: 'Control de precios',
      controles: [
        {
          id: 'mercado',
          etiqueta: 'Mercado',
          tipo: 'selector',
          opciones: [
            { valor: 'bienes', etiqueta: 'Bienes (precio)' },
            { valor: 'laboral', etiqueta: 'Trabajo (salario)' },
          ],
        },
        {
          id: 'tipo',
          etiqueta: 'Control',
          tipo: 'selector',
          opciones: [
            { valor: 'maximo', etiqueta: 'Precio máximo' },
            { valor: 'minimo', etiqueta: 'Precio mínimo' },
          ],
        },
        {
          id: 'precio_control',
          etiqueta: 'Precio (o salario) fijado',
          tipo: 'slider',
          min: 0,
          max: 60,
          paso: 0.5,
        },
      ],
    },
    ...controlesCurvas(),
  ],
  calcular: (p: Params) => seguro<P>(p, calcularSim),
};
