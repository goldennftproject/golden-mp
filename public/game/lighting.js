/* Relieve visual reversible. Sin lecturas de cuenta, guardados ni cambios al arte fuente.
   Los edificios renovados usan perfiles de material y oclusión ajustados a cada dibujo.
   Los demás sprites conservan sus normales aproximadas por silueta y luminancia. */
(function(root){
  'use strict';
  const PIPELINE='GoldenRelief', PREF='gf_relief_v1', CYCLE_PREF='gf_day_cycle_v1', CYCLE_MS=30*60*1000;
  const SUN=[-.43,.50,.75], AMBIENT=[.56,.58,.60], COLOR=[1,.97,.90], POWER=.58;
  const BUILDING_AMBIENT=[.68,.70,.70], BUILDING_POWER=.49;
  // Bordes inferiores del alero, uniones de madera y huecos en coordenadas del sprite completo.
  const BUILDINGS={
    barn_evo_0:{eaves:[[.08,.64],[.48,.41],[.53,.41],[.92,.64]],
      posts:[.16,.27,.50,.73,.84],sills:[.64,.98],door:[.31,.70,.69,.97]},
    barn_evo_1:{eaves:[[.08,.67],[.50,.34],[.91,.67]],
      posts:[.15,.23,.50,.77,.85],sills:[.65,.99],door:[.31,.72,.70,.97]},
    barn_evo_2:{eaves:[[.09,.81],[.50,.60],[.91,.81]],
      posts:[.15,.33,.50,.67,.85],sills:[.81,.98],door:[.34,.68,.85,.98]},
    barn_evo_3:{eaves:[[.06,.84],[.22,.84],[.33,.72],[.43,.68],[.57,.68],[.67,.72],[.78,.84],[.94,.84]],
      posts:[.10,.30,.37,.50,.63,.70,.90],sills:[.82,.99],door:[.38,.63,.83,.99]},
    market:{eaves:[[.04,.41],[.96,.41]],material:'cloth',
      posts:[.10,.16,.83,.90],sills:[.74,.97],door:[.17,.82,.43,.68]},
    cocina:{eaves:[[.06,.63],[.23,.49],[.40,.44],[.61,.44],[.79,.49],[.94,.64]],
      posts:[.12,.29,.84,.91],sills:[.61,.91],door:[.31,.84,.64,.86],fire:[.57,.73,.12,.10]},
    store:{eaves:[[.06,.65],[.30,.40],[.48,.48],[.94,.66]],
      posts:[.10,.26,.32,.70,.88,.94],sills:[.62,.93],door:[.33,.70,.64,.92],
      chimney:[.12,.26,.10,.52],fire:[.55,.76,.13,.08]},
    horno:{material:'stone',chimney:[.40,.60,.04,.28],fire:[.50,.83,.17,.17]},
    establo:{eaves:[[.07,.60],[.94,.60]],
      posts:[.11,.33,.41,.67,.73,.91],sills:[.60,.99],door:[.38,.67,.66,.96]},
    curtiduria:{eaves:[[.06,.64],[.30,.45],[.69,.45],[.93,.64]],
      posts:[.11,.31,.37,.72,.89,.93],sills:[.59,.96],door:[.37,.75,.65,.92]},
  };
  const scenes=new Set(), attempted=new WeakSet(), queued=new WeakSet();
  let enabled=true, compatible=true, cycleEnabled=true;
  try{enabled=root.localStorage.getItem(PREF)!=='off';cycleEnabled=root.localStorage.getItem(CYCLE_PREF)!=='off';}catch(_){}
  const stats={maps:0,pixels:0,milliseconds:0,failures:0};
  // Reloj puramente visual: 30 min, igual al recargar y sin escrituras de partida.
  const cycleFrames=[
    [0,[1,1,1],'Día'],[.40,[1,1,1],'Día'],
    [.52,[1,.87,.72],'Atardecer'],[.60,[1,.87,.72],'Atardecer'],
    [.72,[.62,.70,.86],'Noche'],[.86,[.62,.70,.86],'Noche'],
    [.94,[.96,.87,.90],'Amanecer'],[1,[1,1,1],'Día']
  ];
  function cycleAt(time){
    const phase=((Number.isFinite(time)?time:0)%CYCLE_MS+CYCLE_MS)%CYCLE_MS/CYCLE_MS;
    let i=0;while(i<cycleFrames.length-2&&phase>=cycleFrames[i+1][0])i++;
    const a=cycleFrames[i],b=cycleFrames[i+1],t=(phase-a[0])/(b[0]-a[0]),mix=t*t*(3-2*t);
    return {phase,name:t<.5?a[2]:b[2],rgb:a[1].map((v,c)=>v+(b[1][c]-v)*mix)};
  }
  // La atmósfera y los emisores comparten reloj; nunca depende de la hora de pesca.
  function atmosphere(time=Date.now()){
    const active=enabled&&compatible&&cycleEnabled;
    const state=active?cycleAt(time):{name:'Día',rgb:[1,1,1]};
    return {...state,active,darkness:Math.max(0,Math.min(1,(1-state.rgb[0])/.38))};
  }
  function renderCycle(){
    if(!root.document)return;
    const state=atmosphere(),active=state.active;
    // Una sola capa sobre el mundo completo mantiene idéntico tono entre bosque cercano
    // y mosaico lejano. No se vuelven a hornear texturas ni se tiñe el HUD HTML.
    const world=root.document.getElementById('game')||root.document.getElementById('mapa');
    if(world){world.style.setProperty('--gf-day-color','rgb('+state.rgb.map(v=>Math.round(v*255)).join(',')+')');world.style.setProperty('--gf-day-opacity',state.rgb.every(v=>v===1)?'0':'1');}
    const b=root.document.getElementById('cfg-day-cycle');
    if(b){b.disabled=!enabled||!compatible;b.textContent='Ciclo: '+(cycleEnabled?'Activado · '+state.name:'Día fijo');b.setAttribute('aria-pressed',String(active));}
  }
  function setCycle(on,persist=true){cycleEnabled=!!on;if(persist)try{root.localStorage.setItem(CYCLE_PREF,cycleEnabled?'on':'off');}catch(_){}renderCycle();}
  function normals(rgba,w,h){
    const n=w*h, stride=w+1, lum=new Float32Array((w+1)*(h+1)), weight=new Float32Array(lum.length), distance=new Float32Array(n);
    // Integral de luminancia ponderada: el transparente no genera un borde negro.
    for(let y=0;y<h;y++){let row=0,alphaRow=0;for(let x=0;x<w;x++){
      const i=y*w+x,p=i*4,a=rgba[p+3]/255;
      row+=(rgba[p]*.2126+rgba[p+1]*.7152+rgba[p+2]*.0722)/255*a;alphaRow+=a;
      const j=(y+1)*stride+x+1;lum[j]=lum[j-stride]+row;weight[j]=weight[j-stride]+alphaRow;
      distance[i]=a>.3?Math.min(8,x+1,y+1,w-x,h-y):0;
    }}
    // Distancia Manhattan acotada: da volumen sin dibujar nuevos contornos.
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(distance[i])distance[i]=Math.min(distance[i],x?distance[i-1]+1:1,y?distance[i-w]+1:1);}
    for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){const i=y*w+x;if(distance[i])distance[i]=Math.min(distance[i],x<w-1?distance[i+1]+1:1,y<h-1?distance[i+w]+1:1);}
    const height=new Float32Array(n), sum=(a,x0,y0,x1,y1)=>a[y1*stride+x1]-a[y0*stride+x1]-a[y1*stride+x0]+a[y0*stride+x0];
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=y*w+x,x0=Math.max(0,x-2),y0=Math.max(0,y-2),x1=Math.min(w,x+3),y1=Math.min(h,y+3),a=sum(weight,x0,y0,x1,y1);
      height[i]=distance[i]/8*.65+(a?sum(lum,x0,y0,x1,y1)/a:0)*.35;
    }
    const out=new Uint8ClampedArray(n*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=y*w+x,p=i*4;
      const sample=(xx,yy)=>{const j=Math.max(0,Math.min(h-1,yy))*w+Math.max(0,Math.min(w-1,xx));return rgba[j*4+3]>76?height[j]:height[i];};
      const nx=-(sample(x+1,y)-sample(x-1,y))*4.8,ny=(sample(x,y+1)-sample(x,y-1))*4.8,inv=1/Math.hypot(nx,ny,1);
      out[p]=(nx*inv*.5+.5)*255;out[p+1]=(ny*inv*.5+.5)*255;out[p+2]=(inv*.5+.5)*255;out[p+3]=255;
    }
    return out;
  }
  const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
  function eased(v){const t=clamp(v);return t*t*(3-2*t);}
  function boundary(points,x){
    for(let i=1;i<points.length;i++)if(x<=points[i][0]){
      const [ax,ay]=points[i-1],[bx,by]=points[i];
      return ay+(by-ay)*clamp((x-ax)/(bx-ax));
    }
    return points[points.length-1][1];
  }
  function distanceTo(values,x){
    let distance=1;
    for(const v of values)distance=Math.min(distance,Math.abs(v-x));
    return distance;
  }
  function shape(box,x,y){
    if(!box)return 0;
    const [left,right,top,bottom]=box;
    return eased((x-left)/.022)*eased((right-x)/.022)*eased((y-top)/.026)*eased((bottom-y)/.029);
  }
  function materialAt(profile,x,y,px,py){
    const chimney=shape(profile.chimney,x,y);
    const recess=shape(profile.door,x,y);
    const chimneyColumn=profile.chimney?eased((x-profile.chimney[0])/.020)*eased((profile.chimney[1]-x)/.020):0;
    const eave=profile.eaves?boundary(profile.eaves,x):0;
    const roof=profile.eaves?eased((eave-y+.015)/.030):0;
    const beam=profile.posts?1-eased(distanceTo(profile.posts,x)/.015):0;
    const sill=profile.sills?1-eased(distanceTo(profile.sills,y)/.018):0;
    const boards=.033*Math.cos(px*1.73)+.013*Math.cos(px*.66+py*.014);
    const courses=.031*Math.cos(py*1.28)+.016*Math.cos(px*1.33+Math.floor(py/5.1)*1.72);
    const stoneCurve=.29*Math.sqrt(Math.max(0,1-((x-.50)/.49)**2));
    const roofPitch=(eave-y)*.39-Math.abs(x-.43)*.28;
    const roofMaterial=profile.material==='cloth'
      ? roofPitch+.028*Math.cos(px*.39)
      : roofPitch+.045*Math.cos(py*1.42)+.013*Math.cos(px*1.15+Math.floor(py/4.4)*1.2);
    let height=profile.material==='stone'
      ? stoneCurve+courses+chimney*.080
      : (boards+.16*beam+.09*sill-.13*recess)*(1-roof)+roofMaterial*roof;
    height=height*(1-chimney)+(courses+.15)*chimney;
    const aboveWall=y-eave;
    const shadeBelowEave=profile.eaves
      ? eased((aboveWall+.009)/.024)*(1-eased((aboveWall-.014)/.069))
      : 0;
    const sillShadow=profile.sills?(1-eased(distanceTo(profile.sills,y-.019)/.026))*(1-roof):0;
    const chimneyShadow=profile.chimney
      ? chimneyColumn*eased((y-profile.chimney[3])/.022)*(1-eased((y-profile.chimney[3]-.019)/.062))
      : 0;
    const lowerWall=profile.eaves?eased((y-.91)/.08):0;
    const shadow=clamp(.26*shadeBelowEave+.14*recess+.11*sillShadow+.18*chimneyShadow+.10*lowerWall,0,.47);
    const fire=profile.fire;
    const emission=fire?1-eased(Math.hypot((x-fire[0])/fire[2],(y-fire[1])/fire[3])):0;
    return {height:height*(1-emission*.75),visibility:1-shadow*(1-emission)};
  }
  function materialNormals(rgba,w,h,{key,renewed,frame}={}){
    const profile=renewed&&Object.prototype.hasOwnProperty.call(BUILDINGS,key)?BUILDINGS[key]:null;
    if(!profile)return normals(rgba,w,h);
    const {x:offsetX=0,y:offsetY=0,sourceWidth=w,sourceHeight=h}=frame||{};
    const height=new Float32Array(w*h),visibility=new Float32Array(w*h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=y*w+x;
      if(rgba[i*4+3]<77){visibility[i]=1;continue;}
      const px=x+offsetX+.5,py=y+offsetY+.5;
      const material=materialAt(profile,px/sourceWidth,py/sourceHeight,px,py);
      height[i]=material.height;visibility[i]=material.visibility;
    }
    const out=new Uint8ClampedArray(rgba.length);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=y*w+x,p=i*4;
      const sample=(xx,yy)=>{
        const j=clamp(yy,0,h-1)*w+clamp(xx,0,w-1);
        return rgba[j*4+3]>=77?height[j]:height[i];
      };
      const solid=rgba[p+3]>=77;
      const nx=solid?-(sample(x+1,y)-sample(x-1,y))*3.3:0;
      const ny=solid?(sample(x,y+1)-sample(x,y-1))*3.3:0;
      const inv=1/Math.hypot(nx,ny,1);
      out[p]=(nx*inv*.5+.5)*255;
      out[p+1]=(ny*inv*.5+.5)*255;
      // XY y oclusión en RGB. Alfa opaco evita premultiplicar los vectores al subir el Canvas.
      // El azul queda por debajo de 128 en todo el sprite; las normales anteriores quedan arriba.
      out[p+2]=visibility[i]*127;
      out[p+3]=255;
    }
    return out;
  }
  const SUN_LENGTH=Math.hypot(...SUN);
  function shadePixels(rgba,w,h,options){
    const result=new Uint8ClampedArray(rgba),ns=materialNormals(rgba,w,h,options);
    for(let p=0;p<result.length;p+=4){
      const nx=ns[p]/127.5-1,ny=ns[p+1]/127.5-1;
      const crafted=ns[p+2]<128;
      const nz=crafted?Math.sqrt(Math.max(0,1-nx*nx-ny*ny)):ns[p+2]/127.5-1;
      const dot=Math.max(0,(nx*SUN[0]+ny*SUN[1]+nz*SUN[2])/(SUN_LENGTH*Math.hypot(nx,ny,nz)));
      const visibility=crafted?ns[p+2]/127:1;
      for(let c=0;c<3;c++){
        const ambient=crafted?BUILDING_AMBIENT[c]*(.46+.54*visibility):AMBIENT[c];
        const direct=crafted?BUILDING_POWER*(.21+.79*visibility):POWER;
        result[p+c]*=Math.min(1.12,ambient+COLOR[c]*direct*dot);
      }
    }
    return result;
  }
  function shadeImage(source,options){
    const cv=root.document.createElement('canvas');cv.width=source.width;cv.height=source.height;
    const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
    const image=ctx.getImageData(0,0,cv.width,cv.height);
    image.data.set(shadePixels(image.data,cv.width,cv.height,options));
    ctx.putImageData(image,0,0);return cv;
  }
  function normalTexture(texture){
    if(!texture||attempted.has(texture)||texture.dataSource?.length)return;
    attempted.add(texture);
    const start=root.performance.now();
    try{
      const image=texture.getSourceImage(),w=image.width,h=image.height;
      if(!w||!h||w*h>512*512)return;
      const cv=root.document.createElement('canvas');cv.width=w;cv.height=h;
      const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
      const data=ctx.getImageData(0,0,w,h);
      data.data.set(materialNormals(data.data,w,h,{key:texture.key,renewed:root.GoldenVisual?.hasVariant?.(texture.key)}));
      ctx.putImageData(data,0,0);
      texture.setDataSource(cv);stats.maps++;stats.pixels+=w*h;
    }catch(_){stats.failures++;}finally{stats.milliseconds+=root.performance.now()-start;}
  }
  const shader=`precision mediump float;
    uniform sampler2D uMainSampler; uniform sampler2D uNormSampler;
    uniform mat3 uInverseRotationMatrix; uniform vec2 uNormalFlip;
    varying vec2 outTexCoord; varying float outTintEffect; varying vec4 outTint;
    void main(){
      vec4 texel=vec4(outTint.bgr*outTint.a,outTint.a);
      vec4 texture=texture2D(uMainSampler,outTexCoord); vec4 color=texture*texel;
      if(outTintEffect==1.0)color.rgb=mix(texture.rgb,outTint.bgr*outTint.a,texture.a);
      else if(outTintEffect==2.0)color=texel;
      vec3 map=texture2D(uNormSampler,outTexCoord).rgb;
      vec3 n=map*2.0-1.0;
      bool crafted=map.b<.5;
      if(crafted)n.z=sqrt(max(0.0,1.0-dot(n.xy,n.xy)));
      n.xy*=uNormalFlip; n=normalize(uInverseRotationMatrix*n);
      float diffuse=max(dot(n,normalize(vec3(-.43,.50,.75))),0.0);
      vec3 light=min(vec3(1.12),vec3(.56,.58,.60)+vec3(1.,.97,.90)*.58*diffuse);
      if(crafted){
        float visibility=map.b*(255.0/127.0);
        vec3 ambient=vec3(.68,.70,.70)*mix(.46,1.0,visibility);
        vec3 direct=vec3(1.0,.97,.90)*.49*diffuse*mix(.21,1.0,visibility);
        light=min(vec3(1.12),ambient+direct);
      }
      gl_FragColor=vec4(color.rgb*light,color.a);
    }`;
  function eligible(o){return o&&!o._gfReliefExcluded&&(o.type==='Image'||o.type==='Sprite')&&o.texture&&!/^(?:__|grass|isla|portal|plano_|.*marker|.*icon|.*senal)/.test(o.texture.key);}
  // Fuentes auxiliares horneadas en fondos: deben coincidir con su mosaico Canvas sin luz.
  function exclude(o){
    if(!o)return;
    o._gfReliefExcluded=true;
    if(o._gfRelief){o.resetPipeline();delete o._gfRelief;}
  }
  function apply(o){
    if(!eligible(o)||!o.setPipeline)return;
    if(enabled){if(o.pipeline?.name===PIPELINE||o.pipeline?.name==='MultiPipeline'){if(o.texture.getSourceImage)normalTexture(o.texture);o.setPipeline(PIPELINE);o._gfRelief=true;}}
    else if(o._gfRelief){o.resetPipeline();delete o._gfRelief;}
  }
  function tree(o){apply(o);if(o.type==='Container')for(const child of o.list||[])tree(child);}
  function attachUnchecked(scene){
    const P=root.Phaser;if(!P||scene.game.renderer.type!==P.WEBGL){compatible=false;sync();return false;}
    const manager=scene.game.renderer.pipelines;
    if(!manager.has(PIPELINE)){
      class Relief extends P.Renderer.WebGL.Pipelines.LightPipeline{
        constructor(game){super({game,fragShader:shader});this._flip='';}
        onRender(){this.lightsActive=true;this.set1i('uMainSampler',0);this.set1i('uNormSampler',1);this.currentNormalMapRotation=null;this._flip='';}
        getNormalMap(o){
          // Subir una normal en mitad de un batch alteraría los bindings de WebGL.
          // Frames nuevos de animación usan la normal plana un frame y se preparan fuera del render.
          const t=o?.texture;
          if(t&&!attempted.has(t)&&!queued.has(t)&&!t.dataSource?.length){queued.add(t);root.setTimeout(()=>{queued.delete(t);if(t.source?.length)normalTexture(t);},0);}
          return super.getNormalMap(o);
        }
        batchSprite(o,camera,parent){
          const x=(o.flipX?-1:1)*(o.scaleX<0?-1:1),y=(o.flipY?-1:1)*(o.scaleY<0?-1:1),f=x+','+y;
          if(this._flip!==f){this.flush();this.set2f('uNormalFlip',x,y);this._flip=f;}
          super.batchSprite(o,camera,parent);
        }
      }
      manager.add(PIPELINE,new Relief(scene.game));
    }
    if(scenes.has(scene))return true;
    scenes.add(scene);scene.children.list.forEach(tree);
    scene.events.on(P.Scenes.Events.ADDED_TO_SCENE,tree);
    scene.events.once(P.Scenes.Events.SHUTDOWN,()=>{scene.events.off(P.Scenes.Events.ADDED_TO_SCENE,tree);scenes.delete(scene);});
    return true;
  }
  function attach(scene){
    try{return attachUnchecked(scene);}catch(error){
      compatible=false; enabled=false; sync();
      console.warn('Iluminación suave no disponible; se conserva el aspecto original.',error);
      return false;
    }
  }
  function setEnabled(on){enabled=!!on;try{root.localStorage.setItem(PREF,enabled?'on':'off');}catch(_){}for(const scene of scenes)scene.children.list.forEach(tree);sync();}
  function sync(){const b=root.document?.getElementById('cfg-relief');if(b){b.disabled=!compatible;b.textContent='Iluminación: '+(!compatible?'Original (compatibilidad)':enabled?'Suave':'Original');b.setAttribute('aria-pressed',String(enabled&&compatible));}renderCycle();}
  function invalidate(texture){
    attempted.delete(texture);queued.delete(texture);
    for(const data of texture.dataSource||[])if(data?.destroy)data.destroy();
    texture.dataSource=[];
  }
  const api={attach,exclude,invalidate,setEnabled,isEnabled:()=>enabled&&compatible,setCycle,isCycleEnabled:()=>cycleEnabled,cycleAt,atmosphere,CYCLE_MS,normals,materialNormals,shadePixels,shadeImage,eligible,stats};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root.document){root.GoldenLighting=api;const b=root.document.getElementById('cfg-relief');if(b)b.addEventListener('click',()=>setEnabled(!enabled));sync();const cycleButton=root.document.getElementById('cfg-day-cycle');if(cycleButton)cycleButton.addEventListener('click',()=>setCycle(!cycleEnabled));root.setInterval(renderCycle,1000);root.document.addEventListener('visibilitychange',renderCycle);}
})(typeof window==='undefined'?globalThis:window);
