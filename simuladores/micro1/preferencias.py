"""Simulador 2 — Preferencias y curvas de indiferencia (Monsalve, secciones 1.2–1.3)."""
import math

import numpy as np
import plotly.graph_objects as go
from dash import Input, Output, html

from simuladores.base import control_deslizante, grafica, id_componente, marco_simulador
from simuladores.micro1 import _ui
from simuladores.micro1.modelos import ErrorParametro
from simuladores.micro1.modelos.consumidor import (CobbDouglas, CuasilinealRaiz, Leontief,
                                                   Lineal, SeparableRaiz, StoneGeary)

MATERIA_ID, SIM_ID = "micro1", "preferencias"
FAMILIAS = {"cd": "Cobb-Douglas", "leontief": "Complementarios (Leontief)",
            "lineal": "Sustitutos perfectos", "cuasi": "Cuasilineal", "separable": "Separable",
            "stone": "Stone-Geary"}
DEF = dict(familia="cd", a=1.0, b=1.0, x0=4.0, y0=5.0)
LIM = 10


def _id(n):
    return id_componente(MATERIA_ID, SIM_ID, n)


def crear_utilidad(familia, a, b):
    return {"cd": lambda: CobbDouglas(a, b), "leontief": lambda: Leontief(a, b),
            "lineal": lambda: Lineal(a, b), "cuasi": lambda: CuasilinealRaiz(a),
            "separable": lambda: SeparableRaiz(a, b),
            "stone": lambda: StoneGeary(a, b, 1, 1)}[familia]()


def curva(u, U0, xs):
    """Puntos (x, y) de la curva de indiferencia; maneja la escuadra de Leontief."""
    if isinstance(u, Leontief):
        xv, yv = U0 / u.a, U0 / u.b
        return [xv, xv, LIM * 1.2], [LIM * 1.2, yv, yv]
    ys = [u.curva_indiferencia(U0, x) for x in xs]
    ys = [y if (y is not None and math.isfinite(y) and 0 <= y <= LIM * 1.5) else None for y in ys]
    return list(xs), ys


def calcular(familia, a, b, x0, y0):
    try:
        u = crear_utilidad(familia, a, b)
    except ErrorParametro as e:
        return _ui.figura_error(str(e)), _ui.aviso(str(e), "error")
    fig = _ui.figura("Bien x", "Bien y", SIM_ID, xaxis_range=[0, LIM], yaxis_range=[0, LIM])
    xs = np.linspace(1e-3, LIM, 400)
    base = [(2, 2), (4, 4), (6, 6), (8, 8)] if familia != "stone" else [(2.5, 2.5), (4, 4), (6, 6), (8, 8)]
    U0p = u.U(x0, y0)
    for i, (bx, by) in enumerate(base):
        U0 = u.U(bx, by)
        cx, cy = curva(u, U0, xs)
        fig.add_trace(go.Scatter(x=cx, y=cy, mode="lines", name=f"U = {_ui.fmt(U0, 2)}",
                                 line=dict(width=2, color=_ui.AZUL), opacity=0.35 + 0.15 * i,
                                 connectgaps=False, hoverinfo="skip", showlegend=(i == 0 or i == 3)))
    cx, cy = curva(u, U0p, xs)
    fig.add_trace(go.Scatter(x=cx, y=cy, mode="lines", name="Curva que pasa por la canasta",
                             line=dict(width=3, color=_ui.DORADO)))
    tms = u.tms(x0, y0)
    if tms is not None and math.isfinite(tms) and tms < 1e3:
        dx = 1.2
        fig.add_trace(go.Scatter(x=[x0 - dx, x0 + dx], y=[y0 + tms * dx, y0 - tms * dx], mode="lines",
                                 name="Pendiente = −TMS", line=dict(color=_ui.VERDE, dash="dot", width=2)))
    _ui.punto(fig, x0, y0, "Canasta (x0, y0)")

    prop = u.propiedades
    si = lambda v: "Sí" if v else "No"
    panel = _ui.resultados([
        _ui.lectura("En la canasta elegida", _ui.tabla([
            ("Utilidad U(x0, y0)", U0p),
            ("TMS = UMg_x / UMg_y", tms if tms is not None else "no definida (vértice)"),
            ("Interpretación", f"cede {_ui.fmt(tms)} de y por 1 de x" if tms and math.isfinite(tms) else "—")])),
        _ui.lectura("Propiedades de estas preferencias", _ui.tabla([
            ("Monótona estricta", si(prop.get("monotona"))), ("Convexa (dieta balanceada)", si(prop.get("convexa"))),
            ("Homotética", si(prop.get("homotetica"))), ("Diferenciable", si(prop.get("diferenciable")))])),
        _ui.lectura("Lectura económica", html.P(_texto(familia)),
                    _ui.referencia("ejemplos 1 y 2 de la semana 1; sección 3.6 (homotéticas).")),
    ])
    return fig, panel


def _texto(f):
    return {
        "cd": "Curvas hiperbólicas: la TMS cae a medida que se tiene más x (convexidad). α y β son las elasticidades de la utilidad.",
        "leontief": "Escuadras: los bienes se consumen en proporción fija (by = ax). Más de un solo bien no aumenta la utilidad; la TMS no existe en el vértice.",
        "lineal": "Rectas: la TMS es constante (a/b). El consumidor cambia un bien por el otro siempre en la misma proporción.",
        "cuasi": "Curvas desplazadas verticalmente: la TMS sólo depende de x, por eso la demanda de x no depende del ingreso.",
        "separable": "Como Cobb-Douglas, pero las curvas tocan los ejes: es posible no consumir uno de los bienes.",
        "stone": "Cobb-Douglas desplazada: exige un consumo mínimo de 1 unidad de cada bien (niveles de subsistencia).",
    }[f]


def construir_layout():
    from registro import buscar_materia
    materia = buscar_materia(MATERIA_ID)
    sim = materia.buscar(SIM_ID)
    controles = [
        _ui.selector(_id("familia"), "Tipo de preferencias", FAMILIAS, DEF["familia"]),
        _ui.grupo("Parámetros",
                  control_deslizante(_id("a"), "α (o a)", 0.1, 3, DEF["a"], 0.1),
                  control_deslizante(_id("b"), "β (o b)", 0.1, 3, DEF["b"], 0.1)),
        _ui.grupo("Canasta para medir la TMS",
                  control_deslizante(_id("x0"), "x0", 0.2, 9.5, DEF["x0"], 0.1),
                  control_deslizante(_id("y0"), "y0", 0.2, 9.5, DEF["y0"], 0.1)),
    ]
    fig, panel = calcular(**DEF)
    return marco_simulador(materia, sim, controles, grafica(_id("grafica"), fig, alto=540),
                           html.Div(panel, id=_id("resultados")))


def registrar_callbacks(app):
    @app.callback(Output(_id("grafica"), "figure"), Output(_id("resultados"), "children"),
                  *[Input(_id(k), "value") for k in DEF])
    def _actualizar(*v):
        return calcular(*[_ui.seguro(x, DEF[k]) for x, k in zip(v, DEF)])
