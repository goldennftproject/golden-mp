#!/usr/bin/env python3
"""Prepare optional reference UI textures from archived image_gen PNG sources.

python tools/build-reference-skin.py --sources <archive>/sources
Classic art and every approved building remain unchanged.
"""
from pathlib import Path
import argparse,json
from PIL import Image

def build(root,sources):
 target=root/'public/assets/visual-v2/skin';target.mkdir(exist_ok=True)
 def bbox(im):return im.getchannel('A').point(lambda v:255 if v>12 else 0).getbbox()
 for key in ['wood-frame','parchment-frame','green-frame','awning','logo-stacked']:
  im=Image.open(sources/(key+'.png')).convert('RGBA');bounds=bbox(im)
  if not bounds:raise ValueError('Empty source: '+key)
  im=im.crop(bounds)
  if key.endswith('-frame'):im=im.resize((256,256),Image.Resampling.LANCZOS)
  elif key=='awning':im.thumbnail((640,128),Image.Resampling.LANCZOS)
  else:im.thumbnail((512,280),Image.Resampling.LANCZOS)
  im.save(target/(key+'.png'),optimize=True)
 folder=root/'public/assets/visual-v2';mapping=json.loads((folder/'atlas.json').read_text());atlas=Image.open(folder/'atlas.png').convert('RGBA')
 meadow=Image.open(sources/'meadow.png').convert('RGBA');side=min(384,meadow.width//3,meadow.height//3)
 for i,key in enumerate(['grass_a','grass_b','grass_c']):
  fr=mapping['frames'][key];x=round((meadow.width-side)*i/2);y=round((meadow.height-side)*i/2)
  tile=meadow.crop((x,y,x+side,y+side)).resize((fr['w'],fr['h']),Image.Resampling.LANCZOS);atlas.paste(tile,(fr['x'],fr['y']))
 atlas.save(folder/'atlas.png',optimize=True);mapping['version']=4;(folder/'atlas.json').write_text(json.dumps(mapping,separators=(',',':')),encoding='utf-8')
 for name,key in {'chest':'baul_premios_lleno','potato':'cropg_papa','wood':'tree','stone':'node_stone','market':'market','cook':'cocina','build':'build_store'}.items():
  fr=mapping['frames'][key];tile=atlas.crop((fr['x'],fr['y'],fr['x']+fr['w'],fr['y']+fr['h']));tile=tile.crop(bbox(tile));tile.thumbnail((80,80),Image.Resampling.LANCZOS)
  cv=Image.new('RGBA',(88,88));cv.alpha_composite(tile,((88-tile.width)//2,(88-tile.height)//2));cv.save(target/('objective-'+name+'.png'),optimize=True)
 return target

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--sources',required=True,type=Path);args=parser.parse_args()
 print(build(Path(__file__).resolve().parent.parent,args.sources))
