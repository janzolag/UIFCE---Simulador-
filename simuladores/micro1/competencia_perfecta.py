"""Simulador 8 — Competencia perfecta: empresa y mercado (Monsalve, semanas 7–8)."""
import numpy as np
import plotly.graph_objects as go
from dash import Input, Output, html
from plotly.subplots import make_subplots

from simuladores.base import control_deslizante, grafica, id_componente, marco_simulador
from simuladores.micro1 import _ui
from simuladores.micro1.modelos import ErrorParametro
from simuladores.micro1.modelos import competencia as cp
from simuladores.micro1.modelos.costos import CostoCubico

MATERIA_ID, SIM_ID = "micro1", "competencia-perfecta"
DEF = dict(CF=20.0, a=10.0, b=2.0, c=0.5, n=20, Ad=400.0, Bd=10.0)
ZONAS = {"cierra": ("La empresa cierra: el precio no cubre ni el costo variable medio.", "error"),
         "opera_con_perdidas": ("Opera con pérdidas: cubre el costo variable y parte del fijo. "
                                "Cerrar le costaría todo el costo fijo.", "info"),
         "beneficio_cero": ("Beneficio económico cero: situación de largo plazo.", "info"),
         "beneficio_positivo": ("Beneficio positivo: en el largo plazo entrarían más empresas.", "info")}


def _id(n):
    return id_componente(MATERIA_ID, SIM_ID, n)


def calcular(CF, a, b, c, n, Ad, Bd):
    try:
        k = CostoCubico(CF, a, b, c)
        eq = cp.equilibrio_n_empresas_cubicas(Ad, Bd, k, int(n))
    except ErrorParametro as e:
        return _ui.figura_error(str(e)), _ui.aviso(str(e), "error")
    p, q = eq["p"], eq["q_empresa"]
    of = cp.oferta_empresa_cubica(k, p)
    fig = make_subplots(rows=1, cols=2, horizontal_spacing=0.12,
                        subplot_titles=("Una empresa", f"Mercado ({int(n)} empresas)"))
    fig.update_layout(template="uifce", uirevision=SIM_ID, legend=dict(orientation="h", y=-0.2, x=0),
                      margin=dict(l=56, r=24, t=56, b=76))
    qmax = max(2.2 * k.q_min_cme(), q * 1.4, 1)
    qs = np.linspace(qmax / 300, qmax, 300)
    for nom, f, col, dash in (("CMg", k.CMg, _ui.ROJO, "solid"), ("CMe", k.CMe, _ui.AZUL, "solid"),
                              ("CVMe", k.CVMe, _ui.VERDE, "dash")):
        fig.add_trace(go.Scatter(x=qs, y=[f(v) for v in qs], mode="lines", name=nom,
                                 line=dict(color=col, width=2.5, dash=dash)), row=1, col=1)
    if q > 0:
        cme = k.CMe(q)
        fig.add_trace(go.Scatter(x=[0, q, q, 0, 0], y=[cme, cme, p, p, cme], fill="toself",
                                 fillcolor="rgba(61,214,181,.25)" if p >= cme else "rgba(255,122,133,.25)",
                                 line=dict(width=0), name="Beneficio" if p >= cme else "Pérdida",
                                 hoverinfo="skip"), row=1, col=1)
    fig.add_trace(go.Scatter(x=[0, qmax], y=[p, p], mode="lines", name="Precio de mercado = IMg",
                             line=dict(color=_ui.ACENTO, dash="dot", width=2)), row=1, col=1)
    _ui.punto(fig, q, p, "Producción de la empresa", row=1, col=1, showlegend=False)
    ytop = max(k.CMe(k.q_min_cme()) * 2.2, p * 1.4)
    fig.update_yaxes(range=[0, ytop], row=1, col=1)

    ps = np.linspace(0, Ad / Bd, 300)
    fig.add_trace(go.Scatter(x=[max(Ad - Bd * v, 0) for v in ps], y=ps, mode="lines", name="Demanda de mercado",
                             line=dict(color=_ui.NARANJA, width=3)), row=1, col=2)
    fig.add_trace(go.Scatter(x=[n * cp.oferta_empresa_cubica(k, v)["q"] for v in ps], y=ps, mode="lines",
                             name="Oferta de mercado (n·CMg)", line=dict(color=_ui.ROJO, width=3)), row=1, col=2)
    _ui.punto(fig, eq["Q"], p, "Equilibrio", row=1, col=2, showlegend=False)
    fig.update_xaxes(title_text="q (empresa)", row=1, col=1, rangemode="tozero")
    fig.update_xaxes(title_text="Q (mercado)", row=1, col=2, rangemode="tozero")
    fig.update_yaxes(title_text="Precio", row=1, col=1)
    fig.update_yaxes(range=[0, Ad / Bd * 1.02], row=1, col=2)

    texto, tipo = ZONAS[of["zona"]]
    try:
        le = cp.n_libre_entrada(Ad, Bd, k)
        largo = _ui.tabla([("Precio = mín CMe", le["p"]), ("q por empresa", le["q_empresa"]),
                           ("Número de empresas", le["n"])])
    except ErrorParametro as e:
        largo = _ui.aviso(str(e))
    panel = _ui.resultados([
        _ui.lectura("Equilibrio de corto plazo", _ui.tabla([
            ("Precio p*", p), ("Cantidad de mercado Q*", eq["Q"]), ("q por empresa", q),
            ("Beneficio por empresa", eq["beneficio_empresa"]),
            ("Precio de cierre (mín CVMe)", k.precio_cierre()),
            ("Precio de nivelación (mín CMe)", k.precio_nivelacion())])),
        _ui.lectura("Situación de la empresa", _ui.aviso(texto, tipo),
                    html.P("La empresa es precio-aceptante: produce donde p = CMg, en el tramo creciente "
                           "del CMg por encima del mínimo del CVMe.")),
        _ui.lectura("Largo plazo con libre entrada", largo,
                    html.P("El número de empresas casi nunca es entero (el “problema del número entero” "
                           "que discute Monsalve).", className="pequeno texto-suave"),
                    _ui.referencia("secciones 7.6–7.7 y semana 8.")),
    ])
    return fig, panel


