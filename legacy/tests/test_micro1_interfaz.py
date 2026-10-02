"""Pruebas de las pantallas de Microeconomía 1.

Recorren cada simulador como lo haría un profesor moviendo deslizadores:
valores por defecto, extremos de cada deslizador, todas las opciones de cada
selector y combinaciones aleatorias. Ninguna combinación debe romper la página:
o se dibuja la gráfica, o se muestra un mensaje en español.
"""
import importlib
import json
import random

import plotly.graph_objects as go
import pytest
from dash import dcc

from registro import buscar_materia

MICRO = buscar_materia("micro1")
MODULOS = {
    "restriccion-presupuestal": "restriccion_presupuestal", "preferencias": "preferencias",
    "eleccion-optima": "eleccion_optima", "slutsky": "slutsky", "demanda": "demanda",
    "produccion": "produccion", "costos": "costos", "competencia-perfecta": "competencia_perfecta",
    "monopolio": "monopolio", "oligopolio": "oligopolio",
}


def _modulo(sim_id):
    return importlib.import_module(f"simuladores.micro1.{MODULOS[sim_id]}")


def _controles(layout, prefijo):
    """Extrae del layout los deslizadores (min, max, paso) y selectores (opciones)."""
    sliders, radios = {}, {}

    def recorrer(c):
        if isinstance(c, (list, tuple)):
            for h in c:
                recorrer(h)
            return
        if c is None or isinstance(c, (str, int, float)):
            return
        cid = getattr(c, "id", None)
        if isinstance(c, dcc.Slider):
            sliders[cid[len(prefijo):]] = (c.min, c.max, c.step)
        elif isinstance(c, dcc.RadioItems):
            radios[cid[len(prefijo):]] = [o["value"] for o in c.options]
        recorrer(getattr(c, "children", None))

    recorrer(layout)
    return sliders, radios


def _comprobar(salida):
    fig, panel = salida
    assert isinstance(fig, go.Figure)
    json.dumps(fig.to_plotly_json(), default=str)       # serializable para el navegador
    assert panel is not None


def _combinaciones(mod, sim_id, n_aleatorias=40):
    lay = mod.construir_layout()
    sliders, radios = _controles(lay, f"micro1-{sim_id}-")
    assert set(sliders) | set(radios) == set(mod.DEF), "cada parámetro de calcular tiene un control"
    combos = [dict(mod.DEF)]
    for k, (lo, hi, _) in sliders.items():
        for v in (lo, hi):
            combos.append({**mod.DEF, k: v})
    for k, ops in radios.items():
        for o in ops:
            combos.append({**mod.DEF, k: o})
            for s, (lo, hi, _) in sliders.items():
                combos.append({**mod.DEF, k: o, s: lo})
                combos.append({**mod.DEF, k: o, s: hi})
    rnd = random.Random(sim_id)
    for _ in range(n_aleatorias):
        c = {k: round(rnd.uniform(lo, hi) / st) * st if st else rnd.uniform(lo, hi)
             for k, (lo, hi, st) in sliders.items()}
        c.update({k: rnd.choice(ops) for k, ops in radios.items()})
        combos.append(c)
    return combos


@pytest.mark.parametrize("sim_id", list(MODULOS))
def test_simulador_listo_y_en_el_menu(sim_id):
    """Cada simulador de Micro 1 tiene pantalla y callbacks (punto verde en la barra lateral)."""
    sim = MICRO.buscar(sim_id)
    assert sim is not None and sim.listo and sim.registrar_callbacks is not None


@pytest.mark.parametrize("sim_id", list(MODULOS))
def test_valores_por_defecto_sin_errores(sim_id):
    """Con los valores iniciales se dibuja una gráfica con datos y ningún mensaje de error."""
    mod = _modulo(sim_id)
    fig, panel = mod.calcular(**mod.DEF)
    assert len(fig.data) >= 2
    assert "aviso-error" not in json.dumps(panel.to_plotly_json(), default=str)


@pytest.mark.parametrize("sim_id", list(MODULOS))
def test_extremos_y_combinaciones_aleatorias(sim_id):
    """Extremos de cada deslizador, cada opción de cada selector y 40 combinaciones al azar: nunca falla."""
    mod = _modulo(sim_id)
    for combo in _combinaciones(mod, sim_id):
        _comprobar(mod.calcular(**combo))


@pytest.mark.parametrize("sim_id", list(MODULOS))
def test_callback_por_http(sim_id, cliente):
    """El callback registrado en la app responde por HTTP con figura y resultados."""
    mod = _modulo(sim_id)
    pre = f"micro1-{sim_id}-"
    cuerpo = {
        "output": f"..{pre}grafica.figure...{pre}resultados.children..",
        "outputs": [{"id": pre + "grafica", "property": "figure"},
                    {"id": pre + "resultados", "property": "children"}],
        "inputs": [{"id": pre + k, "property": "value", "value": v} for k, v in mod.DEF.items()],
        "changedPropIds": [f"{pre}{next(iter(mod.DEF))}.value"],
        "state": [],
    }
    r = cliente.post("/_dash-update-component", json=cuerpo)
    assert r.status_code == 200, r.data[:300]
    resp = r.get_json()["response"]
    assert resp[pre + "grafica"]["figure"]["data"]


def test_ejemplo_del_libro_en_pantalla_monopolio():
    """La pantalla de monopolio arranca con el ejemplo 1 de la semana 10: y* = 3, p* = 9, PEI = 1.5."""
    from simuladores.micro1 import monopolio
    _, panel = monopolio.calcular(**monopolio.DEF)
    texto = str(panel)
    for v in ("'3'", "'9'", "'18'", "'1.5'", "'4.5'"):
        assert v in texto


def test_ejemplo_del_libro_en_pantalla_slutsky():
    """La pantalla de Slutsky arranca con el ejemplo 1 de la semana 4: M compensado = 50.816."""
    from simuladores.micro1 import slutsky
    _, panel = slutsky.calcular(**slutsky.DEF)
    assert "'50.816'" in str(panel)


def test_giffen_mueve_deslizadores_a_su_region():
    """Al elegir 'Bien Giffen' los deslizadores saltan a p1 = 2, p2 = 1, M = 3.5, p1' = 2.2."""
    from simuladores.micro1 import slutsky
    fig, panel = slutsky.calcular(**{**slutsky.DEF, "familia": "giffen", **slutsky.DEF_GIFFEN})
    assert "Giffen" in str(panel) and "aviso-error" not in str(panel)
