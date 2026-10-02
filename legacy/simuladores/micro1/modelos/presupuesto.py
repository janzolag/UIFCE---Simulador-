"""Simulador 1 — Restricción presupuestaria.

Referencia: Monsalve (2017), Vol. I, sección 1.4, figuras 1.10–1.14.

    p1·x + p2·y = M     ⇔     y = M/p2 − (p1/p2)·x
"""
from __future__ import annotations

from ._comun import ErrorParametro, no_negativo, positivo


def recta(p1: float, p2: float, M: float) -> dict:
    """Interceptos, pendiente y área del conjunto presupuestal."""
    p1, p2 = positivo("p1", p1), positivo("p2", p2)
    M = no_negativo("M", M)
    return {
        "intercepto_x": M / p1,
        "intercepto_y": M / p2,
        "pendiente": -p1 / p2,            # costo de oportunidad de x en unidades de y
        "precio_relativo": p1 / p2,
        "area_conjunto": M * M / (2 * p1 * p2),
    }


def y_sobre_recta(x: float, p1: float, p2: float, M: float) -> float:
    """Ordenada de la recta presupuestal para un x dado (puede ser negativa)."""
    positivo("p1", p1); positivo("p2", p2); no_negativo("M", M)
    return (M - p1 * x) / p2


def clasificar_canasta(x: float, y: float, p1: float, p2: float, M: float,
                       tol: float = 1e-9) -> str:
    """'asequible_interior', 'sobre_la_recta' o 'inasequible'."""
    no_negativo("x", x); no_negativo("y", y)
    positivo("p1", p1); positivo("p2", p2); no_negativo("M", M)
    gasto = p1 * x + p2 * y
    if abs(gasto - M) <= tol * max(1.0, M):
        return "sobre_la_recta"
    return "asequible_interior" if gasto < M else "inasequible"


def cambio(p1: float, p2: float, M: float,
           p1n: float | None = None, p2n: float | None = None,
           Mn: float | None = None) -> dict:
    """Estática comparativa de la recta (figuras 1.11–1.14).

    Devuelve el tipo de movimiento y el área de canastas ganadas/perdidas.
    """
    p1n = p1 if p1n is None else p1n
    p2n = p2 if p2n is None else p2n
    Mn = M if Mn is None else Mn
    r0, r1 = recta(p1, p2, M), recta(p1n, p2n, Mn)

    if abs(p1n / p2n - p1 / p2) < 1e-12:
        if abs(Mn / p1n - M / p1) < 1e-12:
            tipo = "sin_cambio"
        else:
            tipo = "desplazamiento_paralelo"
    elif abs(Mn / p2n - M / p2) < 1e-12:
        tipo = "rotacion_sobre_eje_y"          # cambió p1
    elif abs(Mn / p1n - M / p1) < 1e-12:
        tipo = "rotacion_sobre_eje_x"          # cambió p2
    else:
        tipo = "cambio_combinado"

    # Área ganada y perdida: se integra por franjas (exacto para rectas).
    ganada, perdida = _areas_entre_rectas(r0, r1)
    return {"tipo": tipo, "antes": r0, "despues": r1,
            "area_ganada": ganada, "area_perdida": perdida,
            "cambio_area_neto": r1["area_conjunto"] - r0["area_conjunto"]}


def _areas_entre_rectas(r0: dict, r1: dict) -> tuple[float, float]:
    """Área de canastas que se vuelven asequibles / inasequibles."""
    def f(r, x):
        return max(0.0, r["intercepto_y"] + r["pendiente"] * x)
    xmax = max(r0["intercepto_x"], r1["intercepto_x"])
    if xmax == 0:
        return 0.0, 0.0
    # Puntos de quiebre: interceptos y cruce de las rectas.
    puntos = {0.0, r0["intercepto_x"], r1["intercepto_x"], xmax}
    dp = r1["pendiente"] - r0["pendiente"]
    if abs(dp) > 1e-15:
        xc = (r0["intercepto_y"] - r1["intercepto_y"]) / dp
        if 0 < xc < xmax:
            puntos.add(xc)
    xs = sorted(puntos)
    gan = per = 0.0
    for a, b in zip(xs[:-1], xs[1:]):
        # En cada tramo ambas funciones son lineales: regla del trapecio exacta.
        m = (a + b) / 2
        d_a, d_b, d_m = (f(r1, a) - f(r0, a), f(r1, b) - f(r0, b), f(r1, m) - f(r0, m))
        area = (b - a) * (d_a + 4 * d_m + d_b) / 6          # Simpson (exacto)
        if d_m >= 0:
            gan += area
        else:
            per -= area
    return gan, per


def validar_ingreso_minimo(M: float, gasto_minimo: float) -> None:
    if M < gasto_minimo:
        raise ErrorParametro(
            f"El presupuesto M={M} no alcanza el gasto mínimo requerido ({gasto_minimo:.4g}).")
