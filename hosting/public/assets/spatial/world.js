import * as T from '../vendor/three.module.min.js';
import {Reflector} from '../vendor/Reflector.js';
import {RoomEnvironment} from '../vendor/RoomEnvironment.js';
import {createCoupe} from './coupe.js';

export const looks={
  nocturne:{sky:0x030916,floor:0x344150,paint:0x839caa,key:0xb6d8f8,rim:0xff7357,accent:0xff5f45,exposure:1.05},
  sunset:{sky:0x291715,floor:0x51403a,paint:0xc8b897,key:0xffd8a5,rim:0xff5b31,accent:0xffa77a,exposure:1.2},
  porcelain:{sky:0xb8c8ca,floor:0x73888a,paint:0x204450,key:0xf6f1d6,rim:0xc0d8ec,accent:0xd85235,exposure:1.1},
};

export async function createWorld(canvas,{onReady=()=>{},onError=()=>{}}={}){
  const compact=matchMedia('(max-width:760px)');
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.shadowMap.enabled=!compact.matches;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene=new T.Scene();const camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.1,130);
  const root=new T.Group();scene.add(root);
  const environment=new RoomEnvironment();const pmrem=new T.PMREMGenerator(renderer);
  const envTarget=pmrem.fromScene(environment,.04);scene.environment=envTarget.texture;scene.environmentIntensity=.48;
  environment.dispose();pmrem.dispose();
  const hemi=new T.HemisphereLight(0xb4cddd,0x10121b,.65);scene.add(hemi);
  const key=new T.DirectionalLight(0xc3dcff,2.5);key.position.set(4,8,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-12;key.shadow.camera.right=12;key.shadow.camera.top=12;key.shadow.camera.bottom=-12;key.shadow.normalBias=.035;scene.add(key);
  const rim=new T.DirectionalLight(0xff6149,2.2);rim.position.set(-5,5,-7);scene.add(rim);
  const fill=new T.DirectionalLight(0x7da9c6,.35);fill.position.set(-2,3,8);scene.add(fill);
  const car=createCoupe();car.group.position.set(.3,0,1);root.add(car.group);
  const floor=new Reflector(new T.PlaneGeometry(160,160),{clipBias:.003,textureWidth:compact.matches?384:768,textureHeight:compact.matches?384:768,color:0x384352});
  floor.rotation.x=-Math.PI/2;floor.position.y=-.02;root.add(floor);
  // Five low-resolution reflection taps soften the mirror into wet pavement.
  // The coordinate is the addon's projective UV, not a second scene camera.
  floor.material.uniforms.uTexel={value:new T.Vector2(1/(compact.matches?384:768),1/(compact.matches?384:768))};
  floor.material.uniforms.uFloorFog={value:new T.Color(0x030916)};
  floor.material.vertexShader='varying vec3 vFloorWorld;\n'+floor.material.vertexShader.replace('void main() {','void main() {\n vFloorWorld=(modelMatrix*vec4(position,1.)).xyz;');
  floor.material.fragmentShader='uniform vec2 uTexel;\n'+floor.material.fragmentShader.replace('vec4 base = texture2DProj( tDiffuse, vUv );',`vec2 uv = vUv.xy / vUv.w;
    vec4 base = texture2D(tDiffuse,uv)*.4;
    base += texture2D(tDiffuse,uv+uTexel*vec2(2.,1.))*.15;
    base += texture2D(tDiffuse,uv+uTexel*vec2(-2.,1.))*.15;
    base += texture2D(tDiffuse,uv+uTexel*vec2(2.,-1.))*.15;
    base += texture2D(tDiffuse,uv+uTexel*vec2(-2.,-1.))*.15;`);
  floor.material.fragmentShader='uniform vec3 uFloorFog; varying vec3 vFloorWorld;\n'+floor.material.fragmentShader.replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );','gl_FragColor=vec4(mix(blendOverlay(base.rgb,color),uFloorFog,smoothstep(25.,70.,length(vFloorWorld.xz-cameraPosition.xz))),1.);');
  // A shader haze on the horizon. Coordinates are local sphere directions;
  // no vertex displacement, raymarch, or full-screen postprocessing stack.
  const atmosphere=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{uSky:{value:new T.Color(0x07101e)},uGlow:{value:new T.Color(0x523940)}},vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform vec3 uSky;uniform vec3 uGlow;varying vec3 vDirection;void main(){vec3 n=normalize(vDirection);float haze=pow(1.-abs(n.y),7.);vec3 c=mix(uSky,uGlow,haze*.026);gl_FragColor=vec4(c,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include')});
  const sky=new T.Mesh(new T.SphereGeometry(90,24,16),atmosphere);scene.add(sky);
  const concrete=new T.MeshStandardMaterial({color:0x28343c,roughness:.8,metalness:.12});
  const trim=new T.MeshStandardMaterial({color:0x89969d,roughness:.25,metalness:.85});
  const amber=new T.MeshStandardMaterial({color:0xff694f,emissive:0xff573b,emissiveIntensity:2.1,roughness:.2});
  const green=new T.MeshStandardMaterial({color:0x2a453f,roughness:.85,side:T.DoubleSide});
  const trunkMaterial=new T.MeshStandardMaterial({color:0x4c4039,roughness:.95});
  function box(w,h,d,x,y,z,material=concrete){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;}
  function path(points,r,material){const g=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),28,r,7,false);const m=new T.Mesh(g,material);root.add(m);return m;}
  // Monumental entrance: architecture, real extruded numerals and light strips.
  box(.32,4.7,.42,-4,2.35,-3.8);box(.32,4.7,.42,.2,2.35,-3.8);box(4.6,.45,.5,-1.9,4.65,-3.8);
  box(4.3,.04,.07,-1.9,4.42,-3.48,amber);
  const sign=new T.Group();sign.position.set(-1.9,2.55,-3.54);root.add(sign);
  const letterMaterial=new T.MeshStandardMaterial({color:0xe3dcd0,metalness:.55,roughness:.18,emissive:0xff7354,emissiveIntensity:.18});
  function extruded(points,x){const s=new T.Shape(points.map(p=>new T.Vector2(...p)));const geometry=new T.ExtrudeGeometry(s,{depth:.16,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:3,steps:1});const mesh=new T.Mesh(geometry,letterMaterial);mesh.position.x=x;sign.add(mesh);}
  extruded([[-1,1.05],[-.55,1.05],[0,-.45],[.55,1.05],[1,1.05],[.26,-1.05],[-.26,-1.05]],-.44);
  extruded([[-.15,-1.05],[.15,-1.05],[.15,1.05],[-.15,1.05]],.91);
  // Original illuminated urban wayfinding, with selectable live HTML equivalent.
  const signCanvas=document.createElement('canvas');signCanvas.width=1024;signCanvas.height=160;
  const ctx=signCanvas.getContext('2d');ctx.fillStyle='#14202a';ctx.fillRect(0,0,1024,160);ctx.fillStyle='#f3ead6';ctx.textAlign='center';ctx.font='700 84px sans-serif';ctx.fillText('VICE  CITY',512,111);
  const signTexture=new T.CanvasTexture(signCanvas);signTexture.colorSpace=T.SRGBColorSpace;
  const signFace=new T.Mesh(new T.PlaneGeometry(3.2,.5),new T.MeshStandardMaterial({map:signTexture,emissiveMap:signTexture,emissive:0xffffff,emissiveIntensity:.4,roughness:.5}));signFace.position.set(-1.9,4.64,-3.535);root.add(signFace);
  // Architectural sidewalk and edge rails. Recurring units are shared geometry.
  box(21,.15,2.2,-.5,.08,-5.2);box(21,.13,.22,-.5,.1,-3.95,trim);
  for(let i=0;i<7;i++){box(.06,.8,.06,4.5+i*.8,.4,-6,trim);box(.8,.045,.045,4.9+i*.8,.78,-6,trim);}
  // Curved trunks with ribbons of individually modelled fronds, not billboards.
  function palm(x,z,h,lean){
    const points=[[x,0,z],[x+lean*.15,h*.35,z],[x+lean*.6,h*.7,z+.05],[x+lean,h,z+.13]];
    path(points,.095,trunkMaterial);
    const crown=new T.Vector3(x+lean,h,z+.13);
    for(let i=0;i<9;i++){
      const angle=i*Math.PI*2/9,vertices=[],indices=[];
      for(let j=0;j<=12;j++){
        const t=j/12,reach=t*1.85,y=.38*Math.sin(t*Math.PI)-t*t*.64;
        const width=Math.sin(t*Math.PI)*.19;
        for(const side of [-1,1])vertices.push(crown.x+Math.cos(angle)*reach-Math.sin(angle)*width*side,crown.y+y,crown.z+Math.sin(angle)*reach+Math.cos(angle)*width*side);
        if(j<12){const k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
      }
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();const leaf=new T.Mesh(geometry,green);leaf.castShadow=true;root.add(leaf);
    }
  }
  for(const [x,z,h,lean] of [[-6,-5,4.9,.6],[3,-6,5.2,-.4],[7,-8,5.1,-.8],[-10,-8,5.4,1.1],[11,-11,5.6,-1]])palm(x,z,h,lean);
  // A discreet distant coast: no generic particle system or extracted game map.
  const skylineMat=new T.MeshStandardMaterial({color:0x12212d,roughness:.95});
  for(let i=0;i<15;i++){const h=1+(Math.sin(i*7.31)*.5+.5)*3;box(.75,h,.8,-15+i*2,h/2,-23,skylineMat);}
  const poolLight=new T.PointLight(0xff6247,17,13,2);poolLight.position.set(-2.7,3,-3);scene.add(poolLight);
  // The architecture is static. Merge by material after baking parent transforms;
  // keep PBR material references live for the three lighting studies.
  root.updateMatrixWorld(true);
  const batches=new Map(),sourceGeometries=new Set(),oldMeshes=[];
  root.traverse(object=>{
    if(!object.isMesh||object.isReflector||object.material.isShaderMaterial)return;
    const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    if(!geometry.attributes.uv)geometry.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));
    if(!batches.has(object.material))batches.set(object.material,[]);
    batches.get(object.material).push(geometry);sourceGeometries.add(object.geometry);oldMeshes.push(object);
  });
  for(const object of oldMeshes)object.removeFromParent();
  for(const [material,geometries] of batches){
    const joined=new T.BufferGeometry();
    for(const name of ['position','normal','uv']){
      const count=geometries.reduce((n,g)=>n+g.attributes[name].array.length,0);
      const array=new Float32Array(count);let offset=0;
      for(const geometry of geometries){array.set(geometry.attributes[name].array,offset);offset+=geometry.attributes[name].array.length;}
      joined.setAttribute(name,new T.BufferAttribute(array,name==='uv'?2:3));
    }
    const batch=new T.Mesh(joined,material);batch.castShadow=true;batch.receiveShadow=true;root.add(batch);geometries.forEach(g=>g.dispose());
  }
  sourceGeometries.forEach(g=>g.dispose());
  const cameraFrom=new T.Vector3(),cameraTo=new T.Vector3(),targetFrom=new T.Vector3(),targetTo=new T.Vector3();
  const aim=new T.Vector3(),position=new T.Vector3();
  let progress=0,currentProgress=0,pointerX=0,pointerY=0,currentX=0,currentY=0;
  let reduced=false,visible=true,frame=0,disposed=false,last=0,dirty=true,look='nocturne';
  let dragAngle=0,tier=compact.matches?'compact':'full',samples=[],adaptive=0;
  const state={ready:false,failed:false,variant:look,renderFrames:0,drawCalls:0,triangles:0,pixelRatio:1,progress:0,angle:0,active:true,quality:tier,revision:T.REVISION};
  function draw(){
    frame=0;if(disposed||!visible||document.hidden)return;
    const d=reduced?1:.13;
    currentProgress+= (progress-currentProgress)*d;currentX+=(pointerX+dragAngle-currentX)*d;currentY+=(pointerY-currentY)*d;
    const p=currentProgress;
    if(compact.matches){cameraFrom.set(12.6,6.4,15.7);cameraTo.set(7.9,4.6,12.4);targetFrom.set(0,1.15,0);targetTo.set(-1,2,-2.8);}
    else{cameraFrom.set(7,3.8,9);cameraTo.set(2,2.9,7.9);targetFrom.set(0,1.15,0);targetTo.set(-1.9,2.5,-3.6);}
    position.copy(cameraFrom).lerp(cameraTo,p);aim.copy(targetFrom).lerp(targetTo,p);
    position.x+=currentX*(compact.matches?.85:1.35);position.y+=currentY*.45;position.z-=currentX*.75;
    camera.position.copy(position);camera.lookAt(aim);
    renderer.render(scene,camera);
    state.renderFrames++;state.progress=currentProgress;state.angle=currentX;state.active=visible;
    state.drawCalls=renderer.info.render.calls;state.triangles=renderer.info.render.triangles;
    const now=performance.now();if(last){samples.push(now-last);if(samples.length>180)samples.shift();}last=now;
    if(adaptive<2&&samples.length>=24&&state.renderFrames%12===0){
      const sorted=samples.slice(-24).sort((a,b)=>a-b);
      if(sorted[22]>35){adaptive++;state.adaptation='frame-time-p95';renderer.shadowMap.enabled=false;key.castShadow=false;const size=adaptive===2?192:320;floor.getRenderTarget().setSize(size,size);floor.material.uniforms.uTexel.value.set(1/size,1/size);samples=[];resize();}
    }
    dirty=false;
    if(!reduced&&(Math.abs(progress-currentProgress)>.00005||Math.abs(pointerX+dragAngle-currentX)>.0001||Math.abs(pointerY-currentY)>.0001))request();
    else last=0;
  }
  function request(){if(!frame&&!disposed&&visible&&!document.hidden)frame=requestAnimationFrame(draw);}
  function resize(){
    const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
    tier=adaptive===2?'economy':adaptive===1?'balanced':compact.matches?'compact':'full';state.quality=tier;
    renderer.shadowMap.enabled=!compact.matches&&!adaptive;key.castShadow=renderer.shadowMap.enabled;
    const pixelRatio=Math.min(devicePixelRatio,adaptive===2?.55:adaptive===1?.75:tier==='compact'?1.15:1.5);
    renderer.setPixelRatio(pixelRatio);renderer.setSize(w,h,false);state.pixelRatio=pixelRatio;
    camera.aspect=w/h;camera.clearViewOffset();
    if(compact.matches)camera.setViewOffset(w,h,0,-h*.25,w,h);
    else camera.setViewOffset(w,h,-w*.18,0,w,h);
    camera.updateProjectionMatrix();request();
  }
  function setVariant(name){if(!looks[name])return;look=name;const c=looks[name];state.variant=name;atmosphere.uniforms.uSky.value.set(c.sky);atmosphere.uniforms.uGlow.value.set(c.rim);floor.material.uniforms.uFloorFog.value.set(c.sky);scene.background=new T.Color(c.sky);floor.material.uniforms.color.value.set(c.floor);car.paint.color.set(c.paint);car.roofPaint.color.set(c.paint);key.color.set(c.key);rim.color.set(c.rim);amber.color.set(c.accent);amber.emissive.set(c.accent);poolLight.color.set(c.accent);renderer.toneMappingExposure=c.exposure;request();}
  function setReduced(value){reduced=value;pointerX=0;pointerY=0;if(reduced){progress=0;currentProgress=0;currentX=dragAngle;currentY=0;}request();}
  function setVisible(value){visible=value;state.active=value;if(!value){cancelAnimationFrame(frame);frame=0;last=0;}else request();}
  function contextLost(event){event.preventDefault();state.failed=true;state.ready=false;setVisible(false);onError(new Error('Se perdió el contexto WebGL'));}
  canvas.addEventListener('webglcontextlost',contextLost);
  document.addEventListener('visibilitychange',request);
  function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);canvas.removeEventListener('webglcontextlost',contextLost);document.removeEventListener('visibilitychange',request);floor.dispose();key.shadow.dispose();const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());envTarget.dispose();renderer.dispose();state.ready=false;state.active=false;}
  setVariant('nocturne');resize();
  await renderer.compileAsync(scene,camera);draw();state.ready=true;onReady();
  return{setProgress:p=>{if(!reduced){progress=T.MathUtils.clamp(p,0,1);request();}},setPointer:(x,y)=>{if(!reduced){pointerX=x;pointerY=y;request();}},setAngle:a=>{dragAngle=T.MathUtils.clamp(a,-1,1);request();},setReduced,setVisible,setVariant,resize,dispose,exportPoster:()=>{draw();return canvas.toDataURL('image/jpeg',.9);},getState:()=>({...state,frames:samples.slice(),memory:{...renderer.info.memory},camera:camera.position.toArray()})};
}
