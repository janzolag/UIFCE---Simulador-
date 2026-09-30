"""Simulador 5 — Demanda: elasticidades, tipos de bienes y bienestar.

Referencia: Monsalve (2017), semana 3 (elasticidades, ej. 1-9), semana 4
(sección 4.8, excedente del consumidor, ej. 4-6) y semana 2 (función de gasto,
compensación).
"""
from __future__ import annotations

import math

from ._comun import ErrorParametro, no_negativo, positivo
from .consumidor import Utilidad


# ---------------------------------------------------------------- elasticidades
def elasticidades(u: Utilidad, p1: float, p2: float, M: float, h: float = 1e-6) -> dict:
    """Elasticidades precio propia, cruzada e ingreso de x e y (derivadas centradas)."""
    base = u.marshall(p1, p2, M)
    x, y = base["x"], base["y"]

    def d(var, bien):
        k = {"p1": p1, "p2": p2, "M": M}
        paso = h * max(1.0, k[var])
        up, dn = dict(k), dict(k)
        up[var] += paso; dn[var] -= paso
        return (u.marshall(up["p1"], up["p2"], up["M"])[bien]
                - u.marshall(dn["p1"], dn["p2"], dn["M"])[bien]) / (2 * paso)

    def el(der, var_val, q):
        return der * var_val / q if q > 0 else math.nan

    res = {
        "x": x, "y": y,
        "e_x_p1": el(d("p1", "x"), p1, x), "e_x_p2": el(d("p2", "x"), p2, x),
        "e_x_M": el(d("M", "x"), M, x),
        "e_y_p2": el(d("p2", "y"), p2, y), "e_y_p1": el(d("p1", "y"), p1, y),
        "e_y_M": el(d("M", "y"), M, y),
        "s1": p1 * x / M if M > 0 else math.nan,
        "s2": p2 * y / M if M > 0 else math.nan,
    }
    res["tipo_x"] = tipo_bien(res["e_x_M"], d("p1", "x"))
    res["relacion_bruta_x_con_y"] = relacion_bruta(d("p2", "x"))
    return res


def tipo_bien(e_ingreso: float, dx_dp: float, tol: float = 1e-7) -> str:
    if math.isnan(e_ingreso):
        return "indefinido"
    if dx_dp > tol:
        return "giffen"
    if abs(e_ingreso) <= tol:
        return "neutro_al_ingreso"
    if e_ingreso < 0:
        return "inferior"
    if abs(e_ingreso - 1) <= 1e-6:
        return "ingreso_unitario"        # p. ej. Cobb-Douglas: gasto proporcional al ingreso
    return "lujo" if e_ingreso > 1 + tol else "necesario"


def relacion_bruta(dx_dp2: float, tol: float = 1e-7) -> str:
    if dx_dp2 > tol:
        return "sustitutos_brutos"
    if dx_dp2 < -tol:
        return "complementarios_brutos"
    return "independientes"


def clasificar_elasticidad(e: float, tol: float = 1e-9) -> str:
    """Clasificación de la sección 3.3.1."""
    if math.isinf(e):
        return "perfectamente_elastica"
    a = abs(e)
    if a <= tol:
        return "perfectamente_inelastica"
    if abs(a - 1) <= 1e-6:
        return "unitaria"
    return "elastica" if a > 1 else "inelastica"


def agregacion_engel(el: dict) -> float:
    """s1·η1 + s2·η2 (debe ser 1)."""
    return el["s1"] * el["e_x_M"] + el["s2"] * el["e_y_M"]


def agregacion_cournot(el: dict) -> float:
    """s1·ε11 + s2·ε21 + s1 (debe ser 0)."""
    return el["s1"] * el["e_x_p1"] + el["s2"] * el["e_y_p1"] + el["s1"]


# ---------------------------------------------------------------- demanda lineal
def demanda_lineal(a: float, b: float, p: float) -> dict:
    """x = a − b·p  (Monsalve, ej. 7, figura 3.9)."""
    positivo("a", a); positivo("b", b); no_negativo("p", p)
    x = max(a - b * p, 0.0)
    if x == 0:
        e = -math.inf
    else:
        e = -b * p / x
    return {"x": x, "elasticidad": e, "clasificacion": clasificar_elasticidad(e),
            "p_unitaria": a / (2 * b), "x_unitaria": a / 2,
            "p_max": a / b, "gasto": p * x, "gasto_max": a * a / (4 * b)}


def estimar_lineal(p: float, x: float, e: float) -> dict:
    """Recta x = a − b·p que pasa por (p, x) con elasticidad e (Monsalve, ej. 9)."""
    positivo("p", p); positivo("x", x)
    if e >= 0:
        raise ErrorParametro("La elasticidad-precio de una demanda lineal debe ser negativa.")
    b = -e * x / p
    return {"a": x + b * p, "b": b}


def elasticidad_constante(A: float, alpha: float, p: float) -> dict:
    """X = A·p^(−α) tiene elasticidad −α en toda la curva (Monsalve, ej. 8)."""
    positivo("A", A); positivo("α", alpha); positivo("p", p)
    return {"x": A * p ** (-alpha), "elasticidad": -alpha,
            "clasificacion": clasificar_elasticidad(-alpha)}


# ---------------------------------------------------------------- bienestar
def excedente_consumidor_lineal(a: float, b: float, p: float) -> float:
    """Área bajo x = a − b·p y sobre el precio p (Monsalve, ej. 5 sem. 4)."""
    positivo("a", a); positivo("b", b); no_negativo("p", p)
    x = max(a - b * p, 0.0)
    return 0.5 * x * (a / b - p) if x > 0 else 0.0


def excedente_consumidor_cuasilineal(u, p: float) -> dict:
    """EC = v(x0) − v(0) − p·x0 con x0 = (v')^{-1}(p) (sección 4.8)."""
    x0 = u.vp_inv(p)
    return {"x": x0, "excedente": u.v(x0) - u.v(0.0) - p * x0}


def variaciones(u: Utilidad, p1: float, p2: float, M: float, p1n: float) -> dict:
    """Variación compensada (VC), equivalente (VE) y cambio del excedente (ΔEC).

    VC = e(p', U0) − M    (lo que hay que dar para mantener U0 a precios nuevos)
    VE = M − e(p, U1)     (lo que habría que quitar a precios viejos para bajar a U1)
    ΔEC = −∫ x(p, M) dp  de p1 a p1' (Marshall)
    Signo: positivo = pérdida de bienestar para el consumidor.
    """
    positivo("p1'", p1n)
    U0 = u.indirecta(p1, p2, M)
    U1 = u.indirecta(p1n, p2, M)
    vc = u.gasto(p1n, p2, U0) - M
    ve = M - u.gasto(p1, p2, U1)
    dec = _integral(lambda q: u.marshall(q, p2, M)["x"], p1, p1n)
    return {"U0": U0, "U1": U1, "VC": vc, "VE": ve, "perdida_EC": dec}


def _integral(f, a: float, b: float, n: int = 2000) -> float:
    """Simpson compuesto (n par)."""
    if a == b:
        return 0.0
    hh = (b - a) / n
    s = f(a) + f(b)
    for i in range(1, n):
        s += (4 if i % 2 else 2) * f(a + i * hh)
    return s * hh / 3
