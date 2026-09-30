"""Simulador 8 — Competencia perfecta: oferta de la empresa y equilibrio parcial.

Referencia: Monsalve (2017), semana 7 (secciones 7.6-7.9: oferta discontinua,
libre entrada, elasticidad de la oferta) y semana 8 (tijera de Marshall, ej. 1-6,
modelo de la telaraña).
"""
from __future__ import annotations

import math

from ._comun import ErrorParametro, no_negativo, positivo
from .costos import CostoCubico


# ---------------------------------------------------------------- empresa
def oferta_empresa_cubica(costo: CostoCubico, p: float, plazo: str = "corto") -> dict:
    """Oferta precio-aceptante: p = CMg en el tramo creciente, con cierre.

    corto plazo: produce si p ≥ mín CVMe (punto de cierre).
    largo plazo: produce si p ≥ mín CMe (punto de nivelación; todo costo es evitable).
    """
    no_negativo("p", p)
    umbral = costo.precio_cierre() if plazo == "corto" else costo.precio_nivelacion()
    if p < umbral - 1e-12:
        q = 0.0
    else:
        # Raíz mayor de 3c q² − 2b q + (a − p) = 0 (tramo creciente del CMg).
        a, b, c = costo.a, costo.b, costo.c
        disc = 4 * b * b - 12 * c * (a - p)
        q = (2 * b + math.sqrt(max(disc, 0.0))) / (6 * c)
    benef = p * q - costo.CT(q) if q > 0 else -costo.CF if plazo == "corto" else 0.0
    return {"q": q, "beneficio": benef, "umbral": umbral,
            "precio_cierre": costo.precio_cierre(),
            "precio_nivelacion": costo.precio_nivelacion(),
            "zona": _zona(p, costo)}


def _zona(p, costo):
    if p < costo.precio_cierre():
        return "cierra"
    if p < costo.precio_nivelacion():
        return "opera_con_perdidas"
    if abs(p - costo.precio_nivelacion()) < 1e-9:
        return "beneficio_cero"
    return "beneficio_positivo"


def oferta_cp_cobb_douglas_monsalve(w1: float, w2: float, k: float, p: float) -> dict:
    """Sección 7.6: C(y) = (w1/k)·y² + w2·k (α = β = ½, k fijo).

    El libro define la oferta con umbral en el CMe mínimo p* = 2√(w1 w2)
    (beneficio no negativo). Con el criterio estándar de corto plazo
    (cubrir el costo variable) el umbral sería mín CVMe = 0.
    """
    positivo("w1", w1); positivo("w2", w2); positivo("k", k); no_negativo("p", p)
    p_estrella = 2 * math.sqrt(w1 * w2)
    y_estrella = math.sqrt(w2 / w1) * k
    y = k * p / (2 * w1) if p >= p_estrella else 0.0
    return {"y": y, "p_umbral_libro": p_estrella, "y_umbral": y_estrella,
            "y_criterio_cvme": k * p / (2 * w1),
            "beneficio": p * y - (w1 / k) * y * y - w2 * k}


# ---------------------------------------------------------------- mercado lineal
def equilibrio_lineal(a: float, b: float, c: float, d: float) -> dict:
    """Demanda X = a − b·p, oferta Y = c + d·p (Monsalve, ej. 2 semana 8).

    Se admite c ≤ 0 (la oferta empieza en p = −c/d). Requiere a·d + b·c > 0.
    """
    positivo("a", a); positivo("b", b); positivo("d", d)
    if a * d + b * c <= 0:
        raise ErrorParametro("Sin equilibrio con cantidad positiva: se requiere a·d + b·c > 0.")
    p = (a - c) / (b + d)
    q = (a * d + b * c) / (b + d)
    p_max_dem = a / b
    p_min_of = max(-c / d, 0.0)
    ec = 0.5 * q * (p_max_dem - p)
    # Excedente del productor: área entre p y la oferta inversa desde 0 hasta q.
    ep = _ep_lineal(c, d, p, q) if c >= 0 else 0.5 * q * (p - p_min_of)
    return {"p": p, "q": q, "EC": ec, "EP": ep, "ET": ec + ep,
            "elasticidad_demanda": -b * p / q, "elasticidad_oferta": d * p / q}


