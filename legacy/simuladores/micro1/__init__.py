"""
Microeconomía 1 — catálogo de simuladores.
Alcance: hasta antes de la caja de Edgeworth y las funciones de bienestar.

Estructura de la carpeta:
    modelos/            motor de cálculo puro (fórmulas de Monsalve 2017), probado en tests/micro1/
    _ui.py              piezas de interfaz compartidas (tablas, avisos, selectores)
    <simulador>.py      una pantalla por simulador: construir_layout + registrar_callbacks

Para editar una fórmula: cambia modelos/ y corre `python -m pytest tests/micro1`.
Para editar lo que se ve: cambia el archivo del simulador.
"""
from simuladores.base import Materia, Simulador
from simuladores.micro1 import (competencia_perfecta, costos, demanda, eleccion_optima, monopolio,
                                oligopolio, preferencias, produccion, restriccion_presupuestal,
                                slutsky)


def _listo(modulo):
    """Conecta la interfaz y los callbacks de un módulo a su ficha."""
    return dict(construir_layout=modulo.construir_layout,
                registrar_callbacks=modulo.registrar_callbacks, responsable="UIFCE")

MATERIA = Materia(
    id="micro1",
    nombre="Microeconomía 1",
    sigla="Mi",
    color="#FFA45B",
    descripcion="Teoría del consumidor y del productor: restricción presupuestal, "
                "preferencias, elección óptima, costos y estructuras de mercado.",
    simuladores=[
        Simulador("restriccion-presupuestal", "Restricción presupuestal",
                  "Conjunto factible del consumidor y efectos de cambios en precios e ingreso.",
                  r"$p_1 x + p_2 y = M$",
                  **_listo(restriccion_presupuestal)),
        Simulador("preferencias", "Preferencias y curvas de indiferencia",
                  "Cobb-Douglas, Leontief, sustitutos perfectos, cuasilineal, separable y Stone-Geary.",
                  r"$U(x, y) = x^{\alpha} y^{\beta} \qquad TMS = \dfrac{UMg_x}{UMg_y}$",
                  **_listo(preferencias)),
        Simulador("eleccion-optima", "Elección óptima del consumidor",
                  "Tangencia entre la curva de indiferencia y la recta presupuestal.",
                  r"$TMS = \dfrac{UMg_x}{UMg_y} = \dfrac{p_1}{p_2}$",
                  **_listo(eleccion_optima)),
        Simulador("slutsky", "Efectos ingreso y sustitución",
                  "Descomposición de Slutsky y de Hicks ante un cambio de precio.",
                  r"$\dfrac{\partial x}{\partial p_1} = \dfrac{\partial h_1}{\partial p_1} - x\,\dfrac{\partial x}{\partial M}$",
                  **_listo(slutsky)),
        Simulador("demanda", "Demanda individual y de mercado",
                  "Curva de demanda, curva de Engel, elasticidades y medidas de bienestar (VC, VE, excedente).",
                  r"$x^{*} = x(p_1, p_2, M) \qquad \varepsilon = \dfrac{\partial x}{\partial p_1}\dfrac{p_1}{x}$",
                  **_listo(demanda)),
        Simulador("produccion", "Tecnología e isocuantas",
                  "Función de producción, productividad marginal y rendimientos a escala.",
                  r"$z = A\,x^{\alpha} y^{\beta}$",
                  **_listo(produccion)),
        Simulador("costos", "Costos de corto y largo plazo",
                  "Costo total, medio y marginal; envolvente de largo plazo.",
                  r"$CT(Q) = CF + CV(Q) \qquad CMg = \dfrac{dCT}{dQ}$",
                  **_listo(costos)),
        Simulador("competencia-perfecta", "Competencia perfecta",
                  "Maximización de beneficios, punto de cierre y oferta de la empresa.",
                  r"$P = CMg(Q)$",
                  **_listo(competencia_perfecta)),
        Simulador("monopolio", "Monopolio",
                  "Ingreso marginal, poder de mercado y pérdida de eficiencia.",
                  r"$IMg(Q) = CMg(Q)$",
                  **_listo(monopolio)),
        Simulador("oligopolio", "Oligopolio",
                  "Cournot, Stackelberg, cartel y Bertrand; convergencia a competencia con n empresas.",
                  r"$y_i^{*} = \dfrac{a-c}{n+1} \qquad p^{*} = \dfrac{a+nc}{n+1}$",
                  **_listo(oligopolio)),
    ],
)
