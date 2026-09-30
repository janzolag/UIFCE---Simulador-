"""Configuración de la triple batería de pruebas de Micro 1.

Cada archivo test_XX_*.py tiene tres clases:
    TestLibro     — reproduce ejemplos numéricos y fórmulas de Monsalve (2017)
    TestExtremos  — casos límite que un profesor puede provocar con los deslizadores
    TestTeoria    — propiedades teóricas + verificación con optimizador independiente

Al terminar, se escribe reports/resultados_micro1.json con el resultado y la
documentación (docstring) de cada prueba, que alimenta el informe de sustentación.
"""
import json
import pathlib

import pytest

_REG = {}


def pytest_collection_modifyitems(items):
    for it in items:
        doc = (getattr(it, "function", None).__doc__ or "").strip() if hasattr(it, "function") else ""
        _REG[it.nodeid] = {"doc": " ".join(doc.split()), "resultado": "no_ejecutada"}


def pytest_runtest_logreport(report):
    if report.when == "call" or (report.when == "setup" and report.outcome != "passed"):
        _REG.setdefault(report.nodeid, {"doc": ""})["resultado"] = report.outcome


def pytest_sessionfinish(session, exitstatus):
    out = pathlib.Path(__file__).resolve().parents[2] / "reports"
    out.mkdir(exist_ok=True)
    (out / "resultados_micro1.json").write_text(
        json.dumps(_REG, ensure_ascii=False, indent=1), encoding="utf-8")


@pytest.fixture
def aprox():
    return lambda v, rel=1e-6, abs_=1e-9: pytest.approx(v, rel=rel, abs=abs_)
