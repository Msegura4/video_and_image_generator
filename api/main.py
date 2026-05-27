from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
import uuid
import time
import tempfile
from pathlib import Path
from typing import Optional

# Ajouter le dossier racine au path (là où sont kling_api.py, video_utils.py, etc.)
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(ROOT_DIR / "src"))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")

from kling_api import KlingAPI
from video_utils import VideoUtils

app = FastAPI(title="ROSE PANAMA API")

_ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store en mémoire pour les tâches background (Flux, extension vidéo)
background_tasks_store: dict = {}


# ─────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ROSE PANAMA API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}


# ─────────────────────────────────────────────
# IMAGE-TO-VIDEO (Kling via PiAPI)
# ─────────────────────────────────────────────

@app.post("/api/image-to-video")
async def image_to_video(
    image: UploadFile = File(...),
    prompt: str = Form(...),
    duration: int = Form(5),
    aspect_ratio: str = Form("16:9"),
    mode: str = Form("professional"),
    model_version: str = Form("2.5"),
    negative_prompt: Optional[str] = Form(None)
):
    """Lance une génération image-to-video, retourne un task_id."""
    try:
        suffix = Path(image.filename).suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await image.read()
            tmp.write(content)
            tmp_path = tmp.name

        utils = VideoUtils()
        image_url = utils.upload_image_with_fallback(tmp_path)
        os.unlink(tmp_path)

        api = KlingAPI()
        result = api.generate_video(
            prompt=prompt,
            image_url=image_url,
            duration=duration,
            aspect_ratio=aspect_ratio,
            mode=mode,
            model_version=model_version,
            negative_prompt=negative_prompt
        )

        task_id = result.get("task_id")

        if model_version == "2.5":
            cost = 0.33 if duration == 5 else 0.66
        elif mode == "professional":
            cost = 0.46 if duration == 5 else 0.92
        else:
            cost = 0.26 if duration == 5 else 0.52

        return {
            "task_id": task_id,
            "status": "processing",
            "estimated_cost": cost
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/task/{task_id}")
def check_task(task_id: str):
    """Vérifie le statut d'une tâche Kling (image-to-video)."""
    try:
        api = KlingAPI()
        status_data = api.check_status(task_id)
        state = status_data.get("status", "unknown")

        response = {"task_id": task_id, "status": state}

        if state == "completed":
            output = status_data.get("output", {})
            works = output.get("works", [])
            if works:
                video_info = works[0].get("video", {})
                video_url = (
                    video_info.get("resource_without_watermark")
                    or video_info.get("resource")
                )
                # Upload vers Cloudinary pour persistance et affichage dans Créations
                if video_url and _cloudinary_configured():
                    video_url = _cloudinary_upload_with_retry(
                        video_url,
                        folder="rose-panama/videos/image_to_video",
                        resource_type="video",
                    )
                    print(f"[kling] Vidéo uploadée sur Cloudinary : {video_url}")
                response["video_url"] = video_url

        if state == "failed":
            error_msg = status_data.get("error") or status_data.get("message") or str(status_data)
            print(f"[kling] Task {task_id} failed: {error_msg}")
            response["error"] = error_msg

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# GÉNÉRATION D'IMAGE FLUX (PiAPI)
# ─────────────────────────────────────────────

def _run_flux_generation(job_id: str, prompt: str, model: str, width: int, height: int):
    """Tâche background pour la génération Flux (bloquante en interne)."""
    try:
        background_tasks_store[job_id]["status"] = "processing"
        from flux_image_generator import FluxImageGenerator
        generator = FluxImageGenerator()
        image_path = generator.generate_image(prompt, model, width, height)

        # Upload vers Cloudinary pour persistance
        image_url = None
        if _cloudinary_configured():
            image_url = _cloudinary_upload_with_retry(
                str(image_path),
                folder="rose-panama/images/flux",
                resource_type="image",
            )
            print(f"[flux] Image uploadée sur Cloudinary : {image_url}")

        background_tasks_store[job_id]["status"] = "completed"
        background_tasks_store[job_id]["image_path"] = str(image_path)
        background_tasks_store[job_id]["image_url"] = image_url
    except Exception as e:
        background_tasks_store[job_id]["status"] = "failed"
        background_tasks_store[job_id]["error"] = str(e)


@app.post("/api/generate-image")
async def generate_image(
    background_tasks: BackgroundTasks,
    prompt: str = Form(...),
    model: str = Form("flux-schnell"),
    width: int = Form(1024),
    height: int = Form(1024),
):
    """Lance une génération d'image Flux, retourne un job_id à poller via /api/job/{job_id}."""
    job_id = str(uuid.uuid4())
    background_tasks_store[job_id] = {
        "status": "pending",
        "type": "flux_image",
        "created_at": time.time()
    }
    background_tasks.add_task(_run_flux_generation, job_id, prompt, model, width, height)
    return {
        "job_id": job_id,
        "status": "pending",
        "estimated_cost": 0.003
    }


@app.get("/api/job/{job_id}")
def check_job(job_id: str):
    """Vérifie le statut d'une tâche background (Flux ou extension vidéo)."""
    job = background_tasks_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job introuvable")

    response = {
        "job_id": job_id,
        "status": job["status"],
        "type": job.get("type")
    }

    if job["status"] == "completed":
        if job.get("image_url"):
            response["image_url"] = job["image_url"]
        if job.get("image_path"):
            response["image_path"] = job["image_path"]
        if job.get("video_url"):
            response["video_url"] = job["video_url"]
        if job.get("video_path"):
            response["video_path"] = job["video_path"]

    if job["status"] == "failed":
        response["error"] = job.get("error", "Erreur inconnue")

    return response


# ─────────────────────────────────────────────
# EXTENSION VIDÉO
# ─────────────────────────────────────────────

def _run_extend_video(job_id: str, video_path: str, continuation_prompt: Optional[str],
                      duration: int, mode: str):
    """Tâche background pour l'extension vidéo."""
    try:
        background_tasks_store[job_id]["status"] = "processing"
        from image_to_video_extend import ImageToVideoExtender
        extender = ImageToVideoExtender()
        extended_path = extender.extend_video(
            video_path=video_path,
            continuation_prompt=continuation_prompt or None,
            duration=duration,
            mode=mode
        )
        # Upload vers Cloudinary pour persistance
        video_url_out = None
        if _cloudinary_configured():
            video_url_out = _cloudinary_upload_with_retry(
                str(extended_path),
                folder="rose-panama/videos/extended",
                resource_type="video",
            )
            print(f"[extend] Vidéo uploadée sur Cloudinary : {video_url_out}")

        background_tasks_store[job_id]["status"] = "completed"
        background_tasks_store[job_id]["video_path"] = str(extended_path)
        background_tasks_store[job_id]["video_url"] = video_url_out
    except Exception as e:
        background_tasks_store[job_id]["status"] = "failed"
        background_tasks_store[job_id]["error"] = str(e)
    finally:
        # Nettoyer la vidéo uploadée temporairement
        tmp = background_tasks_store[job_id].get("_tmp_path")
        if tmp and Path(tmp).exists():
            Path(tmp).unlink(missing_ok=True)


@app.post("/api/extend-video")
async def extend_video(
    background_tasks: BackgroundTasks,
    video: Optional[UploadFile] = File(None),
    video_url: Optional[str] = Form(None),
    continuation_prompt: Optional[str] = Form(None),
    duration: int = Form(5),
    mode: str = Form("professional"),
):
    """
    Étend une vidéo via image-to-video chain.
    Accepte un fichier uploadé OU une URL (Cloudinary, etc.).
    Retourne un job_id à poller via /api/job/{job_id}.
    """
    temp_dir = ROOT_DIR / "outputs" / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)

    tmp_path = temp_dir / f"upload_{int(time.time())}.mp4"

    if video_url:
        # Téléchargement serveur-side (évite les problèmes CORS côté frontend)
        r = _requests.get(video_url, timeout=60)
        r.raise_for_status()
        with open(tmp_path, "wb") as f:
            f.write(r.content)
    elif video:
        suffix = Path(video.filename).suffix or ".mp4"
        tmp_path = temp_dir / f"upload_{int(time.time())}{suffix}"
        content = await video.read()
        with open(tmp_path, "wb") as f:
            f.write(content)
    else:
        raise HTTPException(status_code=400, detail="Fournir un fichier vidéo ou une URL.")

    cost = 0.33 if duration == 5 else 0.66
    if mode == "standard":
        cost = 0.16 if duration == 5 else 0.32

    job_id = str(uuid.uuid4())
    background_tasks_store[job_id] = {
        "status": "pending",
        "type": "video_extension",
        "created_at": time.time(),
        "_tmp_path": str(tmp_path)
    }
    background_tasks.add_task(
        _run_extend_video, job_id, str(tmp_path),
        continuation_prompt, duration, mode
    )

    return {
        "job_id": job_id,
        "status": "pending",
        "estimated_cost": cost
    }


