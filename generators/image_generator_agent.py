import sys
from pathlib import Path
from typing import Dict, Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from api.config import FLUX_MODEL, FLUX_DEFAULT_WIDTH, FLUX_DEFAULT_HEIGHT
from generators.agent import Agent


class ImageGenerator(Agent):
    """Génération d'images FLUX via PiAPI (text-to-image)."""

    def generate(
        self,
        prompt: str,
        width: int = FLUX_DEFAULT_WIDTH,
        height: int = FLUX_DEFAULT_HEIGHT,
    ) -> str:
        """Lance une génération d'image et retourne le task_id."""
        payload = {
            "model": FLUX_MODEL,
            "task_type": "txt2img",
            "input": {
                "prompt": prompt,
                "width": width,
                "height": height,
                "cfg_scale": 3.5,
            },
        }

        print(f"Génération image — modèle {FLUX_MODEL} ({width}x{height})")
        task_id = self._post_task(payload)
        print(f"Tâche créée : {task_id}")
        return task_id

    def extract_image_url(self, task_data: Dict[str, Any]) -> str:
        """Extrait l'URL de l'image depuis les données d'une tâche complétée."""
        output = task_data.get("output", {})
        image_url = (
            output.get("image_url")
            or output.get("url")
            or output.get("image")
            or (output.get("images", [None])[0] if output.get("images") else None)
        )

        if not image_url:
            raise Exception("URL image introuvable dans la réponse PiAPI")

        return image_url
