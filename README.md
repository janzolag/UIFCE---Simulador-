# Simulador Económico — UIFCE

Unidad Informática FCE · Universidad Nacional de Colombia.

Aplicación web **100 % estática** (Angular + Plotly.js) con simuladores interactivos de
**Fundamentos de Economía**, **Microeconomía 1** y **Macroeconomía 1**. No necesita servidor:
todo el cálculo ocurre en el navegador y el sitio se publica en **GitHub Pages**.

- Microeconomía 1: los 10 simuladores están listos.
- Macroeconomía 1: los 4 simuladores de corto plazo están listos (Keynesiano, IS–LM, DA–OA y Mundell–Fleming),
  con teoría de Blanchard (2017).
- Fundamentos (6): su espacio está reservado ("En construcción").

## Estructura

```
frontend/                 Aplicación Angular (la que se despliega)
  src/app/
    core/                 catálogo de materias, tema de Plotly, formato numérico, tipos
    layout/               barra lateral
    pages/                inicio, materia, simulador (genérico), 404
    shared/               slider/selector, gráfica Plotly, ecuaciones KaTeX, resultados
    micro1/
      modelos/            matemática pura (port 1:1 de Python)
      simuladores/        un archivo por simulador: controles + gráfica + resultados
      registro.ts         lista de simuladores listos (carga bajo demanda)
      paridad.spec.ts     pruebas contra los resultados del código Python original
    macro1/
      modelos/            matemática de los modelos de corto plazo (Blanchard, 2017)
      simuladores/        un archivo por simulador
      teoria.ts           fichas del modal «Teoría» (definición, variables, choques, equilibrio)
      *.spec.ts           pruebas matemáticas, de interfaz y de casos límite
legacy/                   Versión original en Python (Dash). Solo referencia y oráculo de pruebas
tools/exportar_fixtures.py  genera los valores de referencia desde legacy/
.github/workflows/deploy.yml  despliegue automático a GitHub Pages
```

## Desarrollo local

Requisitos: [Node.js](https://nodejs.org) 22 o superior.

```bash
cd frontend
npm install
npm start            # http://localhost:4200
```

Otros comandos (dentro de `frontend/`):

```bash
npm test             # pruebas de paridad (Micro 1) y pruebas de Macro 1 (Vitest)
npm run build        # compilación de producción en frontend/dist/
```

## Desplegar en GitHub Pages

1. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions** (una sola vez).
2. Haz push a `main`:

   ```bash
   git add .
   git commit -m "Actualizar simulador"
   git push origin main
   ```

3. El workflow `.github/workflows/deploy.yml` instala dependencias, corre las pruebas, compila con
   `--base-href "/<nombre-del-repositorio>/"` y publica. El sitio queda en
   `https://<usuario>.github.io/<repositorio>/`. También puedes lanzarlo a mano desde la pestaña **Actions**.

La navegación usa rutas con `#` (`/#/micro1/monopolio`), así que los enlaces directos y el botón de
recargar funcionan en GitHub Pages sin configuración adicional.

## Agregar o modificar un simulador

1. Matemática: `frontend/src/app/<materia>/modelos/<modelo>.ts`.
2. Pantalla: `frontend/src/app/<materia>/simuladores/<id>.ts`. Exporta `SIM` con `defecto`, `grupos`
   (sliders y selectores) y `calcular(params)`, que devuelve `{ fig, panel }`.
3. Regístralo en `frontend/src/app/<materia>/registro.ts` y el catálogo (`core/catalogo.ts`) lo marca como "Listo".
   Una materia nueva se agrega también en `core/registro.ts` (simuladores y teoría).

## Pruebas de paridad con Python

`paridad.spec.ts` compara, para cada simulador y ~150 combinaciones de parámetros (valores por defecto,
extremos de los deslizadores y casos aleatorios con semilla), las trazas de la gráfica y el texto del panel
de resultados contra los del código Python original. Los valores de referencia están en
`frontend/src/app/micro1/paridad.fixtures.json`. Para regenerarlos (solo si cambia `legacy/`):

```bash
pip install -r legacy/requirements.txt
python tools/exportar_fixtures.py
```

## Versión original (Python / Dash)

Sigue disponible en `legacy/` (`cd legacy && pip install -r requirements.txt && python app.py`), pero ya no se
despliega ni se mantiene.
