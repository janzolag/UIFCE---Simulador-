"""Simulador 10 (propuesto) — Oligopolio y concentración (Monsalve, semana 11)."""
import math
import random

import pytest

from simuladores.micro1.modelos import oligopolio as ol
from simuladores.micro1.modelos._comun import ErrorParametro

from ._numerico import max_escalar


class TestLibro:
    def test_tabla113_cartel_cournot_stackelberg(self):
        """Tabla 11.3 (p. 309): precios (a+c)/2, (a+2c)/3, (a+3c)/4; cantidades y beneficios de las tres estructuras."""
        a, c = 20, 2
        k = cartel(a, c)
        assert k["p"] == pytest.approx((a + c) / 2) and k["y_i"] == pytest.approx((a - c) / 4)
        assert k["beneficio_i"] == pytest.approx((a - c) ** 2 / 8)
        co = ol.cournot(a, c, 2)
        assert co["p"] == pytest.approx((a + 2 * c) / 3) and co["y_i"] == pytest.approx((a - c) / 3)
        assert co["beneficio_i"] == pytest.approx((a - c) ** 2 / 9)
        st = ol.stackelberg(a, c)
        assert st["p"] == pytest.approx((a + 3 * c) / 4)
        assert (st["y1"], st["y2"]) == (pytest.approx((a - c) / 2), pytest.approx((a - c) / 4))
        assert st["beneficio1"] == pytest.approx((a - c) ** 2 / 8)
        assert st["beneficio2"] == pytest.approx((a - c) ** 2 / 16)

    def test_fig114_orden_de_precios(self):
        """Fig. 11.4 (p. 309-310): p_cartel > p_Cournot > p_Stackelberg > p_competitivo = c."""
        a, c = 20, 2
        assert cartel(a, c)["p"] > ol.cournot(a, c)["p"] > ol.stackelberg(a, c)["p"] > ol.competitivo(a, c)["p"] == c

    @pytest.mark.parametrize("n", [1, 2, 3, 10])
    def test_cournot_n_empresas(self, n):
        """Sección 11.2.4 (p. 310): y_i = (a−c)/(n+1), p = (a + nc)/(n+1), Π_i = ((a−c)/(n+1))²."""
        a, c = 20, 2
        r = ol.cournot(a, c, n)
        assert r["y_i"] == pytest.approx((a - c) / (n + 1))
        assert r["p"] == pytest.approx((a + n * c) / (n + 1))
        assert r["beneficio_i"] == pytest.approx(((a - c) / (n + 1)) ** 2)

    @pytest.mark.parametrize("n", [2, 5, 20])
    def test_ej1_friedman_cantidades(self, n):
        """Ej. 1 sem. 11 (p. 311): q_i = 950/(21+n), Q = 950n/(21+n), p = 100 − 95n/(21+n)."""
        r = ol.cournot_friedman(n, 100)
        assert r["q_i"] == pytest.approx(950 / (21 + n))
        assert r["p"] == pytest.approx(100 - 95 * n / (21 + n))

    @pytest.mark.parametrize("n", [2, 5, 20])
    def test_ej1_friedman_errata_beneficio(self, n):
        """Ej. 1 sem. 11 — ERRATA: el beneficio es 1.1·q² − a = 110·[95/(21+n)]² − a; el libro imprime 11·[…]² (10 veces menor). Por lo mismo, la cota de entrada es n < 950√(1.1/a) − 21 ≈ 996/√a − 21, no 315/√a − 21."""
        a = 100
        r = ol.cournot_friedman(n, a)
        q = 950 / (21 + n)
        directo = (100 - 0.1 * n * q) * q - (a + 5 * q + q * q)
        assert r["beneficio_i"] == pytest.approx(directo)
        assert r["beneficio_i"] == pytest.approx(110 * (95 / (21 + n)) ** 2 - a)
        assert r["beneficio_libro"] != pytest.approx(directo, rel=1e-2)

    def test_ej1_friedman_cota_de_entrada(self):
        """Con la fórmula corregida, en n_max el beneficio es exactamente cero."""
        a = 400
        n_max = ol.cournot_friedman(2, a)["n_max_beneficio_no_negativo"]
        q = 950 / (21 + n_max)
        assert 1.1 * q * q - a == pytest.approx(0, abs=1e-9)
        assert n_max == pytest.approx(996.37 / math.sqrt(a) - 21, abs=0.01)

    def test_ej1_friedman_n_infinito(self):
        """Ej. 1: si n → ∞, q_i → 0, Q → 950 y p → 5."""
        r = ol.cournot_friedman(10 ** 7, 0)
        assert r["q_i"] < 1e-3 and r["Q"] == pytest.approx(950, rel=1e-4) and r["p"] == pytest.approx(5, rel=1e-4)

    def test_ej2_competencia_monopolistica(self):
        """Ej. 2 sem. 11 (p. 313): Q = 20 − P, CT = Q² − 4Q + 5 ⇒ Q* = 6, P* = 14, CMe = 17/6, Π = 67."""
        r = ol.competencia_monopolistica_cp(20, (1, -4, 5))
        assert r["Q"] == 6 and r["P"] == 14
        assert r["CMe"] == pytest.approx(17 / 6) and r["beneficio"] == pytest.approx(67)

    def test_bertrand_diferenciado(self):
        """Sección 11.3.3 (p. 317): p* = (a + c)/(2 + ε(1 − n)), y* = a + (ε(n−1) − 1)p*."""
        a, c, eps, n = 10, 2, 0.3, 5
        r = ol.bertrand_diferenciado(a, c, eps, n)
        assert r["p"] == pytest.approx((a + c) / (2 + eps * (1 - n)))
        assert r["p"] > c

    def test_ej3_hhi(self):
        """Ej. 3 sem. 11 (p. 320): HHI mercado 1 = 0.3912; mercado 2 = 0.1676."""
        m1 = [0.6, 0.11, 0.1, 0.06, 0.05, 0.05, 0.02, 0.01]
        m2 = [0.2, 0.2, 0.19, 0.15, 0.16, 0.04, 0.03, 0.03]
        assert ol.hhi(m1) == pytest.approx(0.3912) and ol.hhi(m2) == pytest.approx(0.1676)

    def test_ej4_cr_errata(self):
        """Ej. 4 sem. 11 (p. 321) — ERRATA: CR(4) del mercado 1 = 0.87 ✓, pero el del mercado 2 es 0.75 (0.2 + 0.2 + 0.19 + 0.16), no 0.74: el libro sumó s4 = 0.15 en lugar de la 4.ª cuota más grande. CR(8) = 1 en ambos."""
        m1 = [0.6, 0.11, 0.1, 0.06, 0.05, 0.05, 0.02, 0.01]
        m2 = [0.2, 0.2, 0.19, 0.15, 0.16, 0.04, 0.03, 0.03]
        assert ol.cr(m1, 4) == pytest.approx(0.87)
        assert ol.cr(m2, 4) == pytest.approx(0.75)
        assert ol.cr(m1, 8) == pytest.approx(1) and ol.cr(m2, 8) == pytest.approx(1)


