import time
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from api.config import KLING_MODE, KLING_DEFAULT_DURATION
from generators.agent import Agent
from generators.video_generator_agent import VideoGenerator
from utils.video_utils import VideoUtils


class VideoExtender(Agent):
    """Extension de vidéo via image-to-video chain.

    Méthode : extrait la dernière frame → génère une continuation → concatène.
    """

    def __init__(self):
        super().__init__()
        self.video_generator = VideoGenerator()
        self.utils = VideoUtils()
        self.temp_dir = Path("outputs/temp")
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def extend(
        self,
        video_path: str,
        continuation_prompt: Optional[str] = None,
        duration: int = KLING_DEFAULT_DURATION,
        mode: str = KLING_MODE,
    ) -> str:
        """Étend une vidéo et retourne le chemin de la vidéo finale."""
        source = Path(video_path)
        if not source.exists():
            raise FileNotFoundError(f"Vidéo introuvable : {source}")

        # Étape 1 : extraire la dernière frame
        frame_path = self.temp_dir / f"last_frame_{int(time.time())}.jpg"
        self.utils.extract_last_frame(str(source), str(frame_path))

        # Étape 2 : uploader la frame
        frame_url = self.utils.upload_image_with_fallback(str(frame_path))

        # Étape 3 : générer la continuation (image-to-video)
        prompt = continuation_prompt or self._build_continuation_prompt(source)
        print(f"Prompt continuation : {prompt[:100]}...")

        task_id = self.video_generator.generate(
            prompt=prompt,
            image_url=frame_url,
            duration=duration,
            mode=mode,
        )

        task_data = self._poll_status(task_id)
        continuation_url = self.video_generator.extract_video_url(task_data)

        # Étape 4 : télécharger la continuation
        continuation_path = self.temp_dir / f"continuation_{int(time.time())}.mp4"
        self._download_file(continuation_url, str(continuation_path))

        # Étape 5 : concaténer original + continuation
        output_path = Path("outputs") / f"extended_{source.stem}_{int(time.time())}.mp4"
        final_path = self.utils.concat_videos(
            [str(source), str(continuation_path)],
            str(output_path),
        )

        # Nettoyage des fichiers temporaires
        frame_path.unlink(missing_ok=True)
        continuation_path.unlink(missing_ok=True)

        print(f"Vidéo étendue : {final_path}")
        return final_path

    def estimate_cost(self, duration: int, mode: str) -> float:
        """Estime le coût de l'extension en dollars."""
        if mode == "professional":
            return 0.33 if duration == 5 else 0.66
        return 0.16 if duration == 5 else 0.32

    def _build_continuation_prompt(self, video_path: Path) -> str:
        """Construit un prompt de continuation depuis les métadonnées de la vidéo source."""
        import json
        metadata_file = Path(str(video_path).replace(".mp4", "_metadata.json"))

        if metadata_file.exists():
            try:
                with open(metadata_file, "r") as file_handle:
                    metadata = json.load(file_handle)
                original_prompt = metadata.get("prompt", "")
                if original_prompt:
                    base = original_prompt.split("professional mode")[0].strip()
                    base = base.split("cinematic quality")[0].strip()
                    return (
                        f"{base}, smooth continuous camera movement, "
                        "seamless flow, maintain momentum, same lighting and atmosphere"
                    )
            except Exception:
                pass

        return (
            "smooth continuous camera movement, seamless cinematic flow, "
            "maintain the same momentum and direction, consistent lighting and atmosphere"
        )
