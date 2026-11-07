import { readFile, writeFile, mkdir, cp, readdir } from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root = new URL('../', import.meta.url);
const types = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', jpg: 'image/jpeg', ttf: 'font/ttf', json: 'application/json', txt: 'text/plain; charset=utf-8' };
const assets = {};
for (const name of ['index.html', 'styles.css', 'campaign.css', 'cinema.js', 'spatial.css', 'spatial.js', 'app.js', 'registration.js', 'privacidad.html', 'baja.html']) {
  assets[`/${name}`] = { body: await readFile(new URL(`public/${name}`, root), 'utf8'), type: types[name.split('.').pop()] };
}
async function addAssets(relative='assets') {
  for (const entry of await readdir(new URL(`public/${relative}/`, root), {withFileTypes:true})) {
    const path=`${relative}/${entry.name}`;
    if(entry.isDirectory()) { await addAssets(path); continue; }
    const extension=entry.name.split('.').pop();
    if(!types[extension])throw new Error(`Tipo de asset no soportado: ${path}`);
    const binary=['jpg','ttf'].includes(extension);
    const buffer=await readFile(new URL(`public/${path}`,root));
    assets[`/${path}`]={body:buffer.toString(binary?'base64':'utf8'),type:types[extension],etag:`"${createHash('sha256').update(buffer).digest('hex').slice(0,24)}"`,...(binary?{encoding:'base64'}:{})};
  }
}
await addAssets();
assets['/privacidad'] = assets['/privacidad.html'];
assets['/baja'] = assets['/baja.html'];
assets['/robots.txt'] = { body: 'User-agent: *\nDisallow: /api/\nDisallow: /baja\n', type: 'text/plain; charset=utf-8' };
const generated = `export const assets = ${JSON.stringify(assets)};\n`;
await mkdir(new URL('generated/', root), { recursive: true });
await writeFile(new URL('generated/assets.mjs', root), generated);
const api = await readFile(new URL('server/api.mjs', root), 'utf8');
const worker = (await readFile(new URL('worker/index.mjs', root), 'utf8')).replace(/^import .*;\r?\n/gm, '');
await mkdir(new URL('dist/server/', root), { recursive: true });
await mkdir(new URL('dist/.openai/', root), { recursive: true });
await writeFile(new URL('dist/server/index.js', root), `${generated}\n${api}\n${worker}`);
await cp(new URL('.openai/hosting.json', root), new URL('dist/.openai/hosting.json', root));
await cp(new URL('drizzle/', root), new URL('dist/drizzle/', root), { recursive: true });
const bundle = await readFile(new URL('dist/server/index.js', root), 'utf8');
const module = await import(`data:text/javascript;base64,${Buffer.from(bundle).toString('base64')}`);
if (typeof module.default?.fetch !== 'function') throw new Error('El Worker no exporta fetch.');
console.log('Worker ESM y migraciones preparados sin dependencias.');
