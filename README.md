# Convertify — Audio & Image Converter

A fast, free web app for converting audio and image files. Upload your files, pick a target format, and download the results.

**Live:** Deployed on [Vercel](https://vercel.com)

## Supported Formats

- **Audio:** mp3, wav, ogg, flac, aac, m4a, wma, aiff
- **Images:** png, jpg/jpeg, bmp, gif, webp, tiff, ico

## How It Works

1. Drag files onto the panel, or click to browse.
2. Pick the target format for audio and/or image files.
3. Click **Convert**, then download files individually or as a zip.

## Local Development

1. Install [ffmpeg](https://ffmpeg.org) (needed for audio conversion):
   - macOS: `brew install ffmpeg`
   - Ubuntu/Debian: `sudo apt install ffmpeg`
   - Windows: download from ffmpeg.org and add to PATH

2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Run the dev server:
   ```
   python app.py
   ```
   Then open **http://127.0.0.1:5000**

## Deploy to Vercel

This project uses `Dockerfile.vercel` so ffmpeg is available for audio conversion.

1. Push to GitHub
2. Import the repo on [vercel.com/new](https://vercel.com/new)
3. Vercel auto-detects the Dockerfile and deploys

## Tech Stack

- **Backend:** Flask + gunicorn
- **Audio:** pydub (ffmpeg)
- **Images:** Pillow
- **Deploy:** Vercel (Docker container)
