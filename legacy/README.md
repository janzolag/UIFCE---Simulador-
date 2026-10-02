# Simulador Económico — UIFCE

Unidad Informática FCE · Universidad Nacional de Colombia.
Aplicación web en Python (Dash + Plotly), tema azul oscuro, con barra lateral para
**Fundamentos de Economía**, **Microeconomía 1** y **Macroeconomía 1**.

## Ejecutar

```bash
pip install -r requirements.txt
python app.py              # abrir http://127.0.0.1:8050
```

Producción: `gunicorn app:server`.

## Estructura

```
app.py                      enrutador + registro automático de callbacks
config.py                   colores, textos y plantilla Plotly "uifce" (azul oscuro)
registro.py                 lista de materias (MATERIAS)
componentes/
  barra_lateral.py          Inicio + un botón por materia, submenú de simuladores
  paginas.py                inicio, portada de materia, simulador, 404
simuladores/
  base.py                   Simulador / Materia + marco_simulador() común
  plantilla.py              EJEMPLO COMPLETO para crear un simulador
  fundamentos/__init__.py   catálogo (6 simuladores)
  micro1/__init__.py        catálogo (9 simuladores)
  macro1/__init__.py        catálogo (4 simuladores, Entrega 1)
assets/estilos.css          estilos
tests/                      pruebas (pytest + navegador)
```

## Rutas

| URL | Muestra |
|---|---|
| `/` | Inicio |
| `/macro1` | Portada de la materia con sus simuladores |
| `/macro1/is-lm` | Simulador (o su espacio "En construcción") |

## Cómo activar un simulador (p. ej. IS-LM)

1. Copia `simuladores/plantilla.py` → `simuladores/macro1/is_lm.py`.
2. Cambia `MATERIA_ID = "macro1"`, `SIM_ID = "is-lm"` y la lógica de `calcular_figura`.
3. En `simuladores/macro1/__init__.py`, en la ficha de `"is-lm"`, agrega
   `construir_layout=is_lm.construir_layout, registrar_callbacks=is_lm.registrar_callbacks`.

No hay que tocar `app.py` ni la barra lateral: el punto del menú pasa de vacío a verde
y el contador `0/4` sube solo. Usa siempre `id_componente(...)` para los ids.

## Pruebas

```bash
pip install pytest playwright && playwright install chromium
python -m pytest tests -q
```

- `test_estructura.py`: registro, rutas y callbacks vía HTTP (todas las URLs).
- `test_navegador.py`: uso real en Chromium — clic en la barra lateral, submenú,
  simulador, botón atrás, deslizadores, menú en celular; sin errores de consola.
  Guarda capturas en `capturas/`.

`SIMULADOR_DEMO=1 python app.py` muestra la plantilla dentro de Fundamentos.

## Microeconomía 1 (v0.2.0)

Los 10 simuladores de Micro 1 están activos (9 del catálogo + oligopolio). La carpeta
`simuladores/micro1/` tiene dos capas:

```
simuladores/micro1/
├── __init__.py                 catálogo: fichas de los 10 simuladores (aquí se conectan)
├── _ui.py                      piezas de interfaz compartidas: tablas, avisos, selectores
├── restriccion_presupuestal.py ┐
├── preferencias.py             │  PANTALLAS: una por simulador.
├── eleccion_optima.py          │  Cada una tiene DEF (valores iniciales),
├── slutsky.py                  │  calcular(...) -> (figura, panel de resultados),
├── demanda.py                  │  construir_layout() y registrar_callbacks(app).
├── produccion.py               │
├── costos.py                   │
├── competencia_perfecta.py     │
├── monopolio.py                │
├── oligopolio.py               ┘
└── modelos/                    MOTOR: sólo fórmulas (Monsalve 2017), sin Dash
```

**¿Qué edito?**

| Quiero cambiar…                                 | Archivo                                   |
|-------------------------------------------------|-------------------------------------------|
| una fórmula o un cálculo                        | `simuladores/micro1/modelos/<tema>.py`    |
| deslizadores, rangos o valores iniciales        | la pantalla (`construir_layout` y `DEF`)  |
| la gráfica o el texto de resultados             | la pantalla (`calcular`)                  |
| nombre, descripción o ecuación en el menú       | `simuladores/micro1/__init__.py`          |
| colores y estilos                               | `config.py` y `assets/estilos.css`        |

Después de editar, corre las pruebas:

```bash
pip install -r requirements-dev.txt
python -m pytest tests -q          # ~790 pruebas: motor, pantallas y navegador
python -m pytest tests/micro1 -q   # sólo el motor; luego regenera el informe
```

- `tests/micro1/`: triple batería del motor (ejemplos del libro, casos extremos, teoría).
- `tests/test_micro1_interfaz.py`: mueve cada deslizador a sus extremos, prueba cada opción
  de cada selector y 40 combinaciones al azar por simulador; ninguna puede romper la página.
- `python tools/generar_sustentacion.py` regenera `reports/sustentacion_micro1.html`.
