"""Simulador 3 — Elección óptima del consumidor (Monsalve, secciones 1.5-1.8, semana 2)."""
import math
import random

import pytest

from simuladores.micro1.modelos._comun import ErrorParametro
from simuladores.micro1.modelos.consumidor import (CobbDouglas, CuasilinealCuadratica,
                                                   CuasilinealRaiz, Giffen, Leontief,
                                                   Lineal, SeparableRaiz, StoneGeary)

from ._numerico import maximizar_utilidad, minimizar_gasto


class TestLibro:
    def test_ej3_cobb_douglas_xy(self):
        """Ej. 3 (p. 23-24): max xy s.a. p1x + p2y = M ⇒ x* = M/2p1, y* = M/2p2."""
        d = CobbDouglas(1, 1).marshall(4, 5, 100)
        assert (d["x"], d["y"]) == (pytest.approx(12.5), pytest.approx(10))

    def test_ej3_sem2_numerico(self):
        """Ej. 3 sem. 2 (p. 49): 3x + 2y = 45 ⇒ x* = 7.5, y* = 11.25, U = 84.375."""
        u = CobbDouglas(1, 1)
        d = u.eleccion_optima(3, 2, 45)
        assert d["x"] == pytest.approx(7.5) and d["y"] == pytest.approx(11.25)
        assert d["utilidad"] == pytest.approx(84.375)

    def test_ej4_leontief(self):
        """Ej. 4 (p. 25): Mín{x, y} ⇒ x* = y* = M/(p1 + p2)."""
        d = Leontief(1, 1).marshall(2, 3, 50)
        assert d["x"] == pytest.approx(10) and d["y"] == pytest.approx(10)

    def test_ej6_sem2_leontief_3x_2y(self):
        """Ej. 6 sem. 2 (p. 54): Mín{3x, 2y} ⇒ x* = 2M/(2p1+3p2), y* = 3M/(2p1+3p2), V = 6M/(2p1+3p2)."""
        u = Leontief(3, 2)
        p1, p2, M = 1.5, 4, 70
        d = u.marshall(p1, p2, M)
        assert d["x"] == pytest.approx(2 * M / (2 * p1 + 3 * p2))
        assert d["y"] == pytest.approx(3 * M / (2 * p1 + 3 * p2))
        assert u.indirecta(p1, p2, M) == pytest.approx(6 * M / (2 * p1 + 3 * p2))

    def test_ej5_lineal_especializa(self):
        """Ej. 5 (p. 26): con x + y, si p2 > p1 todo se gasta en x; si p1 > p2, todo en y."""
        u = Lineal(1, 1)
        assert u.marshall(2, 3, 12)["x"] == 6 and u.marshall(2, 3, 12)["y"] == 0
        assert u.marshall(3, 2, 12)["y"] == 6 and u.marshall(3, 2, 12)["x"] == 0

    def test_ej6_cd_generalizada(self):
        """Ej. 6 (p. 30): x^α y^β ⇒ x* = αM/((α+β)p1), y* = βM/((α+β)p2)."""
        d = CobbDouglas(2, 1).marshall(3, 2, 45)
        assert d["x"] == pytest.approx(10) and d["y"] == pytest.approx(7.5)

    def test_ej7_separable(self):
        """Ej. 7 (p. 31): √x + √y ⇒ x* = Mp2/(p1p2 + p1²), y* = Mp1/(p1p2 + p2²)."""
        p1, p2, M = 2, 5, 70
        d = SeparableRaiz(1, 1).marshall(p1, p2, M)
        assert d["x"] == pytest.approx(M * p2 / (p1 * p2 + p1 ** 2))
        assert d["y"] == pytest.approx(M * p1 / (p1 * p2 + p2 ** 2))

    def test_cuasilineal_raiz_demanda(self):
        """Sección 1.7 (p. 34): √x + y con p2 = 1 ⇒ x* = 1/(4p²), independiente de M."""
        u = CuasilinealRaiz(1)
        assert u.marshall(0.5, 1, 10)["x"] == pytest.approx(1.0)
        assert u.marshall(0.5, 1, 1000)["x"] == pytest.approx(1.0)

    def test_ej4_sem2_cuasilineal_numerico(self):
        """Ej. 4 sem. 2 (p. 52): M = 200, p1 = 5, p2 = 7 ⇒ x* = 0.49, y* = 28.22, U = 28.92."""
        d = CuasilinealRaiz(1).eleccion_optima(5, 7, 200)
        assert d["x"] == pytest.approx(0.49)
        assert d["y"] == pytest.approx(28.22, abs=5e-3)
        assert d["utilidad"] == pytest.approx(28.92, abs=5e-3)

    def test_cuasilineal_cuadratica_demanda_lineal(self):
        """P. 34: U = ax − (b/2)x² + y ⇒ p = a − bx (demanda lineal, saciedad en a/b)."""
        u = CuasilinealCuadratica(10, 2)
        assert u.marshall(4, 1, 100)["x"] == pytest.approx(3)

    def test_ej5_sem2_stone_geary(self):
        """Ej. 5 sem. 2 (p. 53): (x−1)²(y−3)⁴ ⇒ x* = 1 + (M−p1−3p2)/(3p1), y* = 3 + 2(M−p1−3p2)/(3p2)."""
        p1, p2, M = 2, 1, 20
        d = StoneGeary(2, 4, 1, 3).marshall(p1, p2, M)
        m = M - p1 - 3 * p2
        assert d["x"] == pytest.approx(1 + m / (3 * p1))
        assert d["y"] == pytest.approx(3 + 2 * m / (3 * p2))

    def test_ej5_sem3_giffen_demandas(self):
        """Ej. 5 sem. 3 (p. 76): x* = 2 + (2p2 − M)/p1, y* = 2(M − p1)/p2 − 2."""
        d = Giffen().marshall(2, 1, 3.5)
        assert d["x"] == pytest.approx(1.25) and d["y"] == pytest.approx(1.0)


