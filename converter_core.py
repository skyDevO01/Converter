"""Shared audio/image conversion logic used by the web app."""

from pathlib import Path

from PIL import Image
from pydub import AudioSegment

AUDIO_EXTS = {"mp3", "wav", "ogg", "flac", "aac", "m4a", "wma", "aiff"}
IMAGE_EXTS = {"png", "jpg", "jpeg", "bmp", "gif", "webp", "tiff", "ico"}


def detect_kind(filename: str) -> str | None:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in AUDIO_EXTS:
        return "audio"
    if ext in IMAGE_EXTS:
        return "image"
    return None


def convert_audio(input_path: Path, output_path: Path) -> None:
    fmt = output_path.suffix.lower().lstrip(".")
    audio = AudioSegment.from_file(input_path)
    export_fmt = "mp4" if fmt == "m4a" else fmt
    audio.export(output_path, format=export_fmt)


def convert_image(input_path: Path, output_path: Path) -> None:
    fmt = output_path.suffix.lower().lstrip(".")
    pillow_fmt = {"jpg": "JPEG"}.get(fmt, fmt.upper())
    img = Image.open(input_path)
    if pillow_fmt in ("JPEG", "BMP") and img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGBA")
        background = Image.new("RGB", img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
        img = background
    elif pillow_fmt == "JPEG":
        img = img.convert("RGB")
    img.save(output_path, format=pillow_fmt)


def convert_one(input_path: Path, target_ext: str, output_dir: Path) -> dict:
    """Convert a single file. Returns a result dict describing the outcome."""
    kind = detect_kind(input_path.name)
    target_ext = target_ext.lower().lstrip(".")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_name = f"{input_path.stem}.{target_ext}"
    output_path = output_dir / output_name

    if kind is None:
        return {"original": input_path.name, "ok": False,
                "error": "Unsupported file type"}

    if kind == "audio" and target_ext not in AUDIO_EXTS:
        return {"original": input_path.name, "ok": False,
                "error": f"Can't convert audio to .{target_ext}"}
    if kind == "image" and target_ext not in IMAGE_EXTS:
        return {"original": input_path.name, "ok": False,
                "error": f"Can't convert image to .{target_ext}"}

    try:
        if kind == "audio":
            convert_audio(input_path, output_path)
        else:
            convert_image(input_path, output_path)
        return {"original": input_path.name, "ok": True,
                "converted": output_name, "kind": kind}
    except Exception as e:
        return {"original": input_path.name, "ok": False, "error": str(e)}
