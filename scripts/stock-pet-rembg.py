#!/usr/bin/env python3

from pathlib import Path
import sys

from PIL import Image, ImageFilter
import numpy as np
from rembg import new_session, remove
from scipy import ndimage


def repair_frame(foreground: Image.Image) -> tuple[Image.Image, int, int]:
    rgba = np.array(foreground.convert("RGBA"), copy=True)
    alpha = rgba[:, :, 3]
    mask = alpha >= 24
    structure = np.ones((3, 3), dtype=bool)

    labels, component_count = ndimage.label(mask, structure=structure)
    sizes = np.bincount(labels.ravel())
    removed = 0
    for label_index, size in enumerate(sizes[1:], start=1):
        if size < 12:
            mask[labels == label_index] = False
            removed += int(size)

    holes = ndimage.binary_fill_holes(mask) & ~mask
    hole_labels, _ = ndimage.label(holes, structure=structure)
    hole_sizes = np.bincount(hole_labels.ravel())
    filled = 0
    for label_index, size in enumerate(hole_sizes[1:], start=1):
        if size <= 80:
            target = hole_labels == label_index
            mask[target] = True
            alpha[target] = 255
            filled += int(size)

    alpha[~mask] = 0
    alpha[(mask) & (alpha < 24)] = 24
    rgba[:, :, 3] = alpha
    return Image.fromarray(rgba, "RGBA"), removed, filled


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: stock-pet-rembg.py <raw-root> <alpha-root>")

    source_root = Path(sys.argv[1])
    output_root = Path(sys.argv[2])
    frames = sorted(source_root.glob("*/*.png"))
    if not frames:
        raise SystemExit("No input frames found")

    session = new_session("u2net")
    for index, frame in enumerate(frames, start=1):
        relative = frame.relative_to(source_root)
        output = output_root / relative
        output.parent.mkdir(parents=True, exist_ok=True)
        image = Image.open(frame).convert("RGB")
        foreground = remove(
            image,
            session=session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=6,
        ).convert("RGBA")
        foreground.putalpha(foreground.getchannel("A").filter(ImageFilter.MedianFilter(3)))
        foreground, removed, filled = repair_frame(foreground)
        foreground.save(output, optimize=True)
        if removed or filled:
            print(
                f"Frame repair {relative}: removed={removed} filled={filled}",
                flush=True,
            )
        if index % 25 == 0 or index == len(frames):
            print(f"Background removal: {index}/{len(frames)}", flush=True)


if __name__ == "__main__":
    main()
