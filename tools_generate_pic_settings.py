from __future__ import annotations

import base64
import hashlib
import json
from collections import deque
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

PROJECT = Path('/mnt/d/my-photobooth')
PIC_DIR = Path('/mnt/c/Users/tqtph/Downloads/pic')
OUT_DIR = PROJECT / 'data' / 'frame-packages' / 'pic-slot-settings'
SUMMARY_PATH = PROJECT / 'data' / 'frame-packages' / 'pic-slot-settings-export.json'

FRAME_PACKAGE_SCHEMA = 'photobooth-frame-package:v1'
SLOT_MAP_SCHEMA = 'photobooth-slot-map:v1'
APP = 'my-photobooth'

def now_iso():
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

def safe_stem(name: str) -> str:
    return ''.join(c if c.isalnum() or c in '._-' else '_' for c in Path(name).stem)[:120] or 'frame'

def is_green(r, g, b, a):
    # Detect green/green-screen placeholder areas without touching normal dark/gray artwork.
    return a > 8 and g >= 95 and g >= r * 1.22 + 18 and g >= b * 1.22 + 18 and (g - min(r, b)) >= 45

def is_transparent(r, g, b, a):
    return a <= 24

def detect_mask(img: Image.Image):
    rgba = img.convert('RGBA')
    w, h = rgba.size
    pix = rgba.load()
    mask = bytearray(w * h)
    green_count = 0
    alpha_count = 0
    for y in range(h):
        row = y * w
        for x in range(w):
            r, g, b, a = pix[x, y]
            green = is_green(r, g, b, a)
            alpha = is_transparent(r, g, b, a)
            if green or alpha:
                mask[row + x] = 1
                green_count += int(green)
                alpha_count += int(alpha)
    return mask, green_count, alpha_count

def components(mask, w, h):
    seen = bytearray(w * h)
    comps = []
    for i, v in enumerate(mask):
        if not v or seen[i]:
            continue
        q = [i]
        seen[i] = 1
        minx = maxx = i % w
        miny = maxy = i // w
        area = 0
        while q:
            p = q.pop()
            area += 1
            x = p % w
            y = p // w
            if x < minx: minx = x
            if x > maxx: maxx = x
            if y < miny: miny = y
            if y > maxy: maxy = y
            if x > 0:
                n = p - 1
                if mask[n] and not seen[n]: seen[n] = 1; q.append(n)
            if x + 1 < w:
                n = p + 1
                if mask[n] and not seen[n]: seen[n] = 1; q.append(n)
            if y > 0:
                n = p - w
                if mask[n] and not seen[n]: seen[n] = 1; q.append(n)
            if y + 1 < h:
                n = p + w
                if mask[n] and not seen[n]: seen[n] = 1; q.append(n)
        comps.append({'x': minx, 'y': miny, 'width': maxx - minx + 1, 'height': maxy - miny + 1, 'area': area})
    return comps

def filter_components(comps, w, h):
    frame_area = w * h
    out = []
    for c in comps:
        area = c['area']
        bw, bh = c['width'], c['height']
        if area < max(120, frame_area * 0.0012):
            continue
        if bw < w * 0.08 or bh < h * 0.045:
            continue
        # reject whole background/huge areas; slots are usually sizeable but not almost full canvas
        if area > frame_area * 0.72:
            continue
        fill_ratio = area / max(1, bw * bh)
        if fill_ratio < 0.18:
            continue
        out.append(c)
    # remove duplicate nested/overlapping boxes, keep larger sensible areas
    out.sort(key=lambda c: c['area'], reverse=True)
    accepted = []
    for c in out:
        cx1, cy1, cx2, cy2 = c['x'], c['y'], c['x'] + c['width'], c['y'] + c['height']
        duplicate = False
        for a in accepted:
            ax1, ay1, ax2, ay2 = a['x'], a['y'], a['x'] + a['width'], a['y'] + a['height']
            ix = max(0, min(cx2, ax2) - max(cx1, ax1))
            iy = max(0, min(cy2, ay2) - max(cy1, ay1))
            inter = ix * iy
            if inter / max(1, min(c['area'], a['area'])) > 0.78:
                duplicate = True
                break
        if not duplicate:
            accepted.append(c)
    accepted.sort(key=lambda c: (c['y'] + c['height'] / 2, c['x'] + c['width'] / 2))
    return accepted

