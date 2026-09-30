"""Simuladores 2 y 3 — Preferencias (curvas de indiferencia) y elección óptima.

Referencia: Monsalve (2017), Vol. I, semanas 1 y 2.

Cada familia de utilidad expone la misma interfaz, de modo que los simuladores
de Dash (preferencias, elección óptima, Slutsky, demanda) pueden usarlas sin
conocer su forma funcional:

    U(x, y)                 utilidad
    umg(x, y)               (UMg_x, UMg_y) o None si no es diferenciable
    tms(x, y)               tasa marginal de sustitución UMg_x / UMg_y
    curva_indiferencia(U0, x)  y tal que U(x, y) = U0 (NaN si no existe)
    marshall(p1, p2, M)     demandas marshallianas + tipo de solución
    indirecta(p1, p2, M)    V(p, M)
    gasto(p1, p2, U0)       e(p, U0)
    hicks(p1, p2, U0)       (h1, h2)
    propiedades             dict declarativo (monótona, convexa, homotética…)
"""
from __future__ import annotations

import math
from dataclasses import dataclass

from ._comun import ErrorParametro, no_negativo, positivo

NAN = float("nan")


def _validar_precios(p1, p2, M=None):
    positivo("p1", p1); positivo("p2", p2)
    if M is not None:
        no_negativo("M", M)


def _sol(x, y, tipo="interior", **extra):
    d = {"x": float(x), "y": float(y), "tipo": tipo}
    d.update(extra)
    return d


class Utilidad:
    nombre = "utilidad"
    latex = ""
    propiedades: dict = {}

    def U(self, x, y):  # pragma: no cover - interfaz
        raise NotImplementedError

    def umg(self, x, y):
        return None

    def tms(self, x, y):
        g = self.umg(x, y)
        if g is None:
            return None
        if g[1] == 0:
            return math.inf
        return g[0] / g[1]

    def eleccion_optima(self, p1, p2, M):
        """Resumen para el simulador 3: canasta, utilidad y condición de Jevons."""
        s = self.marshall(p1, p2, M)
        s = dict(s)
        s["utilidad"] = self.U(s["x"], s["y"])
        s["precio_relativo"] = p1 / p2
        s["tms"] = self.tms(s["x"], s["y"]) if s["tipo"] == "interior" else None
        s["gasto"] = p1 * s["x"] + p2 * s["y"]
        return s


# ---------------------------------------------------------------- Cobb-Douglas
@dataclass
class CobbDouglas(Utilidad):
    """U = x^α · y^β   (Monsalve, ej. 1a, 3, 6; semana 2 ej. 1-3)."""
    alpha: float = 1.0
    beta: float = 1.0
    nombre = "Cobb-Douglas"
    latex = r"U(x,y)=x^{\alpha}y^{\beta}"
    propiedades = {"monotona": True, "convexa": True, "homotetica": True,
                   "diferenciable": True}

    def __post_init__(self):
        positivo("α", self.alpha); positivo("β", self.beta)

    def U(self, x, y):
        if x <= 0 or y <= 0:
            return 0.0
        return x ** self.alpha * y ** self.beta

    def umg(self, x, y):
        if x <= 0 or y <= 0:
            return None          # en los ejes la TMS de Cobb-Douglas no está definida
        u = self.U(x, y)
        return (self.alpha * u / x, self.beta * u / y)

    def curva_indiferencia(self, U0, x):
        if x <= 0 or U0 <= 0:
            return NAN
        return (U0 / x ** self.alpha) ** (1 / self.beta)

    def marshall(self, p1, p2, M):
        _validar_precios(p1, p2, M)
        s = self.alpha + self.beta
        return _sol(self.alpha * M / (s * p1), self.beta * M / (s * p2))

    def indirecta(self, p1, p2, M):
        d = self.marshall(p1, p2, M)
        return self.U(d["x"], d["y"])

    def gasto(self, p1, p2, U0):
        _validar_precios(p1, p2); no_negativo("U0", U0)
        a, b = self.alpha, self.beta
        return (a + b) * (U0 * (p1 / a) ** a * (p2 / b) ** b) ** (1 / (a + b))

    def hicks(self, p1, p2, U0):
        e = self.gasto(p1, p2, U0)
        s = self.alpha + self.beta
        return (self.alpha * e / (s * p1), self.beta * e / (s * p2))


