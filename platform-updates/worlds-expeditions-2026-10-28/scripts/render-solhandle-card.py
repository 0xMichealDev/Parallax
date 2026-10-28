#!/usr/bin/env python3
"""Render the SolHandle share card from the actual production planet output.

Run from any directory: python scripts/render-solhandle-card.py
Requires Pillow and NumPy. No network requests or AI-generated replacement art.
The planet PNG contains straight-alpha pixels; composite it rather than dropping
alpha, which would expose bright RGB values in its transparent atmosphere.
"""

from pathlib import Path
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/assets/projects/solhandle-share-v198.png"
SCALE = 2
WIDTH, HEIGHT = 1200, 630


def font(size: int, bold: bool = False, mono: bool = False):
    candidates = (
        ["/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"]
        if mono else
        [f"/usr/share/fonts/opentype/urw-base35/NimbusSans-{'Bold' if bold else 'Regular'}.otf",
         f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'-Bold' if bold else ''}.ttf"]
    )
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size * SCALE)
    raise RuntimeError("Install Nimbus Sans or DejaVu fonts to reproduce the card.")


def pos(value):
    return tuple(round(part * SCALE) for part in value)


def main():
    y, x = np.mgrid[0:HEIGHT * SCALE, 0:WIDTH * SCALE].astype(np.float32)
    x /= SCALE
    y /= SCALE
    pixels = np.zeros((HEIGHT * SCALE, WIDTH * SCALE, 3), dtype=np.float32)
    pixels[:] = (5, 8, 16)
    for cx, cy, rx, ry, color in [
        (820, 290, 410, 370, (3, 17, 28)),
        (1120, 280, 300, 420, (20, 9, 34)),
        (120, 555, 510, 190, (1, 7, 12)),
    ]:
        glow = np.exp(-(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2) * 2)
        pixels += glow[..., None] * np.array(color, dtype=np.float32)
    card = Image.fromarray(np.clip(pixels, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    draw = ImageDraw.Draw(card)
    rng = random.Random(198)
    for _ in range(52):
        sx, sy = rng.uniform(515, 1160), rng.uniform(35, 512)
        radius = rng.choice([.45, .55, .7, .9])
        value = rng.randint(45, 88)
        draw.ellipse(pos((sx - radius, sy - radius, sx + radius, sy + radius)),
                     fill=(value, value + 12, value + 24, 255))

    # Full-resolution shader image, with its original alpha preserved.
    planet = Image.open(ROOT / "public/assets/projects/solhandle-planet-v198.png").convert("RGBA")
    planet = planet.resize(pos((770, 770)), Image.Resampling.LANCZOS)
    card.alpha_composite(planet, dest=pos((502, -66)))

    draw = ImageDraw.Draw(card)
    cyan, violet, white, muted = "#5cdff7", "#b894f9", "#eef4ff", "#9daec7"
    emblem = Image.open(ROOT / "public/assets/globe/solhandle-emblem-v198.png").convert("RGBA")
    emblem = emblem.resize(pos((40, 40)), Image.Resampling.LANCZOS)
    mask = Image.new("L", emblem.size)
    ImageDraw.Draw(mask).ellipse((0, 0, emblem.width - 1, emblem.height - 1), fill=255)
    emblem.putalpha(mask)
    card.alpha_composite(emblem, dest=pos((63, 43)))
    draw.text(pos((116, 48)), "SolHandle", font=font(25, bold=True), fill=white)
    draw.text(pos((65, 119)), "IDENTITY ON SOLANA", font=font(12, mono=True), fill=cyan)
    draw.text(pos((61, 168)), "Your identity.", font=font(63), fill=white)

    # Exact brand tagline with a controlled, legible cyan-to-violet wordmark.
    text_mask = Image.new("L", card.size)
    ImageDraw.Draw(text_mask).text(pos((60, 237)), "Yours.", font=font(78, bold=True), fill=255)
    word_gradient = Image.new("RGBA", card.size, (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(word_gradient)
    for col in range(60 * SCALE, 325 * SCALE):
        t = min(1.0, max(0.0, (col / SCALE - 60) / 245))
        color = tuple(round(a * (1 - t) + b * t) for a, b in zip((92, 223, 247), (184, 148, 249)))
        gdraw.line((col, 230 * SCALE, col, 335 * SCALE), fill=(*color, 255))
    card.paste(word_gradient, (0, 0), text_mask)
    draw = ImageDraw.Draw(card)
    draw.text(pos((65, 351)), "A readable name for your", font=font(22), fill=muted)
    draw.text(pos((65, 383)), "Solana wallet.", font=font(22), fill=muted)
    draw.text(pos((65, 453)), "@handle", font=font(15, mono=True), fill=cyan)
    draw.line(pos((155, 454, 155, 471)), fill="#26344b", width=SCALE)
    draw.text(pos((174, 453)), "Owned by you", font=font(16), fill="#c9d6ea")
    draw.line(pos((288, 454, 288, 471)), fill="#26344b", width=SCALE)
    draw.text(pos((307, 453)), "Built for Solana", font=font(16), fill="#c9d6ea")

    # Attribution and destination remain readable in an X large-image preview.
    draw.line(pos((64, 536, 1136, 536)), fill="#233047", width=SCALE)
    draw.text(pos((65, 557)), "A PLANET IN PARALLAX", font=font(11, mono=True), fill="#8da1bb")
    draw.text(pos((65, 578)), "Explore the Identity World", font=font(23), fill=white)
    draw.text(pos((1135, 567)), "parallaxlaunch.live", font=font(17), fill="#b5c5dc", anchor="ra")
    draw.text(pos((1135, 594)), "SOLHANDLE  /  CREATOR WORLD", font=font(10, mono=True), fill="#7087a4", anchor="ra")

    card = card.convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    card.save(OUT, "PNG", optimize=True)
    print(f"Created {OUT.relative_to(ROOT)} ({WIDTH} × {HEIGHT})")


if __name__ == "__main__":
    main()