def make_zone(c, idx):
    x, y, w, h = c['x'], c['y'], c['width'], c['height']
    return {
        'slotIndex': idx,
        'shape': 'polygon',
        'detectionMode': 'mask-export',
        'points': [
            {'x': round(x, 2), 'y': round(y, 2)},
            {'x': round(x + w, 2), 'y': round(y, 2)},
            {'x': round(x + w, 2), 'y': round(y + h, 2)},
            {'x': round(x, 2), 'y': round(y + h, 2)},
        ],
    }

def data_url(path: Path, mime: str):
    return 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode('ascii')

def package_id(frame_name, width, height):
    return hashlib.sha1(f'{frame_name}:{width}x{height}'.encode()).hexdigest()[:16]

def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    items = []
    for path in sorted(PIC_DIR.iterdir(), key=lambda p: p.name.lower()):
        if path.suffix.lower() not in {'.png', '.jpg', '.jpeg'}:
            continue
        img = Image.open(path)
        w, h = img.size
        mask, green_count, alpha_count = detect_mask(img)
        comps = filter_components(components(mask, w, h), w, h)
        zones = [make_zone(c, i) for i, c in enumerate(comps)]
        mime = 'image/png' if path.suffix.lower() == '.png' else 'image/jpeg'
        frame_name = path.name
        exported_at = now_iso()
        slot_map = {
            'schema': SLOT_MAP_SCHEMA,
            'frameName': frame_name,
            'frameWidth': w,
            'frameHeight': h,
            'frameType': path.suffix.lower().lstrip('.').replace('jpeg', 'jpg'),
            'slotCount': len(zones),
            'detectionMode': 'mask-export',
            'chromaSettings': {'color': '#00ff00', 'tolerance': 42, 'softness': 70},
            'zones': zones,
            'exportedAt': exported_at,
            'sourceImage': str(path),
            'notes': 'Generated from manually background-removed/green-screen slot image in Downloads/pic. Review visually before production if slot edges are irregular.',
        }
        pkg = {
            'schema': FRAME_PACKAGE_SCHEMA,
            'app': APP,
            'packageVersion': 1,
            'frame': {
                'name': frame_name,
                'type': 'png' if path.suffix.lower() == '.png' else 'jpg',
                'mimeType': mime,
                'width': w,
                'height': h,
                'dataUrl': data_url(path, mime),
            },
            'slotMap': slot_map,
            'exportedAt': exported_at,
            'savedAt': exported_at,
        }
        stem = safe_stem(frame_name)
        (OUT_DIR / f'{stem}.slot-map.json').write_text(json.dumps(slot_map, ensure_ascii=False, indent=2), encoding='utf-8')
        (OUT_DIR / f'{stem}.frame-package.json').write_text(json.dumps(pkg, ensure_ascii=False, indent=2), encoding='utf-8')
        items.append({
            'sourceImage': str(path),
            'frameName': frame_name,
            'width': w,
            'height': h,
            'greenPixels': green_count,
            'transparentPixels': alpha_count,
            'slotCount': len(zones),
            'zones': zones,
            'slotMapFile': str(OUT_DIR / f'{stem}.slot-map.json'),
            'framePackageFile': str(OUT_DIR / f'{stem}.frame-package.json'),
            'recommendedStoreId': package_id(frame_name, w, h),
        })
    summary = {
        'schema': 'photobooth-pic-slot-settings-export:v1',
        'generatedAt': now_iso(),
        'project': str(PROJECT),
        'sourceDirectory': str(PIC_DIR),
        'itemCount': len(items),
        'items': items,
    }
    SUMMARY_PATH.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    print(str(SUMMARY_PATH))
    print('items', len(items))
    print('with_slots', sum(1 for i in items if i['slotCount'] > 0))
    for item in items:
        print(f"{item['frameName']} | {item['width']}x{item['height']} | slots={item['slotCount']} | green={item['greenPixels']} | alpha={item['transparentPixels']}")

if __name__ == '__main__':
    main()
