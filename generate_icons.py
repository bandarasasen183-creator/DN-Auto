from PIL import Image, ImageDraw

def make_rounded_icon(source_path, output_path, size, bg_fill=(255, 255, 255), radius_ratio=0.22, padding_ratio=0.15, canvas_bg=None):
    # Canvas
    w, h = size
    if canvas_bg:
        canvas = Image.new("RGBA", size, canvas_bg)
    else:
        canvas = Image.new("RGBA", size, (0, 0, 0, 0))
        
    draw = ImageDraw.Draw(canvas)
    radius = int(w * radius_ratio)
    
    # Draw white rounded card if transparent canvas
    if not canvas_bg or canvas_bg != (255, 255, 255):
        # Inset slightly for anti-aliasing
        draw.rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=bg_fill)
        
    src = Image.open(source_path).convert("RGBA")
    
    # Calculate target inner size
    inner_pad = int(w * padding_ratio)
    target_w = w - (inner_pad * 2)
    target_h = h - (inner_pad * 2)
    
    src_ratio = src.width / src.height
    target_ratio = target_w / target_h
    
    if src_ratio > target_ratio:
        new_w = target_w
        new_h = int(new_w / src_ratio)
    else:
        new_h = target_h
        new_w = int(new_h * src_ratio)
        
    resized = src.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    offset_x = (w - new_w) // 2
    offset_y = (h - new_h) // 2
    
    canvas.paste(resized, (offset_x, offset_y), resized)
    
    if canvas_bg and canvas_bg[3] == 255:
        canvas = canvas.convert("RGB")
        
    canvas.save(output_path, "PNG")

# 1. Main standard icons with smooth rounded corners & crisp white card
make_rounded_icon("public/logo-small.png", "public/icon-512.png", (512, 512), radius_ratio=0.22, padding_ratio=0.14)
make_rounded_icon("public/logo-small.png", "public/icon-192.png", (192, 192), radius_ratio=0.22, padding_ratio=0.14)

# 2. Apple touch icon with smooth rounded white card
make_rounded_icon("public/logo-small.png", "public/apple-touch-icon.png", (180, 180), radius_ratio=0.22, padding_ratio=0.14, canvas_bg=(255, 255, 255, 255))

# 3. Maskable icon with safe zone (Android adapts to any launcher shape)
make_rounded_icon("public/logo-small.png", "public/icon-maskable-512.png", (512, 512), radius_ratio=0.22, padding_ratio=0.22, canvas_bg=(11, 14, 19, 255))

print("Premium rounded icons generated successfully!")
