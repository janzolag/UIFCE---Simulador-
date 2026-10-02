# Simulador Económico UIFCE

**Aplicación web para enseñanza de modelos económicos | Python + Dash + Plotly**

---

## 🎯 ¿Qué es?

Una aplicación web interactiva que permite a estudiantes y profesores simular **modelos económicos** en tiempo real:

- **Manipular parámetros** con deslizadores
- **Ver gráficas dinámicas** que reaccionan al instante
- **Entender conceptos** como demanda, oferta, monopolio, competencia y macroeconomía
- **Explorar casos extremos** y validar intuición teórica

Desarrollada por la **Unidad Informática de la Facultad de Ciencias Económicas** de la Universidad Nacional de Colombia.

---

## 📚 Contenido

### Microeconomía 1 ✅ (Completo)

10 simuladores activos:

1. **Restricción presupuestal** → Conjunto factible del consumidor
2. **Preferencias y curvas de indiferencia** → Cobb-Douglas, Leontief, sustitutos perfectos
3. **Elección óptima del consumidor** → Tangencia y soluciones de esquina
4. **Efectos ingreso y sustitución (Slutsky)** → Descomposición ante cambios de precio
5. **Demanda individual y de mercado** → Elasticidades, excedentes, bienestar
6. **Tecnología e isocuantas** → Función de producción, productividad marginal
7. **Costos de corto y largo plazo** → CT, CMg, envolvente
8. **Competencia perfecta** → Maximización de beneficios, oferta
9. **Monopolio** → Poder de mercado, pérdida de eficiencia
10. **Oligopolio** → Cournot, Stackelberg, cartel, Bertrand

### Fundamentos de Economía (En construcción)

6 simuladores con ecuación pero sin lógica:
- Equilibrio de mercado
- Elasticidades
- Excedentes del consumidor y productor
- Impuestos, subsidios y controles de precios
- Frontera de posibilidades de producción
- Ventaja comparativa y comercio

### Macroeconomía 1 (En construcción)

4 simuladores:
- Modelo Keynesiano (Gasto–Ingreso)
- IS–LM en economía cerrada
- DA–OA (demanda y oferta agregadas)
- Mundell–Fleming (IS–LM–BP)

---

## 🚀 Comienza rápido

### Instalar y ejecutar

```bash
git clone https://github.com/janzolag/UIFCE---Simulador-.git
cd UIFCE---Simulador-/simulador_uifce
pip install -r requirements.txt
python app.py
```

Abre **http://127.0.0.1:8050** en tu navegador.

### Desplegar a producción

```bash
gunicorn app:server
```

Funciona en:
- **Heroku** / **Railway** / **Render** (PaaS)
- Tu servidor (Apache, Nginx + Gunicorn)
- Docker

---

## 📁 Estructura del proyecto

```
simulador_uifce/
├── app.py                      # Enrutador principal + registro de callbacks
├── config.py                   # Paleta de colores + plantilla Plotly "uifce"
├── registro.py                 # Lista única de materias (MATERIAS)
│
├── componentes/
│   ├── barra_lateral.py        # Navegación y menú
│   └── paginas.py              # Inicio, portada, simulador, 404
│
├── simuladores/
│   ├── base.py                 # Contrato Simulador/Materia + utilidades
│   ├── plantilla.py            # Ejemplo completo para crear uno nuevo
│   │
│   ├── fundamentos/            # 6 simuladores (En construcción)
│   │   └── __init__.py
│   │
│   ├── micro1/                 # 10 simuladores activos
│   │   ├── __init__.py         # Catálogo
│   │   ├── _ui.py              # UI compartida (tablas, avisos, selectores)
│   │   ├── restriccion_presupuestal.py
│   │   ├── preferencias.py
│   │   ├── eleccion_optima.py
│   │   ├── ... (otros 6 simuladores)
│   │   │
│   │   └── modelos/            # Motor matemático (sin Dash)
│   │       ├── consumidor.py
│   │       ├── demanda.py
│   │       ├── costos.py
│   │       ├── monopolio.py
│   │       └── ... (otros modelos)
│   │
│   └── macro1/                 # 4 simuladores (En construcción)
│       └── __init__.py
│
├── tests/
│   ├── test_estructura.py      # URLs, rutas, callbacks
│   ├── test_navegador.py       # Playwright: UI real en Chromium
│   ├── test_micro1_interfaz.py # Deslizadores y selectores
│   │
│   └── micro1/                 # ~670 pruebas del motor
│       ├── test_01_presupuesto.py
│       ├── test_02_preferencias.py
│       ├── ... (otros temas)
│       └── _numerico.py        # Utilidades de comparación numérica
│
├── tools/
│   ├── generar_sustentacion.py # Genera reportes HTML
│   └── plantilla_sustentacion.html
│
├── reports/
│   ├── sustentacion_micro1.html
│   └── resultados_micro1.json
│
├── assets/
│   └── estilos.css             # Estilos globales
│
├── capturas/                   # Screenshots de pruebas
│
├── requirements.txt            # Dependencias de producción
├── requirements-dev.txt        # pytest, playwright, etc.
└── README.md
```

