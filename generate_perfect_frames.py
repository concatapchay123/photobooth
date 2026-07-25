import os
import math
import urllib.request
from PIL import Image, ImageDraw, ImageFont

font_path = "fredoka.ttf"

# 1. Download Nunito Bold font if missing
if not os.path.exists(font_path):
    print("Downloading Nunito Bold font...")
    try:
        urllib.request.urlretrieve(
            "https://github.com/ehrishirajsharma/SwiftnessX/raw/master/app/assets/fonts/nunito-bold.ttf",
            font_path
        )
    except Exception as e:
        print("Failed to download font:", e)

# Setup font loader at 2x sizes (for 2x canvas of 600x1740px)
def get_fonts():
    if os.path.exists(font_path):
        try:
            return (
                ImageFont.truetype(font_path, 42), # Large text
                ImageFont.truetype(font_path, 28), # Medium
                ImageFont.truetype(font_path, 20)  # Small / Subtitles
            )
        except Exception as e:
            print("Error loading custom font, falling back:", e)
    
    # Fallback to system fonts
    for name in ["arial.ttf", "comic.ttf", "tahoma.ttf"]:
        try:
            return (
                ImageFont.truetype(name, 42),
                ImageFont.truetype(name, 28),
                ImageFont.truetype(name, 20)
            )
        except:
            continue
    return (ImageFont.load_default(), ImageFont.load_default(), ImageFont.load_default())

font_large, font_medium, font_small = get_fonts()

# 2. Setup Drawing Helpers
def create_gradient_bg(width, height, color1, color2, direction="vertical"):
    """Creates a smooth color gradient using a low-res image scaled up with bilinear filtering."""
    if direction == "vertical":
        im = Image.new("RGB", (1, 100))
        d = ImageDraw.Draw(im)
        for y in range(100):
            r = int(color1[0] + (color2[0] - color1[0]) * (y / 99.0))
            g = int(color1[1] + (color2[1] - color1[1]) * (y / 99.0))
            b = int(color1[2] + (color2[2] - color1[2]) * (y / 99.0))
            d.point((0, y), fill=(r, g, b))
    elif direction == "diagonal":
        im = Image.new("RGB", (10, 10))
        d = ImageDraw.Draw(im)
        for y in range(10):
            for x in range(10):
                factor = (x + y) / 18.0
                r = int(color1[0] + (color2[0] - color1[0]) * factor)
                g = int(color1[1] + (color2[1] - color1[1]) * factor)
                b = int(color1[2] + (color2[2] - color1[2]) * factor)
                d.point((x, y), fill=(r, g, b))
    else:  # horizontal
        im = Image.new("RGB", (100, 1))
        d = ImageDraw.Draw(im)
        for x in range(100):
            r = int(color1[0] + (color2[0] - color1[0]) * (x / 99.0))
            g = int(color1[1] + (color2[1] - color1[1]) * (x / 99.0))
            b = int(color1[2] + (color2[2] - color1[2]) * (x / 99.0))
            d.point((x, 0), fill=(r, g, b))
    
    return im.resize((width, height), Image.Resampling.BILINEAR)

