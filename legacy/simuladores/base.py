"""
Contrato común de los simuladores.

Cada simulador se describe con un objeto `Simulador`. Mientras no tenga
`construir_layout`, la aplicación lo muestra automáticamente como
"En construcción" con su ecuación y el marco de la interfaz ya reservado.
Cuando alguien lo programe, solo tiene que:

    1. Escribir `construir_layout()` -> devuelve los componentes de la página.
    2. Escribir `registrar_callbacks(app)` -> conecta controles y gráficas.
    3. Asignar ambas funciones en la ficha del simulador (ver
       simuladores/plantilla.py, que es un ejemplo completo y probado).

No hay que tocar app.py, la barra lateral ni el enrutador.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Optional

import plotly.graph_objects as go
from dash import dcc, html

from config import CONFIG_GRAFICA


@dataclass
class Simulador:
    id: str                      # usado en la URL: /macro1/<id>
    nombre: str                  # como aparece en el menú
    descripcion: str             # una o dos frases para profesores
    ecuacion: str = ""           # LaTeX entre $...$ o $$...$$ (se renderiza con MathJax)
    construir_layout: Optional[Callable[[], object]] = None
    registrar_callbacks: Optional[Callable[[object], None]] = None
    responsable: str = ""        # quién lo está desarrollando (para dividir tareas)
    ecuacion_resumen: str = ""   # versión corta para las tarjetas (si la ecuación es larga)

    @property
    def listo(self) -> bool:
        return self.construir_layout is not None


@dataclass
class Materia:
    id: str                      # usado en la URL: /<id>
    nombre: str
    sigla: str                   # 2 letras para el ícono de la barra lateral
    color: str                   # color de identidad de la materia
    descripcion: str
    simuladores: list[Simulador] = field(default_factory=list)

    @property
    def ruta(self) -> str:
        return f"/{self.id}"

    def ruta_simulador(self, sim: Simulador) -> str:
        return f"/{self.id}/{sim.id}"

    def buscar(self, sim_id: str) -> Optional[Simulador]:
        return next((s for s in self.simuladores if s.id == sim_id), None)

    @property
    def listos(self) -> int:
        return sum(s.listo for s in self.simuladores)


# ---------------------------------------------------------------------------
# Utilidades para quien programe un simulador
# ---------------------------------------------------------------------------
def id_componente(materia_id: str, sim_id: str, nombre: str) -> str:
    """IDs únicos en toda la app: evita que dos simuladores choquen.
    Ej.: id_componente("macro1", "is-lm", "slider-g") -> "macro1-is-lm-slider-g"."""
    return f"{materia_id}-{sim_id}-{nombre}"


def grafica(id_: str, figura: go.Figure | None = None, alto: int = 460) -> dcc.Graph:
    """Gráfica Plotly con el estilo y configuración del simulador."""
    return dcc.Graph(
        id=id_,
        figure=figura if figura is not None else figura_vacia(),
        config=CONFIG_GRAFICA,
        style={"height": f"{alto}px"},
        className="grafica",
    )


def figura_vacia(mensaje: str = "") -> go.Figure:
    fig = go.Figure()
    fig.update_layout(template="uifce", xaxis=dict(showticklabels=False),
                      yaxis=dict(showticklabels=False))
    if mensaje:
        fig.add_annotation(text=mensaje, showarrow=False, x=0.5, y=0.5,
                           xref="paper", yref="paper",
                           font=dict(size=15, color="#9DB0CF"))
    return fig


def control_deslizante(id_: str, etiqueta: str, minimo: float, maximo: float,
                       valor: float, paso: float = 1) -> html.Div:
    """Slider con etiqueta, estilo uniforme para todos los simuladores."""
    return html.Div(className="control", children=[
        html.Label(etiqueta, htmlFor=id_, className="control-etiqueta"),
        dcc.Slider(id=id_, min=minimo, max=maximo, step=paso, value=valor,
                   marks=None, tooltip={"placement": "bottom", "always_visible": True},
                   updatemode="drag"),
    ])


def marco_simulador(materia: Materia, sim: Simulador, controles, grafica_principal,
                    explicacion=None) -> html.Div:
    """Interfaz de uso estándar de TODOS los simuladores:

        [ encabezado: materia › nombre · ecuación                     ]
        [ panel de parámetros ] [ gráfica principal                   ]
        [ explicación / lectura económica (opcional)                  ]
    """
    return html.Div(className="pagina-simulador", children=[
        html.Div(className="migas", children=[
            dcc.Link(materia.nombre, href=materia.ruta), html.Span(" › "), html.Span(sim.nombre),
        ]),
        html.Div(className="encabezado-simulador", children=[
            html.H1(sim.nombre),
            html.P(sim.descripcion, className="texto-suave"),
            dcc.Markdown(sim.ecuacion, mathjax=True, className="ecuacion") if sim.ecuacion else None,
        ]),
        html.Div(className="rejilla-simulador", children=[
            html.Section(className="panel panel-controles", children=[
                html.H3("Parámetros"), html.Div(controles, className="lista-controles"),
            ]),
            html.Section(className="panel panel-grafica", children=[grafica_principal]),
        ]),
        html.Section(className="panel panel-explicacion", children=explicacion) if explicacion else None,
    ])
