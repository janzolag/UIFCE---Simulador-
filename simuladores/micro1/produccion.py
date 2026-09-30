"""Simulador 6 — Tecnología, isocuantas y maximización del beneficio (Monsalve, semana 5)."""
import math

import numpy as np
import plotly.graph_objects as go
from dash import Input, Output, html

from simuladores.base import control_deslizante, grafica, id_componente, marco_simulador
from simuladores.micro1 import _ui
from simuladores.micro1.modelos import ErrorParametro
from simuladores.micro1.modelos.produccion import CES, CobbDouglasP, LeontiefP, LinealP, SeparableP

MATERIA_ID, SIM_ID = "micro1", "produccion"
TECNOLOGIAS = {"cd": "Cobb-Douglas", "ces": "CES", "leontief": "Proporciones fijas (Leontief)",
               "lineal": "Sustitutos perfectos", "separable": "Separable √x + √y"}
DEF = dict(tec="cd", A=1.0, alpha=0.5, beta=0.25, rho=0.5, x0=4.0, y0=4.0, p=3.0, w1=2.0, w2=3.0)
LIM = 10


def _id(n):
    return id_componente(MATERIA_ID, SIM_ID, n)


def crear_tecnologia(tec, A, alpha, beta, rho):
    return {"cd": lambda: CobbDouglasP(A, alpha, beta),
            "ces": lambda: (CobbDouglasP(A, alpha, beta) if abs(rho) < 1e-9     # ρ → 0 es Cobb-Douglas
                            else CES(A, rho, alpha / (alpha + beta), alpha + beta)),
            "leontief": lambda: LeontiefP(alpha, beta), "lineal": lambda: LinealP(alpha, beta),
            "separable": lambda: SeparableP()}[tec]()


def calcular(tec, A, alpha, beta, rho, x0, y0, p, w1, w2):
    try:
        t = crear_tecnologia(tec, A, alpha, beta, rho)
    except ErrorParametro as e:
        return _ui.figura_error(str(e)), _ui.aviso(str(e), "error")
    fig = _ui.figura("Insumo x (p. ej. trabajo)", "Insumo y (p. ej. capital)", SIM_ID,
                     xaxis_range=[0, LIM], yaxis_range=[0, LIM])
    xs = np.linspace(1e-3, LIM, 400)
    for i, k in enumerate((2, 4, 6, 8)):
        q = t.F(k, k)
        if isinstance(t, LeontiefP):
            cx, cy = [q * t.a, q * t.a, LIM * 1.2], [LIM * 1.2, q * t.b, q * t.b]
        else:
            cx = list(xs)
            cy = [t.isocuanta(q, x) for x in xs]
            cy = [c if (c is not None and math.isfinite(c) and 0 <= c <= LIM * 1.5) else None for c in cy]
        fig.add_trace(go.Scatter(x=cx, y=cy, mode="lines", name=f"q = {_ui.fmt(q, 2)}",
                                 line=dict(color=_ui.AZUL, width=2), opacity=0.4 + 0.15 * i))
    _ui.punto(fig, x0, y0, "Combinación (x0, y0)")

    rend = t.rendimientos(1.3, 2.1)
    pmg = t.pmg(x0, y0)
    tmst = t.tmst(x0, y0)
    sigma = t.elasticidad_sustitucion()
    filas = [("Producción F(x0, y0)", t.F(x0, y0)),
             ("PMg de x", pmg[0] if pmg else "no definido"), ("PMg de y", pmg[1] if pmg else "no definido"),
             ("TMST = PMg_x / PMg_y", tmst if tmst is not None else "no definida")]
    tec_tab = [("Rendimientos a escala", rend["tipo"]), ("Grado de homogeneidad", rend["grado_local"]),
               ("Elasticidad de sustitución σ", sigma)]
    if hasattr(t, "max_beneficio"):
        try:
            b = t.max_beneficio(p, w1, w2)
        except ErrorParametro as e:
            b = {"existe": False, "motivo": str(e)}
        if b["existe"]:
            benef = _ui.tabla([("x*", b["x"]), ("y*", b["y"]), ("Oferta z*", b["z"]), ("Beneficio Π*", b["beneficio"])])
            _ui.punto(fig, b["x"], b["y"], "Óptimo de beneficio", color=_ui.VERDE, simbolo="diamond")
        else:
            benef = _ui.aviso(b["motivo"])
    else:
        benef = _ui.aviso("El máximo de beneficio se calcula para Cobb-Douglas (α + β < 1) y separable. "
                          "Leontief y sustitutos perfectos tienen rendimientos constantes: "
                          "el beneficio es cero o ilimitado.")
    panel = _ui.resultados([
        _ui.lectura("En la combinación elegida", _ui.tabla(filas)),
        _ui.lectura("Tecnología", _ui.tabla(tec_tab),
                    html.P("σ mide qué tan fácil es sustituir un insumo por otro: 0 en Leontief, "
                           "1 en Cobb-Douglas, ∞ en sustitutos perfectos.", className="pequeno texto-suave")),
        _ui.lectura(f"Máximo beneficio (p = {_ui.fmt(p)}, w1 = {_ui.fmt(w1)}, w2 = {_ui.fmt(w2)})", benef,
                    _ui.referencia("ejemplo 2 (rendimientos a escala) y ejemplos 4–6 de la semana 5.")),
    ])
    return fig, panel


def construir_layout():
    from registro import buscar_materia
    materia = buscar_materia(MATERIA_ID)
    sim = materia.buscar(SIM_ID)
    controles = [
        _ui.selector(_id("tec"), "Tecnología", TECNOLOGIAS, DEF["tec"]),
        _ui.grupo("Parámetros",
                  control_deslizante(_id("A"), "Productividad total A", 0.5, 3, DEF["A"], 0.1),
                  control_deslizante(_id("alpha"), "α (o a)", 0.05, 1.5, DEF["alpha"], 0.05),
                  control_deslizante(_id("beta"), "β (o b)", 0.05, 1.5, DEF["beta"], 0.05),
                  control_deslizante(_id("rho"), "ρ (sólo CES; σ = 1/(1−ρ))", -3, 0.95, DEF["rho"], 0.05)),
        _ui.grupo("Combinación de insumos",
                  control_deslizante(_id("x0"), "x0", 0.2, 9.5, DEF["x0"], 0.1),
                  control_deslizante(_id("y0"), "y0", 0.2, 9.5, DEF["y0"], 0.1)),
        _ui.grupo("Precios (maximización del beneficio)",
                  control_deslizante(_id("p"), "Precio del producto p", 0.5, 10, DEF["p"], 0.1),
                  control_deslizante(_id("w1"), "Precio de x (w1)", 0.5, 10, DEF["w1"], 0.1),
                  control_deslizante(_id("w2"), "Precio de y (w2)", 0.5, 10, DEF["w2"], 0.1)),
    ]
    fig, panel = calcular(**DEF)
    return marco_simulador(materia, sim, controles, grafica(_id("grafica"), fig, alto=540),
                           html.Div(panel, id=_id("resultados")))


def registrar_callbacks(app):
    @app.callback(Output(_id("grafica"), "figure"), Output(_id("resultados"), "children"),
                  *[Input(_id(k), "value") for k in DEF])
    def _actualizar(*v):
        return calcular(*[_ui.seguro(x, DEF[k]) for x, k in zip(v, DEF)])
