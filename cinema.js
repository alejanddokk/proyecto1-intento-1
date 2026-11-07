/* One animation owner per property: GSAP owns scene transforms; CSS owns controls. */
(() => {
  'use strict';
  const {gsap,ScrollTrigger}=window;
  if(!gsap||!ScrollTrigger)return; // The complete page is visible without the engine.
  gsap.registerPlugin(ScrollTrigger);
  const button=document.querySelector('#motion-control');
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  let media=gsap.matchMedia();
  let manualReduce=false,refreshFrame=0,destroyed=false;
  let introFinished=scrollY>80||Boolean(location.hash);
  const notify=()=>document.dispatchEvent(new Event('cinema-motion-change'));

  function refresh(){
    cancelAnimationFrame(refreshFrame);
    refreshFrame=requestAnimationFrame(()=>{if(!destroyed)ScrollTrigger.refresh();});
  }
  function mount(){
    media.revert();
    media=gsap.matchMedia();
    const reduced=manualReduce||preference.matches;
    document.body.classList.toggle('motion-reduced',reduced);
    button.setAttribute('aria-pressed',String(reduced));
    button.textContent=preference.matches?'Movimiento reducido':reduced?'Activar animación':'Reducir animación';
    button.disabled=preference.matches;
    notify();
    if(reduced){introFinished=true;return;}
    media.add({wide:'(min-width: 761px) and (min-height: 740px)',compact:'(max-width: 760px), (max-height: 739px)'},context=>{
      const wide=context.conditions.wide;
      if(!introFinished){
        introFinished=true;
        const entrance=gsap.timeline({defaults:{ease:'power3.out'},id:'vicecity-apertura'});
        entrance.from('.hero-art img',{scale:1.09,duration:1.35},0)
          .from('.headline-ink',{yPercent:105,stagger:.11,duration:.85},.08);
      }
      // Framing, then release: no pin and no control is animated here.
      gsap.to('.hero-art',{scale:1.045,yPercent:wide?-3:-1,ease:'none',scrollTrigger:{id:'vicecity-luz',trigger:'.hero',start:'top top',end:'bottom top',scrub:.35}});
      const film=gsap.timeline({defaults:{ease:'none'},scrollTrigger:{id:'vicecity-encuadre',trigger:'.film-scene',start:'top 80%',end:wide?'45% 35%':'40% 50%',scrub:wide?.45:.2}});
      film.fromTo('.video-frame',{scale:wide?.88:.96},{scale:1,duration:1},0);
      if(wide)film.to('.film-shutter',{scaleX:0,duration:1},0);

      const track=document.querySelector('.leonida-track');
      if(wide){
        document.querySelector('.leonida-scene').classList.add('cinema-pan');
        const distance=()=>Math.max(0,track.scrollWidth-innerWidth);
        const travel=gsap.timeline({defaults:{ease:'none'},scrollTrigger:{id:'vicecity-leonida',trigger:'.leonida-scene__stage',start:()=>`top ${document.querySelector('.hero__header').offsetHeight+12}px`,end:()=>`+=${Math.min(innerHeight*.9,distance()*.85)}`,pin:true,scrub:.45,invalidateOnRefresh:true,anticipatePin:1}});
        travel.to(track,{x:()=>-distance(),duration:1},0);
      }else{
        // Touch choreography: native vertical pair with a quiet change of crop.
        gsap.fromTo('.leonida-frame--portrait img',{scale:1.09},{scale:1,ease:'none',scrollTrigger:{id:'vicecity-retrato',trigger:'.leonida-frame--portrait',start:'top bottom',end:'center center',scrub:.25}});
      }
      // Registration resolves the image, not the form: controls remain stationary.
      gsap.fromTo('.registration-art img',{scale:wide?1.12:1.04},{scale:1,ease:'none',scrollTrigger:{id:'vicecity-cierre',trigger:'#registro',start:'top bottom',end:'top 15%',scrub:.45}});
      return ()=>document.querySelector('.leonida-scene').classList.remove('cinema-pan');
    });
    refresh();
  }
  button.hidden=false;
  button.addEventListener('click',()=>{manualReduce=!(manualReduce||preference.matches);mount();});
  preference.addEventListener('change',mount);
  document.addEventListener('vicecity:layout',refresh);
  document.fonts?.ready.then(refresh);
  document.querySelectorAll('.leonida-frame img,.hero-art img,.registration-art img').forEach(img=>{
    if(!img.complete)img.addEventListener('load',refresh,{once:true});
  });
  window.addEventListener('pageshow',event=>{if(event.persisted)refresh();});
  window.addEventListener('pagehide',event=>{
    if(event.persisted)return;
    destroyed=true;cancelAnimationFrame(refreshFrame);media.revert();
    preference.removeEventListener('change',mount);document.removeEventListener('vicecity:layout',refresh);
  });
  mount();
})();
