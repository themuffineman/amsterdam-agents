# news-fixture: test story for src/news (PageShot, NewsSegment)

Placeholder content, not news. To capture its page:

```bash
cp ../../../scripts/fixtures/news-test-page.html <dir>/index.html   # any empty folder
ffmpeg -f lavfi -i testsrc2=s=1280x720:r=30:d=8 -f lavfi -i sine=f=440:d=8 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest <dir>/clip.mp4
ffmpeg -f lavfi -i mandelbrot=s=1280x720:r=30 -t 6 -c:v libx264 -pix_fmt yuv420p <dir>/clip2.mp4
python3 -m http.server 8765 --bind 127.0.0.1 --directory <dir>
npm run news-page -- http://127.0.0.1:8765/ news-fixture project "--highlight=this sentence is the highlighted phrase|a second line, so the sweep has to cross a line break and carry on from the left edge" "--column=Column B"
```

Then `npm run review -- news-fixture`.
