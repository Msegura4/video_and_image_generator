import sys
from pathlib import Path
from typing import Optional, Dict, Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from generators.agent import Agent
from generators.image_generator_agent import ImageGenerator
from generators.video_generator_agent import VideoGenerator
from generators.video_extender_agent import VideoExtender


class Orchestrator(Agent):
    """Point d'entrée unique pour toutes les générations.

    api/main.py instancie cette classe et appelle ses méthodes.
    Chaque méthode délègue au bon générateur.
    """

    def __init__(self):
        super().__init__()
        self.image_gen = ImageGenerator()
        self.video_gen = VideoGenerator()
        self.video_ext = VideoExtender()

    # ── Image ─────────────────────────────────────────────────────────────

    def generate_image(self, prompt: str, width: int, height: int) -> Dict[str, Any]:
        """Lance et attend la génération d'une image. Retourne url et chemin local."""
        import time
        from pathlib import Path as _Path

        task_id = self.image_gen.generate(prompt, width, height)
        task_data = self._poll_status(task_id)
        image_url = self.image_gen.extract_image_url(task_data)

        # Téléchargement local
        output_dir = _Path("outputs/images")
        output_dir.mkdir(parents=True, exist_ok=True)
        timestamp = int(time.time())
        clean_name = "".join(c for c in prompt[:30] if c.isalnum() or c in (" ", "-", "_")).strip().replace(" ", "_")
        local_path = str(output_dir / f"flux_{clean_name}_{timestamp}.png")
        self._download_file(image_url, local_path)

        return {"image_url": image_url, "image_path": local_path}

    # ── Vidéo ─────────────────────────────────────────────────────────────

    def start_video(
        self,
        prompt: str,
        image_url: Optional[str] = None,
        duration: int = 5,
        aspect_ratio: str = "16:9",
        mode: str = "professional",
        model_version: str = "2.5",
        negative_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Lance une génération vidéo (non bloquant). Retourne task_id et coût estimé."""
        task_id = self.video_gen.generate(
            prompt=prompt,
            image_url=image_url,
            duration=duration,
            aspect_ratio=aspect_ratio,
            mode=mode,
            model_version=model_version,
            negative_prompt=negative_prompt,
        )
        return {
            "task_id": task_id,
            "estimated_cost": self.video_gen.estimate_cost(duration, mode, model_version),
        }

    def check_video(self, task_id: str) -> Dict[str, Any]:
        """Vérifie le statut d'une tâche vidéo. Retourne état et url si terminée."""
        import requests

        response = requests.get(
            f"{self.base_url}/task/{task_id}",
            headers=self.headers,
            timeout=10,
        )
        response.raise_for_status()
        result = response.json()

        if result.get("code") != 200:
            raise Exception(f"Erreur PiAPI : {result.get('message', 'Unknown error')}")

        data = result.get("data", {})
        state = data.get("status", "unknown")

        output = {"task_id": task_id, "status": state}

        if state == "completed":
            output["video_url"] = self.video_gen.extract_video_url(data)

        if state == "failed":
            error_msg = data.get("error", {}).get("message", str(data))
            output["error"] = error_msg

        return output

    # ── Extension vidéo ───────────────────────────────────────────────────

    def extend_video(
        self,
        video_path: str,
        continuation_prompt: Optional[str] = None,
        duration: int = 5,
        mode: str = "professional",
    ) -> Dict[str, Any]:
        """Lance et attend l'extension d'une vidéo. Retourne chemin et coût."""
        final_path = self.video_ext.extend(
            video_path=video_path,
            continuation_prompt=continuation_prompt,
            duration=duration,
            mode=mode,
        )
        return {
            "video_path": final_path,
            "estimated_cost": self.video_ext.estimate_cost(duration, mode),
        }
