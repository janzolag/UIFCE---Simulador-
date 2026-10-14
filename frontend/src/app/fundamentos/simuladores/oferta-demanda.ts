/** Oferta y demanda: equilibrio y desplazamientos (Mankiw, cap. 4). Port de oferta_demanda.py. */
import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { aviso } from '../../core/tema';
import { desplazamientoDemanda, desplazamientoOferta, equilibrio } from '../modelos/mercado';
import {
  COLOR,
  controlesCurvas,
  curvas,
  figuraBase,
  guias,
  lineaCurva,
  limite,
  panel,
  punto,
  seguro,
} from './_ui';

const SIM_ID = 'oferta-demanda';

const EVENTOS_D = [
  { valor: 'ninguno', etiqueta: 'Sin cambio' },
  { valor: 'ingreso_normal', etiqueta: 'Ingreso (bien normal)' },
  { valor: 'ingreso_inferior', etiqueta: 'Ingreso (bien inferior)' },
  { valor: 'sustituto', etiqueta: 'Precio de un sustituto' },
  { valor: 'complemento', etiqueta: 'Precio de un complemento' },
  { valor: 'gustos', etiqueta: 'Gustos' },
  { valor: 'expectativas', etiqueta: 'Expectativas' },
  { valor: 'compradores', etiqueta: 'Número de compradores' },
];
const EVENTOS_S = [
  { valor: 'ninguno', etiqueta: 'Sin cambio' },
  { valor: 'insumos', etiqueta: 'Precio de los insumos' },
  { valor: 'tecnologia', etiqueta: 'Tecnología' },
  { valor: 'expectativas', etiqueta: 'Expectativas' },
  { valor: 'vendedores', etiqueta: 'Número de vendedores' },
];

export const DEF = {
  a: 100,
  b: 2,
  c: 10,
  d: 3,
  elastica: 'ninguna' as string,
  p_horizontal: 20,
  evento_d: 'ninguno' as string,
  cambio_d: 20,
  evento_s: 'ninguno' as string,
  cambio_s: 20,
};
type P = typeof DEF;

export function deltaDemanda(evento: string, cambio: number): number {
  if (evento === 'ninguno') return 0;
  if (evento === 'ingreso_normal' || evento === 'ingreso_inferior')
    return desplazamientoDemanda({ ingreso: cambio, bien: evento.split('_')[1] });
  if (evento === 'sustituto' || evento === 'complemento')
    return desplazamientoDemanda({ precioRelacionado: cambio, relacion: evento });
  return desplazamientoDemanda({ [evento]: cambio });
}

export function deltaOferta(evento: string, cambio: number): number {
  if (evento === 'ninguno') return 0;
  const clave = evento === 'insumos' ? 'precioInsumos' : evento;
  return desplazamientoOferta({ [clave]: cambio });
}

const direccion = (nuevo: number, viejo: number): string =>
  Math.abs(nuevo - viejo) < 1e-9 ? 'no cambia' : nuevo > viejo ? 'sube' : 'baja';

