import{readFile,writeFile}from'node:fs/promises';
const path=new URL('../index.html',import.meta.url);let html=await readFile(path,'utf8');
html=html.replace('<img class="world-poster" src="assets/spatial/scene-poster.jpg" width="1440" height="900" alt="" fetchpriority="high">','<picture class="world-poster"><source media="(max-width:760px)" srcset="assets/spatial/scene-poster-mobile.jpg"><img src="assets/spatial/scene-poster.jpg" width="1440" height="900" alt="" fetchpriority="high"></picture>');
await writeFile(path,html);
