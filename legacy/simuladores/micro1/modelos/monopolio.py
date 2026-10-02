"""Simulador 9 — Monopolio.

Referencia: Monsalve (2017), semana 10: ej. 1 (comparación con competencia y
excedentes), ej. 2 (pérdidas y costos fijos), ej. 4 (impuesto), sección 10.5
(índice de Lerner, demanda de elasticidad constante), ej. 5 (discriminación de
tercer grado) y sección 10.4 (regulación: precio competitivo y precio Ramsey).

Demanda inversa lineal p = a − b·y; costo C(y) = CF + c·y + d·y² (d ≥ 0).
"""
from __future__ import annotations

import math

from ._comun import ErrorParametro, no_negativo, positivo


def _validar(a, b, c, d, CF):
    positivo("a", a); positivo("b", b); no_negativo("c", c)
    no_negativo("d", d); no_negativo("CF", CF)
    if c >= a:
        raise ErrorParametro("El costo marginal inicial c ≥ a: no hay mercado rentable (y* = 0).")


def monopolio_lineal(a, b, c=0.0, d=0.0, CF=0.0) -> dict:
    """IMg = CMg ⇒ a − 2b·y = c + 2d·y."""
    _validar(a, b, c, d, CF)
    ym = (a - c) / (2 * b + 2 * d)
    pm = a - b * ym
    Pi = pm * ym - (CF + c * ym + d * ym * ym)
    # Competencia: p = CMg ⇒ a − b·y = c + 2d·y
    yc = (a - c) / (b + 2 * d)
    pc = a - b * yc
    Pc = pc * yc - (CF + c * yc + d * yc * yc)
    ec_m = 0.5 * b * ym * ym
    ep_m = Pi + CF                                  # excedente del productor = IT − CV
    ec_c = 0.5 * b * yc * yc
    ep_c = Pc + CF
    pei = (ec_c + ep_c) - (ec_m + ep_m)
    e = -pm / (b * ym)
    cmg = c + 2 * d * ym
    return {
        "y_m": ym, "p_m": pm, "beneficio_m": Pi, "opera": Pi >= -1e-12,
        "y_c": yc, "p_c": pc, "beneficio_c": Pc,
        "EC_m": ec_m, "EP_m": ep_m, "EC_c": ec_c, "EP_c": ep_c,
        "perdida_eficiencia": pei,
        "elasticidad_m": e, "tramo": "elastico" if e < -1 else "unitario" if e == -1 else "inelastico",
        "lerner": (pm - cmg) / pm, "inverso_elasticidad": -1 / e,
        "CMg_m": cmg, "IMg_m": a - 2 * b * ym,
    }


def precio_ramsey(a, b, c=0.0, d=0.0, CF=0.0) -> dict:
    """Precio regulado p = CMe (beneficio cero) — raíz de mayor producción."""
    _validar(a, b, c, d, CF)
    # a − b y = CF/y + c + d y  ⇔ (b + d) y² − (a − c) y + CF = 0
    A, B, C_ = b + d, -(a - c), CF
    disc = B * B - 4 * A * C_
    if disc < 0:
        return {"existe": False, "motivo": "La demanda nunca alcanza al costo medio."}
    y = (-B + math.sqrt(disc)) / (2 * A)
    return {"existe": True, "y": y, "p": a - b * y}


def elasticidad_constante(alpha: float, c: float) -> dict:
    """y = p^(−α), CMg = c: p = c/(1 − 1/α) si α > 1 (sección 10.5)."""
    positivo("c", c); positivo("α", alpha)
    if alpha <= 1:
        return {"existe": False,
                "motivo": "Con demanda inelástica (α ≤ 1) el IMg ≤ 0: el monopolista "
                          "querría subir el precio sin límite."}
    p = c / (1 - 1 / alpha)
    return {"existe": True, "p": p, "y": p ** (-alpha), "markup": p / c - 1,
            "lerner": (p - c) / p}


def impuesto_especifico(a, b, c, t) -> dict:
    """Ej. 4: p = a − b·y + t (el libro suma t a la inversa) ⇒ p* = (a+c)/2 + t/2."""
    positivo("a", a); positivo("b", b); no_negativo("c", c); no_negativo("t", t)
    y = (a - c + t) / (2 * b)
    return {"y": y, "p": a - b * y + t, "traslado": 0.5}