class TestExtremos:
    def test_lineal_precios_relativos_iguales(self):
        """Ej. 5 (p. 26): si p1/a = p2/b cualquier canasta de la recta es óptima; el simulador lo marca 'indeterminado'."""
        d = Lineal(1, 1).marshall(2, 2, 10)
        assert d["tipo"] == "indeterminado"
        assert d["x_min"] == 0 and d["x_max"] == 5
        assert 2 * d["x"] + 2 * d["y"] == pytest.approx(10)

    def test_cuasilineal_presupuesto_bajo_esquina(self):
        """Nota 16 y fig. 2.4 (p. 33, 51): si M < p2²/(4p1) la solución es de esquina x = M/p1, y = 0."""
        u = CuasilinealRaiz(1)
        p1, p2 = 5, 7
        umbral = p2 ** 2 / (4 * p1)
        assert u.ingreso_minimo_interior(p1, p2) == pytest.approx(umbral)
        d = u.marshall(p1, p2, umbral * 0.5)
        assert d["tipo"] == "esquina_x" and d["y"] == 0
        assert d["x"] == pytest.approx(umbral * 0.5 / p1)
        # La esquina coincide con el optimizador numérico
        xn, yn = maximizar_utilidad(u.U, p1, p2, umbral * 0.5)
        assert xn == pytest.approx(d["x"], rel=1e-6)

    def test_cuasilineal_continuidad_en_el_umbral(self):
        """La demanda no salta en el umbral de ingreso (la gráfica no debe tener un brinco)."""
        u = CuasilinealRaiz(1)
        Mu = u.ingreso_minimo_interior(5, 7)
        a, b = u.marshall(5, 7, Mu * (1 - 1e-9)), u.marshall(5, 7, Mu * (1 + 1e-9))
        assert a["x"] == pytest.approx(b["x"], rel=1e-6)

    def test_cuasilineal_cuadratica_precio_sobre_maximo(self):
        """Si p1/p2 ≥ a, la demanda de x es cero (precio mayor que la disposición máxima a pagar)."""
        d = CuasilinealCuadratica(10, 2).marshall(12, 1, 50)
        assert d["x"] == 0 and d["y"] == 50

    def test_stone_geary_sin_subsistencia(self):
        """M ≤ p1x0 + p2y0: no se alcanza el consumo mínimo; el simulador debe avisar (nota 7, p. 53)."""
        with pytest.raises(ErrorParametro):
            StoneGeary(2, 4, 1, 3).marshall(2, 1, 5)

    def test_giffen_fuera_de_region(self):
        """Fuera de p1 + p2 < M < p1 + 2p2 las fórmulas del ej. 5 no son válidas."""
        with pytest.raises(ErrorParametro):
            Giffen().marshall(2, 1, 10)

    def test_M_cero(self):
        """M = 0: la canasta óptima es (0, 0) en Cobb-Douglas, Leontief y lineal."""
        for u in (CobbDouglas(1, 2), Leontief(1, 1), Lineal(1, 3)):
            d = u.marshall(2, 3, 0)
            assert d["x"] == 0 and d["y"] == 0

    def test_M_cero_eleccion_optima_sin_division_por_cero(self):
        """Hallado con la pantalla: con M = 0 la canasta es (0, 0) y la TMS se reporta como no definida (antes: división por cero)."""
        for u in (CobbDouglas(1, 1), SeparableRaiz(1, 1), Leontief(1, 2)):
            d = u.eleccion_optima(2, 3, 0)
            assert d["x"] == 0 and d["y"] == 0

    def test_precio_extremo(self):
        """p1 = 10⁶: la demanda de x es casi cero pero se sigue cumpliendo el presupuesto."""
        d = CobbDouglas(1, 1).marshall(1e6, 1, 100)
        assert d["x"] == pytest.approx(5e-5)
        assert 1e6 * d["x"] + d["y"] == pytest.approx(100)

    def test_alpha_extremo(self):
        """α ≫ β: casi todo el gasto se va a x (participación α/(α+β))."""
        d = CobbDouglas(1000, 1).marshall(1, 1, 100)
        assert d["x"] == pytest.approx(100 * 1000 / 1001)