---

## 🛠️ ¿Cómo agregar un simulador nuevo?

### 1. Copia la plantilla

```bash
cp simuladores/plantilla.py simuladores/macro1/is_lm.py
```

### 2. Edita el nuevo archivo

```python
MATERIA_ID, SIM_ID = "macro1", "is-lm"
DEF = dict(g=10, ...)  # Parámetros iniciales

def calcular(g, ...):
    # Tu lógica económica aquí
    return figura, panel_resultados

def construir_layout():
    # Controles (sliders, selectores)
    # Gráfica principal
    # Panel de resultados

def registrar_callbacks(app):
    # @app.callback(...) que conecta controles → calcular()
```

### 3. Regístralo en el catálogo

Edita `simuladores/macro1/__init__.py`:

```python
from simuladores.macro1 import is_lm

MATERIA = Materia(..., simuladores=[
    Simulador("is-lm", "IS–LM", "...",
              r"$Y = ...$",
              construir_layout=is_lm.construir_layout,
              registrar_callbacks=is_lm.registrar_callbacks),
])
```

**¡Listo!** La barra lateral lo mostrará automáticamente.

---

## ✅ Pruebas

Hay **~790 pruebas automáticas**:

```bash
# Todas las pruebas
python -m pytest tests -q

# Solo el motor de Micro 1
python -m pytest tests/micro1 -q

# Con coverage
pip install pytest-cov
python -m pytest tests --cov=simuladores
```

### Qué se prueba

- **Motor matemático**: ejemplos del libro, casos extremos, propiedades teóricas
- **Interfaz**: cada deslizador en sus extremos, combinaciones al azar
- **Navegación**: todas las URLs, menú en móvil, sin errores de consola

---

## 🎨 Personalización

### Cambiar colores

Edita tanto **`config.py`** como **`assets/estilos.css`** (están duplicados):

```python
# config.py
COLORES = {
    "fondo": "#0B1D3A",
    "acento": "#F5C451",
    # ...
}
```

```css
/* assets/estilos.css */
:root {
    --color-fondo: #0B1D3A;
    --color-acento: #F5C451;
}
```

### Cambiar título o descripción

En `config.py`:

```python
TITULO_APP = "Mi Simulador"
VERSION = "1.0.0"
```

---

## 📊 Tecnología

| Capa | Tecnología |
|---|---|
| **Aplicación web** | Dash 4 (Python + Flask) |
| **Gráficas** | Plotly 6 |
| **Cálculos** | NumPy 1.26 |
| **Servidor** | Gunicorn 22 |
| **Pruebas** | pytest + Playwright |
| **Estilo** | CSS + Figma (tema azul) |

---

## 📖 Referencias

- **Monsalve (2017)**: Introducción a la Teoría del Equilibrio General
- **Programa oficial**: Facultad de Ciencias Económicas, UN

---

## 👥 Quién lo hace

**Unidad Informática FCE** · Universidad Nacional de Colombia

Contacto: `janzolag@unal.edu.co`

---

## 📄 Licencia

Todos los derechos reservados © 2026 FCE, UN.