# ---------------------------------------------------------------- Leontief
@dataclass
class Leontief(Utilidad):
    """U = Mín{a·x, b·y}   (Monsalve, ej. 1b, 4; semana 2 ej. 6)."""
    a: float = 1.0
    b: float = 1.0
    nombre = "Leontief (complementarios perfectos)"
    latex = r"U(x,y)=\min\{ax,\;by\}"
    propiedades = {"monotona": False, "convexa": True, "homotetica": True,
                   "diferenciable": False}   # monótona débil (nota 6 del libro)

    def __post_init__(self):
        positivo("a", self.a); positivo("b", self.b)

    def U(self, x, y):
        return min(self.a * x, self.b * y)

    def curva_indiferencia(self, U0, x):
        # La "escuadra": para x > U0/a la curva es horizontal en y = U0/b.
        if x < U0 / self.a - 1e-12:
            return NAN
        if abs(x - U0 / self.a) <= 1e-12:
            return math.inf       # tramo vertical
        return U0 / self.b

    def marshall(self, p1, p2, M):
        _validar_precios(p1, p2, M)
        den = self.b * p1 + self.a * p2
        return _sol(self.b * M / den, self.a * M / den, tipo="vertice")

    def indirecta(self, p1, p2, M):
        _validar_precios(p1, p2, M)
        return self.a * self.b * M / (self.b * p1 + self.a * p2)

    def gasto(self, p1, p2, U0):
        _validar_precios(p1, p2); no_negativo("U0", U0)
        return U0 * (p1 / self.a + p2 / self.b)

    def hicks(self, p1, p2, U0):
        _validar_precios(p1, p2)
        return (U0 / self.a, U0 / self.b)


# ---------------------------------------------------------------- Lineal
@dataclass
class Lineal(Utilidad):
    """U = a·x + b·y — sustitutos perfectos (Monsalve, ej. 1c, 5; semana 2 ej. 7)."""
    a: float = 1.0
    b: float = 1.0
    nombre = "Lineal (sustitutos perfectos)"
    latex = r"U(x,y)=ax+by"
    propiedades = {"monotona": True, "convexa": True, "homotetica": True,
                   "diferenciable": True, "estrictamente_convexa": False}

    def __post_init__(self):
        positivo("a", self.a); positivo("b", self.b)

    def U(self, x, y):
        return self.a * x + self.b * y

    def umg(self, x, y):
        return (self.a, self.b)

    def curva_indiferencia(self, U0, x):
        y = (U0 - self.a * x) / self.b
        return y if y >= -1e-12 else NAN

    def marshall(self, p1, p2, M):
        _validar_precios(p1, p2, M)
        r1, r2 = self.a / p1, self.b / p2          # utilidad por peso
        if abs(r1 - r2) <= 1e-12 * max(r1, r2):
            # Cualquier canasta de la recta es óptima (intervalo [0, M/p1]).
            return _sol(M / (2 * p1), M / (2 * p2), tipo="indeterminado",
                        x_min=0.0, x_max=M / p1)
        if r1 > r2:
            return _sol(M / p1, 0.0, tipo="esquina_x")
        return _sol(0.0, M / p2, tipo="esquina_y")

    def indirecta(self, p1, p2, M):
        _validar_precios(p1, p2, M)
        return M * max(self.a / p1, self.b / p2)

    def gasto(self, p1, p2, U0):
        _validar_precios(p1, p2); no_negativo("U0", U0)
        return U0 * min(p1 / self.a, p2 / self.b)

    def hicks(self, p1, p2, U0):
        _validar_precios(p1, p2)
        r1, r2 = p1 / self.a, p2 / self.b
        if abs(r1 - r2) <= 1e-12 * max(r1, r2):
            return (U0 / (2 * self.a), U0 / (2 * self.b))   # representante del intervalo
        return (U0 / self.a, 0.0) if r1 < r2 else (0.0, U0 / self.b)


# ---------------------------------------------------------------- Cuasilineales
class _Cuasilineal(Utilidad):
    """U = v(x) + y. La y es "dinero" (Monsalve, sección 1.7).

    Solución interior sólo si el presupuesto es suficiente: M ≥ p1·x̂ (nota 16 y
    figura 2.4 del libro). En otro caso, esquina x = M/p1, y = 0.
    """
    propiedades = {"monotona": True, "convexa": True, "homotetica": False,
                   "diferenciable": True, "efecto_ingreso_x_nulo": True}

    # Las subclases definen v, vp (v'), vp_inv ((v')^{-1}) y v_inv.
    def U(self, x, y):
        return self.v(x) + y

    def umg(self, x, y):
        return (self.vp(x), 1.0)

    def curva_indiferencia(self, U0, x):
        return U0 - self.v(x)

    def x_interior(self, p1, p2):
        return self.vp_inv(p1 / p2)

    def marshall(self, p1, p2, M):
        _validar_precios(p1, p2, M)
        xh = self.x_interior(p1, p2)
        if p1 * xh <= M:
            return _sol(xh, (M - p1 * xh) / p2,
                        tipo="interior" if xh > 0 else "esquina_y")
        return _sol(M / p1, 0.0, tipo="esquina_x",
                    nota="Presupuesto bajo: todo se gasta en x (nota 16, Monsalve).")

    def indirecta(self, p1, p2, M):
        d = self.marshall(p1, p2, M)
        return self.U(d["x"], d["y"])

    def hicks(self, p1, p2, U0):
        _validar_precios(p1, p2)
        xh = self.x_interior(p1, p2)
        if U0 >= self.v(xh):
            return (xh, U0 - self.v(xh))
        return (self.v_inv(U0), 0.0)

    def gasto(self, p1, p2, U0):
        h1, h2 = self.hicks(p1, p2, U0)
        return p1 * h1 + p2 * h2

    def ingreso_minimo_interior(self, p1, p2):
        """Presupuesto a partir del cual la solución es interior (y* > 0)."""
        return p1 * self.x_interior(p1, p2)


