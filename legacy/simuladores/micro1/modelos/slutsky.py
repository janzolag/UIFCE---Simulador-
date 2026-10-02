"""Simulador 4 — Efecto sustitución y efecto ingreso (Hicks y Slutsky).

Referencia: Monsalve (2017), semana 4 (ecuaciones 4.1–4.4, ejemplo 1).

Descomposición discreta ante un cambio de p1 → p1':
    Efecto total  = x(p1', p2, M) − x(p1, p2, M)
    Hicks:   ES = h(p1', U0) − x(p1, M)      (compensación de utilidad, M' = e(p1', U0))
    Slutsky: ES = x(p1', M'') − x(p1, M)     (compensación de poder de compra,
                                              M'' = M + x0·(p1' − p1))
    EI = Efecto total − ES
"""
from __future__ import annotations

from ._comun import positivo
from .consumidor import Utilidad


def descomposicion(u: Utilidad, p1: float, p2: float, M: float, p1n: float,
                   metodo: str = "hicks") -> dict:
    positivo("p1'", p1n)
    A = u.marshall(p1, p2, M)                  # canasta inicial
    C = u.marshall(p1n, p2, M)                 # canasta final
    U0 = u.U(A["x"], A["y"])
    if metodo == "hicks":
        M_comp = u.gasto(p1n, p2, U0)
    elif metodo == "slutsky":
        M_comp = M + A["x"] * (p1n - p1)
    else:
        raise ValueError("metodo debe ser 'hicks' o 'slutsky'.")
    B = u.marshall(p1n, p2, M_comp)            # canasta compensada
    et = (C["x"] - A["x"], C["y"] - A["y"])
    es = (B["x"] - A["x"], B["y"] - A["y"])
    ei = (C["x"] - B["x"], C["y"] - B["y"])
    return {
        "metodo": metodo, "A": A, "B": B, "C": C, "U0": U0,
        "M_compensado": M_comp, "compensacion": M_comp - M,
        "efecto_total": et, "efecto_sustitucion": es, "efecto_ingreso": ei,
        "clasificacion_x": clasificar(es[0], ei[0], p1n - p1),
    }


def clasificar(es_x: float, ei_x: float, dp: float, tol: float = 1e-12) -> str:
    """Clasifica el bien x según los signos de los efectos ante Δp1."""
    if abs(dp) < tol:
        return "sin_cambio"
    # Efecto ingreso "normal" va en la misma dirección que el de sustitución.
    if abs(ei_x) < tol:
        return "efecto_ingreso_nulo"
    if ei_x * es_x > 0:
        return "normal"
    if abs(ei_x) > abs(es_x):
        return "giffen"
    return "inferior"


def ecuacion_slutsky(u: Utilidad, p1: float, p2: float, M: float,
                     h: float = 1e-5) -> dict:
    """Versión diferencial (4.1): ∂x/∂p1 = ∂h1/∂p1 − x·∂x/∂M (derivadas numéricas)."""
    x = u.marshall(p1, p2, M)["x"]
    U0 = u.indirecta(p1, p2, M)
    dx_dp1 = (u.marshall(p1 + h, p2, M)["x"] - u.marshall(p1 - h, p2, M)["x"]) / (2 * h)
    dh_dp1 = (u.hicks(p1 + h, p2, U0)[0] - u.hicks(p1 - h, p2, U0)[0]) / (2 * h)
    dx_dM = (u.marshall(p1, p2, M + h)["x"] - u.marshall(p1, p2, M - h)["x"]) / (2 * h)
    return {"efecto_precio": dx_dp1, "efecto_sustitucion": dh_dp1,
            "efecto_ingreso": -x * dx_dM, "residuo": dx_dp1 - (dh_dp1 - x * dx_dM)}


def matriz_sustitucion(u: Utilidad, p1: float, p2: float, U0: float,
                       h: float = 1e-5) -> list[list[float]]:
    """S_ij = ∂h_i/∂p_j (sección 4.7). Debe ser simétrica y semidefinida negativa."""
    def dh(i, j):
        up = [p1, p2]; dn = [p1, p2]
        up[j] += h; dn[j] -= h
        return (u.hicks(*up, U0)[i] - u.hicks(*dn, U0)[i]) / (2 * h)
    return [[dh(0, 0), dh(0, 1)], [dh(1, 0), dh(1, 1)]]
