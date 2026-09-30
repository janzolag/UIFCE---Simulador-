"""Simulador 6 — Producción y maximización del beneficio (Monsalve, semana 5)."""
import math
import random

import pytest

from simuladores.micro1.modelos import produccion as pd
from simuladores.micro1.modelos._comun import ErrorParametro
from simuladores.micro1.modelos.produccion import (CES, CobbDouglasP, LeontiefP, LinealP,
                                                   SeparableP)

from ._numerico import maximizar_beneficio


class TestLibro:
    @pytest.mark.parametrize("tec,esperado", [
        (LeontiefP(2, 3), "constantes"), (SeparableP(), "decrecientes"),
        (CobbDouglasP(1, 0.5, 0.25), "decrecientes"), (CobbDouglasP(1, 0.5, 0.5), "constantes"),
        (CobbDouglasP(1, 0.8, 0.6), "crecientes"), (CES(1, 0.5), "constantes"),
        (LinealP(1, 2), "constantes")], ids=lambda v: getattr(v, "nombre", v))
    def test_ej2_rendimientos_a_escala(self, tec, esperado):
        """Ej. 2 (p. 131-133): clasificación de rendimientos a escala de Leontief, separable, Cobb-Douglas y CES."""
        assert tec.rendimientos(1.3, 2.1)["tipo"] == esperado

    def test_ej2a_c_una_variable(self):
        """Ej. 2a-c (p. 131-132): √x decrecientes, Ax constantes, x² crecientes."""
        for f, tipo in ((math.sqrt, "decrecientes"), (lambda x: 3 * x, "constantes"),
                        (lambda x: x * x, "crecientes")):
            g = math.log(f(2 * 1.7) / f(1.7)) / math.log(2)
            assert pd.clasificar_rendimientos(round(g, 12)) == tipo

    def test_ej2f_intensidad_factorial(self):
        """Ej. 2f (p. 133): F = L^½K^¼ es más intensiva en trabajo (elasticidad-insumo ½ > ¼)."""
        F = CobbDouglasP(1, 0.5, 0.25)
        L, K = 4.0, 9.0
        pmg = F.pmg(L, K)
        assert pmg[0] * L / F.F(L, K) == pytest.approx(0.5)
        assert pmg[1] * K / F.F(L, K) == pytest.approx(0.25)

    def test_ej3_productividad_marginal_igual_salario_real(self):
        """Ej. 3 (p. 139): en el óptimo f′(L*) = w/p."""
        r = pd.max_beneficio_un_insumo(0.6, 7, 3)
        assert r["pmg_optimo"] == pytest.approx(r["salario_real"])

    @pytest.mark.parametrize("p", [0.5, 1, 2, 3.7])
    def test_ej4_L_alfa(self, p):
        """Ej. 4 (p. 140-141): α = 2/3, w = 1 ⇒ L* = (8/27)p³, y* = (4/9)p², Π* = (4/27)p³."""
        r = pd.max_beneficio_un_insumo(2 / 3, p, 1)
        assert r["L"] == pytest.approx(8 / 27 * p ** 3)
        assert r["y"] == pytest.approx(4 / 9 * p ** 2)
        assert r["beneficio"] == pytest.approx(4 / 27 * p ** 3)

    @pytest.mark.parametrize("p", [1, 2, 5])
    def test_ej5_cobb_douglas_dos_insumos(self, p):
        """Ej. 5 (p. 145): α = ½, β = ¼, w1 = 2, w2 = 3 ⇒ x* = p⁴/768, y* = p⁴/2304, z* = p³/192, Π* = p⁴/768."""
        r = CobbDouglasP(1, 0.5, 0.25).max_beneficio(p, 2, 3)
        assert r["x"] == pytest.approx(p ** 4 / 768)
        assert r["y"] == pytest.approx(p ** 4 / 2304)
        assert r["z"] == pytest.approx(p ** 3 / 192)
        assert r["beneficio"] == pytest.approx(p ** 4 / 768)

    def test_ej5_proporcion_de_factores(self):
        """Nota 22 (p. 144): y/x = βw1/(αw2) en el óptimo, sin importar p."""
        for p in (1, 4, 9):
            r = CobbDouglasP(1, 0.5, 0.25).max_beneficio(p, 2, 3)
            assert r["y"] / r["x"] == pytest.approx(0.25 * 2 / (0.5 * 3))

    def test_ej6_separable(self):
        """Ej. 6 (p. 145-146): √x + √y ⇒ x* = p²/(2w1)², y* = p²/(2w2)², z* = (1/2w1 + 1/2w2)p."""
        p, w1, w2 = 6, 2, 3
        r = SeparableP().max_beneficio(p, w1, w2)
        assert r["x"] == pytest.approx(p ** 2 / (2 * w1) ** 2)
        assert r["z"] == pytest.approx((1 / (2 * w1) + 1 / (2 * w2)) * p)
        assert r["beneficio"] == pytest.approx((1 / (4 * w1) + 1 / (4 * w2)) * p ** 2)

    def test_ej3_sem7_cubica(self):
        """Ej. 3 sem. 7 (p. 184-185): x³ − 3x² + 3x = (x−1)³ + 1; rendimientos decrecientes y luego crecientes (inflexión en x = 1)."""
        f = pd.cubica_monsalve
        for x in (0.3, 1, 2.5):
            assert f(x) == pytest.approx(x ** 3 - 3 * x ** 2 + 3 * x)
        segunda = lambda x: (f(x + 1e-4) - 2 * f(x) + f(x - 1e-4)) / 1e-8
        assert segunda(0.5) < 0 < segunda(1.5)