def impuesto_al_vendedor(a, b, c, t) -> dict:
    """Formulación estándar: el vendedor paga t por unidad ⇒ CMg = c + t."""
    positivo("a", a); positivo("b", b); no_negativo("c", c); no_negativo("t", t)
    if c + t >= a:
        return {"y": 0.0, "p": a, "traslado": math.nan, "recaudo": 0.0}
    y = (a - c - t) / (2 * b)
    p = a - b * y
    p0 = (a + c) / 2
    return {"y": y, "p": p, "traslado": (p - p0) / t if t > 0 else math.nan,
            "recaudo": t * y}


# ---------------------------------------------------------------- discriminación
def discriminacion_tercer_grado(a1, b1, a2, b2, costo_cuadratico: float = 1.0,
                                c_lineal: float = 0.0) -> dict:
    """Dos mercados p_i = a_i − b_i·y_i; C(y) = c_lineal·y + k·y², y = y1 + y2.

    Resuelve (i) la discriminación y (ii) el precio uniforme sobre la demanda
    agregada QUEBRADA (un grupo deja de comprar cuando p supera su precio máximo).
    """
    for n, v in (("a1", a1), ("b1", b1), ("a2", a2), ("b2", b2)):
        positivo(n, v)
    k = no_negativo("k", costo_cuadratico); c = no_negativo("c", c_lineal)

    # (i) Discriminación: IMg_i = CMg(y1 + y2), con posibles esquinas.
    mejor = None
    for activos in ((1, 1), (1, 0), (0, 1)):
        sol = _discrimina(a1, b1, a2, b2, k, c, activos)
        if sol and (mejor is None or sol["beneficio"] > mejor["beneficio"] + 1e-15):
            mejor = sol
    disc = mejor

    # (ii) Precio uniforme: se maximiza por tramos de la demanda agregada.
    Q = lambda p: max(0.0, (a1 - p) / b1) + max(0.0, (a2 - p) / b2)
    Pi = lambda p: p * Q(p) - c * Q(p) - k * Q(p) ** 2
    cortes = sorted({0.0, min(a1, a2), max(a1, a2)})
    candidatos = list(cortes)
    for lo, hi in zip(cortes[:-1], cortes[1:]):
        m = (lo + hi) / 2
        # En el tramo Q(p) = α − β·p (lineal); beneficio cuadrático en p.
        al = (a1 / b1 if a1 > m else 0) + (a2 / b2 if a2 > m else 0)
        be = (1 / b1 if a1 > m else 0) + (1 / b2 if a2 > m else 0)
        # Π(p) = (p − c)(α − βp) − k(α − βp)²  ⇒ Π'(p) = 0
        # (α − βp) − β(p − c) + 2kβ(α − βp) = 0
        den = 2 * be + 2 * k * be * be
        if den > 0:
            p_opt = (al + be * c + 2 * k * be * al) / den
            if lo <= p_opt <= hi:
                candidatos.append(p_opt)
    pu = max(candidatos, key=Pi)
    uniforme = {"p": pu, "y": Q(pu), "beneficio": Pi(pu),
                "compran_ambos": Q(pu) > 0 and a1 > pu and a2 > pu}
    return {"discriminacion": disc, "uniforme": uniforme,
            "conviene_discriminar": disc["beneficio"] > uniforme["beneficio"] + 1e-12}


def _discrimina(a1, b1, a2, b2, k, c, activos):
    # Sistema lineal de CPO para los mercados activos.
    if activos == (1, 1):
        # a1 − 2b1 y1 = c + 2k(y1+y2);  a2 − 2b2 y2 = c + 2k(y1+y2)
        A11, A12, B1 = 2 * b1 + 2 * k, 2 * k, a1 - c
        A21, A22, B2 = 2 * k, 2 * b2 + 2 * k, a2 - c
        det = A11 * A22 - A12 * A21
        y1 = (B1 * A22 - A12 * B2) / det
        y2 = (A11 * B2 - B1 * A21) / det
        if y1 < 0 or y2 < 0:
            return None
    elif activos == (1, 0):
        y1, y2 = max((a1 - c) / (2 * b1 + 2 * k), 0.0), 0.0
    else:
        y1, y2 = 0.0, max((a2 - c) / (2 * b2 + 2 * k), 0.0)
    p1, p2 = a1 - b1 * y1, a2 - b2 * y2
    y = y1 + y2
    benef = p1 * y1 + p2 * y2 - c * y - k * y * y
    e1 = -p1 / (b1 * y1) if y1 > 0 else math.nan
    e2 = -p2 / (b2 * y2) if y2 > 0 else math.nan
    return {"y1": y1, "y2": y2, "p1": p1, "p2": p2, "beneficio": benef,
            "elasticidad1": e1, "elasticidad2": e2}
