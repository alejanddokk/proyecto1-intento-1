# Vice City — evolución cinematográfica

Implementada sobre la landing existente, 5 de noviembre de 2026. HTML/CSS/JS vanilla;
GSAP 3.13.0 y ScrollTrigger locales. Sin Three.js, nuevos frameworks ni animadores
redundantes. APIs comprobadas en la documentación oficial de GSAP.

## Inventario previo preservado

Capturas `before-campaign-desktop.png` y `before-campaign-mobile.png`. La copia de
hosting estaba limpia al comenzar. Se conservaron:

- Titular, textos informativos, cuatro comparaciones y sus filtros.
- Contador y su referencia `2026-11-19T00:00:00-03:00`.
- MP4 original de Jason, controles nativos, loop, modo silenciado y enlaces oficiales.
- Dos acordeones, plataformas, especificaciones y fuentes existentes.
- Datos, consentimiento, código de seis dígitos, reenvío, corrección del email,
  confirmación, comprobante y baja. IDs y endpoints conservados.
- Rutas `/`, `/privacidad`, `/privacidad.html`, `/baja`, `/baja.html` y API.

El correo de producción mantiene su configuración previa. Las verificaciones
de registro se hicieron con LOCAL_MAIL=1, sin correos reales.

## Cuatro momentos

1. **Llegar a Vice City.** Imagen oficial a sangre y titular ensamblado por líneas.
   Introducción de 1,35 s, sin carga bloqueante ni espera para usar el CTA.
2. **Entrar en el adelanto.** El encuadre del reproductor se expande mediante escala;
   los bordes decorativos se retiran. Sin pinning del video ni capturar controles.
3. **De la calle a los personajes.** En escritorio el scroll conduce un recorrido
   horizontal breve por dos imágenes, con un único pin. En móvil se leen como dos
   composiciones verticales. Sin motor adicional de scroll.
4. **La inscripción.** La imagen de fondo resuelve su escala al llegar. El formulario
   permanece estático: la lectura y las acciones tienen prioridad.

La comparación usa filas editoriales; requisitos y registro conservan sus
componentes y lógica. La tipografía display es Barlow Condensed ExtraBold, local y
con licencia OFL incluida. Los créditos y orígenes de imágenes están en
`assets/campaign/sources.json`; no se generó gameplay ni se inventaron assets oficiales.

## Verificación

- 10 pruebas Node: ocho recorridos/seguridad de API y dos de assets binarios/CSP.
- E2E de registro existente: 12 comprobaciones, incluido código inválido, recibo y baja.
- E2E nuevo: 29 comprobaciones de filtros, acordeones, scroll reversible, teclado,
  movimiento reducido y seis anchos: 1440, 1024, 820, 768, 390 y 320.
- Recarga a mitad del recorrido: progreso 0,5 y un único pin recuperados.
- MP4: reproducción manual verificada, controls y muted verdaderos; pausado fuera de vista.
- GSAP bloqueado: titular visible, galería estática, formulario y enlaces presentes.
- Sin errores JavaScript en los recorridos normales.
- Muestreo Chromium de 150 intervalos rAF durante scroll controlado: mediana
  16,7 ms, p95 17,1 ms, máximo 33,2 ms. Es una medición del navegador de prueba,
  no garantía de 60 fps en móviles físicos ni perfil detallado de GPU.

Capturas actuales: `campaign-desktop.png`, `campaign-mobile.png`, `campaign-film.png`,
`campaign-leonida.png`, `campaign-registration.png`. El registro también se comprobó
en móvil con `backend-registration-mobile.png`.

## Revisión de movimiento

| Antes | Después | Motivo |
| --- | --- | --- |
| Luces ambientales y halos en bucle | Escenas acotadas y controles sin bucles | El movimiento explica los cambios de escena y deja descansar la lectura. |
| CTA con desplazamiento suave también al usar teclado | Salto inmediato por teclado con foco en el título del registro (`app.js`) | La interacción por teclado no debe esperar una coreografía. |
| Video solicitaba autoplay fuera de pantalla | Autoplay silenciado al entrar, pausa al salir y respeto de pausa manual (`app.js`) | Reduce trabajo invisible y preserva los controles nativos. |
| Presentación uniforme de contenido | Apertura, encuadre, recorrido y cierre con roles distintos (`cinema.js`) | Cohesión sin repetir un fade por sección. |
| Galería horizontal dependiente del motor | Grid estático sin GSAP o con movimiento reducido (`campaign.css`) | Las imágenes y acciones siguen disponibles. |

**Approve, en el alcance verificado.** Las escenas animan transformaciones, no
dimensiones de layout; controles bajo 200 ms, hover condicionado al puntero,
teclado sin desplazamiento animado, teardown de matchMedia y preferencias dinámicas.
La contracción a cero de los bordes es una cortina decorativa, no una entrada
de un componente desde escala cero. No se animan campos, mensajes ni estados de registro.

Pendiente de comprobar en hardware real: Safari/iPhone, Android de gama baja,
consumo térmico y lector de pantalla. No se afirma certificación de accesibilidad.

## Publicación comprobada

Versión 2 publicada en el proyecto existente. En producción cargan GSAP, las cuatro
secuencias y la imagen principal; el registro continúa cerrado por la configuración
de correo pendiente, como antes del cambio. No se modificaron secretos.

La consola de producción registra un bloqueo CSP de un script inline añadido por
la capa de hosting (crea un iframe oculto). No forma parte de nuestros archivos y
no aparece en el servidor local. La política `script-src 'self'` se conservó; no se
habilitó `unsafe-inline`. Las escenas y el endpoint `/api/status` funcionan. Resolver
esa inyección requiere configuración del hosting; se distingue de los recorridos
sin errores de la aplicación comprobados localmente.

## Reproducir

Desde `hosting`: `node scripts/sync-frontend.mjs`, `node scripts/build.mjs`,
`node --test tests/api.test.mjs tests/assets.test.mjs`.
Con LOCAL_MAIL=1, `node scripts/serve.mjs` abre el buzón local de pruebas.
`tests/e2e.js` y `tests/campaign-e2e.js` son funciones para Playwright MCP.
