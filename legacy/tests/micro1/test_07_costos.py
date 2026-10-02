"""Simulador 7 — Costos de largo y corto plazo (Monsalve, semanas 6 y 7)."""
import math
import random

import pytest

from simuladores.micro1.modelos import costos as cs
from simuladores.micro1.modelos._comun import ErrorParametro
from simuladores.micro1.modelos.produccion import CobbDouglasP, LeontiefP, LinealP, SeparableP

from ._numerico import max_escalar, minimizar_costo


class TestLibro:
    def test_ej1_cobb_douglas_condicionadas(self):
        """Ej. 1 sem. 6 (p. 157-158): x* = (αw2/βw1)^{β/(α+β)} z^{1/(α+β)}, y* = (βw1/αw2)^{α/(α+β)} z^{1/(α+β)}, C = B z^{1/(α+β)}."""
        a, b, w1, w2, z = 0.5, 0.25, 2, 3, 4
        d = cs.demandas_condicionadas(CobbDouglasP(1, a, b), w1, w2, z)
        s = a + b
        assert d["x"] == pytest.approx((a * w2 / (b * w1)) ** (b / s) * z ** (1 / s))
        assert d["y"] == pytest.approx((b * w1 / (a * w2)) ** (a / s) * z ** (1 / s))
        assert d["costo"] == pytest.approx(cs.constante_B_cd(a, b, w1, w2) * z ** (1 / s))

    def test_ej2_separable(self):
        """Ej. 2 sem. 6 (p. 159-160): √x + √y ⇒ C(z) = Bz² con B = w1w2/(w1 + w2)."""
        w1, w2, z = 2, 5, 3
        d = cs.demandas_condicionadas(SeparableP(), w1, w2, z)
        assert d["x"] == pytest.approx((w2 * z / (w1 + w2)) ** 2)
        assert d["costo"] == pytest.approx(w1 * w2 / (w1 + w2) * z ** 2)

    def test_ej3_leontief(self):
        """Ej. 3 sem. 6 (p. 160-161): Mín{x, y} ⇒ x* = y* = z, C(z) = (w1 + w2)z."""
        d = cs.demandas_condicionadas(LeontiefP(1, 1), 2, 7, 5)
        assert d["x"] == 5 and d["y"] == 5 and d["costo"] == 45

    def test_ej4_rendimientos_crecientes(self):
        """Ej. 4 sem. 6 (p. 161): F = ye^x ⇒ x* = ln(w2z/w1), y* = w1/w2, C = w1 ln(w2z/w1) + w1."""
        w1, w2, z = 2, 3, 10
        r = cs.costo_rendimientos_crecientes(w1, w2, z)
        assert r["x"] == pytest.approx(math.log(w2 * z / w1)) and r["y"] == pytest.approx(w1 / w2)
        assert r["costo"] == pytest.approx(w1 * math.log(w2 * z / w1) + w1)

    def test_ej6a_dos_plantas_decrecientes(self):
        """Ej. 6a sem. 6 (p. 165-166): 3y1² + 2y2² s.a. y1 + y2 = Y ⇒ (2Y/5, 3Y/5)."""
        r = cs.dos_plantas(3, 2, 10, 2)
        assert r["y1"] == pytest.approx(4) and r["y2"] == pytest.approx(6)

    def test_ej6b_dos_plantas_crecientes(self):
        """Ej. 6b sem. 6 (p. 166): 3√y1 + 2√y2 ⇒ todo en la planta 2 (monopolio natural)."""
        r = cs.dos_plantas(3, 2, 10, 0.5)
        assert r["y1"] == 0 and r["y2"] == 10

    def test_ej7_oferta_cd_lineal_si_suma_medio(self):
        """Ej. 7 sem. 6 (p. 167): con α + β = ½ la oferta de largo plazo es una recta por el origen."""
        tec = CobbDouglasP(1, 0.25, 0.25)
        z1 = cs.oferta_lp(tec, 1, 1, 1)["z"]
        z3 = cs.oferta_lp(tec, 3, 1, 1)["z"]
        assert z3 == pytest.approx(3 * z1)

    def test_ej7_sem7_y_ej5_sem8_oferta_p_igual_4z(self):
        """Ej. 7 sem. 7 (p. 199) y ej. 5 sem. 8 (p. 227): x^¼y^¼ con w1 = w2 = 1 ⇒ C = 2z², oferta p = 4z."""
        tec = CobbDouglasP(1, 0.25, 0.25)
        assert cs.costo_lp(tec, 1, 1, 3) == pytest.approx(2 * 9)
        assert cs.oferta_lp(tec, 4, 1, 1)["z"] == pytest.approx(1)

    def test_ej8_oferta_separable(self):
        """Ej. 8 sem. 6 (p. 168): C = Bz² ⇒ p = 2Bz."""
        w1, w2, p = 2, 3, 6
        B = w1 * w2 / (w1 + w2)
        assert cs.oferta_lp(SeparableP(), p, w1, w2)["z"] == pytest.approx(p / (2 * B))

    def test_ej12_dos_caminos(self):
        """Ej. 12 sem. 6 (p. 170): la oferta por maximización directa (sem. 5) = la oferta vía p = C′(z)."""
        tec = CobbDouglasP(1, 0.5, 0.25)
        for p in (1, 2.5, 7):
            assert cs.oferta_lp(tec, p, 2, 3)["z"] == pytest.approx(tec.max_beneficio(p, 2, 3)["z"])

    def test_ej11_errata_cambio_tecnico(self):
        """Ej. 11 sem. 6 (p. 169) — ERRATA: con F = A·x^α y^β la oferta es z = A(sAp/B)^{s/(1−s)}; el libro omite la A interior. Se verifica contra la maximización directa."""
        tec = CobbDouglasP(2.0, 0.5, 0.25)
        p, w1, w2 = 3, 2, 3
        directo = tec.max_beneficio(p, w1, w2)["z"]
        assert cs.oferta_lp(tec, p, w1, w2)["z"] == pytest.approx(directo)
        s = 0.75
        B = cs.constante_B_cd(0.5, 0.25, w1, w2)
        libro = 2.0 * (s * p / B) ** (s / (1 - s))
        assert libro != pytest.approx(directo, rel=1e-3)      # la fórmula impresa no coincide
        assert cs.costo_lp(tec, w1, w2, 5) == pytest.approx(B * (5 / 2.0) ** (1 / s))  # C(z) = B(z/A)^{1/s} sí

    def test_ej1_sem7_corto_plazo_cd(self):
        """Ej. 1 sem. 7 (p. 182): x = y^{1/α}/k^{β/α}; C = (w1/k^{β/α}) y^{1/α} + w2k; CMg = (w1/(αk^{β/α})) y^{(1−α)/α}."""
        a, b, w1, w2, k, y = 0.5, 0.5, 2, 3, 4, 3
        r = cs.costo_cp_cobb_douglas(a, b, w1, w2, k, y)
        assert r["CT"] == pytest.approx(w1 / k ** (b / a) * y ** (1 / a) + w2 * k)
        assert r["CMg"] == pytest.approx(w1 / (a * k ** (b / a)) * y ** ((1 - a) / a))

    def test_ej2_sem7_separable_corto_plazo(self):
        """Ej. 2 sem. 7 (p. 183-184): C(y) = w1(y − √k)² + w2k, CMg = 2w1(y − √k)."""
        r = cs.costo_cp_separable(2, 3, 4, 5)
        assert r["CT"] == pytest.approx(2 * 9 + 12) and r["CMg"] == pytest.approx(12)

    def test_ej3_sem7_cubica(self):
        """Ej. 3 sem. 7 (p. 185): C(y) = w1(y − 1)^{1/3} + w2k + w1; CMg = (w1/3)(y − 1)^{−2/3}."""
        r = cs.costo_cp_cubica(2, 3, 4, 9)
        assert r["CT"] == pytest.approx(2 * 2 + 12 + 2)
        assert r["CMg"] == pytest.approx(2 / 3 * 8 ** (-2 / 3))

    def test_seccion76_minimo_cme(self):
        """Sección 7.6 (p. 194): C = (w1/k)y² + w2k ⇒ CMe mínimo en y* = √(w2/w1)·k con valor 2√(w1w2)."""
        w1, w2, k = 2, 8, 3
        C = lambda y: cs.costo_cp_cobb_douglas(0.5, 0.5, w1, w2, k, y)
        ystar = math.sqrt(w2 / w1) * k
        assert C(ystar)["CMe"] == pytest.approx(2 * math.sqrt(w1 * w2))
        assert C(ystar)["CMe"] == pytest.approx(C(ystar)["CMg"])


