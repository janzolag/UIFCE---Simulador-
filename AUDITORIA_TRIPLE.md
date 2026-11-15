# Auditoría triple · todos los simuladores

Fecha: 2026-11-15. Alcance: los 38 simuladores publicados (Fundamentos 9, Micro 1 8, Micro 2 7, Micro 3 4, Macro 1 4, Macro 2 6), sus fichas de Teoría y los 30 retos del Modo Desafío.

Resultado: **6 fallas corregidas**, ninguna de fórmulas ni equilibrios. Pruebas: 1194 en verde y 3 casos de paridad omitidos a propósito (ver más abajo). `tsc` sin errores (app y specs), `ng build` de producción sin errores.

Pruebas nuevas en `frontend/src/app/auditoria-triple.spec.ts` (160 pruebas, todas las materias):

- **Contrato de controles.** El estado por defecto de cada simulador cae dentro del rango de cada deslizador y sobre su paso. Cada selector apunta a una opción que existe.
- **Barrido de propiedades.** Semilla fija y rejilla real de los deslizadores: todo al mínimo, todo al máximo, cada deslizador solo en sus extremos, cada opción y cada planteamiento, más 120 muestras aleatorias por simulador. Se exige:
  - que solo se lance `ErrorParametro`, porque cualquier otra excepción tumba la página;
  - que no aparezcan NaN ni Infinity en las trazas;
  - que los rangos de los ejes sean finitos y crecientes;
  - que ninguna curva visible en la leyenda quede sin nombre («trace N»);
  - que ningún texto muestre «NaN», «undefined» ni «Infinity».
- **Fichas de Teoría** (una por cada planteamiento):
  - las fórmulas y los símbolos compilan en KaTeX con `throwOnError`;
  - los símbolos de la tabla de variables no se repiten (la tabla usa `track v.simbolo`);
  - el ejercicio usa controles reales dentro de su rango;
  - «Cargar en la gráfica» calcula sin aviso de error.
- **Catálogo.** Las ecuaciones de las tarjetas compilan, no hay simuladores «listos» sin cargador (enlaces rotos en el menú) ni cargadores fuera del catálogo.
- **Regresiones** de cada corrección de esta auditoría.

## Pasada 1 · Técnica

### Equilibrio analítico = punto graficado (4 decimales)

Se volcaron los puntos marcados en cada gráfica (estado por defecto y cada planteamiento) y se compararon a mano con la solución cerrada. Todos coinciden:

