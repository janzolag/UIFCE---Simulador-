"""Páginas generales: inicio, portada de cada materia, simulador y 404."""
import numpy as np
import plotly.graph_objects as go
from dash import dcc, html

from config import COLORES, CREADOR, TITULO_APP, VERSION
from registro import MATERIAS, total_simuladores
from simuladores.base import figura_vacia, grafica, marco_simulador


# ---------------------------------------------------------------------------
# Inicio
# ---------------------------------------------------------------------------
def figura_portada(desplazamiento_demanda: float = 0.0) -> go.Figure:
    """Gráfica de muestra en la portada: oferta y demanda con equilibrio.
    Es la 'vitrina' del simulador: se mueve con el deslizador de la portada."""
    q = np.linspace(0, 100, 101)
    a, b, c, d = 80 + desplazamiento_demanda, 0.6, 10, 0.5   # P = a - bQ ; P = c + dQ
    q_eq = (a - c) / (b + d)
    p_eq = c + d * q_eq

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=q, y=c + d * q, name="Oferta", mode="lines",
                             line=dict(width=3, color="#5B9BFF"),
                             hovertemplate="Q = %{x:.0f}<br>P = %{y:.1f}<extra>Oferta</extra>"))
    fig.add_trace(go.Scatter(x=q, y=a - b * q, name="Demanda", mode="lines",
                             line=dict(width=3, color="#FF7A85"),
                             hovertemplate="Q = %{x:.0f}<br>P = %{y:.1f}<extra>Demanda</extra>"))
    fig.add_trace(go.Scatter(x=[q_eq, q_eq, 0], y=[0, p_eq, p_eq], mode="lines",
                             line=dict(dash="dot", width=1.5, color=COLORES["texto_suave"]),
                             hoverinfo="skip", showlegend=False))
    fig.add_trace(go.Scatter(x=[q_eq], y=[p_eq], name="Equilibrio", mode="markers",
                             marker=dict(size=13, color=COLORES["acento"],
                                         line=dict(width=2, color=COLORES["fondo"])),
                             hovertemplate="Q* = %{x:.1f}<br>P* = %{y:.1f}<extra>Equilibrio</extra>"))
    fig.update_layout(
        template="uifce",
        xaxis=dict(title="Cantidad (Q)", range=[0, 100]),
        yaxis=dict(title="Precio (P)", range=[0, 110]),
        legend=dict(orientation="h", y=1.08, x=0),
        margin=dict(l=56, r=16, t=40, b=48),
        uirevision="portada",
    )
    return fig


def tarjeta_materia(m):
    return dcc.Link(href=m.ruta, id=f"tarjeta-{m.id}", className="tarjeta-materia",
                    style={"--color-materia": m.color}, children=[
        html.Div(m.sigla, className="tarjeta-sigla"),
        html.H3(m.nombre),
        html.P(m.descripcion, className="texto-suave"),
        html.Div(className="tarjeta-pie", children=[
            html.Span(f"{len(m.simuladores)} simuladores planeados"),
            html.Span("Entrar →", className="tarjeta-flecha"),
        ]),
    ])