class TestExtremos:
    def test_produccion_cero(self):
        """z = 0: costo de largo plazo 0; en el corto plazo queda sólo el costo fijo."""
        assert cs.costo_lp(CobbDouglasP(1, 0.5, 0.25), 1, 1, 0) == 0
        r = cs.costo_cp_cobb_douglas(0.5, 0.5, 2, 3, 4, 0)
        assert r["CT"] == r["CF"] == 12 and r["CMe"] == math.inf

    def test_separable_cp_bajo_minimo(self):
        """Ej. 2 sem. 7: con k fijo no se puede producir menos de √k (el deslizador debe impedirlo)."""
        with pytest.raises(ErrorParametro):
            cs.costo_cp_separable(2, 3, 4, 1.5)

    def test_cubica_cmg_infinito_en_inflexion(self):
        """Ej. 3 sem. 7 (fig. 7.4): en y = 1 la pendiente del costo es infinita."""
        assert cs.costo_cp_cubica(2, 3, 4, 1)["CMg"] == math.inf

    def test_ej4_fuera_de_dominio(self):
        """Ej. 4 sem. 6: la solución interior exige z > w1/w2."""
        with pytest.raises(ErrorParametro):
            cs.costo_rendimientos_crecientes(3, 1, 2)

    def test_lineal_insumos_indiferentes(self):
        """Insumos sustitutos perfectos con w1/a = w2/b: cualquier combinación minimiza (se reporta 'indeterminado')."""
        d = cs.demandas_condicionadas(LinealP(1, 2), 1, 2, 10)
        assert d["tipo"] == "indeterminado" and d["costo"] == pytest.approx(10)

    def test_oferta_lp_rendimientos_constantes(self):
        """Con α + β = 1 el costo es lineal y no hay oferta bien definida (sección 7.7)."""
        assert cs.oferta_lp(CobbDouglasP(1, 0.5, 0.5), 2, 1, 1)["existe"] is False
        assert cs.oferta_lp(LeontiefP(), 2, 1, 1)["existe"] is False

    def test_costo_cubico_invalido(self):
        """C = CF + aq − bq² + cq³ con b² ≥ 3ac tendría CMg negativo: se rechaza."""
        with pytest.raises(ErrorParametro):
            cs.CostoCubico(10, 1, 3, 1)

    def test_costo_cubico_sin_costo_fijo(self):
        """CF = 0: el mínimo del CMe coincide con el del CVMe (cierre = nivelación)."""
        c = cs.CostoCubico(0, 10, 2, 0.5)
        assert c.q_min_cme() == pytest.approx(c.q_min_cvme())
        assert c.precio_cierre() == pytest.approx(c.precio_nivelacion())

    def test_dos_plantas_costos_iguales(self):
        """Plantas idénticas con k > 1: se reparte mitad y mitad."""
        r = cs.dos_plantas(2, 2, 10, 3)
        assert r["y1"] == pytest.approx(5)