def construir_layout():
    from registro import buscar_materia
    materia = buscar_materia(MATERIA_ID)
    sim = materia.buscar(SIM_ID)
    controles = [
        _ui.grupo("Costos de cada empresa: CF + aq − bq² + cq³",
                  control_deslizante(_id("CF"), "Costo fijo CF", 0, 100, DEF["CF"], 1),
                  control_deslizante(_id("a"), "a", 1, 30, DEF["a"], 0.5),
                  control_deslizante(_id("b"), "b", 0, 5, DEF["b"], 0.1),
                  control_deslizante(_id("c"), "c", 0.05, 2, DEF["c"], 0.05)),
        _ui.grupo("Mercado",
                  control_deslizante(_id("n"), "Número de empresas n", 1, 100, DEF["n"], 1),
                  control_deslizante(_id("Ad"), "Demanda: intercepto (Q = A − B·p)", 50, 1000, DEF["Ad"], 10),
                  control_deslizante(_id("Bd"), "Demanda: pendiente B", 1, 50, DEF["Bd"], 1)),
    ]
    fig, panel = calcular(**DEF)
    return marco_simulador(materia, sim, controles, grafica(_id("grafica"), fig, alto=540),
                           html.Div(panel, id=_id("resultados")))


def registrar_callbacks(app):
    @app.callback(Output(_id("grafica"), "figure"), Output(_id("resultados"), "children"),
                  *[Input(_id(k), "value") for k in DEF])
    def _actualizar(*v):
        return calcular(*[_ui.seguro(x, DEF[k]) for x, k in zip(v, DEF)])