CASOS = [
    (CobbDouglas(1, 1), 3, 2, 45), (CobbDouglas(0.3, 1.7), 1.2, 5, 80),
    (SeparableRaiz(1, 1), 2, 5, 70), (SeparableRaiz(2, 0.5), 1, 1, 10),
    (CuasilinealRaiz(1), 5, 7, 200), (CuasilinealRaiz(3), 0.5, 2, 1.0),
    (CuasilinealCuadratica(10, 2), 4, 1, 100), (StoneGeary(2, 4, 1, 3), 2, 1, 20),
    (Leontief(3, 2), 1.5, 4, 70), (Lineal(1, 2), 1, 3, 30), (Lineal(3, 1), 1, 1, 12),
    (Giffen(), 2, 1, 3.5),
]


class TestTeoria:
    @pytest.mark.parametrize("u,p1,p2,M", CASOS, ids=lambda v: getattr(v, "nombre", str(v)))
    def test_optimizador_numerico_confirma(self, u, p1, p2, M):
        """Tercer testigo: un optimizador numérico que sólo conoce U(x,y) llega a la misma utilidad máxima."""
        d = u.marshall(p1, p2, M)
        xn, yn = maximizar_utilidad(u.U, p1, p2, M)
        assert u.U(d["x"], d["y"]) == pytest.approx(u.U(xn, yn), rel=1e-7, abs=1e-9)
        assert u.U(d["x"], d["y"]) >= u.U(xn, yn) - 1e-7

    @pytest.mark.parametrize("u,p1,p2,M", CASOS, ids=lambda v: getattr(v, "nombre", str(v)))
    def test_ley_de_walras(self, u, p1, p2, M):
        """El consumidor gasta todo el presupuesto: p1x* + p2y* = M (nota 8, p. 20)."""
        d = u.marshall(p1, p2, M)
        assert p1 * d["x"] + p2 * d["y"] == pytest.approx(M)

    @pytest.mark.parametrize("u,p1,p2,M", CASOS, ids=lambda v: getattr(v, "nombre", str(v)))
    @pytest.mark.parametrize("t", [0.5, 3.0, 17.0])
    def test_sin_ilusion_monetaria(self, u, p1, p2, M, t):
        """P. 24: las demandas marshallianas son homogéneas de grado 0 en (p1, p2, M)."""
        a, b = u.marshall(p1, p2, M), u.marshall(t * p1, t * p2, t * M)
        assert a["x"] == pytest.approx(b["x"]) and a["y"] == pytest.approx(b["y"])

    @pytest.mark.parametrize("u,p1,p2,M", [c for c in CASOS if c[0].propiedades.get("diferenciable")
                                           and not isinstance(c[0], Lineal)],
                             ids=lambda v: getattr(v, "nombre", str(v)))
    def test_ecuacion_de_jevons(self, u, p1, p2, M):
        """Solución interior: TMS = p1/p2 (ecuación de equilibrio de Jevons, p. 29)."""
        d = u.eleccion_optima(p1, p2, M)
        if d["tipo"] == "interior":
            assert d["tms"] == pytest.approx(p1 / p2, rel=1e-8)

    @pytest.mark.parametrize("semilla", range(25))
    def test_aleatorio_cd_vs_numerico(self, semilla):
        """25 combinaciones aleatorias de (α, β, p1, p2, M): fórmula = optimizador."""
        r = random.Random(semilla)
        u = CobbDouglas(r.uniform(0.1, 3), r.uniform(0.1, 3))
        p1, p2, M = r.uniform(0.1, 20), r.uniform(0.1, 20), r.uniform(1, 500)
        d = u.marshall(p1, p2, M)
        xn, yn = maximizar_utilidad(u.U, p1, p2, M)
        assert d["x"] == pytest.approx(xn, rel=1e-4)

    def test_dualidad_V_y_e(self):
        """Dualidad (p. 47): e(p, V(p, M)) = M y V(p, e(p, U0)) = U0 en todas las familias."""
        for u, p1, p2, M in CASOS:
            if isinstance(u, Lineal) and u.a / p1 == u.b / p2:
                continue
            V = u.indirecta(p1, p2, M)
            assert u.gasto(p1, p2, V) == pytest.approx(M, rel=1e-9)

    @pytest.mark.parametrize("u,p1,p2,U0", [(CobbDouglas(1, 1), 3.6, 2, 84.375), (CobbDouglas(2, 1), 3.6, 2, 750),
                                            (SeparableRaiz(1, 2), 2, 3, 8), (StoneGeary(2, 4, 1, 3), 2, 1, 50),
                                            (CuasilinealRaiz(1), 5.3, 7, 28.92)],
                             ids=lambda v: getattr(v, "nombre", str(v)))
    def test_gasto_minimo_confirmado_numericamente(self, u, p1, p2, U0):
        """Tercer testigo del problema dual (semana 2): e(p, U0) = mín p1x + p2y s.a. U(x, y) ≥ U0, calculado sin fórmulas."""
        e = u.gasto(p1, p2, U0)
        en = minimizar_gasto(u.U, p1, p2, U0, x_max=4 * max(1.0, u.hicks(p1, p2, U0)[0]))
        assert e == pytest.approx(en, rel=1e-6)
