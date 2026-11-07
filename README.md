# Vice City — Landing y registro verificado

Frontend HTML5/CSS3/JavaScript vanilla. Backend JavaScript nativo compatible con
Cloudflare Workers, base D1 persistente y correo transaccional con Resend.
Sin frameworks ni dependencias npm.

La propuesta local usa Three.js r180, GSAP 3.13.0 y ScrollTrigger locales.
`spatial.css`, `spatial.js` y `assets/spatial/` construyen la nueva presentación;
la lógica del registro sigue en `registration.js`. Ver `SPATIAL_REDESIGN.md` para
dirección, recursos y mediciones. Sin WebGL se muestra una imagen de la escena.
Con movimiento reducido la cámara permanece estable. No publicar esta propuesta
sin una nueva instrucción explícita. `CAMPAIGN.md` describe la versión anterior.

## Registro en tres pasos

1. Nombre, email, plataforma y consentimiento.
2. Código de seis dígitos por email, válido durante diez minutos.
3. Inscripción persistida y correo de comprobante con referencia y enlace de baja.

Es una lista independiente: no compra el juego ni reserva stock oficial.
No solicita contraseñas de Gmail.

## Archivos

- `index.html`, `styles.css`, `app.js`: landing y secciones informativas.
- `registration.js`: API, verificación y baja.
- `privacidad.html`, `baja.html`: información de privacidad y eliminación.
- `hosting/server/api.mjs`: backend y correo.
- `hosting/drizzle/`: migraciones D1.
- `hosting/public/`: frontend publicable.
- `hosting/worker/`: entrada del servidor alojado.
- `hosting/scripts/`: build y desarrollo local con SQLite.
- `hosting/tests/`: pruebas del servidor y navegador.
- `hosting/.openai/hosting.json`: identidad del sitio; reutilizarla en futuras publicaciones.

Tras modificar el frontend en la raíz, desde `hosting` ejecuta:

```powershell
node scripts/sync-frontend.mjs
node scripts/build.mjs
node --test tests/api.test.mjs
```

Las pruebas de assets binarios y encabezados se ejecutan con
`node --test tests/assets.test.mjs`; `tests/campaign-e2e.js` verifica las escenas
con Playwright MCP sobre el servidor local. `tests/spatial-e2e.js` añade pruebas
de cámara, teclado, pausa fuera de pantalla y fallos de WebGL. Los archivos de
navegador exportan una función para `browser_run_code_unsafe`, no son scripts CLI.

## Activar correo real

1. Abre una cuenta en [Resend](https://resend.com/).
2. Añade un dominio que controles y configura los DNS de
   [verificación de remitente](https://resend.com/docs/dashboard/domains/introduction).
   Ese dominio es independiente del host de la landing.
3. Crea una API key con permiso de envío. Los destinatarios pueden ser Gmail u otro proveedor.
4. Configura en los secretos del servidor:

| Variable | Contenido |
| --- | --- |
| `RESEND_API_KEY` | API key de Resend; secreta |
| `EMAIL_FROM` | `Vice City <registro@tu-dominio-verificado.com>` |
| `PRIVACY_CONTACT` | Dirección pública del responsable |
| `PUBLIC_ORIGIN` | URL HTTPS pública; ya configurada en el hosting |
| `CODE_SECRET` | Clave aleatoria del servidor; ya generada en el hosting |

Para que Codex termine la conexión, completa `RESEND_API_KEY`, `EMAIL_FROM` y
`PRIVACY_CONTACT` en el archivo ya preparado `hosting/.env`. No pegues claves en el chat.
El archivo `.env` está excluido de Git. Codex puede cargar esos valores al hosting sin
mostrarlos, conservando el `CODE_SECRET` existente. Hay que desplegar una versión
después de modificar las variables del servidor.

Mientras falte esa configuración, la landing permanece visible y el registro cerrado.
No se simulan envíos ni confirmaciones. Resend puede aceptar un correo antes de su
entrega: comprueba Spam, DNS y los registros de entrega del proveedor.

## Desarrollo local

Requiere Node.js 24 o posterior. Desde `hosting`:

```powershell
node scripts/build.mjs
node scripts/serve.mjs
```

Abre `http://127.0.0.1:4173`. La inscripción necesita HTTP y un backend; desde
`file://` la landing se ve pero el registro se deshabilita.

Para pruebas sin enviar mensajes reales:

```powershell
$env:LOCAL_MAIL = '1'
node scripts/serve.mjs
```

El buzón `/__test/mail` existe solo en ese servidor de pruebas, ligado a loopback.
No está implementado en el Worker de producción. La base local está en `.data/`,
excluida de Git.

## Protección incluida

- Validación en servidor y SQL parametrizado.
- Códigos criptográficos; solo se persiste su HMAC.
- Cinco intentos por código, caducidad y límites por IP y email.
- Reenvío con espera de 60 segundos e invalidación del código anterior.
- Un registro por email y comprobantes idempotentes.
- Origen verificado, JSON limitado a 4 KB y honeypot.
- HTTPS del hosting, CSP y encabezados de seguridad.
- Consentimiento versionado y baja por acción explícita para evitar borrados por
  escáneres automáticos de enlaces.
- No existe un endpoint público para listar o exportar los inscritos.

## Pruebas

`node --test tests/api.test.mjs`: pruebas de servidor con SQLite real.
`tests/e2e.js`: función para Playwright MCP con `LOCAL_MAIL=1`.
Comprueba los tres pasos, código inválido, comprobante, baja y tamaños responsive.
No envía correos reales.

## Contenido del juego

El contador usa `2026-11-19T00:00:00-03:00`, referencia de Buenos Aires.
El MP4 temporal procede del catálogo oficial de Rockstar. Las fuentes editoriales
en la página separan confirmaciones de observaciones; no se inventan requisitos de PC.
