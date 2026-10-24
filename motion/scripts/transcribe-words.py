"""Word-level transcript of a voiceover, for the "recreate" videos' timing (faster-whisper, CPU).

    python scripts/transcribe-words.py <audio> <out.json> [model]

Writes {"words": [{"text", "start", "end"}]} in seconds (the shape src/series/recreate/timing.tsx
reads) and prints each segment with its times. Model defaults to small.en (~470 MB, downloads
once to ~/.cache/huggingface). Ported from codemotion's scripts/transcribe.py.
"""

import json
import subprocess
import sys

import numpy as np
from faster_whisper import WhisperModel

audio, out = sys.argv[1], sys.argv[2]
model_name = sys.argv[3] if len(sys.argv) > 3 else "small.en"

# Decode with ffmpeg (16 kHz mono float) instead of faster-whisper's PyAV path: a newer `av`
# release dropped the `metadata_errors` argument faster-whisper passes, which broke the cloud runner.
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", audio, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], check=True, capture_output=True).stdout
samples = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0

model = WhisperModel(model_name, device="cpu", compute_type="int8")
segments, info = model.transcribe(samples, word_timestamps=True, beam_size=5, condition_on_previous_text=False)

words = []
for seg in segments:
    print(f"[{seg.start:7.2f} - {seg.end:7.2f}] {seg.text.strip()}", flush=True)
    for w in seg.words:
        words.append({"text": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)})

with open(out, "w", encoding="utf-8") as f:
    json.dump({"words": words}, f, indent=1)
print(f"{len(words)} words, {info.duration:.1f}s")
