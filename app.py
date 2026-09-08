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
import tempfile
import zipfile
from io import BytesIO
from pathlib import Path

from flask import Flask, jsonify, render_template, request, send_file

from converter_core import AUDIO_EXTS, IMAGE_EXTS, convert_one, detect_kind

app = Flask(__name__)


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
    files = request.files.getlist("files")
    audio_target = request.form.get("audio_target", "").lower().lstrip(".")
    image_target = request.form.get("image_target", "").lower().lstrip(".")

    if not files:
        return jsonify({"error": "No files received"}), 400

    tmpdir = tempfile.mkdtemp()
    try:
        upload_dir = Path(tmpdir) / "in"
        output_dir = Path(tmpdir) / "out"
        upload_dir.mkdir()
        output_dir.mkdir()

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

        if not ok_results:
            errors = [r.get("error", "Unknown error") for r in results if not r["ok"]]
            return jsonify({"error": "Conversion failed", "details": errors}), 400

        if len(ok_results) == 1:
            # Single file — return it directly
            file_path = output_dir / ok_results[0]["converted"]
            data = BytesIO(file_path.read_bytes())
            return send_file(data, as_attachment=True,
                             download_name=ok_results[0]["converted"])
        else:
            # Multiple files — zip and return
            zip_buffer = BytesIO()
            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
                for r in ok_results:
                    zf.write(output_dir / r["converted"], arcname=r["converted"])
            zip_buffer.seek(0)
            return send_file(zip_buffer, as_attachment=True,
                             download_name="converted_files.zip",
                             mimetype="application/zip")
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
