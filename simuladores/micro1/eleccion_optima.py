"""Simulador 3 — Elección óptima del consumidor (Monsalve, semanas 1–2)."""
import math

import numpy as np
import plotly.graph_objects as go
from dash import Input, Output, html

from simuladores.base import control_deslizante, grafica, id_componente, marco_simulador
from simuladores.micro1 import _ui
from simuladores.micro1.modelos import ErrorParametro
from simuladores.micro1.preferencias import FAMILIAS, crear_utilidad, curva

MATERIA_ID, SIM_ID = "micro1", "eleccion-optima"
DEF = dict(familia="cd", a=1.0, b=1.0, p1=3.0, p2=2.0, M=45.0)

TIPOS = {"interior": "Solución interior (tangencia)", "vertice": "Vértice de la escuadra (Leontief)",
         "esquina_x": "Esquina: sólo compra x", "esquina_y": "Esquina: sólo compra y",
         "indeterminado": "Indeterminada: cualquier punto de la recta es óptimo"}


def _id(n):
    return id_componente(MATERIA_ID, SIM_ID, n)


def calcular(familia, a, b, p1, p2, M):
    try:
        u = crear_utilidad(familia, a, b)
        r = u.eleccion_optima(p1, p2, M)
    except ErrorParametro as e:
        return _ui.figura_error(str(e)), _ui.aviso(str(e), "error")
    X, Y = M / p1, M / p2
    lim_x, lim_y = max(X, r["x"]) * 1.15 or 1, max(Y, r["y"]) * 1.15 or 1
    fig = _ui.figura("Bien x", "Bien y", SIM_ID, xaxis_range=[0, lim_x], yaxis_range=[0, lim_y])
    fig.add_trace(go.Scatter(x=[0, X, 0], y=[0, 0, Y], fill="toself", fillcolor="rgba(91,155,255,.12)",
                             line=dict(width=0), hoverinfo="skip", showlegend=False))
    fig.add_trace(go.Scatter(x=[0, X], y=[Y, 0], mode="lines", name="Recta presupuestal",
                             line=dict(width=3, color=_ui.AZUL)))
    if r["tipo"] == "indeterminado":
        fig.add_trace(go.Scatter(x=[0, X], y=[Y, 0], mode="lines", name="Todas las canastas son óptimas",
                                 line=dict(width=8, color=_ui.ACENTO), opacity=0.6))
    U = r["utilidad"]
    if U and math.isfinite(U) and U > 0:
        cx, cy = curva(u, U, np.linspace(1e-3, lim_x, 500))
        cy = [c if (c is None or c <= lim_y * 1.3) else None for c in cy]
        fig.add_trace(go.Scatter(x=cx, y=cy, mode="lines", name="Curva de indiferencia óptima",
                                 line=dict(width=3, color=_ui.DORADO)))
    _ui.punto(fig, r["x"], r["y"], "Canasta óptima", texto=f"({_ui.fmt(r['x'], 2)}, {_ui.fmt(r['y'], 2)})")

    filas = [("x*", r["x"]), ("y*", r["y"]), ("Utilidad máxima", U),
             ("Gasto p1·x* + p2·y*", r["gasto"]), ("Precio relativo p1/p2", r["precio_relativo"])]
    if r["tms"] is not None:
        filas.append(("TMS en el óptimo", r["tms"]))
    extra = []
    if r.get("nota"):
        extra.append(_ui.aviso(r["nota"]))
    if hasattr(u, "ingreso_minimo_interior"):
        extra.append(html.P(f"Con estos precios, la solución es interior si M ≥ "
                            f"{_ui.fmt(u.ingreso_minimo_interior(p1, p2))}."))
    panel = _ui.resultados([
        _ui.lectura("Canasta óptima", _ui.tabla(filas)),
        _ui.lectura("Tipo de solución", html.P(TIPOS.get(r["tipo"], r["tipo"]), className="destacado"),
                    html.P("En una solución interior se cumple la ecuación de Jevons: "
                           "TMS = p1/p2 (valor subjetivo = valor de mercado)."), *extra),
        _ui.lectura("Para probar en clase",
                    html.P("Multiplique p1, p2 y M por el mismo número: la canasta no cambia "
                           "(no hay ilusión monetaria). Con sustitutos perfectos, iguale p1/a y p2/b."),
                    _ui.referencia("ejemplos 3–7 de la semana 1; ejemplos 4–6 de la semana 2.")),
    ])
    return fig, panel


def construir_layout():
    from registro import buscar_materia
    materia = buscar_materia(MATERIA_ID)
    sim = materia.buscar(SIM_ID)
    controles = [
        _ui.selector(_id("familia"), "Tipo de preferencias", FAMILIAS, DEF["familia"]),
        _ui.grupo("Preferencias",
                  control_deslizante(_id("a"), "α (o a)", 0.1, 3, DEF["a"], 0.1),
                  control_deslizante(_id("b"), "β (o b)", 0.1, 3, DEF["b"], 0.1)),
        _ui.grupo("Mercado",
                  control_deslizante(_id("p1"), "Precio de x (p1)", 0.5, 10, DEF["p1"], 0.1),
                  control_deslizante(_id("p2"), "Precio de y (p2)", 0.5, 10, DEF["p2"], 0.1),
                  control_deslizante(_id("M"), "Ingreso (M)", 0, 100, DEF["M"], 1)),
    ]
    fig, panel = calcular(**DEF)
    return marco_simulador(materia, sim, controles, grafica(_id("grafica"), fig, alto=540),
                           html.Div(panel, id=_id("resultados")))


def registrar_callbacks(app):
    @app.callback(Output(_id("grafica"), "figure"), Output(_id("resultados"), "children"),
                  *[Input(_id(k), "value") for k in DEF])
    def _actualizar(*v):
        return calcular(*[_ui.seguro(x, DEF[k]) for x, k in zip(v, DEF)])
