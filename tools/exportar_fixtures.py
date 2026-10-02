"""Exporta resultados de referencia de los simuladores Python para validar el port a TypeScript.

Para cada simulador de Micro 1 ejecuta `calcular(**params)` con varias combinaciones de
parámetros (valores por defecto, extremos de los deslizadores y casos aleatorios con
semilla fija) y guarda, por caso:

  * las trazas de la figura (x, y muestreados cada ~n/40 puntos + el último),
  * el texto del panel de resultados, en orden de aparición.

Requiere el código original en legacy/ y sus dependencias (pip install -r legacy/requirements.txt).
Solo hace falta volver a ejecutarlo si cambia la lógica de legacy/. Uso (desde la raíz del repositorio):

    python tools/exportar_fixtures.py

Salida: frontend/src/app/micro1/paridad.fixtures.json  (lo lee frontend/.../paridad.spec.ts)
"""
from __future__ import annotations

import importlib
import itertools
import json
import math
import random
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
LEGACY = RAIZ / "legacy"          # código Python/Dash original (oráculo de las pruebas)
sys.path.insert(0, str(LEGACY))

from dash.development.base_component import Component  # noqa: E402

SALIDA = RAIZ / "frontend" / "src" / "app" / "micro1" / "paridad.fixtures.json"

# Rangos de los deslizadores (min, max, paso) y opciones de los selectores, por simulador.
SIMS = {
    "restriccion_presupuestal": ("restriccion-presupuestal", {
        "p1": (0.5, 10, 0.1), "p2": (0.5, 10, 0.1), "M": (0, 100, 1),
        "p1n": (0.5, 10, 0.1), "p2n": (0.5, 10, 0.1), "Mn": (0, 100, 1)}, {}),
    "preferencias": ("preferencias", {
        "a": (0.1, 3, 0.1), "b": (0.1, 3, 0.1), "x0": (0.2, 9.5, 0.1), "y0": (0.2, 9.5, 0.1)},
        {"familia": ["cd", "leontief", "lineal", "cuasi", "separable", "stone"]}),
    "eleccion_optima": ("eleccion-optima", {
        "a": (0.1, 3, 0.1), "b": (0.1, 3, 0.1), "p1": (0.5, 10, 0.1), "p2": (0.5, 10, 0.1), "M": (0, 100, 1)},
        {"familia": ["cd", "leontief", "lineal", "cuasi", "separable", "stone"]}),
    "slutsky": ("slutsky", {
        "a": (0.1, 3, 0.1), "b": (0.1, 3, 0.1), "p1": (0.5, 10, 0.1), "p2": (0.5, 10, 0.1),
        "M": (0, 100, 0.5), "p1n": (0.5, 10, 0.1)},
        {"familia": ["cd", "separable", "leontief", "cuasi", "stone", "giffen"], "metodo": ["hicks", "slutsky"]}),
    "demanda": ("demanda", {
        "a": (0.1, 3, 0.1), "b": (0.1, 3, 0.1), "p2": (0.5, 10, 0.1), "M": (1, 100, 1),
        "p1": (0.5, 10, 0.1), "p1n": (0.5, 10, 0.1)},
        {"familia": ["cd", "leontief", "lineal", "cuasi", "separable", "stone"]}),
    "produccion": ("produccion", {
        "A": (0.5, 3, 0.1), "alpha": (0.05, 1.5, 0.05), "beta": (0.05, 1.5, 0.05), "rho": (-3, 0.95, 0.05),
        "x0": (0.2, 9.5, 0.1), "y0": (0.2, 9.5, 0.1), "p": (0.5, 10, 0.1), "w1": (0.5, 10, 0.1), "w2": (0.5, 10, 0.1)},
        {"tec": ["cd", "ces", "leontief", "lineal", "separable"]}),
    "costos": ("costos", {
        "CF": (0, 100, 1), "a": (1, 30, 0.5), "b": (0, 5, 0.1), "c": (0.05, 2, 0.05),
        "alpha": (0.05, 1.2, 0.05), "beta": (0.05, 1.2, 0.05), "w1": (0.5, 10, 0.1), "w2": (0.5, 10, 0.1)},
        {"modo": ["corto", "largo"]}),
    "competencia_perfecta": ("competencia-perfecta", {
        "CF": (0, 100, 1), "a": (1, 30, 0.5), "b": (0, 5, 0.1), "c": (0.05, 2, 0.05),
        "n": (1, 100, 1), "Ad": (50, 1000, 10), "Bd": (1, 50, 1)}, {}),
    "monopolio": ("monopolio", {
        "a": (2, 50, 0.5), "b": (0.1, 5, 0.1), "c": (0, 20, 0.5), "d": (0, 3, 0.1), "CF": (0, 60, 1)}, {}),
    "oligopolio": ("oligopolio", {"a": (5, 100, 1), "c": (0, 50, 0.5), "n": (1, 50, 1)}, {}),
}

