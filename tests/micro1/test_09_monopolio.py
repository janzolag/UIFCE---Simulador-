"""Simulador 9 — Monopolio (Monsalve, semana 10)."""
import math
import random

import pytest

from simuladores.micro1.modelos import monopolio as mo
from simuladores.micro1.modelos._comun import ErrorParametro

from ._numerico import max_escalar


class TestLibro:
    def test_ej1_monopolio_vs_competencia(self):
        """Ej. 1 sem. 10 (p. 276-277): C = y², y = 12 − p ⇒ monopolio y* = 3, p* = 9, Π = 18; competencia y = 4, p = 8, Π = 16."""
        r = mo.monopolio_lineal(12, 1, c=0, d=1)
        assert (r["y_m"], r["p_m"], r["beneficio_m"]) == (pytest.approx(3), pytest.approx(9), pytest.approx(18))
        assert (r["y_c"], r["p_c"], r["beneficio_c"]) == (pytest.approx(4), pytest.approx(8), pytest.approx(16))

    def test_ej1_elasticidad_en_tramo_elastico(self):
        """Ej. 1: el punto (3, 9) está en la parte elástica: ε = −3."""
        r = mo.monopolio_lineal(12, 1, c=0, d=1)
        assert r["elasticidad_m"] == pytest.approx(-3) and r["tramo"] == "elastico"

    def test_ej1_fig105_excedentes(self):
        """Fig. 10.5 (p. 277): monopolio EC = 4.5, EP = 18, PEI = 1.5; competencia EC = 8, EP = 16."""
        r = mo.monopolio_lineal(12, 1, c=0, d=1)
        assert r["EC_m"] == pytest.approx(4.5) and r["EP_m"] == pytest.approx(18)
        assert r["perdida_eficiencia"] == pytest.approx(1.5)
        assert r["EC_c"] == pytest.approx(8) and r["EP_c"] == pytest.approx(16)

    @pytest.mark.parametrize("a_fijo,signo", [(10, 1), (18, 0), (25, -1)])
    def test_ej2_costos_fijos(self, a_fijo, signo):
        """Ej. 2 sem. 10 (p. 277-278): con C = y² + a, (y*, p*) = (3, 9) siempre; Π = 18 − a (pérdidas si a > 18)."""
        r = mo.monopolio_lineal(12, 1, c=0, d=1, CF=a_fijo)
        assert r["y_m"] == pytest.approx(3) and r["p_m"] == pytest.approx(9)
        assert r["beneficio_m"] == pytest.approx(18 - a_fijo)
        assert (r["beneficio_m"] > 1e-12) - (r["beneficio_m"] < -1e-12) == signo

    def test_ej4_impuesto_libro(self):
        """Ej. 4 sem. 10 (p. 285): CMg = c y p = a − by + t ⇒ p* = (a + c)/2 + t/2 (el precio sube la mitad del impuesto)."""
        a, b, c, t = 20, 2, 4, 3
        r = mo.impuesto_especifico(a, b, c, t)
        assert r["p"] == pytest.approx((a + c) / 2 + t / 2)

    def test_lerner_elasticidad_constante(self):
        """Sección 10.5 (p. 285-286): y = p^{−α} ⇒ p = c/(1 − 1/α); índice de Lerner = 1/α."""
        for alpha in (1.5, 2, 5):
            r = mo.elasticidad_constante(alpha, 3)
            assert r["p"] == pytest.approx(3 / (1 - 1 / alpha))
            assert r["lerner"] == pytest.approx(1 / alpha)
            assert r["markup"] == pytest.approx(1 / (alpha - 1))

    def test_ej5_discriminacion(self):
        """Ej. 5 sem. 10 (p. 289): y1* = 5/22, y2* = 2/22, p1* = 29/22, p2* = 18/22, Π = 0.2727; ε1 = −29/15, ε2 = −9/2."""
        r = mo.discriminacion_tercer_grado(2, 3, 1, 2, costo_cuadratico=1)["discriminacion"]
        assert r["y1"] == pytest.approx(5 / 22) and r["y2"] == pytest.approx(2 / 22)
        assert r["p1"] == pytest.approx(29 / 22) and r["p2"] == pytest.approx(18 / 22)
        assert r["beneficio"] == pytest.approx(0.2727, abs=1e-4)
        assert r["elasticidad1"] == pytest.approx(-29 / 15) and r["elasticidad2"] == pytest.approx(-9 / 2)

    def test_ej5_errata_precio_uniforme(self):
        """Ej. 5 sem. 10 — ERRATA: el libro obtiene p = 22.4/22 ≈ 1.018 con la demanda 7/6 − 5p/6, válida sólo si p < 1. A ese precio el grupo 2 ya no compra. El óptimo correcto es p = 1.25, y = 0.25, Π = 0.25 (sigue siendo < 0.2727: la conclusión del libro se mantiene)."""
        r = mo.discriminacion_tercer_grado(2, 3, 1, 2, costo_cuadratico=1)
        u = r["uniforme"]
        assert u["p"] == pytest.approx(1.25) and u["y"] == pytest.approx(0.25)
        assert u["beneficio"] == pytest.approx(0.25)
        assert u["compran_ambos"] is False
        assert r["conviene_discriminar"] is True
        p_libro = 22.4 / 22
        assert p_libro > 1                                    # fuera del tramo donde vale 7/6 − 5p/6
        assert 7 / 6 - 5 * p_libro / 6 != pytest.approx((2 - p_libro) / 3)

    def test_fig1010_precio_ramsey(self):
        """Sección 10.4: regulación por costo medio — precio donde la demanda corta al CMe (beneficio cero), con más producción que el monopolio."""
        a, b, c, d, CF = 12, 1, 0, 1, 10
        r = mo.precio_ramsey(a, b, c, d, CF)
        cme = CF / r["y"] + c + d * r["y"]
        assert r["p"] == pytest.approx(cme)
        assert r["y"] > mo.monopolio_lineal(a, b, c, d, CF)["y_m"]


