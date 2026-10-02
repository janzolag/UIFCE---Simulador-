"""Simulador 10 (propuesto) — Oligopolio.

Referencia: Monsalve (2017), semana 11: Cournot (11.2.1, 11.2.4), cartel
(11.2.2), Stackelberg (11.2.3, tabla 11.3), Friedman (ej. 1), Bertrand
(11.3.3), competencia monopolística (ej. 2) e índices HHI y CR (ej. 3-4).

Demanda inversa p = a − Y con Y = Σ y_i (como en el libro); se generaliza a
p = a − b·Y.
"""
from __future__ import annotations

import math

from ._comun import ErrorParametro, no_negativo, positivo


def _val(a, b, c):
    positivo("a", a); positivo("b", b); no_negativo("c", c)
    if c >= a:
        raise ErrorParametro("Con c ≥ a ninguna empresa produce.")


def cournot(a, c, n: int = 2, b: float = 1.0) -> dict:
    """n empresas simétricas: y_i = (a − c)/((n+1)·b)."""
    _val(a, b, c)
    if n < 1 or int(n) != n:
        raise ErrorParametro("n debe ser un entero ≥ 1.")
    yi = (a - c) / ((n + 1) * b)
    Y = n * yi
    p = a - b * Y
    return {"y_i": yi, "Y": Y, "p": p, "beneficio_i": (p - c) * yi,
            "EC": 0.5 * b * Y * Y, "lerner": (p - c) / p, "hhi": 1 / n}


def cournot_asimetrico(a, c1, c2, b: float = 1.0) -> dict:
    """Duopolio con costos distintos; incluye la esquina en que una sale."""
    positivo("a", a); positivo("b", b); no_negativo("c1", c1); no_negativo("c2", c2)
    y1 = (a - 2 * c1 + c2) / (3 * b)
    y2 = (a - 2 * c2 + c1) / (3 * b)
    if y1 < 0:
        y1, y2 = 0.0, max((a - c2) / (2 * b), 0.0)
    elif y2 < 0:
        y1, y2 = max((a - c1) / (2 * b), 0.0), 0.0
    p = a - b * (y1 + y2)
    return {"y1": y1, "y2": y2, "p": p,
            "beneficio1": (p - c1) * y1, "beneficio2": (p - c2) * y2}


def reaccion(a, c, y_otro, b: float = 1.0) -> float:
    """Curva de reacción de Cournot: y_i = (a − c − b·y_j)/(2b), truncada en 0."""
    return max((a - c - b * y_otro) / (2 * b), 0.0)


def cartel(a, c, n: int = 2, b: float = 1.0) -> dict:
    _val(a, b, c)
    Y = (a - c) / (2 * b)
    p = a - b * Y
    return {"Y": Y, "y_i": Y / n, "p": p, "beneficio_i": (p - c) * Y / n}


def stackelberg(a, c, b: float = 1.0) -> dict:
    _val(a, b, c)
    y1 = (a - c) / (2 * b)
    y2 = (a - c) / (4 * b)
    p = a - b * (y1 + y2)
    return {"y1": y1, "y2": y2, "Y": y1 + y2, "p": p,
            "beneficio1": (p - c) * y1, "beneficio2": (p - c) * y2}


def competitivo(a, c, b: float = 1.0) -> dict:
    _val(a, b, c)
    return {"Y": (a - c) / b, "p": c, "beneficio": 0.0}


def bertrand_homogeneo(a, c1, c2, b: float = 1.0, paso: float = 0.01) -> dict:
    """Paradoja de Bertrand: con c1 = c2 = c, p = c. Si c1 < c2, la empresa 1
    fija p = mín(c2 − paso, precio de monopolio) y se queda con el mercado."""
    positivo("a", a); positivo("b", b); no_negativo("c1", c1); no_negativo("c2", c2)
    if abs(c1 - c2) < 1e-15:
        p = c1
        Y = max((a - p) / b, 0.0)
        return {"p": p, "y1": Y / 2, "y2": Y / 2, "beneficio1": 0.0, "beneficio2": 0.0}
    lider, cl, ch = (1, c1, c2) if c1 < c2 else (2, c2, c1)
    p_mono = (a + cl) / 2
    p = min(ch - paso, p_mono)
    Y = max((a - p) / b, 0.0)
    out = {"p": p, "y1": 0.0, "y2": 0.0, "beneficio1": 0.0, "beneficio2": 0.0}
    out[f"y{lider}"] = Y
    out[f"beneficio{lider}"] = (p - cl) * Y
    return out


