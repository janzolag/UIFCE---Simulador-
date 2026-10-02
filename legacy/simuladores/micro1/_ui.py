"""Piezas de interfaz compartidas por los simuladores de Microeconomía 1.

Los cálculos viven en simuladores/micro1/modelos/ (probados en tests/micro1/).
Aquí sólo hay ayudantes para dibujar: selectores, tablas de resultados,
avisos y el formato de números.
"""
from __future__ import annotations

import math

import plotly.graph_objects as go
from dash import dcc, html

from config import COLORES, SERIE_COLORES
from simuladores.base import figura_vacia

AZUL, DORADO, VERDE, ROJO, MORADO, NARANJA = SERIE_COLORES
ACENTO = COLORES["acento"]
SUAVE = COLORES["texto_suave"]


def fmt(v, dec: int = 3) -> str:
    """Número legible en español (coma decimal no; punto, como en el libro)."""
    if v is None:
        return "—"
    if isinstance(v, str):
        return v
    if isinstance(v, float) and math.isnan(v):
        return "no definida"
    if isinstance(v, float) and math.isinf(v):
        return "∞" if v > 0 else "−∞"
    if abs(v) >= 1e5 or (0 < abs(v) < 1e-3):
        return f"{v:.3e}"
    s = f"{v:,.{dec}f}".rstrip("0").rstrip(".")
    return s.replace("-", "−") if s not in ("-0", "") else "0"


def selector(id_: str, etiqueta: str, opciones: dict, valor) -> html.Div:
    """Grupo de botones de opción con el estilo del simulador."""
    return html.Div(className="control", children=[
        html.Label(etiqueta, className="control-etiqueta"),
        dcc.RadioItems(id=id_, value=valor, className="selector",
                       labelClassName="selector-opcion", inputClassName="selector-entrada",
                       options=[{"label": v, "value": k} for k, v in opciones.items()]),
    ])


def grupo(titulo: str, *controles, id_: str | None = None, oculto: bool = False) -> html.Div:
    kw = {"id": id_} if id_ else {}
    return html.Div(className="grupo-controles", style={"display": "none"} if oculto else None,
                    children=[html.Div(titulo, className="grupo-titulo"), *controles], **kw)


def tabla(filas, encabezado=None) -> html.Table:
    """filas: lista de (etiqueta, valor, [valor2...]). Los números se formatean."""
    cab = [html.Thead(html.Tr([html.Th(c) for c in encabezado]))] if encabezado else []
    cuerpo = [html.Tr([html.Td(f[0])] + [html.Td(fmt(v), className="num") for v in f[1:]])
              for f in filas]
    return html.Table(className="tabla-resultados", children=cab + [html.Tbody(cuerpo)])


def aviso(texto, tipo: str = "info") -> html.Div:
    return html.Div(texto, className=f"aviso aviso-{tipo}")


def lectura(titulo: str, *hijos) -> html.Div:
    return html.Div(className="lectura", children=[html.H3(titulo), *hijos])


def resultados(bloques) -> html.Div:
    """Rejilla de bloques de resultados para el panel de explicación."""
    return html.Div(className="rejilla-resultados", children=bloques)


def referencia(texto: str) -> html.P:
    return html.P([html.Span("Monsalve (2017) · "), texto], className="referencia")


def figura(titulo_x: str, titulo_y: str, rev: str, **kw) -> go.Figure:
    fig = go.Figure()
    fig.update_layout(template="uifce", xaxis_title=titulo_x, yaxis_title=titulo_y,
                      uirevision=rev, legend=dict(orientation="h", y=1.08, x=0),
                      margin=dict(l=56, r=24, t=56, b=48), **kw)
    return fig


def punto(fig, x, y, nombre, color=ACENTO, simbolo="circle", texto=None, row=None, col=None, **kw):
    traza = go.Scatter(
        x=[x], y=[y], mode="markers+text" if texto else "markers", name=nombre,
        text=[texto] if texto else None, textposition="top right",
        textfont=dict(color=color),
        marker=dict(size=12, color=color, symbol=simbolo, line=dict(width=2, color=COLORES["fondo"])),
        hovertemplate=f"{nombre}<br>%{{x:.3f}}, %{{y:.3f}}<extra></extra>", **kw)
    if row is not None:
        fig.add_trace(traza, row=row, col=col)
    else:
        fig.add_trace(traza)


def figura_error(mensaje: str) -> go.Figure:
    return figura_vacia(mensaje)


def seguro(v, defecto):
    """Los deslizadores pueden llegar como None mientras se escribe en la caja numérica."""
    return defecto if v is None else v