class TestExtremos:
    def test_costo_marginal_sobre_precio_maximo(self):
        """c ≥ a: no existe producción rentable; el simulador avisa."""
        with pytest.raises(ErrorParametro):
            mo.monopolio_lineal(10, 1, c=12)

    def test_demanda_inelastica_sin_optimo(self):
        """y = p^{−α} con α ≤ 1: IMg ≤ 0, no hay precio óptimo finito."""
        for alpha in (0.5, 1.0):
            r = mo.elasticidad_constante(alpha, 2)
            assert r["existe"] is False

    def test_elasticidad_casi_infinita(self):
        """α → ∞: el precio del monopolista tiende al costo marginal (competencia)."""
        assert mo.elasticidad_constante(1e6, 2)["p"] == pytest.approx(2, rel=1e-5)

    def test_ramsey_sin_solucion(self):
        """Fig. 10.10: si el monopolista tiene pérdidas (CF > 18 aquí), la demanda nunca alcanza el CMe; un precio de beneficio cero sólo es posible con subsidio, como advierte el libro."""
        assert mo.precio_ramsey(12, 1, 0, 1, 1000)["existe"] is False

    def test_costo_marginal_cero(self):
        """CMg = 0: el monopolista maximiza el ingreso (ε = −1, y = a/2b)."""
        r = mo.monopolio_lineal(10, 2)
        assert r["y_m"] == pytest.approx(2.5) and r["elasticidad_m"] == pytest.approx(-1)

    def test_impuesto_que_cierra_el_mercado(self):
        """c + t ≥ a: el monopolista deja de producir."""
        assert mo.impuesto_al_vendedor(10, 1, 4, 7)["y"] == 0

    def test_discriminacion_mercado_sin_demanda_rentable(self):
        """Si un mercado tiene a_i menor que el CMg, se atiende sólo el otro (solución de esquina)."""
        r = mo.discriminacion_tercer_grado(10, 1, 0.5, 1, costo_cuadratico=0, c_lineal=1)["discriminacion"]
        assert r["y2"] == 0 and r["y1"] == pytest.approx(4.5)

    def test_mercados_identicos_no_conviene_discriminar(self):
        """Dos mercados idénticos: discriminar no aumenta el beneficio."""
        r = mo.discriminacion_tercer_grado(5, 1, 5, 1, costo_cuadratico=0.5)
        assert r["conviene_discriminar"] is False
        assert r["discriminacion"]["beneficio"] == pytest.approx(r["uniforme"]["beneficio"])


