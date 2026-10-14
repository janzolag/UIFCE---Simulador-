/** Comercio internacional: precio mundial, arancel y cuota (Mankiw, cap. 9). Port de comercio_internacional.py. */
import { Bloque, Params, Simulacion, SimuladorDef } from '../../core/tipos';
import { aviso } from '../../core/tema';
import { comercio } from '../modelos/comercio';
import { Demanda, Oferta } from '../modelos/mercado';
import {
  COLOR,
  area,
  controlesCurvas,
  figuraBase,
  horizontal,
  limite,
  lineaCurva,
  panel,
  punto,
  seguro,
} from './_ui';

const SIM_ID = 'comercio-internacional';

export const DEF = {
  precio_mundial: 12,
  politica: 'libre' as string,
  arancel: 3,
  cuota: 15,
  a: 100,
  b: 2,
  c: 10,
  d: 3,
};
type P = typeof DEF;

function calcularSim(p: P): Simulacion {
  const { precio_mundial: precioMundial, politica, arancel, cuota } = p;
  const D = new Demanda(p.a, p.b);
  const S = new Oferta(p.c, p.d);
  const r = comercio(
    D,
    S,
    precioMundial,
    politica === 'arancel' ? arancel : 0,
    politica === 'cuota' ? cuota : null,
  );
  const pInt = r.precioInterno;
  const pw = r.precioMundial;
  const xMax = limite([r.qd, r.qs, r.qAutarquia, D.a], 10);
  const yMax = Math.min(
    limite([pInt, pw, r.pAutarquia, D.precioMaximo], 10),
    limite([pInt, pw, r.pAutarquia], 10) * 2.5,
  );
  const fig = figuraBase('Cantidad (Q)', 'Precio (P)', xMax, yMax, SIM_ID);
  const qCons = r.qd;
  const qProd = r.qs;
  area(
    fig,
    0,
    qCons,
    (x) => D.precio(x),
    () => pInt,
    COLOR.ec,
    'Excedente del consumidor',
    yMax,
  );
  area(
    fig,
    0,
    qProd,
    () => pInt,
    (x) => S.precio(x),
    COLOR.ep,
    'Excedente del productor',
    yMax,
  );
  if (r.rol === 'importador' && pInt > pw + 1e-9 && r.importaciones > 0) {
    const nombre = politica === 'arancel' ? 'Recaudo del arancel' : 'Rentas de la cuota';
    area(
      fig,
      qProd,
      qCons,
      () => pInt,
      () => pw,
      COLOR.recaudo,
      nombre,
      yMax,
    );
    const qLibreS = S.cantidad(pw);
    const qLibreD = D.cantidad(pw);
    area(
      fig,
      qLibreS,
      qProd,
      (x) => S.precio(x),
      () => pw,
      COLOR.ppm,
      'Pérdida de peso muerto',
      yMax,
    );
    area(
      fig,
      qCons,
      qLibreD,
      (x) => D.precio(x),
      () => pw,
      COLOR.ppm,
      'Pérdida de peso muerto ',
      yMax,
    );
  }
  lineaCurva(fig, D, xMax, yMax, 'Demanda interna', COLOR.demanda);
  lineaCurva(fig, S, xMax, yMax, 'Oferta interna', COLOR.oferta);
  horizontal(fig, pw, xMax, 'Precio mundial', COLOR.equilibrio);
  if (pInt > pw + 1e-9)
    horizontal(fig, pInt, xMax, 'Precio interno con arancel/cuota', COLOR.social, 1, 'dash');
  punto(
    fig,
    r.qAutarquia,
    r.pAutarquia,
    'Equilibrio sin comercio',
    undefined,
    undefined,
    1,
    'Autarquía',
  );
  punto(fig, qProd, pInt, 'Producción nacional', COLOR.oferta, 'diamond');
  punto(fig, qCons, pInt, 'Consumo nacional', COLOR.demanda, 'diamond');

  const filas = [
    ['El país es', r.rol],
    ['Precio interno', pInt],
    ['Producción nacional', r.qs],
    ['Consumo nacional', r.qd],
    [r.importaciones >= 0 ? 'Importaciones' : 'Exportaciones', Math.abs(r.importaciones)],
    ['Excedente del consumidor', r.bienestar.ec],
    ['Excedente del productor', r.bienestar.ep],
    ['Recaudo / rentas de cuota', r.recaudo + r.rentasCuota],
    ['Excedente total', r.bienestar.total],
    ['Ganancia frente a no comerciar', r.gananciaVsAutarquia],
    ['Pérdida de peso muerto', r.ppm],
  ];
  const bloques: Bloque[] = [];
  if (r.prohibitivo)
    bloques.push(
      aviso(
        'La política elimina las importaciones: el país vuelve al equilibrio sin comercio.',
        'info',
      ),
    );
  if (r.rol === 'exportador' && politica !== 'libre')
    bloques.push(
      aviso('El país exporta: un arancel o una cuota de importación no tienen efecto.', 'info'),
    );
  return {
    fig,
    panel: panel(
      filas,
      bloques,
      'cap. 9, «Aplicación: el comercio internacional»: ganadores, perdedores, aranceles y cuotas.',
    ),
  };
}

export const SIM: SimuladorDef = {
  defecto: { ...DEF },
  alto: 540,
  grupos: [
    {
      titulo: 'Precio y política',
      controles: [
        {
          id: 'precio_mundial',
          etiqueta: 'Precio mundial P_W',
          tipo: 'slider',
          min: 0,
          max: 50,
          paso: 0.5,
        },
        {
          id: 'politica',
          etiqueta: 'Política comercial',
          tipo: 'selector',
          opciones: [
            { valor: 'libre', etiqueta: 'Libre comercio' },
            { valor: 'arancel', etiqueta: 'Arancel' },
            { valor: 'cuota', etiqueta: 'Cuota de importación' },
          ],
        },
      ],
    },
    {
      visibleSi: (q) => q['politica'] === 'arancel',
      controles: [
        {
          id: 'arancel',
          etiqueta: 'Arancel por unidad τ',
          tipo: 'slider',
          min: 0,
          max: 30,
          paso: 0.5,
        },
      ],
    },
    {
      visibleSi: (q) => q['politica'] === 'cuota',
      controles: [
        {
          id: 'cuota',
          etiqueta: 'Cuota (unidades importadas)',
          tipo: 'slider',
          min: 0,
          max: 100,
          paso: 1,
        },
      ],
    },
    ...controlesCurvas(false),
  ],
  calcular: (p: Params) => seguro<P>(p, calcularSim),
};
