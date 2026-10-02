"""Simulador 8 — Competencia perfecta y equilibrio parcial (Monsalve, semanas 7-8)."""
import math
import random

import pytest

from simuladores.micro1.modelos import competencia as cp
from simuladores.micro1.modelos._comun import ErrorParametro
from simuladores.micro1.modelos.costos import CostoCubico

from ._numerico import max_escalar

EMPRESA = CostoCubico(CF=20, a=10, b=2, c=0.5)


class TestLibro:
    def test_ej1_tijera_de_marshall(self):
        """Ej. 1 sem. 8 (p. 214): X = 90 − p, Y = p/2 ⇒ p* = 60, X* = Y* = 30."""
        e = cp.equilibrio_lineal(90, 1, 0, 0.5)
        assert e["p"] == pytest.approx(60) and e["q"] == pytest.approx(30)

    def test_ej2_caso_general(self):
        """Ej. 2 sem. 8 (p. 214-215): X = a − bp, Y = c + dp ⇒ p* = (a−c)/(b+d), X* = (ad+bc)/(b+d)."""
        a, b, c, d = 50, 2, -10, 3
        e = cp.equilibrio_lineal(a, b, c, d)
        assert e["p"] == pytest.approx((a - c) / (b + d))
        assert e["q"] == pytest.approx((a * d + b * c) / (b + d))

    def test_ej6_elasticidades_en_equilibrio(self):
        """Ej. 6 sem. 8 (p. 232-233): ε1 = (bc − ab)/(ad + bc) y ε2 = (ad − cd)/(ad + bc)."""
        a, b, c, d = 50, 2, -10, 3
        e = cp.equilibrio_lineal(a, b, c, d)
        assert e["elasticidad_demanda"] == pytest.approx((b * c - a * b) / (a * d + b * c))
        assert e["elasticidad_oferta"] == pytest.approx((a * d - c * d) / (a * d + b * c))

    @pytest.mark.parametrize("w,A", [(1, 1), (2, 3), (0.5, 10)])
    def test_ej3_ej4_agentes_representativos(self, w, A):
        """Ej. 3-4 sem. 8 (p. 219-221): p* = (w/2A²)^{1/3}, x* = (A/2√w)^{4/3}, Π = 2^{−8/3}(A²/w)^{1/3}."""
        r = cp.representativo_monsalve(w, A)
        assert r["p"] == pytest.approx((w / (2 * A * A)) ** (1 / 3))
        assert 1 / (4 * r["p"] ** 2) == pytest.approx(r["x"])            # demanda x = 1/4p²
        assert r["p"] * A * A / (2 * w) == pytest.approx(r["x"])         # oferta x = pA²/2w
        assert r["beneficio"] == pytest.approx(2 ** (-8 / 3) * (A * A / w) ** (1 / 3))

    def test_ej4_ceteris_paribus_A(self):
        """Ej. 4 sem. 8 (fig. 8.8): si A crece, p* baja, x* sube y el beneficio sube."""
        a, b = cp.representativo_monsalve(1, 1), cp.representativo_monsalve(1, 2)
        assert b["p"] < a["p"] and b["x"] > a["x"] and b["beneficio"] > a["beneficio"]

    def test_ej5_cien_empresas(self):
        """Ej. 5 sem. 8 (p. 227): 100 empresas con oferta p = 4z frente a 80 − 2p ⇒ p* = 2.96, z* = 0.74 por empresa, 74 en total."""
        # oferta agregada: Z = 100·p/4 = 25p  ⇒  Y = 0 + 25p
        e = cp.equilibrio_lineal(80, 2, 0, 25)
        assert e["p"] == pytest.approx(2.96, abs=5e-3)
        assert e["q"] / 100 == pytest.approx(0.74, abs=5e-3)
        assert e["q"] == pytest.approx(74, abs=0.1)

    def test_seccion76_oferta_discontinua(self):
        """Sección 7.6 (p. 194, fig. 7.16): y = 0 si p < 2√(w1w2); y = kp/2w1 si p ≥ 2√(w1w2)."""
        w1, w2, k = 2, 8, 3
        pe = 2 * math.sqrt(w1 * w2)
        assert cp.oferta_cp_cobb_douglas_monsalve(w1, w2, k, pe * 0.99)["y"] == 0
        r = cp.oferta_cp_cobb_douglas_monsalve(w1, w2, k, pe)
        assert r["y"] == pytest.approx(k * pe / (2 * w1))
        assert r["y"] == pytest.approx(r["y_umbral"])        # salto desde 0 a √(w2/w1)·k
        assert r["beneficio"] == pytest.approx(0, abs=1e-9)

    def test_ej2_sem10_caso_competitivo(self):
        """Ej. 2 sem. 10 (p. 278-279): C = y² + a, demanda y = 12 − p ⇒ p* = 8, y* = 4 si a < 16."""
        e = cp.equilibrio_lineal(12, 1, 0, 0.5)
        assert e["p"] == pytest.approx(8) and e["q"] == pytest.approx(4)
        for a_fijo, existe in ((10, True), (16, True), (20, False)):
            assert (e["p"] * e["q"] - (e["q"] ** 2 + a_fijo) >= -1e-12) == existe

    def test_ej6_telarana_estable(self):
        """Ej. 6 sem. 8 (p. 232): P_t = (−d/b)^t (P0 − p*) + p*; si d < b converge a p*."""
        r = cp.telarana(50, 3, -10, 2, P0=5, T=60)
        assert r["tipo"] == "asintoticamente_estable"
        assert r["precios"][-1] == pytest.approx(r["p_equilibrio"], abs=1e-8)
        for t in (0, 1, 7, 20):
            assert r["precios"][t] == pytest.approx(r["solucion_cerrada"](t))

    def test_seccion78_elasticidad_oferta_constante(self):
        """Sección 7.8 (p. 198): z = Bp^α tiene elasticidad α (con √x + √y, z = Bp y ε = 1)."""
        B, al = 0.7, 2
        z = lambda p: B * p ** al
        p = 3
        eps = (z(p * 1.0001) - z(p * 0.9999)) / (0.0002 * p) * p / z(p)
        assert eps == pytest.approx(al, rel=1e-6)


