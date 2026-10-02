"""Simulador 5 — Demanda, elasticidades y bienestar (Monsalve, semanas 3 y 4)."""
import math
import random

import pytest

from simuladores.micro1.modelos import demanda as dm
from simuladores.micro1.modelos._comun import ErrorParametro
from simuladores.micro1.modelos.consumidor import (CobbDouglas, CuasilinealCuadratica,
                                                   CuasilinealRaiz, Giffen, Leontief,
                                                   SeparableRaiz, StoneGeary)


class TestLibro:
    def test_elasticidades_cobb_douglas(self):
        """Sección 3.3.3 (p. 85): en Cobb-Douglas, ε_propia = −1, ε_ingreso = 1 y ε_cruzada = 0."""
        e = dm.elasticidades(CobbDouglas(0.3, 0.9), 2, 5, 100)
        assert e["e_x_p1"] == pytest.approx(-1, rel=1e-6)
        assert e["e_x_M"] == pytest.approx(1, rel=1e-6)
        assert e["e_x_p2"] == pytest.approx(0, abs=1e-8)
        assert e["relacion_bruta_x_con_y"] == "independientes"
        assert e["tipo_x"] == "ingreso_unitario"     # antes se clasificaba mal como "necesario"

    def test_elasticidad_leontief(self):
        """P. 86: en Mín{x, y}, ε_ingreso = 1 y ε_propia = −p1/(p1 + p2) (inelástica)."""
        e = dm.elasticidades(Leontief(1, 1), 2, 3, 50)
        assert e["e_x_M"] == pytest.approx(1, rel=1e-6)
        assert e["e_x_p1"] == pytest.approx(-2 / 5, rel=1e-6)
        assert e["relacion_bruta_x_con_y"] == "complementarios_brutos"      # ej. 3 sem. 3

    def test_ej4_sem3_cuasilineal(self):
        """Ej. 4 sem. 3 (p. 75-76): en √x + y, x no depende de M y los bienes son sustitutos brutos."""
        e = dm.elasticidades(CuasilinealRaiz(1), 2, 3, 50)
        assert e["e_x_M"] == pytest.approx(0, abs=1e-8)
        assert e["tipo_x"] == "neutro_al_ingreso"
        assert e["relacion_bruta_x_con_y"] == "sustitutos_brutos"

    def test_ej9_sem1_separable_sustitutos(self):
        """Ej. 9 sem. 1 (p. 36): en √x + √y, subir p2 aumenta la demanda de x."""
        assert dm.elasticidades(SeparableRaiz(1, 1), 2, 3, 50)["relacion_bruta_x_con_y"] == "sustitutos_brutos"

    def test_ej5_sem3_giffen(self):
        """Ej. 5 sem. 3 (p. 76): x es Giffen (∂x/∂p1 > 0) en la región M > 2p2."""
        e = dm.elasticidades(Giffen(), 2, 1, 3.5)
        assert e["tipo_x"] == "giffen" and e["e_x_p1"] > 0 and e["e_x_M"] < 0

    def test_ej7_tramo_elastico(self):
        """Ej. 7 (p. 81-82): x = a − bp es elástica si p > a/2b; unitaria en (a/2, a/2b)."""
        a, b = 100, 2
        assert dm.demanda_lineal(a, b, 30)["clasificacion"] == "elastica"
        assert dm.demanda_lineal(a, b, 20)["clasificacion"] == "inelastica"
        u = dm.demanda_lineal(a, b, 25)
        assert u["clasificacion"] == "unitaria" and u["x"] == 50 and u["p_unitaria"] == 25

    def test_ej8_elasticidad_constante(self):
        """Ej. 8 (p. 82): X = A p^(−α) tiene elasticidad −α en toda la curva."""
        for p in (0.1, 1, 50):
            assert dm.elasticidad_constante(3, 0.7, p)["elasticidad"] == -0.7

    def test_ej9_estimar_recta(self):
        """Ej. 9 (p. 82-83): p = 12, x = 3, ε = −0.04 ⇒ x = 3.12 − 0.01p."""
        r = dm.estimar_lineal(12, 3, -0.04)
        assert r["a"] == pytest.approx(3.12) and r["b"] == pytest.approx(0.01)

    def test_ej5_sem4_excedente(self):
        """Ej. 5 sem. 4 (p. 116): x = 10 − 2p, p = 3 ⇒ compra 4 y EC = $4."""
        assert dm.demanda_lineal(10, 2, 3)["x"] == 4
        assert dm.excedente_consumidor_lineal(10, 2, 3) == pytest.approx(4)

    def test_ej6_sem4_excedente_cuasilineal(self):
        """Ej. 6 sem. 4 (p. 117): con √x + y, EC = √x0 − P·x0 con x0 = 1/(4P²)."""
        P = 0.25
        r = dm.excedente_consumidor_cuasilineal(CuasilinealRaiz(1), P)
        assert r["x"] == pytest.approx(4)
        assert r["excedente"] == pytest.approx(math.sqrt(4) - P * 4)

    def test_ej4_sem2_vc_cuasilineal(self):
        """Ej. 4 sem. 2 (p. 52): la compensación (VC) ≈ $0.14 cuando p1 pasa de 5 a 5.3."""
        v = dm.variaciones(CuasilinealRaiz(1), 5, 7, 200, 5.3)
        assert v["VC"] == pytest.approx(0.14, abs=5e-3)