# ─────────────────────────────────────────────
# PROMPTS / PRESETS
# ─────────────────────────────────────────────

def _load_style_presets():
    """Charge les STYLE_PRESETS depuis prompts/prompt_templates.py."""
    # Forcer le rechargement si déjà importé
    if "prompts.prompt_templates" in sys.modules:
        del sys.modules["prompts.prompt_templates"]
    from prompts.prompt_templates import STYLE_PRESETS
    return STYLE_PRESETS


@app.get("/api/prompts")
def list_prompts():
    """Liste tous les presets disponibles avec un aperçu."""
    try:
        presets = _load_style_presets()
        result = []
        for name, data in presets.items():
            preset_type = data.get("type", "video")
            display_name = data.get("name", name.replace("_", " ").title())
            description  = data.get("description", "")

            if preset_type == "image":
                preview = data.get("style", "")
                result.append({
                    "name": name,
                    "display_name": display_name,
                    "description": description,
                    "type": "image",
                    "base_preview": preview[:120] + ("..." if len(preview) > 120 else ""),
                })
            elif preset_type == "img2video":
                preview = data.get("prompt", "")
                rs = data.get("recommended_settings", {})
                result.append({
                    "name": name,
                    "display_name": display_name,
                    "description": description,
                    "type": "img2video",
                    "base_preview": preview[:120] + ("..." if len(preview) > 120 else ""),
                    "model_version": rs.get("model_version", "2.5"),
                    "duration": rs.get("duration", 5),
                    "aspect_ratio": rs.get("aspect_ratio", "16:9"),
                    "mode": rs.get("mode", "professional"),
                })
            elif preset_type == "extendvideo":
                preview = data.get("prompt", "")
                rs = data.get("recommended_settings", {})
                result.append({
                    "name": name,
                    "display_name": display_name,
                    "description": description,
                    "type": "extendvideo",
                    "base_preview": preview[:120] + ("..." if len(preview) > 120 else ""),
                    "duration": rs.get("duration", 5),
                    "mode": rs.get("mode", "professional"),
                })
            else:
                # Video preset (legacy): preview from base field
                base = data.get("base", "")
                result.append({
                    "name": name,
                    "display_name": display_name,
                    "description": description,
                    "type": "video",
                    "base_preview": base[:120] + ("..." if len(base) > 120 else ""),
                    "color": data.get("color", ""),
                    "camera": data.get("camera", ""),
                    "quality": data.get("quality", ""),
                })
        return {"presets": result, "count": len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/prompts/{preset_name}")
def get_prompt(preset_name: str):
    """Retourne un preset complet."""
    try:
        presets = _load_style_presets()
        if preset_name not in presets:
            raise HTTPException(status_code=404, detail=f"Preset '{preset_name}' introuvable")
        return {"name": preset_name, "data": presets[preset_name]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/prompts/{preset_name}/build")
def build_prompt_endpoint(
    preset_name: str,
    custom_prompt: Optional[str] = None,
    duration: int = 5
):
    """Construit le prompt complet à partir d'un preset (+ custom prompt optionnel)."""
    try:
        if "prompts.prompt_templates" in sys.modules:
            del sys.modules["prompts.prompt_templates"]
        from prompts.prompt_templates import build_prompt
        full_prompt = build_prompt(preset_name, custom_prompt, duration)
        return {"preset_name": preset_name, "prompt": full_prompt}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/prompts/{preset_name}/negative")
def get_negative_prompt_endpoint(preset_name: str):
    """Retourne le negative prompt pour un preset."""
    try:
        if "prompts.prompt_templates" in sys.modules:
            del sys.modules["prompts.prompt_templates"]
        from prompts.prompt_templates import get_negative_prompt
        negative = get_negative_prompt(preset_name)
        return {"preset_name": preset_name, "negative_prompt": negative}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# CLOUDINARY — GALERIE DES CRÉATIONS
# ─────────────────────────────────────────────

def _get_cloudinary():
    from cloudinary_manager import CloudinaryManager
    return CloudinaryManager()


@app.get("/api/creations/videos")
def list_creations_videos(type: Optional[str] = None, limit: int = 50):
    """Liste les vidéos stockées sur Cloudinary. type: generated|image_to_video|extended"""
    try:
        manager = _get_cloudinary()
        videos = manager.list_videos(creation_type=type, limit=limit)
        return {"videos": videos, "count": len(videos)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/creations/images")
def list_creations_images(limit: int = 50):
    """Liste les images FLUX stockées sur Cloudinary."""
    try:
        manager = _get_cloudinary()
        images = manager.list_images(limit=limit)
        return {"images": images, "count": len(images)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/creations/stats")
def get_creations_stats():
    """Retourne les statistiques de stockage Cloudinary."""
    try:
        manager = _get_cloudinary()
        stats = manager.get_storage_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/creations/{resource_type}/{public_id:path}")
def delete_creation(resource_type: str, public_id: str):
    """Supprime une création sur Cloudinary. resource_type: video | image"""
    try:
        if resource_type not in ("video", "image"):
            raise HTTPException(status_code=400, detail="resource_type doit être 'video' ou 'image'")
        manager = _get_cloudinary()
        ok = manager.delete_file(public_id, resource_type=resource_type)
        if not ok:
            raise HTTPException(status_code=500, detail="Échec de la suppression sur Cloudinary.")
        return {"success": True, "deleted": public_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# CRÉER UN PRESET
# ─────────────────────────────────────────────

from pydantic import BaseModel
from typing import List

class PresetSettings(BaseModel):
    aspect_ratio: str = "16:9"
    duration: int = 5
    mode: str = "professional"
    model_version: str = "2.5"   # pour img2video (Kling)

class PresetCreate(BaseModel):
    preset_id: str
    preset_type: str = "video"   # "image" | "video" | "img2video"
    name: str
    description: str = ""
    # Champs communs
    negative_prompt: str = "people, text, UI, low quality, blurry, distorted"
    style_keywords: List[str] = []
    # Champs vidéo & img2video
    base_prompt: str = ""
    recommended_settings: PresetSettings = PresetSettings()
    # Champs image
    style: str = ""
    camera_angle: str = ""
    shot_type: str = ""
    lens: str = ""
    composition: str = ""
    lighting: str = ""
    colors: str = ""
    # Champs vidéo legacy (base/color/camera/quality)
    color: str = ""
    camera: str = ""
    quality: str = ""

def _escape(s: str) -> str:
    return s.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')

def _build_preset_code(preset: PresetCreate) -> str:
    keywords_str = "\n".join([f'            "{_escape(k)}",' for k in preset.style_keywords])
    settings = preset.recommended_settings

    if preset.preset_type == "image":
        return f'''
    "{preset.preset_id}": {{
        "type": "image",
        "name": "{_escape(preset.name)}",
        "description": "{_escape(preset.description)}",
        "style": "{_escape(preset.style)}",
        "camera_angle": "{_escape(preset.camera_angle)}",
        "shot_type": "{_escape(preset.shot_type)}",
        "lens": "{_escape(preset.lens)}",
        "composition": "{_escape(preset.composition)}",
        "lighting": "{_escape(preset.lighting)}",
        "colors": "{_escape(preset.colors)}",
        "negative_prompt": "{_escape(preset.negative_prompt)}",
        "style_keywords": [
{keywords_str}
        ],
        "recommended_settings": {{
            "width": 1024,
            "height": 1024
        }}
    }},
'''
    elif preset.preset_type == "img2video":
        return f'''
    "{preset.preset_id}": {{
        "type": "img2video",
        "name": "{_escape(preset.name)}",
        "description": "{_escape(preset.description)}",
        "prompt": "{_escape(preset.base_prompt)}",
        "negative_prompt": "{_escape(preset.negative_prompt)}",
        "style_keywords": [
{keywords_str}
        ],
        "recommended_settings": {{
            "aspect_ratio": "{settings.aspect_ratio}",
            "duration": {settings.duration},
            "mode": "{settings.mode}",
            "model_version": "{settings.model_version}"
        }}
    }},
'''
    elif preset.preset_type == "extendvideo":
        return f'''
    "{preset.preset_id}": {{
        "type": "extendvideo",
        "name": "{_escape(preset.name)}",
        "description": "{_escape(preset.description)}",
        "prompt": "{_escape(preset.base_prompt)}",
        "style_keywords": [
{keywords_str}
        ],
        "recommended_settings": {{
            "duration": {settings.duration},
            "mode": "{settings.mode}"
        }}
    }},
'''
    else:
        return f'''
    "{preset.preset_id}": {{
        "type": "video",
        "name": "{_escape(preset.name)}",
        "description": "{_escape(preset.description)}",
        "base": "{_escape(preset.base_prompt)}",
        "color": "{_escape(preset.color)}",
        "camera": "{_escape(preset.camera)}",
        "quality": "{_escape(preset.quality)}",
        "negative_prompt": "{_escape(preset.negative_prompt)}",
        "style_keywords": [
{keywords_str}
        ],
        "recommended_settings": {{
            "aspect_ratio": "{settings.aspect_ratio}",
            "duration": {settings.duration},
            "mode": "{settings.mode}"
        }}
    }},
'''

@app.post("/api/prompts")
def create_preset(preset: PresetCreate):
    """Crée un nouveau preset (image ou vidéo) et l'ajoute à prompt_templates.py."""
    try:
        presets = _load_style_presets()
        if preset.preset_id in presets:
            raise HTTPException(status_code=409, detail=f"Le preset '{preset.preset_id}' existe déjà.")

        template_file = ROOT_DIR / "prompts" / "prompt_templates.py"
        if not template_file.exists():
            raise HTTPException(status_code=500, detail="Fichier prompt_templates.py introuvable.")

        preset_code = _build_preset_code(preset)

        with open(template_file, 'r', encoding='utf-8') as f:
            content = f.read()

        lines = content.split('\n')

        # Trouver la fermeture du dict STYLE_PRESETS (pas n'importe quel } dans le fichier)
        insert_line = None
        depth = 0
        in_style_presets = False
        for i, line in enumerate(lines):
            if not in_style_presets:
                if 'STYLE_PRESETS' in line and '=' in line and '{' in line:
                    in_style_presets = True
                    depth = line.count('{') - line.count('}')
            else:
                depth += line.count('{') - line.count('}')
                if depth == 0:
                    insert_line = i
                    break

        if insert_line is None:
            raise HTTPException(status_code=500, detail="Impossible de trouver STYLE_PRESETS dans le fichier.")

        lines.insert(insert_line, preset_code.rstrip('\n'))
        with open(template_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))

        return {"success": True, "preset_id": preset.preset_id, "preset_type": preset.preset_type}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/prompts/{preset_name}")
def update_preset(preset_name: str, preset: PresetCreate):
    """Met à jour un preset existant dans prompt_templates.py."""
    import re as _re
    try:
        presets = _load_style_presets()
        if preset_name not in presets:
            raise HTTPException(status_code=404, detail=f"Preset '{preset_name}' introuvable.")

        template_file = ROOT_DIR / "prompts" / "prompt_templates.py"
        if not template_file.exists():
            raise HTTPException(status_code=500, detail="Fichier prompt_templates.py introuvable.")

        new_code = _build_preset_code(preset)

        with open(template_file, "r", encoding="utf-8") as f:
            content = f.read()

        lines = content.split("\n")

        # Trouver la ligne de début du preset
        start_line = None
        for i, line in enumerate(lines):
            if _re.match(r'\s+"' + _re.escape(preset_name) + r'":\s*\{', line):
                start_line = i
                break

        if start_line is None:
            raise HTTPException(status_code=500, detail="Impossible de localiser le preset dans le fichier.")

        # Trouver la fin du bloc en comptant les accolades
        depth = 0
        end_line = None
        for i in range(start_line, len(lines)):
            depth += lines[i].count("{") - lines[i].count("}")
            if depth == 0 and i > start_line:
                end_line = i
                break

        if end_line is None:
            raise HTTPException(status_code=500, detail="Impossible de trouver la fin du preset.")

        new_block_lines = new_code.rstrip("\n").split("\n")
        new_lines = lines[:start_line] + new_block_lines + lines[end_line + 1:]

        with open(template_file, "w", encoding="utf-8") as f:
            f.write("\n".join(new_lines))

        return {"success": True, "preset_id": preset.preset_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/prompts/{preset_name}")
def delete_preset(preset_name: str):
    """Supprime un preset existant de prompt_templates.py."""
    import re as _re
    try:
        presets = _load_style_presets()
        if preset_name not in presets:
            raise HTTPException(status_code=404, detail=f"Preset '{preset_name}' introuvable.")

        template_file = ROOT_DIR / "prompts" / "prompt_templates.py"
        if not template_file.exists():
            raise HTTPException(status_code=500, detail="Fichier prompt_templates.py introuvable.")

        with open(template_file, "r", encoding="utf-8") as f:
            content = f.read()

        lines = content.split("\n")

        # Trouver la ligne de début du preset
        start_line = None
        for i, line in enumerate(lines):
            if _re.match(r'\s+"' + _re.escape(preset_name) + r'":\s*\{', line):
                start_line = i
                break

        if start_line is None:
            raise HTTPException(status_code=500, detail="Impossible de localiser le preset dans le fichier.")

        # Trouver la fin du bloc
        depth = 0
        end_line = None
        for i in range(start_line, len(lines)):
            depth += lines[i].count("{") - lines[i].count("}")
            if depth == 0 and i > start_line:
                end_line = i
                break

        if end_line is None:
            raise HTTPException(status_code=500, detail="Impossible de trouver la fin du preset.")

        # Supprimer le bloc (start_line à end_line inclus)
        new_lines = lines[:start_line] + lines[end_line + 1:]

        with open(template_file, "w", encoding="utf-8") as f:
            f.write("\n".join(new_lines))

        return {"success": True, "deleted": preset_name}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# MODE PROJET
# ─────────────────────────────────────────────

import json as _json
import uuid as _uuid
import base64 as _base64
import requests as _requests
from datetime import datetime as _dt
from fastapi.responses import FileResponse
from fastapi import Body
import cloudinary as _cloudinary
import cloudinary.uploader as _cld_uploader

PROJECTS_FILE = ROOT_DIR / "projects.json"
_CLD_PROJECTS_ID = "rose-panama/projects-db"


def _cloudinary_upload_with_retry(source, folder: str, resource_type: str, max_retries: int = 3) -> str:
    """Upload vers Cloudinary avec 3 tentatives et backoff exponentiel.
    Lève une RuntimeError si toutes les tentatives échouent."""
    _cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    )
    last_error = None
    for attempt in range(max_retries):
        try:
            result = _cld_uploader.upload(source, folder=folder, resource_type=resource_type)
            return result["secure_url"]
        except Exception as erreur:
            last_error = erreur
            print(f"[cloudinary] Tentative {attempt + 1}/{max_retries} échouée : {erreur}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"Upload Cloudinary impossible après {max_retries} tentatives : {last_error}")

# Cache mémoire — évite les allers-retours Cloudinary entre chaque lecture/écriture
_projects_cache = None  # type: ignore


def _cloudinary_configured() -> bool:
    return bool(os.getenv("CLOUDINARY_CLOUD_NAME"))


def _load_projects() -> dict:
    """Charge les projets depuis le cache mémoire, Cloudinary (prod) ou fichier local (dev)."""
    global _projects_cache
    if _projects_cache is not None:
        return _projects_cache

    if _cloudinary_configured():
        try:
            cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
            url = f"https://res.cloudinary.com/{cloud_name}/raw/upload/{_CLD_PROJECTS_ID}"
            r = _requests.get(url, timeout=10, params={"_t": int(time.time())})
            if r.status_code == 200:
                _projects_cache = r.json()
                return _projects_cache
        except Exception as e:
            print(f"[projects] Cloudinary load failed: {e}")
        _projects_cache = {"projects": {}}
        return _projects_cache
    else:
        if PROJECTS_FILE.exists():
            with open(PROJECTS_FILE, "r", encoding="utf-8") as f:
                _projects_cache = _json.load(f)
        else:
            _projects_cache = {"projects": {}}
        return _projects_cache


def _save_projects(data: dict):
    """Sauvegarde dans le cache mémoire + Cloudinary (prod) ou fichier local (dev)."""
    global _projects_cache
    _projects_cache = data  # Mise à jour immédiate du cache

    if _cloudinary_configured():
        try:
            _cloudinary.config(
                cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
                api_key=os.getenv("CLOUDINARY_API_KEY"),
                api_secret=os.getenv("CLOUDINARY_API_SECRET"),
            )
            json_bytes = _json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
            b64 = _base64.b64encode(json_bytes).decode("utf-8")
            _cld_uploader.upload(
                f"data:application/json;base64,{b64}",
                resource_type="raw",
                public_id=_CLD_PROJECTS_ID,
                overwrite=True,
                invalidate=True,
            )
        except Exception as e:
            print(f"[projects] Cloudinary save failed: {e}")
    else:
        with open(PROJECTS_FILE, "w", encoding="utf-8") as f:
            _json.dump(data, f, ensure_ascii=False, indent=2)


def _default_steps():
    return {
        "image":     {"status": "pending", "local_path": None, "url": None, "prompt": None, "job_id": None, "completed_at": None},
        "img2video": {"status": "pending", "task_id": None,    "url": None, "prompt": None, "completed_at": None},
        "extend":    {"status": "pending", "job_id": None,     "url": None, "prompt": None, "completed_at": None},
    }


class ProjectDirection(BaseModel):
    colorimetry:            str = ""
    ambiance:               str = ""
    camera:                 str = ""
    color_dominant:         str = ""   # hex #RRGGBB — 60% (couleur dominante)
    color_secondary:        str = ""   # hex #RRGGBB — 30% (couleur secondaire)
    color_accent:           str = ""   # hex #RRGGBB — 10% (couleur accent)
    negative_prompt:        str = ""
    default_image_prompt:   str = ""
    default_motion_prompt:  str = ""
    default_extend_prompt:  str = ""


class ProjectCreate(BaseModel):
    name:      str
    direction: ProjectDirection = ProjectDirection()

class ProjectUpdate(BaseModel):
    name:      Optional[str] = None
    direction: ProjectDirection = ProjectDirection()


class StepPatch(BaseModel):
    status:       Optional[str] = None
    local_path:   Optional[str] = None
    url:          Optional[str] = None
    prompt:       Optional[str] = None
    job_id:       Optional[str] = None
    task_id:      Optional[str] = None
    completed_at: Optional[str] = None


# ── Serve local output files ──────────────────

@app.get("/api/serve/{file_path:path}")
def serve_local_file(file_path: str):
    """Sert un fichier local (chemin absolu ou relatif à ROOT_DIR).
    Note : le / initial d'un chemin absolu est absorbé par le routing URL,
    donc on essaie ROOT_DIR/file_path d'abord, puis /file_path (absolu reconstitué).
    """
    candidate = ROOT_DIR / file_path
    if not candidate.exists() or not candidate.is_file():
        candidate = Path("/" + file_path)   # reconstitue le chemin absolu
    if not candidate.exists() or not candidate.is_file():
        raise HTTPException(status_code=404, detail=f"Fichier introuvable : {file_path}")
    return FileResponse(str(candidate))


# ── CRUD Projets ──────────────────────────────

@app.get("/api/projects")
def list_projects():
    data = _load_projects()
    projects = list(data["projects"].values())
    projects.sort(key=lambda p: p.get("created_at", ""), reverse=True)
    return {"projects": projects}


@app.post("/api/projects")
def create_project(body: ProjectCreate):
    data = _load_projects()
    pid = str(_uuid.uuid4())[:8]
    project = {
        "id": pid,
        "name": body.name,
        "created_at": _dt.utcnow().isoformat(),
        "direction": body.direction.dict(),
        "evolutions": [],
    }
    data["projects"][pid] = project
    _save_projects(data)
    return project


@app.get("/api/projects/{project_id}")
def get_project(project_id: str):
    data = _load_projects()
    project = data["projects"].get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable.")
    return project


@app.put("/api/projects/{project_id}")
def update_project(project_id: str, body: ProjectUpdate):
    data = _load_projects()
    if project_id not in data["projects"]:
        raise HTTPException(status_code=404, detail="Projet introuvable.")
    if body.name is not None:
        data["projects"][project_id]["name"] = body.name
    data["projects"][project_id]["direction"] = body.direction.dict()
    _save_projects(data)
    return data["projects"][project_id]


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: str):
    data = _load_projects()
    if project_id not in data["projects"]:
        raise HTTPException(status_code=404, detail="Projet introuvable.")
    del data["projects"][project_id]
    _save_projects(data)
    return {"success": True, "deleted": project_id}


# ── Évolutions ────────────────────────────────

class EvolutionCreate(BaseModel):
    mode: str = "manual"  # manual | pipeline


@app.post("/api/projects/{project_id}/evolution")
def create_evolution(project_id: str, body: EvolutionCreate = None):
    if body is None:
        body = EvolutionCreate()
    data = _load_projects()
    if project_id not in data["projects"]:
        raise HTTPException(status_code=404, detail="Projet introuvable.")
    evo_id = str(_uuid.uuid4())[:8]
    n = len(data["projects"][project_id]["evolutions"]) + 1
    evo = {
        "id":         evo_id,
        "name":       f"Évolution {n}",
        "mode":       body.mode,
        "created_at": _dt.utcnow().isoformat(),
        "steps":      _default_steps(),
    }
    data["projects"][project_id]["evolutions"].insert(0, evo)
    _save_projects(data)
    return evo


@app.delete("/api/projects/{project_id}/evolution/{evo_id}")
def delete_evolution(project_id: str, evo_id: str):
    data = _load_projects()
    if project_id not in data["projects"]:
        raise HTTPException(status_code=404, detail="Projet introuvable.")
    evos = data["projects"][project_id]["evolutions"]
    data["projects"][project_id]["evolutions"] = [e for e in evos if e["id"] != evo_id]
    _save_projects(data)
    return {"success": True}


@app.patch("/api/projects/{project_id}/evolution/{evo_id}/step/{step}")
def patch_step(project_id: str, evo_id: str, step: str, body: StepPatch):
    """Met à jour le résultat d'une étape d'évolution (image, img2video ou extend)."""
    if step not in ("image", "img2video", "extend"):
        raise HTTPException(status_code=400, detail="step doit être image, img2video ou extend.")
    data = _load_projects()
    if project_id not in data["projects"]:
        raise HTTPException(status_code=404, detail="Projet introuvable.")
    evo = next((e for e in data["projects"][project_id]["evolutions"] if e["id"] == evo_id), None)
    if not evo:
        raise HTTPException(status_code=404, detail="Évolution introuvable.")
    patch = body.dict(exclude_none=True)
    evo["steps"][step].update(patch)
    _save_projects(data)
    return evo


# ─────────────────────────────────────────────
# INSPIRATIONS (Cloudinary folder: rose-panama/inspirations)
# ─────────────────────────────────────────────

INSPIRATION_FOLDER = "rose-panama/inspirations"


@app.post("/api/inspirations")
async def upload_inspiration(file: UploadFile = File(...), label: Optional[str] = Form(None)):
    """Upload une image/vidéo d'inspiration vers Cloudinary."""
    try:
        import cloudinary
        import cloudinary.uploader
        manager = _get_cloudinary()  # initialise la config cloudinary

        suffix = Path(file.filename).suffix or ""
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Détecter le type
        resource_type = "video" if suffix.lower() in (".mp4", ".mov", ".avi", ".webm") else "image"

        context = {
            "label": label or file.filename,
            "created_at": _dt.utcnow().isoformat(),
        }

        result = cloudinary.uploader.upload(
            tmp_path,
            resource_type=resource_type,
            folder=INSPIRATION_FOLDER,
            context=context,
            tags=["inspiration", "rose-panama"],
        )
        os.unlink(tmp_path)

        return {
            "public_id":     result["public_id"],
            "url":           result["secure_url"],
            "resource_type": resource_type,
            "format":        result.get("format", ""),
            "label":         label or file.filename,
            "created_at":    result.get("created_at", ""),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/inspirations")
def list_inspirations(limit: int = 100):
    """Liste les inspirations stockées sur Cloudinary."""
    try:
        import cloudinary.api
        manager = _get_cloudinary()

        results = []
        for rtype in ("image", "video"):
            try:
                resp = cloudinary.api.resources(
                    type="upload",
                    prefix=INSPIRATION_FOLDER,
                    resource_type=rtype,
                    max_results=limit,
                    context=True,
                )
                for r in resp.get("resources", []):
                    ctx = r.get("context", {}).get("custom", {})
                    results.append({
                        "public_id":     r["public_id"],
                        "url":           r["secure_url"],
                        "resource_type": rtype,
                        "format":        r.get("format", ""),
                        "label":         ctx.get("label", r["public_id"].split("/")[-1]),
                        "created_at":    r.get("created_at", ""),
                    })
            except Exception:
                pass

        results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return {"inspirations": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/inspirations/{public_id:path}")
def delete_inspiration(public_id: str):
    """Supprime une inspiration de Cloudinary."""
    try:
        manager = _get_cloudinary()
        # On essaie image puis vidéo
        for rtype in ("image", "video"):
            ok = manager.delete_file(public_id, resource_type=rtype)
            if ok:
                return {"success": True, "deleted": public_id}
        raise HTTPException(status_code=500, detail="Impossible de supprimer le fichier.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# MÉDIAS DU PROJET
# ─────────────────────────────────────────────

class ProjectMediaItem(BaseModel):
    public_id:     str
    url:           str
    resource_type: str = "image"   # image | video
    media_type:    str = "creation"  # creation | inspiration
    label:         Optional[str] = None


@app.get("/api/projects/{project_id}/media")
def get_project_media(project_id: str):
    data = _load_projects()
    if project_id not in data["projects"]:
        raise HTTPException(status_code=404, detail="Projet introuvable.")
    return {"media": data["projects"][project_id].get("media", [])}


@app.post("/api/projects/{project_id}/media")
def add_project_media(project_id: str, body: ProjectMediaItem):
    """Ajoute un média (inspiration ou création) au projet."""
    data = _load_projects()
    if project_id not in data["projects"]:
        raise HTTPException(status_code=404, detail="Projet introuvable.")
    if "media" not in data["projects"][project_id]:
        data["projects"][project_id]["media"] = []
    # Éviter les doublons
    existing_ids = [m["public_id"] for m in data["projects"][project_id]["media"]]
    if body.public_id not in existing_ids:
        data["projects"][project_id]["media"].append({
            "public_id":     body.public_id,
            "url":           body.url,
            "resource_type": body.resource_type,
            "media_type":    body.media_type,
            "label":         body.label or body.public_id.split("/")[-1],
            "added_at":      _dt.utcnow().isoformat(),
        })
        _save_projects(data)
    return {"media": data["projects"][project_id]["media"]}


@app.delete("/api/projects/{project_id}/media/{public_id:path}")
def remove_project_media(project_id: str, public_id: str):
    """Retire un média du projet (ne supprime pas sur Cloudinary)."""
    data = _load_projects()
    if project_id not in data["projects"]:
        raise HTTPException(status_code=404, detail="Projet introuvable.")
    media = data["projects"][project_id].get("media", [])
    data["projects"][project_id]["media"] = [m for m in media if m["public_id"] != public_id]
    _save_projects(data)
    return {"success": True}
