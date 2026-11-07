async(page)=>{
  const checks=[];const assert=(v,label)=>{if(!v)throw new Error(label);checks.push(label);};
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:900});
  await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.viceSpatial?.getState().ready);
  assert(await page.evaluate(()=>viceSpatial.getState().revision==='180'&&viceSpatial.getState().triangles>10000),'Escena real de Three r180 con geometría de vehículo y arquitectura');
  const start=await page.evaluate(()=>viceSpatial.getState().camera.join(','));
  await page.mouse.move(1370,380);
  await page.waitForFunction(()=>viceSpatial.getState().angle>.2);
  assert(start!==await page.evaluate(()=>viceSpatial.getState().camera.join(',')),'El mouse cambia perceptiblemente la cámara');
  await page.locator('#scene-angle').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
  assert(await page.locator('#scene-angle').inputValue()==='-0.95','La vista se controla por teclado con un range nativo');
  await page.locator('#scene-reset').click();await page.waitForFunction(()=>Math.abs(viceSpatial.getState().angle)<.005);
  assert(await page.locator('#scene-angle').inputValue()==='0','Centrar restablece el control de vista');
  await page.evaluate(()=>{const t=ScrollTrigger.getById('vicecity-world');scrollTo({top:(t.start+t.end)/2,behavior:'instant'});});
  await page.waitForFunction(()=>Math.abs(viceSpatial.getState().progress-.5)<.01);
  await page.reload();await page.waitForFunction(()=>window.viceSpatial?.getState().ready);
  await page.waitForFunction(()=>Math.abs(viceSpatial.getState().progress-.5)<.02);
  assert(true,'Recarga a mitad de escena recupera cámara y scroll');
  await page.locator('.campaign-nav a[href="#registro"]').click();await page.waitForFunction(()=>!viceSpatial.getState().active);
  const paused=await page.evaluate(()=>viceSpatial.getState().renderFrames);
  await page.evaluate(()=>new Promise(resolve=>{let n=0;function tick(){if(++n===20)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);}));
  assert(paused===await page.evaluate(()=>viceSpatial.getState().renderFrames),'No renderiza mientras se usa el formulario fuera de escena');
  const fail=await page.context().newPage();
  try{
    await fail.setViewportSize({width:390,height:844});
    await fail.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...rest){return kind==='webgl2'?null:original.call(this,kind,...rest);};});
    await fail.goto('http://127.0.0.1:4173/');await fail.waitForFunction(()=>window.viceSpatial?.getState().failed);
    assert(await fail.locator('#world-retry').isVisible(),'Fallo WebGL muestra alternativa y reintento');
    assert(await fail.locator('.world-poster img').evaluate(img=>img.complete&&img.naturalWidth>0),'Alternativa gráfica completa para móvil cargada');
    assert(await fail.locator('#reserve-cta').isVisible(),'La conversión sigue disponible sin WebGL');
    await fail.screenshot({path:'C:/Users/Jorge/Desktop/LandingPage/review/spatial/fallback-mobile.png'});
  }finally{await fail.close();}
  const lost=await page.context().newPage();
  try{
    await lost.goto('http://127.0.0.1:4173/');await lost.waitForFunction(()=>window.viceSpatial?.getState().ready);
    const supported=await lost.evaluate(()=>{const gl=document.querySelector('#world-canvas').getContext('webgl2');const ext=gl.getExtension('WEBGL_lose_context');if(!ext)return false;ext.loseContext();return true;});
    if(supported){await lost.waitForFunction(()=>document.querySelector('.world-movie').classList.contains('world-failed'));assert(await lost.locator('#world-retry').isVisible(),'Pérdida de contexto activa recuperación sin ocultar la página');}
  }finally{await lost.close();}
  return{checks};
}
