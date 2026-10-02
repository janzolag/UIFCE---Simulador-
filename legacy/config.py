"""
Configuración visual global del Simulador Económico UIFCE.

Todo lo que define "cómo se ve" el simulador vive aquí: paleta de colores,
textos institucionales y la plantilla de Plotly que usan TODAS las gráficas.
Si un simulador necesita una gráfica, debe usar `PLANTILLA_PLOTLY`
(o simplemente no pasar template, porque queda como predeterminada).
"""
import plotly.graph_objects as go
import plotly.io as pio

# ---------------------------------------------------------------------------
# Textos institucionales
# ---------------------------------------------------------------------------
TITULO_APP = "Simulador Económico"
SUBTITULO_APP = "Facultad de Ciencias Económicas"
CREADOR = "Unidad Informática FCE · Universidad Nacional de Colombia"
VERSION = "0.2.0 — Microeconomía 1 (beta)"

# ---------------------------------------------------------------------------
# Paleta (azul oscuro). Los mismos valores están como variables en
# assets/estilos.css; si cambias uno aquí, cámbialo también allá.
# ---------------------------------------------------------------------------
COLORES = {
    "fondo": "#0B1D3A",          # azul oscuro principal (fondo de la página)
    "fondo_lateral": "#07142B",  # barra lateral, un tono más profundo
    "panel": "#11284D",          # tarjetas y paneles
    "borde": "#22406E",
    "rejilla": "#1C3560",        # líneas de cuadrícula en gráficas
    "texto": "#E8EEF8",
    "texto_suave": "#9DB0CF",
    "acento": "#F5C451",         # dorado: resaltados y puntos de equilibrio
}

# Serie de colores para curvas (oferta, demanda, IS, LM, BP, ...)
SERIE_COLORES = ["#5B9BFF", "#F5C451", "#3DD6B5", "#FF7A85", "#B79CFF", "#FFA45B"]

# ---------------------------------------------------------------------------
# Plantilla Plotly "uifce": fondo azul oscuro para todas las gráficas
# ---------------------------------------------------------------------------
_eje = dict(
    gridcolor=COLORES["rejilla"],
    zerolinecolor=COLORES["borde"],
    linecolor=COLORES["borde"],
    tickcolor=COLORES["borde"],
    title_font=dict(color=COLORES["texto_suave"]),
    showline=True,
    mirror=False,
)

PLANTILLA_PLOTLY = go.layout.Template(
    layout=dict(
        paper_bgcolor=COLORES["fondo"],
        plot_bgcolor=COLORES["panel"],
        font=dict(family="Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif",
                  color=COLORES["texto"], size=13),
        colorway=SERIE_COLORES,
        xaxis=_eje,
        yaxis=_eje,
        legend=dict(bgcolor="rgba(0,0,0,0)", font=dict(color=COLORES["texto_suave"])),
        hoverlabel=dict(bgcolor=COLORES["fondo_lateral"], bordercolor=COLORES["borde"],
                        font=dict(color=COLORES["texto"])),
        margin=dict(l=56, r=24, t=48, b=48),
    )
)

pio.templates["uifce"] = PLANTILLA_PLOTLY
pio.templates.default = "uifce"

# Configuración de la barra de herramientas de Plotly (en español y sin logo)
CONFIG_GRAFICA = {
    "displaylogo": False,
    "modeBarButtonsToRemove": ["lasso2d", "select2d"],
    "toImageButtonOptions": {"format": "png", "filename": "simulador_uifce", "scale": 2},
}
