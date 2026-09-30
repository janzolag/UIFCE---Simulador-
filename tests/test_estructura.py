"""Pruebas sin navegador: registro, rutas y callbacks vía HTTP."""
import json
import re

import plotly
import pytest

from registro import MATERIAS, resolver_ruta


def _llamar_callback(cliente, salidas, entradas, estado=()):
    salida_str = ".." + "...".join(f"{i}.{p}" for i, p in salidas) + ".." if len(salidas) > 1 \
        else f"{salidas[0][0]}.{salidas[0][1]}"
    cuerpo = {
        "output": salida_str,
        "outputs": [{"id": i, "property": p} for i, p in salidas] if len(salidas) > 1
                   else {"id": salidas[0][0], "property": salidas[0][1]},
        "inputs": [{"id": i, "property": p, "value": v} for i, p, v in entradas],
        "changedPropIds": [f"{entradas[0][0]}.{entradas[0][1]}"],
        "state": [{"id": i, "property": p, "value": v} for i, p, v in estado],
    }
    r = cliente.post("/_dash-update-component", json=cuerpo)
    assert r.status_code == 200, r.data[:500]
    return r.get_json()["response"]


def _texto(obj):
    return json.dumps(obj, ensure_ascii=False)


# ---------------- Registro ----------------
def test_tres_materias_en_orden():
    assert [m.id for m in MATERIAS][:3] == ["fundamentos", "micro1", "macro1"]


def test_ids_unicos_y_validos_para_url():
    patron = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
    assert len({m.id for m in MATERIAS}) == len(MATERIAS)
    for m in MATERIAS:
        assert patron.match(m.id)
        ids = [s.id for s in m.simuladores]
        assert len(ids) == len(set(ids)), f"id repetido en {m.id}"
        for s in m.simuladores:
            assert patron.match(s.id), s.id
            assert s.nombre and s.descripcion
            if s.ecuacion:
                assert s.ecuacion.count("$") % 2 == 0, f"LaTeX sin cerrar en {s.id}"


def test_macro1_cubre_modelos_de_la_entrega_1():
    macro = next(m for m in MATERIAS if m.id == "macro1")
    assert {"keynesiano", "is-lm", "da-oa", "mundell-fleming"} <= {s.id for s in macro.simuladores}


@pytest.mark.parametrize("ruta,tipo", [
    ("/", "inicio"), ("", "inicio"), (None, "inicio"),
    ("/micro1", "materia"), ("/micro1/", "materia"),
    ("/macro1/is-lm", "simulador"),
    ("/macro2", "no-encontrado"), ("/macro1/nada", "no-encontrado"),
    ("/macro1/is-lm/extra", "no-encontrado"),
])
def test_resolver_ruta(ruta, tipo):
    assert resolver_ruta(ruta)[0] == tipo


# ---------------- Servidor y callbacks ----------------
def test_pagina_carga(cliente):
    r = cliente.get("/")
    assert r.status_code == 200
    assert "Simulador Económico · UIFCE" in r.get_data(as_text=True)
    assert cliente.get("/assets/estilos.css").status_code == 200


def _todas_las_rutas():
    rutas = ["/", "/ruta-inexistente"]
    for m in MATERIAS:
        rutas.append(m.ruta)
        rutas += [m.ruta_simulador(s) for s in m.simuladores]
    return rutas


def test_enrutador_responde_en_todas_las_rutas(cliente):
    for ruta in _todas_las_rutas():
        resp = _llamar_callback(cliente, [("contenido", "children"), ("nav-lateral", "children")],
                                [("url", "pathname", ruta)])
        contenido, nav = _texto(resp["contenido"]), _texto(resp["nav-lateral"])
        for m in MATERIAS:                         # los 3 botones siempre presentes
            assert f"btn-{m.id}" in nav, (ruta, m.id)
        tipo, materia, sim = resolver_ruta(ruta)
        if tipo == "materia":
            assert materia.nombre in contenido
            assert all(f"sub-{materia.id}-{s.id}" in nav for s in materia.simuladores)
        elif tipo == "simulador":
            assert sim.nombre in contenido
            if not sim.listo:
                assert "En construcción" in contenido
        elif tipo == "no-encontrado":
            assert "Página no encontrada" in contenido


def test_submenu_solo_para_materia_activa(cliente):
    resp = _llamar_callback(cliente, [("contenido", "children"), ("nav-lateral", "children")],
                            [("url", "pathname", "/micro1")])
    nav = _texto(resp["nav-lateral"])
    assert "sub-micro1-" in nav and "sub-macro1-" not in nav and "sub-fundamentos-" not in nav


def test_grafica_portada_se_mueve(cliente):
    base = _llamar_callback(cliente, [("grafica-portada", "figure")], [("slider-portada", "value", 0)])
    movida = _llamar_callback(cliente, [("grafica-portada", "figure")], [("slider-portada", "value", 20)])
    eq = lambda r: _arreglo(r["grafica-portada"]["figure"]["data"][3]["x"])[0]
    assert eq(movida) > eq(base)   # más demanda -> mayor cantidad de equilibrio
    fondo = base["grafica-portada"]["figure"]["layout"]["template"]["layout"]["paper_bgcolor"]
    assert fondo == "#0B1D3A"   # fondo azul oscuro de la plantilla uifce


def test_menu_movil_abre_y_cierra(cliente):
    def llamar(disparador, clase):
        cuerpo = {"output": "barra-lateral.className",
                  "outputs": {"id": "barra-lateral", "property": "className"},
                  "inputs": [{"id": "boton-menu", "property": "n_clicks", "value": 1},
                             {"id": "url", "property": "pathname", "value": "/"}],
                  "changedPropIds": [disparador],
                  "state": [{"id": "barra-lateral", "property": "className", "value": clase}]}
        return cliente.post("/_dash-update-component", json=cuerpo).get_json()["response"]["barra-lateral"]["className"]
    assert llamar("boton-menu.n_clicks", "barra-lateral") == "barra-lateral abierta"
    assert llamar("boton-menu.n_clicks", "barra-lateral abierta") == "barra-lateral"
    assert llamar("url.pathname", "barra-lateral abierta") == "barra-lateral"


def test_plantilla_de_simulador_funciona(cliente):
    """El 'espacio' para simuladores futuros: la plantilla se registra y responde."""
    resp = _llamar_callback(cliente, [("contenido", "children"), ("nav-lateral", "children")],
                            [("url", "pathname", "/fundamentos/plantilla")])
    assert "fundamentos-plantilla-grafica" in _texto(resp["contenido"])
    fig = _llamar_callback(cliente, [("fundamentos-plantilla-grafica", "figure")],
                           [("fundamentos-plantilla-a", "value", 50), ("fundamentos-plantilla-b", "value", 0.5)])
    y = _arreglo(fig["fundamentos-plantilla-grafica"]["figure"]["data"][0]["y"])
    assert abs(y[0] - 50) < 1e-9      # P(0) = a
    assert abs(y[100] - 0) < 1e-9     # P(100) = 50 - 0.5*100


def _arreglo(valor):
    """Plotly puede enviar los datos como lista o como binario {dtype, bdata}."""
    import base64
    import numpy as np
    if isinstance(valor, dict) and "bdata" in valor:
        return np.frombuffer(base64.b64decode(valor["bdata"]), dtype=valor["dtype"])
    return np.asarray(valor)
