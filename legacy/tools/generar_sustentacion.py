"""Genera la página de sustentación (HTML) a partir de reports/resultados_micro1.json."""
import html
import json
import pathlib
import re
from collections import OrderedDict

RAIZ = pathlib.Path(__file__).resolve().parents[1]
datos = json.loads((RAIZ / "reports/resultados_micro1.json").read_text(encoding="utf-8"))

SIMS = OrderedDict([
    ("01_presupuesto", ("Restricción presupuestal", "Sección 1.4", "presupuesto.py")),
    ("02_preferencias", ("Preferencias y curvas de indiferencia", "Secciones 1.2–1.3, 2.3", "consumidor.py")),
    ("03_eleccion", ("Elección óptima del consumidor", "Semanas 1–2", "consumidor.py")),
    ("04_slutsky", ("Efecto sustitución e ingreso", "Semana 4 (y sem. 2)", "slutsky.py")),
    ("05_demanda", ("Demanda, elasticidades y bienestar", "Semanas 3–4", "demanda.py")),
    ("06_produccion", ("Producción y beneficio", "Semana 5", "produccion.py")),
    ("07_costos", ("Costos de largo y corto plazo", "Semanas 6–7", "costos.py")),
    ("08_competencia", ("Competencia perfecta y equilibrio", "Semanas 7–8", "competencia.py")),
    ("09_monopolio", ("Monopolio", "Semana 10", "monopolio.py")),
    ("10_oligopolio", ("Oligopolio (propuesto)", "Semana 11", "oligopolio.py")),
])
CLASES = [("TestLibro", "Ejemplos del libro", "libro"),
          ("TestExtremos", "Casos extremos", "extremos"),
          ("TestTeoria", "Propiedades teóricas y verificación numérica", "teoria")]

# agrupar: sim -> clase -> funcion -> {doc, n, ok}
arbol = {s: {c: OrderedDict() for c, _, _ in CLASES} for s in SIMS}
for nodo, v in datos.items():
    m = re.match(r"tests/micro1/test_(\d\d_\w+)\.py::(\w+)::(\w+)", nodo)
    if not m:
        continue
    s, c, f = m.groups()
    e = arbol[s][c].setdefault(f, {"doc": v["doc"], "n": 0, "ok": 0})
    e["n"] += 1
    e["ok"] += v["resultado"] == "passed"

total = sum(1 for v in datos.values())
ok = sum(1 for v in datos.values() if v["resultado"] == "passed")


def fmt(doc):
    d = html.escape(doc)
    d = d.replace("ERRATA", '<span class="tag err">errata</span>')
    return d


filas, secciones = [], []
for s, (nombre, ref, mod) in SIMS.items():
    num = int(s[:2])
    cnt = {c: sum(e["n"] for e in arbol[s][c].values()) for c, _, _ in CLASES}
    fn = {c: len(arbol[s][c]) for c, _, _ in CLASES}
    tot = sum(cnt.values())
    okc = sum(e["ok"] for c, _, _ in CLASES for e in arbol[s][c].values())
    estado = "ok" if okc == tot else "fallo"
    filas.append(
        f'<tr><td class="n">{num}</td><td><a href="#s{num}">{nombre}</a><span class="ref">{ref}</span></td>'
        + "".join(f'<td class="num">{fn[c]}<small> · {cnt[c]}</small></td>' for c, _, _ in CLASES)
        + f'<td class="num"><span class="pill {estado}">{okc}/{tot}</span></td></tr>')
    bloques = []
    for c, titulo, clave in CLASES:
        items = "".join(
            f'<li><span class="mark {"ok" if e["ok"] == e["n"] else "fallo"}" aria-label="aprobada">'
            f'{"✓" if e["ok"] == e["n"] else "✗"}</span><div>{fmt(e["doc"] or f)}'
            + (f' <span class="casos">× {e["n"]} casos</span>' if e["n"] > 1 else "")
            + "</div></li>" for f, e in arbol[s][c].items())
        bloques.append(f'<div class="bloque {clave}"><h4>{titulo}</h4><ul>{items}</ul></div>')
    secciones.append(
        f'<details id="s{num}"{" open" if num == 1 else ""}><summary><span class="n">{num:02d}</span>'
        f'<span class="t">{nombre}</span><span class="meta">{ref} · <code>{mod}</code> · {tot} pruebas</span></summary>'
        f'<div class="cuerpo">{"".join(bloques)}</div></details>')

plantilla = (RAIZ / "tools/plantilla_sustentacion.html").read_text(encoding="utf-8")
salida = (plantilla.replace("{{TOTAL}}", str(total)).replace("{{OK}}", str(ok))
          .replace("{{FILAS}}", "\n".join(filas)).replace("{{SECCIONES}}", "\n".join(secciones)))
(RAIZ / "reports/sustentacion_micro1.html").write_text(salida, encoding="utf-8")
print("ok", total, ok)
