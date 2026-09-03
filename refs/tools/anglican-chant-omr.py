"""
Prototype OMR (optical music recognition) helpers for extracting the
Anglican-chant chord charts from refs/jpkirja-musiikkia-psalmeihin.pdf
(pp. 387-388, 5 numbered formulas + 2 worked examples).

STATUS: prototype, not yet reliable enough to trust for real tone data --
see refs/README.md's "Anglican chant" section for what this did and didn't
establish, and what's confirmed by other means (structure, pointing
convention, one spot-checked chord). Kept here as a starting point for the
next attempt, not as something to run and trust blindly.

Usage sketch (see refs/README.md for the confirmed staff-line Y positions
already found this way, per page/formula):

    from PIL import Image
    import sys; sys.path.insert(0, "refs/tools")
    from anglican_chant_omr import load, find_staff_lines, noteheads_via_line_erasure

    # render the source page first, e.g.:
    #   pdftoppm -f 8 -l 8 -r 600 -png jpkirja-musiikkia-psalmeihin.pdf page8
    arr = load("page8-08.png")
    lines = find_staff_lines(arr, x0=1300, x1=3800, y0=2790, y1=3010)
    blobs = noteheads_via_line_erasure(arr, x0=1300, x1=3850, y0=2790, y1=3010, line_ys=lines)
    # blobs are unreliable in the middle of a chord run -- see README.

Requires pillow, numpy, scipy (not the project's own dependencies --
install into a throwaway venv, e.g. `python3 -m venv venv && venv/bin/pip
install pillow numpy scipy`, since the system PIL install on some hosts
conflicts with pip's).
"""

import numpy as np
from PIL import Image
from scipy import ndimage


def load(path):
    return np.array(Image.open(path).convert("L"))


def find_staff_lines(arr, x0, x1, y0, y1, min_run_frac=0.7):
    """Finds staff-line row positions by looking for rows that are dark
    across most of the given width. Returns line Y-coordinates, top to
    bottom (5 per staff, for a normal 5-line staff)."""
    region = arr[y0:y1, x0:x1]
    width = x1 - x0
    min_run = int(width * min_run_frac)
    darkness = (region < 128).sum(axis=1)
    rows = np.where(darkness > min_run)[0]
    if len(rows) == 0:
        return []
    clusters = []
    cur = [rows[0]]
    for r in rows[1:]:
        if r - cur[-1] <= 4:
            cur.append(r)
        else:
            clusters.append(cur)
            cur = [r]
    clusters.append(cur)
    return [y0 + sum(c) / len(c) for c in clusters]


def erase_lines(region_bool, line_ys, y0, erase_half_width=2):
    """region_bool: boolean array (True=dark), already sliced starting at
    y0. Erases rows at each staff line position so noteheads/stems stop
    being merged into one giant connected component via the staff lines."""
    out = region_bool.copy()
    h = out.shape[0]
    for ly in line_ys:
        rel = int(round(ly - y0))
        lo = max(0, rel - erase_half_width)
        hi = min(h, rel + erase_half_width + 1)
        out[lo:hi, :] = False
    return out


def noteheads_via_line_erasure(arr, x0, x1, y0, y1, line_ys, min_area=80, max_area=3000, min_w=9, erase_half_width=2):
    """Connected-component notehead detection within a window, after
    erasing the known staff lines. Returns blobs sorted left to right;
    each is a plausible notehead (or, sometimes, a stray glyph fragment
    -- filtering purely by area/width isn't fully reliable, see module
    docstring)."""
    region = (arr[y0:y1, x0:x1] < 140)
    region = erase_lines(region, line_ys, y0, erase_half_width)
    labeled, n = ndimage.label(region, structure=np.ones((3, 3)))
    results = []
    for i in range(1, n + 1):
        ys, xs = np.where(labeled == i)
        area = len(ys)
        h = ys.max() - ys.min() + 1
        w = xs.max() - xs.min() + 1
        if area < min_area or area > max_area or w < min_w:
            continue
        results.append(
            dict(
                cy=y0 + ys.mean(),
                cx=x0 + xs.mean(),
                area=area,
                h=h,
                w=w,
                y0=y0 + ys.min(),
                y1=y0 + ys.max(),
                x0=x0 + xs.min(),
                x1=x0 + xs.max(),
            )
        )
    results.sort(key=lambda r: r["cx"])
    return results


if __name__ == "__main__":
    import sys

    arr = load(sys.argv[1])
    print(arr.shape)
