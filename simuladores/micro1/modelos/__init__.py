"""Motor de cálculo de los simuladores de Microeconomía 1 (UIFCE).

Módulos puros de Python (sin Dash) para que los callbacks los importen y para
poder probarlos de forma aislada. Referencia teórica principal:
Monsalve, S. (2017). *Competencia bajo equilibrio parcial*, Vol. I, 2.ª ed.
Universidad Nacional de Colombia.

    Simulador                     Módulo
    1 Restricción presupuestal    presupuesto
    2 Preferencias                consumidor (familias de utilidad)
    3 Elección óptima             consumidor (marshall, eleccion_optima)
    4 Slutsky / Hicks             slutsky
    5 Demanda y bienestar         demanda
    6 Producción                  produccion
    7 Costos                      costos
    8 Competencia perfecta        competencia
    9 Monopolio                   monopolio
   10 Oligopolio (propuesto)      oligopolio
"""
from . import (competencia, consumidor, costos, demanda, monopolio, oligopolio,
               presupuesto, produccion, slutsky)
from ._comun import ErrorParametro

__all__ = ["competencia", "consumidor", "costos", "demanda", "monopolio",
           "oligopolio", "presupuesto", "produccion", "slutsky", "ErrorParametro"]
