"""
Macroeconomía 1 — catálogo de simuladores.
Alcance: corto plazo hasta IS-LM-BP (Mundell-Fleming).
Ecuaciones según la Entrega 1 del proyecto de estudio (UIFCE).

Para activar un simulador: crea su módulo en esta carpeta y asigna
`construir_layout` y `registrar_callbacks` en la ficha correspondiente.
"""
from simuladores.base import Materia, Simulador

MATERIA = Materia(
    id="macro1",
    nombre="Macroeconomía 1",
    sigla="Ma",
    color="#5B9BFF",
    descripcion="El corto plazo y el principio de la demanda efectiva: del modelo "
                "Keynesiano al modelo Mundell-Fleming.",
    simuladores=[
        Simulador("keynesiano", "Modelo Keynesiano (Gasto–Ingreso)",
                  "Equilibrio en el mercado de bienes con precios fijos y multiplicador "
                  "con impuestos proporcionales.",
                  r"$DA = C + \bar{I} + \bar{G}, \quad C = \bar{C} + c(1-t)Y "
                  r"\quad\Rightarrow\quad Y^{*} = \dfrac{1}{1 - c(1-t)}\,\bar{A}$",
                  ecuacion_resumen=r"$Y^{*} = \dfrac{1}{1 - c(1-t)}\,\bar{A}$"),
        Simulador("is-lm", "IS–LM en economía cerrada",
                  "Equilibrio conjunto del mercado de bienes y del mercado de dinero; "
                  "política fiscal y monetaria.",
                  r"$IS:\; Y = \alpha_G(\bar{A} - b\,r) \qquad LM:\; \dfrac{M}{P} = kY - h\,r$",
                  ecuacion_resumen=r"$Y = \alpha_G(\bar{A} - b\,r), \;\; \tfrac{M}{P} = kY - h\,r$"),
        Simulador("da-oa", "Demanda y oferta agregadas (DA–OA)",
                  "Nivel de precios, rigideces nominales y ajuste hacia el producto potencial.",
                  r"$OA_{CP}:\; P = P^{e} + \lambda\,(Y - \bar{Y})$"),
        Simulador("mundell-fleming", "Mundell–Fleming (IS–LM–BP)",
                  "Economía abierta: balanza de pagos, tipo de cambio y efectividad "
                  "de las políticas.",
                  r"$NX = \bar{X} + \phi\,e - m\,Y$"),
    ],
)
