
# 🎬 Free Auto Subtitle Generator

A free, open-source web tool to automatically generate subtitles for video and audio files.  
Built using **FastAPI**, **Next.js**, **Whisper**, and **FFmpeg** — no paid APIs, fully local processing.

---

## ✨ Features

- 📤 Upload **video/audio files** (MP4, MP3, WAV up to 200MB)
- 🧠 Automatic **speech-to-text transcription**
- 🌍 **Multi-language subtitle support**
  - Auto-detect
  - English, Hindi, Spanish, French, German, Japanese
- ✏️ **Editable subtitle timeline**
- 📄 Export subtitles as **SRT** and **VTT**
- 🎥 **Burn subtitles into video** (hard-subbed MP4)
- 📊 **Real-time processing progress**
- ⏳ **Rate-limited to 5 uses/day per IP**
- 📱 Fully **mobile-responsive UI**

---

## 🛠 Tech Stack

### Frontend
- **Next.js (App Router)**
- React + TypeScript
- Tailwind CSS

### Backend
- **FastAPI (Python)**
- OpenAI **Whisper (open-source)**
- **FFmpeg** for audio extraction & subtitle burning
- **SlowAPI** for rate limiting

---

## 📐 Architecture Overview

1. User uploads video/audio from frontend
2. Backend extracts audio using FFmpeg
3. Whisper performs transcription (language-aware)
4. Subtitles are generated (segments, SRT, VTT)
5. User can edit subtitle text
6. Optional subtitle burn-in via FFmpeg
7. Final output is downloadable

---

## 🚀 Getting Started

### 1️⃣ Clone the repository

```bash
git clone https://github.com/snigdhasingh77/autosubtitlegenerator.git
cd autosubtitlegenerator
````

---

### 2️⃣ Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

Make sure **FFmpeg** is installed and available in PATH.

Run the backend:

```bash
uvicorn main:app --reload
```

Backend runs at:

```
http://127.0.0.1:8000
```

API docs:

```
http://127.0.0.1:8000/docs
```

---

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```
http://localhost:3000
```

---

## 🌐 API Endpoints

### `POST /transcribe`

**Description:**
Transcribes audio/video and generates subtitles.

**Form Data:**

* `file` → video/audio file
* `language` → `auto`, `en`, `hi`, `es`, `fr`, `de`, `ja`

**Response:**

```json
{
  "language": "en",
  "text": "...",
  "segments": [...],
  "srt": "...",
  "vtt": "..."
}
```

---

### `POST /burn`

**Description:**
Burns subtitles directly into the video.

**Form Data:**

* `file` → original video
* `srt` → subtitle text

**Response:**
MP4 video with hard-coded subtitles.

---

## ⏳ Rate Limiting

* **5 requests per day per IP**
* Headers returned:

  * `X-RateLimit-Limit`
  * `X-RateLimit-Remaining`
* Frontend displays remaining daily uses

---

## 🔒 Open-Source Only

This project uses **only open-source tools**:

* Whisper
* FFmpeg
* FastAPI
* Next.js

No proprietary or paid APIs.

---

## 📦 requirements.txt (Backend)

```txt
fastapi
uvicorn
openai-whisper
torch
ffmpeg-python
slowapi
python-multipart
```

---

## 📌 Notes

* Virtual environments (`venv/`) are intentionally excluded from Git
* Large binaries are installed locally via `pip`
* Designed for local & cloud deployment

---

## 👤 Author

**Snigdha Singh**
B.Tech CSE (AI/ML)
Built as part of **LiteCompute AI Technical Assignment**

---

## ⭐ Future Improvements

* Subtitle styling (font, size, color)
* Whisper.cpp integration for faster CPU inference
* Speaker diarization
* Cloud deployment (Docker + GPU)

---

## 📄 License

MIT License

