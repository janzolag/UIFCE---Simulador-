"""Barra lateral izquierda: marca, Inicio y un botón por materia.

Al entrar a una materia se despliega debajo de su botón la lista de
simuladores, para que el profesor elija qué ecuación presentar en clase.
"""
from dash import dcc, html

from config import SUBTITULO_APP, TITULO_APP
from registro import MATERIAS, resolver_ruta


def estructura_barra_lateral():
    """Parte fija (no cambia al navegar)."""
    return html.Aside(id="barra-lateral", className="barra-lateral", children=[
        html.Div(className="marca", children=[
            dcc.Link(href="/", className="marca-enlace", children=[
                html.Div("UI", className="marca-logo"),
                html.Div(children=[
                    html.Div(TITULO_APP, className="marca-titulo"),
                    html.Div(SUBTITULO_APP, className="marca-subtitulo"),
                ]),
            ]),
            html.Button("☰", id="boton-menu", className="boton-menu", n_clicks=0,
                        title="Mostrar u ocultar el menú", **{"aria-label": "Menú"}),
        ]),
        html.Nav(id="nav-lateral", className="nav-lateral"),
        html.Div(className="pie-lateral", children=[
            html.Div("Unidad Informática FCE"),
            html.Div("Universidad Nacional de Colombia", className="texto-suave"),
        ]),
    ])


def contenido_navegacion(ruta):
    """Parte dinámica: resalta la sección actual y despliega sus simuladores."""
    tipo, materia_activa, sim_activo = resolver_ruta(ruta)
    en_inicio = tipo == "inicio"

    elementos = [
        dcc.Link(id="btn-inicio", href="/",
                 className="boton-nav" + (" activo" if en_inicio else ""),
                 children=[html.Span("⌂", className="icono-nav icono-inicio"),
                           html.Span("Inicio", className="texto-nav")]),
        html.Div("Materias", className="etiqueta-seccion"),
    ]

    for m in MATERIAS:
        activa = materia_activa is not None and materia_activa.id == m.id
        elementos.append(
            dcc.Link(id=f"btn-{m.id}", href=m.ruta,
                     className="boton-nav boton-materia" + (" activo" if activa else ""),
                     style={"--color-materia": m.color},
                     children=[
                         html.Span(m.sigla, className="icono-nav"),
                         html.Span(m.nombre, className="texto-nav"),
                         html.Span(f"{m.listos}/{len(m.simuladores)}", className="contador",
                                   title="Simuladores listos / planeados"),
                     ])
        )
        if activa:
            elementos.append(html.Div(className="submenu", style={"--color-materia": m.color},
                                      children=[
                dcc.Link(href=m.ruta_simulador(s), id=f"sub-{m.id}-{s.id}",
                         className="enlace-sub"
                                   + (" activo" if sim_activo is not None and sim_activo.id == s.id else "")
                                   + ("" if s.listo else " pendiente"),
                         children=[html.Span(className="punto-estado"), html.Span(s.nombre)])
                for s in m.simuladores
            ]))
    return elementos
