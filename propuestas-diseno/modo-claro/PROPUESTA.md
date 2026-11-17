# Propuesta: modo claro, botón de configuración y Acerca de

Estado: diseño, sin cambios en el código. Maqueta navegable en `maqueta.html` (misma carpeta).
Fecha: 17 de noviembre de 2026.

Principio rector: **el modo oscuro no cambia ni un píxel.** Todos los valores oscuros de hoy se quedan como
están; el claro se añade como una segunda capa de los mismos tokens.

---

## 1. Lo que encontré en el código

- `frontend/src/styles.scss` define 12 tokens en `:root` (`--fondo`, `--panel`, `--texto`, `--acento`...). La
  mayoría de los componentes ya los usan, lo que facilita mucho el modo claro.
- Hay unos **25 colores escritos a mano** en los `.scss` que solo funcionan en oscuro, por ejemplo
  `rgba(14,17,22,.88)` en la barra, `#2b3340` en la pista del deslizador, `rgba(255,255,255,.06)` en contadores y
  chips, `#07142b` como texto sobre el acento, `#f5c451` en el chip «Intermedio» del desafío. Hay que pasarlos a
  tokens (lista en la sección 4).
- Las gráficas **no leen CSS**: `core/tema.ts` exporta `COLORES` y `SERIE` como constantes hexadecimales y unos 50
  simuladores las importan al construir cada figura. También hay `rgba(...)` sueltos (por ejemplo
  `fundamentos/simuladores/_ui.ts`, rellenos de excedentes).
- Los colores de cada materia (`catalogo.ts`: `#3DD6B5`, `#FFA45B`, `#5B9BFF`, `#FF7A85`, `#F06FB0`, `#B79CFF`) se
  usan como texto (`.ver-todos`, `.tarjeta-flecha`, `.pilar`). Sobre blanco no se leen.
- **Conflicto de ícono:** el botón «Mostrar/Ocultar parámetros» ya usa el engranaje ⚙. Si el nuevo botón de
  configuración también es un engranaje, se confunden. Propuesta: el de parámetros pasa a un ícono de
  deslizadores y el engranaje queda solo para la configuración general.
- El globo de UIFCITO ya es claro (`#f4f6fa`), así que funciona igual en ambos modos; en claro solo se suaviza
  su sombra.

## 2. Paleta clara, token por token

Contrastes medidos con la fórmula WCAG. Textos ≥ 4.5:1 sobre el panel blanco; líneas de gráfica ≥ 3:1.

| Token | Oscuro (actual, no cambia) | Claro (propuesta) | Nota |
|---|---|---|---|
| `--fondo` | `#0e1116` | `#F4F6F9` | gris frío muy suave, no blanco puro |
| `--fondo-lateral` | `#0a0d12` | `#FFFFFF` | el menú se separa por borde y sombra |
| `--panel` | `#171b22` | `#FFFFFF` | |
| `--panel-hover` | `#1e232c` | `#EEF2F6` | |
| `--borde` | `#262c36` | `#DDE2EA` | |
| `--texto` | `#eef1f6` | `#141A23` | 17.5:1 |
| `--texto-suave` | `#8b94a5` | `#5A6577` | 5.9:1 |
| `--acento` | `#3dd6b5` | `#0A7D66` | el turquesa se oscurece para leerse como texto (5.1:1) |
| `--acento-2` | `#ff7a85` | `#C2384A` | 5.3:1 |
| `--listo` | `#3dd6b5` | `#0A7D66` | |
| `--pendiente` | `#6c7686` | `#8A94A6` | solo borde de un punto, 3:1 basta |

Tokens **nuevos** (hoy son colores escritos a mano; en oscuro toman exactamente el valor actual):

