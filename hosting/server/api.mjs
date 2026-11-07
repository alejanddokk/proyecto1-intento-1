const CONSENT_VERSION = '2026-11-04';
const TTL = 10 * 60 * 1000;
const encoder = new TextEncoder();
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});
class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const testMail = env => env.LOCAL_TEST === true && typeof env.TEST_MAILER === 'function';
export const isReady = env => Boolean(env.DB && env.CODE_SECRET?.length >= 32 &&
  (testMail(env) || (env.RESEND_API_KEY && env.EMAIL_FROM && env.PUBLIC_ORIGIN && env.PRIVACY_CONTACT)));

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return Array.from(new Uint8Array(signed), byte => byte.toString(16).padStart(2, '0')).join('');
}
function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index++) mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return mismatch === 0;
}
function generateCode() {
  const random = new Uint32Array(1);
  do { crypto.getRandomValues(random); } while (random[0] >= 4294000000);
  return String(random[0] % 1000000).padStart(6, '0');
}
async function bodyOf(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new ApiError(415, 'Se requiere una solicitud JSON.');
  if (Number(request.headers.get('Content-Length')) > 4096) throw new ApiError(413, 'Solicitud demasiado grande.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'Faltan los datos.');
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) { await reader.cancel(); throw new ApiError(413, 'Solicitud demasiado grande.'); }
    chunks.push(value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(buffer));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch { throw new ApiError(400, 'Datos inválidos.'); }
}
async function limit(env, scope, identity, maximum, windowMs) {
  const now = Date.now();
  const period = Math.floor(now / windowMs);
  const key = await hmac(env.CODE_SECRET, `${scope}:${identity}:${period}`);
  const row = await env.DB.prepare(`INSERT INTO rate_limits (key, hits, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET hits = hits + 1 RETURNING hits`).bind(key, (period + 1) * windowMs).first();
  if (row.hits > maximum) throw new ApiError(429, 'Demasiados intentos. Espera unos minutos antes de volver a probar.');
}
async function sendMail(env, mail, idempotencyKey) {
  if (testMail(env)) return env.TEST_MAILER(mail);
  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ from: env.EMAIL_FROM, ...mail }),
      signal: AbortSignal.timeout(10000),
    });
  } catch { throw new ApiError(502, 'El servicio de correo no respondió. Intenta nuevamente en un momento.'); }
  if (!response.ok) throw new ApiError(502, 'No pudimos enviar el correo. Intenta nuevamente en un momento.');
}
function validateRegistration(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (name.length < 2 || name.length > 80 || /[\u0000-\u001f\u007f]/u.test(name)) throw new ApiError(400, 'El nombre debe tener entre 2 y 80 caracteres.');
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(email)) throw new ApiError(400, 'Escribe un email válido.');
  if (!['ps5', 'xbox'].includes(body.platform)) throw new ApiError(400, 'Selecciona una plataforma válida.');
  if (body.consent !== true) throw new ApiError(400, 'Necesitamos tu autorización para procesar el registro.');
  if (body.website) throw new ApiError(400, 'No pudimos procesar el registro.');
  return { name, email, platform: body.platform };
}
async function startRegistration(env, body) {
  const { name, email, platform } = validateRegistration(body);
  await limit(env, 'email', email, 4, 3600000);
  const now = Date.now();
  const recent = await env.DB.prepare('SELECT created_at FROM challenges WHERE email = ? ORDER BY created_at DESC LIMIT 1').bind(email).first();
  if (recent && now - recent.created_at < 60000) throw new ApiError(429, 'Espera 60 segundos antes de pedir otro código.');
  const id = crypto.randomUUID();
  const code = generateCode();
  const codeHash = await hmac(env.CODE_SECRET, `verify:${id}:${code}`);
  await env.DB.prepare(`INSERT INTO challenges (id, email, name, platform, code_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(id, email, name, platform, codeHash, now + TTL, now).run();
  try {
    await sendMail(env, {
      to: [email], subject: 'Tu código para la lista de lanzamiento — Vice City',
      text: `Tu código de verificación es: ${code}\n\nVence en 10 minutos. Introdúcelo en la página donde solicitaste el registro. No lo compartas.\n\nSi no solicitaste este correo, ignóralo: no se confirmará ningún registro.\n\nProyecto independiente, sin afiliación con Rockstar Games. No incluye una compra del juego.`,
    }, `verification/${id}`);
  } catch (error) {
    await env.DB.prepare("UPDATE challenges SET status = 'failed' WHERE id = ?").bind(id).run();
    throw error;
  }
  // Solo invalidar el código anterior después de que el nuevo envío fue aceptado.
  await env.DB.batch([
    env.DB.prepare("UPDATE challenges SET status = 'superseded' WHERE email = ? AND status = 'ready' AND created_at <= ?").bind(email, now),
    env.DB.prepare("UPDATE challenges SET status = 'ready' WHERE id = ? AND status = 'sending'").bind(id),
  ]);
  return json({ challengeId: id, expiresIn: TTL / 1000, resendAfter: 60 }, 202);
}
async function receipt(env, registration) {
  if (registration.receipt_sent_at) return 'sent';
  const token = `${registration.id}.${await hmac(env.CODE_SECRET, `unsubscribe:${registration.id}`)}`;
  const origin = new URL(env.PUBLIC_ORIGIN).origin;
  try {
    await sendMail(env, {
      to: [registration.email], subject: 'Registro confirmado — Lista de lanzamiento Vice City',
      text: `Tu correo fue verificado y tu inscripción en nuestra lista de lanzamiento está confirmada.\n\nReferencia: ${registration.id}\nPlataforma: ${registration.platform === 'ps5' ? 'PS5' : 'Xbox Series X|S'}\n\nNo constituye una compra ni garantiza una copia o acceso anticipado al juego. Proyecto independiente, sin afiliación con Rockstar Games.\n\nEliminar tu inscripción: ${origin}/baja#${token}\nContacto: ${env.PRIVACY_CONTACT}`,
    }, `receipt/${registration.id}`);
    await env.DB.prepare('UPDATE registrations SET receipt_sent_at = ? WHERE id = ?').bind(Date.now(), registration.id).run();
    return 'sent';
  } catch { return 'pending'; }
}
async function verifyRegistration(env, body) {
  if (!/^[a-f0-9-]{36}$/i.test(body.challengeId || '') || !/^\d{6}$/.test(body.code || '')) throw new ApiError(400, 'Introduce el código de 6 dígitos.');
  const row = await env.DB.prepare('SELECT * FROM challenges WHERE id = ?').bind(body.challengeId).first();
  const invalid = () => new ApiError(400, 'Código incorrecto, vencido o sin intentos disponibles. Solicita uno nuevo si es necesario.');
  if (!row || row.expires_at <= Date.now() || !['ready', 'verified'].includes(row.status)) throw invalid();
  if (row.status === 'ready') {
    const attempt = await env.DB.prepare("UPDATE challenges SET attempts = attempts + 1 WHERE id = ? AND status = 'ready' AND attempts < 5 RETURNING attempts").bind(row.id).first();
    if (!attempt) throw invalid();
  }
  const hash = await hmac(env.CODE_SECRET, `verify:${row.id}:${body.code}`);
  if (!equal(hash, row.code_hash)) throw invalid();
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO registrations (id, email, name, platform, consent_version, confirmed_at)
      SELECT ?, email, name, platform, ?, ? FROM challenges WHERE id = ? AND status = 'ready' AND code_hash = ? AND expires_at > ?
      ON CONFLICT(email) DO NOTHING`).bind(crypto.randomUUID(), CONSENT_VERSION, now, row.id, hash, now),
    env.DB.prepare(`UPDATE challenges SET status = 'verified', registration_id = (SELECT id FROM registrations WHERE email = challenges.email)
      WHERE id = ? AND status = 'ready' AND code_hash = ? AND expires_at > ?`).bind(row.id, hash, now),
  ]);
  const registration = await env.DB.prepare(`SELECT r.* FROM registrations r JOIN challenges c ON c.registration_id = r.id
    WHERE c.id = ? AND c.status = 'verified'`).bind(row.id).first();
  if (!registration) throw invalid();
  return json({ confirmed: true, reference: registration.id, platform: registration.platform, receipt: await receipt(env, registration) });
}
async function unsubscribe(env, body) {
  const match = /^([a-f0-9-]{36})\.([a-f0-9]{64})$/i.exec(body.token || '');
  if (!match || !equal(await hmac(env.CODE_SECRET, `unsubscribe:${match[1]}`), match[2])) throw new ApiError(400, 'El enlace de baja no es válido.');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM challenges WHERE email IN (SELECT email FROM registrations WHERE id = ?)').bind(match[1]),
    env.DB.prepare('DELETE FROM registrations WHERE id = ?').bind(match[1]),
  ]);
  return json({ removed: true });
}

export async function handleApi(request, env) {
  const path = new URL(request.url).pathname;
  if (path === '/api/status' && request.method === 'GET') return json({ registrationAvailable: isReady(env), privacyContact: env.PRIVACY_CONTACT || null });
  if (!['/api/registration/start', '/api/registration/verify', '/api/registration/unsubscribe'].includes(path)) return json({ message: 'Ruta no encontrada.' }, 404);
  if (request.method !== 'POST') return json({ message: 'Método no permitido.' }, 405);
  const origin = env.PUBLIC_ORIGIN || new URL(request.url).origin;
  if (request.headers.get('Origin') !== new URL(origin).origin) return json({ message: 'Origen no permitido.' }, 403);
  if (!isReady(env)) return json({ message: 'El registro está temporalmente cerrado mientras configuramos el servicio de correo. Vuelve pronto.' }, 503);
  try {
    const identity = request.headers.get('CF-Connecting-IP') || 'unknown';
    await limit(env, path, identity, path.endsWith('/start') ? 10 : 30, 3600000);
    const body = await bodyOf(request);
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM challenges WHERE expires_at < ?').bind(now - 86400000),
      env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now),
    ]);
    if (path.endsWith('/start')) return await startRegistration(env, body);
    if (path.endsWith('/verify')) return await verifyRegistration(env, body);
    return await unsubscribe(env, body);
  } catch (error) {
    if (error instanceof ApiError) return json({ message: error.message }, error.status);
    // No registrar cuerpos, correos, códigos ni mensajes del proveedor.
    return json({ message: 'No pudimos completar la operación. Intenta nuevamente.' }, 500);
  }
}
