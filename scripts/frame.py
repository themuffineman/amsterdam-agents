"""One frame of a video as a JPEG, for the directory's thumbnails (watch_video, the backfill).

    python3 scripts/frame.py <video file> <out.jpg>

Takes the frame about 1 second in (or a tenth of the way through a short clip, so a fade-in
from black isn't the thumbnail), scaled to 540 px wide. PyAV only: it comes with
faster-whisper, which the workflows install anyway, and GitHub's runners have no ffmpeg.
Exits 1 with the reason on stderr if the file has no video.
"""

import sys
from fractions import Fraction

import av

src, out = sys.argv[1], sys.argv[2]
with av.open(src) as container:
    stream = next((s for s in container.streams if s.type == "video"), None)
    if stream is None:
        sys.exit("no video stream")
    length = float(container.duration or 0) / av.time_base
    at = min(1.0, length / 10) if length else 0.5
    if at > 0 and stream.time_base:
        container.seek(int(at / stream.time_base), stream=stream, any_frame=False, backward=True)
    frame = None
    for f in container.decode(stream):
        frame = f
        if f.time is None or f.time >= at:
            break
    if frame is None:
        sys.exit("no frame decoded")

width = min(540, frame.width - frame.width % 2)
height = round(frame.height * width / frame.width / 2) * 2
frame = frame.reformat(width=width, height=height, format="yuvj420p")

encoder = av.CodecContext.create("mjpeg", "w")
encoder.width, encoder.height, encoder.pix_fmt = width, height, "yuvj420p"
encoder.time_base = Fraction(1, 25)
encoder.options = {"qscale": "4"}
packets = list(encoder.encode(frame)) + list(encoder.encode(None))
if not packets:
    sys.exit("couldn't encode the frame")
with open(out, "wb") as fh:
    for p in packets:
        fh.write(bytes(p))