def cartel(a, c):
    return ol.cartel(a, c, 2)


class TestExtremos:
    def test_costo_mayor_que_precio_maximo(self):
        """c ≥ a: nadie produce; el simulador avisa."""
        with pytest.raises(ErrorParametro):
            ol.cournot(10, 12)

    def test_cournot_una_empresa_es_monopolio(self):
        """n = 1: Cournot coincide con el monopolio (cartel)."""
        assert ol.cournot(20, 2, 1)["p"] == pytest.approx(ol.cartel(20, 2, 1)["p"])

    def test_cournot_n_muy_grande(self):
        """n → ∞: p → c y el beneficio individual → 0 (p. 310)."""
        r = ol.cournot(20, 2, 10 ** 6)
        assert r["p"] == pytest.approx(2, rel=1e-4) and r["beneficio_i"] < 1e-9

    def test_cournot_n_no_entero(self):
        with pytest.raises(ErrorParametro):
            ol.cournot(20, 2, 2.5)

    def test_cournot_asimetrico_esquina(self):
        """Si una empresa es mucho más costosa, sale del mercado y la otra actúa como monopolio."""
        r = ol.cournot_asimetrico(20, 2, 15)
        assert r["y2"] == 0 and r["y1"] == pytest.approx(9) and r["p"] == pytest.approx(11)

    def test_paradoja_de_bertrand(self):
        """Paradoja de Bertrand (p. 316-317): con dos empresas idénticas, p = c y beneficio cero."""
        r = ol.bertrand_homogeneo(20, 3, 3)
        assert r["p"] == 3 and r["beneficio1"] == 0 and r["beneficio2"] == 0

    def test_bertrand_costos_distintos(self):
        """Con c1 < c2, la empresa 1 fija p apenas por debajo de c2 y se lleva todo el mercado."""
        r = ol.bertrand_homogeneo(20, 3, 5, paso=0.01)
        assert r["p"] == pytest.approx(4.99) and r["y2"] == 0 and r["beneficio1"] > 0

    def test_bertrand_diferenciado_sin_equilibrio(self):
        """Si 2 + ε(1 − n) ≤ 0 el precio sería negativo: no hay equilibrio (advertencia de Edgeworth)."""
        assert ol.bertrand_diferenciado(10, 2, 0.5, 6)["existe"] is False

    def test_hhi_monopolio_y_escala(self):
        """Monopolio: HHI = 1 (10 000 en la escala tradicional); cuotas en % también se aceptan."""
        assert ol.hhi([1]) == 1 and ol.hhi([100], escala="10000") == 10_000
        assert ol.hhi([50, 50]) == pytest.approx(0.5)

    def test_hhi_cuotas_invalidas(self):
        """Cuotas que no suman 1 (ni 100) o negativas se rechazan."""
        for s in ([0.5, 0.2], [1.2, -0.2]):
            with pytest.raises(ErrorParametro):
                ol.hhi(s)

    def test_umbrales_hhi(self):
        """P. 320: 1 500–2 500 moderadamente concentrado; > 2 500 altamente concentrado."""
        assert ol.clasificar_hhi(1000) == "no_concentrado"
        assert ol.clasificar_hhi(2000) == "moderadamente_concentrado"
        assert ol.clasificar_hhi(3912) == "altamente_concentrado"


