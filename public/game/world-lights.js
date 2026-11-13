/* Luces locales de presentación. Fuentes medidas en el arte; sin estado de partida,
   red, físicas, eventos de entrada ni temporizadores propios. */
(function(root){
  'use strict';
  const HALO='__gf_warm_halo',CORE='__gf_warm_core';
  const ART={
    "classic": {
      "barn_evo_3": [
        {
          "kind": "window",
          "x": 0.17578125,
          "y": 0.91015625,
          "w": 0.0234375,
          "h": 0.03125,
          "sw": 128,
          "sh": 128
        },
        {
          "kind": "window",
          "x": 0.8203125,
          "y": 0.91015625,
          "w": 0.0234375,
          "h": 0.03125,
          "sw": 128,
          "sh": 128
        }
      ],
      "store": [
        {
          "kind": "fire",
          "x": 0.5636363636363636,
          "y": 0.6779661016949152,
          "w": 0.12727272727272726,
          "h": 0.07627118644067797,
          "sw": 110,
          "sh": 118
        }
      ],
      "horno": [
        {
          "kind": "fire",
          "x": 0.5051020408163265,
          "y": 0.8,
          "w": 0.1836734693877551,
          "h": 0.18888888888888888,
          "sw": 98,
          "sh": 90
        }
      ],
      "cocina": [
        {
          "kind": "window",
          "x": 0.19545454545454546,
          "y": 0.7066115702479339,
          "w": 0.09090909090909091,
          "h": 0.09917355371900827,
          "sw": 110,
          "sh": 121
        }
      ],
      "establo": [
        {
          "kind": "window",
          "x": 0.18468468468468469,
          "y": 0.601063829787234,
          "w": 0.09009009009009009,
          "h": 0.1276595744680851,
          "sw": 111,
          "sh": 94
        }
      ],
      "curtiduria": [
        {
          "kind": "window",
          "x": 0.2,
          "y": 0.6885964912280702,
          "w": 0.09090909090909091,
          "h": 0.10526315789473684,
          "sw": 110,
          "sh": 114
        }
      ],
      "deco_farol": [
        {
          "kind": "window",
          "haloScale": 1.75,
          "x": 0.31666666666666665,
          "y": 0.45,
          "w": 0.3,
          "h": 0.16666666666666666,
          "sw": 30,
          "sh": 60
        }
      ],
      "deco_farolito": [
        {
          "kind": "window",
          "haloScale": 1.28,
          "x": 0.5862068965517241,
          "y": 0.6721311475409836,
          "w": 0.39655172413793105,
          "h": 0.3770491803278688,
          "sw": 58,
          "sh": 61
        }
      ]
    },
    "renewed": {
      "barn_evo_1": [
        {
          "kind": "window",
          "x": 0.2265625,
          "y": 0.80078125,
          "w": 0.046875,
          "h": 0.0546875,
          "sw": 128,
          "sh": 128
        },
        {
          "kind": "window",
          "x": 0.77734375,
          "y": 0.80078125,
          "w": 0.0390625,
          "h": 0.0546875,
          "sw": 128,
          "sh": 128
        }
      ],
      "barn_evo_2": [
        {
          "kind": "window",
          "x": 0.33203125,
          "y": 0.87109375,
          "w": 0.03125,
          "h": 0.046875,
          "sw": 128,
          "sh": 128
        },
        {
          "kind": "window",
          "x": 0.66796875,
          "y": 0.87109375,
          "w": 0.03125,
          "h": 0.046875,
          "sw": 128,
          "sh": 128
        }
      ],
      "barn_evo_3": [
        {
          "kind": "window",
          "x": 0.32421875,
          "y": 0.87109375,
          "w": 0.03125,
          "h": 0.046875,
          "sw": 128,
          "sh": 128
        },
        {
          "kind": "window",
          "x": 0.67578125,
          "y": 0.87109375,
          "w": 0.03125,
          "h": 0.046875,
          "sw": 128,
          "sh": 128
        }
      ],
      "store": [
        {
          "kind": "window",
          "x": 0.19545454545454546,
          "y": 0.7076271186440678,
          "w": 0.07272727272727272,
          "h": 0.06779661016949153,
          "sw": 110,
          "sh": 118
        },
        {
          "kind": "fire",
          "x": 0.5636363636363636,
          "y": 0.7245762711864406,
          "w": 0.12727272727272726,
          "h": 0.07627118644067797,
          "sw": 110,
          "sh": 118
        }
      ],
      "horno": [
        {
          "kind": "fire",
          "x": 0.5,
          "y": 0.8444444444444444,
          "w": 0.19387755102040816,
          "h": 0.15555555555555556,
          "sw": 98,
          "sh": 90
        }
      ],
      "cocina": [
        {
          "kind": "window",
          "x": 0.2318181818181818,
          "y": 0.7396694214876033,
          "w": 0.08181818181818182,
          "h": 0.09917355371900827,
          "sw": 110,
          "sh": 121
        },
        {
          "kind": "fire",
          "x": 0.5818181818181818,
          "y": 0.7479338842975206,
          "w": 0.09090909090909091,
          "h": 0.049586776859504134,
          "sw": 110,
          "sh": 121
        }
      ],
      "establo": [
        {
          "kind": "window",
          "x": 0.21171171171171171,
          "y": 0.7606382978723404,
          "w": 0.07207207207207207,
          "h": 0.10638297872340426,
          "sw": 111,
          "sh": 94
        }
      ],
      "curtiduria": [
        {
          "kind": "window",
          "x": 0.20909090909090908,
          "y": 0.7192982456140351,
          "w": 0.07272727272727272,
          "h": 0.08771929824561403,
          "sw": 110,
          "sh": 114
        }
      ],
      "deco_farol": [
        {
          "kind": "window",
          "haloScale": 1.75,
          "x": 0.31666666666666665,
          "y": 0.45,
          "w": 0.3,
          "h": 0.16666666666666666,
          "sw": 30,
          "sh": 60
        }
      ],
      "deco_farolito": [
        {
          "kind": "window",
          "haloScale": 1.28,
          "x": 0.5862068965517241,
          "y": 0.6721311475409836,
          "w": 0.39655172413793105,
          "h": 0.3770491803278688,
          "sw": 58,
          "sh": 61
        }
      ]
    }
  };
  const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
  function profiles(key,renewed){return (renewed?ART.renewed:ART.classic)[key]||[];}
  // The sprite, the visit canvas and the multiply layer share this diameter.
  function haloDiameter(pos, profile, darkness) {
    const base = Math.max(pos.w * 6.5, pos.h * 4.5);
    const scale = profile?.haloScale ?? (profile?.kind === 'fire' ? 1.45 : 1.6);
    return base * (1 + (scale - 1) * clamp(darkness));
  }
  // Coordenadas de imagen completa -> frame recortado -> origen/flip/giro del sprite.
  function anchor(s,p){
    if(!s||!p||!(s.displayWidth>0&&s.displayHeight>0))return null;
    const f=s.frame||{},fw=f.cutWidth||f.width||p.sw,fh=f.cutHeight||f.height||p.sh;
    const u=(p.x*p.sw-(f.cutX||0))/fw,v=(p.y*p.sh-(f.cutY||0))/fh;
    if(u<0||u>1||v<0||v>1)return null;
    const x=((s.flipX?1-u:u)-(s.originX??.5))*s.displayWidth;
    const y=((s.flipY?1-v:v)-(s.originY??1))*s.displayHeight;
    const r=s.rotation||0,c=Math.cos(r),sn=Math.sin(r);
    return {x:s.x+x*c-y*sn,y:s.y+x*sn+y*c,w:p.w*p.sw/fw*s.displayWidth,h:p.h*p.sh/fh*s.displayHeight,rotation:r};
  }
  function appearance(p,darkness,time,reduced=false,active=true){
    const d=active?clamp(darkness):0,t=Number.isFinite(time)?time:0;
    const pulse=reduced?1:1+.055*Math.sin(t*.0043+p.x*17)+.025*Math.sin(t*.0107+p.y*31);
    const fire=p.kind==='fire',strength=fire?1:d;
    return {core:strength*(fire?.66:.60)*pulse,halo:active?(fire?.045+.40*d:.43*d)*pulse:0,
      stretch:fire&&!reduced?1+.10*Math.sin(t*.009+p.x*19):1};
  }
  // Warm emitters replace moonlight locally within the ONE existing multiply layer.
  // Otherwise a bright additive core clips to white before the blue night filter.
  function atmosphereLayers(pools,camera,scale={}){
    const layers=[],out={},sx=scale.x??1,sy=scale.y??1;
    for(const {pos,strength,diameter}of pools){
      const a=clamp(strength);if(!pos||!a)continue;
      const p=camera?.matrix?.transformPoint?camera.matrix.transformPoint(pos.x-(camera.scrollX||0),pos.y-(camera.scrollY||0),out):pos;
      const x=p.x*sx+(scale.ox||0),y=p.y*sy+(scale.oy||0),zoom=camera?.zoom||1;
      const r=(diameter ?? haloDiameter(pos,null,0))*zoom;
      if(![x,y,r].every(Number.isFinite)||r<=0)continue;
      const n=v=>Math.round(v*100)/100;
      layers.push('radial-gradient(ellipse '+n(r*sx/2)+'px '+n(r*sy*.83/2)+'px at '+n(x)+'px '+n(y)+'px,rgba(255,229,172,'+n(.92*a)+') 0%,rgba(255,214,148,'+n(.42*a)+') 36%,rgba(255,205,130,'+n(.10*a)+') 68%,transparent 100%)');
    }
    return layers.length?layers.join(',')+',linear-gradient(var(--gf-day-color,#fff),var(--gf-day-color,#fff))':'';
  }
  function texture(scene,key,core){
    if(scene.textures.exists(key))return;
    const tex=scene.textures.createCanvas(key,64,64),ctx=tex.context;
    const g=ctx.createRadialGradient(32,32,0,32,32,32);
    if(core){g.addColorStop(0,'rgba(255,244,180,1)');g.addColorStop(.28,'rgba(255,204,92,.95)');g.addColorStop(.65,'rgba(255,151,48,.5)');}
    else{g.addColorStop(0,'rgba(255,205,112,.9)');g.addColorStop(.22,'rgba(255,185,80,.65)');g.addColorStop(.55,'rgba(255,167,62,.22)');}
    g.addColorStop(1,'rgba(255,157,55,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);tex.refresh();
  }
  function create(scene){
    if(!scene?.textures?.createCanvas||!scene.add?.image)return null;
    texture(scene,HALO,false);texture(scene,CORE,true);
    const entries=new Map();let dead=false;
    const media=root.matchMedia?.('(prefers-reduced-motion: reduce)');
    const world=root.document?.getElementById?.('game');let painted=-Infinity;
    function atmosphere(pools,at,time){
      if(!world?.style)return;
      if(!at.active||!at.darkness||!pools.length){world.style.removeProperty('--gf-day-sources');painted=-Infinity;return;}
      if(time>=painted&&time-painted<50)return;painted=time;
      const canvas=scene.game?.canvas,rect=canvas?.getBoundingClientRect?.(),bounds=world.getBoundingClientRect?.();
      const scale=rect&&bounds?{x:rect.width/(scene.scale?.width||rect.width),y:rect.height/(scene.scale?.height||rect.height),ox:rect.left-bounds.left,oy:rect.top-bounds.top}:{};
      const layers=atmosphereLayers(pools,scene.cameras?.main,scale);
      if(layers)world.style.setProperty('--gf-day-sources',layers);else world.style.removeProperty('--gf-day-sources');
    }
    function remove(entry){entry.halo.destroy();entry.core.destroy();}
    function image(key){const im=scene.add.image(0,0,key);root.GoldenLighting?.exclude(im);im.setBlendMode(root.Phaser?.BlendModes?.ADD??1);return im;}
    function sync(state,time){
      if(dead)return;
      const seen=new Set(),pools=[],at=state.atmosphere||{active:false,darkness:0};
      function source(owner,s,key,allowFire){
        if(!s||s.active===false||s.visible===false||owner.oculto||owner.locked||/^build_/.test(key||''))return;
        const renewed=!!root.GoldenVisual?.hasVariant?.(key);
        profiles(key,renewed).forEach((p,i)=>{
          if(p.kind==='fire'&&!allowFire)return;
          const pos=anchor(s,p);if(!pos)return;
          // Identity follows the live sprite: moving never leaves a second light behind.
          let group=entries.get(owner);if(!group){group={parts:new Map()};entries.set(owner,group);}
          let e=group.parts.get(i);if(!e){e={halo:image(HALO),core:image(CORE)};group.parts.set(i,e);}
          seen.add(e);
          const a=appearance(p,at.darkness,time,!!media?.matches,at.active);
          const alpha=Number.isFinite(s.alpha)?s.alpha:1;
          const diameter = haloDiameter(pos, p, at.active ? at.darkness : 0);
          if(at.active&&at.darkness&&alpha>0)pools.push({pos,strength:at.darkness*alpha,diameter});
          const depth=(s.depth||s.y||0)+.02;
          e.halo.setPosition(pos.x,pos.y).setDisplaySize(diameter,diameter*.83).setDepth(depth).setAlpha(a.halo*alpha).setVisible(a.halo>0);
          e.core.setPosition(pos.x,pos.y).setDisplaySize(pos.w,pos.h*a.stretch).setDepth(depth+.01).setAlpha(a.core*alpha).setVisible(a.core>0);
          e.core.setRotation?.(pos.rotation);
        });
      }
      for(const o of state.objects||[]){
        if(state.built&&Object.prototype.hasOwnProperty.call(state.built,o.type)&&!state.built[o.type])continue;
        source(o,o.sprite,o.sprite?.texture?.key,o.type!=='store'||!!state.forgeLit);
      }
      for(const a of state.adornos||[]){
        if(a.id!=='farol'&&a.id!=='farolito')continue;
        const parent=a.g,im=parent?.list?.find(s=>s.texture?.key==='deco_'+a.id)||parent;
        if(!parent||parent.visible===false||parent.active===false)continue;
        // Farolito is a container. Its image stays local; the emitter uses world coordinates.
        let s=im;
        if(im!==parent)s={x:parent.x+im.x,y:parent.y+im.y,depth:parent.depth,alpha:(parent.alpha??1)*(im.alpha??1),
          displayWidth:im.displayWidth,displayHeight:im.displayHeight,originX:im.originX,originY:im.originY,
          rotation:im.rotation,flipX:im.flipX,flipY:im.flipY,frame:im.frame,visible:im.visible,active:im.active};
        source(a,s,'deco_'+a.id,false);
      }
      for(const [s,g]of entries){for(const [i,e]of g.parts)if(!seen.has(e)){remove(e);g.parts.delete(i);}if(!g.parts.size)entries.delete(s);}
      atmosphere(pools,at,time);
    }
    // Keep the cleanup separate from source groups so restarts cannot accumulate effects.
    function cleanup(){if(dead)return;dead=true;for(const g of entries.values())for(const e of g.parts.values())remove(e);entries.clear();world?.style?.removeProperty('--gf-day-sources');scene.events?.off('shutdown',cleanup);}
    scene.events?.once('shutdown',cleanup);
    return {sync,destroy:cleanup,size:()=>{let n=0;for(const g of entries.values())n+=g.parts.size;return n;}};
  }
  const api={profiles,anchor,appearance,haloDiameter,atmosphereLayers,create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root.document)root.GoldenWorldLights=api;
})(typeof window==='undefined'?globalThis:window);
