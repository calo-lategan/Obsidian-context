"""Final post: read the TEMPORALLY DENOISED intermediate (denoised.mp4), apply
bloom + grade + vignette + light sharpen, write the final showcase.mp4.
Run: uvx --python 3.13 --with "imageio[ffmpeg]" --with numpy --with pillow python encode_post2.py
"""
import numpy as np
import imageio.v2 as iio
from PIL import Image, ImageFilter

ROOT = r"C:/Users/USER/Desktop/Staircases/idea one/"
rdr = iio.get_reader(ROOT + "docs/renders/denoised.mp4")
meta = rdr.get_meta_data()
w, h = meta["size"]

yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
vig = np.clip(1.0 - 0.30 * np.clip(r - 0.45, 0, 1.6) ** 2, 0.6, 1.0)[..., None]

wri = iio.get_writer(ROOT + "docs/renders/showcase.mp4", fps=30, codec="libx264",
                     quality=9, macro_block_size=16, ffmpeg_params=["-pix_fmt", "yuv420p"])
n = 0
for fr in rdr:
    img = fr[:, :, :3].astype(np.float32) / 255.0
    bright = np.clip(img - 0.74, 0, 1)
    bl = Image.fromarray((bright * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(11))
    img = img + 0.55 * (np.asarray(bl).astype(np.float32) / 255.0)
    img = (img - 0.5) * 1.08 + 0.5
    g = img.mean(axis=2, keepdims=True)
    img = g + (img - g) * 1.15
    img = np.clip(img, 0, 1) * vig
    img = np.clip(img, 0, 1) ** 0.96
    im8 = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).filter(
        ImageFilter.UnsharpMask(radius=1.6, percent=38, threshold=3))   # lighter: don't re-amplify grain
    wri.append_data(np.asarray(im8))
    n += 1
    if n % 200 == 0:
        print("post", n)
wri.close()
print("ENCODED", n, "-> docs/renders/showcase.mp4")
