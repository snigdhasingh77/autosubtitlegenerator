from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Form, Response
from fastapi.responses import FileResponse, PlainTextResponse
import whisper
import shutil
import os
import subprocess
import uuid

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

app = FastAPI(title="Free Auto Subtitle Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    headers = {
        "X-RateLimit-Limit": str(exc.limit),
        "X-RateLimit-Remaining": "0"
    }
    return PlainTextResponse(
        "Rate limit exceeded (5 requests per day)",
        status_code=429,
        headers=headers
    )


model = whisper.load_model("small")


def fmt(t):
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t % 60
    return f"{h:02}:{m:02}:{s:06.3f}".replace(".", ",")


def to_srt(res):
    return "\n".join(
        f"{i}\n{fmt(s['start'])} --> {fmt(s['end'])}\n{s['text'].strip()}\n"
        for i, s in enumerate(res["segments"], 1)
    )


def to_vtt(res):
    lines = ["WEBVTT\n"]
    for s in res["segments"]:
        lines.append(
            f"{fmt(s['start']).replace(',', '.')} --> "
            f"{fmt(s['end']).replace(',', '.')}\n"
            f"{s['text'].strip()}\n"
        )
    return "\n".join(lines)


def extract_audio(video_path):
    audio_path = f"{video_path}.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-i", video_path, "-ac", "1", "-ar", "16000", audio_path],
        check=True
    )
    return audio_path


def burn_subtitles(video_path, srt_text):
    srt_path = f"{video_path}.srt"
    out_path = f"subtitled_{uuid.uuid4().hex}.mp4"

    with open(srt_path, "w", encoding="utf-8") as f:
        f.write(srt_text)

    srt_escaped = srt_path.replace("\\", "/").replace(":", "\\:")

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i", video_path,
            "-vf", f"subtitles='{srt_escaped}'",
            "-c:v", "libx264",
            "-c:a", "aac",
            "-movflags", "+faststart",
            out_path
        ],
        check=True
    )
    return out_path


@app.post("/transcribe")
@limiter.limit("5/day")
async def transcribe(
    request: Request,
    response: Response,
    file: UploadFile = File(...),
    language: str | None = Form(None)
):
    response.headers["X-RateLimit-Limit"] = "5"
    response.headers["X-RateLimit-Remaining"] = str(
        max(0, request.state.limiter._storage.get(request.state.limiter._key_func(request)) - 1)
        if hasattr(request.state, "limiter") else "?"
    )

    uid = uuid.uuid4().hex
    src = f"{uid}_{file.filename}"

    with open(src, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        path = extract_audio(src) if file.content_type.startswith("video") else src

        res = model.transcribe(
            path,
            word_timestamps=True,
            language=None if language == "auto" else language
        )

        return {
            "language": res.get("language"),
            "text": res["text"],
            "segments": res["segments"],
            "srt": to_srt(res),
            "vtt": to_vtt(res),
        }

    finally:
        for p in [src, f"{src}.wav"]:
            if os.path.exists(p):
                os.remove(p)


@app.post("/burn")
@limiter.limit("5/day")
async def burn(
    request: Request,
    response: Response,
    file: UploadFile = File(...),
    srt: str = Form(...)
):
    response.headers["X-RateLimit-Limit"] = "5"
    response.headers["X-RateLimit-Remaining"] = "?"

    uid = uuid.uuid4().hex
    src = f"{uid}_{file.filename}"

    with open(src, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        out = burn_subtitles(src, srt)
        return FileResponse(out, media_type="video/mp4")

    finally:
        for p in [src, f"{src}.srt"]:
            if os.path.exists(p):
                os.remove(p)
