"""
Fundamentos de Economía — catálogo de simuladores.

Para activar un simulador: crea un módulo en esta carpeta (p. ej.
oferta_demanda.py) con sus funciones `construir_layout` y
`registrar_callbacks`, y asígnalas en la ficha correspondiente abajo.
Mientras no se asignen, el simulador aparece como "En construcción".
"""
from simuladores.base import Materia, Simulador

MATERIA = Materia(
    id="fundamentos",
    nombre="Fundamentos de Economía",
    sigla="Fu",
    color="#3DD6B5",
    descripcion="Mercados, elasticidades, excedentes e intervención del Estado: "
                "las herramientas básicas del análisis económico.",
    simuladores=[
        Simulador("oferta-demanda", "Equilibrio de mercado",
                  "Oferta y demanda lineales, precio y cantidad de equilibrio, "
                  "y desplazamientos de las curvas.",
                  r"$Q^d = a - bP \qquad Q^s = c + dP$"),
        Simulador("elasticidades", "Elasticidades",
                  "Elasticidad precio, ingreso y cruzada a lo largo de la curva de demanda.",
                  r"$\varepsilon_{p} = \dfrac{\Delta Q / Q}{\Delta P / P}$"),
        Simulador("excedentes", "Excedente del consumidor y del productor",
                  "Áreas de bienestar en el equilibrio competitivo.",
                  r"$EC = \int_0^{Q^*} D(Q)\,dQ - P^*Q^*$"),
        Simulador("intervencion", "Impuestos, subsidios y controles de precios",
                  "Incidencia tributaria, pérdida irrecuperable de eficiencia, "
                  "precios máximos y mínimos.",
                  r"$P_c - P_p = t$"),
        Simulador("fpp", "Frontera de posibilidades de producción",
                  "Costo de oportunidad creciente y eficiencia productiva.",
                  r"$\dfrac{x^2}{a^2} + \dfrac{y^2}{b^2} = 1$"),
        Simulador("ventaja-comparativa", "Ventaja comparativa y comercio",
                  "Costos de oportunidad entre dos países y ganancias del intercambio.",
                  r"$CO_{x} = \dfrac{\Delta y}{\Delta x}$"),
    ],
)
