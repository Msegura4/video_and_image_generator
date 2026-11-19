import sys
from pathlib import Path
from typing import Optional, Dict, Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from api.config import KLING_MODEL, KLING_MODEL_VERSION, KLING_MODE, KLING_DEFAULT_DURATION, KLING_DEFAULT_ASPECT_RATIO
from generators.agent import Agent


class VideoGenerator(Agent):
    """Génération vidéo Kling via PiAPI (text-to-video et image-to-video)."""

    _V4_VERSIONS = {"4.0", "4.0-flash"}

    def generate(
        self,
        prompt: str,
        image_url: Optional[str] = None,
        duration: int = KLING_DEFAULT_DURATION,
        aspect_ratio: str = KLING_DEFAULT_ASPECT_RATIO,
        mode: str = KLING_MODE,
        model_version: str = KLING_MODEL_VERSION,
        negative_prompt: Optional[str] = None,
    ) -> str:
        """Lance une génération vidéo et retourne le task_id."""
        is_v4 = model_version in self._V4_VERSIONS

        input_data: Dict[str, Any] = {
            "prompt": prompt,
            # "negative_prompt": negative_prompt or "",  # non supporté par Kling 4.0 (réactiver pour 2.x/3.x)
            "aspect_ratio": aspect_ratio,
            "duration": duration,
            "mode": "pro" if mode == "professional" else "std",
            "version": model_version,
        }

        if not is_v4 and negative_prompt:
            input_data["negative_prompt"] = negative_prompt

        if image_url:
            input_data["image_url"] = image_url

        payload: Dict[str, Any] = {
            "model": KLING_MODEL,
            "task_type": "video_generation",
            "input": input_data,
            # "config": {}  # requis uniquement pour Kling 4.0 (voir ligne ci-dessous)
        }

        if is_v4:
            payload["config"] = {"service_mode": "public"}

        print(f"Génération vidéo — modèle Kling {model_version} ({mode})")
        task_id = self._post_task(payload)
        print(f"Tâche créée : {task_id}")
        return task_id

    def extract_video_url(self, task_data: Dict[str, Any]) -> str:
        """Extrait l'URL de la vidéo depuis les données d'une tâche complétée.

        Kling 4.0/3.0 : output.video (string direct)
        Kling 2.x     : output.works[0].video.resource_without_watermark
        """
        output = task_data.get("output", {})

        # Format Kling 4.0 / 3.0
        if isinstance(output.get("video"), str):
            return output["video"]

        # Format Kling 2.x
        works = output.get("works", [])
        if works:
            video_info = works[0].get("video", {})
            video_url = video_info.get("resource_without_watermark") or video_info.get("resource")
            if video_url:
                return video_url

        raise Exception(f"URL vidéo introuvable dans la réponse PiAPI : {output}")

    def estimate_cost(self, duration: int, mode: str, model_version: str) -> float:
        """Estime le coût d'une génération en dollars."""
        if model_version == "4.0":
            rate = 0.25 if mode == "professional" else 0.10
            return round(rate * duration, 2)
        if model_version in ("3.0", "3.0-turbo"):
            rate = 0.20 if mode == "professional" else 0.10
            return round(rate * duration, 2)
        if model_version == "2.6":
            return 0.33 if duration == 5 else 0.66
        if model_version == "2.5":
            return 0.33 if duration == 5 else 0.66
        if mode == "professional":
            return 0.46 if duration == 5 else 0.92
        return 0.26 if duration == 5 else 0.52