class TestExtremos:
    def test_lineal_precio_cero(self):
        """p = 0: elasticidad 0 (perfectamente inelástica en ese punto), gasto 0."""
        r = dm.demanda_lineal(10, 2, 0)
        assert r["elasticidad"] == 0 and r["gasto"] == 0
        assert r["clasificacion"] == "perfectamente_inelastica"

    def test_lineal_precio_maximo(self):
        """p ≥ a/b: cantidad 0 y elasticidad −∞; el excedente del consumidor es 0."""
        r = dm.demanda_lineal(10, 2, 7)
        assert r["x"] == 0 and r["elasticidad"] == -math.inf
        assert r["clasificacion"] == "perfectamente_elastica"
        assert dm.excedente_consumidor_lineal(10, 2, 7) == 0

    def test_estimacion_con_elasticidad_positiva(self):
        """Una elasticidad ≥ 0 no define una recta de demanda decreciente: se rechaza."""
        with pytest.raises(ErrorParametro):
            dm.estimar_lineal(12, 3, 0.5)

    def test_elasticidad_en_esquina(self):
        """Cuasilineal en esquina (M bajo): x = M/p1 ⇒ ε_ingreso = 1 y ε_propia = −1."""
        u = CuasilinealRaiz(1)
        e = dm.elasticidades(u, 5, 7, 0.5)
        assert e["e_x_M"] == pytest.approx(1, rel=1e-5)
        assert e["e_x_p1"] == pytest.approx(-1, rel=1e-5)

    def test_saciedad_cuadratica(self):
        """U = ax − (b/2)x² + y: si p ≥ a no compra; la elasticidad no está definida (x = 0)."""
        e = dm.elasticidades(CuasilinealCuadratica(10, 2), 11, 1, 50)
        assert e["x"] == 0 and math.isnan(e["e_x_p1"])

    def test_variaciones_sin_cambio(self):
        """p1' = p1: VC = VE = ΔEC = 0."""
        v = dm.variaciones(CobbDouglas(1, 1), 2, 3, 60, 2)
        assert v["VC"] == pytest.approx(0) and v["VE"] == pytest.approx(0) and v["perdida_EC"] == 0

    def test_clasificar_elasticidad_infinita(self):
        assert dm.clasificar_elasticidad(-math.inf) == "perfectamente_elastica"


CASOS = [(CobbDouglas(0.3, 0.9), 2, 5, 100), (SeparableRaiz(1, 2), 2, 3, 50),
         (StoneGeary(2, 4, 1, 3), 2, 1, 20), (Leontief(3, 2), 1.5, 4, 70),
         (CuasilinealRaiz(1), 2, 3, 50), (Giffen(), 2, 1, 3.5)]