def draw_checkerboard(draw, width, height, size, color1, color2):
    for y in range(0, height, size):
        for x in range(0, width, size):
            color = color1 if ((x // size) + (y // size)) % 2 == 0 else color2
            draw.rectangle([x, y, x + size, y + size], fill=color)

def draw_sparkle(draw, cx, cy, r, color):
    pts = [
        (cx, cy - r),
        (cx + r * 0.25, cy - r * 0.25),
        (cx + r, cy),
        (cx + r * 0.25, cy + r * 0.25),
        (cx, cy + r),
        (cx - r * 0.25, cy + r * 0.25),
        (cx - r, cy),
        (cx - r * 0.25, cy - r * 0.25)
    ]
    draw.polygon(pts, fill=color)

def draw_heart(draw, cx, cy, r, color):
    c1x, c1y = cx - r * 0.4, cy - r * 0.2
    c2x, c2y = cx + r * 0.4, cy - r * 0.2
    draw.ellipse([c1x - r * 0.6, c1y - r * 0.6, c1x + r * 0.6, c1y + r * 0.6], fill=color)
    draw.ellipse([c2x - r * 0.6, c2y - r * 0.6, c2x + r * 0.6, c2y + r * 0.6], fill=color)
    poly_pts = [
        (cx - r * 0.95, cy - r * 0.1),
        (cx, cy + r * 0.9),
        (cx + r * 0.95, cy - r * 0.1)
    ]
    draw.polygon(poly_pts, fill=color)

def draw_daisy(draw, cx, cy, r, petal_color, center_color, draw_face=False):
    num_petals = 8
    # Petals
    for i in range(num_petals):
        angle = i * (2 * math.pi / num_petals)
        px = cx + math.cos(angle) * r * 0.65
        py = cy + math.sin(angle) * r * 0.65
        # Black outline
        draw.ellipse([px - r * 0.4, py - r * 0.4, px + r * 0.4, py + r * 0.4], fill=(0,0,0))
        draw.ellipse([px - r * 0.35, py - r * 0.35, px + r * 0.35, py + r * 0.35], fill=petal_color)
    
    # Center
    draw.ellipse([cx - r * 0.45, cy - r * 0.45, cx + r * 0.45, cy + r * 0.45], fill=(0,0,0))
    draw.ellipse([cx - r * 0.4, cy - r * 0.4, cx + r * 0.4, cy + r * 0.4], fill=center_color)
    if draw_face:
        cr = r * 0.4
        draw.ellipse([cx - cr*0.35, cy - cr*0.2, cx - cr*0.15, cy], fill=(0,0,0))
        draw.ellipse([cx + cr*0.15, cy - cr*0.2, cx + cr*0.35, cy], fill=(0,0,0))
        draw.arc([cx - cr*0.3, cy - cr*0.1, cx + cr*0.3, cy + cr*0.3], 0, 180, fill=(0,0,0), width=2)

def draw_cloud(draw, cx, cy, r, color, draw_face=False):
    # Soft cloud shape made of circles
    circles = [
        (cx - r*0.7, cy + r*0.1, r*0.5),
        (cx + r*0.7, cy + r*0.1, r*0.5),
        (cx - r*0.3, cy - r*0.2, r*0.65),
        (cx + r*0.3, cy - r*0.2, r*0.65),
        (cx, cy + r*0.1, r*0.6)
    ]
    # Draw shadows first
    for x, y, cr in circles:
        draw.ellipse([x - cr - 4, y - cr + 4, x + cr - 4, y + cr + 4], fill=(0, 0, 0, 20))
    # Draw cloud body
    for x, y, cr in circles:
        draw.ellipse([x - cr, y - cr, x + cr, y + cr], fill=color)
    
    if draw_face:
        # Sleepy closed eyes
        draw.arc([cx - r*0.35, cy - r*0.1, cx - r*0.15, cy + r*0.1], 0, 180, fill=(40,40,40), width=2)
        draw.arc([cx + r*0.15, cy - r*0.1, cx + r*0.35, cy + r*0.1], 0, 180, fill=(40,40,40), width=2)
        # Blush
        draw.ellipse([cx - r*0.5, cy + r*0.1, cx - r*0.35, cy + r*0.2], fill=(255, 180, 180))
        draw.ellipse([cx + r*0.35, cy + r*0.1, cx + r*0.5, cy + r*0.2], fill=(255, 180, 180))

def draw_smiley(draw, cx, cy, r, bg_color, face_color):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(0,0,0))
    draw.ellipse([cx - r*0.9, cy - r*0.9, cx + r*0.9, cy + r*0.9], fill=bg_color)
    draw.ellipse([cx - r * 0.35 - 3, cy - r * 0.25 - 3, cx - r * 0.35 + 3, cy - r * 0.25 + 3], fill=face_color)
    draw.ellipse([cx + r * 0.35 - 3, cy - r * 0.25 - 3, cx + r * 0.35 + 3, cy - r * 0.25 + 3], fill=face_color)
    draw.arc([cx - r * 0.4, cy - r * 0.1, cx + r * 0.4, cy + r * 0.4], 0, 180, fill=face_color, width=4)

def draw_kawaii_bear(draw, cx, cy, r):
    # Ears
    draw.ellipse([cx - r*0.75, cy - r*0.75, cx - r*0.25, cy - r*0.25], fill=(0,0,0))
    draw.ellipse([cx - r*0.7, cy - r*0.7, cx - r*0.3, cy - r*0.3], fill=(180, 130, 95))
    draw.ellipse([cx - r*0.55, cy - r*0.55, cx - r*0.45, cy - r*0.45], fill=(255, 192, 203))
    
    draw.ellipse([cx + r*0.25, cy - r*0.75, cx + r*0.75, cy - r*0.25], fill=(0,0,0))
    draw.ellipse([cx + r*0.3, cy - r*0.7, cx + r*0.7, cy - r*0.3], fill=(180, 130, 95))
    draw.ellipse([cx + r*0.45, cy - r*0.55, cx + r*0.55, cy - r*0.45], fill=(255, 192, 203))
    
    # Head
    draw.ellipse([cx - r, cy - r*0.6, cx + r, cy + r], fill=(0,0,0))
    draw.ellipse([cx - r*0.95, cy - r*0.55, cx + r*0.95, cy + r*0.95], fill=(180, 130, 95))
    
    # Snout
    draw.ellipse([cx - r*0.35, cy + r*0.1, cx + r*0.35, cy + r*0.6], fill=(255, 255, 255))
    
    # Eyes
    draw.ellipse([cx - r*0.35 - 3, cy - r*0.1 - 3, cx - r*0.35 + 3, cy - r*0.1 + 3], fill=(0, 0, 0))
    draw.ellipse([cx + r*0.35 - 3, cy - r*0.1 - 3, cx + r*0.35 + 3, cy - r*0.1 + 3], fill=(0, 0, 0))
    
    # Nose & Mouth
    draw.ellipse([cx - 4, cy + r*0.2, cx + 4, cy + r*0.2 + 6], fill=(0,0,0))
    draw.arc([cx - 8, cy + r*0.3, cx, cy + r*0.45], 0, 180, fill=(0,0,0), width=2)
    draw.arc([cx, cy + r*0.3, cx + 8, cy + r*0.45], 0, 180, fill=(0,0,0), width=2)
    
    # Blush
    draw.ellipse([cx - r*0.7, cy + r*0.1, cx - r*0.5, cy + r*0.2], fill=(255, 170, 170))
    draw.ellipse([cx + r*0.5, cy + r*0.1, cx + r*0.7, cy + r*0.2], fill=(255, 170, 170))

# 3. Base Supersampled Frame Builder
def build_frame_supersampled(bg_image_loader_or_generator, filename, text_label, sub_label, theme_color, text_color=(0,0,0)):
    w2, h2 = 600, 1740
    
    # Load background or generate one
    if isinstance(bg_image_loader_or_generator, str):
        # It's a path to a pattern image
        if os.path.exists(bg_image_loader_or_generator):
            print(f"Loading background pattern: {bg_image_loader_or_generator}")
            bg_pattern = Image.open(bg_image_loader_or_generator).convert("RGBA")
            # Aspect ratio crop of middle section
            pw, ph = bg_pattern.size
            target_w = int(ph * (w2 / h2))
            if target_w <= pw:
                # Crop horizontally
                x_offset = (pw - target_w) // 2
                crop_box = (x_offset, 0, x_offset + target_w, ph)
            else:
                # Crop vertically
                target_h = int(pw * (h2 / w2))
                y_offset = (ph - target_h) // 2
                crop_box = (0, y_offset, pw, y_offset + target_h)
            
            bg_cropped = bg_pattern.crop(crop_box)
            strip2 = bg_cropped.resize((w2, h2), Image.Resampling.LANCZOS)
        else:
            print(f"Warning: pattern path not found: {bg_image_loader_or_generator}. Falling back to default gradient.")
            strip2 = create_gradient_bg(w2, h2, (255, 180, 200), (200, 220, 255), "diagonal")
    else:
        # It's a callback generator function
        strip2 = bg_image_loader_or_generator(w2, h2)
        
    draw2 = ImageDraw.Draw(strip2, "RGBA")
    
    # 4. Draw Slots at 2x resolution (Width 540, height 340)
    # Stacked vertically at y = [60, 440, 820, 1200]
    # Center of 600px wide strip is 300.
    y_coords2 = [60, 440, 820, 1200]
    slot_w2, slot_h2 = 540, 340
    x1, x2 = 300 - slot_w2 // 2, 300 + slot_w2 // 2
    
    for y in y_coords2:
        # Translucent black drop shadow behind each white card
        draw2.rounded_rectangle([x1 - 10 + 6, y - 10 + 6, x2 + 10 + 6, y + slot_h2 + 10 + 6], radius=16, fill=(0, 0, 0, 45))
        # White card backing frame (gives a 10px border at 2x = 5px at 1x)
        draw2.rounded_rectangle([x1 - 10, y - 10, x2 + 10, y + slot_h2 + 10], radius=16, fill=(255, 255, 255, 255))
        # Solid Green detection slot
        draw2.rectangle([x1, y, x2, y + slot_h2], fill=(0, 255, 0, 255))
        
    # 5. Draw Beautiful Branding Badge Card at the bottom (y = 1575 to 1715)
    # Badge shadow
    draw2.rounded_rectangle([30 + 6, 1575 + 6, 570 + 6, 1715 + 6], radius=24, fill=(0, 0, 0, 40))
    # Badge body (pure white)
    draw2.rounded_rectangle([30, 1575, 570, 1715], radius=24, fill=(255, 255, 255, 255))
    
    # Draw branding text centered in the badge
    # Title
    t_bbox = draw2.textbbox((0,0), text_label, font=font_large)
    tw = t_bbox[2] - t_bbox[0]
    tx = 300 - tw // 2
    draw2.text((tx, 1585), text_label, font=font_large, fill=theme_color)
    
    # Subtitle
    s_bbox = draw2.textbbox((0,0), sub_label, font=font_small)
    sw = s_bbox[2] - s_bbox[0]
    sx = 300 - sw // 2
    draw2.text((sx, 1655), sub_label, font=font_small, fill=(100, 100, 100))
    
    # 6. Downsample the strip from 600x1740 to 300x870 using LANCZOS filter
    # This provides beautiful supersampled anti-aliased (SSAA) graphics!
    strip1 = strip2.resize((300, 870), Image.Resampling.LANCZOS)
    
    # 7. Paste the 300x870 strip centered onto a standard 620x870 white canvas
    canvas = Image.new("RGB", (620, 870), (255, 255, 255))
    canvas.paste(strip1, (160, 0)) # Centered (at x=160, so 160 + 300 = 460. Center is 310)
    
    # 8. Save Image
    out_dir = "frames/source"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, filename)
    canvas.save(out_path, "PNG")
    print(f"Saved SSAA strip frame: {out_path}")

