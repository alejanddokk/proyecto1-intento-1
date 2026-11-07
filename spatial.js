/* GSAP owns the narrative signal. Three owns the camera. CSS owns controls. */
(() => {
  'use strict';
  const canvas=document.querySelector('#world-canvas');
  const wrapper=document.querySelector('.world-movie');
  const button=document.querySelector('#motion-control');
  const slider=document.querySelector('#scene-angle');
  const status=document.querySelector('#world-status');
  const retry=document.querySelector('#world-retry');
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  let world=null,media=null,manual=false,visible=true,disposed=false,refreshId=0;
  window.viceSpatial={getState:()=>world?.getState()||{ready:false,failed:wrapper.classList.contains('world-failed'),revision:null}};
  function refresh(){cancelAnimationFrame(refreshId);refreshId=requestAnimationFrame(()=>window.ScrollTrigger?.refresh());}
  function fail(error){
    document.body.classList.remove('world-ready');wrapper.classList.add('world-failed');
    status.textContent='Vista alternativa. Puedes seguir explorando y usar el registro.';
    retry.hidden=false;document.querySelector('#scene-controls').hidden=true;
    console.warn('La escena 3D usa su alternativa:',error.message);
  }
  function motion(){
    media?.revert();media=null;
    const reduced=preference.matches||manual;
    document.body.classList.toggle('motion-reduced',reduced);
    button.textContent=preference.matches?'Movimiento reducido':reduced?'Activar animación':'Reducir animación';
    button.disabled=preference.matches;button.setAttribute('aria-pressed',String(reduced));
    world?.setReduced(reduced);
    document.dispatchEvent(new Event('cinema-motion-change'));
    if(reduced||!window.gsap||!window.ScrollTrigger)return;
    gsap.registerPlugin(ScrollTrigger);media=gsap.matchMedia();
    media.add({wide:'(min-width:761px)',compact:'(max-width:760px)'},context=>{
      const wide=context.conditions.wide;
      ScrollTrigger.create({id:'vicecity-world',trigger:wrapper,start:'top top',end:'bottom bottom',onUpdate:self=>world?.setProgress(self.progress),onRefresh:self=>world?.setProgress(self.progress)});
      gsap.fromTo('.leonida-frame:first-child',{yPercent:wide?14:3},{yPercent:0,ease:'none',scrollTrigger:{id:'vicecity-territory',trigger:'.leonida-scene',start:'top bottom',end:'center center',scrub:wide?.4:.2}});
      gsap.fromTo('.film-scene__numeral',{y:30},{y:0,ease:'none',scrollTrigger:{id:'vicecity-film',trigger:'.film-scene',start:'top bottom',end:'top 30%',scrub:.35}});
    });
    refresh();
  }
  async function init(){
    try{
      const {createWorld}=await import('./assets/spatial/world.js');
      if(disposed)return;
      world=await createWorld(canvas,{onError:fail});
      if(disposed){world.dispose();return;}
      world.setVisible(visible);document.body.classList.add('world-ready');
      wrapper.classList.remove('world-failed');status.textContent='';retry.hidden=true;
      document.querySelector('#scene-controls').hidden=false;
      motion();refresh();
    }catch(error){fail(error);}
  }
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;world?.setVisible(visible);},{threshold:.01});
  observer.observe(wrapper);
  wrapper.addEventListener('pointermove',event=>{
    if(!fine.matches||event.pointerType!=='mouse')return;
    world?.setPointer((event.clientX/innerWidth-.5)*1.5,(event.clientY/innerHeight-.5)*1.2);
  });
  wrapper.addEventListener('pointerleave',()=>world?.setPointer(0,0));
  slider.addEventListener('input',()=>world?.setAngle(Number(slider.value)));
  document.querySelector('#scene-reset').addEventListener('click',()=>{slider.value='0';world?.setPointer(0,0);world?.setAngle(0);});
  button.hidden=false;button.addEventListener('click',()=>{manual=!manual;motion();});
  preference.addEventListener('change',motion);
  retry.addEventListener('click',()=>location.reload());
  function resize(){world?.resize();refresh();}
  window.addEventListener('resize',resize);
  document.addEventListener('vicecity:layout',refresh);
  document.fonts?.ready.then(refresh);
  window.addEventListener('pageshow',event=>{if(event.persisted){world?.setVisible(visible);resize();}});
  window.addEventListener('pagehide',event=>{
    world?.setVisible(false);if(event.persisted)return;
    disposed=true;observer.disconnect();media?.revert();world?.dispose();cancelAnimationFrame(refreshId);
    preference.removeEventListener('change',motion);window.removeEventListener('resize',resize);document.removeEventListener('vicecity:layout',refresh);
  });
  motion();init();
})();