class TestTeoria:
    @pytest.mark.parametrize("u,p1,p2,M", CASOS, ids=lambda v: getattr(v, "nombre", str(v)))
    def test_agregacion_de_engel(self, u, p1, p2, M):
        """Agregación de Engel (programa del curso): s1·η1 + s2·η2 = 1."""
        assert dm.agregacion_engel(dm.elasticidades(u, p1, p2, M)) == pytest.approx(1, abs=1e-6)

    @pytest.mark.parametrize("u,p1,p2,M", CASOS, ids=lambda v: getattr(v, "nombre", str(v)))
    def test_agregacion_de_cournot(self, u, p1, p2, M):
        """Agregación de Cournot: s1·ε11 + s2·ε21 = −s1."""
        assert dm.agregacion_cournot(dm.elasticidades(u, p1, p2, M)) == pytest.approx(0, abs=1e-6)

    @pytest.mark.parametrize("u,p1,p2,M", CASOS, ids=lambda v: getattr(v, "nombre", str(v)))
    def test_euler_homogeneidad(self, u, p1, p2, M):
        """Homogeneidad de grado 0 ⇒ ε_x,p1 + ε_x,p2 + ε_x,M = 0."""
        e = dm.elasticidades(u, p1, p2, M)
        assert e["e_x_p1"] + e["e_x_p2"] + e["e_x_M"] == pytest.approx(0, abs=1e-6)

    @pytest.mark.parametrize("u", [CobbDouglas(1, 1), SeparableRaiz(1, 1), StoneGeary(2, 4, 1, 3)],
                             ids=lambda u: u.nombre)
    def test_orden_VE_EC_VC_bien_normal(self, u):
        """Bien normal y alza de precio: VE ≤ pérdida de EC ≤ VC (sección 4.8 y programa)."""
        v = dm.variaciones(u, 2, 3, 60, 3)
        assert v["VE"] <= v["perdida_EC"] + 1e-9 <= v["VC"] + 2e-9
        assert v["VE"] < v["VC"]

    @pytest.mark.parametrize("p1n", [2.5, 4.0, 1.2])
    def test_cuasilineal_VC_igual_VE_igual_EC(self, p1n):
        """Sin efecto ingreso (cuasilineal interior): VC = VE = ΔEC — por eso Marshall usaba el excedente."""
        v = dm.variaciones(CuasilinealRaiz(2), 2, 1, 100, p1n)
        assert v["VC"] == pytest.approx(v["VE"], rel=1e-9)
        assert v["VC"] == pytest.approx(v["perdida_EC"], rel=1e-6)

    @pytest.mark.parametrize("semilla", range(15))
    def test_ingreso_total_maximo_en_elasticidad_unitaria(self, semilla):
        """En x = a − bp el gasto p·x es máximo exactamente donde |ε| = 1 (p = a/2b)."""
        r = random.Random(semilla)
        a, b = r.uniform(5, 200), r.uniform(0.1, 10)
        pu = a / (2 * b)
        g = lambda p: dm.demanda_lineal(a, b, p)["gasto"]
        assert g(pu) >= g(pu * 0.97) and g(pu) >= g(pu * 1.03)
        assert g(pu) == pytest.approx(dm.demanda_lineal(a, b, pu)["gasto_max"])

    def test_excedente_lineal_igual_a_integral(self):
        """EC = ∫_p^{a/b} x(q) dq (definición marshalliana)."""
        a, b, p = 10, 2, 3
        integ = dm._integral(lambda q: max(a - b * q, 0), p, a / b)
        assert dm.excedente_consumidor_lineal(a, b, p) == pytest.approx(integ, rel=1e-9)

    def test_excedente_cuasilineal_igual_area_bajo_demanda(self):
        """Fig. 4.10: EC = ∫_0^{x0}(U′(x) − P)dx = área entre la demanda inversa y P."""
        u = CuasilinealCuadratica(10, 2)
        P = 4
        r = dm.excedente_consumidor_cuasilineal(u, P)
        area = dm._integral(lambda x: u.vp(x) - P, 0, r["x"])
        assert r["excedente"] == pytest.approx(area, rel=1e-9)
