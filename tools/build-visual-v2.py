#!/usr/bin/env python3
"""Pack renewed variants; never overwrite the classic sources. Requires archived generated PNGs."""
from pathlib import Path
import argparse,json
from PIL import Image
parser=argparse.ArgumentParser();parser.add_argument('--sources',required=True,type=Path);args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
keys=['barn_evo_0','barn_evo_1','barn_evo_2','barn_evo_3','market','cocina','store','horno','establo','curtiduria']
anchors={'store':{'smoke':{'x':.192,'y':.129},'forge':{'x':.564,'y':.743}},'horno':{'smoke':{'x':.5,'y':.096}}}
atlas=Image.new('RGBA',(128*len(keys),128));frames={}
for i,key in enumerate(keys):
 im=Image.open(args.sources/(key+'.png')).convert('RGBA')
 bb=im.getchannel('A').point(lambda v:255 if v>12 else 0).getbbox()
 if bb is None:raise ValueError('Empty asset: '+key)
 im=im.crop(bb);size=Image.open(root/'public/assets/farm'/(key+'.png')).size
 target=(112,110) if key.startswith('barn_') else (size[0]-4,size[1]-4)
 im.thumbnail(target,Image.Resampling.LANCZOS)
 cv=Image.new('RGBA',size);cv.alpha_composite(im,((size[0]-im.width)//2,size[1]-im.height))
 atlas.alpha_composite(cv,(i*128,0));frames[key]={'x':i*128,'y':0,'w':size[0],'h':size[1]}
 if key in anchors:frames[key]['anchors']=anchors[key]
folder=root/'public/assets/visual-v2';folder.mkdir(exist_ok=True)
atlas.save(folder/'atlas.png',optimize=True)
(folder/'atlas.json').write_text(json.dumps({'version':2,'frames':frames},separators=(',',':')),encoding='utf-8')
print(str(folder/'atlas.png')+': '+str((folder/'atlas.png').stat().st_size)+' bytes / '+str(len(keys))+' variants')
