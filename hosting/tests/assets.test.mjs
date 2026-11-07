import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../worker/index.mjs';

test('el Worker sirve imágenes y fuentes binarias sin corromperlas',async()=>{
  for(const [path,type] of [['assets/campaign/vice-city.jpg','image/jpeg'],['assets/campaign/BarlowCondensed-ExtraBold.ttf','font/ttf']]){
    const response=await worker.fetch(new Request(`https://example.com/${path}`),{});
    assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),type);
    const expected=await readFile(new URL(`../public/${path}`,import.meta.url));
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),expected);
    const etag=response.headers.get('etag');assert.ok(etag);
    const cached=await worker.fetch(new Request(`https://example.com/${path}`,{headers:{'If-None-Match':etag}}),{});
    assert.equal(cached.status,304);assert.equal((await cached.arrayBuffer()).byteLength,0);
    const head=await worker.fetch(new Request(`https://example.com/${path}`,{method:'HEAD'}),{});
    assert.equal(head.headers.get('content-type'),type);assert.equal((await head.arrayBuffer()).byteLength,0);
  }
});
test('las escenas se sirven con CSP y recursos locales; se mantienen 404 y 405',async()=>{
  const page=await worker.fetch(new Request('https://example.com/'),{});
  assert.match(page.headers.get('content-security-policy'),/script-src 'self'/);
  assert.match(await page.text(),/assets\/vendor\/ScrollTrigger.min.js/);
  assert.equal((await worker.fetch(new Request('https://example.com/no-existe'),{})).status,404);
  assert.equal((await worker.fetch(new Request('https://example.com/',{method:'POST'}),{})).status,405);
});