class TestTeoria:
    @pytest.mark.parametrize("semilla", range(20))
    def test_optimizador_numerico_confirma(self, semilla):
        """Tercer testigo: max de (a − by)y − C(y) numérico = solución IMg = CMg."""
        r = random.Random(semilla)
        a, b, c, d, CF = r.uniform(10, 100), r.uniform(0.2, 5), r.uniform(0, 9), r.uniform(0, 3), r.uniform(0, 50)
        m = mo.monopolio_lineal(a, b, c, d, CF)
        yn, Pn = max_escalar(lambda y: (a - b * y) * y - (CF + c * y + d * y * y), 0, a / b)
        assert m["y_m"] == pytest.approx(yn, rel=1e-6) and m["beneficio_m"] == pytest.approx(Pn, rel=1e-8, abs=1e-8)

    @pytest.mark.parametrize("semilla", range(20))
    def test_monopolio_vs_competencia(self, semilla):
        """Monopolio: menor cantidad, mayor precio, PEI > 0 y opera en el tramo elástico (|ε| ≥ 1)."""
        r = random.Random(100 + semilla)
        a, b, c, d = r.uniform(10, 100), r.uniform(0.2, 5), r.uniform(0, 9), r.uniform(0, 3)
        m = mo.monopolio_lineal(a, b, c, d)
        assert m["y_m"] < m["y_c"] and m["p_m"] > m["p_c"]
        assert m["perdida_eficiencia"] > 0
        assert m["elasticidad_m"] <= -1 + 1e-12

    @pytest.mark.parametrize("semilla", range(15))
    def test_regla_de_lerner(self, semilla):
        """Índice de Lerner: (p − CMg)/p = −1/ε en el óptimo del monopolista."""
        r = random.Random(200 + semilla)
        m = mo.monopolio_lineal(r.uniform(10, 100), r.uniform(0.2, 5), r.uniform(0, 9), r.uniform(0, 3))
        assert m["lerner"] == pytest.approx(m["inverso_elasticidad"])

    @pytest.mark.parametrize("semilla", range(10))
    def test_pei_igual_a_integral(self, semilla):
        """PEI = ∫_{ym}^{yc} [p(y) − CMg(y)] dy."""
        r = random.Random(300 + semilla)
        a, b, c, d = r.uniform(10, 100), r.uniform(0.2, 5), r.uniform(0, 9), r.uniform(0, 3)
        m = mo.monopolio_lineal(a, b, c, d)
        n = 2000
        h = (m["y_c"] - m["y_m"]) / n
        integ = sum(((a - b * (m["y_m"] + (i + .5) * h)) - (c + 2 * d * (m["y_m"] + (i + .5) * h))) * h for i in range(n))
        assert m["perdida_eficiencia"] == pytest.approx(integ, rel=1e-6)

    def test_traslado_del_impuesto_lineal(self):
        """Con demanda lineal y CMg constante, el monopolista traslada exactamente la mitad del impuesto."""
        for t in (0.5, 2, 5):
            assert mo.impuesto_al_vendedor(20, 2, 4, t)["traslado"] == pytest.approx(0.5)

    def test_mayor_precio_al_menos_elastico(self):
        """Discriminación de 3er grado: se cobra más en el mercado menos elástico (p. 289)."""
        d = mo.discriminacion_tercer_grado(2, 3, 1, 2, 1)["discriminacion"]
        assert (d["p1"] > d["p2"]) == (abs(d["elasticidad1"]) < abs(d["elasticidad2"]))

    @pytest.mark.parametrize("semilla", range(10))
    def test_discriminar_nunca_da_menos(self, semilla):
        """Discriminar (más instrumentos) nunca da menor beneficio que el precio uniforme."""
        r = random.Random(400 + semilla)
        res = mo.discriminacion_tercer_grado(r.uniform(1, 10), r.uniform(.5, 4), r.uniform(1, 10),
                                             r.uniform(.5, 4), r.uniform(0, 2), r.uniform(0, .9))
        assert res["discriminacion"]["beneficio"] >= res["uniforme"]["beneficio"] - 1e-10

    def test_uniforme_confirmado_numericamente(self):
        """El precio uniforme sobre la demanda quebrada coincide con una búsqueda numérica en p."""
        Q = lambda p: max(0, (2 - p) / 3) + max(0, (1 - p) / 2)
        pn, Pn = max_escalar(lambda p: p * Q(p) - Q(p) ** 2, 0, 2)
        u = mo.discriminacion_tercer_grado(2, 3, 1, 2, 1)["uniforme"]
        assert u["p"] == pytest.approx(pn, rel=1e-6) and u["beneficio"] == pytest.approx(Pn, rel=1e-9)

    @pytest.mark.parametrize("semilla", range(12))
    def test_uniforme_aleatorio_vs_busqueda_numerica(self, semilla):
        """Precio uniforme con demanda quebrada y parámetros aleatorios = máximo numérico sobre p."""
        r = random.Random(500 + semilla)
        a1, b1, a2, b2 = r.uniform(1, 10), r.uniform(.5, 4), r.uniform(1, 10), r.uniform(.5, 4)
        k, c = r.uniform(0, 2), r.uniform(0, .9)
        Q = lambda p: max(0, (a1 - p) / b1) + max(0, (a2 - p) / b2)
        pn, Pn = max_escalar(lambda p: (p - c) * Q(p) - k * Q(p) ** 2, 0, max(a1, a2))
        u = mo.discriminacion_tercer_grado(a1, b1, a2, b2, k, c)["uniforme"]
        assert u["beneficio"] == pytest.approx(Pn, rel=1e-7, abs=1e-9)
