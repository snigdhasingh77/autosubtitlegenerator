"use client";

import { useState, useRef } from "react";

const BACKEND = "http://127.0.0.1:8000";
const MAX_SIZE_MB = 200;

const LANGUAGES = [
  { code: "auto", label: "Auto Detect" },
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [segments, setSegments] = useState<any[]>([]);
  const [usesLeft, setUsesLeft] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      alert("File exceeds 200MB limit");
      return;
    }
    setFile(f);
    setResult(null);
    setSegments([]);
  }

  async function handleTranscribe() {
    if (!file) return;

    setLoading(true);
    setProgress(10);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("language", language);

    const timer = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 5 : p));
    }, 500);

    const res = await fetch(`${BACKEND}/transcribe`, {
      method: "POST",
      body: fd,
    });

    clearInterval(timer);

    // ⭐ Handle rate limit exhaustion
    if (res.status === 429) {
      alert("Daily limit reached. Try again tomorrow.");
      setLoading(false);
      return;
    }

    // ⭐ Read rate limit headers
    const remaining = res.headers.get("X-RateLimit-Remaining");
    if (remaining !== null) {
      setUsesLeft(Number(remaining));
    }

    const data = await res.json();

    setResult(data);
    setSegments(data.segments);
    setProgress(100);
    setLoading(false);
  }

  async function handleBurn() {
    if (!file || !result) return;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("srt", result.srt);

    const res = await fetch(`${BACKEND}/burn`, {
      method: "POST",
      body: fd,
    });

    if (res.status === 429) {
      alert("Daily limit reached. Try again tomorrow.");
      return;
    }

    if (!res.ok) {
      alert("Failed to burn subtitles");
      return;
    }

    const remaining = res.headers.get("X-RateLimit-Remaining");
    if (remaining !== null) {
      setUsesLeft(Number(remaining));
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "subtitled.mp4";
    a.click();
  }

  function updateSegment(i: number, text: string) {
    const copy = [...segments];
    copy[i].text = text;
    setSegments(copy);
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-2 text-center">
        Free Auto Subtitle Generator
      </h1>

      <p className="text-gray-400 text-center mb-4">
        Upload a video or audio file to generate subtitles instantly.
      </p>

      {/* ⭐ Rate limit indicator */}
      {usesLeft !== null && (
        <p className="text-sm text-gray-400 text-center mb-6">
          Uses left today:{" "}
          <span className="text-green-400 font-semibold">
            {usesLeft}
          </span>{" "}
          / 5
        </p>
      )}

      {/* Drag & Drop */}
      <div
        className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer mb-6 hover:border-white"
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files[0]);
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        {file ? (
          <p className="text-green-400">{file.name}</p>
        ) : (
          <p className="text-gray-400">Drag & drop or click to upload</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="video/*,audio/*"
          hidden
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
        />
      </div>

      {/* Preview */}
      {file && file.type.startsWith("video") && (
        <video
          controls
          className="w-full rounded mb-6"
          src={URL.createObjectURL(file)}
        />
      )}

      {/* Language Selector */}
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="w-full bg-gray-800 text-white p-3 rounded mb-4"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>

      <button
        onClick={handleTranscribe}
        disabled={loading}
        className="w-full bg-white text-black py-3 rounded font-semibold mb-4"
      >
        {loading ? "Processing..." : "Generate Subtitles"}
      </button>

      {/* Progress bar */}
      {loading && (
        <div className="w-full bg-gray-700 rounded h-2 mb-6">
          <div
            className="bg-green-500 h-2 rounded"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Editable Timeline */}
      {segments.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mb-4">Edit Subtitles</h2>

          <div className="space-y-3 max-h-80 overflow-y-auto mb-6">
            {segments.map((s, i) => (
              <textarea
                key={i}
                value={s.text}
                onChange={(e) => updateSegment(i, e.target.value)}
                className="w-full bg-gray-800 p-3 rounded text-sm"
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <a
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                result.srt
              )}`}
              download="subtitles.srt"
              className="underline"
            >
              Download SRT
            </a>

            <a
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                result.vtt
              )}`}
              download="subtitles.vtt"
              className="underline"
            >
              Download VTT
            </a>

            <button
              type="button"
              onClick={handleBurn}
              className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 transition"
            >
              Burn Subtitles
            </button>
          </div>
        </>
      )}
    </main>
  );
}