def pagina_inicio():
    return html.Div(className="pagina-inicio", children=[
        html.Section(className="heroe", children=[
            html.Div(className="heroe-texto", children=[
                html.Div("UIFCE · Universidad Nacional de Colombia", className="sobretitulo"),
                html.H1(TITULO_APP),
                html.P("Modelos de Fundamentos, Microeconomía 1 y Macroeconomía 1 "
                       "en gráficas interactivas: mueve un parámetro y observa, en vivo, "
                       "cómo se desplazan las curvas y el equilibrio.", className="heroe-lead"),
                html.Div(className="heroe-cifras", children=[
                    html.Div([html.Strong(str(len(MATERIAS))), html.Span("materias")]),
                    html.Div([html.Strong(str(total_simuladores())), html.Span("simuladores planeados")]),
                    html.Div([html.Strong("100 %"), html.Span("en español")]),
                ]),
            ]),
            html.Div(className="panel heroe-grafica", children=[
                grafica("grafica-portada", figura_portada(), alto=330),
                html.Div(className="control control-portada", children=[
                    html.Label("Prueba: desplaza la demanda", htmlFor="slider-portada",
                               className="control-etiqueta"),
                    dcc.Slider(id="slider-portada", min=-30, max=30, step=1, value=0,
                               marks={-30: "−30", 0: "0", 30: "+30"}, updatemode="drag"),
                ]),
            ]),
        ]),

        html.H2("Elige una materia", className="titulo-seccion"),
        html.Div(className="rejilla-materias", children=[tarjeta_materia(m) for m in MATERIAS]),

        # Espacio reservado para el tutorial de UIFCITO
        html.Section(id="espacio-tutorial", className="panel tutorial", children=[
            # Reemplazar este marcador por la imagen de UIFCITO: assets/uifcito.png
            html.Div("UIFCITO", className="tutorial-mascota", title="Espacio para la imagen de UIFCITO"),
            html.Div(children=[
                html.H3("¿Primera vez? UIFCITO te guía"),
                html.P("Aquí vivirá el tutorial de uso con UIFCITO, la mascota de la Unidad "
                       "Informática: un recorrido corto por la barra lateral, los parámetros "
                       "y cómo proyectar un modelo en clase.", className="texto-suave"),
            ]),
            html.Button("Tutorial · próximamente", id="boton-tutorial",
                        className="boton-secundario", disabled=True),
        ]),

        html.Footer(className="pie-pagina", children=[
            html.Span(CREADOR), html.Span(f"Versión {VERSION}", className="texto-suave"),
        ]),
    ])


# ---------------------------------------------------------------------------
# Portada de materia
# ---------------------------------------------------------------------------
def pagina_materia(m):
    tarjetas = []
    for s in m.simuladores:
        tarjetas.append(dcc.Link(href=m.ruta_simulador(s), id=f"tarjeta-sim-{s.id}",
                                 className="tarjeta-simulador", children=[
            html.Div(className="tarjeta-simulador-cabeza", children=[
                html.H3(s.nombre),
                html.Span("Listo" if s.listo else "En construcción",
                          className="estado " + ("estado-listo" if s.listo else "estado-pendiente")),
            ]),
            dcc.Markdown(s.ecuacion_resumen or s.ecuacion, mathjax=True,
                         className="ecuacion ecuacion-mini") if s.ecuacion else None,
            html.P(s.descripcion, className="texto-suave"),
        ]))
    return html.Div(className="pagina-materia", style={"--color-materia": m.color}, children=[
        html.Div(className="encabezado-materia", children=[
            html.Div(m.sigla, className="tarjeta-sigla grande"),
            html.Div(children=[
                html.H1(m.nombre),
                html.P(m.descripcion, className="texto-suave"),
                html.P(f"{m.listos} de {len(m.simuladores)} simuladores disponibles · "
                       "elige el modelo que quieres presentar.", className="progreso"),
            ]),
        ]),
        html.Div(className="rejilla-simuladores", children=tarjetas),
    ])


# ---------------------------------------------------------------------------
# Simulador (listo o en construcción)
# ---------------------------------------------------------------------------
def pagina_simulador(m, s):
    if s.listo:
        return s.construir_layout()
    # Espacio reservado: misma interfaz de uso que tendrá el simulador final
    controles = html.Div(className="controles-reservados", children=[
        html.Div(className="control-fantasma") for _ in range(3)
    ] + [html.P("Aquí irán los deslizadores de los parámetros del modelo.",
                className="texto-suave pequeno")])
    return html.Div(children=[
        html.Div(className="aviso-construccion", children=[
            html.Strong("En construcción. "),
            html.Span("Este simulador ya tiene su espacio reservado; se activará cuando se "
                      "programe su módulo en "),
            html.Code(f"simuladores/{m.id}/"),
        ]),
        marco_simulador(m, s, controles,
                        grafica(f"grafica-{m.id}-{s.id}",
                                figura_vacia("La gráfica del modelo aparecerá aquí"))),
    ])


def pagina_no_encontrada(ruta):
    return html.Div(className="pagina-404", children=[
        html.H1("Página no encontrada"),
        html.P(["No existe ninguna sección en ", html.Code(ruta or "/"), "."], className="texto-suave"),
        dcc.Link("← Volver al inicio", href="/", className="boton-secundario"),
    ])