class TestTeoria:
    @pytest.mark.parametrize("tec,w1,w2,z", [
        (CobbDouglasP(1, 0.5, 0.25), 2, 3, 4), (CobbDouglasP(1.5, 0.6, 0.6), 1, 4, 2),
        (SeparableP(), 2, 5, 3), (LeontiefP(2, 1), 3, 1, 2)], ids=lambda v: getattr(v, "nombre", str(v)))
    def test_optimizador_numerico_confirma(self, tec, w1, w2, z):
        """Tercer testigo: minimización numérica de w1x + w2y s.a. F = z da el mismo costo."""
        c = cs.costo_lp(tec, w1, w2, z)
        cn = minimizar_costo(tec.F, w1, w2, z, x_max=8 * max(1.0, cs.demandas_condicionadas(tec, w1, w2, z)["x"]))
        assert c == pytest.approx(cn, rel=1e-6)

    @pytest.mark.parametrize("tec", [CobbDouglasP(1, 0.5, 0.25), SeparableP(), CobbDouglasP(2, 0.3, 0.9)],
                             ids=lambda t: t.nombre)
    def test_lema_de_shephard(self, tec):
        """Lema de Shephard (productor): ∂C/∂w1 = x*(w, z)."""
        w1, w2, z, h = 2, 3, 4, 1e-6
        dC = (cs.costo_lp(tec, w1 + h, w2, z) - cs.costo_lp(tec, w1 - h, w2, z)) / (2 * h)
        assert dC == pytest.approx(cs.demandas_condicionadas(tec, w1, w2, z)["x"], rel=1e-6)

    @pytest.mark.parametrize("semilla", range(15))
    def test_homogeneidad_y_concavidad_en_precios(self, semilla):
        """C(tw, z) = tC(w, z) y C es cóncava en w (promedio de costos ≤ costo del promedio)."""
        r = random.Random(semilla)
        tec = CobbDouglasP(1, r.uniform(0.1, 1), r.uniform(0.1, 1))
        w1, w2, z, t = r.uniform(0.5, 5), r.uniform(0.5, 5), r.uniform(0.5, 10), r.uniform(0.2, 5)
        assert cs.costo_lp(tec, t * w1, t * w2, z) == pytest.approx(t * cs.costo_lp(tec, w1, w2, z))
        v1, v2 = r.uniform(0.5, 5), r.uniform(0.5, 5)
        prom = 0.5 * cs.costo_lp(tec, w1, w2, z) + 0.5 * cs.costo_lp(tec, v1, v2, z)
        assert cs.costo_lp(tec, (w1 + v1) / 2, (w2 + v2) / 2, z) >= prom - 1e-9

    @pytest.mark.parametrize("a,b,forma", [(0.3, 0.3, "convexa"), (0.5, 0.5, "lineal"), (0.8, 0.7, "concava")])
    def test_fig63_forma_del_costo_segun_rendimientos(self, a, b, forma):
        """Fig. 6.3 (p. 159): decrecientes ⇒ C convexa; constantes ⇒ lineal; crecientes ⇒ cóncava."""
        tec = CobbDouglasP(1, a, b)
        C = lambda z: cs.costo_lp(tec, 1, 2, z)
        seg = C(3) - 2 * C(2) + C(1)
        assert {"convexa": seg > 1e-9, "lineal": abs(seg) < 1e-9, "concava": seg < -1e-9}[forma]

    @pytest.mark.parametrize("CF,a,b,c", [(20, 10, 2, 0.5), (5, 8, 1, 0.2), (100, 3, 0.5, 0.05)])
    def test_cmg_corta_cvme_y_cme_en_sus_minimos(self, CF, a, b, c):
        """El CMg corta al CVMe y al CMe en sus mínimos (curvas en U)."""
        k = cs.CostoCubico(CF, a, b, c)
        assert k.CMg(k.q_min_cvme()) == pytest.approx(k.CVMe(k.q_min_cvme()))
        assert k.CMg(k.q_min_cme()) == pytest.approx(k.CMe(k.q_min_cme()))
        qn, _ = max_escalar(lambda q: -k.CMe(q), 1e-3, 5 * k.q_min_cme())
        assert qn == pytest.approx(k.q_min_cme(), rel=1e-5)
        assert k.precio_nivelacion() >= k.precio_cierre()

    @pytest.mark.parametrize("y", [0.5, 2, 6, 15])
    def test_envolvente_corto_largo_plazo(self, y):
        """Sección 7.4: C_cp(y; k) ≥ C_lp(y) y se igualan cuando k es el óptimo de largo plazo."""
        a, b, w1, w2 = 0.3, 0.4, 2, 3
        tec = CobbDouglasP(1, a, b)
        d = cs.demandas_condicionadas(tec, w1, w2, y)
        k_opt = d["y"]
        C_lp = d["costo"]
        assert cs.costo_cp_cobb_douglas(a, b, w1, w2, k_opt, y)["CT"] == pytest.approx(C_lp)
        for k in (k_opt * 0.5, k_opt * 2):
            assert cs.costo_cp_cobb_douglas(a, b, w1, w2, k, y)["CT"] > C_lp

    def test_le_chatelier(self):
        """Ej. 7 sem. 7 (p. 199-200): la oferta de corto plazo es menos elástica que la de largo plazo (principio de LeChatelier)."""
        a = b = 0.25
        w1 = w2 = 1.0
        tec = CobbDouglasP(1, a, b)
        p0 = 4.0
        z0 = cs.oferta_lp(tec, p0, w1, w2)["z"]
        k = cs.demandas_condicionadas(tec, w1, w2, z0)["y"]
        # oferta de corto plazo: p = CMg_cp(z)  ⇒  z = (p α k^{β/α}/w1)^{α/(1−α)}
        z_cp = lambda p: (p * a * k ** (b / a) / w1) ** (a / (1 - a))
        assert z_cp(p0) == pytest.approx(z0, rel=1e-9)             # mismo punto de partida
        e_lp = (math.log(cs.oferta_lp(tec, p0 * 1.001, w1, w2)["z"]) - math.log(z0)) / math.log(1.001)
        e_cp = (math.log(z_cp(p0 * 1.001)) - math.log(z0)) / math.log(1.001)
        assert e_cp < e_lp
        assert e_lp == pytest.approx(1.0, rel=1e-3) and e_cp == pytest.approx(1 / 3, rel=1e-3)
