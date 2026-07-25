#!/usr/bin/env python3
import base64
import hashlib
import json
import math
import os
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path('/mnt/d/my-photobooth')
PIC_DIR = Path('/mnt/c/Users/tqtph/Downloads/pic')
FRAMES_DIR = ROOT / 'frames'
STORE_DIR = ROOT / 'data/frame-packages'
AUDIT_DIR = STORE_DIR / 'pic-matched-settings'
SMOKE_DIR = AUDIT_DIR / 'render-smoke'
MANIFEST_PATH = AUDIT_DIR / 'manifest.json'
STORE_SCHEMA = 'photobooth-frame-package:v1'
SLOT_SCHEMA = 'photobooth-slot-map:v1'

# Manual confidence override after visual/name/size audit of available frames.
# These are the only mappings allowed to become active. Others remain audit-only.
APPROVED_MATCHES = {
    '31e39f26-a7f3-42a0-add6-9b816c3cf090.png': 'ea46ae3869dd3383b3a3fce815c62c57.jpg',
    'f16c539f-a423-4ca7-952c-50cc16f1ac9b.png': '4023b65e36712231dc878c1ca781fd73.jpg',
    'f639dc50-0236-43e5-a271-988e62c36511.png': '47c28b28dd3cf100ed35e403aba36744.jpg',
    'khung.jpg': '8564933756d90b9231bcdac98ab478ab.jpg',
    'd3779dd0-0037-402c-bf77-d1b5cedbfc08.png': '70439c758494131e6eb373b8442d903e.jpg',
    'e8ed259d-fc74-46a8-b339-669ce2123881.png': '12d22f3c012d7313c68e5543a2090b9a.jpg',
}

# These four masks all match the same tall strip family by algorithm but are ambiguous among originals.
# Keep audit-only until Phuc confirms exact original frame per mask.
AMBIGUOUS_MASKS = {
    '8de765bd-e72c-479d-8351-8a72c09dc275.png',
    '9974d54f-fd7d-407f-9fc7-3185a2bdf900.png',
    'a7047505-f46a-428c-845c-68bd24723c6b.png',
    'd7755232-f056-4b8c-8075-18be04fb8f59.png',
    'ef9e5bcb-0fed-4656-b784-a11349a4ae13.png',
}


def read_image(path):
    return Image.open(path).convert('RGBA')


def image_size(path):
    with Image.open(path) as im:
        return im.size


def data_url(path):
    ext = path.suffix.lower()
    mime = 'image/png' if ext == '.png' else 'image/jpeg'
    raw = path.read_bytes()
    return f'data:{mime};base64,' + base64.b64encode(raw).decode('ascii')


def package_id(frame_name, width, height):
    key = f'{frame_name}:{width}x{height}'
    return hashlib.sha1(key.encode('utf-8')).hexdigest()[:16]


