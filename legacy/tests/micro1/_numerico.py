"""Optimizadores numéricos INDEPENDIENTES de las fórmulas cerradas.

Sirven como "tercer testigo": si la fórmula del libro, la implementación y el
optimizador numérico coinciden, el resultado del simulador está respaldado.
"""
import math

import numpy as np
from scipy.optimize import minimize, minimize_scalar


def maximizar_utilidad(U, p1, p2, M):
    """max U(x, y) s.a. p1 x + p2 y = M, parametrizando por la participación s."""
    def neg(s):
        x = s * M / p1
        y = (1 - s) * M / p2
        v = U(x, y)
        return -v if math.isfinite(v) else 1e300
    # barrido grueso + refinamiento (evita máximos locales y esquinas)
    grid = np.linspace(0, 1, 2001)
    vals = [neg(s) for s in grid]
    i = int(np.argmin(vals))
    lo, hi = grid[max(i - 1, 0)], grid[min(i + 1, len(grid) - 1)]
    r = minimize_scalar(neg, bounds=(lo, hi), method="bounded",
                        options={"xatol": 1e-12})
    s = r.x if r.fun <= vals[i] else grid[i]
    return s * M / p1, (1 - s) * M / p2


def minimizar_gasto(U, p1, p2, U0, x_max):
    """min p1 x + p2 y s.a. U(x, y) ≥ U0 buscando sobre x y despejando y por bisección."""
    def y_de_x(x):
        lo, hi = 0.0, 1.0
        while U(x, hi) < U0:
            hi *= 2
            if hi > 1e12:
                return 1e30
        for _ in range(200):
            m = (lo + hi) / 2
            lo, hi = (m, hi) if U(x, m) < U0 else (lo, m)
        return hi
    f = lambda x: p1 * x + p2 * y_de_x(x)
    grid = np.linspace(1e-9, x_max, 2001)
    vals = [f(x) for x in grid]
    i = int(np.argmin(vals))
    lo, hi = grid[max(i - 1, 0)], grid[min(i + 1, len(grid) - 1)]
    r = minimize_scalar(f, bounds=(lo, hi), method="bounded", options={"xatol": 1e-12})
    return min(r.fun, vals[i])


def maximizar_beneficio(F, p, w1, w2, x0=(1.0, 1.0)):
    def neg(v):
        x, y = np.exp(v)                       # garantiza x, y > 0
        return -(p * F(x, y) - w1 * x - w2 * y)
    r = minimize(neg, np.log(x0), method="Nelder-Mead",
                 options={"xatol": 1e-12, "fatol": 1e-14, "maxiter": 40000})
    x, y = np.exp(r.x)
    return x, y, -r.fun


def minimizar_costo(F, w1, w2, z, x_max):
    """min w1 x + w2 y s.a. F(x, y) = z (bisección en y para cada x)."""
    def y_de_x(x):
        lo, hi = 0.0, 1.0
        while F(x, hi) < z:
            hi *= 2
            if hi > 1e12:
                return 1e30
        for _ in range(200):
            m = (lo + hi) / 2
            lo, hi = (m, hi) if F(x, m) < z else (lo, m)
        return hi
    f = lambda x: w1 * x + w2 * y_de_x(x)
    grid = np.linspace(1e-9, x_max, 4001)
    vals = [f(x) for x in grid]
    i = int(np.argmin(vals))
    lo, hi = grid[max(i - 1, 0)], grid[min(i + 1, len(grid) - 1)]
    r = minimize_scalar(f, bounds=(lo, hi), method="bounded", options={"xatol": 1e-12})
    return min(r.fun, vals[i])


def max_escalar(f, lo, hi):
    grid = np.linspace(lo, hi, 4001)
    vals = [f(v) for v in grid]
    i = int(np.argmax(vals))
    a, b = grid[max(i - 1, 0)], grid[min(i + 1, len(grid) - 1)]
    r = minimize_scalar(lambda v: -f(v), bounds=(a, b), method="bounded",
                        options={"xatol": 1e-12})
    return (r.x, -r.fun) if -r.fun >= vals[i] else (grid[i], vals[i])
