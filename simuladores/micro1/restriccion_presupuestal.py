"""Simulador 1 — Restricción presupuestal (Monsalve, sección 1.4)."""
import numpy as np
import plotly.graph_objects as go
from dash import Input, Output, html

from simuladores.base import control_deslizante, grafica, id_componente, marco_simulador
from simuladores.micro1 import _ui
from simuladores.micro1.modelos import ErrorParametro, presupuesto as pr

MATERIA_ID, SIM_ID = "micro1", "restriccion-presupuestal"
DEF = dict(p1=3, p2=2, M=45, p1n=3.6, p2n=2, Mn=45)


def _id(n):
    return id_componente(MATERIA_ID, SIM_ID, n)


def calcular(p1, p2, M, p1n, p2n, Mn):
    try:
        c = pr.cambio(p1, p2, M, p1n=p1n, p2n=p2n, Mn=Mn)
    except ErrorParametro as e:
        return _ui.figura_error(str(e)), _ui.aviso(str(e), "error")
    a, d = c["antes"], c["despues"]
    xmax = max(a["intercepto_x"], d["intercepto_x"]) * 1.1 or 1
    ymax = max(a["intercepto_y"], d["intercepto_y"]) * 1.1 or 1
    fig = _ui.figura("Bien x", "Bien y", SIM_ID, xaxis_range=[0, xmax], yaxis_range=[0, ymax])
    fig.add_trace(go.Scatter(x=[0, a["intercepto_x"], 0], y=[0, 0, a["intercepto_y"]], fill="toself",
                             fillcolor="rgba(91,155,255,.18)", line=dict(width=0),
                             name="Conjunto presupuestal", hoverinfo="skip"))
    fig.add_trace(go.Scatter(x=[0, a["intercepto_x"]], y=[a["intercepto_y"], 0], mode="lines",
                             name=f"Inicial: {p1:g}x + {p2:g}y = {M:g}", line=dict(width=3, color=_ui.AZUL)))
    if c["tipo"] != "sin_cambio":
        fig.add_trace(go.Scatter(x=[0, d["intercepto_x"]], y=[d["intercepto_y"], 0], mode="lines",
                                 name=f"Nueva: {p1n:g}x + {p2n:g}y = {Mn:g}",
                                 line=dict(width=3, color=_ui.DORADO, dash="dash")))
    nombres = {"sin_cambio": "Sin cambio", "desplazamiento_paralelo": "Desplazamiento paralelo (cambió M o todos los precios en igual proporción)",
               "rotacion_sobre_eje_y": "Rotación sobre el intercepto en y (cambió p1)",
               "rotacion_sobre_eje_x": "Rotación sobre el intercepto en x (cambió p2)",
               "cambio_combinado": "Cambio combinado (las rectas se cruzan)"}
    panel = _ui.resultados([
        _ui.lectura("Recta inicial", _ui.tabla([
            ("Intercepto en x (M/p1)", a["intercepto_x"]), ("Intercepto en y (M/p2)", a["intercepto_y"]),
            ("Pendiente (−p1/p2)", a["pendiente"]), ("Área del conjunto", a["area_conjunto"])])),
        _ui.lectura("Después del cambio", _ui.tabla([
            ("Intercepto en x", d["intercepto_x"]), ("Intercepto en y", d["intercepto_y"]),
            ("Pendiente", d["pendiente"]), ("Canastas ganadas (área)", c["area_ganada"]),
            ("Canastas perdidas (área)", c["area_perdida"])])),
        _ui.lectura("Lectura económica",
                    html.P(nombres[c["tipo"]]),
                    html.P("La pendiente es el costo de oportunidad de x medido en unidades de y. "
                           "Multiplicar precios e ingreso por el mismo número no mueve la recta "
                           "(no hay ilusión monetaria)."),
                    _ui.referencia("sección 1.4, figuras 1.10–1.14.")),
    ])
    return fig, panel


def construir_layout():
    from registro import buscar_materia
    materia = buscar_materia(MATERIA_ID)
    sim = materia.buscar(SIM_ID)
    controles = [
        _ui.grupo("Situación inicial",
                  control_deslizante(_id("p1"), "Precio de x (p1)", 0.5, 10, DEF["p1"], 0.1),
                  control_deslizante(_id("p2"), "Precio de y (p2)", 0.5, 10, DEF["p2"], 0.1),
                  control_deslizante(_id("M"), "Ingreso (M)", 0, 100, DEF["M"], 1)),
        _ui.grupo("Cambio a comparar",
                  control_deslizante(_id("p1n"), "Nuevo p1", 0.5, 10, DEF["p1n"], 0.1),
                  control_deslizante(_id("p2n"), "Nuevo p2", 0.5, 10, DEF["p2n"], 0.1),
                  control_deslizante(_id("Mn"), "Nuevo M", 0, 100, DEF["Mn"], 1)),
    ]
    fig, panel = calcular(**DEF)
    return marco_simulador(materia, sim, controles, grafica(_id("grafica"), fig, alto=540),
                           html.Div(panel, id=_id("resultados")))


def registrar_callbacks(app):
    @app.callback(Output(_id("grafica"), "figure"), Output(_id("resultados"), "children"),
                  *[Input(_id(k), "value") for k in DEF])
    def _actualizar(*v):
        return calcular(*[_ui.seguro(x, DEF[k]) for x, k in zip(v, DEF)])