class TestExtremos:
    def test_sin_equilibrio_positivo(self):
        """Ej. 2: si ad + bc ≤ 0 la oferta arranca por encima del precio máximo: no hay mercado."""
        with pytest.raises(ErrorParametro):
            cp.equilibrio_lineal(10, 1, -40, 2)

    def test_telarana_oscilacion_perpetua(self):
        """Fig. 8.20: si d = b el precio oscila sin acercarse ni alejarse (estable no asintóticamente)."""
        r = cp.telarana(50, 2, -10, 2, P0=10, T=40)
        assert r["tipo"] == "oscilacion_perpetua"
        assert r["precios"][40] == pytest.approx(r["precios"][0])
        assert r["precios"][41 - 2] == pytest.approx(r["precios"][1])

    def test_telarana_inestable(self):
        """Si d > b la telaraña diverge: el simulador debe advertir y acotar el gráfico."""
        r = cp.telarana(50, 2, -10, 3, P0=12.5, T=30)
        assert r["tipo"] == "inestable"
        dev = [abs(p - r["p_equilibrio"]) for p in r["precios"]]
        assert dev[-1] > 1000 * dev[1]

    def test_telarana_arranca_en_equilibrio(self):
        """P0 = p*: el precio no se mueve aunque la telaraña sea inestable."""
        r = cp.telarana(50, 2, -10, 3, P0=12.0, T=10)
        assert all(p == pytest.approx(12.0) for p in r["precios"])

    def test_empresa_bajo_cierre(self):
        """p < mín CVMe: la empresa cierra (q = 0) y pierde sólo el costo fijo."""
        r = cp.oferta_empresa_cubica(EMPRESA, EMPRESA.precio_cierre() * 0.9)
        assert r["q"] == 0 and r["beneficio"] == -EMPRESA.CF and r["zona"] == "cierra"

    def test_empresa_entre_cierre_y_nivelacion(self):
        """mín CVMe ≤ p < mín CMe: produce con pérdidas menores que el costo fijo."""
        p = (EMPRESA.precio_cierre() + EMPRESA.precio_nivelacion()) / 2
        r = cp.oferta_empresa_cubica(EMPRESA, p)
        assert r["q"] > 0 and -EMPRESA.CF < r["beneficio"] < 0
        assert r["zona"] == "opera_con_perdidas"

    def test_empresa_largo_plazo_cierra_bajo_nivelacion(self):
        """Largo plazo: bajo el mín CMe no produce (todos los costos son evitables)."""
        p = (EMPRESA.precio_cierre() + EMPRESA.precio_nivelacion()) / 2
        assert cp.oferta_empresa_cubica(EMPRESA, p, plazo="largo")["q"] == 0

    def test_empresa_en_el_umbral(self):
        """En p = mín CVMe exacto la empresa es indiferente; el simulador produce q = argmin CVMe."""
        r = cp.oferta_empresa_cubica(EMPRESA, EMPRESA.precio_cierre())
        assert r["q"] == pytest.approx(EMPRESA.q_min_cvme(), rel=1e-6)

    def test_impuesto_prohibitivo(self):
        """Un impuesto mayor que la brecha entre precios máximo y mínimo elimina el mercado."""
        r = cp.equilibrio_con_impuesto(90, 1, 0, 0.5, t=200)
        assert r["q"] == 0 and r.get("prohibitivo")

    def test_n_entero_de_empresas(self):
        """Problema del número entero (Pignol, p. 196): n de libre entrada casi nunca es entero."""
        r = cp.n_libre_entrada(1000, 5, EMPRESA)
        assert r["n"] > 0 and r["n_entero"] == math.floor(r["n"])

    def test_n_invalido(self):
        with pytest.raises(ErrorParametro):
            cp.equilibrio_n_empresas_cubicas(100, 2, EMPRESA, 2.5)


