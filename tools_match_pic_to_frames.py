from __future__ import annotations
import base64, hashlib, json, math
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

try:
    import cv2
    import numpy as np
except Exception:
    cv2 = None
    np = None

PROJECT = Path('/mnt/d/my-photobooth')
PIC_DIR = Path('/mnt/c/Users/tqtph/Downloads/pic')
FRAME_DIR = PROJECT / 'frames'
OUT_DIR = PROJECT / 'data' / 'frame-packages' / 'pic-matched-settings'
SUMMARY_PATH = PROJECT / 'data' / 'frame-packages' / 'pic-matched-settings-export.json'

FRAME_PACKAGE_SCHEMA='photobooth-frame-package:v1'
SLOT_MAP_SCHEMA='photobooth-slot-map:v1'
APP='my-photobooth'
IMG_EXT={'.png','.jpg','.jpeg'}

def now_iso(): return datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
def safe_stem(name): return ''.join(c if c.isalnum() or c in '._-' else '_' for c in Path(name).stem)[:120] or 'frame'
def package_id(frame_name,w,h): return hashlib.sha1(f'{frame_name}:{w}x{h}'.encode()).hexdigest()[:16]
def mime_for(p): return 'image/png' if p.suffix.lower()=='.png' else 'image/jpeg'
def frame_type_for(p): return 'png' if p.suffix.lower()=='.png' else 'jpg'
def data_url(path, mime): return 'data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode('ascii')

def green_or_alpha(r,g,b,a):
    green = a>8 and g>=95 and g>=r*1.22+18 and g>=b*1.22+18 and (g-min(r,b))>=45
    alpha = a<=24
    return green or alpha, green, alpha

def detect_slots(img):
    rgba=img.convert('RGBA'); w,h=rgba.size; pix=rgba.load(); mask=bytearray(w*h); green=alpha=0
    for y in range(h):
        row=y*w
        for x in range(w):
            r,g,b,a=pix[x,y]
            m,gr,al=green_or_alpha(r,g,b,a)
            if m: mask[row+x]=1
            green+=gr; alpha+=al
    seen=bytearray(w*h); comps=[]
    for i,v in enumerate(mask):
        if not v or seen[i]: continue
        stack=[i]; seen[i]=1; minx=maxx=i%w; miny=maxy=i//w; area=0
        while stack:
            p=stack.pop(); area+=1; x=p%w; y=p//w
            minx=min(minx,x); maxx=max(maxx,x); miny=min(miny,y); maxy=max(maxy,y)
            for n,ok in ((p-1,x>0),(p+1,x+1<w),(p-w,y>0),(p+w,y+1<h)):
                if ok and mask[n] and not seen[n]: seen[n]=1; stack.append(n)
        comps.append({'x':minx,'y':miny,'width':maxx-minx+1,'height':maxy-miny+1,'area':area})
    fa=w*h; filtered=[]
    for c in comps:
        bw,bh,area=c['width'],c['height'],c['area']
        if area < max(120,fa*0.0012): continue
        if bw < w*0.055 or bh < h*0.04: continue
        if area > fa*0.72: continue
        if area/max(1,bw*bh) < 0.18: continue
        filtered.append(c)
    filtered.sort(key=lambda c:c['area'], reverse=True)
    accepted=[]
    for c in filtered:
        x1,y1,x2,y2=c['x'],c['y'],c['x']+c['width'],c['y']+c['height']
        dup=False
        for a in accepted:
            ax1,ay1,ax2,ay2=a['x'],a['y'],a['x']+a['width'],a['y']+a['height']
            inter=max(0,min(x2,ax2)-max(x1,ax1))*max(0,min(y2,ay2)-max(y1,ay1))
            if inter/max(1,min(c['area'],a['area']))>0.78: dup=True; break
        if not dup: accepted.append(c)
    accepted.sort(key=lambda c:(c['y']+c['height']/2,c['x']+c['width']/2))
    return accepted, green, alpha

