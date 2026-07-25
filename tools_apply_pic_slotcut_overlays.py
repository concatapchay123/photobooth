from __future__ import annotations
import base64, hashlib, json
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

PROJECT = Path('/mnt/d/my-photobooth')
SUMMARY_PATH = PROJECT / 'data' / 'frame-packages' / 'pic-matched-settings-export.json'
STORE_DIR = PROJECT / 'data' / 'frame-packages'
OUT_DIR = STORE_DIR / 'pic-matched-settings'
SCHEMA = 'photobooth-frame-package:v1'
SLOT_SCHEMA = 'photobooth-slot-map:v1'

def now_iso():
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

def is_slot_pixel(r, g, b, a):
    if a <= 24:
        return True
    return a > 8 and g >= 95 and g >= r * 1.22 + 18 and g >= b * 1.22 + 18 and (g - min(r, b)) >= 45

def mask_image_to_overlay_data_url(mask_path: Path, width: int, height: int):
    img = Image.open(mask_path).convert('RGBA')
    if img.size != (width, height):
        img = img.resize((width, height), Image.Resampling.LANCZOS)
    pix = img.load()
    for y in range(height):
        for x in range(width):
            r, g, b, a = pix[x, y]
            if is_slot_pixel(r, g, b, a):
                pix[x, y] = (r, g, b, 0)
            else:
                pix[x, y] = (r, g, b, 255)
    import io
    buf = io.BytesIO()
    img.save(buf, format='PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')

def package_id(frame_name, w, h):
    return hashlib.sha1(f'{frame_name}:{w}x{h}'.encode()).hexdigest()[:16]

def main():
    summary = json.loads(SUMMARY_PATH.read_text(encoding='utf-8'))
    applied = []
    ts = now_iso()
    for item in summary['items']:
        pkg_path = Path(item['framePackageFile'])
        payload = json.loads(pkg_path.read_text(encoding='utf-8'))
        sm = payload['slotMap']
        frame_name = sm['frameName']
        w = int(sm['frameWidth'])
        h = int(sm['frameHeight'])
        mask_path = Path(item['sourceMaskImage'])
        data_url = mask_image_to_overlay_data_url(mask_path, w, h)
        # Giữ key theo frame gốc, nhưng frame.dataUrl phải là overlay đã xóa phông slot.
        payload['schema'] = SCHEMA
        payload['app'] = 'my-photobooth'
        payload['packageVersion'] = 2
        payload['frame'] = {
            'name': frame_name,
            'type': 'png',
            'mimeType': 'image/png',
            'width': w,
            'height': h,
            'dataUrl': data_url,
        }
        sm['schema'] = SLOT_SCHEMA
        sm['frameName'] = frame_name
        sm['frameWidth'] = w
        sm['frameHeight'] = h
        sm['frameType'] = 'png'
        sm['detectionMode'] = 'manual-transparent-overlay'
        sm['chromaSettings'] = {'color': '#00ff00', 'tolerance': 42, 'softness': 70}
        sm['sourceMaskImage'] = str(mask_path)
        sm['overlayMode'] = 'transparent-slot-overlay'
        sm['notes'] = 'frame.dataUrl is the manually background-removed overlay. Transparent pixels are exact photo slots; package id still uses the original matched frame name and dimensions.'
        payload['slotMap'] = sm
        payload['exportedAt'] = payload.get('exportedAt') or ts
        payload['savedAt'] = ts
        pid = package_id(frame_name, w, h)
        top = STORE_DIR / f'{pid}.json'
        pretty = OUT_DIR / Path(item['framePackageFile']).name
        top.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
        pretty.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
        applied.append({'sourceMaskImage': str(mask_path), 'matchedFrame': frame_name, 'id': pid, 'storeFile': str(top), 'slotCount': len(sm.get('zones', [])), 'frameSize': [w, h]})
    audit = {'schema': 'photobooth-applied-transparent-overlays:v1', 'generatedAt': ts, 'count': len(applied), 'items': applied}
    (STORE_DIR / 'pic-matched-transparent-overlays-applied.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding='utf-8')
    for row in applied:
        print(f"{Path(row['sourceMaskImage']).name} => {row['matchedFrame']} | id={row['id']} | slots={row['slotCount']}")
    print('APPLIED', len(applied))

if __name__ == '__main__':
    main()
