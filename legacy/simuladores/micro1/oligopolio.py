"""Simulador 10 — Oligopolio: Cournot, Stackelberg, cartel y Bertrand (Monsalve, semana 11)."""
import numpy as np
import plotly.graph_objects as go
from dash import Input, Output, html

from simuladores.base import control_deslizante, grafica, id_componente, marco_simulador
from simuladores.micro1 import _ui
from simuladores.micro1.modelos import ErrorParametro
from simuladores.micro1.modelos import oligopolio as ol

MATERIA_ID, SIM_ID = "micro1", "oligopolio"
DEF = dict(a=20.0, c=2.0, n=3)


def _id(n):
    return id_componente(MATERIA_ID, SIM_ID, n)


def calcular(a, c, n):
    try:
        co, st, ka = ol.cournot(a, c, 2), ol.stackelberg(a, c), ol.cartel(a, c, 2)
        cn, comp = ol.cournot(a, c, int(n)), ol.competitivo(a, c)
    except ErrorParametro as e:
        return _ui.figura_error(str(e)), _ui.aviso(str(e), "error")
    m = a - c
    fig = _ui.figura("Producción de la empresa 1 (y1)", "Producción de la empresa 2 (y2)", SIM_ID,
                     xaxis_range=[0, m * 1.05], yaxis_range=[0, m * 1.05])
    ys = np.linspace(0, m, 100)
    fig.add_trace(go.Scatter(x=[ol.reaccion(a, c, v) for v in ys], y=ys, mode="lines",
                             name="Reacción de la empresa 1", line=dict(color=_ui.AZUL, width=3)))
    fig.add_trace(go.Scatter(x=ys, y=[ol.reaccion(a, c, v) for v in ys], mode="lines",
                             name="Reacción de la empresa 2", line=dict(color=_ui.ROJO, width=3)))
    fig.add_trace(go.Scatter(x=[0, m], y=[m, 0], mode="lines", name="Producción competitiva (p = c)",
                             line=dict(color=_ui.VERDE, dash="dot", width=2)))
    fig.add_trace(go.Scatter(x=[0, m / 2], y=[m / 2, 0], mode="lines", name="Producción de cartel",
                             line=dict(color=_ui.MORADO, dash="dash", width=2)))
    _ui.punto(fig, co["y_i"], co["y_i"], "Cournot", texto="Cournot")
    _ui.punto(fig, st["y1"], st["y2"], "Stackelberg (1 líder)", color=_ui.NARANJA, texto="Stackelberg")
    _ui.punto(fig, ka["y_i"], ka["y_i"], "Cartel", color=_ui.MORADO, texto="cartel")
    _ui.punto(fig, m / 2, m / 2, "Bertrand (p = c)", color=_ui.VERDE, texto="Bertrand")

    filas = [("Cartel (monopolio)", ka["p"], ka["Y"], ka["beneficio_i"], ka["beneficio_i"]),
             ("Cournot, 2 empresas", co["p"], co["Y"], co["beneficio_i"], co["beneficio_i"]),
             ("Stackelberg", st["p"], st["Y"], st["beneficio1"], st["beneficio2"]),
             ("Bertrand / competencia", comp["p"], comp["Y"], 0.0, 0.0)]
    panel = _ui.resultados([
        _ui.lectura("Comparación de duopolios (p = a − Y, costo marginal c)",
                    _ui.tabla(filas, encabezado=["Estructura", "Precio", "Cantidad total", "Π empresa 1", "Π empresa 2"])),
        _ui.lectura(f"Cournot con n = {int(n)} empresas", _ui.tabla([
            ("Precio (a + nc)/(n + 1)", cn["p"]), ("Producción por empresa", cn["y_i"]),
            ("Producción total", cn["Y"]), ("Beneficio por empresa", cn["beneficio_i"]),
            ("HHI (escala 0–10 000)", cn["hhi"] * 10_000), ("Índice de Lerner", cn["lerner"])]),
                    html.P("Al aumentar n el precio converge al costo marginal: Cournot se acerca a la "
                           "competencia perfecta.", className="pequeno texto-suave")),
        _ui.lectura("Lectura económica",
                    html.P("Cartel > Cournot > Stackelberg > Bertrand en precio. El cartel no es estable: "
                           "dada la producción de la otra, cada empresa querría moverse a su curva de reacción."),
                    _ui.referencia("tabla 11.3 y figuras 11.4–11.5; paradoja de Bertrand (sección 11.3.3).")),
    ])
    return fig, panel


def construir_layout():
    from registro import buscar_materia
    materia = buscar_materia(MATERIA_ID)
    sim = materia.buscar(SIM_ID)
    controles = [
        _ui.grupo("Mercado: p = a − Y",
                  control_deslizante(_id("a"), "Precio máximo a", 5, 100, DEF["a"], 1),
                  control_deslizante(_id("c"), "Costo marginal c", 0, 50, DEF["c"], 0.5)),
        _ui.grupo("Oligopolio de Cournot",
                  control_deslizante(_id("n"), "Número de empresas n", 1, 50, DEF["n"], 1)),
    ]
    fig, panel = calcular(**DEF)
    return marco_simulador(materia, sim, controles, grafica(_id("grafica"), fig, alto=540),
                           html.Div(panel, id=_id("resultados")))


def registrar_callbacks(app):
    @app.callback(Output(_id("grafica"), "figure"), Output(_id("resultados"), "children"),
                  *[Input(_id(k), "value") for k in DEF])
    def _actualizar(*v):
        return calcular(*[_ui.seguro(x, DEF[k]) for x, k in zip(v, DEF)])
