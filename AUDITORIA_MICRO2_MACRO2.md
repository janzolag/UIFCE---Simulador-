# Auditoría triple · Micro 2 (Varian) y Macro 2 multipanel (Krugman y Obstfeld)

Fecha: 2026-11-13. Pruebas: `frontend/src/app/macro2/auditoria.spec.ts` y `frontend/src/app/micro2/auditoria.spec.ts` (832 pruebas en verde en toda la app; `ng build` sin errores).

## Fuentes y qué viene de dónde

| Modelo | Fuente | Nota |
|---|---|---|
| Mundell-Fleming | Krugman y Obstfeld (2006), *Economía internacional*, 7.ª ed.: caps. «La producción nacional y el tipo de cambio a corto plazo» (DD-AA, choques transitorios y permanentes), mercado de divisas y paridad de intereses, y «Los tipos de cambio fijos y la intervención…». | El panel A es **DD-AA** (Y frente a E), la versión del libro, en lugar de IS-LM-BP; el panel B es el mercado de divisas del libro (tasa de rendimiento frente a E), en lugar de «volumen de divisas». La movilidad imperfecta (μ) es una extensión estándar. |
| IS-LM, DA-OA, Phillips, Solow | Notación estándar de manual | Krugman y Obstfeld no los desarrollan para economía cerrada. El enlace DA-OA → Phillips usa la ley de Okun. |
| Slutsky, monopolio y discriminación, oligopolio, Edgeworth | Varian, *Microeconomía intermedia*, 8.ª ed.: capítulos «La ecuación de Slutsky», «El monopolio», «La conducta monopolística», «El oligopolio», «El intercambio». | El libro **no estaba adjunto**: se usó la notación de Varian (x₁, p₁, m, Δx₁ˢ, Δx₁ⁿ, IMg, CMg, f₁(y₂), TMS). Se citan títulos de capítulo, sin números de página. Los ejercicios numéricos son propios. La utilidad de los casos inferior y Giffen es la del ejemplo 3.5 de Monsalve (2017) que ya usa Micro 1. |

## Pasada 1 · Notación y ejes

- IS-LM: (Y, r); cruz keynesiana (Y, AE) comparte el eje Y; mercado de dinero (M/P, r) comparte el eje r. Trampa de liquidez como tramo plano en r = 0 en ambos.
- DD-AA: (Y, E) con E en moneda nacional por divisa; mercado de divisas comparte el eje E.
- DA-OA: (Y, P) y Phillips (u, π) con CPLP vertical en la NAIRU.
- Solow: dos paneles apilados con eje k compartido; reposición (n + g + δ)·k (se agregó g).
- Micro 2: x₁/x₂ y p₁; y/p con IMg, CMg, CMe; y₁/y₂ con f₁(y₂), f₂(y₁); caja con orígenes Oᴬ y Oᴮ.
- En móvil los paneles se apilan (un dedo desplaza la página, `dragmode: false`; solo el pellizco hace zoom).

## Pasada 2 · Solución analítica = cruce graficado (4 decimales)

- IS∩LM, AE∩45° y oferta∩demanda de dinero coinciden con (Y*, r*) en E₀ y tras cada choque. E₁ fiscal = multiplicador 1/(1 − c) a r constante.
- DD-AA: cada equilibrio satisface DD y AA (< 5·10⁻⁵). Resultados del libro: expansión fiscal permanente con tipo flotante deja Y igual y la cuenta corriente cae exactamente ΔG; expansión monetaria permanente sube E y P en la misma proporción; con tipo fijo la política monetaria no mueve nada.
- DA-OA: DA∩OACP y DA∩OALP; E₀, E₁ y E₂ caen exactamente sobre sus CPCP (enlace por Okun).
- Solow: s·A·f(k*) = (n + g + δ)·k* y f′(k oro) = n + g + δ (< 10⁻¹⁰).
- Slutsky: A es tangencia; la recta pivotada pasa por A; ES + EI = total; Δm = x₁·Δp₁.
- Monopolio: IMg∩CMg graficados = (18, 28); p·(1 − 1/|ε|) = CMg; primer grado sin pérdida; tercer grado IMgᵢ = c.
- Oligopolio: f₁∩f₂ graficadas = Cournot (40, 40); Stackelberg (60, 30) sobre f₂ con isobeneficio tangente (pendiente −½).
- Edgeworth: z₁ = z₂ = 0 al precio walrasiano, x* en la curva de contrato y en la recta de precios; ley de Walras para todo p.

## Pasada 3 · Bordes

- Cada botón de choque × cada deslizador en su mínimo y máximo, y valores vacíos o absurdos: sin NaN, Infinity ni divisiones por cero; los casos inválidos muestran un aviso en lugar de una gráfica rota.
- Casos degenerados probados: h = 0 (LM vertical), b = 0, c = 0, trampa de liquidez, n + g + δ = 0, ley de Okun con desempleo negativo (se acota a 0 con aviso), duopolio con un rival que no produce, consumidor sin dotación.
- Hallazgo corregido durante la auditoría: en Slutsky un valor no numérico en `a` lanzaba una excepción fuera del manejo de errores.