class TestExtremos:
    @pytest.mark.parametrize("a,b", [(0.5, 0.5), (0.7, 0.6)])
    def test_sin_maximo_con_rendimientos_no_decrecientes(self, a, b):
        """Ej. 5 (p. 143): se requiere α + β < 1; con α + β ≥ 1 el simulador informa que no hay máximo."""
        r = CobbDouglasP(1, a, b).max_beneficio(3, 1, 1)
        assert r["existe"] is False and "máximo" in r["motivo"]

    def test_crecientes_beneficio_ilimitado(self):
        """α + β > 1: al escalar insumos el beneficio crece sin cota (justifica el aviso)."""
        F = CobbDouglasP(1, 0.7, 0.6)
        Pi = lambda t: 3 * F.F(t, t) - 2 * t
        assert Pi(1e3) > Pi(1e2) > Pi(10) > 0

    def test_un_insumo_alpha_invalido(self):
        """f(L) = L^α con α ≥ 1 no tiene máximo de beneficio: se rechaza."""
        with pytest.raises(ErrorParametro):
            pd.max_beneficio_un_insumo(1.0, 2, 1)

    def test_insumo_cero(self):
        """Con x = 0, Cobb-Douglas produce 0 (insumos esenciales); lineal no."""
        assert CobbDouglasP().F(0, 5) == 0 and LinealP(1, 1).F(0, 5) == 5

    def test_leontief_sin_pmg(self):
        """Leontief no es diferenciable en el vértice: PMg y TMST no definidas."""
        assert LeontiefP().pmg(1, 1) is None and LeontiefP().tmst(1, 1) is None

    def test_ces_parametros_invalidos(self):
        """CES exige ρ < 1, ρ ≠ 0 y 0 < δ < 1."""
        for kw in ({"rho": 1}, {"rho": 0}, {"delta": 1.2}):
            with pytest.raises(ErrorParametro):
                CES(**kw)

    def test_ces_limites(self):
        """ρ → 0 se acerca a Cobb-Douglas; ρ → −∞ a Leontief; ρ → 1 a lineal."""
        x, y = 2.0, 5.0
        assert CES(1, -1e-6, 0.5).F(x, y) == pytest.approx(math.sqrt(x * y), rel=1e-5)
        assert CES(1, -200, 0.5).F(x, y) == pytest.approx(min(x, y), rel=1e-2)
        assert CES(1, 0.999999, 0.5).F(x, y) == pytest.approx(0.5 * x + 0.5 * y, rel=1e-5)

    def test_precio_muy_alto(self):
        """p → grande: la empresa contrata mucho pero la solución sigue siendo finita."""
        r = pd.max_beneficio_un_insumo(0.5, 1e4, 1)
        assert math.isfinite(r["L"]) and r["L"] == pytest.approx((0.5e4) ** 2)

    def test_etapas_cubica_sin_pmg_cero(self):
        """(x−1)³ + 1 siempre tiene PMg ≥ 0: no hay etapa III (PMg negativo)."""
        r = pd.etapas_produccion(pd.cubica_monsalve, 4)
        assert r["L_pmg_cero"] is None


CASOS = [(CobbDouglasP(1, 0.5, 0.25), 3, 2, 3), (CobbDouglasP(2, 0.3, 0.3), 1, 0.5, 0.8),
         (SeparableP(), 6, 2, 3), (SeparableP(), 1, 0.3, 4)]


