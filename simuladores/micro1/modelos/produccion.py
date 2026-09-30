"""Simulador 6 — Tecnología y maximización del beneficio.

Referencia: Monsalve (2017), semana 5 (ej. 2 rendimientos a escala, ej. 3-6
maximización del beneficio) y semana 7 ej. 3 (tecnología cúbica).

Cada tecnología F(x, y) expone:
    F, pmg (PMg_x, PMg_y), pme, tmst, grado_homogeneidad, rendimientos,
    elasticidad_sustitucion y, cuando existe, max_beneficio(p, w1, w2).
"""
from __future__ import annotations

import math
from dataclasses import dataclass

from ._comun import ErrorParametro, no_negativo, positivo


def clasificar_rendimientos(grado: float, tol: float = 1e-12) -> str:
    if abs(grado - 1) <= tol:
        return "constantes"
    return "crecientes" if grado > 1 else "decrecientes"


class Tecnologia:
    nombre = "tecnología"
    latex = ""

    def pme(self, x, y):
        """Productos medios (PMe_x, PMe_y)."""
        q = self.F(x, y)
        return (q / x if x > 0 else math.nan, q / y if y > 0 else math.nan)

    def tmst(self, x, y):
        g = self.pmg(x, y)
        if g is None:
            return None
        return math.inf if g[1] == 0 else g[0] / g[1]

    def rendimientos(self, x=1.0, y=1.0, t=2.0):
        """Clasificación numérica comparando F(tx, ty) con t·F(x, y)."""
        base = self.F(x, y)
        g = math.log(self.F(t * x, t * y) / base) / math.log(t)
        return {"grado_local": g, "tipo": clasificar_rendimientos(round(g, 10))}

    def isocuanta(self, q0, x):  # pragma: no cover - interfaz
        raise NotImplementedError


@dataclass
class CobbDouglasP(Tecnologia):
    """F = A·x^α·y^β (ej. 2f)."""
    A: float = 1.0
    alpha: float = 0.5
    beta: float = 0.25
    nombre = "Cobb-Douglas"
    latex = r"F(x,y)=A\,x^{\alpha}y^{\beta}"

    def __post_init__(self):
        positivo("A", self.A); positivo("α", self.alpha); positivo("β", self.beta)

    def F(self, x, y):
        if x <= 0 or y <= 0:
            return 0.0
        return self.A * x ** self.alpha * y ** self.beta

    def pmg(self, x, y):
        q = self.F(x, y)
        return (self.alpha * q / x, self.beta * q / y)

    def isocuanta(self, q0, x):
        return (q0 / (self.A * x ** self.alpha)) ** (1 / self.beta) if x > 0 else math.nan

    @property
    def grado_homogeneidad(self):
        return self.alpha + self.beta

    def elasticidad_sustitucion(self, x=1.0, y=1.0):
        return 1.0

    def max_beneficio(self, p, w1, w2):
        """Ej. 5, semana 5. Sólo existe máximo interior si α + β < 1."""
        positivo("p", p); positivo("w1", w1); positivo("w2", w2)
        a, b, A = self.alpha, self.beta, self.A
        s = a + b
        if s >= 1:
            return {"existe": False,
                    "motivo": ("Con rendimientos constantes o crecientes a escala el "
                               "beneficio no tiene máximo interior (se hace cero o infinito).")}
        k = 1 / (1 - s)
        pA = p * A
        x = (pA ** k) / ((w1 / a) ** ((1 - b) * k) * (w2 / b) ** (b * k))
        y = (pA ** k) / ((w1 / a) ** (a * k) * (w2 / b) ** ((1 - a) * k))
        z = self.F(x, y)
        return {"existe": True, "x": x, "y": y, "z": z,
                "beneficio": p * z - w1 * x - w2 * y}


@dataclass
class LeontiefP(Tecnologia):
    """F = Mín{x/a, y/b} (ej. 2d)."""
    a: float = 1.0
    b: float = 1.0
    nombre = "Leontief (proporciones fijas)"
    latex = r"F(x,y)=\min\{x/a,\;y/b\}"
    grado_homogeneidad = 1.0

    def __post_init__(self):
        positivo("a", self.a); positivo("b", self.b)

    def F(self, x, y):
        return min(x / self.a, y / self.b)

    def pmg(self, x, y):
        return None

    def isocuanta(self, q0, x):
        return q0 * self.b if x >= q0 * self.a else math.nan

    def elasticidad_sustitucion(self, x=1.0, y=1.0):
        return 0.0


@dataclass
class LinealP(Tecnologia):
    """F = a·x + b·y (insumos sustitutos perfectos)."""
    a: float = 1.0
    b: float = 1.0
    nombre = "Lineal (sustitutos perfectos)"
    latex = r"F(x,y)=ax+by"
    grado_homogeneidad = 1.0

    def __post_init__(self):
        positivo("a", self.a); positivo("b", self.b)

    def F(self, x, y):
        return self.a * x + self.b * y

    def pmg(self, x, y):
        return (self.a, self.b)

    def isocuanta(self, q0, x):
        y = (q0 - self.a * x) / self.b
        return y if y >= 0 else math.nan

    def elasticidad_sustitucion(self, x=1.0, y=1.0):
        return math.inf