| Simulador | Solución cerrada | Graficado |
|---|---|---|
| FPP | y = Y·(1 − (x/X)ᵏ)^{1/k} = 2400 | (600, 2400) |
| Ventaja comparativa | Ganadero 18 carne / 12 papas; intercambio 5 carne × 15 papas | (12, 18), (27, 13), (17, 5) |
| Oferta-demanda, excedentes, controles | P* = (a − c)/(b + d) = 18, Q* = 64; Pmax = 12 → Qd = 76, Qs = 46 | idéntico |
| Impuestos (t = 5) | Pc = 21, Pv = 16, Q = 58, recaudo 290 | idéntico |
| Externalidad negativa (e = 10) | P = 24, Q = 52 | idéntico |
| Elasticidades | elasticidad unitaria en P = a/2b = 3.5 | (7, 3.5) |
| Elección óptima CD | x = M/2p₁ = 7.5, y = 11.25; hicksiana con Ū = 1.5·U₀: 9.1856 | idéntico |
| Slutsky (Micro 1, x²y) | A (10, 7.5); B Slutsky (9.4444, 8.5); B Hicks (9.4104, 8.4693); C (8.3333, 7.5) | idéntico |
| Producción CD | óptimo de beneficio (0.1055, 0.0352); máx. producto (6.6667, 2.2222); mín. costo (6.2403, 2.0801) | idéntico |
| Costos de corto plazo | cierre q = b/2c = 2, p = 8; nivelación 2c·q³ − b·q² − CF = 0 → (3.5696, 14.8347) | idéntico |
| Competencia perfecta | n·q(p) = Ad − Bd·p → p = 29.6236, q = 5.1882, Q = 103.7644 | idéntico |
| Slutsky y oferta de trabajo (Micro 2) | A (10, 20), B (8.3333, 25), C (6.6667, 20); ocio 14 → 13.33 con w′ = 15 | idéntico |
| Incertidumbre | √w: UE = 7.5, EC = 56.25; seguro actuarialmente justo → c = 90 | idéntico |
| Edgeworth (Walras) | p₁/p₂ = 0.7826, x₁ᴬ = 6.3333, x₂ᴬ = 3.3043 | idéntico |
| Bienestar (FPU) | Bentham (17.8885, 4.4721), Rawls (8.9443, 8.9443), Nash (14.1421, 7.0711) | idéntico |
| Externalidades y bien público | (36, 64) con CMgS; Samuelson Σ TMS = CMg → G = 30; voluntaria G = 20 | idéntico |
| Monopolio | IMg = CMg → y = 18, p = 64, CMg = 28; competencia (30, 40) | idéntico |
| Oligopolio | Cournot (40, 40); Stackelberg (60, 30); cartel 60; Bertrand p = c = 0 | idéntico |
| Juegos repetidos | δ* = (T − R)/(T − P) = 0.5 | idéntico |
| Keynesiano | Y = 450/0.55 = 818.1818 → 909.0909 con ΔG = 50 | idéntico |
| IS-LM (Macro 1, i fija) | Y = 290/0.3 = 966.67 → 1133.33 | idéntico |
| IS-LM (Macro 2) | Y = 1200, r = 4, M/P = 500 | idéntico |
| DA-OA (Macro 2) y Phillips | E₁ (1100, 110), u = 2 % por Okun; π = 6 − 0.5·(7 − 5) = 5; meta 2 % → u = 13 | idéntico |
| Solow | k* = (s/(n + g + δ))^{1/(1−α)} = 4, y* = 2; k oro = 11.1111 | idéntico |

DD-AA, Mundell-Fleming (5 paneles), DA-OA de Macro 1 y Mundell-Fleming de Macro 1 ya tenían pruebas de equilibrio en sus `auditoria.spec.ts` y `modelos.spec.ts`. Siguen en verde.

### Rangos, consola, móvil y zoom

- **Consola.** Se recorrieron en el navegador las 38 rutas y las 10 rutas `/desafio`, en escritorio y en móvil (375 × 812). Cero errores y cero promesas rechazadas, ninguna ruta cae en «no encontrada» y no hay desplazamiento horizontal en móvil.
- **Leyendas.** No hay ninguna «trace N». Micro 2, Micro 3 y los multipanel de Macro 2 ocultan la leyenda a propósito (`showlegend: false`) y rotulan cada curva sobre la gráfica.
- **Corrección 1, títulos de panel cortados en móvil (9 simuladores).** Elasticidades, impuestos, competencia perfecta, Slutsky (Micro 2), Edgeworth, equilibrio con producción, bienestar, DD-AA y Solow tenían títulos de una sola línea que se salían del lienzo de 325 px. Se arregló en `shared/plotly-chart.ts` con `ajustarTitulosAngostos`, que solo actúa en móvil y solo sobre los títulos que no caben:
  - parte el título en líneas y baja la letra a 11 px como máximo;
  - si es el título del panel superior, agranda el margen de arriba;
  - no toca colores, gestos ni zoom, ni los rótulos de curvas (anclados a coordenadas de datos).
- **Corrección 2, paneles dobles lado a lado en móvil.** En Fundamentos (elasticidades, impuestos, ventaja comparativa) y Micro 1 (demanda y Engel, competencia perfecta), los títulos de eje y rótulos como «ε < 1 (inelástica)» se montaban sobre el otro panel. Ahora traen una variante `movil` que apila los dos paneles a todo el ancho, igual que Macro 2. Los títulos de panel quedaron anclados al dominio de su eje para seguirlo. El escritorio no cambia.

## Pasada 2 · Teórica

### Notación y fuentes

Se distingue lo que viene del libro y lo que es notación estándar. Ningún libro estaba adjunto, así que se citan capítulos sin números de página. No se encontró ninguna cita con página inventada.

