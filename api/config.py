from dotenv import load_dotenv
import os

load_dotenv()

# ── Clés API ──────────────────────────────────
PIAPI_API_KEY = os.getenv("PIAPI_API_KEY")

# ── PiAPI ─────────────────────────────────────
PIAPI_BASE_URL = "https://api.piapi.ai/api/v1"

# ── Kling (vidéo) ─────────────────────────────
KLING_MODEL = "kling"
KLING_MODEL_VERSION = "2.5"
KLING_MODE = "professional"          # "professional" | "standard"
KLING_DEFAULT_DURATION = 5           # secondes (5 ou 10)
KLING_DEFAULT_ASPECT_RATIO = "16:9"

# ── FLUX (image) ──────────────────────────────
FLUX_MODEL = "Qubico/flux1-schnell"
FLUX_DEFAULT_WIDTH = 1024
FLUX_DEFAULT_HEIGHT = 1024
