"""Render reproducible 1200x630 project share cards from Parallax's own worlds.

Run from the repository root with Python 3 and Pillow. The input planets are
production-shader renders; this layout adds exact, accessible social-card copy.
"""
import argparse
import json
import math
from pathlib import Path
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
FONTS = Path('/usr/share/fonts/truetype/dejavu')
SIZE = (1200, 630)


def catalog():
    """Keep creator IDs intact in the app while exposing a stable export job name."""
    worlds = json.loads((ROOT / 'public/ecosystem-worlds.json').read_text())
    worlds.append(json.loads((ROOT / 'public/gatto-world.json').read_text()))
    solhandle = json.loads((ROOT / 'public/solhandle-world.json').read_text())
    worlds.append({**solhandle, 'id': 'solhandle', 'accent': solhandle['style']['accent'],
                   'sharePath': '/world/' + solhandle['id'], 'showcase': 'creator-world'})
    return worlds


def heading(world):
    return '$' + world['ticker'] if world.get('ticker') else world['name'].upper()


def path(world):
    return world.get('sharePath', '/projects/' + world['id'])


def font(size, bold=False, mono=False):
    name = 'DejaVuSansMono.ttf' if mono else 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'
    return ImageFont.truetype(str(FONTS / name), size)


def color(value):
    return tuple(int(value[i:i+2], 16) for i in (1, 3, 5))


