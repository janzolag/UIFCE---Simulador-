"""Simulador 4 — Efecto sustitución e ingreso (Monsalve, semana 2 ej. 3-4 y semana 4)."""
import random

import pytest

from simuladores.micro1.modelos.consumidor import (CobbDouglas, CuasilinealRaiz, Giffen,
                                                   Leontief, Lineal, SeparableRaiz,
                                                   StoneGeary)
from simuladores.micro1.modelos.slutsky import (descomposicion, ecuacion_slutsky,
                                                matriz_sustitucion)


class TestLibro:
    def test_ej1_sem4_x2y(self):
        """Ej. 1 sem. 4 (p. 102-103): x²y, 3x+2y=45, p1 sube 20 %. M comp. = 50.816; EP = (−1.67, 0); EI = (−1.08, −0.97); ES = (−0.59, 0.97)."""
        d = descomposicion(CobbDouglas(2, 1), 3, 2, 45, 3.6, metodo="hicks")
        assert d["M_compensado"] == pytest.approx(50.816, abs=1e-3)
        assert d["U0"] == pytest.approx(750)
        assert d["efecto_total"][0] == pytest.approx(-1.67, abs=5e-3)
        assert d["efecto_total"][1] == pytest.approx(0, abs=1e-12)
        assert d["efecto_ingreso"][0] == pytest.approx(-1.08, abs=5e-3)
        assert d["efecto_ingreso"][1] == pytest.approx(-0.97, abs=5e-3)
        assert d["efecto_sustitucion"][0] == pytest.approx(-0.59, abs=5e-3)
        assert d["efecto_sustitucion"][1] == pytest.approx(0.97, abs=5e-3)
        assert d["B"]["x"] == pytest.approx(9.41, abs=5e-3) and d["B"]["y"] == pytest.approx(8.47, abs=5e-3)

    def test_ej3_sem2_compensacion_hicks(self):
        """Ej. 3 sem. 2 (p. 49-50): xy, p1 3 → 3.6; e = 49.295; h1 = 6.8465, h2 = 12.3237; U(h) = 84.375."""
        u = CobbDouglas(1, 1)
        d = descomposicion(u, 3, 2, 45, 3.6)
        assert d["M_compensado"] == pytest.approx(49.295, abs=1e-3)
        h1, h2 = u.hicks(3.6, 2, 84.375)
        assert h1 == pytest.approx(6.8465, abs=1e-4) and h2 == pytest.approx(12.3237, abs=1e-4)
        assert u.U(h1, h2) == pytest.approx(84.375)
        assert d["C"]["x"] == pytest.approx(6.25) and d["C"]["y"] == pytest.approx(11.25)

    def test_ej4_sem2_cuasilineal_compensacion(self):
        """Ej. 4 sem. 2 (p. 52): √x + y, M = 200, p1 5 → 5.3, p2 = 7: hay que agregar ≈ $0.14."""
        d = descomposicion(CuasilinealRaiz(1), 5, 7, 200, 5.3)
        assert d["compensacion"] == pytest.approx(0.14, abs=5e-3)

    def test_seccion43_cd_formulas_diferenciales(self):
        """Sección 4.3a (p. 103-104): con xy, EP = −M/2p1², ES = −M/4p1², EI = −M/4p1²."""
        p1, p2, M = 3, 2, 45
        s = ecuacion_slutsky(CobbDouglas(1, 1), p1, p2, M)
        assert s["efecto_precio"] == pytest.approx(-M / (2 * p1 ** 2), rel=1e-6)
        assert s["efecto_sustitucion"] == pytest.approx(-M / (4 * p1 ** 2), rel=1e-6)
        assert s["efecto_ingreso"] == pytest.approx(-M / (4 * p1 ** 2), rel=1e-6)

    def test_seccion43_leontief_sin_sustitucion(self):
        """Sección 4.3b (fig. 4.3, p. 105): en Leontief el efecto sustitución es nulo; todo es efecto ingreso."""
        d = descomposicion(Leontief(1, 1), 2, 3, 50, 4)
        assert d["efecto_sustitucion"] == (pytest.approx(0), pytest.approx(0))
        assert d["efecto_ingreso"][0] == pytest.approx(d["efecto_total"][0])

    def test_seccion44_cuasilineal_sin_efecto_ingreso(self):
        """Sección 4.4 (p. 107): con U(x) + y el efecto ingreso sobre x es nulo (interior)."""
        d = descomposicion(CuasilinealRaiz(1), 1, 1, 50, 1.5)
        assert d["efecto_ingreso"][0] == pytest.approx(0, abs=1e-12)
        assert d["clasificacion_x"] == "efecto_ingreso_nulo"

    def test_giffen_ej5_sem3(self):
        """Ej. 5 sem. 3 (p. 76): en la región M > 2p2 el bien x es Giffen: sube p1 y sube x."""
        d = descomposicion(Giffen(), 2, 1, 3.5, 2.2)
        assert d["efecto_total"][0] > 0
        assert d["efecto_sustitucion"][0] < 0       # la sustitución sigue siendo negativa
        assert d["clasificacion_x"] == "giffen"