# ==========================================================
# PROCEDURAL BACKGROUND GENERATORS (FALLBACKS & SPECIFICS)
# ==========================================================

# --- Frame 7: Outer Space Trip (Procedural) ---
def make_space_bg(w, h):
    # Deep purple-navy gradient
    bg = create_gradient_bg(w, h, (10, 8, 30), (28, 20, 56), "vertical")
    draw = ImageDraw.Draw(bg, "RGBA")
    
    # Draw tiny stars
    import random
    random.seed(42) # Deterministic
    for _ in range(80):
        x = random.randint(10, w - 10)
        y = random.randint(10, h - 10)
        # Skip slot areas slightly
        if 20 < x < w - 20:
            # Check if inside slots
            is_slot = False
            for sy in [60, 440, 820, 1200]:
                if sy - 10 < y < sy + 350:
                    is_slot = True
            if is_slot:
                continue
        r = random.choice([1, 2, 3])
        opacity = random.randint(120, 255)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=(255, 255, 255, opacity))
        
    # Draw a cute Saturn planet sticker
    cx, cy = 520, 780
    # Saturn Ring shadow/body
    draw.ellipse([cx-40, cy-12, cx+40, cy+12], fill=(255, 215, 120, 180)) # Ring back
    draw.ellipse([cx-25, cy-25, cx+25, cy+25], fill=(255, 140, 60), outline=(0,0,0), width=3) # Planet body
    draw.arc([cx-40, cy-12, cx+40, cy+12], 0, 180, fill=(255, 215, 120), width=6) # Ring front
    draw.arc([cx-40, cy-12, cx+40, cy+12], 0, 180, fill=(0,0,0), width=10) # Ring outline
    draw.arc([cx-40, cy-12, cx+40, cy+12], 0, 180, fill=(255, 215, 120), width=6) # Ring front overlay
    
    # Cozy crescent moon
    mx, my = 70, 220
    draw.ellipse([mx-20, my-20, mx+20, my+20], fill=(255, 240, 150))
    draw.ellipse([mx-10, my-25, mx+30, my+15], fill=(10, 8, 30)) # Cut out background color
    
    # Astro Bear sticker at bottom left
    draw_kawaii_bear(draw, 80, 1480, 32)
    # Draw simple glass space helmet outline
    draw.ellipse([80 - 45, 1480 - 40, 80 + 45, 1480 + 45], outline=(255, 255, 255, 220), width=3)
    draw.arc([80 - 35, 1480 - 30, 80 + 35, 1480 + 30], 200, 340, fill=(255, 255, 255, 120), width=2)
    
    # Sparkles
    draw_sparkle(draw, 520, 200, 12, (255, 255, 180))
    draw_sparkle(draw, 80, 780, 14, (255, 255, 180))
    
    return bg

