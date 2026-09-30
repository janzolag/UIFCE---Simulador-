"""Simulador 1 — Restricción presupuestaria (Monsalve, sección 1.4)."""
import random

import pytest

from simuladores.micro1.modelos import presupuesto as pr
from simuladores.micro1.modelos._comun import ErrorParametro


class TestLibro:
    def test_interceptos_y_pendiente(self):
        """Fig. 1.10 (p. 20): interceptos M/p1 y M/p2, pendiente −p1/p2. Con la recta del ej. 3 sem. 2 (3x + 2y = 45): 15, 22.5 y −1.5."""
        r = pr.recta(3, 2, 45)
        assert r["intercepto_x"] == 15 and r["intercepto_y"] == 22.5
        assert r["pendiente"] == -1.5

    def test_aumento_de_M_desplaza_paralela(self):
        """Fig. 1.11 (p. 21): si M aumenta con precios fijos, la recta se desplaza paralelamente hacia arriba."""
        c = pr.cambio(3, 2, 45, Mn=60)
        assert c["tipo"] == "desplazamiento_paralelo"
        assert c["despues"]["pendiente"] == c["antes"]["pendiente"]
        assert c["area_perdida"] == 0 and c["area_ganada"] > 0

    def test_aumento_de_p2_rota_sobre_eje_x(self):
        """Fig. 1.12 (p. 21): si sube p2 la recta gira manteniendo M/p1 fijo."""
        c = pr.cambio(3, 2, 45, p2n=3)
        assert c["tipo"] == "rotacion_sobre_eje_x"
        assert c["despues"]["intercepto_x"] == c["antes"]["intercepto_x"]

    def test_aumento_de_p1_quita_canastas(self):
        """Fig. 1.13-1.14 (p. 22): subir p1 vuelve inasequibles canastas (área gris) y no crea nuevas. Ej. 3 sem. 2: p1 3 → 3.6."""
        c = pr.cambio(3, 2, 45, p1n=3.6)
        assert c["tipo"] == "rotacion_sobre_eje_y"
        # Triángulo perdido: base (15 − 12.5) y altura 22.5 ⇒ 28.125
        assert c["area_perdida"] == pytest.approx(0.5 * (15 - 12.5) * 22.5)
        assert c["area_ganada"] == pytest.approx(0.0, abs=1e-12)


class TestExtremos:
    def test_M_cero_conjunto_es_el_origen(self):
        """M = 0: el conjunto presupuestal se reduce a la canasta (0, 0)."""
        r = pr.recta(2, 5, 0)
        assert r["intercepto_x"] == 0 and r["area_conjunto"] == 0
        assert pr.clasificar_canasta(0, 0, 2, 5, 0) == "sobre_la_recta"

    @pytest.mark.parametrize("p1,p2,M", [(0, 1, 10), (-1, 1, 10), (1, 0, 10),
                                          (1, 1, -5), (float("nan"), 1, 1),
                                          (float("inf"), 1, 1)])
    def test_parametros_invalidos_dan_mensaje(self, p1, p2, M):
        """Precios ≤ 0, M < 0, NaN o infinito: el simulador debe rechazarlos con un mensaje en español, no fallar en silencio."""
        with pytest.raises(ErrorParametro):
            pr.recta(p1, p2, M)

    def test_precio_casi_cero_intercepto_enorme(self):
        """p1 → 0: el intercepto en x crece sin límite pero sigue siendo finito (la gráfica debe reescalar)."""
        r = pr.recta(1e-9, 1, 10)
        assert r["intercepto_x"] == pytest.approx(1e10)

    def test_cambio_proporcional_no_cambia_nada(self):
        """Duplicar p1, p2 y M deja la recta idéntica (ausencia de ilusión monetaria, p. 24)."""
        c = pr.cambio(3, 2, 45, p1n=6, p2n=4, Mn=90)
        assert c["tipo"] == "sin_cambio"
        assert c["area_ganada"] == pytest.approx(0) and c["area_perdida"] == pytest.approx(0)

    def test_cambio_combinado_rectas_que_se_cruzan(self):
        """Suben p1 y baja p2: se ganan y pierden canastas a la vez (rectas cruzadas)."""
        c = pr.cambio(1, 1, 10, p1n=2, p2n=0.5)
        assert c["tipo"] == "cambio_combinado"
        assert c["area_ganada"] > 0 and c["area_perdida"] > 0
        assert c["area_ganada"] - c["area_perdida"] == pytest.approx(c["cambio_area_neto"])

    def test_clasificacion_canasta(self):
        """Canastas dentro, sobre y fuera de la recta."""
        assert pr.clasificar_canasta(1, 1, 3, 2, 45) == "asequible_interior"
        assert pr.clasificar_canasta(15, 0, 3, 2, 45) == "sobre_la_recta"
        assert pr.clasificar_canasta(15, 1, 3, 2, 45) == "inasequible"


class TestTeoria:
    @pytest.mark.parametrize("semilla", range(20))
    def test_homogeneidad_grado_cero(self, semilla):
        """La recta es homogénea de grado 0 en (p1, p2, M): multiplicar todo por t > 0 no la cambia."""
        rnd = random.Random(semilla)
        p1, p2, M, t = (rnd.uniform(0.1, 50) for _ in range(4))
        a, b = pr.recta(p1, p2, M), pr.recta(t * p1, t * p2, t * M)
        for k in ("intercepto_x", "intercepto_y", "pendiente"):
            assert a[k] == pytest.approx(b[k])

    @pytest.mark.parametrize("semilla", range(20))
    def test_area_neta_coincide_con_formula(self, semilla):
        """Área ganada − área perdida = M'²/(2p1'p2') − M²/(2p1p2) para cualquier cambio."""
        rnd = random.Random(100 + semilla)
        v = [rnd.uniform(0.2, 20) for _ in range(6)]
        c = pr.cambio(v[0], v[1], v[2], p1n=v[3], p2n=v[4], Mn=v[5])
        assert c["area_ganada"] - c["area_perdida"] == pytest.approx(c["cambio_area_neto"], rel=1e-9, abs=1e-9)
        assert c["area_ganada"] >= -1e-12 and c["area_perdida"] >= -1e-12

    @pytest.mark.parametrize("semilla", range(10))
    def test_puntos_de_la_recta_gastan_M(self, semilla):
        """Todo punto (x, y(x)) con 0 ≤ x ≤ M/p1 cumple p1x + p2y = M."""
        rnd = random.Random(semilla)
        p1, p2, M = rnd.uniform(0.5, 9), rnd.uniform(0.5, 9), rnd.uniform(1, 100)
        x = rnd.uniform(0, M / p1)
        assert p1 * x + p2 * pr.y_sobre_recta(x, p1, p2, M) == pytest.approx(M)