| Token nuevo | Oscuro (= valor actual) | Claro | Reemplaza en |
|---|---|---|---|
| `--sobre-acento` | `#07142b` | `#FFFFFF` | texto de botones de acento (barra, desafío, `.interrogacion`, `.primario`) |
| `--barra-fondo` | `rgba(14,17,22,.88)` | `rgba(255,255,255,.86)` | `app.scss .barra` |
| `--velo` | `rgba(0,0,0,.55)` | `rgba(20,26,35,.32)` | menú lateral, modal de teoría |
| `--sutil` | `rgba(255,255,255,.06)` | `rgba(20,26,35,.05)` | `.contador`, `.estado-pendiente`, `code`, `.formulas`, `.opcion`, `.control-fantasma` |
| `--pista` | `#2b3340` | `#D5DBE4` | deslizadores (`control-panel.scss`) |
| `--acento-suave` | `rgba(61,214,181,.14)` | `rgba(10,125,102,.10)` | `.opcion.selected`, `.ejercicio`, `.aviso-construccion`, `.estado-listo`, banner de éxito |
| `--acento-borde` | `rgba(61,214,181,.35)` | `rgba(10,125,102,.35)` | bordes de los mismos |
| `--info-fondo` / `--info-borde` | `rgba(91,155,255,.1)` / `.35` | `rgba(37,99,217,.07)` / `.30` | `.aviso-info` |
| `--error-fondo` / `--error-borde` | `rgba(255,122,133,.1)` / `.45` | `rgba(194,56,74,.07)` / `.40` | `.aviso-error`, banner de fallo |
| `--dorado` | `#f5c451` | `#8F6200` | chip «Intermedio», `.cadena .paso` |
| `--sombra-flotante` | `0 24px 80px rgba(0,0,0,.6)` | `0 18px 50px rgba(20,26,35,.16)` | modales, panel de configuración |
| `--sombra-menu` | `12px 0 40px rgba(0,0,0,.5)` | `12px 0 40px rgba(20,26,35,.12)` | menú lateral |

**Colores de materia** (nuevo campo `colorClaro` en `catalogo.ts`):

| Materia | Oscuro | Claro |
|---|---|---|
| Fundamentos | `#3DD6B5` | `#0A7D66` |
| Microeconomía 1 | `#FFA45B` | `#B35A0E` |
| Macroeconomía 1 | `#5B9BFF` | `#2557C7` |
| Microeconomía 2 | `#FF7A85` | `#C2384A` |
| Microeconomía 3 | `#F06FB0` | `#B8357A` |
| Macroeconomía 2 | `#B79CFF` | `#6D4BC4` |

El logo «UI» y el avatar conservan su degradado azul-turquesa en ambos modos: es parte de la identidad.

## 3. Gráficas Plotly

**Colores del lienzo** (equivalente claro de `COLORES` en `tema.ts`):

| Clave | Oscuro | Claro |
|---|---|---|
| `fondo` (papel) | `#171b22` | `#FFFFFF` |
| `panel` (área de trazado) | `#12161d` | `#FBFCFE` |
| `borde` (ejes) | `#262c36` | `#C9D0DB` (más marcado que el borde de UI para que se vean los ejes) |
| `rejilla` | `#222834` | `#E9EDF2` |
| `texto` | `#eef1f6` | `#141A23` |
| `textoSuave` | `#8b94a5` | `#5A6577` |
| `fondoLateral` (etiqueta al pasar el mouse) | `#0a0d12` | `#FFFFFF` con borde |
| `acento` (puntos de equilibrio) | `#F5C451` | `#B07A00` |

**Series** (equivalente claro de `SERIE`): mismo orden y mismo significado, para que la demanda siga siendo azul
y la oferta naranja en los dos modos.

| | Oscuro | Claro | Contraste sobre `#FBFCFE` |
|---|---|---|---|
| AZUL | `#5B9BFF` | `#2563D9` | 5.3 |
| DORADO | `#F5C451` | `#B07A00` | 3.6 |
| VERDE | `#3DD6B5` | `#0B8A70` | 4.2 |
| ROJO | `#FF7A85` | `#D23A4B` | 4.6 |
| MORADO | `#B79CFF` | `#7448D4` | 5.7 |
| NARANJA | `#FFA45B` | `#D0650F` | 3.7 |

Los rellenos `rgba(...)` conservan su transparencia y cambian solo el color base (por ejemplo, el excedente del
consumidor pasa de `rgba(91,155,255,.28)` a `rgba(37,99,217,.28)`). En la maqueta se ve bien así; si alguno
queda muy fuerte, se baja la opacidad en el mapa.

**Cómo aplicarlo sin tocar los 50 simuladores.** En vez de reescribir cada simulador, `plotly-chart.ts` traduce
la figura justo antes de `Plotly.react`:

1. `tema.ts` exporta `MAPA_CLARO`: un diccionario «color oscuro → color claro» con las entradas de las tablas
   anteriores.
2. `PlotlyChart` lee la señal del tema efectivo. Si es claro, recorre `data` y `layout` y sustituye cada
   color que esté en el mapa (también `rgb/rgba` con el mismo color base, conservando la transparencia).