def bertrand_diferenciado(a, c, eps, n: int) -> dict:
    """y_i = a − p_i + ε·Σ_{j≠i} p_j (sección 11.3.3)."""
    positivo("a", a); no_negativo("c", c); positivo("ε", eps)
    den = 2 + eps * (1 - n)
    if den <= 0:
        return {"existe": False,
                "motivo": "2 + ε(1 − n) ≤ 0: el precio de equilibrio no es positivo."}
    p = (a + c) / den
    y = a + (eps * (n - 1) - 1) * p
    return {"existe": True, "p": p, "y_i": y, "beneficio_i": (p - c) * y}


def cournot_friedman(n: int, a_fijo: float) -> dict:
    """Ej. 1 (Friedman, 1983): c_i = a + 5q + q², p = 100 − 0.1Q.

    Beneficio correcto: Π_i = 1.1·q_i² − a = 110·[95/(21+n)]² − a. El libro
    escribe 11·[95/(21+n)]², que es 10 veces menor.
    """
    if n < 1 or int(n) != n:
        raise ErrorParametro("n debe ser un entero ≥ 1.")
    no_negativo("a", a_fijo)
    q = 950 / (21 + n)
    Q = n * q
    p = 100 - 0.1 * Q
    Pi = p * q - a_fijo - 5 * q - q * q
    n_max = 950 * math.sqrt(1.1 / a_fijo) - 21 if a_fijo > 0 else math.inf
    return {"q_i": q, "Q": Q, "p": p, "beneficio_i": Pi,
            "beneficio_libro": 11 * (95 / (21 + n)) ** 2 - a_fijo,
            "n_max_beneficio_no_negativo": n_max}


def competencia_monopolistica_cp(A, cT) -> dict:
    """Ej. 2 sem. 11: demanda Q = A − P, CT = Q² − 4Q + 5 (coeficientes en cT)."""
    positivo("A", A)
    c2, c1, c0 = cT
    Q = (A - c1) / (2 + 2 * c2)
    P = A - Q
    cme = c2 * Q + c1 + c0 / Q
    return {"Q": Q, "P": P, "CMe": cme, "beneficio": Q * (P - cme)}


# ---------------------------------------------------------------- concentración
def hhi(cuotas, escala: str = "unitaria") -> float:
    s = [float(v) for v in cuotas]
    if any(v < 0 for v in s):
        raise ErrorParametro("Las cuotas no pueden ser negativas.")
    tot = sum(s)
    if tot <= 0:
        raise ErrorParametro("Las cuotas deben sumar más que cero.")
    if abs(tot - 1) > 1e-6 and abs(tot - 100) > 1e-4:
        raise ErrorParametro(f"Las cuotas deben sumar 1 (o 100 %). Suman {tot:.4g}.")
    s = [v / tot for v in s]
    h = sum(v * v for v in s)
    return h * 10_000 if escala == "10000" else h


def cr(cuotas, r: int) -> float:
    """Razón de concentración: suma de las r cuotas MÁS GRANDES (ordenadas)."""
    if r < 1:
        raise ErrorParametro("r debe ser ≥ 1.")
    s = sorted((float(v) for v in cuotas), reverse=True)
    return sum(s[:r])


def clasificar_hhi(h10000: float) -> str:
    """Umbrales citados en el libro (escala 0-10 000)."""
    if h10000 < 1500:
        return "no_concentrado"
    if h10000 <= 2500:
        return "moderadamente_concentrado"
    return "altamente_concentrado"
