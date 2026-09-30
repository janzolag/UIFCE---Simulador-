"""Pruebas de uso en un navegador real (Chromium + Playwright).

Simulan lo que haría un profesor: abrir la página, usar la barra lateral,
entrar a un simulador, mover deslizadores y usar el menú en el celular.
Guardan capturas en capturas/ para revisión visual.
"""
import os
import re

import pytest

pw = pytest.importorskip("playwright.sync_api")
from registro import MATERIAS  # noqa: E402

CAPTURAS = os.path.join(os.path.dirname(os.path.dirname(__file__)), "capturas")


@pytest.fixture(scope="module")
def navegador():
    with pw.sync_playwright() as p:
        b = p.chromium.launch()
        yield b
        b.close()


@pytest.fixture()
def pagina(navegador, servidor):
    ctx = navegador.new_context(viewport={"width": 1440, "height": 900})
    pg = ctx.new_page()
    pg.errores = []
    pg.on("console", lambda m: pg.errores.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: pg.errores.append(str(e)))
    pg.base = servidor
    yield pg
    ctx.close()


def _esperar_grafica(pg):
    pg.wait_for_selector(".js-plotly-plot .main-svg", timeout=15000)


def _sin_errores(pg):
    assert not pg.errores, pg.errores


def test_inicio_fondo_azul_y_barra_lateral(pagina):
    pagina.goto(pagina.base + "/")
    _esperar_grafica(pagina)
    fondo = pagina.evaluate("getComputedStyle(document.body).backgroundColor")
    assert fondo == "rgb(11, 29, 58)"                     # #0B1D3A
    for m in MATERIAS:
        assert pagina.locator(f"#btn-{m.id}").is_visible()
    assert pagina.locator("#espacio-tutorial").is_visible()
    # la gráfica Plotly también usa el azul oscuro
    fondo_graf = pagina.locator("#grafica-portada .main-svg").first.evaluate(
        "e => e.querySelector('rect.bg') ? getComputedStyle(e).backgroundColor : ''")
    assert fondo_graf in ("rgb(11, 29, 58)", "")
    pagina.screenshot(path=f"{CAPTURAS}/01_inicio.png", full_page=True)
    _sin_errores(pagina)


def test_navegar_por_las_tres_materias(pagina):
    pagina.goto(pagina.base + "/")
    pagina.wait_for_selector("#btn-fundamentos")
    for i, m in enumerate(MATERIAS):
        pagina.click(f"#btn-{m.id}")
        pagina.wait_for_url(re.compile(f"{m.ruta}$"))
        pagina.wait_for_selector(f".pagina-materia h1:has-text('{m.nombre}')")
        assert "activo" in pagina.get_attribute(f"#btn-{m.id}", "class")
        assert pagina.locator(".submenu .enlace-sub").count() == len(m.simuladores)
        assert pagina.locator(".tarjeta-simulador").count() == len(m.simuladores)
        pagina.wait_for_timeout(400)  # deja terminar la animación del submenú
        pagina.screenshot(path=f"{CAPTURAS}/02_materia_{m.id}.png", full_page=True)
    pagina.click("#btn-inicio")
    pagina.wait_for_selector(".pagina-inicio")
    assert pagina.locator(".submenu").count() == 0
    _sin_errores(pagina)


def test_simulador_en_construccion_y_volver(pagina):
    pagina.goto(pagina.base + "/macro1")
    pagina.click("#sub-macro1-is-lm")
    pagina.wait_for_url(re.compile("/macro1/is-lm$"))
    pagina.wait_for_selector(".aviso-construccion")
    _esperar_grafica(pagina)
    assert "IS–LM" in pagina.inner_text(".encabezado-simulador h1")
    pagina.wait_for_selector(".encabezado-simulador mjx-container", timeout=15000)  # LaTeX renderizado
    assert "activo" in pagina.get_attribute("#sub-macro1-is-lm", "class")
    pagina.screenshot(path=f"{CAPTURAS}/03_simulador_pendiente.png", full_page=True)
    pagina.click(".migas a")
    pagina.wait_for_url(re.compile("/macro1$"))
    pagina.go_back()
    pagina.wait_for_selector(".aviso-construccion")     # el botón "atrás" del navegador funciona
    _sin_errores(pagina)


def test_url_directa_y_404(pagina):
    pagina.goto(pagina.base + "/micro1/monopolio")       # enlace compartido por un profesor
    pagina.wait_for_selector(".encabezado-simulador h1:has-text('Monopolio')")
    assert pagina.locator("#sub-micro1-monopolio.activo").count() == 1
    pagina.goto(pagina.base + "/macro3")
    pagina.wait_for_selector(".pagina-404")
    _sin_errores(pagina)


def _valor_equilibrio(pg):
    return pg.evaluate("""() => {
        const g = document.getElementById('grafica-portada').querySelector('.js-plotly-plot');
        return g.data[3].x[0]; }""")


def test_deslizador_portada_mueve_equilibrio(pagina):
    pagina.goto(pagina.base + "/")
    _esperar_grafica(pagina)
    antes = _valor_equilibrio(pagina)
    manija = pagina.locator("#slider-portada [role=slider]").first
    manija.focus()
    for _ in range(10):
        pagina.keyboard.press("ArrowRight")
    pagina.wait_for_function(f"() => document.querySelector('#grafica-portada .js-plotly-plot').data[3].x[0] > {antes}",
                             timeout=10000)
    assert _valor_equilibrio(pagina) > antes
    _sin_errores(pagina)


def test_plantilla_simulador_interactivo(pagina):
    pagina.goto(pagina.base + "/fundamentos/plantilla")
    pagina.wait_for_selector("#fundamentos-plantilla-grafica .main-svg")
    leer = "() => document.querySelector('#fundamentos-plantilla-grafica .js-plotly-plot')._fullData[0].y[0]"
    assert pagina.evaluate(leer) == 100
    manija = pagina.locator("#fundamentos-plantilla-a [role=slider]").first
    manija.focus()
    for _ in range(5):
        pagina.keyboard.press("ArrowLeft")
    pagina.wait_for_function(leer + " < 100", timeout=10000)
    assert pagina.evaluate(leer) == 95
    assert pagina.locator("#sub-fundamentos-plantilla:not(.pendiente)").count() == 1
    pagina.screenshot(path=f"{CAPTURAS}/04_plantilla_lista.png", full_page=True)
    _sin_errores(pagina)


def test_celular_menu_desplegable(navegador, servidor):
    ctx = navegador.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    pg = ctx.new_page()
    errores = []
    pg.on("pageerror", lambda e: errores.append(str(e)))
    pg.goto(servidor + "/")
    _esperar_grafica(pg)
    assert not pg.locator("#btn-micro1").is_visible()        # menú plegado
    assert pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth")  # sin scroll lateral
    pg.screenshot(path=f"{CAPTURAS}/05_movil_inicio.png", full_page=True)
    pg.click("#boton-menu")
    pg.wait_for_selector("#btn-micro1", state="visible")
    pg.screenshot(path=f"{CAPTURAS}/06_movil_menu.png")
    pg.click("#btn-micro1")
    pg.wait_for_selector(".pagina-materia")
    pg.wait_for_selector("#btn-micro1", state="hidden")      # se cierra al navegar
    assert pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    pg.screenshot(path=f"{CAPTURAS}/07_movil_materia.png", full_page=True)
    assert not errores, errores
    ctx.close()
