"""Transcribes a video or audio file with faster-whisper on the CPU, for watch_video.

    python3 scripts/transcribe.py <file>

Prints JSON: [{"text": "...", "offset": <start in ms>}, ...]. Free and local: the model
(WHISPER_MODEL, default "base", about 150 MB) downloads once to ~/.cache/huggingface; the
workflows cache that folder. A 2-minute reel takes about 25 s on a laptop CPU.
"""

import json
import os
import sys

from faster_whisper import WhisperModel

model = WhisperModel(os.environ.get("WHISPER_MODEL", "base"), device="cpu", compute_type="int8")
# vad_filter skips silence and music-only stretches, where Whisper tends to invent words.
segments, _info = model.transcribe(sys.argv[1], vad_filter=True)
print(json.dumps([{"text": s.text.strip(), "offset": round(s.start * 1000)} for s in segments if s.text.strip()]))