class TestExtremos:
    def test_sin_cambio_de_precio(self):
        """Δp1 = 0: todos los efectos son cero y la compensación es nula."""
        d = descomposicion(CobbDouglas(1, 1), 3, 2, 45, 3)
        assert d["efecto_total"] == (0, 0) and d["compensacion"] == pytest.approx(0)
        assert d["clasificacion_x"] == "sin_cambio"

    def test_bajada_de_precio(self):
        """Si p1 baja, la compensación es negativa (hay que quitar ingreso) y ES_x > 0."""
        d = descomposicion(CobbDouglas(1, 1), 3, 2, 45, 1.5)
        assert d["compensacion"] < 0 and d["efecto_sustitucion"][0] > 0

    def test_lineal_salto_de_esquina(self):
        """Sustitutos perfectos: al cruzar p1/a = p2/b el consumidor salta de esquina; ES = efecto total."""
        d = descomposicion(Lineal(1, 1), 1, 2, 10, 3)
        assert d["A"]["x"] == 10 and d["C"]["x"] == 0
        assert d["efecto_sustitucion"][0] == pytest.approx(-10)
        assert d["efecto_ingreso"][0] == pytest.approx(0)

    def test_precio_se_multiplica_por_100(self):
        """Choque enorme (p1 × 100): la descomposición sigue sumando exactamente."""
        d = descomposicion(SeparableRaiz(1, 1), 1, 1, 10, 100)
        for i in (0, 1):
            assert d["efecto_sustitucion"][i] + d["efecto_ingreso"][i] == pytest.approx(d["efecto_total"][i])

    def test_metodo_invalido(self):
        with pytest.raises(ValueError):
            descomposicion(CobbDouglas(1, 1), 1, 1, 10, 2, metodo="marshall")


FAMILIAS = [CobbDouglas(1, 1), CobbDouglas(0.4, 1.3), SeparableRaiz(1, 2),
            StoneGeary(2, 4, 1, 3), CuasilinealRaiz(1), Giffen()]
PARAMS = {Giffen: (2, 1, 3.5)}


def _p(u):
    return PARAMS.get(type(u), (2.0, 3.0, 60.0))