def zone_from_comp(c, idx, sx=1.0, sy=1.0):
    x,y,w,h=c['x']*sx,c['y']*sy,c['width']*sx,c['height']*sy
    return {'slotIndex':idx,'shape':'polygon','detectionMode':'matched-mask-export','points':[
        {'x':round(x,2),'y':round(y,2)}, {'x':round(x+w,2),'y':round(y,2)},
        {'x':round(x+w,2),'y':round(y+h,2)}, {'x':round(x,2),'y':round(y+h,2)}]}

def ahash(path, size=16):
    im=Image.open(path).convert('RGBA').resize((size,size), Image.Resampling.LANCZOS)
    # Replace green/transparent areas with white so manually removed slots don't dominate too much.
    bg=Image.new('RGBA', im.size, (255,255,255,255)); pix=im.load(); bp=bg.load()
    vals=[]
    for y in range(size):
        for x in range(size):
            r,g,b,a=pix[x,y]; m,_,_=green_or_alpha(r,g,b,a)
            if not m: bp[x,y]=(r,g,b,255)
    gray=bg.convert('L'); data=list(gray.getdata()); avg=sum(data)/len(data)
    return ''.join('1' if v>avg else '0' for v in data)

def hdist(a,b): return sum(c1!=c2 for c1,c2 in zip(a,b))