| Materia | Fuente declarada | Verificación |
|---|---|---|
| Fundamentos | Mankiw, *Principios de economía*, 6.ª ed., caps. 2–10 | Los capítulos citados coinciden con los temas: 2 FPP, 3 ganadero y campesino, 4 oferta y demanda, 5 elasticidad, 6 controles, 7 excedentes, 8–9 impuestos y comercio, 10 externalidades. El ejemplo del ganadero y el campesino reproduce las cifras del libro (24/12, 16/4, intercambio 5 por 15). El EP lineal trunca la oferta en P ≥ 0, que es la convención del libro (EP = 666). |
| Micro 1 | Monsalve (2017), por semanas | Notación x, y, p₁, p₂, M; Hicks y Slutsky con signos correctos (ES ≤ 0 ante una subida de p₁). |
| Micro 2 | Varian, *Microeconomía intermedia*, y Monsalve | Notación de Varian (x₁, x₂, p₁, m, Δx₁ˢ, Δx₁ⁿ, TMS). Las fórmulas de la oferta de trabajo con dotación (renta plena m̄ + w·T̄) son las de Varian, cap. «La ecuación de Slutsky». |
| Micro 3 | Lozano y Salamanca (2024), Monsalve (2025), Varian | Sin libros adjuntos: se citan autor y tema. |
| Macro 1 | Blanchard | Caps. 3 (mercado de bienes), 4–5 (IS-LM), 19–20 (economía abierta) e IS-LM-PC en la 7.ª ed. (cap. 9). Notación de Blanchard: i, c₀, c₁, b₀, b₁, b₂, Yn. |
| Macro 2 | Krugman y Obstfeld (DD-AA, paridad) y notación estándar (IS-LM con r, DA-OA, Phillips π = πᵉ − β(u − u*) + v, Solow con n + g + δ) | Las fichas ya marcan cuáles modelos **no** están en Krugman y Obstfeld (IS-LM cerrado, DA-OA, Phillips, Solow). La forma de Phillips y de IS-LM lineal corresponde a la notación de Mankiw, *Macroeconomía*. |

- **Corrección 3, Solow (estrella de la regla de oro en el panel B).** La marca «k de la regla de oro» estaba en s·f(k oro), con el s actual (0.3 → 1.0), un punto sin significado económico. En la regla de oro el estado estacionario cumple s_oro·f(k) = (n + g + δ)·k, así que la estrella va sobre la recta de reposición: (11.1111, 1.6667). Es el corte de la curva de inversión con s = α, como en el diagrama de Mankiw.

### Fichas de Teoría

Las fichas calculan su «Resultado» con las mismas funciones del modelo. Con una sonda se extrajeron todos los números de cada «Resultado» y se buscaron en la salida del simulador con los parámetros del ejercicio. Los que no aparecían eran contrafácticos («si γ sube a 0.22…», «con p = 30…»), y se verificaron a mano:

- Fundamentos: EC = 1024, EP = 666, ET = 1690; comercio con importaciones 30, ganancia 90, arancel con recaudo 45 y PPM 22.5.
- Micro 2: seguro con γ = 0.22 → K* = 29.98; beneficio con p = 30 → π = 45; Edgeworth uA de 4.595 a 4.882.
- Macro 2: los dos regímenes de DD-AA son coherentes entre sí (1176.79 flotante y 1200 fijo).

No se hallaron errores.

### Retos del Modo Desafío (30)

`desafio.spec.ts` ya prueba que cada reto es alcanzable sobre la rejilla real de los deslizadores y que el estado inicial no lo resuelve. Además, se verificó a mano que la solución y la explicación sean correctas en teoría. Todas lo son. Algunos ejemplos:

- Slutsky: x₁ = 20/p₁′ → 4; m = √2400 ≈ 49; ES de Hicks = 7.071 − 10 = −2.93.
- Producción: c = 4y → y = 15; CVMe mín. = a − b²/4c = 5.5.
- Edgeworth: b = 0.4 → p = 1; ω₁ᴬ = 10 → x₁ᴬ = 7.8; a = 0.7 → (7, 3).
- Monopolio: c = 25 → p = 70; b = 1.75 → y = 20; c + √(2F·d) = 30 → F = 200.
- Cournot y Stackelberg: c₁ = 15 → 30; a = 150 → p = 50; c₂ = 20 → líder 70.
- IS-LM: dY/dG = 4/3 → ΔG = 90; trampa con multiplicador 4 → ΔG = 40; mezcla ΔG = 50 con Δ(M/P) = 100.
- Phillips: u = 11 → π = 3. DA-OA: Okun 0.3 × 5 % → u = 3.5 %.