@dataclass
class CuasilinealRaiz(_Cuasilineal):
    """U = a·√x + y   (Monsalve ej. 1d, 10; semana 2 ej. 4)."""
    a: float = 1.0
    nombre = "Cuasilineal a√x + y"
    latex = r"U(x,y)=a\sqrt{x}+y"

    def __post_init__(self):
        positivo("a", self.a)

    def v(self, x):
        return self.a * math.sqrt(max(x, 0.0))

    def vp(self, x):
        return math.inf if x <= 0 else self.a / (2 * math.sqrt(x))

    def vp_inv(self, r):
        return (self.a / (2 * r)) ** 2

    def v_inv(self, u):
        return (max(u, 0.0) / self.a) ** 2


@dataclass
class CuasilinealCuadratica(_Cuasilineal):
    """U = a·x − (b/2)·x² + y, válida para x ≤ a/b (demanda lineal p = a − b·x)."""
    a: float = 10.0
    b: float = 1.0
    nombre = "Cuasilineal cuadrática"
    latex = r"U(x,y)=ax-\tfrac{b}{2}x^{2}+y"

    def __post_init__(self):
        positivo("a", self.a); positivo("b", self.b)

    def v(self, x):
        x = min(max(x, 0.0), self.a / self.b)      # saciedad en a/b
        return self.a * x - self.b / 2 * x * x

    def vp(self, x):
        return max(self.a - self.b * x, 0.0)

    def vp_inv(self, r):
        return max((self.a - r) / self.b, 0.0)       # p ≥ a ⇒ no compra x

    def v_inv(self, u):
        vmax = self.a ** 2 / (2 * self.b)
        if u > vmax:
            raise ErrorParametro("U0 supera la utilidad máxima alcanzable sólo con x.")
        return (self.a - math.sqrt(self.a ** 2 - 2 * self.b * u)) / self.b


# ---------------------------------------------------------------- Separable
@dataclass
class SeparableRaiz(Utilidad):
    """U = a·√x + b·√y   (Monsalve ej. 1e, 7, 9)."""
    a: float = 1.0
    b: float = 1.0
    nombre = "Separable a√x + b√y"
    latex = r"U(x,y)=a\sqrt{x}+b\sqrt{y}"
    propiedades = {"monotona": True, "convexa": True, "homotetica": True,
                   "diferenciable": True}

    def __post_init__(self):
        positivo("a", self.a); positivo("b", self.b)

    def U(self, x, y):
        return self.a * math.sqrt(max(x, 0)) + self.b * math.sqrt(max(y, 0))

    def umg(self, x, y):
        return (math.inf if x <= 0 else self.a / (2 * math.sqrt(x)),
                math.inf if y <= 0 else self.b / (2 * math.sqrt(y)))

    def curva_indiferencia(self, U0, x):
        r = U0 - self.a * math.sqrt(max(x, 0))
        return (r / self.b) ** 2 if r >= 0 else NAN

    def marshall(self, p1, p2, M):
        _validar_precios(p1, p2, M)
        a2, b2 = self.a ** 2, self.b ** 2
        x = a2 * p2 * M / (a2 * p1 * p2 + b2 * p1 ** 2)
        y = b2 * p1 * M / (b2 * p1 * p2 + a2 * p2 ** 2)
        return _sol(x, y)

    def indirecta(self, p1, p2, M):
        _validar_precios(p1, p2, M)
        return math.sqrt(M * (self.a ** 2 / p1 + self.b ** 2 / p2))

    def gasto(self, p1, p2, U0):
        _validar_precios(p1, p2); no_negativo("U0", U0)
        return U0 ** 2 / (self.a ** 2 / p1 + self.b ** 2 / p2)

    def hicks(self, p1, p2, U0):
        k = self.a ** 2 / p1 + self.b ** 2 / p2
        return (U0 ** 2 * self.a ** 2 / (p1 ** 2 * k ** 2),
                U0 ** 2 * self.b ** 2 / (p2 ** 2 * k ** 2))


