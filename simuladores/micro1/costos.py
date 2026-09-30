"""Simulador 7 — Costos de corto y largo plazo (Monsalve, semanas 6–7)."""
import numpy as np
import plotly.graph_objects as go
from dash import Input, Output, html

from simuladores.base import control_deslizante, grafica, id_componente, marco_simulador
from simuladores.micro1 import _ui
from simuladores.micro1.modelos import ErrorParametro
from simuladores.micro1.modelos import costos as cs
from simuladores.micro1.modelos.produccion import CobbDouglasP

MATERIA_ID, SIM_ID = "micro1", "costos"
MODOS = {"corto": "Corto plazo (costo cúbico)", "largo": "Largo plazo y envolvente (Cobb-Douglas)"}
DEF = dict(modo="corto", CF=20.0, a=10.0, b=2.0, c=0.5, alpha=0.3, beta=0.4, w1=2.0, w2=3.0)


def _id(n):
    return id_componente(MATERIA_ID, SIM_ID, n)


def _corto(CF, a, b, c):
    k = cs.CostoCubico(CF, a, b, c)
    qmax = max(3 * k.q_min_cme(), 3 * k.q_min_cvme(), 5)
    q = np.linspace(qmax / 300, qmax, 300)
    fig = _ui.figura("Cantidad q", "Pesos por unidad", SIM_ID + "-corto")
    for nom, f, col, dash in (("CMg", k.CMg, _ui.ROJO, "solid"), ("CMe", k.CMe, _ui.AZUL, "solid"),
                              ("CVMe", k.CVMe, _ui.VERDE, "dash"), ("CFMe", lambda v: k.CF / v, _ui.MORADO, "dot")):
        fig.add_trace(go.Scatter(x=q, y=[f(v) for v in q], mode="lines", name=nom,
                                 line=dict(color=col, width=3 if dash == "solid" else 2, dash=dash)))
    ytop = k.CMe(k.q_min_cme()) * 2.2
    fig.update_yaxes(range=[0, ytop])
    _ui.punto(fig, k.q_min_cvme(), k.precio_cierre(), "Punto de cierre (mín CVMe)", color=_ui.VERDE, texto="cierre")
    _ui.punto(fig, k.q_min_cme(), k.precio_nivelacion(), "Punto de nivelación (mín CMe)", texto="nivelación")
    panel = _ui.resultados([
        _ui.lectura("Puntos clave", _ui.tabla([
            ("Mínimo del CMg en q", k.q_min_cmg()),
            ("Mínimo del CVMe en q", k.q_min_cvme()), ("Precio de cierre", k.precio_cierre()),
            ("Mínimo del CMe en q", k.q_min_cme()), ("Precio de nivelación", k.precio_nivelacion())])),
        _ui.lectura("Lectura económica",
                    html.P("El CMg corta al CVMe y al CMe en sus mínimos. Entre el precio de cierre y el de "
                           "nivelación la empresa produce con pérdidas porque cubre al menos su costo variable."),
                    html.P(f"C(q) = {_ui.fmt(CF)} + {_ui.fmt(a)}q − {_ui.fmt(b)}q² + {_ui.fmt(c)}q³",
                           className="pequeno texto-suave"),
                    _ui.referencia("semana 7 (curvas de costo de corto plazo en forma de U).")),
    ])
    return fig, panel


