"""Build compact geometric row contours from the unchanged portrait alpha.

The two opaque pixels in each row encode the left/right bounds as unsigned
16-bit RG values. These are geometry data, never displayed as artwork.
"""
from pathlib import Path
from math import exp
from PIL import Image

folder = Path('public/assets/globe')
for identity in ('bonk', 'pengu', 'wif', 'popcat', 'sheeple', 'trump'):
    source = Image.open(folder / f'{identity}-realism-v209.png').convert('RGBA')
    alpha = source.getchannel('A')
    # Sparse whiskers remain in the photographic alpha, but must not bend the
    # underlying skull into a different radius on each individual scanline.
    bounds_by_row = []
    for y in range(source.height):
        row = alpha.crop((0, y, source.width, y + 1)).tobytes()
        total = sum(row)
        if total:
            cumulative = 0
            left, right = None, None
            for x, value in enumerate(row):
                cumulative += value
                if left is None and cumulative >= total * .01:
                    left = x
                if cumulative >= total * .99:
                    right = x + 1
                    break
            bounds_by_row.append((max(0, left / source.width - .075), min(1, right / source.width + .075)))
        else:
            bounds_by_row.append(None)
    kernel = [(offset, exp(-.5 * (offset / 9) ** 2)) for offset in range(-27, 28)]
    result = Image.new('RGBA', (2, source.height), (128, 0, 0, 255))
    data = result.load()
    for y in range(source.height):
        if bounds_by_row[y]:
            samples = [(bounds_by_row[min(source.height - 1, max(0, y + offset))], weight) for offset, weight in kernel]
            samples = [(bounds, weight) for bounds, weight in samples if bounds]
            total = sum(weight for _, weight in samples)
            left, right = [sum(bounds[side] * weight for bounds, weight in samples) / total for side in (0, 1)]
            for x, value in enumerate((left, right)):
                encoded = round(value * 65535)
                data[x, y] = (encoded >> 8, encoded & 255, 255, 255)
    target = folder / f'{identity}-realism-contour-v209.png'
    result.save(target, optimize=True)
    print(target, target.stat().st_size)
