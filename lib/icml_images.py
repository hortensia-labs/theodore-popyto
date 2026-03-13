#!/usr/bin/env python3
"""
ICML anchored image resizing.

Rewrites the geometry of <Rectangle> + <Image> anchored objects in
Pandoc-generated ICML so they match config-driven dimensions instead of
the native SVG size.

Each Rectangle block has four interdependent properties:
    - Rectangle ItemTransform:  1 0 0 1  tx  ty   (tx=halfW, ty=-halfH)
    - PathPointArray:           four corners at ±halfW, ±halfH
    - Image ItemTransform:      1 0 0 1 -halfW -halfH
    - GraphicBounds:            Left=0 Top=0 Right=imageW Bottom=imageH

Used by resize-icml-images.py.
"""

import re
from pathlib import PurePosixPath
from typing import Optional, Tuple

from config import ImageSettings


# ---------------------------------------------------------------------------
# Rectangle block regex
# ---------------------------------------------------------------------------

_RECTANGLE_RE = re.compile(
    r'(<Rectangle\b[^>]*>)'       # group 1: Rectangle opening tag
    r'(.*?)'                       # group 2: inner content
    r'(</Rectangle>)',             # group 3: closing tag
    re.DOTALL,
)

_LINK_URI_RE = re.compile(r'LinkResourceURI="([^"]+)"')
_GRAPHIC_BOUNDS_RE = re.compile(
    r'<GraphicBounds\s+Left="([^"]+)"\s+Top="([^"]+)"\s+Right="([^"]+)"\s+Bottom="([^"]+)"\s*/>'
)
_RECT_TRANSFORM_RE = re.compile(
    r'(<Rectangle\b[^>]*\bItemTransform=")[^"]*(")'
)
_IMAGE_TRANSFORM_RE = re.compile(
    r'(<Image\b[^>]*\bItemTransform=")[^"]*(")'
)
_PATH_POINT_RE = re.compile(
    r'<PathPointType\s+Anchor="[^"]*"\s+LeftDirection="[^"]*"\s+RightDirection="[^"]*"\s*/>'
)


def _extract_stem(uri: str) -> str:
    """Extract filename stem from a LinkResourceURI."""
    path = uri.replace('file:', '')
    return PurePosixPath(path).stem


def _fmt(v: float) -> str:
    """Format a float for ICML attributes, stripping unnecessary trailing zeros."""
    if v == int(v):
        return str(int(v))
    return f"{v:g}"


def _build_path_points(half_w: float, half_h: float, indent: str) -> str:
    """Build the four PathPointType elements for a rectangle."""
    corners = [
        (-half_w, -half_h),
        (-half_w,  half_h),
        ( half_w,  half_h),
        ( half_w, -half_h),
    ]
    lines = []
    for x, y in corners:
        val = f"{_fmt(x)} {_fmt(y)}"
        lines.append(
            f'{indent}<PathPointType Anchor="{val}" '
            f'LeftDirection="{val}" RightDirection="{val}" />'
        )
    return '\n'.join(lines)


def resize_anchored_images(
    content: str,
    image_settings: ImageSettings,
) -> Tuple[str, int]:
    """
    Resize anchored image rectangles in ICML content.

    For each <Rectangle> block containing an <Image> with a <Link>,
    extracts the image filename stem and applies the configured sizing
    (either an explicit override or the proportional default).

    Args:
        content: ICML file content
        image_settings: Image sizing configuration

    Returns:
        Tuple of (modified content, number of images resized)
    """
    images_resized = 0
    defaults = image_settings.defaults

    def _resize_block(match: re.Match) -> str:
        nonlocal images_resized

        rect_tag = match.group(1)
        inner = match.group(2)
        close_tag = match.group(3)

        link_m = _LINK_URI_RE.search(inner)
        if not link_m:
            return match.group(0)

        stem = _extract_stem(link_m.group(1))
        override = image_settings.overrides.get(stem)

        # Determine target dimensions
        if override and override.width is not None and override.height is not None:
            width = override.width
            height = override.height
        elif defaults.fit_mode == 'proportional':
            bounds_m = _GRAPHIC_BOUNDS_RE.search(inner)
            if not bounds_m:
                return match.group(0)
            native_w = float(bounds_m.group(3))  # Right
            native_h = float(bounds_m.group(4))  # Bottom
            if native_w <= 0:
                return match.group(0)
            width = defaults.max_width
            height = native_h * (width / native_w)
        else:
            return match.group(0)

        half_w = width / 2
        half_h = height / 2

        offset_x = override.offset_x if (override and override.offset_x is not None) else half_w
        offset_y = override.offset_y if (override and override.offset_y is not None) else -half_h
        img_w = override.image_width if (override and override.image_width is not None) else width
        img_h = override.image_height if (override and override.image_height is not None) else height

        # Rewrite Rectangle ItemTransform
        new_rect_tag = _RECT_TRANSFORM_RE.sub(
            rf'\g<1>1 0 0 1 {_fmt(offset_x)} {_fmt(offset_y)}\2',
            rect_tag,
        )

        # Detect indentation from existing PathPointType lines
        pp_matches = list(_PATH_POINT_RE.finditer(inner))
        if pp_matches:
            first_pp_line_start = inner.rfind('\n', 0, pp_matches[0].start()) + 1
            indent = ''
            for ch in inner[first_pp_line_start:]:
                if ch in (' ', '\t'):
                    indent += ch
                else:
                    break
        else:
            indent = '              '

        # Replace PathPointArray contents (splice at line boundaries to preserve indent)
        new_inner = inner
        if pp_matches:
            line_start = inner.rfind('\n', 0, pp_matches[0].start()) + 1
            end = pp_matches[-1].end()
            new_inner = (
                inner[:line_start]
                + _build_path_points(half_w, half_h, indent)
                + inner[end:]
            )

        # Rewrite Image ItemTransform
        new_inner = _IMAGE_TRANSFORM_RE.sub(
            rf'\g<1>1 0 0 1 {_fmt(-half_w)} {_fmt(-half_h)}\2',
            new_inner,
        )

        # Rewrite GraphicBounds
        new_inner = _GRAPHIC_BOUNDS_RE.sub(
            f'<GraphicBounds Left="0" Top="0" Right="{_fmt(img_w)}" Bottom="{_fmt(img_h)}" />',
            new_inner,
        )

        images_resized += 1
        return new_rect_tag + new_inner + close_tag

    content = _RECTANGLE_RE.sub(_resize_block, content)
    return content, images_resized
