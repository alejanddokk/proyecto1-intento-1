async(page)=>{
  const checks=[];const errors=[];
  const assert=(value,label)=>{if(!value)throw new Error(label);checks.push(label);};
  try{
  page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:1440,height:900});
  await page.goto('http://127.0.0.1:4173/');await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>window.ScrollTrigger?.getAll().length===3&&window.viceSpatial?.getState().ready);
  assert(await page.locator('#countdown').getAttribute('data-launch')==='2026-11-19T00:00:00-03:00','Fecha original preservada');
  assert(await page.locator('video source').getAttribute('src')==='https://www.rockstargames.com/VI/_next/static/media/Jason_Duval_Video_Clip.10.gc09c9y-j9.mp4','Fuente original del clip preservada');
  await page.getByRole('button',{name:'Confirmado',exact:true}).click();
  assert(await page.locator('.comparison-card:visible').count()===1,'Filtro confirmado muestra un tema');
  await page.getByRole('button',{name:'Visto en adelantos',exact:true}).click();
  assert(await page.locator('.comparison-card:visible').count()===3,'Filtro adelantos muestra tres temas');
  await page.getByRole('button',{name:'Todo',exact:true}).click();
  assert(await page.locator('.comparison-card:visible').count()===4,'Filtro Todo restaura la comparativa');
  for(const id of ['minimum','recommended']){
    await page.locator(`#${id}-trigger`).click();
    assert(await page.locator(`#${id}-panel`).isVisible(),`${id}: acordeón abre`);
    await page.locator(`#${id}-trigger`).click();
    assert(await page.locator(`#${id}-panel`).isHidden(),`${id}: acordeón cierra`);
  }
  const travel=await page.evaluate(()=>{const t=ScrollTrigger.getById('vicecity-world');return{start:t.start,end:t.end};});
  await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),travel.end);
  await page.waitForFunction(()=>viceSpatial.getState().progress>.99);
  const endX=await page.evaluate(()=>viceSpatial.getState().camera.join(','));
  await page.evaluate(y=>scrollTo({top:Math.max(0,y-2),behavior:'instant'}),travel.start);
  await page.waitForFunction(()=>viceSpatial.getState().progress<.01);
  assert(endX!==await page.evaluate(()=>viceSpatial.getState().camera.join(',')),'Recorrido de cámara 3D reversible');
  await page.locator('#motion-control').click();
  assert(await page.evaluate(()=>ScrollTrigger.getAll().length===0),'Pausa elimina pinning y secuencias');
  assert(await page.evaluate(()=>viceSpatial.getState().ready&&viceSpatial.getState().progress===0),'Escena completa y estable al reducir animación');
  await page.locator('#motion-control').click();
  await page.waitForFunction(()=>ScrollTrigger.getAll().length===3);
  for(const width of [1440,1024,820,768,390,320]){
    await page.setViewportSize({width,height:900});
    await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth,null,{timeout:2000});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Sin overflow a ${width}px`);
    assert(await page.evaluate(()=>innerWidth>760||!ScrollTrigger.getById('vicecity-leonida')),`Sin pin horizontal en móvil ${width}px`);
  }
  await page.locator('#reserve-cta').focus();await page.keyboard.press('Enter');
  assert(await page.locator('#registration-title').evaluate(e=>e===document.activeElement),'CTA por teclado lleva foco al registro');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>ScrollTrigger.getAll().length===0);
  assert(await page.locator('#motion-control').getAttribute('aria-pressed')==='true','Preferencia de movimiento reducido respetada');
  assert(await page.locator('.headline-ink').first().evaluate(e=>getComputedStyle(e).visibility!=='hidden'),'Titular visible sin animación');
  assert(await page.locator('#hero-video').evaluate(v=>v.paused),'Video no se reproduce automáticamente con movimiento reducido');
  assert(errors.length===0,'Sin errores JavaScript en el recorrido');
  await page.emulateMedia({reducedMotion:'no-preference'});
  return{checks,errors};
  }catch(error){throw new Error(`Última comprobación: ${checks.at(-1)||'carga inicial'}. ${error.message}`);}
}
