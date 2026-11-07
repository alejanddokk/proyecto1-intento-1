import { copyFile, mkdir, cp } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
await mkdir(new URL('public/', root), { recursive: true });
for (const file of ['index.html', 'styles.css', 'campaign.css', 'cinema.js', 'spatial.css', 'spatial.js', 'app.js', 'registration.js', 'privacidad.html', 'baja.html']) {
  await copyFile(new URL(`../${file}`, root), new URL(`public/${file}`, root));
}
await cp(new URL('../assets/', root), new URL('public/assets/', root), { recursive: true });
console.log('Frontend sincronizado con hosting/public.');