class TestTeoria:
    @pytest.mark.parametrize("tec,p,w1,w2", CASOS, ids=lambda v: getattr(v, "nombre", str(v)))
    def test_optimizador_numerico_confirma(self, tec, p, w1, w2):
        """Tercer testigo: Nelder-Mead sobre Π = pF − w1x − w2y da el mismo beneficio y los mismos insumos."""
        r = tec.max_beneficio(p, w1, w2)
        xn, yn, Pn = maximizar_beneficio(tec.F, p, w1, w2, (max(r["x"], 1e-3), max(r["y"], 1e-3)))
        assert r["beneficio"] == pytest.approx(Pn, rel=1e-7)
        assert r["x"] == pytest.approx(xn, rel=1e-4)

    @pytest.mark.parametrize("tec,p,w1,w2", CASOS, ids=lambda v: getattr(v, "nombre", str(v)))
    def test_lema_de_hotelling(self, tec, p, w1, w2):
        """Lema de Hotelling: ∂Π*/∂p = z* y ∂Π*/∂w1 = −x*."""
        r = tec.max_beneficio(p, w1, w2)
        h = 1e-6
        dp = (tec.max_beneficio(p + h, w1, w2)["beneficio"] - tec.max_beneficio(p - h, w1, w2)["beneficio"]) / (2 * h)
        dw = (tec.max_beneficio(p, w1 + h, w2)["beneficio"] - tec.max_beneficio(p, w1 - h, w2)["beneficio"]) / (2 * h)
        assert dp == pytest.approx(r["z"], rel=1e-5)
        assert dw == pytest.approx(-r["x"], rel=1e-5)

    @pytest.mark.parametrize("tec,p,w1,w2", CASOS, ids=lambda v: getattr(v, "nombre", str(v)))
    def test_homogeneidad(self, tec, p, w1, w2):
        """Π*(tp, tw) = t·Π*(p, w) y las demandas de insumos son homogéneas de grado 0."""
        a, b = tec.max_beneficio(p, w1, w2), tec.max_beneficio(4 * p, 4 * w1, 4 * w2)
        assert b["beneficio"] == pytest.approx(4 * a["beneficio"])
        assert b["x"] == pytest.approx(a["x"]) and b["z"] == pytest.approx(a["z"])

    @pytest.mark.parametrize("tec,p,w1,w2", CASOS, ids=lambda v: getattr(v, "nombre", str(v)))
    def test_demanda_de_insumo_decreciente_y_oferta_creciente(self, tec, p, w1, w2):
        """Ley de la oferta y de la demanda de factores: ∂x*/∂w1 < 0 y ∂z*/∂p > 0."""
        assert tec.max_beneficio(p, w1 * 1.1, w2)["x"] < tec.max_beneficio(p, w1, w2)["x"]
        assert tec.max_beneficio(p * 1.1, w1, w2)["z"] > tec.max_beneficio(p, w1, w2)["z"]

    @pytest.mark.parametrize("tec", [CobbDouglasP(1, 0.4, 0.6), CES(2, -0.5, 0.3), CES(1, 0.4, 0.5, 0.7),
                                     CobbDouglasP(3, 0.2, 0.3)], ids=lambda t: t.nombre)
    def test_teorema_de_euler(self, tec):
        """Sección A.10: para F homogénea de grado k, x·F_x + y·F_y = k·F."""
        for x, y in ((1.3, 2.2), (5, 0.7)):
            fx, fy = tec.pmg(x, y)
            assert x * fx + y * fy == pytest.approx(tec.grado_homogeneidad * tec.F(x, y))

    @pytest.mark.parametrize("rho", [-2.0, -0.5, 0.3, 0.8])
    def test_elasticidad_sustitucion_ces_numerica(self, rho):
        """σ = d ln(y/x) / d ln(TMST) = 1/(1 − ρ), calculada numéricamente."""
        tec = CES(1, rho, 0.4)
        r1, r2 = 1.0, 1.01
        t1, t2 = tec.tmst(1, r1), tec.tmst(1, r2)
        sigma = (math.log(r2) - math.log(r1)) / (math.log(t2) - math.log(t1))
        assert sigma == pytest.approx(tec.elasticidad_sustitucion(), rel=1e-3)

    @pytest.mark.parametrize("semilla", range(15))
    def test_pmg_decreciente_con_concavidad(self, semilla):
        """Cobb-Douglas con α < 1: el PMg de x decrece al aumentar x (ley de rendimientos marginales decrecientes)."""
        r = random.Random(semilla)
        tec = CobbDouglasP(r.uniform(0.5, 3), r.uniform(0.05, 0.95), r.uniform(0.05, 2))
        x, y = r.uniform(0.5, 5), r.uniform(0.5, 5)
        assert tec.pmg(x * 1.2, y)[0] < tec.pmg(x, y)[0]

    def test_etapas_de_produccion(self):
        """Etapas: el PMe es máximo donde PMg = PMe (con f(L) = 10L² − L³: L = 5; PMg = 0 en L = 20/3)."""
        f = lambda L: 10 * L ** 2 - L ** 3
        r = pd.etapas_produccion(f, 9)
        assert r["L_pme_max"] == pytest.approx(5, abs=5e-3)
        assert r["L_pmg_cero"] == pytest.approx(20 / 3, abs=5e-3)
