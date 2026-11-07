import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handleApi } from '../server/api.mjs';
import { createDatabase } from '../scripts/local-db.mjs';

const schema = readFileSync(new URL('../drizzle/0000_registration.sql', import.meta.url), 'utf8');
function setup() {
  const DB = createDatabase(); DB.exec(schema);
  const emails = [];
  const env = { DB, CODE_SECRET: 'test-secret-only-not-for-production-123456789', LOCAL_TEST: true, TEST_MAILER: async mail => { emails.push(mail); }, PUBLIC_ORIGIN: 'https://landing.test', PRIVACY_CONTACT: 'owner@example.com' };
  const valid = { name: 'Jorge', email: 'jorge@example.com', platform: 'ps5', consent: true, website: '' };
  const call = async (path, body, origin = env.PUBLIC_ORIGIN) => {
    const request = new Request(`${env.PUBLIC_ORIGIN}/api/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'CF-Connecting-IP': '192.0.2.1' }, body: JSON.stringify(body),
    });
    const response = await handleApi(request, env);
    return { status: response.status, body: await response.json() };
  };
  const start = async () => {
    const result = await call('registration/start', valid);
    assert.equal(result.status, 202);
    return { challengeId: result.body.challengeId, code: /código de verificación es: (\d{6})/.exec(emails.at(-1).text)[1] };
  };
  return { DB, emails, env, valid, call, start };
}

test('registro, verificación, recibo idempotente y baja con borrado de datos', async () => {
  const x = setup();
  try {
    const challenge = await x.start();
    assert.equal((await x.DB.prepare('SELECT COUNT(*) AS n FROM registrations').first()).n, 0);
    const stored = await x.DB.prepare('SELECT code_hash FROM challenges').first();
    assert.equal(stored.code_hash.length, 64);
    assert.notEqual(stored.code_hash, challenge.code);
    const result = await x.call('registration/verify', challenge);
    assert.equal(result.status, 200);
    assert.equal(result.body.confirmed, true);
    assert.equal(result.body.receipt, 'sent');
    const repeat = await x.call('registration/verify', challenge);
    assert.equal(repeat.body.reference, result.body.reference);
    assert.equal(x.emails.length, 2);
    const token = /\/baja#([^\s]+)/.exec(x.emails[1].text)[1];
    assert.equal((await x.call('registration/unsubscribe', { token: `${token}0` })).status, 400);
    assert.equal((await x.call('registration/unsubscribe', { token })).status, 200);
    assert.equal((await x.DB.prepare('SELECT COUNT(*) AS n FROM registrations').first()).n, 0);
    assert.equal((await x.DB.prepare('SELECT COUNT(*) AS n FROM challenges').first()).n, 0);
  } finally { x.DB.close(); }
});
test('validación del servidor: consentimiento, plataforma, email, nombre y honeypot', async () => {
  const x = setup();
  try {
    for (const bad of [{ consent: false }, { platform: 'pc' }, { email: 'invalid' }, { name: ' ' }, { website: 'spam' }]) {
      assert.equal((await x.call('registration/start', { ...x.valid, ...bad })).status, 400);
    }
    assert.equal(x.emails.length, 0);
  } finally { x.DB.close(); }
});
test('rechaza solicitudes de otro origen y solicitudes JSON demasiado grandes', async () => {
  const x = setup();
  try {
    assert.equal((await x.call('registration/start', x.valid, 'https://other.test')).status, 403);
    assert.equal((await x.call('registration/start', { ...x.valid, data: 'a'.repeat(5000) })).status, 413);
  } finally { x.DB.close(); }
});
test('código vence y queda bloqueado tras cinco fallos', async () => {
  for (const scenario of ['expired', 'attempts']) {
    const x = setup();
    try {
      const challenge = await x.start();
      if (scenario === 'expired') await x.DB.prepare('UPDATE challenges SET expires_at = ?').bind(Date.now() - 1).run();
      else {
        const wrong = challenge.code === '000000' ? '000001' : '000000';
        for (let i = 0; i < 5; i++) assert.equal((await x.call('registration/verify', { ...challenge, code: wrong })).status, 400);
      }
      assert.equal((await x.call('registration/verify', challenge)).status, 400);
      assert.equal((await x.DB.prepare('SELECT COUNT(*) AS n FROM registrations').first()).n, 0);
    } finally { x.DB.close(); }
  }
});
test('reenvío respeta cooldown e invalida el código anterior', async () => {
  const x = setup();
  try {
    const first = await x.start();
    assert.equal((await x.call('registration/start', x.valid)).status, 429);
    await x.DB.prepare('UPDATE challenges SET created_at = ?').bind(Date.now() - 61000).run();
    const second = await x.start();
    assert.equal((await x.call('registration/verify', first)).status, 400);
    assert.equal((await x.call('registration/verify', second)).status, 200);
  } finally { x.DB.close(); }
});
test('no duplica un email confirmado aunque se vuelva a verificar', async () => {
  const x = setup();
  try {
    const first = await x.start();
    const result = await x.call('registration/verify', first);
    await x.DB.prepare('UPDATE challenges SET created_at = ?').bind(Date.now() - 61000).run();
    const second = await x.start();
    const again = await x.call('registration/verify', second);
    assert.equal(again.body.reference, result.body.reference);
    assert.equal((await x.DB.prepare('SELECT COUNT(*) AS n FROM registrations').first()).n, 1);
  } finally { x.DB.close(); }
});
test('fallos de correo no simulan envíos ni revierten una inscripción confirmada', async () => {
  const x = setup();
  try {
    const challenge = await x.start();
    x.env.TEST_MAILER = async () => { throw new Error('mail unavailable'); };
    const result = await x.call('registration/verify', challenge);
    assert.equal(result.body.confirmed, true);
    assert.equal(result.body.receipt, 'pending');
    x.env.TEST_MAILER = async mail => x.emails.push(mail);
    assert.equal((await x.call('registration/verify', challenge)).body.receipt, 'sent');
    await x.DB.prepare('UPDATE challenges SET created_at = ?').bind(Date.now() - 61000).run();
    x.env.TEST_MAILER = async () => { throw new Error('mail unavailable'); };
    assert.equal((await x.call('registration/start', { ...x.valid, email: 'another@example.com' })).status, 500);
    assert.equal((await x.DB.prepare("SELECT status FROM challenges WHERE email = 'another@example.com'").first()).status, 'failed');
  } finally { x.DB.close(); }
});
test('sin credenciales el registro está cerrado y no filtra secretos', async () => {
  const x = setup();
  try {
    delete x.env.LOCAL_TEST;
    const status = await handleApi(new Request('https://landing.test/api/status'), x.env);
    assert.equal((await status.json()).registrationAvailable, false);
    assert.equal((await x.call('registration/start', x.valid)).status, 503);
  } finally { x.DB.close(); }
});