def _largo(alpha, beta, w1, w2):
    tec = CobbDouglasP(1, alpha, beta)
    z = np.linspace(0.05, 10, 300)
    cme = [cs.costo_lp(tec, w1, w2, v) / v for v in z]
    cmg = [cs.curvas_lp(tec, w1, w2, v)["CMg"] for v in z]
    fig = _ui.figura("Producción z", "Pesos por unidad", SIM_ID + "-largo")
    fig.add_trace(go.Scatter(x=z, y=cme, mode="lines", name="CMe de largo plazo", line=dict(color=_ui.AZUL, width=4)))
    fig.add_trace(go.Scatter(x=z, y=cmg, mode="lines", name="CMg de largo plazo", line=dict(color=_ui.ROJO, width=3)))
    for i, zk in enumerate((2, 5, 8)):
        k = cs.demandas_condicionadas(tec, w1, w2, zk)["y"]        # planta óptima para zk
        zs = np.linspace(zk * 0.3, min(zk * 2.2, 10), 120)
        fig.add_trace(go.Scatter(x=zs, y=[cs.costo_cp_cobb_douglas(alpha, beta, w1, w2, k, v)["CMe"] for v in zs],
                                 mode="lines", name="CMe de corto plazo (k fijo)" if i == 0 else None,
                                 showlegend=i == 0, line=dict(color=_ui.DORADO, width=1.8, dash="dash")))
        _ui.punto(fig, zk, cs.costo_lp(tec, w1, w2, zk) / zk, f"Tangencia z = {zk}", color=_ui.DORADO,
                  showlegend=False)
    fig.update_yaxes(range=[0, 2.5 * cs.costo_lp(tec, w1, w2, 5) / 5])
    s = alpha + beta
    tipo = "decrecientes" if s < 1 else "constantes" if abs(s - 1) < 1e-9 else "crecientes"
    forma = {"decrecientes": "convexa: el CMe y el CMg crecen",
             "constantes": "lineal: CMe = CMg constantes",
             "crecientes": "cóncava: el CMe y el CMg decrecen (monopolio natural)"}[tipo]
    B = cs.constante_B_cd(alpha, beta, w1, w2)
    panel = _ui.resultados([
        _ui.lectura("Función de costo", _ui.tabla([
            ("α + β", s), ("Rendimientos a escala", tipo), ("B en C(z) = B·z^{1/(α+β)}", B),
            ("Costo de producir z = 5", cs.costo_lp(tec, w1, w2, 5))])),
        _ui.lectura("Lectura económica", html.P(f"La curva de costo total es {forma}."),
                    html.P("Cada curva punteada es el CMe de corto plazo con la planta (k) óptima para una "
                           "producción; el CMe de largo plazo es su envolvente y la toca en ese punto."),
                    _ui.referencia("figura 6.3 y ejemplo 1 de la semana 6; sección 7.4.")),
    ])
    return fig, panel


def calcular(modo, CF, a, b, c, alpha, beta, w1, w2):
    try:
        return _corto(CF, a, b, c) if modo == "corto" else _largo(alpha, beta, w1, w2)
    except ErrorParametro as e:
        return _ui.figura_error(str(e)), _ui.aviso(str(e), "error")


def construir_layout():
    from registro import buscar_materia
    materia = buscar_materia(MATERIA_ID)
    sim = materia.buscar(SIM_ID)
    controles = [
        _ui.selector(_id("modo"), "Horizonte", MODOS, DEF["modo"]),
        _ui.grupo("C(q) = CF + aq − bq² + cq³", id_=_id("grupo-corto"), *[
            control_deslizante(_id("CF"), "Costo fijo CF", 0, 100, DEF["CF"], 1),
            control_deslizante(_id("a"), "a", 1, 30, DEF["a"], 0.5),
            control_deslizante(_id("b"), "b", 0, 5, DEF["b"], 0.1),
            control_deslizante(_id("c"), "c", 0.05, 2, DEF["c"], 0.05)]),
        _ui.grupo("Tecnología F = x^α y^β", id_=_id("grupo-largo"), oculto=True, *[
            control_deslizante(_id("alpha"), "α", 0.05, 1.2, DEF["alpha"], 0.05),
            control_deslizante(_id("beta"), "β", 0.05, 1.2, DEF["beta"], 0.05),
            control_deslizante(_id("w1"), "Precio de x (w1)", 0.5, 10, DEF["w1"], 0.1),
            control_deslizante(_id("w2"), "Precio de y (w2)", 0.5, 10, DEF["w2"], 0.1)]),
    ]
    fig, panel = calcular(**DEF)
    return marco_simulador(materia, sim, controles, grafica(_id("grafica"), fig, alto=540),
                           html.Div(panel, id=_id("resultados")))


def registrar_callbacks(app):
    @app.callback(Output(_id("grafica"), "figure"), Output(_id("resultados"), "children"),
                  *[Input(_id(k), "value") for k in DEF])
    def _actualizar(*v):
        return calcular(*[_ui.seguro(x, DEF[k]) for x, k in zip(v, DEF)])

    @app.callback(Output(_id("grupo-corto"), "style"), Output(_id("grupo-largo"), "style"),
                  Input(_id("modo"), "value"))
    def _mostrar(modo):
        return ({"display": "none"} if modo == "largo" else None,
                None if modo == "largo" else {"display": "none"})
