"""Simulador 4 — Efecto sustitución y efecto ingreso (Monsalve, semana 4)."""
import math

import numpy as np
import plotly.graph_objects as go
from dash import Input, Output, html

from simuladores.base import control_deslizante, grafica, id_componente, marco_simulador
from simuladores.micro1 import _ui
from simuladores.micro1.modelos import ErrorParametro
from simuladores.micro1.modelos.consumidor import Giffen
from simuladores.micro1.modelos.slutsky import descomposicion
from simuladores.micro1.preferencias import crear_utilidad, curva

MATERIA_ID, SIM_ID = "micro1", "slutsky"
FAMILIAS = {"cd": "Cobb-Douglas", "separable": "Separable", "leontief": "Complementarios (Leontief)",
            "cuasi": "Cuasilineal", "stone": "Stone-Geary", "giffen": "Bien Giffen (ej. 3.5)"}
METODOS = {"hicks": "Hicks (misma utilidad)", "slutsky": "Slutsky (mismo poder de compra)"}
DEF = dict(familia="cd", metodo="hicks", a=2.0, b=1.0, p1=3.0, p2=2.0, M=45.0, p1n=3.6)
DEF_GIFFEN = dict(p1=2.0, p2=1.0, M=3.5, p1n=2.2)
CLASIF = {"normal": "Bien normal: ingreso y sustitución van en la misma dirección.",
          "inferior": "Bien inferior: el efecto ingreso compensa en parte al de sustitución.",
          "giffen": "Bien Giffen: el efecto ingreso supera al de sustitución y la demanda sube con su precio.",
          "efecto_ingreso_nulo": "Sin efecto ingreso sobre x (cuasilineal): todo el cambio es sustitución.",
          "sin_cambio": "El precio no cambió."}


def _id(n):
    return id_componente(MATERIA_ID, SIM_ID, n)


def _u(familia, a, b):
    return Giffen() if familia == "giffen" else crear_utilidad(familia, a, b)


def calcular(familia, metodo, a, b, p1, p2, M, p1n):
    try:
        u = _u(familia, a, b)
        d = descomposicion(u, p1, p2, M, p1n, metodo=metodo)
    except ErrorParametro as e:
        msg = str(e)
        if familia == "giffen":
            msg += " Pruebe p1 = 2, p2 = 1, M = 3.5 y p1' = 2.2."
        return _ui.figura_error(msg), _ui.aviso(msg, "error")
    A, B, C = d["A"], d["B"], d["C"]
    lx = max(M / min(p1, p1n), d["M_compensado"] / p1n, A["x"], B["x"], C["x"]) * 1.1
    ly = max(M / p2, d["M_compensado"] / p2, A["y"], B["y"], C["y"]) * 1.1
    x0 = 1.0 if familia == "giffen" else 0
    fig = _ui.figura("Bien x", "Bien y", SIM_ID, xaxis_range=[x0, lx], yaxis_range=[0, ly])
    rectas = [(p1, M, "Recta inicial", "solid", _ui.AZUL), (p1n, M, "Recta con el nuevo p1", "dash", _ui.ROJO),
              (p1n, d["M_compensado"], f"Recta compensada ({METODOS[metodo].split()[0]})", "dot", _ui.VERDE)]
    for pp, mm, nom, estilo, col in rectas:
        fig.add_trace(go.Scatter(x=[0, mm / pp], y=[mm / p2, 0], mode="lines", name=nom,
                                 line=dict(color=col, dash=estilo, width=2.5)))
    xs = np.linspace(max(x0, 1e-3) + 1e-6, lx, 500)
    for UU, nom, op in ((d["U0"], "U inicial", 1), (u.U(C["x"], C["y"]), "U final", 0.55)):
        if UU is not None and math.isfinite(UU):
            cx, cy = curva(u, UU, xs)
            cy = [c if (c is None or c <= ly * 1.3) else None for c in cy]
            fig.add_trace(go.Scatter(x=cx, y=cy, mode="lines", name=nom, opacity=op,
                                     line=dict(color=_ui.DORADO, width=2), hoverinfo="skip"))
    _ui.punto(fig, A["x"], A["y"], "A inicial", color=_ui.AZUL, texto="A")
    _ui.punto(fig, B["x"], B["y"], "B compensada", color=_ui.VERDE, texto="B")
    _ui.punto(fig, C["x"], C["y"], "C final", color=_ui.ROJO, texto="C")

    es, ei, et = d["efecto_sustitucion"], d["efecto_ingreso"], d["efecto_total"]
    panel = _ui.resultados([
        _ui.lectura("Descomposición", _ui.tabla(
            [("Sustitución (A → B)", es[0], es[1]), ("Ingreso (B → C)", ei[0], ei[1]),
             ("Total (A → C)", et[0], et[1])], encabezado=["Efecto", "Δx", "Δy"])),
        _ui.lectura("Compensación", _ui.tabla([
            ("Ingreso original M", M), ("Ingreso compensado", d["M_compensado"]),
            ("Compensación necesaria", d["compensacion"]), ("Utilidad inicial U0", d["U0"])])),
        _ui.lectura("Lectura económica", html.P(CLASIF.get(d["clasificacion_x"], ""), className="destacado"),
                    html.P("Hicks mantiene la utilidad inicial; Slutsky devuelve el ingreso necesario "
                           "para comprar la canasta A, por lo que el consumidor queda un poco mejor."),
                    _ui.referencia("ejemplo 1 de la semana 4 (x²y, 3x + 2y = 45, p1 sube 20 %); "
                                   "ejemplo 5 de la semana 3 (Giffen).")),
    ])
    return fig, panel


