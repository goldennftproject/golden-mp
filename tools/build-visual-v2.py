#!/usr/bin/env python3
"""Pack optional renewed art, preserving classic files and already approved pixels.

--manifest is an array (or {"assets": [...]}) of {key, source, rect?, mode?, padding?}.
The source paths are relative to --sources. Use registered for sprite-state sheets:
it contains the whole source cell, never crops each state's opaque bounds separately.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image

VERSION = 5
APPROVED = ('barn_evo_0', 'barn_evo_1', 'barn_evo_2', 'barn_evo_3',
            'market', 'cocina', 'store', 'horno', 'establo', 'curtiduria')
ANCHORS = {'store': {'smoke': {'x': .192, 'y': .129}, 'forge': {'x': .564, 'y': .743}},
           'horno': {'smoke': {'x': .5, 'y': .096}}}


def opaque_bbox(image: Image.Image):
    return image.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox()


def classic_size(root: Path, key: str):
    if not key or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-' for c in key):
        raise ValueError('Invalid texture key: ' + repr(key))
    with Image.open(root / 'public/assets/farm' / (key + '.png')) as original:
        return original.size


def render_entry(root: Path, sources: Path, entry: dict):
    key = entry['key']
    size = classic_size(root, key)
    source = (sources / entry.get('source', key + '.png')).resolve()
    if not source.is_relative_to(sources.resolve()):
        raise ValueError('Source must remain inside --sources: ' + str(source))
    with Image.open(source) as raw:
        image = raw.convert('RGBA')
    rect = entry.get('rect')
    if rect is not None:
        if (not isinstance(rect, list) or len(rect) != 4 or
                any(type(v) is not int for v in rect)):
            raise ValueError('rect must contain four integers: ' + key)
        x, y, width, height = rect
        if x < 0 or y < 0 or width <= 0 or height <= 0 or x + width > image.width or y + height > image.height:
            raise ValueError('rect lies outside its source: ' + key)
        image = image.crop((x, y, x + width, y + height))
    bbox = opaque_bbox(image)
    if bbox is None:
        raise ValueError('Empty asset: ' + key)
    mode = entry.get('mode', 'contain')
    if mode not in ('contain', 'stretch', 'registered'):
        raise ValueError('Unknown fit mode: ' + str(mode))
    padding = entry.get('padding', 2 if mode == 'contain' else 0)
    if type(padding) is not int or padding < 0 or min(size) <= 2 * padding:
        raise ValueError('Invalid padding: ' + key)
    target = (size[0] - 2 * padding, size[1] - 2 * padding)
    if mode == 'contain':
        image = image.crop(bbox)
    if mode == 'stretch':
        image = image.resize(target, Image.Resampling.LANCZOS)
    else:
        # resize rather than thumbnail permits well-defined scaling in either direction.
        scale = min(target[0] / image.width, target[1] / image.height)
        image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', size)
    canvas.alpha_composite(image, ((size[0] - image.width) // 2, size[1] - padding - image.height))
    if opaque_bbox(canvas) is None:
        raise ValueError('Empty packed asset: ' + key)
    metadata = dict(entry.get('anchors') and {'anchors': entry['anchors']} or {})
    return canvas, metadata


def read_base(root: Path, folder: Path):
    map_path, image_path = folder / 'atlas.json', folder / 'atlas.png'
    if map_path.exists() != image_path.exists():
        raise ValueError('Base atlas requires both atlas.json and atlas.png')
    if not map_path.exists():
        return {}
    mapping = json.loads(map_path.read_text(encoding='utf-8'))
    with Image.open(image_path) as image_file:
        image = image_file.convert('RGBA')
    result = {}
    for key, frame in mapping['frames'].items():
        x, y, w, h = (frame[n] for n in ('x', 'y', 'w', 'h'))
        if (w, h) != classic_size(root, key) or x < 0 or y < 0 or x + w > image.width or y + h > image.height:
            raise ValueError('Invalid existing frame: ' + key)
        pixels = image.crop((x, y, x + w, y + h))
        if opaque_bbox(pixels) is None:
            raise ValueError('Empty existing frame: ' + key)
        result[key] = pixels, {k: v for k, v in frame.items() if k not in ('x', 'y', 'w', 'h')}
    return result


def build(root: Path, sources: Path, manifest: Path | None, base: Path, output: Path, max_width=2048):
    if type(max_width) is not int or not 1 <= max_width <= 2048:
        raise ValueError('max-width must be between 1 and 2048')
    assets = read_base(root, base)
    # Bootstrap only when there is no approved atlas. Normal extension always copies it.
    for key in APPROVED:
        if key not in assets:
            entry = {'key': key, 'anchors': ANCHORS.get(key, {})}
            canvas, metadata = render_entry(root, sources, entry)
            if key.startswith('barn_'):
                # Historical barn fit is kept for reproducible initial bootstrapping.
                with Image.open(sources / (key + '.png')) as raw:
                    im = raw.convert('RGBA')
                im = im.crop(opaque_bbox(im))
                im.thumbnail((112, 110), Image.Resampling.LANCZOS)
                canvas = Image.new('RGBA', classic_size(root, key))
                canvas.alpha_composite(im, ((canvas.width - im.width) // 2, canvas.height - im.height))
            assets[key] = canvas, metadata
    entries = []
    if manifest is not None:
        content = json.loads(manifest.read_text(encoding='utf-8'))
        entries = content.get('assets') if isinstance(content, dict) else content
        if not isinstance(entries, list):
            raise ValueError('Manifest must be an array or an object with an assets array')
    seen = set()
    for entry in entries:
        if not isinstance(entry, dict) or not isinstance(entry.get('key'), str):
            raise ValueError('Each manifest entry needs a texture key')
        key = entry['key']
        if key in seen:
            raise ValueError('Duplicate manifest key: ' + key)
        seen.add(key)
        if key in APPROVED:
            raise ValueError('Approved building frames cannot be replaced by an extension: ' + key)
        # Re-running the same manifest replaces a frame in place, without duplicates.
        assets[key] = render_entry(root, sources, entry)
    frames, positions = {}, {}
    x = y = row_height = used_width = 0
    for key, (pixels, metadata) in assets.items():
        w, h = pixels.size
        if w > max_width:
            raise ValueError('Frame exceeds max-width: ' + key)
        if x and x + w > max_width:
            y += row_height + 1
            x, row_height = 0, 0
        positions[key] = (x, y)
        frames[key] = {'x': x, 'y': y, 'w': w, 'h': h, **metadata}
        used_width = max(used_width, x + w)
        row_height = max(row_height, h)
        x += w + 1
    atlas = Image.new('RGBA', (used_width, y + row_height))
    for key, (pixels, _) in assets.items():
        # paste preserves even hidden RGB bytes under alpha=0, unlike alpha_composite.
        atlas.paste(pixels, positions[key])
    output.mkdir(parents=True, exist_ok=True)
    atlas.save(output / 'atlas.png', optimize=True)
    (output / 'atlas.json').write_text(json.dumps({'version': VERSION, 'frames': frames}, separators=(',', ':')), encoding='utf-8')
    return frames


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sources', required=True, type=Path)
    parser.add_argument('--manifest', type=Path)
    parser.add_argument('--base', type=Path, help='Existing approved atlas directory (defaults to the published asset directory)')
    parser.add_argument('--output', type=Path, help='Staging output directory (defaults to the published asset directory)')
    parser.add_argument('--max-width', type=int, default=2048)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    folder = root / 'public/assets/visual-v2'
    frames = build(root, args.sources, args.manifest, args.base or folder, args.output or folder, args.max_width)
    image_path = (args.output or folder) / 'atlas.png'
    print(f'{image_path}: {image_path.stat().st_size} bytes / {len(frames)} variants')


if __name__ == '__main__':
    main()
