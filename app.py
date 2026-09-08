#!/usr/bin/env python3
"""
Convertify — audio & image converter web app.

Local dev:
    pip install -r requirements.txt
    python app.py

Production (Vercel):
    Deployed via Dockerfile.vercel with gunicorn.
    Requires ffmpeg (installed in the Docker image).
"""

import shutil
import time
import uuid
import zipfile
from pathlib import Path

from flask import Flask, jsonify, render_template, request, send_from_directory, abort

from converter_core import AUDIO_EXTS, IMAGE_EXTS, convert_one, detect_kind

app = Flask(__name__)

# Use /tmp for Vercel container compatibility; falls back to local sessions/ for dev
import os
_tmp = os.environ.get("TMPDIR", "/tmp") if os.name != "nt" else Path(__file__).parent / "sessions"
SESSIONS_DIR = Path(_tmp) / "sessions"
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
SESSION_MAX_AGE = 3600  # seconds — old session folders get swept on each request


def cleanup_old_sessions():
    now = time.time()
    for d in SESSIONS_DIR.iterdir():
        if d.is_dir() and now - d.stat().st_mtime > SESSION_MAX_AGE:
            shutil.rmtree(d, ignore_errors=True)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/formats")
def formats():
    return jsonify({
        "audio": sorted(AUDIO_EXTS),
        "image": sorted(IMAGE_EXTS),
    })


@app.route("/convert", methods=["POST"])
def convert():
    cleanup_old_sessions()

    files = request.files.getlist("files")
    audio_target = request.form.get("audio_target", "").lower().lstrip(".")
    image_target = request.form.get("image_target", "").lower().lstrip(".")

    if not files:
        return jsonify({"error": "No files received"}), 400

    session_id = uuid.uuid4().hex
    session_dir = SESSIONS_DIR / session_id
    upload_dir = session_dir / "in"
    output_dir = session_dir / "out"
    upload_dir.mkdir(parents=True)
    output_dir.mkdir(parents=True)

    results = []
    for f in files:
        if not f.filename:
            continue
        saved_path = upload_dir / f.filename
        f.save(saved_path)

        kind = detect_kind(f.filename)
        target = audio_target if kind == "audio" else image_target if kind == "image" else None

        if not target:
            results.append({"original": f.filename, "ok": False,
                             "error": "No target format chosen for this file type"})
            continue

        result = convert_one(saved_path, target, output_dir)
        results.append(result)

    ok_results = [r for r in results if r["ok"]]

    zip_url = None
    if len(ok_results) > 1:
        zip_path = output_dir / "converted_files.zip"
        with zipfile.ZipFile(zip_path, "w") as zf:
            for r in ok_results:
                zf.write(output_dir / r["converted"], arcname=r["converted"])
        zip_url = f"/download/{session_id}/converted_files.zip"

    for r in ok_results:
        r["download_url"] = f"/download/{session_id}/{r['converted']}"

    return jsonify({"session": session_id, "results": results, "zip_url": zip_url})


@app.route("/download/<session_id>/<path:filename>")
def download(session_id, filename):
    directory = SESSIONS_DIR / session_id / "out"
    if not directory.exists():
        abort(404)
    return send_from_directory(directory, filename, as_attachment=True)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