def detect_components(mask_path):
    im = read_image(mask_path)
    arr = np.array(im)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    green = (g > 120) & (g > r * 1.25) & (g > b * 1.25) & ((g - r) > 35) & ((g - b) > 35)
    alpha = a < 80
    mask = (green | alpha).astype('uint8') * 255
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    area_total = im.size[0] * im.size[1]
    comps = []
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        if area < area_total * 0.003 or area > area_total * 0.75:
            continue
        if w < 20 or h < 20:
            continue
        comps.append({'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h), 'area': int(area)})
    comps.sort(key=lambda c: (c['y'], c['x']))
    return im.size, comps


def scale_zone(comp, mask_size, frame_size):
    mw, mh = mask_size
    fw, fh = frame_size
    sx, sy = fw / mw, fh / mh
    x = comp['x'] * sx
    y = comp['y'] * sy
    w = comp['width'] * sx
    h = comp['height'] * sy
    # 1px safe inset after scaling to avoid bleeding over decorative rim.
    inset = 1.0
    x += inset
    y += inset
    w = max(1, w - 2 * inset)
    h = max(1, h - 2 * inset)
    points = [
        {'x': round(x, 2), 'y': round(y, 2)},
        {'x': round(x + w, 2), 'y': round(y, 2)},
        {'x': round(x + w, 2), 'y': round(y + h, 2)},
        {'x': round(x, 2), 'y': round(y + h, 2)},
    ]
    return {
        'id': f'pic-slot-{comp["x"]}-{comp["y"]}',
        'x': round(x, 2),
        'y': round(y, 2),
        'width': round(w, 2),
        'height': round(h, 2),
        'points': points,
        'sourceMaskBounds': comp,
        'insetAppliedPx': inset,
    }


def make_payload(mask_path, frame_path, active):
    mask_size, comps = detect_components(mask_path)
    frame_size = image_size(frame_path)
    zones = [scale_zone(c, mask_size, frame_size) for c in comps]
    frame_name = frame_path.name
    fw, fh = frame_size
    frame_type = 'png' if frame_path.suffix.lower() == '.png' else 'jpg'
    slot_map = {
        'schema': SLOT_SCHEMA,
        'frameName': frame_name,
        'frameWidth': fw,
        'frameHeight': fh,
        'frameType': frame_type,
        'slotCount': len(zones),
        'detectionMode': 'manual-pic-mask',
        'chromaSettings': {'color': '#00ff00', 'tolerance': 42, 'softness': 32},
        'zones': zones,
        'sourceMask': str(mask_path.name),
        'mapping': {
            'maskWidth': mask_size[0],
            'maskHeight': mask_size[1],
            'scaleX': fw / mask_size[0],
            'scaleY': fh / mask_size[1],
            'method': 'non-uniform-scale-from-manual-mask-to-original-frame',
        },
        'active': active,
    }
    return {
        'schema': STORE_SCHEMA,
        'frame': {
            'name': frame_name,
            'type': frame_type,
            'width': fw,
            'height': fh,
            'dataUrl': data_url(frame_path),
        },
        'slotMap': slot_map,
        'exportedAt': '2026-05-21T00:00:00.000Z',
        'source': {
            'manualMask': str(mask_path),
            'originalFrame': str(frame_path),
            'activeReason': 'approved mapping' if active else 'audit only / ambiguous mapping',
        },
    }


def render_smoke(payload, out_path):
    frame_data = payload['frame']['dataUrl'].split(',', 1)[1]
    raw = base64.b64decode(frame_data)
    tmp = AUDIT_DIR / '__tmp_frame_image'
    tmp.write_bytes(raw)
    frame = Image.open(tmp).convert('RGBA')
    tmp.unlink(missing_ok=True)
    canvas = Image.new('RGBA', frame.size, (245, 245, 245, 255))
    colors = [(255, 0, 80, 255), (0, 180, 255, 255), (255, 210, 0, 255), (50, 220, 80, 255)]
    for idx, zone in enumerate(payload['slotMap']['zones']):
        poly = [(p['x'], p['y']) for p in zone['points']]
        xs = [p[0] for p in poly]
        ys = [p[1] for p in poly]
        patch = Image.new('RGBA', frame.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(patch)
        d.polygon(poly, fill=colors[idx % len(colors)])
        # add diagonal lines to make placement obvious
        d.line((min(xs), min(ys), max(xs), max(ys)), fill=(255,255,255,220), width=max(2, frame.size[0]//160))
        d.line((max(xs), min(ys), min(xs), max(ys)), fill=(0,0,0,180), width=max(2, frame.size[0]//180))
        canvas.alpha_composite(patch)
    # For opaque/flattened frames in this app, slot rectangles should appear above base frame.
    base = frame.copy()
    base.alpha_composite(canvas)
    # Instead render expected slot overlay on top of frame for audit visibility.
    audit = frame.copy()
    for idx, zone in enumerate(payload['slotMap']['zones']):
        poly = [(p['x'], p['y']) for p in zone['points']]
        overlay = Image.new('RGBA', frame.size, (0,0,0,0))
        ImageDraw.Draw(overlay).polygon(poly, fill=colors[idx % len(colors)])
        audit.alpha_composite(overlay)
    audit.save(out_path)


def validate_payload(payload):
    assert payload['schema'] == STORE_SCHEMA
    sm = payload['slotMap']
    assert sm['frameName'] == payload['frame']['name']
    assert sm['frameWidth'] == payload['frame']['width']
    assert sm['frameHeight'] == payload['frame']['height']
    assert len(sm['zones']) == 4
    fw, fh = sm['frameWidth'], sm['frameHeight']
    assert not sm['frameName'].lower().endswith('.png') or sm['frameName'] in {p.name for p in FRAMES_DIR.glob('*.png')}
    for z in sm['zones']:
        for p in z['points']:
            assert 0 <= p['x'] <= fw
            assert 0 <= p['y'] <= fh
    head = payload['frame']['dataUrl'][:200].lower()
    assert '00ff00' not in head


def main():
    AUDIT_DIR.mkdir(parents=True, exist_ok=True)
    SMOKE_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []
    active_count = 0
    audit_count = 0
    for mask_path in sorted(PIC_DIR.iterdir()):
        if mask_path.suffix.lower() not in {'.png', '.jpg', '.jpeg'}:
            continue
        if mask_path.name in APPROVED_MATCHES:
            frame_path = FRAMES_DIR / APPROVED_MATCHES[mask_path.name]
            active = True
        else:
            # Audit-only: choose a placeholder best known candidate if available from existing manifest, but do not activate.
            candidate = '6904accbb7fb0191874043bb63986b47.jpg' if mask_path.name in AMBIGUOUS_MASKS else None
            if not candidate:
                manifest.append({'mask': mask_path.name, 'status': 'skipped-no-approved-frame'})
                continue
            frame_path = FRAMES_DIR / candidate
            active = False
        payload = make_payload(mask_path, frame_path, active)
        validate_payload(payload)
        readable = AUDIT_DIR / f'{mask_path.stem}__to__{frame_path.stem}.json'
        readable.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
        smoke = SMOKE_DIR / f'{mask_path.stem}__to__{frame_path.stem}.png'
        render_smoke(payload, smoke)
        rec = {
            'mask': mask_path.name,
            'matchedFrame': frame_path.name,
            'active': active,
            'slotCount': len(payload['slotMap']['zones']),
            'frameSize': [payload['frame']['width'], payload['frame']['height']],
            'mapping': payload['slotMap']['mapping'],
            'auditPackage': str(readable.relative_to(ROOT)),
            'renderSmoke': str(smoke.relative_to(ROOT)),
        }
        if active:
            pid = package_id(frame_path.name, payload['frame']['width'], payload['frame']['height'])
            active_path = STORE_DIR / f'{pid}.json'
            active_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
            rec['activePackage'] = str(active_path.relative_to(ROOT))
            rec['packageId'] = pid
            active_count += 1
        else:
            audit_count += 1
        manifest.append(rec)
    MANIFEST_PATH.write_text(json.dumps({'activeCount': active_count, 'auditOnlyCount': audit_count, 'items': manifest}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'activeCount': active_count, 'auditOnlyCount': audit_count, 'manifest': str(MANIFEST_PATH)}, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
