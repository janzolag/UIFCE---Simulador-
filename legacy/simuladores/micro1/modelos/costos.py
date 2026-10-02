"""Simulador 7 — Costos de largo y corto plazo.

Referencia: Monsalve (2017), semana 6 (minimización del costo de largo plazo,
ej. 1-6) y semana 7 (costos de corto plazo, ej. 1-3; sección 7.6).
"""
from __future__ import annotations

import math

from ._comun import ErrorParametro, no_negativo, positivo
from .produccion import CobbDouglasP, LeontiefP, LinealP, SeparableP


# ================================================================ LARGO PLAZO
def demandas_condicionadas(tec, w1: float, w2: float, z: float) -> dict:
    """Minimiza w1·x + w2·y  s.a. F(x, y) = z."""
    positivo("w1", w1); positivo("w2", w2); no_negativo("z", z)
    if isinstance(tec, CobbDouglasP):
        a, b, A = tec.alpha, tec.beta, tec.A
        s = a + b
        zz = z / A                                   # ej. 11: z → z/A
        x = (a * w2 / (b * w1)) ** (b / s) * zz ** (1 / s)
        y = (b * w1 / (a * w2)) ** (a / s) * zz ** (1 / s)
        tipo = "interior"
    elif isinstance(tec, SeparableP):
        x = (w2 * z / (w1 + w2)) ** 2
        y = (w1 * z / (w1 + w2)) ** 2
        tipo = "interior"
    elif isinstance(tec, LeontiefP):
        x, y = tec.a * z, tec.b * z
        tipo = "vertice"
    elif isinstance(tec, LinealP):
        c1, c2 = w1 / tec.a, w2 / tec.b
        if abs(c1 - c2) <= 1e-12 * max(c1, c2):
            x, y, tipo = z / (2 * tec.a), z / (2 * tec.b), "indeterminado"
        elif c1 < c2:
            x, y, tipo = z / tec.a, 0.0, "esquina_x"
        else:
            x, y, tipo = 0.0, z / tec.b, "esquina_y"
    else:
        raise ErrorParametro(f"Tecnología no soportada: {type(tec).__name__}")
    return {"x": x, "y": y, "costo": w1 * x + w2 * y, "tipo": tipo}


def costo_lp(tec, w1: float, w2: float, z: float) -> float:
    return demandas_condicionadas(tec, w1, w2, z)["costo"]


def constante_B_cd(alpha, beta, w1, w2):
    """B de C(z) = B·z^{1/(α+β)} (ej. 1, semana 6)."""
    s = alpha + beta
    return (w1 * (alpha * w2 / (beta * w1)) ** (beta / s)
            + w2 * (beta * w1 / (alpha * w2)) ** (alpha / s))


def curvas_lp(tec, w1, w2, z, h=1e-6) -> dict:
    C = costo_lp(tec, w1, w2, z)
    cmg = (costo_lp(tec, w1, w2, z + h) - costo_lp(tec, w1, w2, max(z - h, 0))) / (
        z + h - max(z - h, 0))
    return {"CT": C, "CMe": C / z if z > 0 else math.nan, "CMg": cmg}


def oferta_lp(tec, p, w1, w2) -> dict:
    """p = C'(z) (sección 6.4). Sólo tiene solución con costo estrictamente convexo."""
    positivo("p", p)
    if isinstance(tec, CobbDouglasP):
        s = tec.alpha + tec.beta
        if s >= 1:
            return {"existe": False, "motivo": "C(z) no es estrictamente convexa (α+β ≥ 1)."}
        B = constante_B_cd(tec.alpha, tec.beta, w1, w2)
        # Ej. 7 (A=1). Con A ≠ 1 (ej. 11) la regla de la cadena en C(z)=B(z/A)^{1/s}
        # deja un A dentro del paréntesis: z = A·(s·A·p/B)^{s/(1−s)}. El libro lo omite.
        z = tec.A * (s * tec.A * p / B) ** (s / (1 - s))
    elif isinstance(tec, SeparableP):
        B = w1 * w2 / (w1 + w2)
        z = p / (2 * B)                                    # ej. 8
    else:
        return {"existe": False, "motivo": "Costo lineal: oferta 0, indeterminada o infinita."}
    return {"existe": True, "z": z, "beneficio": p * z - costo_lp(tec, w1, w2, z)}


def costo_rendimientos_crecientes(w1, w2, z) -> dict:
    """F = y·e^x (ej. 4, semana 6): x* = ln(w2 z / w1), y* = w1/w2, si z > w1/w2."""
    positivo("w1", w1); positivo("w2", w2); positivo("z", z)
    if z <= w1 / w2:
        raise ErrorParametro("La solución interior exige z > w1/w2.")
    x = math.log(w2 * z / w1)
    y = w1 / w2
    return {"x": x, "y": y, "costo": w1 * x + w2 * y}