def construir_layout():
    from registro import buscar_materia
    materia = buscar_materia(MATERIA_ID)
    sim = materia.buscar(SIM_ID)
    controles = [
        _ui.selector(_id("familia"), "Tipo de preferencias", FAMILIAS, DEF["familia"]),
        _ui.selector(_id("metodo"), "Compensación", METODOS, DEF["metodo"]),
        _ui.grupo("Preferencias",
                  control_deslizante(_id("a"), "α (o a)", 0.1, 3, DEF["a"], 0.1),
                  control_deslizante(_id("b"), "β (o b)", 0.1, 3, DEF["b"], 0.1)),
        _ui.grupo("Precios e ingreso",
                  control_deslizante(_id("p1"), "p1 inicial", 0.5, 10, DEF["p1"], 0.1),
                  control_deslizante(_id("p1n"), "p1 nuevo (p1')", 0.5, 10, DEF["p1n"], 0.1),
                  control_deslizante(_id("p2"), "p2", 0.5, 10, DEF["p2"], 0.1),
                  control_deslizante(_id("M"), "Ingreso (M)", 0, 100, DEF["M"], 0.5)),
    ]
    fig, panel = calcular(**DEF)
    return marco_simulador(materia, sim, controles, grafica(_id("grafica"), fig, alto=540),
                           html.Div(panel, id=_id("resultados")))


def registrar_callbacks(app):
    @app.callback(Output(_id("grafica"), "figure"), Output(_id("resultados"), "children"),
                  *[Input(_id(k), "value") for k in DEF])
    def _actualizar(*v):
        return calcular(*[_ui.seguro(x, DEF[k]) for x, k in zip(v, DEF)])

    # Al elegir el bien Giffen, los deslizadores saltan a su región válida.
    claves = list(DEF_GIFFEN)

    @app.callback(*[Output(_id(k), "value") for k in claves], Input(_id("familia"), "value"),
                  prevent_initial_call=True)
    def _valores_familia(familia):
        fuente = DEF_GIFFEN if familia == "giffen" else DEF
        return tuple(fuente[k] for k in claves)
