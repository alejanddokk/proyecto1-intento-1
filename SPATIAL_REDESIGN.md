# Vice City — entrada nocturna

Propuesta implementada localmente el 5 de noviembre de 2026. No desplegada.
La versión pública anterior permanece sin cambios.

## Dirección y decisiones

Un coupé original frente a una entrada monumental de Vice City transforma la
landing en una escena espacial. La cámara avanza al desplazarse y responde al
mouse; el visitante conserva scroll nativo, enlaces y formulario HTML. El modelo
es estilizado y procedural: no es un vehículo extraído de GTA ni un render AAA
fotorrealista. No se reutilizaron los experimentos de mapas ni Figma.

Se compararon tres tratamientos con la misma geometría y composición en
`review/spatial/variant-*.png`: noche, última luz y porcelana. Se eligió noche
por la separación entre metal frío, luz cálida y texto; última luz uniformaba
demasiado los materiales y porcelana debilitaba la atmósfera y el contraste.

La escena da paso a fotografías editoriales de Leonida, al video oficial y a
una superficie clara de lectura y registro. El cambio de materiales y densidad
marca el ritmo sin convertir cada sección en otra animación espectacular.

## Revisar la propuesta

- Aplicación local con backend de pruebas: http://127.0.0.1:4173/
- Comparación visual: http://127.0.0.1:4180/review/spatial/comparison.html
- Capturas antes/después, variantes y móvil: `review/spatial/`.
- Grabación real de recorrido: `review/spatial/recorrido.webm`.
- Fuentes y límites de la investigación: `review/spatial/RESEARCH.md`.
- Procedencia de recursos nuevos: `assets/spatial/sources.json`.

El puerto 4180 es un servidor estático auxiliar del workspace; no sustituye
al backend del puerto 4173. Los enlaces locales requieren servidores activos.

## Implementación y responsabilidades

- `assets/spatial/coupe.js`: geometría original, carrocería, vidrio, interior,
  neumáticos, llantas, ópticas y detalles.
- `assets/spatial/world.js`: escena WebGL2, Three.js r180, PBR/clearcoat,
  iluminación de entorno PMREM, reflejo planar suavizado, sombras y niebla.
  Combina geometría estática por material para reducir draw calls.
- `spatial.js`: ciclo de vida, entradas, accesibilidad y ScrollTrigger.
  GSAP controla el progreso narrativo; Three.js controla cámara y render.
  No hay dos motores compitiendo por el mismo scroll.
- `spatial.css`: tipografía Syncopate, composición, adaptación móvil,
  sticky nativo y controles. No se usan scroll falso ni secuestro de rueda.
- `app.js` y `registration.js`: conservan la lógica del producto.

No se añadieron frameworks, dependencias npm ni modelos remotos. Three y sus
addons se sirven desde el mismo origen con CSP existente. El caché de assets
ahora revalida con ETag para evitar módulos antiguos tras una actualización.

La escena deja de renderizar al estabilizarse, salir de pantalla u ocultarse
el documento. La calidad se adapta a tiempos medidos; reduce resolución,
reflejos y sombras, conservando la geometría. La liberación de recursos está
implementada; no se completó una prueba prolongada de fugas entre remontajes.

## Accesibilidad y preservación funcional

La cámara móvil usa otro encuadre. Un range nativo permite cambiar el ángulo
por teclado o tacto y un botón lo centra. El canvas es decorativo para lectores
de pantalla; contenido y acciones siguen en HTML. Se respeta reduced-motion y
hay control manual. La escena queda estática en ese modo.

Fallo inicial o pérdida de WebGL muestran un poster original, estado y reintento.
La imagen alternativa no contiene texto ni botones horneados. El formulario
sigue disponible. No hay bloqueo de carga que impida leer o registrar.

Se conservaron contador, fecha y aclaración horaria, comparación y filtros,
acordeones independientes, video nativo, enlaces y fuentes; registro con nombre,
email, plataforma y consentimiento; código, reenvío, edición, comprobante,
reintento, éxito y baja. No se inventaron requisitos de PC ni datos confirmados.

