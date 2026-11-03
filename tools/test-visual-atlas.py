#!/usr/bin/env python3
"""Verify packing geometry, registered sheets and preservation of approved/classic art."""
import argparse
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tempfile

from PIL import Image

spec = importlib.util.spec_from_file_location('visual_builder', Path(__file__).with_name('build-visual-v2.py'))
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def frame_image(image, frame):
    x, y, w, h = (frame[k] for k in ('x', 'y', 'w', 'h'))
    return image.crop((x, y, x + w, y + h))


def check_atlas(root, folder):
    mapping = json.loads((folder / 'atlas.json').read_text(encoding='utf-8'))
    image = Image.open(folder / 'atlas.png').convert('RGBA')
    assert mapping['version'] == builder.VERSION, 'Expanded atlas must match the current packer version'
    assert image.width <= 2048, 'Atlas exceeds the supported width'
    boxes = []
    for key, frame in mapping['frames'].items():
        x, y, w, h = (frame[n] for n in ('x', 'y', 'w', 'h'))
        assert (w, h) == builder.classic_size(root, key), f'{key}: classic dimensions changed'
        assert min(x, y) >= 0 and x + w <= image.width and y + h <= image.height, f'{key}: clipped frame'
        assert builder.opaque_bbox(frame_image(image, frame)), f'{key}: empty alpha'
        for other_key, (a, b, c, d) in boxes:
            assert x >= c or x + w <= a or y >= d or y + h <= b, f'{key} overlaps {other_key}'
        boxes.append((key, (x, y, x + w, y + h)))
    return mapping, image


def unit_checks():
    with tempfile.TemporaryDirectory(prefix='golden-visual-atlas-') as temporary:
        root = Path(temporary)
        originals = root / 'public/assets/farm'
        originals.mkdir(parents=True)
        base = root / 'base'
        sources = root / 'sources'
        output = root / 'output'
        for folder in (base, sources):
            folder.mkdir()
        prior = Image.new('RGBA', (8 * len(builder.APPROVED), 8))
        frames = {}
        for i, key in enumerate(builder.APPROVED):
            pixels = Image.new('RGBA', (8, 8), (40 + i, 70, 100, 255))
            pixels.putpixel((0, 0), (90 + i, 33, 15, 0))  # Hidden RGB must survive too.
            pixels.save(originals / (key + '.png'))
            prior.paste(pixels, (i * 8, 0))
            frames[key] = {'x': i * 8, 'y': 0, 'w': 8, 'h': 8}
        frames['store']['anchors'] = builder.ANCHORS['store']
        prior.save(base / 'atlas.png')
        (base / 'atlas.json').write_text(json.dumps({'version': 2, 'frames': frames}), encoding='utf-8')
        for key, size in [('tree', (8, 8)), ('tree_cut1', (8, 8)), ('plot', (9, 7)), ('wide', (21, 5))]:
            Image.new('RGBA', size, (20, 40, 60, 255)).save(originals / (key + '.png'))
        sheet = Image.new('RGBA', (32, 16))
        for x in (2, 3):
            for y in (2, 3):
                sheet.putpixel((x, y), (255, 100, 20, 255))
        for x in (26, 27):
            for y in (10, 11):
                sheet.putpixel((x, y), (255, 100, 20, 255))
        sheet.save(sources / 'states.png')
        Image.new('RGBA', (6, 6), (55, 100, 30, 255)).save(sources / 'solid.png')
        entries = [
            {'key': 'tree', 'source': 'states.png', 'rect': [0, 0, 16, 16], 'mode': 'registered'},
            {'key': 'tree_cut1', 'source': 'states.png', 'rect': [16, 0, 16, 16], 'mode': 'registered'},
            {'key': 'plot', 'source': 'solid.png', 'mode': 'stretch'},
            {'key': 'wide', 'source': 'solid.png', 'mode': 'contain', 'padding': 1},
        ]
        manifest = root / 'manifest.json'
        manifest.write_text(json.dumps({'assets': entries}), encoding='utf-8')
        original_bytes = {p.name: p.read_bytes() for p in originals.glob('*.png')}
        builder.build(root, sources, manifest, base, output, max_width=32)
        mapping, image = check_atlas(root, output)
        for key in builder.APPROVED:
            assert frame_image(image, mapping['frames'][key]).tobytes() == frame_image(prior, frames[key]).tobytes(), f'{key}: approved RGBA changed'
        assert mapping['frames']['store']['anchors'] == builder.ANCHORS['store'], 'Effect anchors changed'
        assert len(mapping['frames']) == len(builder.APPROVED) + len(entries)
        assert image.height > 8, 'Shelf wrapping was not exercised'
        first = builder.opaque_bbox(frame_image(image, mapping['frames']['tree']))
        second = builder.opaque_bbox(frame_image(image, mapping['frames']['tree_cut1']))
        assert first[0] < second[0] and first[1] < second[1], 'Registered states lost common framing'
        assert frame_image(image, mapping['frames']['plot']).getchannel('A').getextrema() == (255, 255), 'Stretch did not fill the cell'
        prior_bytes = image.tobytes()
        builder.build(root, sources, manifest, output, output, max_width=32)
        again, image_again = check_atlas(root, output)
        assert again == mapping and image_again.tobytes() == prior_bytes, 'Re-running is not idempotent'
        assert {p.name: p.read_bytes() for p in originals.glob('*.png')} == original_bytes, 'Classic art was modified'
        invalid_cases = [
            [entries[0], entries[0]],
            [{'key': 'market', 'source': 'solid.png'}],
            [{'key': 'tree', 'source': 'states.png', 'rect': [30, 0, 16, 16]}],
            [{'key': 'tree', 'source': '../outside.png'}],
            [{'key': 'tree', 'source': 'solid.png', 'mode': 'unrecognized'}],
            [{'key': 'tree', 'source': 'solid.png', 'padding': 4}],
        ]
        for entries in invalid_cases:
            manifest.write_text(json.dumps(entries), encoding='utf-8')
            try:
                builder.build(root, sources, manifest, base, output)
            except (ValueError, FileNotFoundError):
                pass
            else:
                raise AssertionError('Invalid manifest was accepted: ' + repr(entries))
    print('OK: 10 approved RGBA frames/anchors preserved, registered states, stretch, contain, shelf wrap, idempotence, input rejection, classics untouched')


