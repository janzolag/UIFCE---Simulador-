"""
Simulador Económico — Unidad Informática FCE, Universidad Nacional de Colombia.

Ejecutar en local:
    pip install -r requirements.txt
    python app.py            -> abrir http://127.0.0.1:8050

Producción (p. ej. Render, Railway, servidor de la Facultad):
    gunicorn app:server

Estructura:
    config.py                 colores, textos y plantilla Plotly (azul oscuro)
    registro.py               lista de materias que ve la app
    simuladores/base.py       contrato Simulador/Materia + marco de interfaz común
    simuladores/<materia>/    catálogo y módulos de cada materia
    simuladores/plantilla.py  ejemplo completo para crear un simulador nuevo
    componentes/              barra lateral y páginas generales
    assets/estilos.css        estilos (Dash lo carga automáticamente)
"""
import os

from dash import Dash, Input, Output, State, ctx, dcc, html

import config  # noqa: F401  (registra la plantilla Plotly "uifce")
from componentes.barra_lateral import contenido_navegacion, estructura_barra_lateral
from componentes.paginas import (figura_portada, pagina_inicio, pagina_materia,
                                 pagina_no_encontrada, pagina_simulador)
from registro import MATERIAS, buscar_materia, resolver_ruta


def _activar_modo_demo():
    """Agrega el simulador de plantilla a Fundamentos (solo pruebas/desarrollo)."""
    from simuladores import plantilla
    from simuladores.base import Simulador
    fundamentos = buscar_materia("fundamentos")
    if fundamentos.buscar(plantilla.SIM_ID) is None:
        fundamentos.simuladores.append(Simulador(
            plantilla.SIM_ID, "Plantilla (demo)", "Simulador de ejemplo para desarrolladores.",
            r"$P = a - bQ$",
            construir_layout=plantilla.construir_layout,
            registrar_callbacks=plantilla.registrar_callbacks,
            responsable="UIFCE"))


def crear_app(modo_demo: bool = False) -> Dash:
    if modo_demo:
        _activar_modo_demo()

    app = Dash(
        __name__,
        title=config.TITULO_APP + " · UIFCE",
        suppress_callback_exceptions=True,   # las páginas se crean al navegar
        meta_tags=[{"name": "viewport", "content": "width=device-width, initial-scale=1"}],
    )

    app.layout = html.Div(className="contenedor-app", children=[
        dcc.Location(id="url", refresh=False),
        estructura_barra_lateral(),
        html.Main(id="contenido", className="contenido"),
    ])

    # --- Enrutador: decide qué página mostrar según la URL -------------------
    @app.callback(Output("contenido", "children"), Output("nav-lateral", "children"),
                  Input("url", "pathname"))
    def navegar(ruta):
        tipo, materia, sim = resolver_ruta(ruta)
        if tipo == "inicio":
            pagina = pagina_inicio()
        elif tipo == "materia":
            pagina = pagina_materia(materia)
        elif tipo == "simulador":
            pagina = pagina_simulador(materia, sim)
        else:
            pagina = pagina_no_encontrada(ruta)
        return pagina, contenido_navegacion(ruta)

    # --- Menú en pantallas pequeñas (celular / tableta) ---------------------
    @app.callback(Output("barra-lateral", "className"),
                  Input("boton-menu", "n_clicks"), Input("url", "pathname"),
                  State("barra-lateral", "className"))
    def alternar_menu(_clics, _ruta, clase):
        clase = clase or "barra-lateral"
        if ctx.triggered_id == "boton-menu" and "abierta" not in clase:
            return "barra-lateral abierta"
        return "barra-lateral"   # al navegar, el menú se cierra

    # --- Gráfica de muestra de la portada ------------------------------------
    @app.callback(Output("grafica-portada", "figure"), Input("slider-portada", "value"))
    def mover_portada(desplazamiento):
        return figura_portada(desplazamiento or 0)

    # --- Callbacks de cada simulador listo (se registran solos) -------------
    for materia in MATERIAS:
        for sim in materia.simuladores:
            if sim.registrar_callbacks is not None:
                sim.registrar_callbacks(app)

    return app


app = crear_app(modo_demo=os.environ.get("SIMULADOR_DEMO") == "1")
server = app.server  # para gunicorn

if __name__ == "__main__":
    app.run(debug=os.environ.get("SIMULADOR_DEBUG", "1") == "1", port=int(os.environ.get("PORT", 8050)))
