import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createDatabase } from './local-db.mjs';
import worker from '../worker/index.mjs';

const root = new URL('../', import.meta.url);
const envFile = new URL('.env', root);
if (existsSync(envFile)) process.loadEnvFile(envFile);
mkdirSync(new URL('.data/', root), { recursive: true });
const DB = createDatabase(fileURLToPath(new URL('.data/registration.sqlite', root)));
DB.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
if (!await DB.prepare('SELECT name FROM local_migrations WHERE name = ?').bind('0000_registration').first()) {
  DB.exec(readFileSync(new URL('drizzle/0000_registration.sql', root), 'utf8'));
  await DB.prepare('INSERT INTO local_migrations (name) VALUES (?)').bind('0000_registration').run();
}
const port = Number(process.env.PORT || 4173);
const origin = `http://127.0.0.1:${port}`;
const mailbox = [];
const env = { ...process.env, DB, PUBLIC_ORIGIN: origin };
if (process.env.LOCAL_MAIL === '1') {
  env.LOCAL_TEST = true;
  env.CODE_SECRET = randomBytes(32).toString('hex');
  env.PRIVACY_CONTACT = 'test@example.com';
  env.TEST_MAILER = async mail => { mailbox.push(mail); };
  console.log('BUZÓN DE PRUEBAS LOCAL: no se envían correos reales.');
}
const server = createServer(async (incoming, outgoing) => {
  try {
    if (env.LOCAL_TEST && incoming.url === '/__test/mail') {
      outgoing.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      outgoing.end(JSON.stringify(mailbox));
      return;
    }
    const url = new URL(incoming.url, origin);
    const init = { method: incoming.method, headers: incoming.headers };
    if (!['GET', 'HEAD'].includes(incoming.method)) Object.assign(init, { body: Readable.toWeb(incoming), duplex: 'half' });
    const response = await worker.fetch(new Request(url, init), env);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch { outgoing.writeHead(500); outgoing.end('Error interno'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Local: ${origin}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { DB.close(); process.exit(); }));