def published_checks(root, atlas_folder, baseline_folder):
    mapping, image = check_atlas(root, atlas_folder)
    if baseline_folder:
        old_map = json.loads((baseline_folder / 'atlas.json').read_text(encoding='utf-8'))
        old_image = Image.open(baseline_folder / 'atlas.png').convert('RGBA')
    else:
        # Read HEAD without updating the index or any Git metadata.
        def head_blob(path):
            return subprocess.check_output(['git', '--no-optional-locks', '-C', str(root), 'show', 'HEAD:' + path])
        old_map = json.loads(head_blob('public/assets/visual-v2/atlas.json'))
        old_image = Image.open(io.BytesIO(head_blob('public/assets/visual-v2/atlas.png'))).convert('RGBA')
    for key in builder.APPROVED:
        assert key in mapping['frames'] and key in old_map['frames'], 'Approved building missing: ' + key
        now = frame_image(image, mapping['frames'][key])
        before = frame_image(old_image, old_map['frames'][key])
        assert now.size == before.size and now.tobytes() == before.tobytes(), 'Approved building changed: ' + key
        assert mapping['frames'][key].get('anchors') == old_map['frames'][key].get('anchors'), 'Anchors changed: ' + key
    print(f'OK: actual atlas {image.width}x{image.height}, {len(mapping["frames"])} frames with classic dimensions, no clipping/overlap, approved RGBA identical to baseline')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument('--atlas', type=Path)
    parser.add_argument('--baseline', type=Path, help='Optional previous atlas directory; default is the checked-out HEAD')
    parser.add_argument('--unit-only', action='store_true')
    options = parser.parse_args()
    unit_checks()
    if not options.unit_only:
        published_checks(options.root, options.atlas or options.root / 'public/assets/visual-v2', options.baseline)
