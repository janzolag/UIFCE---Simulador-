"""Utilidades compartidas por los modelos de Microeconomía 1.

Todas las funciones de los modelos validan sus entradas con estos ayudantes y
lanzan ``ErrorParametro`` (subclase de ValueError) con un mensaje en español que
la interfaz de Dash puede mostrar directamente al usuario.
"""
from __future__ import annotations

import math

TOL = 1e-9


class ErrorParametro(ValueError):
    """Parámetro fuera del dominio económico del modelo."""


def positivo(nombre: str, valor: float) -> float:
    """Exige valor > 0 y finito."""
    if valor is None or not math.isfinite(valor) or valor <= 0:
        raise ErrorParametro(f"{nombre} debe ser un número positivo (recibido: {valor}).")
    return float(valor)


def no_negativo(nombre: str, valor: float) -> float:
    """Exige valor >= 0 y finito."""
    if valor is None or not math.isfinite(valor) or valor < 0:
        raise ErrorParametro(f"{nombre} no puede ser negativo (recibido: {valor}).")
    return float(valor)


def en_intervalo(nombre: str, valor: float, bajo: float, alto: float,
                 abierto: bool = True) -> float:
    """Exige bajo < valor < alto (o cerrado si abierto=False)."""
    if valor is None or not math.isfinite(valor):
        raise ErrorParametro(f"{nombre} debe ser un número finito.")
    ok = (bajo < valor < alto) if abierto else (bajo <= valor <= alto)
    if not ok:
        signos = ("(", ")") if abierto else ("[", "]")
        raise ErrorParametro(
            f"{nombre} debe estar en {signos[0]}{bajo}, {alto}{signos[1]} (recibido: {valor}).")
    return float(valor)


def cerca(a: float, b: float, tol: float = 1e-9) -> bool:
    return abs(a - b) <= tol * max(1.0, abs(a), abs(b))


def derivada(f, x: float, h: float | None = None) -> float:
    """Derivada numérica centrada (para pruebas y verificaciones)."""
    h = h or 1e-6 * max(1.0, abs(x))
    return (f(x + h) - f(x - h)) / (2 * h)
