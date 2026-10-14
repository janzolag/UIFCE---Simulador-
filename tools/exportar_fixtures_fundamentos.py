"""Exporta resultados de referencia del Bloque A original (Python/Dash) para validar el port a TypeScript.

El Bloque A (Fundamentos, Mankiw cap. 2-10) se escribió primero en Python/Dash. Este script ejecuta el
`calcular()` de cada una de sus 9 pantallas con varias combinaciones de parámetros (valores por defecto,
cada opción de cada selector, extremos de los deslizadores y casos aleatorios con semilla fija) y guarda,
por caso:

  * las trazas de la figura (x, y muestreados cada ~n/25 puntos + el último),
  * el panel de resultados como datos (tablas y avisos), con los números sin formatear.

Requiere la carpeta `bloque_a` del proyecto (con sus stubs `_stubs_no_copiar`) y dash/plotly instalados
(`pip install -r legacy/requirements.txt`). Solo hace falta volver a ejecutarlo si cambia ese código. Uso:

    python tools/exportar_fixtures_fundamentos.py RUTA/A/bloque_a

Salida: frontend/src/app/fundamentos/paridad.fixtures.json  (lo lee frontend/.../fundamentos/paridad.spec.ts)
"""
from __future__ import annotations

import importlib
import json
import math
import random
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
SALIDA = RAIZ / "frontend" / "src" / "app" / "fundamentos" / "paridad.fixtures.json"

# módulo Python -> id del simulador en la aplicación Angular
PANTALLAS = {
    "fpp": "fpp",
    "ventaja_comparativa": "ventaja-comparativa",
    "oferta_demanda": "oferta-demanda",
    "elasticidad": "elasticidades",
    "excedentes": "excedentes",
    "controles_precios": "controles-precios",
    "impuestos": "impuestos",
    "comercio_internacional": "comercio-internacional",
    "externalidades": "externalidades",
}

ALEATORIOS = 10


def preparar(bloque_a: Path):
    sys.path[:0] = [str(bloque_a / "_stubs_no_copiar"), str(bloque_a)]
    import config  # noqa: F401  (registra la plantilla "uifce")
    ui = importlib.import_module("simuladores.fundamentos._ui")

    def norm(v):
        if v is None or isinstance(v, str):
            return v
        v = float(v)
        if math.isnan(v):
            return "nan"
        if math.isinf(v):
            return "inf" if v > 0 else "-inf"
        return float(f"{v:.12g}")

    # El panel se exporta como datos (no como componentes de Dash)
    ui.tabla = lambda filas, titulo=None: {"t": "tabla", "filas": [[k, norm(v)] for k, v in filas]}
    ui.aviso = lambda texto, tipo="error": {"t": "aviso", "texto": texto}
    ui.panel = lambda *bloques: [b for b in bloques if b is not None]
    return ui, norm


def muestrear(seq, norm):
    seq = list(seq) if seq is not None else []
    n = len(seq)
    paso = max(1, n // 25)
    idx = list(range(0, n, paso))
    if n and idx[-1] != n - 1:
        idx.append(n - 1)
    return n, idx, [norm(seq[i]) if seq[i] is not None and not isinstance(seq[i], str) else None for i in idx]


def trazas(fig, norm):
    out = []
    for t in fig.data:
        nx, idx, xs = muestrear(getattr(t, "x", None), norm)
        ny, _, ys = muestrear(getattr(t, "y", None), norm)
        out.append({"name": t.name, "n": nx, "ny": ny, "idx": idx, "x": xs, "y": ys})
    return out


def casos(modulo, rng):
    controles = {c.nombre: c for c in modulo.CONTROLES}
    defecto = {c.nombre: c.valor for c in modulo.CONTROLES}
    sliders = {n: c for n, c in controles.items() if c.tipo == "slider"}
    selectores = {n: [v for v, _ in c.opciones] for n, c in controles.items() if c.tipo != "slider"}

    def aleatorio(base):
        p = dict(base)
        for n, c in sliders.items():
            v = c.minimo + rng.random() * (c.maximo - c.minimo)
            v = round(round(v / c.paso) * c.paso, 10)
            p[n] = min(max(v, c.minimo), c.maximo)
        return p

    lista = [dict(defecto)]
    for n, opciones in selectores.items():  # cada opción de cada selector, con el resto por defecto
        for o in opciones:
            lista.append({**defecto, n: o})
    for _ in range(ALEATORIOS):
        p = aleatorio(defecto)
        for n, opciones in selectores.items():
            p[n] = rng.choice(opciones)
        lista.append(p)
    for pos in (0, 1):  # todos los deslizadores en su mínimo / máximo, con cada opción del primer selector
        base = {n: (c.minimo, c.maximo)[pos] for n, c in sliders.items()}
        primero = next(iter(selectores), None)
        for o in (selectores[primero] if primero else [None]):
            p = {**defecto, **base}
            if primero:
                p[primero] = o
            lista.append(p)
    return lista


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    ui, norm = preparar(Path(sys.argv[1]).resolve())
    rng = random.Random(20261014)
    resultado = {}
    for nombre, sim_id in PANTALLAS.items():
        modulo = importlib.import_module(f"simuladores.fundamentos.{nombre}")
        filas = []
        for p in casos(modulo, rng):
            fig, panel = ui.calcular_seguro(modulo.calcular, **p)
            if isinstance(panel, dict):  # un error de dominio devuelve solo el aviso
                panel = [panel]
            filas.append({"params": p, "trazas": trazas(fig, norm), "panel": panel})
        resultado[sim_id] = filas
        print(f"{sim_id}: {len(filas)} casos")
    SALIDA.write_text(json.dumps(resultado, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Escrito {SALIDA} ({SALIDA.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
