"""Simulador 2 — Preferencias y curvas de indiferencia (Monsalve, secciones 1.2-1.3)."""
import math
import random

import pytest

from simuladores.micro1.modelos._comun import ErrorParametro
from simuladores.micro1.modelos.consumidor import (CATALOGO, CobbDouglas, CuasilinealRaiz,
                                                   Giffen, Leontief, Lineal,
                                                   SeparableRaiz, StoneGeary)

FAMILIAS_DIF = [CobbDouglas(0.3, 0.7), CobbDouglas(2, 1), CuasilinealRaiz(1),
                SeparableRaiz(1, 2), StoneGeary(2, 4, 1, 3), Lineal(2, 3)]


class TestLibro:
    def test_cd_hiperbolas(self):
        """Ej. 2a (p. 16): U = xy = U0 ⇒ y = U0/x. Con U0 = 2 y x = 4, y = 0.5."""
        assert CobbDouglas(1, 1).curva_indiferencia(2, 4) == pytest.approx(0.5)

    def test_leontief_escuadra(self):
        """Ej. 2b (p. 16-17): Mín{x, y} = 1 contiene (1,1), (1,2), (1,3), (2,1), (3,1)…"""
        u = Leontief(1, 1)
        for x, y in [(1, 1), (1, 2), (1, 3), (2, 1), (3, 1), (4, 1)]:
            assert u.U(x, y) == 1
        assert u.curva_indiferencia(1, 3) == 1            # tramo horizontal
        assert u.curva_indiferencia(1, 1) == math.inf     # vértice / tramo vertical

    def test_lineal_rectas(self):
        """Ej. 2c (p. 17): U = x + y ⇒ y = U0 − x."""
        assert Lineal(1, 1).curva_indiferencia(3, 1) == 2

    def test_cuasilineal_parabolas(self):
        """Ej. 2d (p. 17): √x + y = U0 ⇒ y = U0 − √x."""
        assert CuasilinealRaiz(1).curva_indiferencia(3, 4) == pytest.approx(1)

    def test_separable(self):
        """Ej. 2e (p. 17-18): √x + √y = U0 ⇒ y = (U0 − √x)²."""
        assert SeparableRaiz(1, 1).curva_indiferencia(3, 4) == pytest.approx(1)

    def test_elasticidad_utilidad_cd(self):
        """Ej. 6 sem. 3 (p. 78): en x^α y^β, α y β son las elasticidades de la utilidad."""
        u = CobbDouglas(0.3, 0.7)
        x, y = 2.0, 5.0
        umx, umy = u.umg(x, y)
        assert umx * x / u.U(x, y) == pytest.approx(0.3)
        assert umy * y / u.U(x, y) == pytest.approx(0.7)

    def test_tms_cobb_douglas(self):
        """Ej. 6 (p. 30): TMS de x^α y^β = αy/(βx)."""
        assert CobbDouglas(2, 1).tms(3, 4) == pytest.approx(2 * 4 / (1 * 3))

    def test_monotonia_leontief_solo_debil(self):
        """Nota 6 (p. 18): la Leontief no es estrictamente monótona en cada argumento."""
        u = Leontief(1, 1)
        assert u.U(2, 1) == u.U(1, 1)          # más x, misma utilidad
        assert u.propiedades["monotona"] is False


class TestExtremos:
    def test_nivel_cero_cd_son_los_ejes(self):
        """Ej. 2a: U0 = 0 en Cobb-Douglas son los ejes; la curva no se dibuja en el interior."""
        u = CobbDouglas(1, 1)
        assert math.isnan(u.curva_indiferencia(0, 1))
        assert u.U(0, 5) == 0 and u.U(5, 0) == 0

    def test_nivel_cero_lineal_es_el_origen(self):
        """Ej. 2c: la 'curva' U0 = 0 de x + y es sólo (0, 0)."""
        u = Lineal(1, 1)
        assert u.curva_indiferencia(0, 0) == 0
        assert math.isnan(u.curva_indiferencia(0, 0.1))

    def test_tms_en_los_ejes(self):
        """TMS en x → 0 con Cobb-Douglas crece sin límite; en cuasilineal √x también."""
        assert CobbDouglas(1, 1).tms(1e-9, 1) > 1e8
        assert CuasilinealRaiz(1).tms(1e-12, 1) > 1e5

    def test_leontief_no_diferenciable(self):
        """Leontief: la TMS no existe (el simulador debe mostrar 'no definida')."""
        assert Leontief(1, 1).tms(1, 1) is None

    @pytest.mark.parametrize("cls,args", [(CobbDouglas, (0, 1)), (CobbDouglas, (1, -1)),
                                           (Leontief, (0, 1)), (Lineal, (1, 0)),
                                           (StoneGeary, (1, 1, -1, 0))])
    def test_parametros_invalidos(self, cls, args):
        """Parámetros no positivos se rechazan con ErrorParametro."""
        with pytest.raises(ErrorParametro):
            cls(*args)

    def test_giffen_fuera_de_dominio(self):
        """U = ln(x−1) − 2 ln(2−y) no está definida para x ≤ 1 o y ≥ 2 (utilidad −∞)."""
        g = Giffen()
        assert g.U(1, 1) == -math.inf and g.U(2, 2) == -math.inf
        assert math.isnan(g.curva_indiferencia(0, 0.5))

    def test_cd_alpha_muy_pequeno(self):
        """α → 0: las curvas se vuelven casi horizontales (x casi no aporta)."""
        u = CobbDouglas(1e-6, 1)
        assert u.curva_indiferencia(2, 1) == pytest.approx(u.curva_indiferencia(2, 1000), rel=1e-3)