def render_icon(world):
    """Frame the character tightly in small navigation images, retaining safe padding."""
    if not world.get('icon'):
        return
    planet = Image.open(ROOT / 'public' / world['image'].lstrip('/')).convert('RGBA')
    visible = planet.getchannel('A').point(lambda alpha: 255 if alpha >= 6 else 0)
    bounds = visible.getbbox()
    if not bounds:
        raise ValueError('Empty planet icon: ' + world['id'])
    planet = planet.crop(bounds)
    side = max(planet.size)
    padding = max(12, round(side * .075))
    framed = Image.new('RGBA', (side + padding * 2, side + padding * 2))
    framed.alpha_composite(planet, ((framed.width-planet.width)//2, (framed.height-planet.height)//2))
    framed = framed.resize((256, 256), Image.Resampling.LANCZOS)
    destination = ROOT / 'public' / world['icon'].lstrip('/')
    destination.parent.mkdir(parents=True, exist_ok=True)
    framed.save(destination, lossless=True, method=6)
    print(f'{world["id"]} icon: {destination.relative_to(ROOT)} ({destination.stat().st_size} bytes)')


def render(world):
    accent = color(world['accent'])
    image = Image.new('RGB', SIZE)
    pixels = image.load()
    for y in range(SIZE[1]):
        for x in range(SIZE[0]):
            glow = math.exp(-((x-900)**2 / 190000 + (y-300)**2 / 170000)) * .085
            pixels[x, y] = (int(5+accent[0]*glow), int(10+accent[1]*glow), int(17+accent[2]*glow))
    image = image.convert('RGBA')
    draw = ImageDraw.Draw(image)
    rng = random.Random(world['id'])
    for _ in range(78):
        x, y = rng.randrange(565, 1180), rng.randrange(75, 530)
        brightness = rng.randrange(45, 105)
        draw.ellipse((x, y, x+1, y+1), fill=(brightness, brightness+8, brightness+15))
    draw.line((58, 96, 1142, 96), fill=(34, 48, 63), width=1)
    draw.line((58, 549, 1142, 549), fill=(34, 48, 63), width=1)
    draw.ellipse((59, 46, 82, 69), outline=(186, 204, 219), width=1)
    draw.ellipse((52, 52, 89, 62), outline=(186, 204, 219), width=1)
    draw.text((105, 43), 'PARALLAX', font=font(22), fill=(224, 234, 244))
    draw.text((865, 47), 'THE ONCHAIN OBSERVATORY', font=font(13, mono=True), fill=(131, 155, 175))

    planet = Image.open(ROOT / 'public' / world['image'].lstrip('/')).convert('RGBA')
    bounds = planet.getchannel('A').getbbox()
    if not bounds:
        raise ValueError('Empty planet: ' + world['id'])
    planet = planet.crop(bounds)
    # The raised Sheeple solar panel needs breathing room inside the divider rules.
    planet.thumbnail((550, 430 if world['id'] == 'sheeple' else 452), Image.Resampling.LANCZOS)
    px, py = 882-planet.width//2, 322-planet.height//2
    halo = Image.new('RGBA', SIZE)
    halo_draw = ImageDraw.Draw(halo)
    halo_draw.ellipse((710, 150, 1060, 500), fill=(*accent, 19))
    image = Image.alpha_composite(image, halo.filter(ImageFilter.GaussianBlur(48)))
    image.alpha_composite(planet, (px, py))
    draw = ImageDraw.Draw(image)

    community = bool(world.get('ticker'))
    creator = world.get('showcase') == 'creator-world'
    eyebrow = 'A WORLD FOR YOUR COMMUNITY' if community else 'IDENTITY ON SOLANA' if creator else 'THE SOLANA ECOSYSTEM'
    draw.text((60, 155), eyebrow, font=font(12, mono=True), fill=accent)
    title = heading(world)
    title_font = font(64, bold=True)
    while draw.textlength(title, font=title_font) > 510:
        title_font = font(title_font.size-1, bold=True)
    draw.text((55, 198), title, font=title_font, fill=(240, 245, 250))
    draw.text((60, 287), world['world'], font=font(30), fill=accent)
    draw.text((60, 355), 'Explore the planet.', font=font(21), fill=(177, 196, 213))
    draw.text((60, 388), 'Bring your community into orbit.' if community else 'Discover the project behind the world.', font=font(21), fill=(177, 196, 213))
    draw.line((60, 470, 100, 470), fill=accent, width=2)
    draw.text((113, 458), 'IMAGINED BY PARALLAX', font=font(12, mono=True), fill=(142, 162, 181))
    draw.text((60, 574), 'parallaxlaunch.live' + path(world), font=font(14, mono=True), fill=(174, 195, 212))
    note = 'INDEPENDENT COMMUNITY SHOWCASE' if community else 'A CREATOR WORLD IN PARALLAX' if creator else 'INDEPENDENT ECOSYSTEM SHOWCASE'
    draw.text((1140-draw.textlength(note, font=font(11, mono=True)), 577), note, font=font(11, mono=True), fill=(126, 147, 167))
    destination = ROOT / 'public' / world.get('shareImage', '/assets/ecosystem/share/' + world['id'] + '.png').lstrip('/')
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.convert('RGB').save(destination, optimize=True)
    print(f'{world["id"]}: {destination.relative_to(ROOT)} ({destination.stat().st_size} bytes)')


def render_lineup(worlds):
    """Compose a shareable overview using the same unaltered production renders."""
    rows = math.ceil(len(worlds) / 3)
    image = Image.new('RGBA', (1600, 248 + rows * 496), (5, 10, 17, 255))
    draw = ImageDraw.Draw(image)
    draw.text((52, 38), 'PARALLAX', font=font(19, mono=True), fill=(149, 177, 199))
    draw.text((50, 74), 'PROJECT WORLDS', font=font(42, bold=True), fill=(238, 244, 249))
    draw.text((52, 129), 'The realism collection. One project. One world.', font=font(20), fill=(151, 173, 192))
    for index, world in enumerate(worlds):
        row_count = min(3, len(worlds) - (index // 3) * 3)
        x, y = 52 + (3-row_count)*254 + (index % 3) * 508, 184 + (index // 3) * 496
        accent = color(world['accent'])
        draw.rounded_rectangle((x, y, x+480, y+470), radius=18, fill=(8, 16, 25), outline=(27, 42, 55), width=1)
        planet = Image.open(ROOT / 'public' / world['image'].lstrip('/')).convert('RGBA')
        bounds = planet.getchannel('A').point(lambda alpha: 255 if alpha >= 6 else 0).getbbox()
        if not bounds:
            raise ValueError('Empty lineup planet: ' + world['id'])
        planet = planet.crop(bounds)
        planet.thumbnail((428, 350), Image.Resampling.LANCZOS)
        image.alpha_composite(planet, (x+240-planet.width//2, y+192-planet.height//2))
        draw.line((x+26, y+397, x+454, y+397), fill=(27, 42, 55), width=1)
        draw.text((x+26, y+411), world.get('ticker', world['name']), font=font(26, bold=True), fill=(236, 243, 249))
        name_font = font(16)
        width = draw.textlength(world['world'], font=name_font)
        draw.text((x+454-width, y+419), world['world'], font=name_font, fill=accent)
    footer = image.height - 44
    draw.text((52, footer), 'parallaxlaunch.live', font=font(18, mono=True), fill=(174, 197, 215))
    note = 'Project worlds imagined by PARALLAX'
    note_font = font(15)
    draw.text((1548-draw.textlength(note, font=note_font), footer+2), note, font=note_font, fill=(124, 147, 166))
    destination = ROOT / 'public/assets/ecosystem/project-lineup-v209.webp'
    image.convert('RGB').save(destination, quality=94, method=6)
    print(f'Lineup: {destination.relative_to(ROOT)} ({destination.stat().st_size} bytes)')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('worlds', nargs='*', help='Optional project IDs (including solhandle); omitted renders the 11 v209 worlds and the lineup. GATTO is regenerated only when explicitly named.')
    parser.add_argument('--lineup', action='store_true', help='Also compose the complete 12-world lineup from existing planet renders.')
    parser.add_argument('--lineup-only', action='store_true', help='Compose the complete lineup without writing any planet icons or individual cards.')
    args = parser.parse_args()
    all_worlds = catalog()
    worlds = all_worlds
    if args.worlds:
        unknown = set(args.worlds) - {world['id'] for world in worlds}
        if unknown:
            parser.error('Unknown project worlds: ' + ', '.join(sorted(unknown)))
        worlds = [world for world in worlds if world['id'] in args.worlds]
    else:
        worlds = [world for world in worlds if world['id'] != 'gatto']
    if not args.lineup_only:
        for world in worlds:
            render_icon(world)
            render(world)
    if args.lineup or args.lineup_only or not args.worlds:
        render_lineup(all_worlds)
