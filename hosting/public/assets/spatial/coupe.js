import * as T from '../vendor/three.module.min.js';

// Original parametric model, authored for this page. No game meshes or badges.
export function createCoupe(){
  const car=new T.Group();car.name='Coupé original de la campaña';
  const paint=new T.MeshPhysicalMaterial({color:0xabbfd0,metalness:.8,roughness:.22,clearcoat:1,clearcoatRoughness:.14,side:T.DoubleSide});
  const roofPaint=paint.clone();
  const dark=new T.MeshStandardMaterial({color:0x101219,roughness:.65,metalness:.35});
  const rubber=new T.MeshStandardMaterial({color:0x101116,roughness:.92});
  const chrome=new T.MeshStandardMaterial({color:0xc8d4dd,metalness:1,roughness:.18});
  const glass=new T.MeshPhysicalMaterial({color:0x0c192a,metalness:.45,roughness:.08,clearcoat:1,transparent:true,opacity:.88,side:T.DoubleSide});
  const lamp=new T.MeshStandardMaterial({color:0xffecd2,emissive:0xffdcc0,emissiveIntensity:3.8,roughness:.15});
  const tail=new T.MeshStandardMaterial({color:0xed382b,emissive:0xff2112,emissiveIntensity:3,roughness:.15});
  const red=new T.MeshStandardMaterial({color:0xb83025,metalness:.6,roughness:.25});
  function box(w,h,d,x,y,z,material=paint,parent=car){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function tube(points,r,material,parent=car){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const mesh=new T.Mesh(new T.TubeGeometry(curve,24,r,6,false),material);parent.add(mesh);return mesh;}
  function quad(points,material){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();const m=new T.Mesh(g,material);car.add(m);return m;}
  const sections=[[-2.72,1.02,1.08],[-2.36,1.27,1.29],[-1.6,1.34,1.38],[-.65,1.29,1.38],[.55,1.3,1.3],[1.5,1.28,1.24],[2.3,1.18,1.08],[2.66,.95,.94]];
  const vertices=[],indices=[];
  sections.forEach(([z,w,h])=>{const ring=[[-w*.92,.66],[-w,1.0],[-w*.88,h],[-w*.35,h+.035],[w*.35,h+.035],[w*.88,h],[w,1.0],[w*.92,.66]];ring.forEach(([x,y])=>vertices.push(x,y,z));});
  for(let i=0;i<sections.length-1;i++)for(let j=0;j<8;j++){const a=i*8+j,b=i*8+(j+1)%8,c=(i+1)*8+j,d=(i+1)*8+(j+1)%8;indices.push(a,c,b,b,c,d);}
  for(const [ring,reverse] of [[0,false],[sections.length-1,true]]){const center=vertices.length/3;vertices.push(0,.95,sections[ring][0]);for(let j=0;j<8;j++){const a=ring*8+j,b=ring*8+(j+1)%8;indices.push(center,...(reverse?[b,a]:[a,b]));}}
  const hullGeometry=new T.BufferGeometry();hullGeometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));hullGeometry.setIndex(indices);hullGeometry.computeVertexNormals();
  const hull=new T.Mesh(hullGeometry,paint);hull.castShadow=true;hull.receiveShadow=true;car.add(hull);
  // Cabin, sloped glass and a continuous metal surround.
  quad([[-1.08,1.4,.85],[1.08,1.4,.85],[.86,2.03,-.03],[-.86,2.03,-.03]],glass);
  quad([[1.11,1.41,-1.92],[-1.11,1.41,-1.92],[-.86,2.02,-1.18],[.86,2.02,-1.18]],glass);
  box(1.74,.08,1.21,0,2.045,-.61,roofPaint);
  for(const side of [-1,1]){
    quad([[side*1.1,1.42,.78],[side*.87,2.02,-.04],[side*.87,2.02,-1.18],[side*1.12,1.42,-1.88]],glass);
    tube([[side*1.11,1.38,.88],[side*.88,2.05,-.03],[side*.88,2.05,-1.19],[side*1.13,1.39,-1.94]],.045,chrome);
    tube([[side*1.12,1.4,.8],[side*1.17,1.39,-.7],[side*1.13,1.4,-1.9]],.028,chrome);
    box(.055,.61,.085,side*1.01,1.72,-.72,dark).rotation.z=-side*.25;
    // Door seam, handle and sculpted sill.
    tube([[side*1.296,1.22,.65],[side*1.32,.81,.55],[side*1.28,.74,-1.17],[side*1.315,1.25,-1.26]],.008,dark);
    box(.045,.055,.26,side*1.31,1.22,-.98,chrome);
    box(.11,.12,3.55,side*1.24,.63,-.05,dark);
    const mirror=box(.27,.13,.32,side*1.33,1.45,.38,paint);mirror.rotation.y=side*.2;
    box(.018,.09,.22,side*1.48,1.45,.37,chrome);
  }
  for(const x of [-.59,.59]){box(.54,.55,.58,x,1.36,-.72,dark);box(.54,.52,.13,x,1.67,-1.03,dark).rotation.x=-.18;}
  const steering=new T.Mesh(new T.TorusGeometry(.23,.027,7,24),dark);steering.position.set(-.56,1.55,.1);steering.rotation.x=.5;car.add(steering);
  // Front grille and paired LED assemblies, rear light bar and exhausts.
  box(1.82,.21,.06,0,.84,2.63,dark);box(2.12,.085,.13,0,.65,2.62,dark);
  for(const x of [-.79,.79]){
    box(.6,.075,.075,x,1.045,2.5,lamp);box(.6,.028,.08,x,.975,2.52,chrome);
    box(.11,.045,.085,Math.sign(x)*1.04,1.02,2.42,tail);
    for(let j=0;j<5;j++)box(.012,.12,.025,x+j*.045-.09,.84,2.67,chrome);
  }
  box(1.97,.055,.09,0,1.16,-2.65,tail);box(1.95,.12,.12,0,.71,-2.66,dark);
  box(.46,.15,.035,0,.93,-2.75,chrome);
  for(const x of [-.79,.79]){const pipe=new T.Mesh(new T.CylinderGeometry(.085,.085,.2,16),chrome);pipe.rotation.x=Math.PI/2;pipe.position.set(x,.67,-2.75);car.add(pipe);}
  // Four fully modelled wheels: tire, rim, hub, disc, caliper, spokes.
  for(const x of [-1.31,1.31])for(const z of [-1.7,1.64]){
    const wheel=new T.Group();wheel.position.set(x,.61,z);wheel.rotation.z=Math.PI/2;
    const tire=new T.Mesh(new T.CylinderGeometry(.61,.61,.32,48,1),rubber);wheel.add(tire);
    const outside=x<0?.175:-.175;
    const disk=new T.Mesh(new T.CylinderGeometry(.43,.43,.025,40),chrome);disk.position.y=outside;wheel.add(disk);
    const inset=new T.Mesh(new T.CylinderGeometry(.37,.37,.03,32),dark);inset.position.y=outside+(x<0?.02:-.02);wheel.add(inset);
    const hub=new T.Mesh(new T.CylinderGeometry(.11,.11,.06,24),chrome);hub.position.y=outside+(x<0?.055:-.055);wheel.add(hub);
    for(let s=0;s<5;s++){const a=s*Math.PI*2/5;const spoke=box(.085,.045,.35,Math.sin(a)*.23,outside+(x<0?.055:-.055),Math.cos(a)*.23,chrome,wheel);spoke.rotation.y=a;}
    const ring=new T.Mesh(new T.TorusGeometry(.44,.028,7,48),chrome);ring.rotation.x=Math.PI/2;ring.position.y=outside+(x<0?.025:-.025);wheel.add(ring);
    box(.1,.04,.27,.27,outside,.02,red,wheel);car.add(wheel);
  }
  // Fine bonnet ridges and a rear deck spoiler.
  for(const side of [-1,1])tube([[side*.7,1.39,.85],[side*.64,1.3,1.65],[side*.59,1.12,2.35]],.01,chrome);
  box(2.13,.055,.28,0,1.43,-2.24,paint);
  for(const x of [-.7,.7])box(.07,.13,.1,x,1.34,-2.24,dark);
  car.rotation.y=-.2;
  return{group:car,paint,roofPaint,lamp,tail};
}
