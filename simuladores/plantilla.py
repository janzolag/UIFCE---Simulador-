"""
PLANTILLA DE SIMULADOR — copia este archivo para crear uno nuevo.

Ejemplo mínimo y funcional (probado en tests/): una demanda lineal P = a − bQ
con dos deslizadores. No aparece en el menú salvo en modo demostración
(SIMULADOR_DEMO=1), que se usa solo para las pruebas.

Pasos para crear un simulador real, p. ej. IS-LM:
  1. Copia este archivo a simuladores/macro1/is_lm.py
  2. Cambia MATERIA_ID y SIM_ID ("macro1", "is-lm") y la lógica de `calcular_figura`.
  3. En simuladores/macro1/__init__.py, en la ficha de "is-lm", agrega:
         construir_layout=is_lm.construir_layout,
         registrar_callbacks=is_lm.registrar_callbacks,
     (importando el módulo dentro de esa función o al inicio del archivo).
  Listo: aparecerá con punto verde en la barra lateral.

Reglas:
  - Usa `id_componente(...)` para TODOS los ids (evita choques entre simuladores).
  - Separa el cálculo (función pura, fácil de probar) del callback de Dash.
  - Usa `marco_simulador(...)` para que todos compartan la misma interfaz.
"""
import numpy as np
import plotly.graph_objects as go
from dash import Input, Output, html

from config import COLORES
from simuladores.base import control_deslizante, grafica, id_componente, marco_simulador

MATERIA_ID = "fundamentos"
SIM_ID = "plantilla"


def _id(nombre):
    return id_componente(MATERIA_ID, SIM_ID, nombre)


# 1) Cálculo puro --------------------------------------------------------------
def calcular_figura(a: float, b: float) -> go.Figure:
    q = np.linspace(0, 100, 101)
    p = a - b * q
    fig = go.Figure(go.Scatter(x=q, y=p, mode="lines", name="Demanda",
                               line=dict(width=3, color="#FF7A85")))
    fig.update_layout(template="uifce", xaxis_title="Cantidad (Q)", yaxis_title="Precio (P)",
                      yaxis_range=[0, 120], xaxis_range=[0, 100], uirevision=SIM_ID)
    fig.add_annotation(x=5, y=a, text=f"P = {a:g} − {b:g}·Q", showarrow=False,
                       xanchor="left", font=dict(color=COLORES["acento"]))
    return fig


# 2) Interfaz ------------------------------------------------------------------
def construir_layout():
    from registro import buscar_materia  # import tardío: evita importaciones circulares
    materia = buscar_materia(MATERIA_ID)
    sim = materia.buscar(SIM_ID)
    controles = [
        control_deslizante(_id("a"), "Intercepto (a)", 20, 120, 100, 1),
        control_deslizante(_id("b"), "Pendiente (b)", 0.1, 2, 1, 0.1),
    ]
    explicacion = html.P("Al subir a, la demanda se desplaza hacia arriba; al subir b, "
                         "se vuelve más inclinada.", id=_id("explicacion"))
    return marco_simulador(materia, sim, controles,
                           grafica(_id("grafica"), calcular_figura(100, 1)), explicacion)


# 3) Callbacks -----------------------------------------------------------------
def registrar_callbacks(app):
    @app.callback(Output(_id("grafica"), "figure"),
                  Input(_id("a"), "value"), Input(_id("b"), "value"))
    def _actualizar(a, b):
        return calcular_figura(a, b)