# --- Frame 8: Comic Pop (Procedural) ---
def make_comic_bg(w, h):
    bg = Image.new("RGB", (w, h), (255, 255, 255))
    draw = ImageDraw.Draw(bg, "RGBA")
    
    # Yellow left side, Cyan right side split diagonally
    draw.polygon([(0, 0), (w, 0), (w, h), (0, h)], fill=(255, 225, 40)) # Yellow
    # Draw diagonal cyan stripe
    draw.polygon([(w//2 - 50, 0), (w, 0), (w, h), (w//2 + 50, h)], fill=(40, 170, 255))
    
    # Halftone dots in background
    for y in range(30, h, 60):
        for x in range(30, w, 60):
            # Skip slot locations
            is_slot = False
            for sy in [60, 440, 820, 1200]:
                if sy - 10 < y < sy + 350:
                    is_slot = True
            if is_slot:
                continue
            draw.ellipse([x-4, y-4, x+4, y+4], fill=(0, 0, 0, 40))
            
    # Draw comic action starburst bubbles
    # WOW! at top right
    def draw_starburst(d, cx, cy, text, bg_col):
        pts = []
        num_points = 12
        for i in range(num_points):
            angle = i * (2 * math.pi / num_points)
            r = 60 if i % 2 == 0 else 35
            pts.append((cx + math.cos(angle)*r, cy + math.sin(angle)*r))
        d.polygon(pts, fill=(0,0,0,50)) # shadow
        pts_body = [(x-3, y-3) for x, y in pts]
        d.polygon(pts_body, fill=bg_col, outline=(0,0,0), width=4)
        
    draw_starburst(draw, 520, 220, "WOW", (255, 80, 80))
    draw_starburst(draw, 80, 780, "POP", (180, 80, 255))
    draw_starburst(draw, 520, 1450, "BAM", (255, 150, 20))
    
    # Lightning bolts
    def draw_bolt(d, cx, cy):
        pts = [(cx-5, cy-15), (cx+8, cy-3), (cx+2, cy-1), (cx+10, cy+15), (cx-2, cy+1), (cx-8, cy+1)]
        d.polygon(pts, fill=(255, 255, 0), outline=(0,0,0), width=3)
    
    draw_bolt(draw, 80, 220)
    draw_bolt(draw, 520, 780)
    
    return bg

# --- Frame 9: Dreamy Clouds (Procedural) ---
def make_dreamy_bg(w, h):
    # Lilac pink vertical gradient
    bg = create_gradient_bg(w, h, (186, 172, 237), (243, 198, 238), "vertical")
    draw = ImageDraw.Draw(bg, "RGBA")
    
    # Clouds with sleeping faces
    draw_cloud(draw, 90, 220, 32, (255, 255, 255, 240), draw_face=True)
    draw_cloud(draw, 510, 780, 32, (255, 255, 255, 240), draw_face=True)
    draw_cloud(draw, 90, 1460, 32, (255, 255, 255, 240), draw_face=True)
    
    # Sleeping crescent moon
    cx, cy = 520, 220
    draw.ellipse([cx-20, cy-20, cx+20, cy+20], fill=(255, 240, 140))
    draw.ellipse([cx-12, cy-25, cx+28, cy+15], fill=(186, 172, 237)) # subtract background color
    
    # Twinkling stars
    draw_sparkle(draw, 520, 1460, 12, (255, 255, 170))
    draw_sparkle(draw, 80, 780, 10, (255, 255, 170))
    
    return bg

# --- Frame 10: Daisy Cafe (Procedural) ---
def make_daisy_bg(w, h):
    bg = Image.new("RGB", (w, h), (255, 255, 255))
    draw = ImageDraw.Draw(bg, "RGBA")
    
    # Mint checkerboard
    draw_checkerboard(draw, w, h, 60, (220, 245, 235), (255, 252, 245))
    
    # Draw daisy stickers on checkerboard
    draw_daisy(draw, 80, 220, 24, (255, 255, 255), (255, 210, 0), draw_face=True)
    draw_daisy(draw, 520, 780, 26, (255, 255, 255), (255, 210, 0), draw_face=True)
    draw_daisy(draw, 80, 1460, 24, (255, 255, 255), (255, 210, 0), draw_face=True)
    
    # Cute pink coffee cup sticker
    cx, cy = 520, 1460
    # shadow
    draw.rectangle([cx-20+3, cy-12+3, cx+20+3, cy+22+3], fill=(0,0,0,30))
    # handle
    draw.arc([cx+8, cy-4, cx+26, cy+14], 270, 90, fill=(0,0,0), width=8)
    draw.arc([cx+8, cy-4, cx+26, cy+14], 270, 90, fill=(255, 160, 180), width=4)
    # cup
    draw.rectangle([cx-20, cy-12, cx+20, cy+22], fill=(255, 160, 180), outline=(0,0,0), width=3)
    # smile
    draw.ellipse([cx-10, cy, cx-7, cy+3], fill=(0,0,0))
    draw.ellipse([cx+7, cy, cx+10, cy+3], fill=(0,0,0))
    draw.arc([cx-4, cy+3, cx+4, cy+9], 0, 180, fill=(0,0,0), width=2)
    # steam
    draw_heart(draw, cx, cy-25, 8, (140, 90, 220))
    
    # Smiley
    draw_smiley(draw, 520, 220, 18, (255, 230, 100), (140, 90, 220))
    draw_smiley(draw, 80, 780, 18, (255, 180, 180), (80, 140, 100))
    
    return bg


# ==========================================================
# RUN THE GENERATOR FOR THE 10 NEW THEMES
# ==========================================================

print("Starting generation of 10 premium detailed frames...")

# --- Theme 1: Candy Pop (AI pattern) ---
build_frame_supersampled(
    "frames/source/patterns/bg_candy.png",
    "cute_frame_01_candy.png",
    "CANDY POP!",
    "✦ sweet candy club ✦",
    theme_color=(255, 102, 178)
)

# --- Theme 2: Neon Retro (AI pattern) ---
build_frame_supersampled(
    "frames/source/patterns/bg_neon.png",
    "cute_frame_02_neon.png",
    "NEON RETRO",
    "level up! 🎮 gamer booth",
    theme_color=(0, 210, 255)
)

# --- Theme 3: Summer Sunshine (AI pattern) ---
build_frame_supersampled(
    "frames/source/patterns/bg_summer.png",
    "cute_frame_03_summer.png",
    "SUMMER DAY",
    "☀ hello summer sunshine ☀",
    theme_color=(255, 102, 0)
)

# --- Theme 4: Dino Garden (AI pattern) ---
build_frame_supersampled(
    "frames/source/patterns/bg_dino.png",
    "cute_frame_04_dino.png",
    "CUTE DINO",
    "✿ grow happy things ✿",
    theme_color=(255, 80, 130)
)

# --- Theme 5: Y2K Metallic (AI pattern) ---
build_frame_supersampled(
    "frames/source/patterns/bg_y2k.png",
    "cute_frame_05_y2k.png",
    "Y2K STARS",
    "⚡ cyber angel vintage ⚡",
    theme_color=(150, 80, 220)
)

# --- Theme 6: Cherry Love (AI pattern) ---
build_frame_supersampled(
    "frames/source/patterns/bg_cherry.png",
    "cute_frame_06_cherry.png",
    "CHERRY LOVE",
    "♥ very sweet bunny club ♥",
    theme_color=(255, 51, 102)
)

# --- Theme 7: Space Trip (Procedural) ---
build_frame_supersampled(
    make_space_bg,
    "cute_frame_07_space.png",
    "SPACE TRIP",
    "🚀 to the stars and back 🚀",
    theme_color=(255, 215, 0)
)

# --- Theme 8: Comic Pop (Procedural) ---
build_frame_supersampled(
    make_comic_bg,
    "cute_frame_08_comic.png",
    "BOOM! POP",
    "★ epic pop art collection ★",
    theme_color=(0, 0, 0)
)

# --- Theme 9: Dreamy Clouds (Procedural) ---
build_frame_supersampled(
    make_dreamy_bg,
    "cute_frame_09_dreamy.png",
    "DREAMY NIGHT",
    "☁ sweet dream cloud club ☁",
    theme_color=(140, 110, 220)
)

# --- Theme 10: Daisy Cafe (Procedural) ---
build_frame_supersampled(
    make_daisy_bg,
    "cute_frame_10_grid.png",
    "SMILE DAY",
    "☕ coffee, smiles & daisies ☕",
    theme_color=(140, 90, 220)
)

print("Finished generating all 10 premium detailed frames!")