@dataclass
class SeparableP(Tecnologia):
    """F = √x + √y (ej. 2e, 6)."""
    nombre = "Separable √x + √y"
    latex = r"F(x,y)=\sqrt{x}+\sqrt{y}"
    grado_homogeneidad = 0.5

    def F(self, x, y):
        return math.sqrt(max(x, 0)) + math.sqrt(max(y, 0))

    def pmg(self, x, y):
        return (0.5 / math.sqrt(x) if x > 0 else math.inf,
                0.5 / math.sqrt(y) if y > 0 else math.inf)

    def isocuanta(self, q0, x):
        r = q0 - math.sqrt(x)
        return r * r if r >= 0 else math.nan

    def elasticidad_sustitucion(self, x=1.0, y=1.0):
        # σ = −d ln(y/x) / d ln(TMST); con TMST = √(y/x) ⇒ σ = 2.
        return 2.0

    def max_beneficio(self, p, w1, w2):
        positivo("p", p); positivo("w1", w1); positivo("w2", w2)
        x = p * p / (2 * w1) ** 2
        y = p * p / (2 * w2) ** 2
        z = self.F(x, y)
        return {"existe": True, "x": x, "y": y, "z": z,
                "beneficio": p * z - w1 * x - w2 * y}


@dataclass
class CES(Tecnologia):
    """F = A·[δ·x^ρ + (1−δ)·y^ρ]^(ν/ρ), ρ < 1, ρ ≠ 0 (ej. 2g con A=1, δ=½, ν=1).

    σ = 1/(1 − ρ). ρ→0 Cobb-Douglas; ρ→1 lineal; ρ→−∞ Leontief.
    """
    A: float = 1.0
    rho: float = 0.5
    delta: float = 0.5
    nu: float = 1.0
    nombre = "CES"
    latex = r"F(x,y)=A\left[\delta x^{\rho}+(1-\delta)y^{\rho}\right]^{\nu/\rho}"

    def __post_init__(self):
        positivo("A", self.A); positivo("ν", self.nu)
        if not (0 < self.delta < 1):
            raise ErrorParametro("δ debe estar en (0, 1).")
        if self.rho >= 1 or self.rho == 0:
            raise ErrorParametro("ρ debe ser < 1 y distinto de 0 (ρ→0 es Cobb-Douglas).")

    def F(self, x, y):
        if x <= 0 or y <= 0:
            if self.rho < 0:
                return 0.0
        x, y = max(x, 0.0), max(y, 0.0)
        s = self.delta * x ** self.rho + (1 - self.delta) * y ** self.rho
        return self.A * s ** (self.nu / self.rho)

    def pmg(self, x, y):
        q = self.F(x, y)
        s = self.delta * x ** self.rho + (1 - self.delta) * y ** self.rho
        c = self.nu * q / s
        return (c * self.delta * x ** (self.rho - 1),
                c * (1 - self.delta) * y ** (self.rho - 1))

    def isocuanta(self, q0, x):
        r = ((q0 / self.A) ** (self.rho / self.nu) - self.delta * x ** self.rho) / (1 - self.delta)
        return r ** (1 / self.rho) if r > 0 else math.nan

    @property
    def grado_homogeneidad(self):
        return self.nu

    def elasticidad_sustitucion(self, x=1.0, y=1.0):
        return 1 / (1 - self.rho)


# ---------------------------------------------------------------- un solo insumo
def max_beneficio_un_insumo(alpha: float, p: float, w: float) -> dict:
    """f(L) = L^α, 0<α<1 (ej. 4 semana 5): L* = (pα/w)^{1/(1−α)}."""
    if not (0 < alpha < 1):
        raise ErrorParametro("Se requiere 0 < α < 1 (rendimientos decrecientes).")
    positivo("p", p); positivo("w", w)
    L = (p * alpha / w) ** (1 / (1 - alpha))
    y = L ** alpha
    return {"L": L, "y": y, "beneficio": p * y - w * L,
            "salario_real": w / p, "pmg_optimo": alpha * L ** (alpha - 1)}


def etapas_produccion(f, L_max: float, n: int = 4000) -> dict:
    """Ubica el máximo del PMe (fin de etapa I) y PMg = 0 (fin de etapa II)."""
    positivo("L_max", L_max)
    hs = L_max / n
    Ls = [hs * (i + 1) for i in range(n)]
    pme = [f(L) / L for L in Ls]
    i_pme = max(range(n), key=lambda i: pme[i])
    pmg = [(f(L + hs / 2) - f(L - hs / 2)) / hs for L in Ls]
    fin_II = next((Ls[i] for i in range(1, n) if pmg[i - 1] > 0 >= pmg[i]), None)
    return {"L_pme_max": Ls[i_pme], "pme_max": pme[i_pme], "L_pmg_cero": fin_II}


def cubica_monsalve(x: float) -> float:
    """f(x) = x³ − 3x² + 3x = (x − 1)³ + 1 (ej. 3, semana 7)."""
    no_negativo("x", x)
    return (x - 1) ** 3 + 1