class TestTeoria:
    @pytest.mark.parametrize("semilla", range(15))
    def test_equilibrio_maximiza_excedente_total(self, semilla):
        """Primer teorema en equilibrio parcial (sección 9.2): ninguna otra cantidad da más EC + EP."""
        r = random.Random(semilla)
        a, b, c, d = r.uniform(50, 200), r.uniform(0.5, 5), r.uniform(-20, 20), r.uniform(0.5, 5)
        e = cp.equilibrio_lineal(a, b, c, d)
        # Excedente total en función de Q: ∫_0^Q [p_d(y) − p_s(y)] dy
        pd = lambda y: (a - y) / b
        ps = lambda y: max((y - c) / d, 0.0)
        ET = lambda Q: sum((pd(Q * (i + 0.5) / 400) - ps(Q * (i + 0.5) / 400)) * Q / 400 for i in range(400))
        assert ET(e["q"]) == pytest.approx(e["ET"], rel=1e-4)
        assert ET(e["q"]) >= ET(e["q"] * 0.9) and ET(e["q"]) >= ET(e["q"] * 1.1)

    @pytest.mark.parametrize("b,d", [(1, 0.5), (2, 3), (0.5, 4)])
    def test_incidencia_del_impuesto(self, b, d):
        """La parte del impuesto que paga el consumidor es d/(b + d); la pérdida de eficiencia es ½·t·Δq."""
        r = cp.equilibrio_con_impuesto(100, b, 0, d, t=4)
        base = cp.equilibrio_lineal(100, b, 0, d)
        assert r["carga_consumidor"] == pytest.approx(d / (b + d))
        assert r["p_consumidor"] - r["p_vendedor"] == pytest.approx(4)
        EC_t = 0.5 * r["q"] * (100 / b - r["p_consumidor"])
        EP_t = 0.5 * r["q"] * r["p_vendedor"]                # oferta Y = d·p_v desde el origen
        assert base["ET"] - (EC_t + EP_t + r["recaudo"]) == pytest.approx(r["perdida_eficiencia"])

    @pytest.mark.parametrize("p", [9.0, 12.0, 20.0, 35.0])
    def test_oferta_empresa_maximiza_beneficio(self, p):
        """Tercer testigo: la q de la oferta (p = CMg) coincide con el máximo numérico de pq − C(q)."""
        r = cp.oferta_empresa_cubica(EMPRESA, p)
        qn, Pn = max_escalar(lambda q: p * q - EMPRESA.CT(q), 0.0, 40.0)
        if r["q"] > 0:
            assert r["q"] == pytest.approx(qn, rel=1e-5)
            assert r["beneficio"] == pytest.approx(Pn, rel=1e-7, abs=1e-7)

    def test_oferta_creciente_sobre_cierre(self):
        """La curva de oferta de corto plazo es creciente por encima del punto de cierre."""
        ps = [EMPRESA.precio_cierre() + i for i in range(1, 20)]
        qs = [cp.oferta_empresa_cubica(EMPRESA, p)["q"] for p in ps]
        assert all(q2 > q1 for q1, q2 in zip(qs, qs[1:]))

    def test_mas_empresas_menor_precio(self):
        """Con más empresas (corto plazo) el precio baja y el beneficio por empresa cae."""
        prev = None
        for n in (5, 10, 20, 40):
            e = cp.equilibrio_n_empresas_cubicas(400, 4, EMPRESA, n)
            assert e["Q"] == pytest.approx(400 - 4 * e["p"], rel=1e-6)
            if prev:
                assert e["p"] < prev["p"] and e["beneficio_empresa"] < prev["beneficio_empresa"]
            prev = e

    def test_libre_entrada_beneficio_cero(self):
        """Largo plazo con libre entrada: p = mín CMe y cada empresa tiene beneficio 0."""
        r = cp.n_libre_entrada(1000, 5, EMPRESA)
        assert r["p"] * r["q_empresa"] - EMPRESA.CT(r["q_empresa"]) == pytest.approx(0, abs=1e-8)

    @pytest.mark.parametrize("b,d", [(3, 2), (2, 3), (2, 2)])
    def test_teorema_de_la_telarana(self, b, d):
        """Estabilidad ⇔ |ε_demanda| > ε_oferta ⇔ b > d (p. 233)."""
        e = cp.equilibrio_lineal(50, b, -10, d)
        r = cp.telarana(50, b, -10, d, 5)
        estable = abs(e["elasticidad_demanda"]) > e["elasticidad_oferta"]
        assert estable == (r["tipo"] == "asintoticamente_estable")
