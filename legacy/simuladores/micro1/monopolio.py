"""Simulador 9 — Monopolio (Monsalve, semana 10)."""
import numpy as np
import plotly.graph_objects as go
from dash import Input, Output, html

from simuladores.base import control_deslizante, grafica, id_componente, marco_simulador
from simuladores.micro1 import _ui
from simuladores.micro1.modelos import ErrorParametro
from simuladores.micro1.modelos import monopolio as mo

MATERIA_ID, SIM_ID = "micro1", "monopolio"
DEF = dict(a=12.0, b=1.0, c=0.0, d=1.0, CF=0.0)     # ejemplo 1 de la semana 10


def _id(n):
    return id_componente(MATERIA_ID, SIM_ID, n)


def calcular(a, b, c, d, CF):
    try:
        r = mo.monopolio_lineal(a, b, c, d, CF)
    except ErrorParametro as e:
        return _ui.figura_error(str(e)), _ui.aviso(str(e), "error")
    ymax = a / b
    y = np.linspace(ymax / 400, ymax, 400)
    fig = _ui.figura("Cantidad y", "Precio p", SIM_ID, xaxis_range=[0, ymax], yaxis_range=[0, a * 1.05])
    ym, pm, yc, pc = r["y_m"], r["p_m"], r["y_c"], r["p_c"]
    # Áreas de bienestar
    fig.add_trace(go.Scatter(x=[0, ym, 0], y=[a, pm, pm], fill="toself", fillcolor="rgba(91,155,255,.22)",
                             line=dict(width=0), name="Excedente del consumidor", hoverinfo="skip"))
    cm = lambda v: c + 2 * d * v
    xs_pei = np.linspace(ym, yc, 60)
    fig.add_trace(go.Scatter(x=list(xs_pei) + list(xs_pei[::-1]),
                             y=[a - b * v for v in xs_pei] + [cm(v) for v in xs_pei[::-1]],
                             fill="toself", fillcolor="rgba(255,122,133,.35)", line=dict(width=0),
                             name="Pérdida irrecuperable", hoverinfo="skip"))
    fig.add_trace(go.Scatter(x=y, y=a - b * y, mode="lines", name="Demanda (ingreso medio)",
                             line=dict(color=_ui.AZUL, width=3)))
    y_img = y[y <= a / (2 * b)]
    fig.add_trace(go.Scatter(x=y_img, y=a - 2 * b * y_img, mode="lines", name="Ingreso marginal",
                             line=dict(color=_ui.MORADO, width=2.5, dash="dash")))
    fig.add_trace(go.Scatter(x=y, y=cm(y), mode="lines", name="Costo marginal", line=dict(color=_ui.ROJO, width=3)))
    if CF > 0 or d > 0:
        cme = CF / y + c + d * y
        fig.add_trace(go.Scatter(x=y, y=np.where(cme <= a * 1.5, cme, np.nan), mode="lines", name="Costo medio",
                                 line=dict(color=_ui.VERDE, width=2, dash="dot")))
    fig.add_trace(go.Scatter(x=[ym, ym, 0], y=[r["IMg_m"], pm, pm], mode="lines", showlegend=False,
                             line=dict(color=_ui.SUAVE, dash="dot", width=1.2), hoverinfo="skip"))
    _ui.punto(fig, ym, pm, "Monopolio", texto="monopolio")
    _ui.punto(fig, yc, pc, "Competencia (p = CMg)", color=_ui.VERDE, texto="competencia")

    ram = mo.precio_ramsey(a, b, c, d, CF)
    if ram["existe"] and c + 2 * d * ram["y"] < ram["p"]:
        # Monopolio natural (CMe > CMg): el precio competitivo daría pérdidas; se regula con p = CMe.
        reg = [_ui.tabla([("Precio regulado (p = CMe)", ram["p"]), ("Cantidad regulada", ram["y"])]),
               html.P("Hay economías de escala (CMe > CMg): con p = CMg la empresa tendría pérdidas, "
                      "por eso se regula con el costo medio.", className="pequeno texto-suave")]
    elif ram["existe"]:
        reg = [_ui.tabla([("Precio regulado (p = CMg)", pc), ("Cantidad regulada", yc)]),
               html.P("Sin economías de escala el regulador puede fijar el precio competitivo "
                      "p = CMg y la empresa no tiene pérdidas.", className="pequeno texto-suave")]
    else:
        reg = [_ui.aviso(ram["motivo"] + " Un precio de beneficio cero exigiría subsidio.")]
    panel = _ui.resultados([
        _ui.lectura("Monopolio frente a competencia", _ui.tabla([
            ("Cantidad", ym, yc), ("Precio", pm, pc), ("Beneficio", r["beneficio_m"], r["beneficio_c"]),
            ("Excedente del consumidor", r["EC_m"], r["EC_c"]), ("Excedente del productor", r["EP_m"], r["EP_c"])],
            encabezado=["", "Monopolio", "Competencia"])),
        _ui.lectura("Poder de mercado", _ui.tabla([
            ("Pérdida irrecuperable", r["perdida_eficiencia"]), ("Elasticidad en el óptimo", r["elasticidad_m"]),
            ("Índice de Lerner (p − CMg)/p", r["lerner"]), ("−1/ε (debe coincidir)", r["inverso_elasticidad"])]),
                    html.P("El monopolista siempre opera en el tramo elástico de la demanda (|ε| ≥ 1)."
                           if r["beneficio_m"] >= 0 else
                           "Con estos costos fijos el monopolista tiene pérdidas: no operaría en el largo plazo.",
                           className="destacado")),
        _ui.lectura("Regulación", *reg,
                    _ui.referencia("ejemplos 1 y 2 de la semana 10 (C = y², y = 12 − p); secciones 10.4–10.5.")),
    ])
    return fig, panel


def construir_layout():
    from registro import buscar_materia
    materia = buscar_materia(MATERIA_ID)
    sim = materia.buscar(SIM_ID)
    controles = [
        _ui.grupo("Demanda: p = a − b·y",
                  control_deslizante(_id("a"), "Precio máximo a", 2, 50, DEF["a"], 0.5),
                  control_deslizante(_id("b"), "Pendiente b", 0.1, 5, DEF["b"], 0.1)),
        _ui.grupo("Costos: C = CF + c·y + d·y²",
                  control_deslizante(_id("c"), "c", 0, 20, DEF["c"], 0.5),
                  control_deslizante(_id("d"), "d", 0, 3, DEF["d"], 0.1),
                  control_deslizante(_id("CF"), "Costo fijo CF", 0, 60, DEF["CF"], 1)),
    ]
    fig, panel = calcular(**DEF)
    return marco_simulador(materia, sim, controles, grafica(_id("grafica"), fig, alto=540),
                           html.Div(panel, id=_id("resultados")))


def registrar_callbacks(app):
    @app.callback(Output(_id("grafica"), "figure"), Output(_id("resultados"), "children"),
                  *[Input(_id(k), "value") for k in DEF])
    def _actualizar(*v):
        return calcular(*[_ui.seguro(x, DEF[k]) for x, k in zip(v, DEF)])