class TestTeoria:
    @pytest.mark.parametrize("semilla", range(15))
    def test_cournot_es_equilibrio_de_nash(self, semilla):
        """Tercer testigo: dado y_j*, la mejor respuesta numérica de i es y_i* (nadie quiere desviarse)."""
        r = random.Random(semilla)
        a, c, n = r.uniform(10, 100), r.uniform(0, 9), r.randint(2, 8)
        eq = ol.cournot(a, c, n)
        otros = (n - 1) * eq["y_i"]
        yn, _ = max_escalar(lambda y: (a - y - otros - c) * y, 0, a)
        assert yn == pytest.approx(eq["y_i"], rel=1e-6)
        assert ol.reaccion(a, c, otros) == pytest.approx(eq["y_i"])

    @pytest.mark.parametrize("semilla", range(10))
    def test_stackelberg_lider_anticipa(self, semilla):
        """El líder maximiza sabiendo la reacción del seguidor; gana más que en Cournot y el seguidor menos."""
        r = random.Random(50 + semilla)
        a, c = r.uniform(10, 100), r.uniform(0, 9)
        y1n, _ = max_escalar(lambda y1: (a - y1 - ol.reaccion(a, c, y1) - c) * y1, 0, a)
        st, co = ol.stackelberg(a, c), ol.cournot(a, c, 2)
        assert y1n == pytest.approx(st["y1"], rel=1e-6)
        assert st["beneficio1"] > co["beneficio_i"] > st["beneficio2"]

    @pytest.mark.parametrize("n", [1, 2, 3, 5, 10, 50])
    def test_cournot_converge_a_competencia(self, n):
        """Al aumentar n, el precio baja monótonamente hacia c y la cantidad total sube hacia a − c."""
        a, c = 20, 2
        r, r2 = ol.cournot(a, c, n), ol.cournot(a, c, n + 1)
        assert r2["p"] < r["p"] and r2["Y"] > r["Y"]
        assert r["Y"] < a - c

    @pytest.mark.parametrize("n", [2, 3, 7])
    def test_lerner_igual_hhi_sobre_elasticidad(self, n):
        """En Cournot: (p − c)/p = HHI/|ε| (relación entre poder de mercado y concentración)."""
        a, c = 30, 3
        r = ol.cournot(a, c, n)
        eps = r["p"] / r["Y"]          # |ε| con p = a − Y
        assert r["lerner"] == pytest.approx(r["hhi"] / eps)

    def test_cartel_incentivo_a_desviarse(self):
        """El cartel no es estable: dado que la otra produce (a−c)/4, a cada empresa le conviene producir más."""
        a, c = 20, 2
        k = ol.cartel(a, c, 2)
        mejor = ol.reaccion(a, c, k["y_i"])
        assert mejor > k["y_i"]
        assert (a - mejor - k["y_i"] - c) * mejor > k["beneficio_i"]

    @pytest.mark.parametrize("semilla", range(10))
    def test_hhi_entre_1_sobre_n_y_1(self, semilla):
        """1/n ≤ HHI ≤ 1, con igualdad inferior sólo si las cuotas son iguales."""
        r = random.Random(semilla)
        n = r.randint(2, 12)
        s = [r.random() for _ in range(n)]
        t = sum(s)
        s = [v / t for v in s]
        assert 1 / n - 1e-12 <= ol.hhi(s) <= 1
        assert ol.hhi([1 / n] * n) == pytest.approx(1 / n)