def dos_plantas(c1: float, c2: float, Y: float, exponente: float) -> dict:
    """Minimiza c1·y1^k + c2·y2^k  s.a. y1 + y2 = Y (ej. 6, semana 6).

    k > 1 (rendimientos decrecientes): se reparte, más en la planta barata.
    k < 1 (rendimientos crecientes): todo en la planta de menor costo.
    """
    positivo("c1", c1); positivo("c2", c2); no_negativo("Y", Y)
    k = positivo("exponente", exponente)
    if k > 1:
        r = (c1 / c2) ** (1 / (k - 1))                  # y2 / y1
        y1 = Y / (1 + r)
        y2 = Y - y1
    elif k < 1:
        y1, y2 = (Y, 0.0) if c1 < c2 else (0.0, Y)
    else:
        y1, y2 = (Y, 0.0) if c1 < c2 else (0.0, Y) if c2 < c1 else (Y / 2, Y / 2)
    return {"y1": y1, "y2": y2, "costo": c1 * y1 ** k + c2 * y2 ** k}


# ================================================================ CORTO PLAZO
def costo_cp_cobb_douglas(alpha, beta, w1, w2, k, y) -> dict:
    """F = x^α·k^β con k fijo (ej. 1, semana 7)."""
    positivo("α", alpha); positivo("β", beta); positivo("w1", w1)
    no_negativo("w2", w2); positivo("k", k); no_negativo("y", y)
    x = y ** (1 / alpha) / k ** (beta / alpha)
    CV = w1 * x
    CF = w2 * k
    cmg = (w1 / (alpha * k ** (beta / alpha))) * y ** ((1 - alpha) / alpha)
    return _curvas(CV, CF, cmg, y) | {"x": x}


def costo_cp_separable(w1, w2, k, y) -> dict:
    """F = √x + √k (ej. 2, semana 7): sólo definido para y ≥ √k."""
    positivo("w1", w1); no_negativo("w2", w2); positivo("k", k)
    if y < math.sqrt(k):
        raise ErrorParametro(f"Con k={k} la producción mínima es √k = {math.sqrt(k):.4g}.")
    x = (y - math.sqrt(k)) ** 2
    return _curvas(w1 * x, w2 * k, 2 * w1 * (y - math.sqrt(k)), y) | {"x": x}


def costo_cp_cubica(w1, w2, k, y) -> dict:
    """f(x) = (x−1)³ + 1 (ej. 3, semana 7): C = w1·(y−1)^{1/3} + w1 + w2·k."""
    positivo("w1", w1); no_negativo("w2", w2); no_negativo("k", k); no_negativo("y", y)
    x = math.copysign(abs(y - 1) ** (1 / 3), y - 1) + 1
    cmg = math.inf if y == 1 else (w1 / 3) * abs(y - 1) ** (-2 / 3)
    return _curvas(w1 * x, w2 * k, cmg, y) | {"x": x}


def _curvas(CV, CF, CMg, y):
    return {"CT": CV + CF, "CV": CV, "CF": CF, "CMg": CMg,
            "CMe": (CV + CF) / y if y > 0 else math.inf,
            "CVMe": CV / y if y > 0 else math.nan,
            "CFMe": CF / y if y > 0 else math.inf}


# ---------------------------------------------------------------- costo cúbico
class CostoCubico:
    """C(q) = CF + a·q − b·q² + c·q³ — la forma "de libro de texto" con CMg en U.

    Se exige a > 0, b ≥ 0, c > 0 y b² < 3ac para que el CMg sea siempre positivo.
    """

    def __init__(self, CF: float, a: float, b: float, c: float):
        self.CF = no_negativo("CF", CF)
        self.a = positivo("a", a)
        self.b = no_negativo("b", b)
        self.c = positivo("c", c)
        if b * b >= 3 * a * c:
            raise ErrorParametro("Se requiere b² < 3ac para que el costo marginal sea positivo.")

    def CV(self, q):
        return self.a * q - self.b * q ** 2 + self.c * q ** 3

    def CT(self, q):
        return self.CF + self.CV(q)

    def CMg(self, q):
        return self.a - 2 * self.b * q + 3 * self.c * q ** 2

    def CVMe(self, q):
        return self.a - self.b * q + self.c * q ** 2

    def CMe(self, q):
        return self.CVMe(q) + (self.CF / q if q > 0 else math.inf)

    def q_min_cvme(self):
        return self.b / (2 * self.c)

    def q_min_cmg(self):
        return self.b / (3 * self.c)

    def q_min_cme(self):
        """Resuelve CMg = CMe  ⇔  2c·q³ − b·q² − CF = 0 (raíz positiva única)."""
        if self.CF == 0:
            return self.q_min_cvme()
        lo, hi = 0.0, max(1.0, self.q_min_cvme())
        g = lambda q: 2 * self.c * q ** 3 - self.b * q ** 2 - self.CF
        while g(hi) < 0:
            hi *= 2
        for _ in range(200):
            m = (lo + hi) / 2
            lo, hi = (m, hi) if g(m) < 0 else (lo, m)
        return (lo + hi) / 2

    def precio_cierre(self):
        return self.CVMe(self.q_min_cvme())

    def precio_nivelacion(self):
        return self.CMe(self.q_min_cme())
