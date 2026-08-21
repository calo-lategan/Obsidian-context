"""Encode the rendered PNG sequence to MP4 with post-processing:
bloom (glow on bright highlights), gentle contrast + saturation grade, and a soft vignette.
Run: uvx --python 3.13 --with "imageio[ffmpeg]" --with numpy --with pillow python encode_post.py
"""
import glob
import numpy as np
import imageio.v2 as iio
from PIL import Image, ImageFilter

ROOT = r"C:/Users/USER/Desktop/Staircases/idea one/"
fs = sorted(glob.glob(ROOT + "docs/renders/frames/f_*.png"))
assert fs, "no frames found"
h, w = iio.imread(fs[0]).shape[:2]

# soft vignette mask (darken corners ~25%)
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
vig = np.clip(1.0 - 0.30 * np.clip(r - 0.45, 0, 1.6) ** 2, 0.6, 1.0)[..., None]

wri = iio.get_writer(ROOT + "docs/renders/showcase.mp4", fps=30, codec="libx264",
                     quality=9, macro_block_size=16, ffmpeg_params=["-pix_fmt", "yuv420p"])
for i, f in enumerate(fs):
    img = iio.imread(f)[:, :, :3].astype(np.float32) / 255.0
    # bloom: blur the bright highlights and add back
    bright = np.clip(img - 0.74, 0, 1)
    bl = Image.fromarray((bright * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(11))
    img = img + 0.55 * (np.asarray(bl).astype(np.float32) / 255.0)
    # gentle contrast + saturation grade
    img = (img - 0.5) * 1.08 + 0.5
    g = img.mean(axis=2, keepdims=True)
    img = g + (img - g) * 1.15
    # vignette + subtle tone
    img = np.clip(img, 0, 1) * vig
    img = np.clip(img, 0, 1) ** 0.96
    # subtle unsharp for crispness
    im8 = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).filter(
        ImageFilter.UnsharpMask(radius=2.0, percent=55, threshold=2))
    wri.append_data(np.asarray(im8))
    if i % 200 == 0:
        print("post", i, "/", len(fs))
wri.close()
print("ENCODED", len(fs), "-> docs/renders/showcase.mp4")
