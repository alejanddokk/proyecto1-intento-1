import {readFile,writeFile} from 'node:fs/promises';
const path = new URL('../index.html',import.meta.url);
let html=await readFile(path,'utf8');
if(html.includes('campaign.css'))throw new Error('La evolución ya está aplicada');
html=html.replace('<link rel="stylesheet" href="styles.css">','<link rel="preload" href="assets/campaign/BarlowCondensed-ExtraBold.ttf" as="font" type="font/ttf" crossorigin>\n    <link rel="preload" href="assets/campaign/vice-city.jpg" as="image">\n    <link rel="stylesheet" href="styles.css">\n    <link rel="stylesheet" href="campaign.css">');
html=html.replace('<body>','<body class="campaign">');
html=html.replace('<span class="hero__edition">Vice City / Nueva era</span>','<span class="hero__edition">Vice City / Nueva era</span>\n        <nav class="campaign-nav" aria-label="Navegación principal"><a href="#adelanto">Ver adelanto</a><a href="#comparativa">Comparar</a><a href="#hardware">Requisitos</a><a class="nav-register" href="#registro">Reservar mi cupo <span aria-hidden="true">↗</span></a></nav>\n        <button class="motion-control" id="motion-control" type="button" aria-pressed="false" hidden>Reducir animación</button>');
html=html.replace('<div class="hero__inner">','<div class="hero-art" aria-hidden="true"><img src="assets/campaign/vice-city.jpg" width="1600" height="900" alt="" fetchpriority="high"><div class="hero-art__shade"></div></div>\n        <div class="hero__inner">');
html=html.replace('<h1 id="hero-title">La espera es real.<br>La próxima historia<br><span>es tuya.</span></h1>','<h1 id="hero-title"><span class="headline-row"><span class="headline-ink">La espera es real.</span></span><span class="headline-row"><span class="headline-ink">La próxima historia</span></span><span class="headline-row"><span class="headline-ink">es tuya.</span></span></h1>');
const start=html.indexOf('<figure class="hero__media"');
const end=html.indexOf('</figure>',start)+9;
let figure=html.slice(start,end).replace('preload="metadata"','preload="none"\n                  poster="assets/campaign/leonida.jpg"');
html=html.slice(0,start)+html.slice(end);
const scenes=`<section class="film-scene" id="adelanto" aria-labelledby="film-title">
        <div class="film-scene__stage">
          <div class="film-scene__title"><h2 id="film-title">Algunas ciudades<br><em>nunca se olvidan.</em></h2><span aria-hidden="true" class="film-scene__numeral">VI</span></div>
          ${figure}
          <div class="film-shutter film-shutter--left" aria-hidden="true"></div><div class="film-shutter film-shutter--right" aria-hidden="true"></div>
        </div>
      </section>
      <section class="leonida-scene" id="leonida" aria-labelledby="leonida-title">
        <div class="leonida-scene__stage">
          <h2 id="leonida-title">De Los Santos<br>a <span>Vice City.</span></h2>
          <div class="leonida-track">
            <figure class="leonida-frame"><img src="assets/campaign/leonida.jpg" width="1280" height="720" alt="Una calle de Leonida bajo un viaducto, en una captura oficial de GTA VI" loading="lazy" decoding="async"><figcaption>Leonida / La vida en la calle</figcaption></figure>
            <figure class="leonida-frame leonida-frame--portrait"><img src="assets/campaign/keyart.jpg" width="1600" height="900" alt="Jason y Lucia frente a Vice City en el arte oficial de GTA VI" loading="lazy" decoding="async"><figcaption>Jason y Lucia / Vice City</figcaption></figure>
          </div>
          <a class="scene-link" href="#comparativa">Explorar lo que sabemos <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      `;
html=html.replace('<section class="section" id="comparativa"',scenes+'<section class="section" id="comparativa"');
html=html.replace('<section class="section registration" id="registro" aria-labelledby="registration-title">','<section class="section registration" id="registro" aria-labelledby="registration-title">\n        <div class="registration-art" aria-hidden="true"><img src="assets/campaign/keyart.jpg" width="1600" height="900" alt="" loading="lazy" decoding="async"></div>');
html=html.replace('<script src="app.js"></script>','<script src="assets/vendor/gsap.min.js"></script>\n    <script src="assets/vendor/ScrollTrigger.min.js"></script>\n    <script src="app.js"></script>');
html=html.replace('<script src="registration.js"></script>','<script src="registration.js"></script>\n    <script src="cinema.js"></script>');
await writeFile(path,html);