3. Como la señal del tema está dentro del `effect`, cambiar de modo redibuja todas las gráficas abiertas al
   instante, y la cámara de Plotly exporta el PNG en el modo que se esté viendo.

Ventajas: los simuladores y las 729 pruebas existentes siguen como están (comprueban los valores oscuros), y
un color nuevo que alguien olvide mapear simplemente se queda igual en lugar de romper algo. La maqueta usa
exactamente este mecanismo. Se añade una prueba nueva que verifique que cada color de `COLORES` y `SERIE` tiene
entrada en `MAPA_CLARO` y que su contraste cumple los mínimos.

## 4. Componentes que requieren atención

| Archivo | Qué cambia |
|---|---|
| `styles.scss` | bloque `[data-tema='claro']` con todos los tokens; `color-scheme: dark/light`; `code` usa `--sutil` |
| `app.scss` | `.barra` usa `--barra-fondo`; `#07142b` pasa a `--sobre-acento`; se añade el botón de configuración |
| `layout/sidebar.scss` | `--velo`, `--sombra-menu`, `.contador` con `--sutil`; color de materia claro |
| `shared/control-panel.scss` | pista `#2b3340` → `--pista`; halos `rgba(61,214,181,…)` → `--acento-suave`; sombra del pulgar más suave |
| `shared/result-renderer.scss` | `.aviso-info`, `.aviso-error`, bordes de tabla `rgba(255,255,255,.05)` → `--borde`; `.cadena .paso` |
| `shared/teoria-modal.scss` | `::backdrop` con `--velo`; `.formulas` con `--sutil`; `.primario` con `--sobre-acento` |
| `shared/tutorial-uifcito.scss` | el velo puede quedarse oscuro en ambos modos (resalta mejor el foco); sombra del globo más suave en claro |
| `pages/inicio.scss` | pulgar del deslizador de portada (`border: var(--fondo)` ya funciona) |
| `pages/materia.scss` | `.estado-listo`, `.estado-pendiente` |
| `pages/simulador.scss` | `.aviso-construccion`, `.control-fantasma`; ícono del botón de parámetros |
| `pages/desafio.scss` | chip «Intermedio» `#f5c451` → `--dorado`; `.muestra.fantasma`, `.muestra.zona`; textos `#07142b` |
| `core/tema.ts` | `COLORES_CLARO`, `SERIE_CLARA`, `MAPA_CLARO` |
| `shared/plotly-chart.ts` | traducción de la figura según el tema |
| `core/catalogo.ts` | `colorClaro` por materia |
| KaTeX (`math-equation.ts`) | hereda `color`, no necesita cambios |

## 5. Botón de configuración y su panel

**Ubicación:** extremo derecho de la barra superior, después de «Tutorial». Botón redondo de 36 px con el
engranaje en línea (SVG), mismo borde y hover que «Tutorial». En móvil sigue visible (es solo un ícono).

**Panel (escritorio):** tarjeta flotante de 320 px anclada bajo el botón, con estas partes:

1. **Apariencia:** control segmentado de tres opciones con ícono: *Claro* (sol), *Oscuro* (luna), *Sistema*
   (pantalla). Debajo, una línea que explica el estado: «Sigue la configuración de tu equipo. Ahora: oscuro».
2. **Acerca del simulador:** fila que lleva a la página Acerca de.
3. **Repetir el tutorial:** fila que lanza a UIFCITO (hoy solo existe en la barra, aquí queda a mano).
4. Pie con la versión y «UIFCE · UNAL».

**Panel (móvil, menos de 700 px):** la misma tarjeta sube desde abajo como hoja, igual que el modal de Teoría.

**Comportamiento:** se cierra con Escape, con clic fuera o con la ✕; el foco entra al panel al abrir y vuelve al
engranaje al cerrar; el engranaje gira 60° cuando el panel está abierto. Rol `dialog` y el grupo de tema como
`radiogroup` para lectores de pantalla. Un punto rojo pequeño sobre el engranaje anuncia la novedad la primera
vez y desaparece al abrirlo (se recuerda en `localStorage`).

El panel deja espacio para futuras opciones sin rediseñar (tamaño de letra para proyector, idioma, etc.).

## 6. Persistencia de la preferencia