class TestTeoria:
    @pytest.mark.parametrize("u", FAMILIAS, ids=lambda u: u.nombre)
    def test_ecuacion_de_slutsky_se_cumple(self, u):
        """Ecuación (4.1): ∂x/∂p1 = ∂h1/∂p1 − x·∂x/∂M (residuo numérico ≈ 0)."""
        s = ecuacion_slutsky(u, *_p(u))
        assert abs(s["residuo"]) < 1e-5 * max(1, abs(s["efecto_precio"]))

    @pytest.mark.parametrize("u", FAMILIAS, ids=lambda u: u.nombre)
    def test_matriz_simetrica_y_seminegativa(self, u):
        """Sección 4.7: la matriz de sustitución es simétrica y semidefinida negativa."""
        p1, p2, M = _p(u)
        S = matriz_sustitucion(u, p1, p2, u.indirecta(p1, p2, M))
        assert S[0][1] == pytest.approx(S[1][0], rel=1e-4, abs=1e-7)
        assert S[0][0] <= 1e-9 and S[1][1] <= 1e-9
        assert S[0][0] * S[1][1] - S[0][1] * S[1][0] == pytest.approx(0, abs=1e-5)  # rango 1 con 2 bienes

    @pytest.mark.parametrize("u", FAMILIAS, ids=lambda u: u.nombre)
    def test_efecto_sustitucion_propio_no_positivo(self, u):
        """Ley de la demanda compensada: ante un alza de p1, ES_x ≤ 0 (siempre, incluso con Giffen)."""
        p1, p2, M = _p(u)
        for f in (1.01, 1.05):
            d = descomposicion(u, p1, p2, M, p1 * f)
            assert d["efecto_sustitucion"][0] <= 1e-12

    @pytest.mark.parametrize("u", FAMILIAS, ids=lambda u: u.nombre)
    def test_slutsky_compensa_mas_que_hicks(self, u):
        """Compensar el poder de compra (Slutsky) deja al consumidor igual o mejor que U0 (Hicks)."""
        p1, p2, M = _p(u)
        s = descomposicion(u, p1, p2, M, p1 * 1.08, metodo="slutsky")
        h = descomposicion(u, p1, p2, M, p1 * 1.08, metodo="hicks")
        assert s["M_compensado"] >= h["M_compensado"] - 1e-9
        assert u.U(s["B"]["x"], s["B"]["y"]) >= h["U0"] - 1e-9

    @pytest.mark.parametrize("u", FAMILIAS, ids=lambda u: u.nombre)
    def test_hicks_y_slutsky_convergen_con_cambios_pequenos(self, u):
        """Para Δp → 0 ambas compensaciones dan el mismo efecto sustitución (diferencia de 2.º orden)."""
        p1, p2, M = _p(u)
        dp = 1e-4 * p1
        s = descomposicion(u, p1, p2, M, p1 + dp, metodo="slutsky")
        h = descomposicion(u, p1, p2, M, p1 + dp, metodo="hicks")
        assert s["efecto_sustitucion"][0] == pytest.approx(h["efecto_sustitucion"][0], rel=1e-3, abs=1e-10)

    @pytest.mark.parametrize("semilla", range(20))
    def test_identidad_total_igual_a_suma(self, semilla):
        """Efecto precio = efecto sustitución + efecto ingreso (p. 103), con parámetros aleatorios."""
        r = random.Random(semilla)
        u = CobbDouglas(r.uniform(0.2, 3), r.uniform(0.2, 3))
        p1, p2, M = r.uniform(0.5, 10), r.uniform(0.5, 10), r.uniform(10, 300)
        d = descomposicion(u, p1, p2, M, p1 * r.uniform(0.5, 2), metodo=r.choice(["hicks", "slutsky"]))
        for i in (0, 1):
            assert d["efecto_sustitucion"][i] + d["efecto_ingreso"][i] == pytest.approx(d["efecto_total"][i])

    def test_hicks_compensado_mantiene_utilidad(self):
        """La canasta compensada de Hicks (punto B) está en la curva de indiferencia original."""
        for u in FAMILIAS:
            p1, p2, M = _p(u)
            d = descomposicion(u, p1, p2, M, p1 * 1.07)
            assert u.U(d["B"]["x"], d["B"]["y"]) == pytest.approx(d["U0"], rel=1e-9)
