# Video Generator — Rose Panama

AI-powered image and video generation platform. Built with FastAPI (backend) and React (frontend).

## Architecture

```
api/                    FastAPI application (routes, background tasks)
  config.py             Model parameters and API keys
generators/             AI generation layer
  agent.py              Base class (shared HTTP client, polling, download)
  image_generator_agent.py   FLUX image generation (via PiAPI)
  video_generator_agent.py   Kling video generation (via PiAPI)
  video_extender_agent.py    Video extension (last frame + image-to-video chain)
  montage_video.py      Video assembly with FFmpeg (trim, speed, transitions)
  orchestrator.py       Single entry point used by api/app.py
utils/
  video_utils.py        FFmpeg helpers (extract frame, concat, duration)
  cloudinary_manager.py Cloudinary storage (list, delete, stats)
prompts/                Style presets for generation
react-app/              React frontend (Vite)
```

## Local setup

**Requirements:** Python 3.9+, Node.js 18+, FFmpeg

```bash
# Clone the repository
git clone https://github.com/Msegura4/video_and_image_generator.git
cd video_and_image_generator

# Create .env from the template below, then start
python dev.py
```

The `dev.py` script creates the Python virtual environment, installs dependencies, and starts both servers:
- Backend: http://localhost:8000
- Frontend: http://localhost:5173

## Environment variables (.env)

```
# PiAPI — image and video generation (Kling, FLUX)
PIAPI_API_KEY=

# Cloudinary — media storage
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# CORS — allowed frontend origins
ALLOWED_ORIGINS=http://localhost:5173
```

Get your PiAPI key at piapi.ai. Cloudinary credentials are available in your Cloudinary dashboard.

## Model configuration

All model parameters are centralized in `api/config.py`. To switch models or versions, edit this file only — no other files need to change.

```python
KLING_MODEL_VERSION = "2.5"       # Kling version: "1.6", "2.1", "2.5"
KLING_MODE = "professional"       # "professional" or "standard"
FLUX_MODEL = "Qubico/flux1-schnell"
```