def _ep_lineal(c, d, p, q):
    # Oferta inversa p_s(Y) = (Y − c)/d para Y ≥ c; para 0 ≤ Y < c el precio de
    # reserva es 0 (se ofrece c incluso gratis).
    return p * q - 0.5 * (q - c) ** 2 / d


def equilibrio_con_impuesto(a, b, c, d, t: float) -> dict:
    """Impuesto específico t cobrado al vendedor: Y = c + d·(p − t)."""
    no_negativo("t", t)
    base = equilibrio_lineal(a, b, c, d)
    pc = (a - c + d * t) / (b + d)
    pv = pc - t
    q = a - b * pc
    if q <= 0:                       # impuesto prohibitivo: el mercado desaparece
        return {"p_consumidor": a / b, "p_vendedor": a / b - t, "q": 0.0,
                "recaudo": 0.0, "carga_consumidor": math.nan,
                "perdida_eficiencia": base["ET"], "prohibitivo": True}
    return {"p_consumidor": pc, "p_vendedor": pv, "q": q, "recaudo": t * q,
            "carga_consumidor": (pc - base["p"]) / t if t > 0 else math.nan,
            "perdida_eficiencia": 0.5 * t * (base["q"] - q)}


# ---------------------------------------------------------------- agregación
def equilibrio_n_empresas_cubicas(a: float, b: float, costo: CostoCubico, n: int) -> dict:
    """n empresas idénticas con costo cúbico frente a demanda X = a − b·p."""
    if n < 1 or int(n) != n:
        raise ErrorParametro("n debe ser un entero ≥ 1.")
    positivo("a", a); positivo("b", b)
    exceso = lambda p: n * oferta_empresa_cubica(costo, p)["q"] - max(a - b * p, 0.0)
    lo, hi = 0.0, a / b
    if exceso(hi) < 0:
        raise ErrorParametro("La oferta no alcanza la demanda ni al precio máximo.")
    for _ in range(200):
        m = (lo + hi) / 2
        lo, hi = (m, hi) if exceso(m) < 0 else (lo, m)
    p = hi
    q_i = oferta_empresa_cubica(costo, p)["q"]
    return {"p": p, "q_empresa": q_i, "Q": n * q_i,
            "beneficio_empresa": p * q_i - costo.CT(q_i)}


def n_libre_entrada(a: float, b: float, costo: CostoCubico) -> dict:
    """Largo plazo: p = mín CMe; n = X(p)/q_eme (el "número entero" de Pignol)."""
    p = costo.precio_nivelacion()
    q = costo.q_min_cme()
    X = a - b * p
    if X <= 0:
        raise ErrorParametro("La demanda es nula al precio de nivelación: no entra nadie.")
    n = X / q
    return {"p": p, "q_empresa": q, "Q": X, "n": n, "n_entero": math.floor(n),
            "es_entero": abs(n - round(n)) < 1e-9}


def representativo_monsalve(w: float, A: float) -> dict:
    """Ej. 3-4 semana 8: U = √x + y y C(x) = w x²/A²."""
    positivo("w", w); positivo("A", A)
    p = (w / (2 * A * A)) ** (1 / 3)
    x = (A / (2 * math.sqrt(w))) ** (4 / 3)
    return {"p": p, "x": x, "beneficio": p * x - w * x * x / (A * A)}


# ---------------------------------------------------------------- telaraña
def telarana(a, b, c, d, P0: float, T: int = 30) -> dict:
    """P_{t+1} = (a − c)/b − (d/b)·P_t (sección 8.8, ej. 6)."""
    positivo("a", a); positivo("b", b); positivo("d", d)
    if T < 1:
        raise ErrorParametro("T debe ser ≥ 1.")
    pe = (a - c) / (b + d)
    precios = [P0]
    for _ in range(T):
        precios.append((a - c) / b - (d / b) * precios[-1])
    r = d / b
    tipo = ("asintoticamente_estable" if r < 1 else
            "oscilacion_perpetua" if abs(r - 1) < 1e-12 else "inestable")
    return {"precios": precios, "p_equilibrio": pe, "razon": r, "tipo": tipo,
            "solucion_cerrada": lambda t: (-r) ** t * (P0 - pe) + pe}