# ---------------------------------------------------------------- Stone-Geary
@dataclass
class StoneGeary(Utilidad):
    """U = (x − x0)^α (y − y0)^β, consumos mínimos x0, y0 (semana 2, ej. 5)."""
    alpha: float = 2.0
    beta: float = 4.0
    x0: float = 1.0
    y0: float = 3.0
    nombre = "Stone-Geary"
    latex = r"U(x,y)=(x-x_0)^{\alpha}(y-y_0)^{\beta}"
    propiedades = {"monotona": True, "convexa": True, "homotetica": False,
                   "diferenciable": True}

    def __post_init__(self):
        positivo("α", self.alpha); positivo("β", self.beta)
        no_negativo("x0", self.x0); no_negativo("y0", self.y0)
        self._cd = CobbDouglas(self.alpha, self.beta)

    def U(self, x, y):
        return self._cd.U(x - self.x0, y - self.y0)

    def umg(self, x, y):
        return self._cd.umg(x - self.x0, y - self.y0)

    def curva_indiferencia(self, U0, x):
        return self.y0 + self._cd.curva_indiferencia(U0, x - self.x0)

    def gasto_subsistencia(self, p1, p2):
        return p1 * self.x0 + p2 * self.y0

    def marshall(self, p1, p2, M):
        _validar_precios(p1, p2, M)
        m = M - self.gasto_subsistencia(p1, p2)
        if m <= 0:
            raise ErrorParametro(
                "El presupuesto no cubre el consumo mínimo (M ≤ p1·x0 + p2·y0).")
        d = self._cd.marshall(p1, p2, m)
        return _sol(self.x0 + d["x"], self.y0 + d["y"], ingreso_supernumerario=m)

    def indirecta(self, p1, p2, M):
        d = self.marshall(p1, p2, M)
        return self.U(d["x"], d["y"])

    def gasto(self, p1, p2, U0):
        return self.gasto_subsistencia(p1, p2) + self._cd.gasto(p1, p2, U0)

    def hicks(self, p1, p2, U0):
        h1, h2 = self._cd.hicks(p1, p2, U0)
        return (self.x0 + h1, self.y0 + h2)


# ---------------------------------------------------------------- Giffen
class Giffen(Utilidad):
    """U = ln(x − 1) − 2·ln(2 − y)   (semana 3, ej. 5 — bien Giffen).

    Región donde las demandas están definidas: x > 1, 0 < y < 2, es decir,
    p1 + p2 < M < p1 + 2·p2. En ella x es inferior, y es Giffen si M > 2·p2.
    """
    nombre = "Bien Giffen (Monsalve, ej. 3.5)"
    latex = r"U(x,y)=\ln(x-1)-2\ln(2-y)"
    propiedades = {"monotona": True, "convexa": True, "homotetica": False,
                   "diferenciable": True}

    def U(self, x, y):
        if x <= 1 or y >= 2:
            return -math.inf
        return math.log(x - 1) - 2 * math.log(2 - y)

    def umg(self, x, y):
        return (1 / (x - 1), 2 / (2 - y))

    def curva_indiferencia(self, U0, x):
        if x <= 1:
            return NAN
        return 2 - math.sqrt((x - 1) / math.exp(U0))

    def region(self, p1, p2):
        return (p1 + p2, p1 + 2 * p2)

    def marshall(self, p1, p2, M):
        _validar_precios(p1, p2, M)
        lo, hi = self.region(p1, p2)
        if not (lo < M < hi):
            raise ErrorParametro(
                f"Fuera de la región del modelo: se requiere {lo:.4g} < M < {hi:.4g}.")
        return _sol(2 + (2 * p2 - M) / p1, 2 * (M - p1) / p2 - 2,
                    es_giffen=M > 2 * p2)

    def indirecta(self, p1, p2, M):
        d = self.marshall(p1, p2, M)
        return self.U(d["x"], d["y"])

    def hicks(self, p1, p2, U0):
        _validar_precios(p1, p2)
        k = math.exp(-U0)
        return (1 + k * p2 ** 2 / (4 * p1 ** 2), 2 - k * p2 / (2 * p1))

    def gasto(self, p1, p2, U0):
        _validar_precios(p1, p2)
        return p1 + 2 * p2 - math.exp(-U0) * p2 ** 2 / (4 * p1)


CATALOGO = {
    "cobb_douglas": CobbDouglas,
    "leontief": Leontief,
    "lineal": Lineal,
    "cuasilineal_raiz": CuasilinealRaiz,
    "cuasilineal_cuadratica": CuasilinealCuadratica,
    "separable_raiz": SeparableRaiz,
    "stone_geary": StoneGeary,
    "giffen": Giffen,
}
