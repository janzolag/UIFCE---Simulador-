"""
Registro central: la ÚNICA lista de materias que ve la aplicación.
La barra lateral, la página de inicio y el enrutador se construyen a partir
de aquí. Para agregar una materia nueva (p. ej. Macro 2), crea su carpeta en
simuladores/ con un objeto MATERIA y añádela a MATERIAS.
"""
from simuladores.fundamentos import MATERIA as FUNDAMENTOS
from simuladores.macro1 import MATERIA as MACRO1
from simuladores.micro1 import MATERIA as MICRO1

MATERIAS = [FUNDAMENTOS, MICRO1, MACRO1]


def buscar_materia(materia_id):
    return next((m for m in MATERIAS if m.id == materia_id), None)


def resolver_ruta(ruta):
    """Traduce una URL a lo que hay que mostrar.

    '/'               -> ("inicio", None, None)
    '/macro1'         -> ("materia", <Macro 1>, None)
    '/macro1/is-lm'   -> ("simulador", <Macro 1>, <IS-LM>)
    cualquier otra    -> ("no-encontrado", None, None)
    """
    partes = [p for p in (ruta or "/").strip("/").split("/") if p]
    if not partes:
        return "inicio", None, None
    materia = buscar_materia(partes[0])
    if materia is None or len(partes) > 2:
        return "no-encontrado", None, None
    if len(partes) == 1:
        return "materia", materia, None
    sim = materia.buscar(partes[1])
    if sim is None:
        return "no-encontrado", None, None
    return "simulador", materia, sim


def total_simuladores():
    return sum(len(m.simuladores) for m in MATERIAS)