function calcularSim(p: P): Simulacion {
  const { a, b, c, d, elastica, p_horizontal: pH, evento_d, cambio_d, evento_s, cambio_s } = p;
  const [D0, S0] = curvas(a, b, c, d, elastica, pH);
  const D1 = D0.desplazar(deltaDemanda(evento_d, cambio_d));
  const S1 = S0.desplazar(deltaOferta(evento_s, cambio_s));
  const e0 = equilibrio(D0, S0);
  const e1 = equilibrio(D1, S1);
  const hayCambio = !D1.igual(D0) || !S1.igual(S0);

  const xMax = limite([e0.q, e1.q, D0.a, D1.a], 10);
  let yMax = limite([e0.p, e1.p, D0.precioMaximo, D1.precioMaximo], 10);
  yMax = Math.min(yMax, limite([e0.p, e1.p], 10) * 2.5);
  const fig = figuraBase('Cantidad (Q)', 'Precio (P)', xMax, yMax, SIM_ID);
  lineaCurva(
    fig,
    D0,
    xMax,
    yMax,
    hayCambio ? 'Demanda inicial' : 'Demanda',
    COLOR.demanda,
    hayCambio,
  );
  lineaCurva(fig, S0, xMax, yMax, hayCambio ? 'Oferta inicial' : 'Oferta', COLOR.oferta, hayCambio);
  if (!D1.igual(D0)) lineaCurva(fig, D1, xMax, yMax, 'Demanda nueva', COLOR.demanda);
  if (!S1.igual(S0)) lineaCurva(fig, S1, xMax, yMax, 'Oferta nueva', COLOR.oferta);
  if (e0.intercambio) {
    guias(fig, e0.q, e0.p);
    punto(
      fig,
      e0.q,
      e0.p,
      hayCambio ? 'Equilibrio inicial' : 'Equilibrio',
      undefined,
      undefined,
      1,
      hayCambio ? 'E₀' : 'E',
    );
  }
  if (hayCambio && e1.intercambio) {
    guias(fig, e1.q, e1.p);
    punto(fig, e1.q, e1.p, 'Equilibrio nuevo', COLOR.nuevo, 'diamond', 1, 'E₁');
  }

  const filas: (string | number | null)[][] = [
    ['Precio de equilibrio P*', e0.intercambio ? e0.p : null],
    ['Cantidad de equilibrio Q*', e0.q],
  ];
  const bloques: Bloque[] = [];
  if (!e0.intercambio)
    bloques.push(
      aviso(
        'Sin intercambio: el precio más alto que pagan los compradores es menor que el precio mínimo que aceptan los vendedores.',
        'info',
      ),
    );
  if (hayCambio) {
    filas.push(['Nuevo precio P₁', e1.intercambio ? e1.p : null], ['Nueva cantidad Q₁', e1.q]);
    if (
      elastica !== 'ninguna' &&
      ((elastica === 'demanda' && evento_d !== 'ninguno') ||
        (elastica === 'oferta' && evento_s !== 'ninguno'))
    )
      bloques.push(
        aviso(
          'Una curva horizontal desplazada hacia los lados es la misma curva: ese determinante no cambia el resultado.',
          'info',
        ),
      );
    if (e0.intercambio && elastica === 'ninguna') {
      const exceso = D1.cantidad(e0.p) - S1.cantidad(e0.p);
      filas.push([
        `Al precio anterior hay ${exceso > 0 ? 'escasez' : 'excedente'} de`,
        Math.abs(exceso),
      ]);
    }
    bloques.push(
      aviso(`El precio ${direccion(e1.p, e0.p)} y la cantidad ${direccion(e1.q, e0.q)}.`, 'info'),
    );
  }
  return {
    fig,
    panel: panel(filas, bloques, 'cap. 4, «Las fuerzas del mercado: la oferta y la demanda».'),
  };
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 540,
  grupos: [
    ...controlesCurvas(),
    {
      titulo: 'Desplazamiento de la demanda',
      controles: [
        {
          id: 'evento_d',
          etiqueta: 'Determinante de la demanda',
          tipo: 'selector',
          opciones: EVENTOS_D,
        },
        {
          id: 'cambio_d',
          etiqueta: 'Aumento (+) o disminución (−) del determinante',
          tipo: 'slider',
          min: -50,
          max: 50,
          paso: 1,
        },
      ],
    },
    {
      titulo: 'Desplazamiento de la oferta',
      controles: [
        {
          id: 'evento_s',
          etiqueta: 'Determinante de la oferta',
          tipo: 'selector',
          opciones: EVENTOS_S,
        },
        {
          id: 'cambio_s',
          etiqueta: 'Aumento (+) o disminución (−) del determinante',
          tipo: 'slider',
          min: -50,
          max: 50,
          paso: 1,
        },
      ],
    },
  ],
  calcular: (p: Params) => seguro<P>(p, calcularSim),
};