class TestTeoria:
    @pytest.mark.parametrize("u", FAMILIAS_DIF, ids=lambda u: u.nombre)
    def test_curva_consistente_con_U(self, u):
        """Cada punto de la curva de indiferencia dibujada tiene exactamente la utilidad U0."""
        base = (3.0, 5.0) if not isinstance(u, StoneGeary) else (3.0, 6.0)
        U0 = u.U(*base)
        for x in [base[0] * f for f in (0.5, 0.8, 1, 1.3, 2)]:
            y = u.curva_indiferencia(U0, x)
            if math.isfinite(y):
                assert u.U(x, y) == pytest.approx(U0, rel=1e-9)

    @pytest.mark.parametrize("u", FAMILIAS_DIF, ids=lambda u: u.nombre)
    def test_pendiente_curva_es_menos_tms(self, u):
        """dy/dx sobre la curva = −TMS (definición de TMS, p. 29)."""
        x0, y0 = (3.0, 5.0) if not isinstance(u, StoneGeary) else (3.0, 6.0)
        U0 = u.U(x0, y0)
        h = 1e-6
        dy = (u.curva_indiferencia(U0, x0 + h) - u.curva_indiferencia(U0, x0 - h)) / (2 * h)
        assert dy == pytest.approx(-u.tms(x0, y0), rel=1e-5)

    @pytest.mark.parametrize("nombre", ["cobb_douglas", "lineal", "cuasilineal_raiz",
                                        "separable_raiz", "stone_geary", "leontief"])
    def test_propiedad_monotonia_declarada(self, nombre):
        """La propiedad 'monótona' declarada coincide con la verificación numérica (estricta en cada argumento)."""
        u = CATALOGO[nombre]()
        rnd = random.Random(1)
        estricta = True
        for _ in range(200):
            x, y = rnd.uniform(1.5, 9), rnd.uniform(3.5, 9)
            if not (u.U(x + 0.1, y) > u.U(x, y) and u.U(x, y + 0.1) > u.U(x, y)):
                estricta = False
        assert estricta == u.propiedades["monotona"]

    @pytest.mark.parametrize("u", FAMILIAS_DIF + [Leontief(1, 2)], ids=lambda u: u.nombre)
    def test_convexidad_dieta_balanceada(self, u):
        """Hipótesis iv (p. 19): la combinación λA + (1−λ)B de dos canastas indiferentes es al menos tan buena."""
        base = (3.0, 5.0) if not isinstance(u, StoneGeary) else (3.0, 6.0)
        U0 = u.U(*base)
        xa, xb = base[0] * 0.6, base[0] * 1.7
        ya, yb = u.curva_indiferencia(U0, xa), u.curva_indiferencia(U0, xb)
        if isinstance(u, Leontief):
            ya, yb = 10.0, U0 / u.b      # dos puntos de la escuadra
            xa, xb = U0 / u.a, 10.0
        for lam in (0.25, 0.5, 0.75):
            xm, ym = lam * xa + (1 - lam) * xb, lam * ya + (1 - lam) * yb
            assert u.U(xm, ym) >= U0 - 1e-9

    @pytest.mark.parametrize("u", [CobbDouglas(0.4, 1.2), SeparableRaiz(1, 3), Lineal(2, 5)],
                             ids=lambda u: u.nombre)
    def test_homotetica_tms_constante_en_rayos(self, u):
        """Preferencias homotéticas (sección 3.6): la TMS es constante a lo largo de un rayo y/x = k."""
        for k in (0.5, 2.0):
            t1 = u.tms(1.0, k)
            for t in (2.0, 7.5, 30.0):
                assert u.tms(t, t * k) == pytest.approx(t1, rel=1e-9)

    def test_cuasilineal_tms_depende_solo_de_x(self):
        """Cuasilineal: la TMS no depende de y (curvas paralelas verticalmente; p. 33)."""
        u = CuasilinealRaiz(2)
        assert u.tms(4, 1) == pytest.approx(u.tms(4, 100))

    def test_transformacion_monotona_no_cambia_tms(self):
        """Sección 2.3 (p. 56): ln U y U representan las mismas preferencias (misma TMS)."""
        u = CobbDouglas(2, 3)
        x, y, h = 1.7, 2.9, 1e-6
        lnU = lambda a, b: math.log(u.U(a, b))
        gx = (lnU(x + h, y) - lnU(x - h, y)) / (2 * h)
        gy = (lnU(x, y + h) - lnU(x, y - h)) / (2 * h)
        assert gx / gy == pytest.approx(u.tms(x, y), rel=1e-6)