EXTRA = {  # casos puntuales útiles (Giffen, rotaciones...)
    "slutsky": [dict(familia="giffen", metodo="hicks", a=2.0, b=1.0, p1=2.0, p2=1.0, M=3.5, p1n=2.2),
                dict(familia="giffen", metodo="slutsky", a=2.0, b=1.0, p1=2.0, p2=1.0, M=3.5, p1n=2.2)],
    "monopolio": [dict(a=12.0, b=1.0, c=0.0, d=1.0, CF=0.0), dict(a=10.0, b=1.0, c=2.0, d=0.0, CF=5.0),
                  dict(a=5.0, b=1.0, c=6.0, d=0.0, CF=0.0)],
}


def redondear(v):
    if v is None:
        return None
    v = float(v)
    if math.isnan(v) or math.isinf(v):
        return None
    return float(f"{v:.12g}")


def muestrear(seq):
    seq = list(seq) if seq is not None else []
    n = len(seq)
    paso = max(1, n // 40)
    idx = list(range(0, n, paso))
    if n and idx[-1] != n - 1:
        idx.append(n - 1)
    return n, idx, [redondear(seq[i]) if _es_num(seq[i]) else None for i in idx]


def _es_num(v):
    return v is not None and not isinstance(v, str)


def trazas(fig):
    out = []
    for t in fig.data:
        nx, idx, xs = muestrear(getattr(t, "x", None))
        ny, _, ys = muestrear(getattr(t, "y", None))
        out.append({"name": t.name, "n": nx, "ny": ny, "idx": idx, "x": xs, "y": ys})
    return out


def textos(nodo, acc=None):
    """Texto del panel de Dash en orden de aparición."""
    acc = [] if acc is None else acc
    if nodo is None:
        return acc
    if isinstance(nodo, str):
        acc.append(nodo)
    elif isinstance(nodo, (list, tuple)):
        for h in nodo:
            textos(h, acc)
    elif isinstance(nodo, Component):
        textos(getattr(nodo, "children", None), acc)
    else:
        acc.append(str(nodo))
    return acc


def casos(rng, claves, selectores, defecto):
    rangos = claves
    sels = list(selectores.items())
    combos = list(itertools.product(*[v for _, v in sels])) if sels else [()]
    out = []
    for combo in combos:
        base = dict(defecto)
        for (k, _), v in zip(sels, combo):
            base[k] = v
        out.append(dict(base))
        for _ in range(2):
            p = dict(base)
            for k, (lo, hi, paso) in rangos.items():
                v = lo + rng.random() * (hi - lo)
                v = round(round(v / paso) * paso, 10)
                p[k] = min(max(v, lo), hi)
            out.append(p)
    # extremos: todos al mínimo / máximo con el primer valor de cada selector
    for pos in (0, 1):
        p = dict(defecto)
        for k, (lo, hi, _) in rangos.items():
            p[k] = (lo, hi)[pos]
        out.append(p)
    return out


def main():
    rng = random.Random(20260101)
    resultado = {}
    for modulo, (sim_id, rangos, selectores) in SIMS.items():
        mod = importlib.import_module(f"simuladores.micro1.{modulo}")
        defecto = dict(mod.DEF)
        lista = casos(rng, rangos, selectores, defecto) + EXTRA.get(modulo, [])
        filas = []
        for p in lista:
            if "n" in p:
                p["n"] = int(p["n"])
            fig, panel = mod.calcular(**p)
            filas.append({"params": p, "trazas": trazas(fig), "panel": textos(panel)})
        resultado[sim_id] = filas
        print(f"{sim_id}: {len(filas)} casos")
    SALIDA.write_text(json.dumps(resultado, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Escrito {SALIDA} ({SALIDA.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
