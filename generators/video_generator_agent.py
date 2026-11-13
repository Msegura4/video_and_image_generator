import sys
from pathlib import Path
from typing import Optional, Dict, Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import KLING_MODEL, KLING_MODEL_VERSION, KLING_MODE, KLING_DEFAULT_DURATION, KLING_DEFAULT_ASPECT_RATIO
from generators.agent import Agent


class VideoGenerator(Agent):
    """Génération vidéo Kling via PiAPI (text-to-video et image-to-video)."""

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
        payload = {
            "model": KLING_MODEL,
            "task_type": "video_generation",
            "input": {
                "prompt": prompt,
                "negative_prompt": negative_prompt or "",
                "aspect_ratio": aspect_ratio,
                "duration": duration,
                "mode": "pro" if mode == "professional" else "std",
                "version": model_version,
            },
        }

        if image_url:
            payload["input"]["image_url"] = image_url

        print(f"Génération vidéo — modèle Kling {model_version} ({mode})")
        task_id = self._post_task(payload)
        print(f"Tâche créée : {task_id}")
        return task_id

    def extract_video_url(self, task_data: Dict[str, Any]) -> str:
        """Extrait l'URL de la vidéo depuis les données d'une tâche complétée."""
        works = task_data.get("output", {}).get("works", [])

        if not works:
            raise Exception("Aucune vidéo trouvée dans la réponse PiAPI")

        video_info = works[0].get("video", {})
        video_url = video_info.get("resource_without_watermark") or video_info.get("resource")

        if not video_url:
            raise Exception("URL vidéo introuvable dans la réponse PiAPI")

        return video_url

    def estimate_cost(self, duration: int, mode: str, model_version: str) -> float:
        """Estime le coût d'une génération en dollars."""
        if model_version == "2.5":
            return 0.33 if duration == 5 else 0.66
        if mode == "professional":
            return 0.46 if duration == 5 else 0.92
        return 0.26 if duration == 5 else 0.52