## Pasada 3 · Fallas y casos borde

El barrido de propiedades encontró 3 fallas, todas corregidas:

| # | Simulador | Falla | Corrección |
|---|---|---|---|
| 4 | Micro 1 · Slutsky | Con M = 0 (el deslizador empezaba en 0) los ejes quedaban en [0, 0] y la gráfica salía vacía y sin aviso. | El deslizador empieza en 0.5 y M ≤ 0 da un aviso claro. |
| 5 | Micro 1 · Costos (corto plazo) | Con CF = 0 y b = 0, el punto de nivelación era (0, ∞): el eje y quedaba infinito y el punto no se dibujaba. | CMe(0) = CVMe(0) = a cuando CF = 0 (límite correcto). |
| 6 | Micro 1 · Competencia perfecta | El mismo caso dejaba el eje de precios infinito. | Mismo arreglo en `CostoCubico.CMe`. |

Estos tres casos estaban en los fixtures de paridad con el original de Python, que tenía el mismo defecto. Se omiten con `it.skipIf` y un comentario en `micro1/paridad.spec.ts`, y el comportamiento nuevo se prueba en `auditoria-triple.spec.ts`.

Otros chequeos:

- Ningún punto de equilibrio queda fuera del rango visible en ningún estado por defecto, opción de selector ni planteamiento (sonda de «gráficas cortadas»).
- Rutas: `#/<materia>`, `#/<materia>/<sim>` y `#/<materia>/<sim>/desafio` responden todas. El tutorial apunta a `/` y `/micro3/monopolio`, que existen. El despliegue usa `--base-href /<repo>/` y copia `404.html`.

### Fuerza de las pruebas (mutaciones)

Se inyectaron 9 mutaciones, una a la vez, y se corrió toda la suite:

| Mutación | Resultado |
|---|---|
| Cournot: y₁ = (a − 2c₁ + c₂)/**2**b | matada |
| Phillips: signo del choque de oferta v invertido | matada |
| Multiplicador keynesiano 1/(1 **+** pendiente) | matada |
| Elasticidad puntual invertida (b·Q/P) | matada |
| Colusión: Y = (a − c)/**3**b | **sobrevivió** → se agregó la prueba del cartel (simétrico, asimétrico y p cartel > p Cournot); ahora la mata |
| Solow: exponente 1/(1 **+** α) | matada |
| Costos: q mín. CVMe = b/**3**c | matada |
| Tolerancia de retos 1.5 % → 50 % | matada |
| Ajuste de títulos en móvil desactivado | matada |

Única debilidad hallada: la colusión de Micro 3 solo se verificaba a través de la figura, no por su valor.

## Lo que queda por decidir

1. **Edición de Blanchard.** Macro 1 cita los caps. 19–20 (5.ª ed. en español) y el cap. 9 de la 7.ª ed. Conviene fijar una sola edición en todas las fichas, la que use el programa del curso.
2. **Libros no adjuntos.** Varian, Monsalve (2017 y 2025), Lozano y Salamanca (2024), Krugman y Obstfeld y Blanchard no estaban disponibles. Las citas son de capítulo o tema y la notación se verificó contra la convención conocida de cada autor. Si se suben los PDF, se pueden agregar páginas.
3. **Leyenda oculta en Micro 2, Micro 3 y Macro 2.** Es una decisión de diseño previa (rótulos sobre las curvas). Con muchas curvas, los rótulos pueden montarse entre sí en móvil. No se cambió para no alterar el estilo.
4. **Archivos no versionados.** `frontend/src/app/macro2/_tmp/probe.spec.ts` y `propuestas-diseno/` siguen sin versionar, como se pidió. La sonda `_tmp` corre con `ng test` en local, pero no en CI.
