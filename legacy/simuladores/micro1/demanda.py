"""Simulador 5 — Demanda, elasticidades y bienestar (Monsalve, semanas 3–4)."""
import numpy as np
import plotly.graph_objects as go
from dash import Input, Output, html
from plotly.subplots import make_subplots

from simuladores.base import control_deslizante, grafica, id_componente, marco_simulador
from simuladores.micro1 import _ui
from simuladores.micro1.modelos import ErrorParametro
from simuladores.micro1.modelos import demanda as dm
from simuladores.micro1.preferencias import FAMILIAS, crear_utilidad

MATERIA_ID, SIM_ID = "micro1", "demanda"
DEF = dict(familia="cd", a=1.0, b=1.0, p2=2.0, M=45.0, p1=3.0, p1n=4.0)
TIPOS = {"lujo": "de lujo (ε_M > 1)", "necesario": "necesario (0 < ε_M < 1)", "inferior": "inferior (ε_M < 0)",
         "giffen": "Giffen", "ingreso_unitario": "normal con elasticidad-ingreso unitaria (ε_M = 1)", "neutro_al_ingreso": "neutro al ingreso (ε_M = 0)", "indefinido": "sin definir"}
REL = {"sustitutos_brutos": "sustitutos brutos", "complementarios_brutos": "complementarios brutos",
       "independientes": "independientes (∂x/∂p2 = 0)"}


def _id(n):
    return id_componente(MATERIA_ID, SIM_ID, n)


def calcular(familia, a, b, p2, M, p1, p1n):
    try:
        u = crear_utilidad(familia, a, b)
        el = dm.elasticidades(u, p1, p2, M)
        var = dm.variaciones(u, p1, p2, M, p1n)
        x1 = u.marshall(p1n, p2, M)["x"]
    except ErrorParametro as e:
        return _ui.figura_error(str(e)), _ui.aviso(str(e), "error")
    fig = make_subplots(rows=1, cols=2, horizontal_spacing=0.12,
                        subplot_titles=("Curva de demanda de x", "Curva de Engel de x"))
    fig.update_layout(template="uifce", uirevision=SIM_ID, legend=dict(orientation="h", y=-0.18, x=0),
                      margin=dict(l=56, r=24, t=56, b=70))
    pmax = max(p1, p1n) * 2.2
    ps = np.linspace(max(pmax / 400, 0.05), pmax, 300)
    xs = []
    for p in ps:
        try:
            xs.append(u.marshall(p, p2, M)["x"])
        except ErrorParametro:
            xs.append(None)
    fig.add_trace(go.Scatter(x=xs, y=ps, mode="lines", name="x(p1)", line=dict(color=_ui.AZUL, width=3)),
                  row=1, col=1)
    lo, hi = sorted((p1, p1n))
    band = [p for p in ps if lo <= p <= hi] or [lo, hi]
    bx = [u.marshall(p, p2, M)["x"] for p in band]
    fig.add_trace(go.Scatter(x=[0] + bx + [0], y=[band[0]] + band + [band[-1]], fill="toself",
                             fillcolor="rgba(245,196,81,.22)", line=dict(width=0), name="Cambio en el excedente",
                             hoverinfo="skip"), row=1, col=1)
    _ui.punto(fig, el["x"], p1, "Punto inicial", row=1, col=1)
    _ui.punto(fig, x1, p1n, "Punto con p1'", color=_ui.ROJO, row=1, col=1)
    Ms = np.linspace(0, M * 2, 200)
    ex = []
    for m in Ms:
        try:
            ex.append(u.marshall(p1, p2, m)["x"])
        except ErrorParametro:
            ex.append(None)
    fig.add_trace(go.Scatter(x=ex, y=Ms, mode="lines", name="Engel x(M)", line=dict(color=_ui.VERDE, width=3)),
                  row=1, col=2)
    _ui.punto(fig, el["x"], M, "Ingreso actual", row=1, col=2, showlegend=False)
    fig.update_xaxes(title_text="Cantidad de x", rangemode="tozero")
    xref = max(v for v in (el["x"], x1, 1e-9) if v is not None)
    fig.update_xaxes(range=[0, xref * 3], row=1, col=1)       # evita que la cola de la curva aplaste el gráfico
    fig.update_yaxes(title_text="Precio p1", row=1, col=1, rangemode="tozero")
    fig.update_yaxes(title_text="Ingreso M", row=1, col=2, rangemode="tozero")

    panel = _ui.resultados([
        _ui.lectura("Elasticidades en el punto inicial", _ui.tabla([
            ("Precio propia ε(x, p1)", el["e_x_p1"]), ("Cruzada ε(x, p2)", el["e_x_p2"]),
            ("Ingreso ε(x, M)", el["e_x_M"]),
            ("Clasificación", dm.clasificar_elasticidad(el["e_x_p1"]).replace("_", " "))])),
        _ui.lectura("Tipo de bien", html.P(f"x es un bien {TIPOS.get(el['tipo_x'], el['tipo_x'])}; "
                                           f"x e y son {REL[el['relacion_bruta_x_con_y']]}.", className="destacado"),
                    html.P(f"Agregación de Engel s1·ε1 + s2·ε2 = {_ui.fmt(dm.agregacion_engel(el), 4)} "
                           "(siempre 1).")),
        _ui.lectura(f"Bienestar si p1 pasa de {_ui.fmt(p1)} a {_ui.fmt(p1n)}", _ui.tabla([
            ("Variación compensada (VC)", var["VC"]), ("Pérdida de excedente (ΔEC)", var["perdida_EC"]),
            ("Variación equivalente (VE)", var["VE"])]),
                    html.P("Con un bien normal y un alza de precio: VE ≤ ΔEC ≤ VC. "
                           "Con cuasilineal las tres coinciden.", className="pequeno texto-suave"),
                    _ui.referencia("semana 3 (elasticidades) y sección 4.8 (excedente).")),
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
                  control_deslizante(_id("p1n"), "Nuevo p1 (bienestar)", 0.5, 10, DEF["p1n"], 0.1),
                  control_deslizante(_id("p2"), "Precio de y (p2)", 0.5, 10, DEF["p2"], 0.1),
                  control_deslizante(_id("M"), "Ingreso (M)", 1, 100, DEF["M"], 1)),
    ]
    fig, panel = calcular(**DEF)
    return marco_simulador(materia, sim, controles, grafica(_id("grafica"), fig, alto=540),
                           html.Div(panel, id=_id("resultados")))


def registrar_callbacks(app):
    @app.callback(Output(_id("grafica"), "figure"), Output(_id("resultados"), "children"),
                  *[Input(_id(k), "value") for k in DEF])
    def _actualizar(*v):
        return calcular(*[_ui.seguro(x, DEF[k]) for x, k in zip(v, DEF)])