def hist_signature(path):
    im=Image.open(path).convert('RGBA').resize((160,240), Image.Resampling.LANCZOS)
    data=[]
    for r,g,b,a in im.getdata():
        m,_,_=green_or_alpha(r,g,b,a)
        if not m: data.append((r,g,b))
    if not data: data=[(255,255,255)]
    # coarse RGB histogram
    bins=[0]*64
    for r,g,b in data:
        idx=(r//64)*16+(g//64)*4+(b//64); bins[idx]+=1
    s=sum(bins) or 1
    return [x/s for x in bins]

def hist_dist(a,b): return sum(abs(x-y) for x,y in zip(a,b))

def orb_score(pic, frame):
    if cv2 is None: return 0
    im1=cv2.imread(str(pic), cv2.IMREAD_COLOR); im2=cv2.imread(str(frame), cv2.IMREAD_COLOR)
    if im1 is None or im2 is None: return 0
    # resize large images for speed
    def resize(im):
        h,w=im.shape[:2]; scale=min(900/max(w,h),1.0)
        if scale<1: im=cv2.resize(im,(int(w*scale),int(h*scale)))
        return im
    im1=resize(im1); im2=resize(im2)
    orb=cv2.ORB_create(nfeatures=1500)
    k1,d1=orb.detectAndCompute(im1,None); k2,d2=orb.detectAndCompute(im2,None)
    if d1 is None or d2 is None or len(k1)<8 or len(k2)<8: return 0
    bf=cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches=bf.match(d1,d2)
    good=[m for m in matches if m.distance<64]
    return len(good)

def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    frame_files=sorted([p for p in FRAME_DIR.iterdir() if p.suffix.lower() in IMG_EXT], key=lambda p:p.name.lower())
    frame_meta=[]
    for f in frame_files:
        try:
            im=Image.open(f); frame_meta.append({'path':f,'name':f.name,'size':im.size,'ahash':ahash(f),'hist':hist_signature(f)})
        except Exception: pass
    items=[]; gen=now_iso()
    for pic in sorted([p for p in PIC_DIR.iterdir() if p.suffix.lower() in IMG_EXT], key=lambda p:p.name.lower()):
        pim=Image.open(pic); pw,ph=pim.size
        comps,green,alpha=detect_slots(pim)
        phash=ahash(pic); phist=hist_signature(pic)
        scored=[]
        for fm in frame_meta:
            fw,fh=fm['size']
            ratio_diff=abs((pw/ph)-(fw/fh))
            size_bonus=0
            if (pw,ph)==(fw,fh): size_bonus+=80
            if pic.name.lower()==fm['name'].lower(): size_bonus+=120
            if pic.stem.lower() in fm['name'].lower() or Path(fm['name']).stem.lower() in pic.stem.lower(): size_bonus+=30
            score=size_bonus - hdist(phash,fm['ahash'])*1.4 - hist_dist(phist,fm['hist'])*80 - ratio_diff*35
            scored.append((score,fm))
        scored.sort(key=lambda x:x[0], reverse=True)
        # If dimensions/ratio are ambiguous, use ORB for top candidates plus same-ratio candidates.
        candidates=[]; seen=set()
        for score,fm in scored[:12]:
            candidates.append([score,fm]); seen.add(fm['name'])
        for score,fm in scored:
            if len(candidates)>=24: break
            fw,fh=fm['size']
            if abs((pw/ph)-(fw/fh))<0.035 and fm['name'] not in seen:
                candidates.append([score,fm]); seen.add(fm['name'])
        rescored=[]
        for score,fm in candidates:
            os=orb_score(pic,fm['path'])
            fw,fh=fm['size']
            ratio_diff=abs((pw/ph)-(fw/fh))
            final=score + os*3.0 - ratio_diff*40
            rescored.append((final,score,os,fm))
        rescored.sort(key=lambda x:x[0], reverse=True)
        best=rescored[0][3]
        top=[{'frameName':r[3]['name'],'width':r[3]['size'][0],'height':r[3]['size'][1],'score':round(r[0],2),'orbMatches':r[2]} for r in rescored[:5]]
        fw,fh=best['size']; sx,sy=fw/pw,fh/ph
        zones=[zone_from_comp(c,i,sx,sy) for i,c in enumerate(comps)]
        slot_map={'schema':SLOT_MAP_SCHEMA,'frameName':best['name'],'frameWidth':fw,'frameHeight':fh,'frameType':frame_type_for(best['path']),
                  'slotCount':len(zones),'detectionMode':'matched-mask-export','chromaSettings':{'color':'#00ff00','tolerance':42,'softness':70},
                  'zones':zones,'exportedAt':gen,'sourceMaskImage':str(pic),'matchedFramePath':str(best['path']),
                  'matchCandidates':top,'notes':'Slot zones were extracted from the manually background-removed image and scaled to the matched original frame dimensions.'}
        pkg={'schema':FRAME_PACKAGE_SCHEMA,'app':APP,'packageVersion':1,'frame':{'name':best['name'],'type':frame_type_for(best['path']),'mimeType':mime_for(best['path']),'width':fw,'height':fh,'dataUrl':data_url(best['path'],mime_for(best['path']))},'slotMap':slot_map,'exportedAt':gen,'savedAt':gen}
        stem=safe_stem(pic.stem+'__matched__'+Path(best['name']).stem)
        sm=OUT_DIR/f'{stem}.slot-map.json'; fp=OUT_DIR/f'{stem}.frame-package.json'
        sm.write_text(json.dumps(slot_map,ensure_ascii=False,indent=2),encoding='utf-8')
        fp.write_text(json.dumps(pkg,ensure_ascii=False,indent=2),encoding='utf-8')
        items.append({'sourceMaskImage':str(pic),'matchedFrame':best['name'],'matchedFramePath':str(best['path']),'maskSize':[pw,ph],'frameSize':[fw,fh],
                      'scaleX':sx,'scaleY':sy,'slotCount':len(zones),'greenPixels':green,'transparentPixels':alpha,'zones':zones,
                      'matchCandidates':top,'slotMapFile':str(sm),'framePackageFile':str(fp),'recommendedStoreId':package_id(best['name'],fw,fh)})
    summary={'schema':'photobooth-pic-matched-slot-settings-export:v1','generatedAt':gen,'project':str(PROJECT),'sourceDirectory':str(PIC_DIR),'frameDirectory':str(FRAME_DIR),'itemCount':len(items),'items':items}
    SUMMARY_PATH.write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    print(SUMMARY_PATH)
    for it in items:
        print(f"{Path(it['sourceMaskImage']).name} => {it['matchedFrame']} | slots={it['slotCount']} | scale={it['scaleX']:.3f},{it['scaleY']:.3f} | top={it['matchCandidates'][:3]}")

if __name__=='__main__': main()