- Tres valores: `'claro' | 'oscuro' | 'sistema'`, guardados en `localStorage` con la clave `uifce-tema`.
- Nuevo servicio `core/apariencia.ts` (como `Menu` y `Tutorial`): señal `preferencia`, señal calculada
  `temaEfectivo` (`'claro' | 'oscuro'`) que, en modo *Sistema*, escucha `matchMedia('(prefers-color-scheme: dark)')`
  y se actualiza si el usuario cambia el tema del equipo con la página abierta. Un `effect` escribe
  `data-tema` en `<html>` y guarda en `localStorage` (con `try/catch`: en modo incógnito puede fallar y no debe
  romper nada).
- **Sin destello al cargar:** un `<script>` de 6 líneas en el `<head>` de `index.html` lee `localStorage` y pone
  `data-tema` antes de que Angular arranque. Además `<meta name="color-scheme" content="dark light">` y
  `<meta name="theme-color">` para que la barra del navegador móvil acompañe.
- En CSS, el oscuro sigue en `:root` como hoy y el claro va en `:root[data-tema='claro']`. Si no hay atributo
  (por ejemplo, JavaScript desactivado), se ve el oscuro de siempre.

**Pregunta abierta: ¿qué ve alguien que entra por primera vez?**
- *Recomendado: Oscuro.* Conserva la identidad que ya tiene el simulador y nadie nota cambios hasta que lo elige.
- *Alternativa: Sistema.* Es lo estándar, pero la mayoría de equipos Windows de la facultad están en claro, así
  que casi todos verían el modo claro de entrada.
El modo claro es especialmente útil en salones con videobeam, donde los fondos oscuros se ven lavados; vale la
pena mencionárselo a los profesores.

## 7. Acerca de

**Formato recomendado:** una página propia en la ruta `/acerca-de` (no un modal), porque se puede enlazar y
compartir, y cuando el simulador esté en los servidores de la facultad es la página que alguien buscaría.

**Cómo se llega:** desde el panel de configuración, desde el pie del menú lateral (enlace «Acerca de» junto a
«Unidad Informática FCE») y desde el pie de la página de inicio, junto a la versión. No añado otro botón en la
barra superior porque en móvil ya está llena.

**Estructura (ver la maqueta):**
1. Encabezado: logo, «Simulador Económico», una línea de propósito, chips de versión y alcance.
2. Tarjeta del autor: avatar o foto, «Creado por», nombre, cargo, una frase sobre el origen y botones de
   LinkedIn (principal) y otros enlaces opcionales.
3. Origen y derechos: proyecto, institución, autoría, titular de los derechos y licencia.
4. Agradecimientos especiales: tarjetas con nombre y aporte de cada persona.
5. Hecho con: Angular, Plotly.js, KaTeX, alojamiento; descargo breve de uso pedagógico.
6. Línea legal: © año y titular.

Los datos que aún faltan están marcados en rojo en la maqueta («por confirmar») y dependen de las respuestas a las
preguntas del hilo.

## 8. Orden sugerido para implementarlo (cuando se apruebe)

1. Tokens nuevos en oscuro con los valores actuales (cero cambio visual; se verifica con las capturas de hoy).
2. Bloque claro en CSS y servicio `Apariencia` con el script anti-destello.
3. Botón y panel de configuración; cambio de ícono del botón de parámetros.
4. `MAPA_CLARO` y traducción en `plotly-chart.ts`, con su prueba de contraste.
5. Página Acerca de con los datos definitivos.
6. Recorrido con capturas de escritorio y móvil en ambos modos.

### 7.1 Datos confirmados (17 nov 2026)

- Nombre: **Jeferson David Anzola Grajales**, Estudiante Auxiliar Junior, Unidad de Informática, Facultad de Ciencias Económicas.
- LinkedIn: https://www.linkedin.com/in/jeferson-david-anzola-grajales- · GitHub: https://github.com/Jeferson-Anzola
- Foto: `autor.jpg` (recorte cuadrado 400 px de la foto enviada; en la app iría en `public/`).
- Origen: proyecto de estudio de la Unidad de Informática FCE. Titular: Henry Sarmiento. Sin sección de licencia.
- Agradecimientos: Unidad de Informática FCE; Juan Esteban Laguna y Diego Fernando López Abril (compañeros que
  apoyaron el proyecto); Prof. Mónica Yolanda Mogollón Plazas (Microeconomía); Prof. Andrea Catalina Blanco Moreno (Microeconomía).

## 9. Nombre propio: SimEc UNAL

**Dónde cambia el nombre** (cuando se implemente):