## Verificación realizada

- API y assets: 10 pruebas Node aprobadas, incluidos binarios, CSP y ETag/304.
- Registro E2E existente: 12 comprobaciones aprobadas, incluyendo código
  incorrecto, confirmación, comprobante y baja. Correo local sintético;
  no se enviaron emails reales.
- Recorrido y responsive: 29 comprobaciones aprobadas, filtros, acordeones,
  cámara reversible y persistencia de progreso tras refresh, teclado,
  movimiento reducido y anchos 1440, 1024, 820, 768, 390 y 320.
- Escena: 10 comprobaciones aprobadas, Three r180 real, respuesta de mouse,
  range por teclado, centrado, recarga a mitad del recorrido, pausa fuera
  de escena, fallo WebGL y pérdida de contexto.
- Revisión adicional de fallback en contexto táctil emulado 390×844: imagen
  cargada, reintento disponible y sin desbordamiento horizontal.
- Capturas inspeccionadas y recorrido grabado. No es una certificación WCAG
  ni una prueba en teléfono físico.

## Rendimiento observado, sin promesa de 60 fps

Chromium automatizado, GPU reportada: ANGLE / AMD Radeon R3 Graphics / D3D11.
Recorrido de 240 requestAnimationFrame con scroll y puntero programados;
121 muestras después del calentamiento inicial de 120 frames.

| Viewport | Calidad al medir | DPR | Mediana | p95 | Máximo |
| --- | --- | --- | --- | --- | --- |
| 1440×900 | economy | 0.55 | 24.5 ms | 25.4 ms | 27 ms |
| 390×844 | compact | 1 | 24.5 ms | 25 ms | 25.5 ms |

Ambos: 28 draw calls, aproximadamente 17.340 triángulos y 19 geometrías
reportados. El primer render, compilación y adaptación inicial no forman parte
de estas muestras estables. El viewport móvil se ejecutó en la misma computadora;
no representa una medición térmica ni GPU de un teléfono. El resultado ronda
40 fps en este entorno, no demuestra 60 fps. La reducción de resolución desktop
es visible; hace falta probar hardware físico antes de publicar.

## Herramientas evaluadas y límites pendientes

Three.js r180 + GSAP 3.13.0 están implementados. Scrollcraft fue estudiado,
no instalado: su RAF y sistema de scroll duplicarían el motor actual. Context7
no estaba conectado; se consultaron documentos oficiales. «Skill UI» no identifica
un repositorio inequívoco, por lo que no se instaló otro paquete por suposición.

Skills aplicadas: threejs-web, threejs-shaders, threejs-performance,
threejs-accessibility y threejs-testing; gsap-core, gsap-timeline,
gsap-scrolltrigger y gsap-performance. Los criterios de Emil se aplicaron a
foco, interrupción y controles; la escena tiene un ritmo narrativo distinto.
Playwright MCP se utilizó para navegación, interacciones, capturas y grabación.

Revisión de movimiento: antes predominaban imágenes planas y desplazamientos;
ahora hay cambio de posición y perspectiva real, con entrada de mouse amortiguada.
El scroll es reversible, no obliga a esperar y el formulario queda estable.
Resultado funcional verificado; el objetivo de 60 fps y un acabado fotorrealista
de nivel AAA no se dan por alcanzados. La propuesta elige una maqueta estilizada.

Supabase no se añadió: D1 y Resend ya resuelven este registro. Su Storage puede
servir para una futura biblioteca editorial, con políticas de acceso; hoy no
justifica migrar datos o sumar credenciales. Strix no fue ejecutado: faltan sus
dependencias locales. Alcance y condiciones en `review/spatial/SECURITY_SCOPE.md`.

El correo real continúa pendiente de remitente y Resend configurados. El backend
de pruebas local funciona; esta revisión no activa correo ni modifica producción.
