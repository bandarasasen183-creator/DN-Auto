from PIL import Image

def make_icon(source_path, output_path, size, bg_color=None, padding=20):
    src = Image.open(source_path).convert("RGBA")
    
    # Calculate aspect ratio
    src_ratio = src.width / src.height
    
    # Calculate target size with padding
    target_w = size[0] - (padding * 2)
    target_h = size[1] - (padding * 2)
    target_ratio = target_w / target_h
    
    if src_ratio > target_ratio:
        # Fit by width
        new_w = target_w
        new_h = int(new_w / src_ratio)
    else:
        # Fit by height
        new_h = target_h
        new_w = int(new_h * src_ratio)
        
    resized = src.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Create canvas
    if bg_color:
        canvas = Image.new("RGBA", size, bg_color)
    else:
        canvas = Image.new("RGBA", size, (0, 0, 0, 0))
        
    # Paste centered
    offset_x = (size[0] - new_w) // 2
    offset_y = (size[1] - new_h) // 2
    
    if bg_color:
        canvas.paste(resized, (offset_x, offset_y), resized)
        # Convert to RGB if it has a solid background
        canvas = canvas.convert("RGB")
    else:
        canvas.paste(resized, (offset_x, offset_y))
        
    canvas.save(output_path, "PNG")

# Generate transparent icons
make_icon("public/logo-small.png", "public/icon-512.png", (512, 512), padding=40)
make_icon("public/logo-small.png", "public/icon-192.png", (192, 192), padding=15)

# Generate solid background icons (Apple touch and Maskable)
make_icon("public/logo-small.png", "public/icon-maskable-512.png", (512, 512), bg_color=(255, 255, 255), padding=60)
make_icon("public/logo-small.png", "public/apple-touch-icon.png", (180, 180), bg_color=(255, 255, 255), padding=20)

print("Icons generated!")