| Lugar | Hoy | Propuesta |
|---|---|---|
| `catalogo.ts` `TITULO_APP` | Simulador Económico | SimEc UNAL |
| `catalogo.ts` `SUBTITULO_APP` | Facultad de Ciencias Económicas | Simulador Económico · Facultad de Ciencias Económicas |
| Barra superior | «Simulador Económico» | logotipo de texto: **SimEc** en negrita + «UNAL» más ligero |
| Portada (inicio) | título «Simulador Económico» | «SimEc UNAL» grande, debajo «Simulador Económico» como bajada |
| `index.html` `<title>` | «Frontend» (no se ha cambiado) | «SimEc UNAL · Simulador Económico» |
| Nombre del PNG que descarga Plotly | `simulador_uifce` | `simec_unal` |
| Acerca de | Simulador Económico | SimEc UNAL |

**Diálogo de bienvenida de UIFCITO** (`tutorial.ts`, primer paso):

> ¡Hola, soy UIFCITO! Te doy la bienvenida a **SimEc UNAL**, el simulador económico de la Facultad de Ciencias
> Económicas, creado en la UIFCE. Aquí los modelos de Fundamentos, Microeconomía 1, 2 y 3 y
> Macroeconomía 1 y 2 cobran vida: mueves un parámetro y ves cómo cambian las curvas. ¿Te muestro cómo se usa?
> Es un recorrido de un minuto.

**Último paso:**

> ¡Eso es todo! Ahora te toca explorar SimEc. Si necesitas repasar algo, el botón «Tutorial» me llama de nuevo, y
> en el engranaje encuentras el modo claro u oscuro y la información del simulador. ¡Mucho éxito con tus modelos!

### 9.1 Derechos sobre el nombre y el software (orientación, no es asesoría legal)

- **El código ya tiene derecho de autor** desde que se creó; en Colombia no hace falta registrarlo para que exista
  (Ley 23 de 1982 y Decisión Andina 351 de 1993). El registro de software ante la **Dirección Nacional de Derecho
  de Autor (DNDA)** es voluntario, gratuito y en línea, y sirve como prueba de autoría y fecha.
- **El nombre no se protege con derecho de autor**, se protege como **marca** ante la **Superintendencia de
  Industria y Comercio (SIC)**. Primero se busca en la base de antecedentes marcarios de la SIC (consulta gratuita)
  si «SimEc» o algo parecido ya existe en las clases de software (9 y 42) y educación (41). La solicitud tiene un
  costo y la marca dura 10 años renovables.
- **«UNAL» es una marca de la Universidad Nacional.** Usarla dentro del nombre necesita su autorización, y lo más
  probable es que el registro lo deba hacer la propia Universidad, que además sería la titular de los derechos
  patrimoniales. Lo recomendable es llevarle esto a Henry Sarmiento para que lo tramite con la oficina de propiedad
  intelectual de la Universidad.
- Una búsqueda rápida en internet no mostró ningún producto colombiano llamado «SimEc», pero eso no reemplaza la
  consulta formal en la SIC.

### 7.2 Referencias bibliográficas (APA 7.ª ed.)

Nueva sección del Acerca de, antes de «Hecho con», con sangría francesa y orden alfabético. Sale de los autores que
cita el código (`AUTOR*` en los `_comun.ts` y las fichas `teoria.ts`) y del programa de Microeconomía 1.

- Blanchard, O. (2017). *Macroeconomía* (7.ª ed.). Pearson.
- Krugman, P. R., & Obstfeld, M. (2006). *Economía internacional: Teoría y política* (7.ª ed.). Pearson Educación.
- Lozano, [inicial], & Salamanca, [inicial] (2024). *Interacciones estratégicas*. [editorial por confirmar].
- Mankiw, N. G. (2012). *Principios de economía* (6.ª ed.). Cengage Learning.
- Monsalve, S. (2017). *Competencia bajo equilibrio parcial* (2.ª ed., Vol. 1). Universidad Nacional de Colombia, Facultad de Ciencias Económicas.
- Monsalve, S. (2025). *Fallas de mercado*. [editorial por confirmar].
- Varian, H. R. (2011). *Microeconomía intermedia: Un enfoque actual* (8.ª ed.). Antoni Bosch.

Por verificar: los nombres y la editorial de Lozano y Salamanca y de Monsalve (2025), que no están en el proyecto;
y Blanchard, porque el inventario menciona la edición de Blanchard, Amighini y Giavazzi, mientras que el código
cita la 7.ª ed. de 2017.
